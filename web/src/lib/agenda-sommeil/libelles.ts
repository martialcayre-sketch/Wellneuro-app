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
  ContratEcriture,
  Inconnu,
} from './types';

// « Je ne sais pas » (v4, [[D-271]]) — proposé pour l'endormissement et la durée
// des réveils seulement. Tuile ordinaire, en dernier : une réponse comme une
// autre, ni mise en avant ni cachée.
export const LABEL_INCONNU = 'Je ne sais pas';
// Côté praticien : ce que le patient a répondu, sans en faire une valeur.
export const LABEL_INCONNU_PRATICIEN = 'Ne sait pas';

export const LABEL_LATENCE: Record<ClasseLatence | Inconnu, string> = {
  // « Vite » était la seule classe sans chiffre, alors que les trois autres en
  // portent : même clé, même borne, le libellé dit enfin ce qui est stocké.
  lt15: 'En moins de 15 min',
  e15_30: 'En 15 à 30 min',
  e30_60: 'En 30 à 60 min',
  gt60: "Après plus d'une heure",
  inconnu: LABEL_INCONNU,
};

// Version PRÉCISE, pour le praticien : la durée cumulée d'éveil est la grandeur
// clinique, on la nomme telle quelle. Les deux dernières entrées sont les
// classes héritées de la v1, qui apparaissent encore dans les nuits déjà en base.
export const LABEL_DUREE_REVEILS: Record<
  ClasseDureeReveils | ClasseDureeReveilsHeritee | Inconnu,
  string
> = {
  aucun: 'Aucun réveil',
  lt15: 'Moins de 15 min',
  e15_30: 'De 15 à 30 min',
  e30_60: 'De 30 à 60 min',
  gt60: 'Plus d’une heure',
  e15_45: 'De 15 à 45 min (barème v1)',
  gt45: 'Plus de 45 min (barème v1)',
  inconnu: LABEL_INCONNU_PRATICIEN,
};

// Version PATIENT. Le libellé reste une estimation en mots — on ne veut pas
// inciter à regarder l'heure la nuit —, mais l'ordre de grandeur s'affiche
// désormais dessous, en aide discrète (arbitrage du responsable du
// 2026-10-07) : sans lui, « un bref réveil » se lisait comme un NOMBRE de
// réveils alors que la classe mesure une DURÉE cumulée. Classes et bornes
// inchangées : on écrit ce qui est déjà stocké.
export const LABEL_REVEILS_PATIENT: Record<ClasseDureeReveils | Inconnu, string> = {
  aucun: 'Nuit continue',
  lt15: 'Un bref réveil',
  e15_30: 'Éveillé·e un moment',
  e30_60: 'Éveillé·e longtemps',
  gt60: 'Éveillé·e une bonne partie de la nuit',
  inconnu: LABEL_INCONNU,
};

// « Je ne sais pas » n'a pas d'ordre de grandeur : pas de seconde ligne.
export const BORNES_REVEILS_PATIENT: Record<ClasseDureeReveils | Inconnu, string> = {
  aucun: 'aucun réveil',
  lt15: 'moins de 15 min au total',
  e15_30: '15 à 30 min au total',
  e30_60: '30 à 60 min au total',
  gt60: 'plus d’une heure au total',
  inconnu: '',
};

// L'aria reprend exactement le texte visible, libellé puis borne (WCAG 2.5.3,
// « label in name »).
export const ARIA_REVEILS: Record<ClasseDureeReveils | Inconnu, string> = {
  aucun: 'Nuit continue, aucun réveil',
  lt15: 'Un bref réveil, moins de 15 min au total',
  e15_30: 'Éveillé·e un moment, 15 à 30 min au total',
  e30_60: 'Éveillé·e longtemps, 30 à 60 min au total',
  gt60: 'Éveillé·e une bonne partie de la nuit, plus d’une heure au total',
  inconnu: LABEL_INCONNU,
};

// Aide au sommeil. Le libellé reste large — « aide pour dormir » couvre aussi
// bien un hypnotique prescrit qu'une mélatonine ou une plante, ce qui est le
// périmètre utile ici : le nom et la dose vivent au dossier médicamenteux.
export const LABEL_AIDE_SOMMEIL: Record<ClasseAideSommeil, string> = {
  aucune: 'Aucune aide',
  prise: 'Une aide pour dormir',
};

// Portée affichée sous la question : la même que l'aria, rendue visible. Elle
// ne redéfinit rien — « une aide pour dormir » couvrait déjà ces trois cas.
export const PORTEE_AIDE_SOMMEIL = 'Médicament, mélatonine ou plante';

export const ARIA_AIDE_SOMMEIL: Record<ClasseAideSommeil, string> = {
  aucune: 'Aucune aide pour dormir cette nuit',
  prise: 'Une aide pour dormir cette nuit : médicament, mélatonine ou plante',
};

// Mode de lever. La seconde réponse ouvre une heure supplémentaire : sans
// elle, les minutes passées éveillé au lit le matin sont comptées en sommeil.
//
// La question pose la référence (« par rapport à votre réveil ») et les tuiles
// répondent « au même moment / plus tard ». L'ancienne paire « dès mon réveil /
// après être resté·e au lit » laissait le patient juger seul ce qui comptait
// comme « rester au lit ». Aucun seuil n'est ajouté : la liste au quart d'heure
// reste ce qui distingue les deux heures.
export const QUESTION_LEVER = 'Par rapport à votre réveil, vous vous êtes levé·e…';
export const LABEL_LEVER_IMMEDIAT = 'Au même moment';
export const LABEL_LEVER_DIFFERE = 'Plus tard';
export const ARIA_LEVER_IMMEDIAT = 'Au même moment que mon réveil';
export const ARIA_LEVER_DIFFERE = 'Plus tard que mon réveil';
export const LABEL_REVEIL_FINAL = 'Je me suis réveillé·e';

// Mode de coucher, symétrique du précédent. La seconde réponse ouvre l'heure
// de mise au lit — sans elle, le temps passé au lit sans chercher à dormir est
// invisible, et l'efficacité se calcule sur une fenêtre trop courte, donc
// flatteuse.
// Même construction : « après un moment au lit » laissait « un moment » à
// l'appréciation du patient.
export const QUESTION_EXTINCTION = 'Par rapport à votre coucher, vous avez éteint la lumière…';
export const LABEL_EXTINCTION_IMMEDIATE = 'Au même moment';
export const LABEL_EXTINCTION_DIFFEREE = 'Plus tard';
export const ARIA_EXTINCTION_IMMEDIATE = 'Au même moment que mon coucher';
export const ARIA_EXTINCTION_DIFFEREE = 'Plus tard que mon coucher';
export const LABEL_MISE_AU_LIT = 'Je me suis mis·e au lit';
// v4 ([[D-272]]) : le repère du soir devient l'heure où le patient a ESSAYÉ DE
// DORMIR, et la question de coucher s'y rapporte. Les tuiles ne changent pas.
export const QUESTION_ESSAI_DORMIR = 'Par rapport à votre coucher, vous avez essayé de dormir…';

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
// v4 ([[D-272]]) : l'ancre « try to go to sleep » du Consensus Sleep Diary.
// L'extinction laissait sans réponse le patient qui s'endort lumière éteinte
// devant un écran ou un podcast : il éteint tôt, et n'essaie de dormir que
// plus tard.
export const LABEL_ESSAI_DORMIR = 'J’ai essayé de dormir';

// Les mots du repère du soir, selon le contrat de l'agenda — un agenda ouvert
// en v3 s'y termine, avec les mots qu'il a toujours eus ([[D-272]] §3).
export function motsDuSoir(contrat: ContratEcriture): {
  repere: string;
  question: string;
  latence: string;
  manquant: string;
} {
  return contrat === 'agenda-sommeil-v4'
    ? {
        repere: LABEL_ESSAI_DORMIR,
        question: QUESTION_ESSAI_DORMIR,
        latence: 'Une fois que vous avez essayé de dormir, vous vous êtes endormi·e…',
        manquant: 'l’heure où vous avez essayé de dormir 🌑',
      }
    : {
        repere: LABEL_EXTINCTION,
        question: QUESTION_EXTINCTION,
        latence: 'Une fois la lumière éteinte, vous vous êtes endormi·e…',
        manquant: 'l’heure où vous avez éteint 🌑',
      };
}
