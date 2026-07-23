// Contrat d'épisode partagé (SP-CONV LOT-01) — une trajectoire, deux lectures.
//
// Module de dérivation PUR : aucune écriture, aucun appel réseau, aucune
// migration. Il répond, à partir de données déjà chargées par les routes
// existantes, à « où en est l'épisode, qu'est-ce qui vient ensuite, et
// qu'a-t-on le droit d'en montrer au patient ? ».
//
// Frontières (CAMPAGNE.md SP-CONV) :
// - le moteur de statuts de phase reste dans `FichePatientPanel` (`statutPhase`)
//   — ce module PREND les statuts en entrée, il ne les recalcule pas ;
// - le score et les jalons restent à `lib/equilibre` — jamais réimplémentés ;
// - deux cycles de `versionScore` différents ne sont jamais comparés (A8-3) ;
// - la séparation praticien/patient est portée par les TYPES : la surface
//   patient est `EtatParcoursPatient`, dérivée exclusivement de signaux que le
//   portail sert déjà (`session`, `protocole`, booklet). Aucun champ praticien
//   n'y figure — c'est la garantie de visibilité (D11).

import type { TendanceMomentum } from '@/lib/equilibre/types';
import {
  FORMULATIONS_PATIENT,
  LIBELLES_COURTS_PATIENT,
  type EtapePatientSynchronisee,
} from './formulations';

// ---------------------------------------------------------------------------
// Phase initiale du cockpit (D5) — côté praticien.
// ---------------------------------------------------------------------------

// Miroirs des types du cockpit (`FichePatientPanel.tsx:142-145`). Dupliqués à
// dessein : le composant importera depuis ici au LOT-02, la lib ne dépend
// jamais d'un composant.
export type IdPhaseContrat =
  | 'patient'
  | 'donnees'
  | 'comprehension'
  | 'decision'
  | 'actions'
  | 'suivi'
  | 'reevaluation';

export type StatutPhaseContrat = 'fait' | 'en_attente' | 'a_ouvrir' | 'inconnu';

export const ORDRE_PHASES: readonly IdPhaseContrat[] = [
  'patient',
  'donnees',
  'comprehension',
  'decision',
  'actions',
  'suivi',
  'reevaluation',
] as const;

export type EntreesPhaseInitiale = {
  // Runtime en chargement ou en erreur : aucune phase n'est affirmée (état
  // neutre) — l'appelant garde son rendu de chargement.
  chargement: boolean;
  // Phases porteuses d'un bloqueur de sécurité (ex. protocole bloqué →
  // 'actions'). L'appelant les identifie ; l'ordre du cycle tranche.
  bloqueurs: readonly IdPhaseContrat[];
  // Phases porteuses d'une action exigible (ex. demande de correction →
  // 'patient', décision due → 'decision').
  actionsExigibles: readonly IdPhaseContrat[];
  statuts: Readonly<Partial<Record<IdPhaseContrat, StatutPhaseContrat>>>;
  // Mémoire locale praticien (jamais en base) — LOT-02.
  dernierePhaseConsultee: IdPhaseContrat | null;
};

// Règle D5, dans l'ordre : bloqueur de sécurité > action exigible > première
// phase en attente > dernière phase consultée. À défaut de tout : 'decision'
// (reprise du comportement antérieur, documentée — jamais un statut inventé).
export function phaseInitiale(entrees: EntreesPhaseInitiale): IdPhaseContrat | null {
  if (entrees.chargement) return null;

  const premiereDansLeCycle = (candidates: readonly IdPhaseContrat[]): IdPhaseContrat | null => {
    for (const phase of ORDRE_PHASES) {
      if (candidates.includes(phase)) return phase;
    }
    return null;
  };

  const bloqueur = premiereDansLeCycle(entrees.bloqueurs);
  if (bloqueur) return bloqueur;

  const exigible = premiereDansLeCycle(entrees.actionsExigibles);
  if (exigible) return exigible;

  for (const phase of ORDRE_PHASES) {
    if (entrees.statuts[phase] === 'en_attente') return phase;
  }

  if (entrees.dernierePhaseConsultee) return entrees.dernierePhaseConsultee;

  return 'decision';
}

// ---------------------------------------------------------------------------
// Bandeau d'épisode (LOT-02) — côté praticien.
// ---------------------------------------------------------------------------

// Sous-ensemble de `TrajectoireCycle` (lib/protocol/trajectoire.ts) réellement
// consommé — pas de dépendance à l'objet complet.
export type CycleBandeau = {
  cycleId: string;
  dateT0: string; // ISO
  versionScore: string | null;
  momentum: { tendance: TendanceMomentum; delta: number } | null;
};

export type EpisodeBandeau = {
  // 1-indexé, ordre chronologique des T0 confirmés.
  numeroEpisode: number;
  cycleId: string;
  // Jours révolus depuis le T0 de l'épisode courant (0 le jour même).
  positionJours: number;
  // « T0 + 14 j · vous êtes ici » — libellé mono du bandeau (maquette LOT-02).
  positionLibelle: string;
  // Momentum du tour PRÉCÉDENT, uniquement si sa version de score est connue
  // et identique à celle du tour courant (A8-3). Sinon null — le chip delta
  // ne s'affiche pas, il n'est jamais approximé.
  deltaTourPrecedent: { cycleId: string; tendance: TendanceMomentum; delta: number } | null;
};

export function deriverEpisodeBandeau(
  cycles: readonly CycleBandeau[],
  aujourdhui: Date,
): EpisodeBandeau | null {
  if (cycles.length === 0) return null;

  const tries = [...cycles].sort(
    (a, b) => new Date(a.dateT0).getTime() - new Date(b.dateT0).getTime(),
  );
  const courant = tries[tries.length - 1];
  const precedent = tries.length >= 2 ? tries[tries.length - 2] : null;

  const msParJour = 24 * 60 * 60 * 1000;
  const positionJours = Math.max(
    0,
    Math.floor((aujourdhui.getTime() - new Date(courant.dateT0).getTime()) / msParJour),
  );

  const comparable =
    precedent !== null &&
    precedent.versionScore !== null &&
    courant.versionScore !== null &&
    precedent.versionScore === courant.versionScore &&
    precedent.momentum !== null;

  return {
    numeroEpisode: tries.length,
    cycleId: courant.cycleId,
    positionJours,
    positionLibelle: `T0 + ${positionJours} j · vous êtes ici`,
    deltaTourPrecedent:
      comparable && precedent.momentum
        ? {
            cycleId: precedent.cycleId,
            tendance: precedent.momentum.tendance,
            delta: precedent.momentum.delta,
          }
        : null,
  };
}

// ---------------------------------------------------------------------------
// Parcours patient synchronisé (LOT-04) — côté patient.
// ---------------------------------------------------------------------------

// Entrées : EXCLUSIVEMENT des signaux que le portail sert déjà (D11) —
// `POST /api/portail/session` (statut de consultation) et
// `GET /api/portail/protocole` (protocole diffusé, fin de cycle). Le booklet
// est un signal serveur existant (`BookletEnvoi`), exposable par la même voie.
export type SignauxPortail = {
  questionnairesTransmis: boolean;
  consultationStatut: string | null; // 'creee' | 'en_cours' | 'validee' | autre
  protocoleDiffuse: boolean;
  finDeCycle: boolean;
  bookletEnvoye: boolean;
};

export type EtatParcoursPatient = {
  etape: EtapePatientSynchronisee;
  // Étape courante de la frise HC-F 6 étapes (`PatientJourneyProgress`).
  journeyCurrentId: 5 | 6;
  // L'étape 5 « Analyse du praticien » est-elle terminée (restitution là) ?
  analyseTerminee: boolean;
  formulation: string;
  libelleCourt: string;
};

// Dérivation de l'état des étapes 5-6, appelée UNIQUEMENT quand les
// questionnaires sont transmis — en deçà, les écrans gardent leur logique
// existante (étapes 1-4) et cette fonction rend null.
//
// Jamais rétrograde par construction : les signaux sous-jacents ne reculent
// pas (une diffusion approuvée reste diffusée, un booklet envoyé reste
// envoyé) ; si un signal manque (null), l'état reste au plus prudent — jamais
// inventé.
export function deriverEtatParcoursPatient(signaux: SignauxPortail): EtatParcoursPatient | null {
  if (!signaux.questionnairesTransmis) return null;

  if (signaux.finDeCycle) {
    return construire('prochaine_etape_prete', 6, true);
  }
  if (signaux.protocoleDiffuse || signaux.bookletEnvoye) {
    return construire('restitution_disponible', 6, true);
  }
  if (signaux.consultationStatut === 'en_cours' || signaux.consultationStatut === 'validee') {
    return construire('analyse_en_cours', 5, false);
  }
  return construire('elements_transmis', 5, false);
}

function construire(
  etape: EtapePatientSynchronisee,
  journeyCurrentId: 5 | 6,
  analyseTerminee: boolean,
): EtatParcoursPatient {
  return {
    etape,
    journeyCurrentId,
    analyseTerminee,
    formulation: FORMULATIONS_PATIENT[etape],
    libelleCourt: LIBELLES_COURTS_PATIENT[etape],
  };
}
