'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CONTEXTES_PRISE,
  FRICTIONS,
  LABELS_ISSUE_TRACE,
  LABELS_MOMENT_PRISE,
  LABELS_TYPE_JOURNEE,
  LABEL_PAUSE_PATIENT,
  MOMENTS_PRISE,
  buildEpisodeCalibrage,
  buildEpisodeDepuisProtocole,
  couvertureJournees,
  createJourneeRepere,
  describeCouvertureJournees,
  typeJourneeParDefaut,
  createAttentionBudget,
  createTrialTrace,
  declarePatientPause,
  describeCoverage,
  type FoodObservationEpisode,
  type IntraEpisodeSolution,
  type JourneeRepere,
  type MinimalPlanEvent,
  type PatientPauseEvent,
  type MomentPrise,
  type TraceIssue,
  type TrialTrace,
  type TypeJournee,
} from '@/lib/food-observation';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';

function dateLocale(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// L'épisode n'est plus fabriqué ici (lot 2, item 5). Il vient du protocole
// diffusé — hypothèse, action et fenêtre décidées en consultation — et n'existe
// pas tant qu'aucun protocole n'a été diffusé. L'`idPatient` de la session en
// porte l'identité, jamais le jeton d'URL : c'est aussi ce que
// `saveJaObservationSnapshot` exige côté serveur (il rejette tout épisode dont
// le `patientId` ne correspond pas au patient).
type VueProtocolePatient = {
  purpose: string;
  actionPrincipale: { type: string; title: string; minimalPlan: string } | null;
  cycleRef: string;
  debutCycle: string;
};

/** Ancre du bilan de calibrage, servie tant qu'aucun protocole n'est diffusé. */
type AncreCalibrage = { ancre: string; debut: string };

// Hors cycle, les traces restent rattachées à un identifiant local explicite :
// elles ne quittent pas l'appareil, faute d'épisode à transmettre.
function episodeIdHorsCycle(idPatient: string): string {
  return `ja_${idPatient}_hors_cycle`;
}

type PatientFoodObservationDraft = {
  budget: number;
  traces: TrialTrace[];
  pauses: PatientPauseEvent[];
  plans: MinimalPlanEvent[];
  solutions: IntraEpisodeSolution[];
  journees: JourneeRepere[];
  /** Tête de chaîne des transmissions déjà faites depuis cet appareil. */
  dernierEnvoiDraftId?: string;
};

type PatientDecision = {
  milestone: 'J7' | 'J14' | 'J21';
  feedbackPatient: string;
  deltaDecision: string;
  chargePercue: 'faible' | 'moderee' | 'elevee';
  budgetChargeGlobal: number;
  reviewedAt: string;
};

// Sans session portail vérifiée, il n'existe aucune identité stable à laquelle
// rattacher un brouillon. La saisie reste possible, mais rien n'est conservé —
// et le panneau le dit plutôt que de laisser croire à une sauvegarde. Le jeton
// de l'URL ferait une clé : c'est précisément celle dont on se sépare.
const EPISODE_SANS_SESSION = 'session-absente';

function draftKey(idPatient: string): string {
  return `wellneuro:ja5-02:patient:${idPatient}`;
}

function readDraft(idPatient: string | null): PatientFoodObservationDraft | null {
  if (typeof window === 'undefined' || !idPatient) return null;
  try {
    const raw = window.sessionStorage.getItem(draftKey(idPatient));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PatientFoodObservationDraft>;
    if (
      typeof parsed.budget !== 'number'
      || !Array.isArray(parsed.traces)
      || !Array.isArray(parsed.pauses)
      || !Array.isArray(parsed.plans)
      || !Array.isArray(parsed.solutions)
    ) {
      return null;
    }
    return {
      budget: parsed.budget,
      traces: parsed.traces,
      pauses: parsed.pauses,
      plans: parsed.plans,
      solutions: parsed.solutions,
      // Facultatif : un brouillon écrit avant le lot 3 n'en porte pas.
      journees: Array.isArray(parsed.journees) ? parsed.journees : [],
      dernierEnvoiDraftId:
        typeof parsed.dernierEnvoiDraftId === 'string' ? parsed.dernierEnvoiDraftId : undefined,
    };
  } catch {
    return null;
  }
}

function writeDraft(idPatient: string | null, draft: PatientFoodObservationDraft): void {
  if (typeof window === 'undefined' || !idPatient) return;
  try {
    window.sessionStorage.setItem(draftKey(idPatient), JSON.stringify(draft));
  } catch {
    // no-op: ne pas bloquer la saisie en cas de quota navigateur.
  }
}

function clearDraft(idPatient: string | null): void {
  if (typeof window === 'undefined' || !idPatient) return;
  try {
    window.sessionStorage.removeItem(draftKey(idPatient));
  } catch {
    // no-op
  }
}

export function PatientFoodObservationPanel({ idPatient }: { idPatient: string | null }) {
  const [initialDraft] = useState<PatientFoodObservationDraft | null>(() => readDraft(idPatient));
  const [draftRestored, setDraftRestored] = useState<boolean>(() => {
    if (!initialDraft) return false;
    return (
      initialDraft.budget !== 3
      || initialDraft.traces.length > 0
      || initialDraft.pauses.length > 0
      || initialDraft.plans.length > 0
      || initialDraft.solutions.length > 0
    );
  });
  const [episode, setEpisode] = useState<FoodObservationEpisode | null>(null);
  const [protocoleCharge, setProtocoleCharge] = useState(false);
  const [traces, setTraces] = useState<TrialTrace[]>(() => initialDraft?.traces ?? []);
  const [pauses, setPauses] = useState<PatientPauseEvent[]>(() => initialDraft?.pauses ?? []);
  const [plans, setPlans] = useState<MinimalPlanEvent[]>(() => initialDraft?.plans ?? []);
  const [solutions, setSolutions] = useState<IntraEpisodeSolution[]>(() => initialDraft?.solutions ?? []);
  const [journees, setJournees] = useState<JourneeRepere[]>(() => initialDraft?.journees ?? []);

  const [budget, setBudget] = useState<number>(() => {
    if (!initialDraft) return 3;
    try {
      return createAttentionBudget(initialDraft.budget).tracesParSemaine;
    } catch {
      return 3;
    }
  });
  const [occasionPresentee, setOccasionPresentee] = useState(true);
  const [faisable, setFaisable] = useState<'oui' | 'non' | 'na'>('oui');
  const [issue, setIssue] = useState<TraceIssue>('fait');
  const [frictionCode, setFrictionCode] = useState('');
  const [motLibre, setMotLibre] = useState('');
  const [solutionInput, setSolutionInput] = useState('');
  const [typeJournee, setTypeJournee] = useState<TypeJournee>(() => typeJourneeParDefaut(dateLocale(new Date())));
  const [nombrePrises, setNombrePrises] = useState(3);
  const [momentsJournee, setMomentsJournee] = useState<MomentPrise[]>([]);
  const [contexteJournee, setContexteJournee] = useState('');
  const [rienDeParticulier, setRienDeParticulier] = useState(false);
  const [decision, setDecision] = useState<PatientDecision | null>(null);
  const [decisionLoading, setDecisionLoading] = useState<boolean>(true);
  const [error, setError] = useState('');
  const [envoi, setEnvoi] = useState(false);
  const [erreurEnvoi, setErreurEnvoi] = useState('');
  const [derniereTransmission, setDerniereTransmission] = useState<
    { draftId: string; createdAt: string } | null
  >(initialDraft?.dernierEnvoiDraftId
    ? { draftId: initialDraft.dernierEnvoiDraftId, createdAt: '' }
    : null);

  const episodeIdSaisie = episode?.episodeId ?? episodeIdHorsCycle(idPatient ?? EPISODE_SANS_SESSION);

  const couverture = useMemo(
    () => describeCoverage(traces.length, { tracesParSemaine: budget }),
    [traces.length, budget],
  );

  // Le « silence utile » N'EST PLUS rendu ici (lot 1, audit du 2026-07-27,
  // §2.1). Il l'était sur `traces.length >= budget` : trois traces du même
  // lundi suffisaient à dire au patient « nous en savons assez », un verdict de
  // suffisance rendu sur un comptage — quand `describeCoverage` juste au-dessus
  // s'interdit précisément de qualifier (il rend un comptage nu, protégé par
  // `assertNeutre`). Le conditionner à une couverture temporelle réelle suppose
  // le moteur de couverture du lot 3, qui n'existe pas.
  //
  // Conséquence à connaître : ce panneau était la SEULE surface patient de
  // production qui rendait ce message. L'autre rendu
  // (`patient-food-observation/FoodObservationJourney.tsx`, sur un régime
  // `silence` prescrit) n'est monté que par le harnais `/dev/validation-ja`,
  // réservé au développement (`validationJaGuard.ts`). Le « silence utile »
  // n'atteint donc plus aucun patient — le régime prescrit n'a pas encore de
  // surface de production, ce qui reste à trancher (lot 2).

  useEffect(() => {
    writeDraft(idPatient, {
      budget,
      traces,
      pauses,
      plans,
      solutions,
      journees,
      dernierEnvoiDraftId: derniereTransmission?.draftId,
    });
  }, [budget, traces, pauses, plans, solutions, journees, idPatient, derniereTransmission]);

  // L'épisode vient du protocole diffusé, jamais d'un gabarit local.
  useEffect(() => {
    let mounted = true;
    if (!idPatient) {
      setProtocoleCharge(true);
      return () => { mounted = false; };
    }

    const chargerProtocole = async () => {
      try {
        const res = await fetch('/api/portail/protocole', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          ok: boolean;
          protocoleDiffuse?: boolean;
          vue?: VueProtocolePatient | null;
          calibrage?: AncreCalibrage | null;
        };
        if (!mounted) return;
        if (!res.ok || !json.ok || !json.protocoleDiffuse || !json.vue) {
          // Avant le protocole, le carnet n'est pas muet : il ouvre un bilan de
          // calibrage, transmissible, que le protocole diffusé remplacera.
          setEpisode(json.calibrage
            ? buildEpisodeCalibrage({
                idPatient,
                ancre: json.calibrage.ancre,
                debut: json.calibrage.debut,
                budget: createAttentionBudget(budget),
              })
            : null);
          return;
        }
        setEpisode(buildEpisodeDepuisProtocole({
          idPatient,
          protocole: json.vue,
          budget: createAttentionBudget(budget),
        }));
      } catch {
        if (mounted) setEpisode(null);
      } finally {
        if (mounted) setProtocoleCharge(true);
      }
    };

    void chargerProtocole();
    return () => { mounted = false; };
    // Le budget n'est pas une dépendance : `updateBudget` le reporte sur
    // l'épisode déjà chargé, sans redemander le protocole.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idPatient]);

  // Dernière transmission connue du serveur — c'est elle qui fait la tête de
  // chaîne, le brouillon local ne servant que de repli hors ligne.
  useEffect(() => {
    let mounted = true;
    if (!idPatient) return () => { mounted = false; };

    const chargerTransmissions = async () => {
      try {
        const res = await fetch('/api/portail/ja/observations', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          ok: boolean;
          snapshots?: { draftId: string; createdAt: string; actor: 'praticien' | 'patient' }[];
        };
        if (!mounted || !res.ok || !json.ok || !json.snapshots) return;
        // On ne chaîne que sur ses propres transmissions : un instantané rédigé
        // par le praticien n'est pas une version antérieure de celui-ci.
        const sien = json.snapshots.find((s) => s.actor === 'patient');
        if (sien) setDerniereTransmission({ draftId: sien.draftId, createdAt: sien.createdAt });
      } catch {
        // Repli silencieux : la transmission reste possible, sans chaînage.
      }
    };

    void chargerTransmissions();
    return () => { mounted = false; };
  }, [idPatient]);

  useEffect(() => {
    let mounted = true;
    setDecisionLoading(true);

    const loadDecision = async () => {
      try {
        const res = await fetch('/api/portail/ja/decision', {
          method: 'GET',
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const json = (await res.json()) as {
          ok: boolean;
          hasDecision?: boolean;
          decision?: PatientDecision | null;
        };
        if (!mounted) return;
        if (!res.ok || !json.ok || !json.hasDecision) {
          setDecision(null);
          return;
        }
        setDecision(json.decision ?? null);
      } catch {
        if (!mounted) return;
        setDecision(null);
      } finally {
        if (mounted) setDecisionLoading(false);
      }
    };

    void loadDecision();
    return () => {
      mounted = false;
    };
  }, []);

  const updateBudget = (value: number) => {
    setBudget(value);
    setEpisode(prev => (prev ? { ...prev, budget: createAttentionBudget(value) } : prev));
  };

  const transmettre = async () => {
    if (!idPatient || !episode || envoi) return;
    // Ne partent que les éléments du cycle courant : le brouillon local est
    // conservé d'un cycle à l'autre, et le serveur refuse un instantané dont
    // les traces relèvent d'un autre épisode.
    const duCycle = <T extends { episodeId: string }>(liste: T[]): T[] =>
      liste.filter(item => item.episodeId === episode.episodeId);
    // Rien du cycle courant à transmettre, alors que l'appareil porte des
    // notes : elles relèvent d'une période antérieure. Le dire plutôt que
    // d'envoyer un instantané vide et de rendre un succès trompeur.
    const aTransmettre = duCycle(traces).length + duCycle(pauses).length
      + duCycle(plans).length + duCycle(solutions).length + duCycle(journees).length;
    const enLocal = traces.length + pauses.length + plans.length + solutions.length
      + journees.length;
    if (aTransmettre === 0 && enLocal > 0) {
      setErreurEnvoi('Vos notes datent d’une période précédente : rien à transmettre pour la période en cours.');
      return;
    }

    setErreurEnvoi('');
    setEnvoi(true);
    try {
      const res = await fetch('/api/portail/ja/observations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          episode,
          traces: duCycle(traces),
          pauses: duCycle(pauses),
          plans: duCycle(plans),
          solutions: duCycle(solutions),
          journees: duCycle(journees),
          // Le panneau patient ne tient pas de carrière d'action : le contrat
          // serveur exige le tableau, il part vide plutôt qu'absent.
          actionCareer: [],
          supersedesDraftId: derniereTransmission?.draftId,
        }),
      });
      const json = (await res.json()) as {
        ok: boolean;
        snapshot?: { draftId: string; createdAt: string };
        error?: string;
      };
      if (!res.ok || !json.ok || !json.snapshot) {
        setErreurEnvoi(json.error ?? 'Transmission impossible pour le moment.');
        return;
      }
      setDerniereTransmission({
        draftId: json.snapshot.draftId,
        createdAt: json.snapshot.createdAt,
      });
    } catch {
      setErreurEnvoi('Connexion interrompue. Réessayez.');
    } finally {
      setEnvoi(false);
    }
  };

  const addTrace = () => {
    setError('');
    try {
      const trace = createTrialTrace({
        traceId: makeId('trace'),
        episodeId: episodeIdSaisie,
        localDate: dateLocale(new Date()),
        occasionPresentee,
        faisable: occasionPresentee ? (faisable === 'oui') : null,
        issue,
        frictionCode: issue === 'partiel_empeche' ? frictionCode || undefined : undefined,
        motLibre: motLibre || undefined,
      });
      setTraces(prev => [trace, ...prev]);
      setMotLibre('');
      setFrictionCode('');
      setIssue('fait');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer la trace.');
    }
  };

  const declarePause = () => {
    setError('');
    try {
      const pause = declarePatientPause({
        eventId: makeId('pause'),
        episodeId: episodeIdSaisie,
        semaineDu: dateLocale(new Date()),
        motifCode: frictionCode || undefined,
      });
      setPauses(prev => [pause, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer la pause.');
    }
  };

  const addPlan = (dureeJours: 1 | 3 | 7) => {
    const plan: MinimalPlanEvent = {
      eventId: makeId('plan'),
      episodeId: episodeIdSaisie,
      from: dateLocale(new Date()),
      dureeJours,
      activatedBy: 'patient',
      rationaleRequired: false,
    };
    setPlans(prev => [plan, ...prev]);
  };

  // Une journée par date : le domaine refuse le doublon à l'enregistrement de
  // l'instantané, autant le dire ici plutôt que de laisser le patient saisir
  // deux fois puis buter à la transmission.
  const addJournee = () => {
    setError('');
    const dateDuJour = dateLocale(new Date());
    if (journees.some(j => j.localDate === dateDuJour)) {
      setError('Cette journée est déjà décrite. Modifiez-la en réinitialisant votre brouillon local.');
      return;
    }
    try {
      const journee = createJourneeRepere({
        journeeId: makeId('journee'),
        episodeId: episodeIdSaisie,
        localDate: dateDuJour,
        typeJournee,
        nombrePrises: rienDeParticulier ? undefined : nombrePrises,
        momentsObserves: rienDeParticulier ? [] : momentsJournee,
        contexte: rienDeParticulier || !contexteJournee ? undefined : contexteJournee,
        rienDeParticulier,
      });
      setJournees(prev => [journee, ...prev]);
      setMomentsJournee([]);
      setContexteJournee('');
      setRienDeParticulier(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Impossible d’enregistrer cette journée.');
    }
  };

  const basculerMoment = (moment: MomentPrise) => {
    setMomentsJournee(prev =>
      prev.includes(moment) ? prev.filter(m => m !== moment) : [...prev, moment]);
  };

  const addSolution = () => {
    const label = solutionInput.trim();
    if (!label) return;
    const solution: IntraEpisodeSolution = {
      solutionId: makeId('solution'),
      episodeId: episodeIdSaisie,
      labelPatient: label,
      contexte: 'Semaine en cours',
    };
    setSolutions(prev => [solution, ...prev]);
    setSolutionInput('');
  };

  const resetLocalDraft = () => {
    clearDraft(idPatient);
    // L'épisode n'est pas réinitialisé : il vient du protocole diffusé, pas du
    // brouillon local. Seule la saisie de l'appareil est effacée — les
    // transmissions déjà faites restent en base et gardent la tête de chaîne.
    setBudget(3);
    setEpisode(prev => (prev ? { ...prev, budget: createAttentionBudget(3) } : prev));
    setTraces([]);
    setPauses([]);
    setPlans([]);
    setSolutions([]);
    setJournees([]);
    setOccasionPresentee(true);
    setFaisable('oui');
    setIssue('fait');
    setFrictionCode('');
    setMotLibre('');
    setSolutionInput('');
    setError('');
    setErreurEnvoi('');
    setDraftRestored(false);
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <PatientPageHeader
        title="Mon carnet alimentaire"
        subtitle="Vous décrivez l’essai sans détailler tous les repas."
      />

      {!idPatient && (
        <PatientInlineMessage tone="info">
          Votre session n’est pas ouverte : ce que vous saisissez ici ne sera pas conservé sur cet appareil.
        </PatientInlineMessage>
      )}

      {draftRestored && (
        <PatientInlineMessage tone="info">Brouillon local restauré sur cet appareil.</PatientInlineMessage>
      )}

      {protocoleCharge && (
        episode && episode.content.regime === 'essai' ? (
          <div data-testid="ja-patient-action-cycle">
            <PatientCard padding="sm" className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Votre action, décidée en consultation
              </p>
              <p className="text-sm font-medium text-foreground">{episode.content.action.labelPatient}</p>
              <p className="text-sm text-muted-foreground">{episode.content.action.simplePlan}</p>
              <p className="text-xs text-muted-foreground">
                Période du {episode.startDate} au {episode.endDate}.
              </p>
            </PatientCard>
          </div>
        ) : episode?.content.regime === 'calibrage' ? (
          <div data-testid="ja-patient-calibrage">
            <PatientInlineMessage tone="info">
              Aucune action n’a encore été décidée en consultation. Décrivez quelques journées :
              elles aideront à choisir ce qui vous conviendra.
            </PatientInlineMessage>
          </div>
        ) : (
          <div data-testid="ja-patient-sans-cycle">
            <PatientInlineMessage tone="info">
              Aucune action n’a encore été décidée en consultation. Vous pouvez noter ce que vous
              observez : ces notes restent sur cet appareil.
            </PatientInlineMessage>
          </div>
        )
      )}

      {decisionLoading ? (
        <PatientInlineMessage tone="info">Mise à jour de la décision praticien en cours…</PatientInlineMessage>
      ) : decision ? (
        <PatientCard padding="sm" className="space-y-2 border-primary/20" data-testid="ja-patient-decision-active">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Décision active du praticien</p>
          <p className="text-sm text-foreground">{decision.feedbackPatient}</p>
          <p className="text-xs text-muted-foreground">Ajustement de la décision: {decision.deltaDecision}</p>
        </PatientCard>
      ) : null}

      <div className="flex justify-end">
        <PatientButton data-testid="ja-patient-reset-local" variant="danger-text" onClick={resetLocalDraft}>
          Réinitialiser le brouillon local
        </PatientButton>
      </div>

      {/* La saisie n'ouvre qu'une fois le cycle résolu — plans et solutions
          compris : saisis avant, ils seraient rattachés à un identifiant hors
          cycle, puis écartés de la transmission sans que le patient le voie. */}
      {!protocoleCharge ? (
        <PatientInlineMessage tone="info">Chargement de votre carnet…</PatientInlineMessage>
      ) : (
      <>
      <div data-testid="ja-patient-question-jour">
        <PatientCard padding="sm" className="space-y-3 border-primary/20">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Question du jour</p>
          <p className="text-sm text-foreground">
            Cette semaine, qu’est-ce qui a le plus aidé (ou freiné) votre action alimentaire?
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <PatientButton variant="ghost" className="w-full sm:w-auto" onClick={() => addPlan(1)}>Plan minimal 1 jour</PatientButton>
            <PatientButton variant="ghost" className="w-full sm:w-auto" onClick={() => addPlan(3)}>Plan minimal 3 jours</PatientButton>
            <PatientButton variant="ghost" className="w-full sm:w-auto" onClick={() => addPlan(7)}>Plan minimal 7 jours</PatientButton>
          </div>
        </PatientCard>
      </div>

      {/* Bilan de calibrage (lot 3) : la journée repère répond à une autre
          question que la trace d'essai — à quoi ressemble une journée — et ne
          s'affiche qu'en régime `calibrage`. En régime essai, le carnet reste
          ce qu'il est. */}
      {episode?.content.regime === 'calibrage' && (
        <div data-testid="ja-patient-journee">
          <PatientCard className="space-y-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Décrire la journée d’aujourd’hui
            </p>

            <PatientField label="Quel genre de journée était-ce ?">
              <select
                data-testid="ja-patient-type-journee"
                className={patientInputClassName}
                value={typeJournee}
                onChange={(e) => setTypeJournee(e.target.value as TypeJournee)}
              >
                {Object.entries(LABELS_TYPE_JOURNEE).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </PatientField>

            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                data-testid="ja-patient-rien-de-particulier"
                type="checkbox"
                checked={rienDeParticulier}
                onChange={(e) => setRienDeParticulier(e.target.checked)}
              />
              Rien de particulier à signaler pour cette journée
            </label>

            {!rienDeParticulier && (
              <>
                <PatientField label="Combien de prises alimentaires ?">
                  <select
                    data-testid="ja-patient-nombre-prises"
                    className={patientInputClassName}
                    value={nombrePrises}
                    onChange={(e) => setNombrePrises(Number(e.target.value))}
                  >
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8].map(v => <option key={v} value={v}>{v}</option>)}
                  </select>
                </PatientField>

                <fieldset className="space-y-2">
                  <legend className="text-sm text-muted-foreground">À quels moments ?</legend>
                  {MOMENTS_PRISE.map(moment => (
                    <label key={moment} className="flex items-center gap-2 text-sm text-foreground">
                      <input
                        data-testid={`ja-patient-moment-${moment}`}
                        type="checkbox"
                        checked={momentsJournee.includes(moment)}
                        onChange={() => basculerMoment(moment)}
                      />
                      {LABELS_MOMENT_PRISE[moment]}
                    </label>
                  ))}
                </fieldset>

                <PatientField label="Dans quel contexte, principalement ?">
                  <select
                    data-testid="ja-patient-contexte"
                    className={patientInputClassName}
                    value={contexteJournee}
                    onChange={(e) => setContexteJournee(e.target.value)}
                  >
                    <option value="">Sans précision</option>
                    {CONTEXTES_PRISE.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </PatientField>
              </>
            )}

            <PatientButton
              data-testid="ja-patient-enregistrer-journee"
              className="w-full sm:w-auto"
              onClick={addJournee}
            >
              Enregistrer cette journée
            </PatientButton>

            <p className="text-sm text-muted-foreground" data-testid="ja-patient-couverture-journees">
              {describeCouvertureJournees(couvertureJournees(journees))}
            </p>
          </PatientCard>
        </div>
      )}

      <div data-testid="ja-patient-formulaire-trace">
        <PatientCard className="space-y-4">
        <PatientField label="Budget d’attention (traces par semaine)">
          <select
            data-testid="ja-patient-budget"
            className={patientInputClassName}
            value={budget}
            onChange={(e) => updateBudget(Number(e.target.value))}
          >
            {[2, 3, 4, 5, 6, 7].map(v => <option key={v} value={v}>{v} traces / semaine</option>)}
          </select>
        </PatientField>

        <PatientField label="L’occasion s’est présentée?">
          <select
            data-testid="ja-patient-occasion"
            className={patientInputClassName}
            value={occasionPresentee ? 'oui' : 'non'}
            onChange={(e) => {
              const next = e.target.value === 'oui';
              setOccasionPresentee(next);
              if (!next) setFaisable('na');
            }}
          >
            <option value="oui">Oui</option>
            <option value="non">Non</option>
          </select>
        </PatientField>

        <PatientField label="C’était faisable?">
          <select
            data-testid="ja-patient-faisable"
            className={patientInputClassName}
            value={faisable}
            onChange={(e) => setFaisable(e.target.value as 'oui' | 'non' | 'na')}
            disabled={!occasionPresentee}
          >
            <option value="oui">Oui</option>
            <option value="non">Non</option>
            <option value="na">Sans objet</option>
          </select>
        </PatientField>

        <PatientField label="Ce qui a compté cette fois-ci">
          <select
            data-testid="ja-patient-issue"
            className={patientInputClassName}
            value={issue}
            onChange={(e) => setIssue(e.target.value as TraceIssue)}
          >
            {Object.entries(LABELS_ISSUE_TRACE).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </PatientField>

        {issue === 'partiel_empeche' && (
          <PatientField label="Si besoin, quelle friction principale?">
            <select
              data-testid="ja-patient-friction"
              className={patientInputClassName}
              value={frictionCode}
              onChange={(e) => setFrictionCode(e.target.value)}
            >
              <option value="">Sélectionnez…</option>
              {Object.entries(FRICTIONS).map(([code, label]) => (
                <option key={code} value={code}>{label}</option>
              ))}
            </select>
          </PatientField>
        )}

        <PatientField label="Mot libre (optionnel, court)">
          <input
            data-testid="ja-patient-mot-libre"
            type="text"
            className={patientInputClassName}
            value={motLibre}
            onChange={(e) => setMotLibre(e.target.value)}
            maxLength={80}
            placeholder="Exemple: déplacement imprévu"
          />
        </PatientField>

        {error && <PatientInlineMessage tone="error">{error}</PatientInlineMessage>}

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <PatientButton data-testid="ja-patient-enregistrer-trace" className="w-full sm:w-auto" onClick={addTrace}>
            Enregistrer cette trace
          </PatientButton>
          <PatientButton
            data-testid="ja-patient-declarer-pause"
            variant="ghost"
            className="w-full sm:w-auto"
            onClick={declarePause}
          >
            {LABEL_PAUSE_PATIENT}
          </PatientButton>
        </div>
        </PatientCard>
      </div>

      <div data-testid="ja-patient-couverture">
        <PatientCard padding="sm" className="space-y-2">
          <p className="text-sm text-muted-foreground">Couverture de la semaine</p>
          <p className="text-sm font-medium text-foreground">{couverture}</p>
        </PatientCard>
      </div>

      {episode && (
        <div data-testid="ja-patient-transmission">
          <PatientCard padding="sm" className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Partager avec mon praticien
            </p>
            <p className="text-sm text-muted-foreground">
              Vos notes restent sur cet appareil tant que vous ne les transmettez pas.
            </p>
            {derniereTransmission?.createdAt && (
              <p className="text-xs text-muted-foreground" data-testid="ja-patient-derniere-transmission">
                Dernière transmission le {dateLocale(new Date(derniereTransmission.createdAt))}.
              </p>
            )}
            {erreurEnvoi && <PatientInlineMessage tone="error">{erreurEnvoi}</PatientInlineMessage>}
            <PatientButton
              data-testid="ja-patient-transmettre"
              className="w-full sm:w-auto"
              onClick={() => { void transmettre(); }}
              loading={envoi}
              loadingLabel="Transmission en cours…"
              disabled={!idPatient || envoi}
            >
              Transmettre à mon praticien
            </PatientButton>
          </PatientCard>
        </div>
      )}

      <div data-testid="ja-patient-solutions">
        <PatientCard padding="sm" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Solutions qui marchent pour moi</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              data-testid="ja-patient-solution-input"
              type="text"
              className={patientInputClassName}
              value={solutionInput}
              onChange={(e) => setSolutionInput(e.target.value)}
              placeholder="Exemple: préparer la veille"
            />
            <PatientButton data-testid="ja-patient-ajouter-solution" variant="ghost" className="w-full sm:w-auto" onClick={addSolution}>
              Ajouter
            </PatientButton>
          </div>
          {solutions.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune solution notée pour l’instant.</p>
          ) : (
            <ul className="space-y-1 text-sm text-foreground">
              {solutions.map((solution) => <li key={solution.solutionId}>• {solution.labelPatient}</li>)}
            </ul>
          )}
        </PatientCard>
      </div>

      </>
      )}

      <div data-testid="ja-patient-historique">
        <PatientCard padding="sm" className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Historique local</p>
          {traces.length === 0 && pauses.length === 0 && plans.length === 0 ? (
            <p className="text-xs text-muted-foreground">Pas encore d’élément enregistré.</p>
          ) : (
            <div className="space-y-2 text-sm max-h-80 overflow-y-auto pr-1">
              {traces.map((trace) => (
                <div key={trace.traceId} className="rounded-lg border border-border p-2">
                  <p className="font-medium text-foreground">{trace.localDate} · {LABELS_ISSUE_TRACE[trace.issue]}</p>
                  {trace.frictionCode && <p className="text-xs text-muted-foreground">{FRICTIONS[trace.frictionCode]}</p>}
                  {trace.motLibre && <p className="text-xs text-muted-foreground">{trace.motLibre}</p>}
                </div>
              ))}
              {pauses.map((pause) => (
                <div key={pause.eventId} className="rounded-lg border border-border p-2 text-muted-foreground">
                  {pause.semaineDu} · {LABEL_PAUSE_PATIENT}
                </div>
              ))}
              {plans.map((plan) => (
                <div key={plan.eventId} className="rounded-lg border border-border p-2 text-muted-foreground">
                  {plan.from} · Plan minimal {plan.dureeJours} jour(s)
                </div>
              ))}
            </div>
          )}
        </PatientCard>
      </div>
    </div>
  );
}
