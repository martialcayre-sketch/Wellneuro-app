// Libellés français (client-safe, aucune dépendance) — partagés par le
// formulaire de saisie patient et les tooltips de la vue praticien. Ton doux,
// non culpabilisant : on décrit une nuit, on ne juge pas.

import type { ClasseDureeReveils, ClasseLatence, ClasseSieste } from './types';

export const LABEL_LATENCE: Record<ClasseLatence, string> = {
  lt15: 'Vite',
  e15_30: 'En 15 à 30 min',
  e30_60: 'En 30 à 60 min',
  gt60: "Après plus d'une heure",
};

export const LABEL_DUREE_REVEILS: Record<ClasseDureeReveils, string> = {
  lt15: 'Moins de 15 min',
  e15_45: 'De 15 à 45 min',
  gt45: 'Plus de 45 min',
};

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

export const LABEL_FACTEURS: Record<string, string> = {
  cafeApres14h: 'Café après 14 h',
  alcool: 'Alcool le soir',
  ecransAuLit: 'Écrans au lit',
  activitePhysique: 'Activité physique',
};
