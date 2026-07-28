// Libellés français (client-safe, aucune dépendance) — partagés par le
// formulaire de saisie patient et les tooltips de la vue praticien. Ton doux,
// non culpabilisant : on décrit une nuit, on ne juge pas.

import type {
  ClasseAideSommeil,
  ClasseDureeReveils,
  ClasseDureeReveilsHeritee,
  ClasseLatence,
  ClasseSieste,
  CleFacteur,
} from './types';

export const LABEL_LATENCE: Record<ClasseLatence, string> = {
  lt15: 'Vite',
  e15_30: 'En 15 à 30 min',
  e30_60: 'En 30 à 60 min',
  gt60: "Après plus d'une heure",
};

// Version PRÉCISE, pour le praticien : la durée cumulée d'éveil est la grandeur
// clinique, on la nomme telle quelle. Les deux dernières entrées sont les
// classes héritées de la v1, qui apparaissent encore dans les nuits déjà en base.
export const LABEL_DUREE_REVEILS: Record<
  ClasseDureeReveils | ClasseDureeReveilsHeritee,
  string
> = {
  aucun: 'Aucun réveil',
  lt15: 'Moins de 15 min',
  e15_30: 'De 15 à 30 min',
  e30_60: 'De 30 à 60 min',
  gt60: 'Plus d’une heure',
  e15_45: 'De 15 à 45 min (barème v1)',
  gt45: 'Plus de 45 min (barème v1)',
};

// Version PATIENT, sans minutes : le patient estime, il ne chronomètre pas — et
// on ne veut surtout pas l'inciter à regarder l'heure la nuit.
export const LABEL_REVEILS_PATIENT: Record<ClasseDureeReveils, string> = {
  aucun: 'Nuit continue',
  lt15: 'Un bref réveil',
  e15_30: 'Éveillé·e un moment',
  e30_60: 'Éveillé·e longtemps',
  gt60: 'Éveillé·e une bonne partie de la nuit',
};

// L'aria commence par le libellé visible (WCAG 2.5.3, « label in name ») et
// ajoute l'ordre de grandeur, invisible à l'écran.
export const ARIA_REVEILS: Record<ClasseDureeReveils, string> = {
  aucun: 'Nuit continue, aucun réveil',
  lt15: 'Un bref réveil, moins de quinze minutes éveillé au total',
  e15_30: 'Éveillé·e un moment, quinze à trente minutes au total',
  e30_60: 'Éveillé·e longtemps, trente à soixante minutes au total',
  gt60: 'Éveillé·e une bonne partie de la nuit, plus d’une heure au total',
};

// Aide au sommeil. Le libellé reste large — « aide pour dormir » couvre aussi
// bien un hypnotique prescrit qu'une mélatonine ou une plante, ce qui est le
// périmètre utile ici : le nom et la dose vivent au dossier médicamenteux.
export const LABEL_AIDE_SOMMEIL: Record<ClasseAideSommeil, string> = {
  aucune: 'Aucune aide',
  prise: 'Une aide pour dormir',
};

export const ARIA_AIDE_SOMMEIL: Record<ClasseAideSommeil, string> = {
  aucune: 'Aucune aide pour dormir cette nuit',
  prise: 'Une aide pour dormir cette nuit : médicament, mélatonine ou plante',
};

// Mode de lever. La seconde réponse ouvre une poignée supplémentaire : sans
// elle, les minutes passées éveillé au lit le matin sont comptées en sommeil.
export const LABEL_LEVER_IMMEDIAT = 'Dès mon réveil';
export const LABEL_LEVER_DIFFERE = 'Après être resté·e au lit';
export const LABEL_REVEIL_FINAL = 'Je me suis réveillé·e';

// Mode de coucher, symétrique du précédent. La seconde réponse ouvre la poignée
// de mise au lit — sans elle, le temps passé au lit sans chercher à dormir est
// invisible, et l'efficacité se calcule sur une fenêtre trop courte, donc
// flatteuse.
export const LABEL_EXTINCTION_IMMEDIATE = 'En me couchant';
export const LABEL_EXTINCTION_DIFFEREE = 'Après un moment au lit';
export const LABEL_MISE_AU_LIT = 'Je me suis mis·e au lit';

export const LABEL_SIESTE: Record<ClasseSieste, string> = {
  aucune: 'Aucune',
  lt20: 'Moins de 20 min',
  e20_60: 'De 20 à 60 min',
  gt60: 'Plus d’une heure',
};

// Qualité et forme : échelle 1..5 (index 0..4). Emoji + libellé accessible.
export const EMOJI_QUALITE = ['😣', '😕', '😐', '🙂', '😌'] as const;
export const ARIA_QUALITE = [
  'Très difficile',
  'Difficile',
  'Moyenne',
  'Bonne',
  'Très bonne',
] as const;

export const EMOJI_FORME = ['🥱', '😪', '😐', '🙂', '⚡'] as const;
export const ARIA_FORME = [
  'Épuisé·e',
  'Fatigué·e',
  'Moyenne',
  'En forme',
  'En pleine forme',
] as const;

export const LABEL_FACTEURS: Record<CleFacteur, string> = {
  cafeApres14h: 'Café après 14 h',
  alcool: 'Alcool le soir',
  ecransAuLit: 'Écrans au lit',
  activitePhysique: 'Activité physique',
  stress: 'Stress',
  douleurs: 'Douleurs',
  maladie: 'Maladie',
  repasTardif: 'Repas tardif',
};

// Tuile à part : c'est elle qui distingue « aucun facteur ce soir » de « pas
// répondu ». Sans elle, un bloc de facteurs vide est illisible.
export const LABEL_RIEN_DE_PARTICULIER = 'Rien de particulier';

// Libellés des deux ancres temporelles (v2). Les mots comptent : « couché » et
// « levé » laissaient la lecture au lit dans le temps au lit et faussaient la
// latence. On demande l'extinction de la lumière et la sortie du lit, ancres du
// Consensus Sleep Diary.
export const LABEL_EXTINCTION = 'J’ai éteint la lumière';
export const LABEL_SORTIE_DU_LIT = 'Je me suis levé·e';
