'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from 'react';
import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Activity,
  Check,
  ChevronRight,
  Circle,
  Clock,
  FileText,
  HelpCircle,
  ListChecks,
  ShieldAlert,
  Stethoscope,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { EquilibreApiResponse, PrioriteBesoin } from '@/app/api/praticien/equilibre/route';
import type { PatientsApiResponse } from '@/app/api/praticien/patients/route';
import type { PatchAssignationResponse } from '@/app/api/praticien/assignations/route';
import type { ReponsesApiResponse, ReponseQuestionnaire } from '@/app/api/praticien/reponses/route';
import type { ResultatMomentum } from '@/lib/equilibre/types';
import type { ScoreSubScore } from '@/lib/scoring/types';
import type { Trajectoire } from '@/lib/protocol/trajectoire';
import { buildMiniSynthese } from '@/lib/scoring/miniSynthese';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { ScoreZones } from '@/components/ui/ScoreZones';
import { EvidenceBadge } from '@/components/ui/EvidenceBadge';
import { Badge, type BadgeVariant } from '@/components/ui/Badge';
import { CerclesConcentriques } from '@/components/ui/CerclesConcentriques';
import { Chip } from '@/components/ui/Chip';
import { SpiraleTrajectoire } from '@/components/ui/SpiraleTrajectoire';
import { ModeConsultation } from '@/components/ui/ModeConsultation';
import { PatientPreview } from '@/components/PatientPreview';
import { DetailBesoinsPanel } from '@/components/DetailBesoinsPanel';
import { PractitionerFoodObservationPanel } from '@/components/food-observation/PractitionerFoodObservationPanel';
import { CorrespondanceMedecinPanel } from '@/components/correspondance/CorrespondanceMedecinPanel';
import {
  ClinicalRuntimeSection,
  type EtatRuntimeClinique,
  type PhaseCycleClinique,
} from '@/components/patient-cockpit/ClinicalRuntimeSection';
import { TrajectoirePanel } from '@/components/patient-cockpit/TrajectoirePanel';
import { deriverEpisodeBandeau, phaseInitiale } from '@/lib/trajectoire-partagee/contrat';
import type { ValidationErgoC1Fixture } from '@/lib/clinical-engine/validationErgoFixture';
import type { RelectureProtocoleSoumission } from '@/components/patient-cockpit/ProtocolMiniBuilder';
import type { ProtocolDraft } from '@/lib/clinical-engine/types';

type ScoreCertification = { source?: string; status?: string };

function getArrayField(scores: Record<string, unknown> | null, key: string): string[] {
  const value = scores?.[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function certificationBadge(certification: ScoreCertification | null) {
  if (!certification) return null;
  if (certification.source === 'drive' && certification.status === 'certifie') {
    return { label: 'Certifié Drive', variant: 'success' as BadgeVariant };
  }
  if (certification.source === 'drive' && certification.status === 'ambigu') {
    return { label: 'Drive ambigu', variant: 'warning' as BadgeVariant };
  }
  if (certification.status === 'a_verifier') {
    return { label: 'À vérifier', variant: 'warning' as BadgeVariant };
  }
  if (certification.status === 'non_score') {
    return { label: 'Non scoré', variant: 'neutral' as BadgeVariant };
  }
  return { label: 'Non certifié', variant: 'neutral' as BadgeVariant };
}

function interpColorToVariant(color?: string): BadgeVariant {
  if (color === 'success' || color === 'warning' || color === 'danger') return color;
  return 'neutral';
}

function ObjetGauge({ label, value }: { label: string; value: number | null }) {
  if (value === null) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 bg-surface border border-border rounded-xl p-4 h-[148px]">
        <span className="text-sm text-muted-foreground">Non mesuré</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wide text-center">{label}</span>
      </div>
    );
  }
  return <ScoreGauge value={value} label={label} />;
}

function MomentumCard({ momentum }: { momentum: ResultatMomentum | null }) {
  if (!momentum) {
    return (
      <div className="flex flex-col items-center justify-center gap-1 bg-surface border border-border rounded-xl p-4 h-[148px]">
        <span className="text-sm text-muted-foreground">Non mesuré</span>
        <span className="text-xs text-muted-foreground uppercase tracking-wide">Momentum</span>
        <span className="text-xs text-muted-foreground text-center">Historique insuffisant</span>
      </div>
    );
  }
  const signe = momentum.delta > 0 ? '+' : '';
  return (
    <div className="flex flex-col items-center justify-center gap-1 bg-surface border border-border rounded-xl p-4 h-[148px]">
      <span className="text-2xl font-bold text-foreground">
        {signe}
        {momentum.delta}
      </span>
      <span className="text-xs text-muted-foreground uppercase tracking-wide">Momentum</span>
      <Badge variant={momentum.tendance === 'hausse' ? 'success' : momentum.tendance === 'baisse' ? 'warning' : 'neutral'}>
        {momentum.tendance}
      </Badge>
    </div>
  );
}

function LegendeNiveauxPreuve() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
      <span><span className="font-medium text-foreground">A</span> — questionnaire clinique validé</span>
      <span><span className="font-medium text-foreground">B</span> — référentiel neuronutrition</span>
      <span><span className="font-medium text-foreground">C</span> — biologie fonctionnelle interprétative</span>
      <span><span className="font-medium text-foreground">D</span> — hypothèse WellNeuro</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Poste de pilotage (A6-R1) — ossature
// ---------------------------------------------------------------------------

type OngletFiche = 'cockpit' | 'besoins' | 'alimentation' | 'trajectoire' | 'correspondance';

const ONGLETS: { id: OngletFiche; libelle: string }[] = [
  { id: 'cockpit', libelle: 'Poste de pilotage' },
  { id: 'besoins', libelle: 'Les 12 besoins' },
  { id: 'alimentation', libelle: 'Alimentation' },
  { id: 'trajectoire', libelle: 'Trajectoire' },
  { id: 'correspondance', libelle: 'Correspondance' },
];

type IdPhase = 'patient' | 'donnees' | 'comprehension' | 'decision' | 'actions' | 'suivi' | 'reevaluation';
// `inconnu` : l'état réel n'a pas pu être établi (runtime en chargement ou en
// erreur) — on l'affiche tel quel plutôt que d'affirmer « à ouvrir ».
type StatutPhase = 'fait' | 'en_attente' | 'a_ouvrir' | 'inconnu';

// Colonne vertébrale = le cycle clinique 3.x. Une phase = une zone focale ;
// on navigue par phase, jamais par défilement (A6-R1).
const PHASES: { id: IdPhase; libelle: string; runtime: PhaseCycleClinique | null }[] = [
  { id: 'patient', libelle: 'Patient', runtime: null },
  { id: 'donnees', libelle: 'Données fiables', runtime: 'donnees' },
  { id: 'comprehension', libelle: 'Compréhension', runtime: 'comprehension' },
  { id: 'decision', libelle: 'Décision 21 j', runtime: 'decision' },
  { id: 'actions', libelle: 'Actions', runtime: 'actions' },
  { id: 'suivi', libelle: 'Suivi', runtime: 'suivi' },
  { id: 'reevaluation', libelle: 'Réévaluation', runtime: 'reevaluation' },
];

const LIBELLE_STATUT: Record<StatutPhase, string> = {
  fait: 'renseignée',
  en_attente: 'en attente',
  a_ouvrir: 'à ouvrir',
  inconnu: 'indéterminée',
};

// Le statut n'est jamais porté par la seule couleur : icône + texte.
function IconeStatut({ statut }: { statut: StatutPhase }) {
  if (statut === 'fait') return <Check aria-hidden="true" size={14} strokeWidth={2.5} className="text-status-success" />;
  if (statut === 'en_attente') return <Clock aria-hidden="true" size={14} strokeWidth={2} className="text-accent" />;
  if (statut === 'inconnu') return <HelpCircle aria-hidden="true" size={14} strokeWidth={2} className="text-muted-foreground" />;
  return <Circle aria-hidden="true" size={14} strokeWidth={2} className="text-muted-foreground" />;
}

// Instrument à tiroir — patron Radix repris de `PatientPreview` : la densité
// s'ouvre AU CLIC (jamais au survol) puis se referme.
function InstrumentTiroir({
  libelle,
  description,
  icone: Icone,
  children,
  large = false,
}: {
  libelle: string;
  description: string;
  icone: LucideIcon;
  children: ReactNode;
  /** Dérogation de largeur (maquette : 440px par défaut ; les tableaux
   * denses comme « Détail des réponses » gardent la pane large). */
  large?: boolean;
}) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <button
          type="button"
          className="flex min-h-12 w-full items-center gap-2 rounded-[11px] border border-border bg-surface px-3 py-2 text-left text-14 font-medium text-foreground shadow-card hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          <Icone aria-hidden="true" size={18} strokeWidth={2} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">{libelle}</span>
          <ChevronRight aria-hidden="true" size={16} strokeWidth={2} className="shrink-0 text-muted-foreground" />
        </button>
      </Dialog.Trigger>
      <Dialog.Portal>
        {/* data-theme requis : Radix portale hors de [data-theme="praticien"]
            posé par dashboard/layout.tsx (cf. PatientPreview.tsx). */}
        <Dialog.Overlay data-theme="praticien" className="fixed inset-0 z-50 bg-foreground/35" />
        <Dialog.Content
          data-theme="praticien"
          className={`fixed right-0 top-0 z-50 h-full w-full overflow-y-auto border-l border-border bg-surface px-[22px] py-5 shadow-pop focus:outline-none ${
            large ? 'max-w-2xl' : 'lg:w-[min(440px,86%)] lg:max-w-none max-w-2xl'
          }`}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">Instrument</p>
              <Dialog.Title className="font-display text-[19px] font-bold text-foreground">{libelle}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm text-muted-foreground">{description}</Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                aria-label={`Fermer l’instrument ${libelle}`}
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                <X aria-hidden="true" size={20} strokeWidth={2} />
              </button>
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FichePatientPanel({
  idPatient,
  fixtureValidationErgo = null,
}: {
  idPatient: string;
  fixtureValidationErgo?: ValidationErgoC1Fixture | null;
}) {
  const [data, setData] = useState<EquilibreApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [reponses, setReponses] = useState<ReponseQuestionnaire[]>([]);
  const [loadingReponses, setLoadingReponses] = useState(true);
  const [assignationsModif, setAssignationsModif] = useState<PatientsApiResponse['assignations']>([]);
  const [deverrouillageId, setDeverrouillageId] = useState<string | null>(null);
  const [modeConsultationActif, setModeConsultationActif] = useState(false);
  const [ongletActif, setOngletActif] = useState<OngletFiche>('cockpit');
  // Phase focale. 'decision' n'est plus qu'un point de départ neutre : la
  // phase réellement exigible est calculée par la règle D5 (SP-CONV LOT-02)
  // dès que l'état runtime est établi — sauf si le praticien a déjà navigué.
  const [phaseActive, setPhaseActive] = useState<IdPhase>('decision');
  const phaseChoisieParPraticien = useRef(false);
  const phaseInitialiseeRef = useRef(false);
  const [trajectoire, setTrajectoire] = useState<Trajectoire | null>(null);
  // « inconnue » tant qu'aucune lecture n'a abouti : un échec de lecture ne
  // doit JAMAIS être présenté comme une absence d'épisode (affirmation fausse
  // sur l'historique clinique).
  const [etatTrajectoire, setEtatTrajectoire] = useState<'inconnue' | 'chargement' | 'chargee' | 'erreur'>('inconnue');
  const [erreurTrajectoire, setErreurTrajectoire] = useState<string | null>(null);
  const [etatRuntime, setEtatRuntime] = useState<EtatRuntimeClinique | null>(null);
  const refsPhases = useRef<(HTMLButtonElement | null)[]>([]);
  const refsOnglets = useRef<(HTMLButtonElement | null)[]>([]);
  // Harnais de validation ergonomique C1 (dev uniquement — voir
  // validationErgoFixture.ts) : la fixture est construite côté serveur par la
  // page et reçue en prop ; le brouillon relu (Épreuve 2) est construit par le
  // moteur via la route dev /api/dev/validation-ergo. Rien n'est sauvegardé
  // ni transmis au patient.
  const fixtureErgo = fixtureValidationErgo;
  const [protocolDraftErgo, setProtocolDraftErgo] = useState<ProtocolDraft | null>(null);
  const [erreurErgo, setErreurErgo] = useState<string | null>(null);

  const relectureErgo = (soumission: RelectureProtocoleSoumission) => {
    fetch('/api/dev/validation-ergo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(soumission),
    })
      .then(async r => {
        const payload = await r.json();
        if (!r.ok || !payload.protocolDraft) {
          throw new Error(typeof payload.error === 'string' ? payload.error : 'Réponse inattendue.');
        }
        setProtocolDraftErgo(payload.protocolDraft as ProtocolDraft);
        setErreurErgo(null);
      })
      .catch((error: unknown) => {
        setProtocolDraftErgo(null);
        setErreurErgo(error instanceof Error ? error.message : 'Impossible de construire le brouillon relu.');
      });
  };

  useEffect(() => {
    setLoading(true);
    fetch(`/api/praticien/equilibre?idPatient=${encodeURIComponent(idPatient)}`)
      .then(r => r.json())
      .then((d: EquilibreApiResponse) => setData(d))
      .catch(() => setData({ unavailable: true, reason: 'exception' }))
      .finally(() => setLoading(false));
  }, [idPatient]);

  useEffect(() => {
    if (!data || 'unavailable' in data) return;
    const email = data.patient.email;

    setLoadingReponses(true);
    fetch(`/api/praticien/reponses?email=${encodeURIComponent(email)}`)
      .then(r => r.json())
      .then((d: ReponsesApiResponse) => setReponses(d.reponses ?? []))
      .catch(() => setReponses([]))
      .finally(() => setLoadingReponses(false));

    fetch('/api/praticien/patients')
      .then(r => r.json())
      .then((d: PatientsApiResponse) => {
        setAssignationsModif(
          (d.assignations ?? []).filter(a => a.emailPatient === email && a.statutReponses === 'modification_demandee')
        );
      })
      .catch(() => setAssignationsModif([]));
  }, [data]);

  // Onglet « Trajectoire » : lecture seule. Une erreur de lecture est
  // distinguée d'une absence d'épisode et reste rejouable (aucun verrou
  // définitif posé avant la réponse).
  const chargerTrajectoire = useCallback(async () => {
    setEtatTrajectoire('chargement');
    setErreurTrajectoire(null);
    try {
      const reponse = await fetch(`/api/praticien/trajectoire?idPatient=${encodeURIComponent(idPatient)}`);
      const payload = (await reponse.json()) as {
        ok?: boolean;
        reason?: string;
        trajectoire?: Trajectoire;
      };
      if (!reponse.ok || !payload?.ok) {
        setEtatTrajectoire('erreur');
        setErreurTrajectoire(
          payload?.reason === 'unauthenticated'
            ? 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous pour lire la trajectoire.'
            : payload?.reason === 'patient_not_found'
              ? 'Patient introuvable : la trajectoire n’a pas pu être lue.'
              : 'La trajectoire n’a pas pu être lue (erreur technique). L’historique clinique de ce patient n’est pas affiché.',
        );
        return;
      }
      setTrajectoire(payload.trajectoire ?? null);
      setEtatTrajectoire('chargee');
    } catch {
      setEtatTrajectoire('erreur');
      setErreurTrajectoire(
        'La trajectoire n’a pas pu être lue (erreur réseau). L’historique clinique de ce patient n’est pas affiché.',
      );
    }
  }, [idPatient]);

  // Lecture désormais engagée dès l'ouverture de la fiche (SP-CONV LOT-02) :
  // le bandeau d'épisode (« Épisode N en cours · T0 + X j ») en a besoin au
  // niveau cockpit, pas seulement dans l'onglet Trajectoire.
  useEffect(() => {
    if (etatTrajectoire !== 'inconnue') return;
    void chargerTrajectoire();
  }, [etatTrajectoire, chargerTrajectoire]);

  // Statuts du rail — dérivés de l'état réel (réponses reçues, demandes de
  // correction, état remonté par le runtime clinique). Aucun statut inventé :
  // en l'absence d'information, la phase reste « à ouvrir » — et tant que
  // l'état réel n'est pas établi, « indéterminée ». Hissé avant les retours
  // anticipés (SP-CONV LOT-02) pour nourrir aussi la phase initiale D5.
  const statutPhase = useCallback(
    (id: IdPhase): StatutPhase => {
      if (!data || 'unavailable' in data) return 'inconnu';
      const priorites = data.priorites;
      if (id === 'patient') return assignationsModif.length > 0 ? 'en_attente' : 'fait';
      if (id === 'donnees') return reponses.length > 0 ? 'fait' : 'en_attente';
      if (id === 'comprehension') {
        return priorites.some(p => p.couverture !== null) ? 'fait' : 'en_attente';
      }
      // Phases dérivées du runtime : tant que son état n'est pas établi
      // (première mesure absente, chargement en cours ou erreur), le statut est
      // honnêtement « indéterminée » — jamais une affirmation par défaut.
      if (!etatRuntime || etatRuntime.chargement || etatRuntime.erreur !== null) return 'inconnu';
      if (id === 'decision') return etatRuntime.episodeConfirme ? 'fait' : 'en_attente';
      if (id === 'actions') {
        if (etatRuntime.nombreVersions > 0) return 'fait';
        return etatRuntime.episodeConfirme ? 'en_attente' : 'a_ouvrir';
      }
      if (id === 'suivi') {
        if (etatRuntime.suiviRenseigne) return 'fait';
        return etatRuntime.episodeConfirme ? 'en_attente' : 'a_ouvrir';
      }
      // Réévaluation : « renseignée » uniquement si un jalon POST-T0 (J21/J42/J90)
      // a réellement été mesuré (booléens `mesure` de la trajectoire, A8-2) — un
      // T0 confirmé ouvre un cycle mais ne constitue pas une réévaluation. Tant que
      // la lecture de la trajectoire n'a pas abouti (en vol) ou a échoué, l'état
      // est inconnu, jamais affirmé « à ouvrir ».
      if (etatRuntime.trajectoireErreur || etatRuntime.trajectoireEnLecture) return 'inconnu';
      return etatRuntime.reevaluationMesuree ? 'fait' : 'a_ouvrir';
    },
    [data, assignationsModif, reponses, etatRuntime],
  );

  // Navigation praticien : le choix manuel prime définitivement sur la
  // sélection automatique, et la dernière phase consultée est mémorisée en
  // LOCAL uniquement (règle D5, 4e rang) — jamais en base.
  const clePhaseMemorisee = `wn.fiche.derniere-phase.${idPatient}`;
  const choisirPhase = useCallback(
    (id: IdPhase) => {
      phaseChoisieParPraticien.current = true;
      setPhaseActive(id);
      try {
        window.localStorage.setItem(clePhaseMemorisee, id);
      } catch {
        // Stockage local indisponible (navigation privée…) : la mémoire de
        // phase est un confort, jamais une condition.
      }
    },
    [clePhaseMemorisee],
  );

  // Phase initiale D5 (SP-CONV LOT-02) : premier bloqueur de sécurité >
  // première action exigible > première phase en attente > dernière phase
  // consultée. Une seule fois, jamais après une navigation du praticien, et
  // jamais tant que l'état runtime n'est pas établi (état neutre).
  useEffect(() => {
    if (phaseInitialiseeRef.current || phaseChoisieParPraticien.current) return;
    if (loading || !data || 'unavailable' in data) return;
    if (!etatRuntime || etatRuntime.chargement) return;

    let memoire: IdPhase | null = null;
    try {
      const brut = window.localStorage.getItem(clePhaseMemorisee);
      if (brut && PHASES.some(p => p.id === brut)) memoire = brut as IdPhase;
    } catch {
      memoire = null;
    }

    const cible = phaseInitiale({
      chargement: false,
      bloqueurs: etatRuntime.erreur === null && etatRuntime.decisionBloquee ? ['actions'] : [],
      actionsExigibles: [
        ...(assignationsModif.length > 0 ? (['patient'] as const) : []),
        ...(etatRuntime.erreur === null && !etatRuntime.episodeConfirme ? (['decision'] as const) : []),
      ],
      statuts: Object.fromEntries(PHASES.map(p => [p.id, statutPhase(p.id)])),
      dernierePhaseConsultee: memoire,
    });
    if (cible) {
      phaseInitialiseeRef.current = true;
      setPhaseActive(cible);
    }
  }, [loading, data, etatRuntime, assignationsModif, statutPhase, clePhaseMemorisee]);

  const onDebloquer = async (idAssignation: string) => {
    setDeverrouillageId(idAssignation);
    try {
      const r = await fetch('/api/praticien/assignations', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idAssignation }),
      });
      const json = (await r.json()) as PatchAssignationResponse;
      if (json.success) setAssignationsModif(prev => prev.filter(a => a.idAssignation !== idAssignation));
    } finally {
      setDeverrouillageId(null);
    }
  };

  // Navigation clavier du rail de phases (tablist vertical).
  const onClavierRail = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const suivant =
      event.key === 'ArrowDown' || event.key === 'ArrowRight'
        ? (index + 1) % PHASES.length
        : event.key === 'ArrowUp' || event.key === 'ArrowLeft'
          ? (index - 1 + PHASES.length) % PHASES.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? PHASES.length - 1
              : null;
    if (suivant === null) return;
    event.preventDefault();
    choisirPhase(PHASES[suivant].id);
    refsPhases.current[suivant]?.focus();
  };

  // Navigation clavier des onglets in-fiche (tablist horizontal, tabindex
  // roving) — sans quoi les onglets inactifs sortent de l'ordre de tabulation.
  const onClavierOnglets = (event: ReactKeyboardEvent<HTMLButtonElement>, index: number) => {
    const suivant =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? (index + 1) % ONGLETS.length
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? (index - 1 + ONGLETS.length) % ONGLETS.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? ONGLETS.length - 1
              : null;
    if (suivant === null) return;
    event.preventDefault();
    setOngletActif(ONGLETS[suivant].id);
    refsOnglets.current[suivant]?.focus();
  };

  if (loading) {
    return <div className="text-base text-muted-foreground">Chargement de la fiche patient...</div>;
  }

  if (!data || 'unavailable' in data) {
    const reason = data && 'unavailable' in data ? data.reason : 'exception';
    const message =
      reason === 'patient_not_found'
        ? 'Patient introuvable.'
        : reason === 'unauthenticated'
          ? 'Votre session a expiré. Déconnectez-vous puis reconnectez-vous.'
          : 'Erreur technique. Vérifiez le terminal Next.js.';
    return <div className="bg-muted border border-border rounded-xl p-4 text-base text-muted-foreground">{message}</div>;
  }

  const { patient, objetsCliniques, priorites } = data;
  const derniereAssignationId = reponses[0]?.idAssignation || null;
  const nomComplet = `${patient.prenom} ${patient.nom}`.trim();
  const derniereReponse = reponses[0]?.dateSoumission
    ? new Date(reponses[0].dateSoumission).toLocaleDateString('fr-FR')
    : null;

  const phaseCourante = PHASES.find(p => p.id === phaseActive) ?? PHASES[0];

  // Bandeau d'épisode (SP-CONV LOT-02) — dérivé du contrat partagé sur les
  // cycles G2 persistés. Null tant que la trajectoire n'est pas lue ou sans
  // aucun cycle : le bandeau n'affirme alors rien.
  const bandeauEpisode =
    etatTrajectoire === 'chargee' && trajectoire
      ? deriverEpisodeBandeau(trajectoire.cycles, new Date())
      : null;

  // --- Contenus des instruments (tiroirs) -----------------------------------
  const tableauBesoins = (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-muted text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left">Besoin</th>
            <th className="px-4 py-2 text-left">Couverture</th>
            <th className="px-4 py-2 text-left">Niveau de preuve</th>
          </tr>
        </thead>
        <tbody>
          {priorites.map((p: PrioriteBesoin) => (
            <tr key={p.besoin} className="border-t border-border">
              <td className="px-4 py-2">{p.libellePraticien}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {p.couverture !== null ? (
                  /* Piste neutre (sans zones) : la couverture n'a pas de bornes
                     de référentiel — aucun seuil n'est suggéré, le chiffre
                     reste affiché à côté du point. */
                  <span className="flex items-center gap-2">
                    <ScoreZones
                      value={p.couverture}
                      max={100}
                      ariaLabel={`Couverture ${p.couverture} %`}
                      className="w-16"
                    />
                    {p.couverture}%
                  </span>
                ) : (
                  '—'
                )}
              </td>
              <td className="px-4 py-2"><EvidenceBadge niveau={p.niveauPreuve} /></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 border-t border-border">
        <LegendeNiveauxPreuve />
      </div>
    </div>
  );

  const cartesObjetsCliniques = (
    /* 2 colonnes fixes : la pane de tiroir fait 440px (maquette), les
       breakpoints viewport de Tailwind n'y voient rien. */
    <div className="grid grid-cols-2 gap-3">
      <ObjetGauge label="Indice global" value={objetsCliniques.indiceGlobal} />
      <ObjetGauge label="Stabilité métabolique" value={objetsCliniques.stabiliteMetabolique} />
      <ObjetGauge label="Réserve d'adaptation" value={objetsCliniques.reserveAdaptation} />
      <ObjetGauge label="Clarté" value={objetsCliniques.clarte} />
      <MomentumCard momentum={objetsCliniques.momentum} />
    </div>
  );

  const tableauReponses = (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {loadingReponses ? (
        <div className="px-4 py-4 text-base text-muted-foreground">Chargement...</div>
      ) : reponses.length === 0 ? (
        <div className="px-4 py-4 text-base text-muted-foreground">Aucun questionnaire complété pour ce patient.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-muted text-muted-foreground">
              <tr>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2 text-left">Questionnaire</th>
                <th className="px-4 py-2 text-left">Score</th>
                <th className="px-4 py-2 text-left">Interprétation</th>
                <th className="px-4 py-2 text-left">Qualité</th>
              </tr>
            </thead>
            <tbody>
              {reponses.map(r => {
                const scores = r.scoresParsed;
                const certification = certificationBadge((scores?.certification as ScoreCertification | undefined) ?? null);
                const missingIds = getArrayField(scores, 'missingIds');
                const notApplicable = getArrayField(scores, 'notApplicable');
                const note = typeof scores?.note === 'string' ? scores.note : '';
                const subScores = Array.isArray(scores?.subScores)
                  ? (scores!.subScores as ScoreSubScore[])
                  : [];
                const miniSynthese = buildMiniSynthese(scores);
                return (
                  <tr key={r.idReponse} className="border-t border-border align-top">
                    <td className="px-4 py-2 whitespace-nowrap text-muted-foreground">
                      {r.dateSoumission ? new Date(r.dateSoumission).toLocaleDateString('fr-FR') : '—'}
                    </td>
                    <td className="px-4 py-2 font-medium">
                      <div>{r.titre || r.idQuestionnaire || '—'}</div>
                      {miniSynthese && (
                        <div className="mt-1 text-xs font-normal italic text-foreground/80 max-w-md" title={miniSynthese}>
                          Synthèse : {miniSynthese}
                        </div>
                      )}
                      {note && (
                        <div className="mt-1 text-xs font-normal text-muted-foreground max-w-md" title={note}>
                          {note}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {subScores.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {subScores.map(sub => (
                            <div key={sub.id} className="flex items-center gap-2 whitespace-nowrap">
                              <span className="text-xs text-muted-foreground w-28 truncate" title={sub.label}>
                                {sub.label}
                              </span>
                              {typeof sub.total === 'number' && typeof sub.max === 'number' && (
                                <ScoreZones
                                  value={sub.total}
                                  max={sub.max}
                                  ranges={r.subScoreRanges?.[sub.id] ?? null}
                                  ariaLabel={`${sub.label} : ${sub.total} sur ${sub.max}${sub.interpretation?.label ? ` — ${sub.interpretation.label}` : ''}`}
                                />
                              )}
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                                {sub.total ?? '—'}
                                {typeof sub.max === 'number' ? `/${sub.max}` : ''}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : r.scorePrincipal !== null ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                          {r.scorePrincipal}
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground max-w-xs">
                      {subScores.length > 0 ? (
                        <div className="flex flex-col gap-1">
                          {subScores.map(sub => (
                            <div key={sub.id}>
                              {sub.interpretation?.label ? (
                                <Badge variant={interpColorToVariant(sub.interpretation.color)}>
                                  {sub.interpretation.label}
                                </Badge>
                              ) : (
                                <span>—</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="block truncate" title={r.interpretation}>
                          {r.interpretation || '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex flex-wrap gap-1.5">
                        {certification ? (
                          <Badge variant={certification.variant}>{certification.label}</Badge>
                        ) : (
                          <Badge variant="neutral">Historique</Badge>
                        )}
                        {missingIds.length > 0 && (
                          <Badge variant="warning">{missingIds.length} manquant(s)</Badge>
                        )}
                        {notApplicable.length > 0 && (
                          <Badge variant="neutral">{notApplicable.length} n/a</Badge>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  // --- Zone focale : contenu propre à la phase (hors runtime clinique) ------
  const focalLocal = () => {
    if (phaseActive === 'patient') {
      return (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-base text-foreground">{nomComplet}</p>
            <p className="mt-1 break-all text-base text-muted-foreground">{patient.email}</p>
            <p className="mt-2 text-base text-muted-foreground">
              {derniereReponse
                ? `Dernière réponse reçue le ${derniereReponse}.`
                : 'Aucune réponse reçue pour l’instant.'}
            </p>
          </div>
          {assignationsModif.length > 0 && (
            <section aria-label="Demandes de correction en attente" className="bg-surface border border-accent rounded-xl overflow-hidden">
              {assignationsModif.map(a => (
                <div key={a.idAssignation} className="px-4 py-3 border-b border-border last:border-b-0 flex items-start justify-between gap-3 bg-status-warning/10">
                  <div className="min-w-0">
                    <span className="text-base text-status-warning">
                      Demande de correction — <span className="font-medium">{a.titre || a.idQuestionnaire}</span>
                    </span>
                    {a.correctionCommentaire && (
                      <p className="text-xs text-status-warning mt-1 italic">« {a.correctionCommentaire} »</p>
                    )}
                  </div>
                  <button
                    onClick={() => onDebloquer(a.idAssignation)}
                    disabled={deverrouillageId === a.idAssignation}
                    className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-status-warning text-white disabled:opacity-60"
                  >
                    {deverrouillageId === a.idAssignation ? 'Déblocage...' : 'Débloquer'}
                  </button>
                </div>
              ))}
            </section>
          )}
        </div>
      );
    }

    if (phaseActive === 'donnees') {
      return (
        <div className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
          {loadingReponses
            ? 'Chargement des réponses...'
            : reponses.length === 0
              ? 'Aucun questionnaire complété pour ce patient.'
              : `${reponses.length} questionnaire(s) reçu(s). Le détail chiffré s’ouvre dans l’instrument « Détail des réponses ».`}
        </div>
      );
    }

    if (phaseActive === 'comprehension') {
      return (
        <div className="bg-surface border border-border rounded-xl p-4 flex justify-center">
          <CerclesConcentriques
            besoins={priorites.map(p => ({
              id: p.besoin,
              libelle: p.libellePraticien,
              strate: p.strate,
              couverture: p.couverture,
            }))}
          />
        </div>
      );
    }

    // Phases branchées sur le runtime clinique. Quand aucun épisode n'est
    // confirmé, `ClinicalRuntimeSection` ne rend rien pour Suivi / Réévaluation :
    // on affiche un état vide explicite (le « pourquoi ») pour distinguer
    // « rien à voir ici » d'un chargement en échec.
    // `etatRuntime` à null = première mesure non encore remontée : le runtime
    // affiche alors son propre bandeau de chargement / d'erreur, on n'ajoute rien.
    const runtimePret = etatRuntime !== null && !etatRuntime.chargement && etatRuntime.erreur === null;

    if (phaseActive === 'suivi' && runtimePret && !etatRuntime!.episodeConfirme) {
      return (
        <div role="status" className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
          Une décision de 21 jours doit d’abord être ouverte pour suivre ce patient. Les points d’étape J7/J14/J21
          apparaîtront ici une fois l’épisode confirmé.
        </div>
      );
    }

    if (phaseActive === 'reevaluation' && runtimePret && !etatRuntime!.episodeConfirme) {
      // Formulation STRUCTURELLE (non « résultat de lecture ») : sans épisode
      // confirmé, la trajectoire n'est jamais lue — on n'affirme donc pas
      // « aucun cycle disponible » (qui laisserait croire à un historique
      // consulté puis trouvé vide), on rattache l'absence de cycle à l'absence
      // d'épisode.
      return (
        <div role="status" className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
          La réévaluation (jalons T0 → J21 → J42 → J90) se construit après confirmation d’un épisode. Aucun épisode
          n’étant confirmé, il n’y a pas encore de cycle daté à afficher.
        </div>
      );
    }

    return null;
  };

  return (
    <ModeConsultation active={modeConsultationActif} onToggle={() => setModeConsultationActif(false)}>
    <div className="flex flex-col gap-4">
      {/* Chrome condensé (D10, SP-CONV LOT-02) : identité et actions tiennent
          sur une ligne en desktop — le cockpit prend l'espace restant de
          l'écran (calc ci-dessous : 64px de NavBar + paddings du main + cette
          ligne + les onglets ≈ 11.75rem). Zéro scroll de page en usage
          courant ; les bannières critiques, exceptionnelles, peuvent décaler. */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-[-0.02em] text-foreground">{nomComplet}</h2>
          <p className="break-all text-xs text-muted-foreground">{patient.email}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {derniereAssignationId && (
            <PatientPreview patientId={idPatient} assignationId={derniereAssignationId} />
          )}
          {!modeConsultationActif && (
            <button
              type="button"
              onClick={() => setModeConsultationActif(true)}
              className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              <Stethoscope size={16} strokeWidth={2} />
              Mode consultation
            </button>
          )}
          <Link href="/dashboard/patients" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
            ← Retour aux patients
          </Link>
        </div>
      </div>

      {/* Onglets in-fiche : plus de sous-vue en page pleine, plus de scroll. */}
      <div role="tablist" aria-label="Vues de la fiche patient" className="flex flex-wrap gap-1 rounded-xl border border-border bg-muted p-1">
        {ONGLETS.map((onglet, index) => {
          const actif = ongletActif === onglet.id;
          return (
            <button
              key={onglet.id}
              ref={element => {
                refsOnglets.current[index] = element;
              }}
              type="button"
              role="tab"
              id={`onglet-${onglet.id}`}
              aria-selected={actif}
              aria-controls={`panneau-${onglet.id}`}
              tabIndex={actif ? 0 : -1}
              onClick={() => setOngletActif(onglet.id)}
              onKeyDown={event => onClavierOnglets(event, index)}
              className={`min-h-11 rounded-lg px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${
                actif ? 'bg-surface font-semibold text-foreground shadow-card' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {onglet.libelle}
            </button>
          );
        })}
      </div>

      {fixtureErgo && (
        <div role="status" className="bg-status-warning/10 border border-accent rounded-xl px-4 py-3 text-base text-status-warning">
          Mode validation ergonomique — données fictives (fixture C1). Aucune sauvegarde, aucun envoi.
          {erreurErgo && <span className="block mt-1 font-medium">Erreur du harnais : {erreurErgo}</span>}
        </div>
      )}

      {/* Signal permanent (B2) : une demande de correction patient doit rester
          perceptible quel que soit l'ONGLET affiché (« Les 12 besoins »,
          « Alimentation », « Trajectoire »…) et pas seulement dans le cockpit —
          sans quoi le questionnaire reste verrouillé côté patient sans que le
          praticien le voie. Hissé au niveau de la fiche pour cette raison. Le
          déblocage lui-même reste dans la phase Patient du cockpit. */}
      {assignationsModif.length > 0 && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-accent bg-status-warning/10 px-4 py-2 text-base text-status-warning"
        >
          <Clock aria-hidden="true" size={16} strokeWidth={2} className="shrink-0" />
          <span className="min-w-0">
            {assignationsModif.length === 1
              ? '1 demande de correction en attente de déblocage.'
              : `${assignationsModif.length} demandes de correction en attente de déblocage.`}
          </span>
          {!(ongletActif === 'cockpit' && phaseActive === 'patient') && (
            <button
              type="button"
              onClick={() => {
                setOngletActif('cockpit');
                setPhaseActive('patient');
              }}
              className="ml-auto min-h-9 shrink-0 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Ouvrir la phase Patient
            </button>
          )}
        </div>
      )}

      {/* Signal permanent : un protocole bloqué (abstention non levée ou finding
          de sécurité) n'est détaillé que par ProtocolMiniBuilder, lequel vit
          dans la phase Actions — or la fiche s'ouvre sur Décision. Le praticien
          devait donc deviner qu'il fallait ouvrir un autre onglet pour
          apprendre qu'il était bloqué. Même traitement que les erreurs runtime,
          qui échappent déjà au filtre par phase : un bloqueur invisible est un
          bloqueur ignoré. Le libellé diffère volontairement de celui du panneau
          — deux nœuds portant le même texte casseraient le mode strict des E2E,
          et le panneau reste la source détaillée. */}
      {etatRuntime !== null
        && !etatRuntime.chargement
        && etatRuntime.erreur === null
        && etatRuntime.decisionBloquee && (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-accent bg-status-warning/10 px-4 py-2 text-base text-status-warning"
        >
          <ShieldAlert aria-hidden="true" size={16} strokeWidth={2} className="shrink-0" />
          <span className="min-w-0">Protocole bloqué — bloqueurs décisionnels à revoir.</span>
          {!(ongletActif === 'cockpit' && phaseActive === 'actions') && (
            <button
              type="button"
              onClick={() => {
                setOngletActif('cockpit');
                setPhaseActive('actions');
              }}
              className="ml-auto min-h-9 shrink-0 rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
            >
              Ouvrir la phase Actions
            </button>
          )}
        </div>
      )}

      {/* ------------------------------ Poste de pilotage ------------------ */}
      <div
        role="tabpanel"
        id="panneau-cockpit"
        aria-labelledby="onglet-cockpit"
        hidden={ongletActif !== 'cockpit'}
      >
        <section
          aria-label="Poste de pilotage clinique"
          className="overflow-hidden rounded-lg border border-border bg-muted shadow-card lg:h-[calc(100dvh-11.75rem)] lg:min-h-[420px] lg:grid lg:grid-rows-[auto,1fr]"
        >
          {/* En-tête du cockpit (bandeau trajectoire) = 1re rangée. Le signal
              de correction (B2) est hissé au niveau de la fiche pour rester
              visible depuis tous les onglets, pas seulement le cockpit. */}
          <div>
          {/* Bandeau trajectoire — toujours visible. Anatomie maquette cible :
              Spirale (emblème décoratif), identité en display 19px, position en
              mono, chip d'état à droite. */}
          <div className="flex flex-wrap items-center gap-4 border-b border-border bg-surface px-[18px] py-3.5">
            <SpiraleTrajectoire enCours className="shrink-0" />
            <div className="min-w-0">
              <p className="font-display text-[19px] font-bold leading-tight text-foreground">{nomComplet}</p>
              <p className="font-mono text-13 text-muted-foreground">
                {derniereReponse ? `Dernière réponse le ${derniereReponse}` : 'Aucune réponse reçue'}
              </p>
            </div>
            {/* Position d'épisode (SP-CONV LOT-02) — contrat partagé sur les
                cycles G2. Rien n'est affiché tant qu'aucun cycle n'existe. */}
            {bandeauEpisode && (
              <div className="min-w-0 border-l border-border pl-4">
                <p className="font-display text-[15px] font-semibold leading-tight text-foreground">
                  Épisode {bandeauEpisode.numeroEpisode} en cours
                </p>
                <p className="font-mono text-13 text-muted-foreground">{bandeauEpisode.positionLibelle}</p>
              </div>
            )}
            {/* Chip delta inter-tours : uniquement à version de score identique
                (A8-3) — sinon rien, jamais approximé. */}
            {bandeauEpisode?.deltaTourPrecedent && (
              <Chip variante="delta">
                Au tour précédent : momentum{' '}
                {bandeauEpisode.deltaTourPrecedent.tendance === 'hausse'
                  ? 'en hausse'
                  : bandeauEpisode.deltaTourPrecedent.tendance === 'baisse'
                    ? 'en baisse'
                    : 'stable'}{' '}
                ({bandeauEpisode.deltaTourPrecedent.delta > 0 ? '+' : ''}
                {bandeauEpisode.deltaTourPrecedent.delta})
              </Chip>
            )}
            <Chip variante="due" className="ml-auto">
              <IconeStatut statut={statutPhase(phaseCourante.id)} />
              Phase affichée : {phaseCourante.libelle} — {LIBELLE_STATUT[statutPhase(phaseCourante.id)]}
            </Chip>
          </div>
          </div>

          <div className="lg:grid lg:min-h-0 lg:grid-cols-[13rem,1fr,15rem]">
            {/* Rail des 7 phases = colonne vertébrale */}
            <div
              role="tablist"
              aria-orientation="vertical"
              aria-label="Cycle clinique"
              className="flex gap-1 overflow-x-auto border-b border-border p-2 lg:flex-col lg:overflow-y-auto lg:border-b-0 lg:border-r"
            >
              <p className="hidden px-2 pb-1 text-2xs font-semibold uppercase tracking-[.07em] text-muted-foreground lg:block">
                Cycle clinique
              </p>
              {PHASES.map((phase, index) => {
                const actif = phaseActive === phase.id;
                const statut = statutPhase(phase.id);
                // Anatomie maquette : puce 10px colorée par statut + statut
                // textuel — jamais la couleur seule. La phase due (en attente)
                // porte le liseré solaire inset ; la phase affichée garde la
                // carte claire. Un seul box-shadow à la fois (ils ne se
                // composent pas entre classes Tailwind).
                const couleurPuce =
                  statut === 'fait'
                    ? 'bg-status-success'
                    : statut === 'en_attente'
                      ? 'bg-accent'
                      : 'bg-transparent border border-border';
                const classesEtat = actif
                  ? 'bg-surface font-semibold text-foreground shadow-card'
                  : statut === 'en_attente'
                    ? 'bg-accent/10 font-semibold text-foreground shadow-[inset_3px_0_0_var(--color-accent)] hover:bg-accent/[.14]'
                    : 'text-muted-foreground hover:text-foreground';
                return (
                  <button
                    key={phase.id}
                    ref={element => {
                      refsPhases.current[index] = element;
                    }}
                    type="button"
                    role="tab"
                    id={`phase-${phase.id}`}
                    aria-selected={actif}
                    aria-controls="zone-focale"
                    tabIndex={actif ? 0 : -1}
                    onClick={() => choisirPhase(phase.id)}
                    onKeyDown={event => onClavierRail(event, index)}
                    className={`flex min-h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 py-2 text-left text-14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring ${classesEtat}`}
                  >
                    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${couleurPuce}`} />
                    <span className="min-w-0 flex-1 truncate">{phase.libelle}</span>
                    <span className="shrink-0 text-2xs text-muted-foreground">{LIBELLE_STATUT[statut]}</span>
                  </button>
                );
              })}
            </div>

            {/* Zone focale unique */}
            <div
              role="tabpanel"
              id="zone-focale"
              aria-labelledby={`phase-${phaseCourante.id}`}
              tabIndex={0}
              className="flex flex-col gap-4 p-4 lg:min-h-0 lg:overflow-y-auto"
            >
              <div>
                {/* « Phase due » quand la phase affichée est celle qui attend
                    une action (maquette LOT-02) — sinon l'eyebrow neutre. */}
                <p className="text-xs font-semibold uppercase tracking-[.06em] text-solar-ink">
                  {statutPhase(phaseCourante.id) === 'en_attente' ? 'Phase due' : 'Zone focale'}
                </p>
                <h3 className="font-display text-xl font-bold text-foreground">{phaseCourante.libelle}</h3>
              </div>
              {focalLocal()}
              {/* Le runtime clinique reste monté en permanence : seul l'affichage
                  est filtré par phase — aucun rechargement, aucun brouillon perdu. */}
              <ClinicalRuntimeSection
                idPatient={idPatient}
                fixture={fixtureErgo}
                protocolDraft={protocolDraftErgo}
                onFixtureReviewed={relectureErgo}
                phase={phaseCourante.runtime ?? 'aucune'}
                onAjusterProtocole={() => setPhaseActive('actions')}
                onEtatChange={setEtatRuntime}
              />
            </div>

            {/* Instruments à tiroir */}
            <div className="flex flex-col gap-2 border-t border-border p-3 lg:border-l lg:border-t-0 lg:overflow-y-auto">
              <p className="px-1 text-2xs font-semibold uppercase tracking-[.07em] text-muted-foreground">Instruments</p>
              <InstrumentTiroir
                libelle="Les 12 besoins"
                description="Couverture descriptive et niveau de preuve, par besoin. Aucune priorité clinique n’est déduite ici."
                icone={ListChecks}
              >
                {tableauBesoins}
                <p className="mt-3 text-base text-muted-foreground">
                  Le détail complet (radar, sources) est disponible dans l’onglet « Les 12 besoins ».
                </p>
              </InstrumentTiroir>
              <InstrumentTiroir
                libelle="Objets cliniques & momentum"
                description="Cartographie neuro-fonctionnelle : les 5 objets cliniques et le momentum."
                icone={Activity}
              >
                {cartesObjetsCliniques}
              </InstrumentTiroir>
              <InstrumentTiroir
                libelle="Détail des réponses"
                description="Détail technique des questionnaires reçus : scores, interprétations et qualité."
                icone={FileText}
                large
              >
                {tableauReponses}
              </InstrumentTiroir>
              <p className="px-1 text-xs text-muted-foreground">
                Chaque instrument s’ouvre au clic puis se referme : la densité ne s’empile plus dans la page.
              </p>
            </div>
          </div>
        </section>
      </div>

      {/* ------------------------------ Onglets in-fiche ------------------- */}
      <div role="tabpanel" id="panneau-besoins" aria-labelledby="onglet-besoins" hidden={ongletActif !== 'besoins'}>
        {ongletActif === 'besoins' && <DetailBesoinsPanel idPatient={idPatient} enteteMasquee />}
      </div>

      <div role="tabpanel" id="panneau-alimentation" aria-labelledby="onglet-alimentation" hidden={ongletActif !== 'alimentation'}>
        {ongletActif === 'alimentation' && <PractitionerFoodObservationPanel idPatient={idPatient} />}
      </div>

      <div
        role="tabpanel"
        id="panneau-correspondance"
        aria-labelledby="onglet-correspondance"
        hidden={ongletActif !== 'correspondance'}
      >
        {ongletActif === 'correspondance' && <CorrespondanceMedecinPanel idPatient={idPatient} />}
      </div>

      <div role="tabpanel" id="panneau-trajectoire" aria-labelledby="onglet-trajectoire" hidden={ongletActif !== 'trajectoire'}>
        {ongletActif === 'trajectoire' &&
          (etatTrajectoire === 'chargement' || etatTrajectoire === 'inconnue' ? (
            <div role="status" className="rounded-xl border border-border bg-surface p-4 text-base text-muted-foreground">
              Chargement de la trajectoire...
            </div>
          ) : etatTrajectoire === 'erreur' ? (
            // Un échec de lecture n'est JAMAIS présenté comme « aucun épisode » :
            // ce serait une affirmation fausse sur l'historique clinique.
            <div role="alert" className="flex flex-col gap-3 rounded-xl border border-accent bg-status-warning/10 p-4 text-base text-status-warning">
              <span>{erreurTrajectoire}</span>
              <button
                type="button"
                onClick={() => void chargerTrajectoire()}
                className="min-h-9 self-start rounded-lg border border-accent px-3 py-1 text-xs font-medium text-solar-ink hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
              >
                Réessayer
              </button>
            </div>
          ) : (
            <TrajectoirePanel trajectoire={trajectoire} />
          ))}
      </div>
    </div>
    </ModeConsultation>
  );
}
