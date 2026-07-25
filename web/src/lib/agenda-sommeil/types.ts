// Domaine PUR de l'agenda du sommeil 21 nuits (Q_SOM_09) — aucune dépendance
// Prisma, importable côté client (formulaire portail) comme côté serveur.
// La persistance vit dans `persistence.ts` (qui réexporte ce domaine pour les
// routes). Instrument de RECUEIL longitudinal : le patient saisit une nuit par
// matin ; les agrégats et le score ne sont produits qu'à la CLÔTURE, jamais
// renvoyés au patient (réserve R1). Une correction est une NOUVELLE ligne
// chaînée (`supersedesNuitId`), jamais un `update` — même doctrine que les
// check-ins J7/J14/J21 (§8.5).

export const AGENDA_SOMMEIL_ID = 'Q_SOM_09' as const;
export const AGENDA_SOMMEIL_TITRE = 'Agenda du sommeil — 21 nuits' as const;

// Contrat de persistance du JSON d'une nuit (distinct de la version de score de
// « Mon équilibre »). Toute évolution du sens des champs impose un nouveau
// suffixe versionné, jamais une réécriture silencieuse de `-v1`.
export const AGENDA_CONTRACT_VERSION = 'agenda-sommeil-v1' as const;

// Fenêtre de recueil : 21 emplacements (une culture « protocole 21 jours » et le
// jalon J21 partagés par le produit).
export const NB_JOURS_AGENDA = 21;

// En dessous de ce nombre de nuits renseignées, le recueil est transmis au
// praticien mais NON agrégé (pas de score global) — jamais un 0 par défaut.
export const MIN_NUITS_AGREGATS = 5;

// ─── Classes qualitatives (jamais de minutes exactes : anti-anxiogène) ───────
// Latence d'endormissement — le patient choisit une classe, pas un chronomètre
// (aucune incitation à regarder l'horloge la nuit).
export type ClasseLatence = 'lt15' | 'e15_30' | 'e30_60' | 'gt60';
export const CLASSES_LATENCE: readonly ClasseLatence[] = ['lt15', 'e15_30', 'e30_60', 'gt60'];

// Durée cumulée des réveils nocturnes.
export type ClasseDureeReveils = 'lt15' | 'e15_45' | 'gt45';
export const CLASSES_DUREE_REVEILS: readonly ClasseDureeReveils[] = ['lt15', 'e15_45', 'gt45'];

// Sieste de la veille.
export type ClasseSieste = 'aucune' | 'lt20' | 'e20_60' | 'gt60';
export const CLASSES_SIESTE: readonly ClasseSieste[] = ['aucune', 'lt20', 'e20_60', 'gt60'];

// ─── Contrat JSON d'une nuit ─────────────────────────────────────────────────
// Express (4 gestes obligatoires) + détails facultatifs (accordéon). Les heures
// sont des chaînes `HH:MM` en horloge murale LOCALE — jamais de conversion de
// fuseau (cf. `agregats.ts`).
export type FacteursNuit = {
  cafeApres14h?: boolean;
  alcool?: boolean;
  ecransAuLit?: boolean;
  activitePhysique?: boolean;
};

export type ReveilsNuit = {
  nombre: number; // 0..3 (3 = « 3 ou plus »)
  dureeTotale: ClasseDureeReveils;
};

export type NuitReponses = {
  // — Express (obligatoire) —
  heureCoucher: string; // HH:MM, pas de 15 min
  heureLever: string; // HH:MM, pas de 15 min
  latence: ClasseLatence;
  qualite: number; // 1..5 (emoji)
  // — Complet (facultatif) —
  reveils?: ReveilsNuit;
  heureReveilFinal?: string; // HH:MM, si différent du lever
  forme?: number; // 1..5 au réveil
  siesteVeille?: ClasseSieste;
  facteurs?: FacteursNuit;
  commentaire?: string; // ≤ 200 caractères
};

// ─── Formes de lecture + chaînage append-only ────────────────────────────────
export type NuitRow = {
  id: string;
  idPatient: string;
  idAssignation: string;
  dateNuit: string; // AAAA-MM-JJ = matin du réveil, horloge murale locale
  reponses: NuitReponses;
  canal: string;
  supersedesNuitId: string | null;
  soumisLe: string; // ISO
};

export type NuitInput = {
  idPatient: string;
  idAssignation: string;
  dateNuit: string;
  reponses: NuitReponses;
  supersedesNuitId?: string | null;
};
