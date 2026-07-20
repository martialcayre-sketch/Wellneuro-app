'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  FRICTIONS,
  LABELS_ISSUE_TRACE,
  LABEL_PAUSE_PATIENT,
  buildSilenceUtileMessage,
  createAttentionBudget,
  createEpisode,
  createTrialTrace,
  declarePatientPause,
  describeCoverage,
  type FoodObservationEpisode,
  type IntraEpisodeSolution,
  type MinimalPlanEvent,
  type PatientPauseEvent,
  type TraceIssue,
  type TrialTrace,
} from '@/lib/food-observation';
import { PatientCard } from '@/components/patient/ui/PatientCard';
import { PatientButton } from '@/components/patient/ui/PatientButton';
import { PatientField, patientInputClassName } from '@/components/patient/ui/PatientField';
import { PatientInlineMessage } from '@/components/patient/ui/PatientInlineMessage';
import { PatientPageHeader } from '@/components/patient/ui/PatientPageHeader';

function dateLocale(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function plusDays(value: Date, days: number): Date {
  const clone = new Date(value);
  clone.setDate(clone.getDate() + days);
  return clone;
}

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// L'épisode local porte l'`idPatient` de la session, jamais le jeton d'URL :
// c'est aussi ce que `saveJaObservationSnapshot` exige côté serveur (il rejette
// tout épisode dont le `patientId` ne correspond pas au patient).
function buildEpisode(idPatient: string): FoodObservationEpisode {
  const start = new Date();
  const end = plusDays(start, 6);
  return createEpisode({
    episodeId: `ja_${idPatient}`,
    patientId: idPatient,
    startDate: dateLocale(start),
    endDate: dateLocale(end),
    budget: createAttentionBudget(3),
    content: {
      regime: 'essai',
      hypothese: 'Une action simple et répétable est plus réaliste qu’un suivi exhaustif.',
      action: {
        actionId: 'action_petit_dejeuner',
        labelPatient: 'Ajouter une source de protéines au petit-déjeuner',
        idealPlan: 'Ajouter une source de protéines chaque matin.',
        simplePlan: 'Le faire trois fois cette semaine.',
        secoursPlan: 'Version minimale prête en 2 minutes.',
      },
    },
  });
}

type PatientFoodObservationDraft = {
  budget: number;
  traces: TrialTrace[];
  pauses: PatientPauseEvent[];
  plans: MinimalPlanEvent[];
  solutions: IntraEpisodeSolution[];
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
  const [episode, setEpisode] = useState<FoodObservationEpisode>(() => {
    const baseEpisode = buildEpisode(idPatient ?? EPISODE_SANS_SESSION);
    if (!initialDraft) return baseEpisode;
    let restoredBudget = baseEpisode.budget;
    try {
      restoredBudget = createAttentionBudget(initialDraft.budget);
    } catch {
      restoredBudget = baseEpisode.budget;
    }
    return {
      ...baseEpisode,
      budget: restoredBudget,
    };
  });
  const [traces, setTraces] = useState<TrialTrace[]>(() => initialDraft?.traces ?? []);
  const [pauses, setPauses] = useState<PatientPauseEvent[]>(() => initialDraft?.pauses ?? []);
  const [plans, setPlans] = useState<MinimalPlanEvent[]>(() => initialDraft?.plans ?? []);
  const [solutions, setSolutions] = useState<IntraEpisodeSolution[]>(() => initialDraft?.solutions ?? []);

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
  const [decision, setDecision] = useState<PatientDecision | null>(null);
  const [decisionLoading, setDecisionLoading] = useState<boolean>(true);
  const [error, setError] = useState('');

  const couverture = useMemo(
    () => describeCoverage(traces.length, { tracesParSemaine: budget }),
    [traces.length, budget],
  );

  const silenceUtile = traces.length >= budget ? buildSilenceUtileMessage() : null;

  useEffect(() => {
    writeDraft(idPatient, { budget, traces, pauses, plans, solutions });
  }, [budget, traces, pauses, plans, solutions, idPatient]);

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
    setEpisode(prev => ({ ...prev, budget: createAttentionBudget(value) }));
  };

  const addTrace = () => {
    setError('');
    try {
      const trace = createTrialTrace({
        traceId: makeId('trace'),
        episodeId: episode.episodeId,
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
        episodeId: episode.episodeId,
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
      episodeId: episode.episodeId,
      from: dateLocale(new Date()),
      dureeJours,
      activatedBy: 'patient',
      rationaleRequired: false,
    };
    setPlans(prev => [plan, ...prev]);
  };

  const addSolution = () => {
    const label = solutionInput.trim();
    if (!label) return;
    const solution: IntraEpisodeSolution = {
      solutionId: makeId('solution'),
      episodeId: episode.episodeId,
      labelPatient: label,
      contexte: 'Semaine en cours',
    };
    setSolutions(prev => [solution, ...prev]);
    setSolutionInput('');
  };

  const resetLocalDraft = () => {
    clearDraft(idPatient);
    const baseEpisode = buildEpisode(idPatient ?? EPISODE_SANS_SESSION);
    setEpisode(baseEpisode);
    setBudget(baseEpisode.budget.tracesParSemaine);
    setTraces([]);
    setPauses([]);
    setPlans([]);
    setSolutions([]);
    setOccasionPresentee(true);
    setFaisable('oui');
    setIssue('fait');
    setFrictionCode('');
    setMotLibre('');
    setSolutionInput('');
    setError('');
    setDraftRestored(false);
  };

  return (
    <div className="w-full max-w-2xl space-y-6">
      <PatientPageHeader
        title="Ma spirale alimentaire"
        subtitle="Version locale de travail JA5-02: vous décrivez l’essai sans détailler tous les repas."
      />

      {!idPatient && (
        <PatientInlineMessage tone="info">
          Votre session n’est pas ouverte : ce que vous saisissez ici ne sera pas conservé sur cet appareil.
        </PatientInlineMessage>
      )}

      {draftRestored && (
        <PatientInlineMessage tone="info">Brouillon local restauré sur cet appareil.</PatientInlineMessage>
      )}

      {decisionLoading ? (
        <PatientInlineMessage tone="info">Mise à jour de la décision praticien en cours…</PatientInlineMessage>
      ) : decision ? (
        <PatientCard padding="sm" className="space-y-2 border-primary/20" data-testid="ja-patient-decision-active">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Décision active du praticien</p>
          <p className="text-sm text-foreground">Jalon {decision.milestone} · charge perçue {decision.chargePercue} · budget global {decision.budgetChargeGlobal}.</p>
          <p className="text-sm text-foreground">{decision.feedbackPatient}</p>
          <p className="text-xs text-muted-foreground">Ajustement de la décision: {decision.deltaDecision}</p>
        </PatientCard>
      ) : null}

      <div className="flex justify-end">
        <PatientButton data-testid="ja-patient-reset-local" variant="danger-text" onClick={resetLocalDraft}>
          Réinitialiser le brouillon local
        </PatientButton>
      </div>

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
          {silenceUtile && <p className="text-sm text-primary">{silenceUtile}</p>}
        </PatientCard>
      </div>

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
