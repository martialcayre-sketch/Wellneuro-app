// Les constats du praticien sur une hypothèse du parcours ([[D-331]] §3, §5,
// BP-11) — listes FERMÉES, recopiées des CHECK de la migration
// `constats_praticien_v1`. Module PUR : l'écran en lit les libellés, la route
// les garde ; aucun import ici, pour qu'un composant client le lise
// (`'use client'` ne supporte pas `node:crypto`).
//
// Un constat dit ce que le praticien constate sur une HYPOTHÈSE, jamais ce
// que vaut une valeur. Écartés, comme en [[D-322]] §1 : « normal »,
// « anormal », « déficit », « carence », « excès ». Un verdict ou un motif
// neuf exige une décision et une migration : l'ajouter ici seul ferait
// refuser par la base un geste que l'écran propose.

export const VERDICTS = ['confirmee', 'non_retenue', 'non_evaluable', 'sans_objet'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const LIBELLES_VERDICT: Record<Verdict, string> = {
  confirmee: 'confirmée',
  non_retenue: 'non retenue',
  non_evaluable: 'non évaluable',
  sans_objet: 'sans objet',
};

/** Hors `confirmee`, un motif est obligatoire, pris dans la liste de son verdict. */
export const MOTIFS_PAR_VERDICT: Record<Verdict, readonly string[]> = {
  confirmee: [],
  non_retenue: ['pieces_ne_soutiennent_pas', 'autre_hypothese_retenue', 'contexte_explique', 'autre'],
  non_evaluable: ['piece_attendue_manquante', 'contexte_inconnu', 'donnee_a_verifier', 'autre'],
  sans_objet: ['hors_population', 'question_ne_se_pose_plus', 'autre'],
};

export const LIBELLES_MOTIF: Record<string, string> = {
  pieces_ne_soutiennent_pas: 'les pièces ne soutiennent pas l’hypothèse',
  autre_hypothese_retenue: 'une autre hypothèse est retenue',
  contexte_explique: 'le contexte ou un traitement explique les pièces',
  piece_attendue_manquante: 'une pièce attendue manque',
  contexte_inconnu: 'le contexte du prélèvement est inconnu',
  donnee_a_verifier: 'la fiabilité d’une pièce est à contrôler',
  hors_population: 'le patient est hors de la population de la fiche',
  question_ne_se_pose_plus: 'la question ne se pose plus pour ce patient',
  autre: 'autre motif',
};

/** `confirmee` et `non_retenue` portent au moins une pièce (la base le tient en fin de transaction). */
export const VERDICTS_A_PIECE: readonly Verdict[] = ['confirmee', 'non_retenue'];

/** La note : facultative, obligatoire avec `autre`, 2000 caractères au plus (CHECK). */
export const NOTE_MAX = 2000;

/** Au plus autant de pièces par constat : une borne de saisie, aucun sens clinique. */
export const PIECES_MAX = 30;

export function estVerdict(valeur: unknown): valeur is Verdict {
  return typeof valeur === 'string' && (VERDICTS as readonly string[]).includes(valeur);
}

export function estMotifDuVerdict(verdict: Verdict, motif: unknown): boolean {
  if (verdict === 'confirmee') return motif === null || motif === undefined;
  return typeof motif === 'string' && MOTIFS_PAR_VERDICT[verdict].includes(motif);
}

/**
 * La note telle qu'elle s'écrit : sans blancs en tête ni en queue — tous les
 * blancs Unicode, espaces insécables compris, que le `~ '\S'` de la base ne
 * garantit pas selon sa locale (revue `wn-reviewer` de la migration). Une
 * note faite de blancs n'est pas une note : `null`.
 */
export function normaliserNote(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  const note = valeur.normalize('NFC').replace(/^[\s​﻿]+|[\s​﻿]+$/gu, '');
  return note.length > 0 ? note : null;
}

/**
 * Pourquoi un constat posé se dit « à relire » ([[D-331]] §5) — dérivé à la
 * lecture, jamais écrit. L'écran dit quelle condition tient, sans jamais dire
 * une valeur.
 */
export const RAISONS_A_RELIRE = [
  'piece_corrigee',
  'piece_annulee',
  'nouveau_prelevement',
  'passation_plus_recente',
  'passation_invalidee',
  'date_echue',
  'hypothese_hors_structure',
] as const;
export type RaisonARelire = (typeof RAISONS_A_RELIRE)[number];

export const LIBELLES_A_RELIRE: Record<RaisonARelire, string> = {
  piece_corrigee: 'un résultat cité a été corrigé',
  piece_annulee: 'un résultat cité a été annulé',
  nouveau_prelevement: 'un prélèvement plus récent d’une analyse citée est arrivé',
  passation_plus_recente: 'un questionnaire cité a été repassé',
  passation_invalidee: 'une passation citée est exclue du raisonnement',
  date_echue: 'la date « à revoir le » est atteinte',
  hypothese_hors_structure: 'l’hypothèse ne figure plus dans la structure signée',
};

/** La nature de la date « à revoir le », affichée (DC-19, DC-20 ; [[D-331]] §4). */
export const NATURE_DATE_A_REVOIR = 'fixée par le praticien';

/** L'écran le dit près du champ ; la base ne peut pas le vérifier ([[D-331]] §3). */
export const AVERTISSEMENT_NOTE = 'Ne recopiez aucune valeur dans la note.';

/** Le logiciel ne signale pas une valeur, et la surface le dit ([[D-331]] §6). */
export const AVERTISSEMENT_FILET =
  'Un constat est votre geste sur une hypothèse. Il ne signale aucune valeur et n’est pas un filet de sécurité.';
