// Le constat du praticien sur un besoin sans score ([[D-347]] §2, §3, §5, t40)
// — listes FERMÉES, recopiées des CHECK de la migration
// `constats_besoin_praticien_v1`. Module PUR : l'écran en lit les libellés,
// la route les garde ; aucun import ici, pour qu'un composant client le lise.
//
// Un constat dit ce que le praticien DÉCIDE du besoin, jamais l'état du
// patient. Écartés ([[D-347]] §3) : « satisfait », « couvert »,
// « déficitaire », « carence », « normal », « anormal ». Un verdict, un motif
// ou un besoin neuf exige une décision et une migration : l'ajouter ici seul
// ferait refuser par la base un geste que l'écran propose.

/** Les besoins que la base admet ([[D-347]] §2, arbitrage 5) : le périmètre exact de [[D-338]] §4. */
export const BESOINS_CONSTATABLES = [2, 6, 7, 11] as const;
export type BesoinConstatable = (typeof BESOINS_CONSTATABLES)[number];

export function estBesoinConstatable(valeur: unknown): valeur is BesoinConstatable {
  return typeof valeur === 'number' && (BESOINS_CONSTATABLES as readonly number[]).includes(valeur);
}

export const VERDICTS = ['a_soutenir', 'non_retenu', 'non_evaluable', 'sans_objet'] as const;
export type Verdict = (typeof VERDICTS)[number];

export const LIBELLES_VERDICT: Record<Verdict, string> = {
  a_soutenir: 'à soutenir',
  non_retenu: 'non retenu',
  non_evaluable: 'non évaluable',
  sans_objet: 'sans objet',
};

/** Hors `a_soutenir`, un motif est obligatoire, pris dans la liste de son verdict. */
export const MOTIFS_PAR_VERDICT: Record<Verdict, readonly string[]> = {
  a_soutenir: [],
  non_retenu: ['non_ressorti_entretien', 'autre_besoin_d_abord', 'deja_accompagne', 'autre'],
  non_evaluable: ['non_aborde', 'piece_attendue_manquante', 'donnee_a_verifier', 'autre'],
  sans_objet: ['hors_population', 'question_ne_se_pose_plus', 'autre'],
};

export const LIBELLES_MOTIF: Record<string, string> = {
  non_ressorti_entretien: 'l’entretien ne fait pas ressortir ce besoin',
  autre_besoin_d_abord: 'un autre besoin est travaillé d’abord',
  deja_accompagne: 'ce besoin est déjà accompagné par ailleurs',
  non_aborde: 'ce besoin n’a pas encore été abordé',
  piece_attendue_manquante: 'une pièce attendue manque',
  donnee_a_verifier: 'la fiabilité d’une information est à contrôler',
  hors_population: 'le patient est hors de la population visée',
  question_ne_se_pose_plus: 'la question ne se pose plus pour ce patient',
  autre: 'autre motif',
};

/** La note : facultative, obligatoire avec `autre`, 2000 caractères au plus (CHECK). */
export const NOTE_MAX = 2000;

/** Au plus autant de pièces par constat : une borne de saisie, aucun sens clinique. */
export const PIECES_MAX = 30;

export function estVerdict(valeur: unknown): valeur is Verdict {
  return typeof valeur === 'string' && (VERDICTS as readonly string[]).includes(valeur);
}

export function estMotifDuVerdict(verdict: Verdict, motif: unknown): boolean {
  if (verdict === 'a_soutenir') return motif === null || motif === undefined;
  return typeof motif === 'string' && MOTIFS_PAR_VERDICT[verdict].includes(motif);
}

/**
 * Pourquoi un constat posé se dit « à relire » ([[D-347]] §5) — dérivé à la
 * lecture, jamais écrit. Les cinq premières sont les conditions 1 à 5 de
 * [[D-331]] §5, sur les pièces ; puis la date atteinte ; puis le besoin qui
 * gagne une source de score. L'écran dit quelle condition tient, sans jamais
 * dire une valeur.
 */
export const RAISONS_A_RELIRE = [
  'piece_corrigee',
  'piece_annulee',
  'nouveau_prelevement',
  'passation_plus_recente',
  'passation_invalidee',
  'date_echue',
  'besoin_avec_score',
] as const;
export type RaisonARelire = (typeof RAISONS_A_RELIRE)[number];

export const LIBELLES_A_RELIRE: Record<RaisonARelire, string> = {
  piece_corrigee: 'un résultat cité a été corrigé',
  piece_annulee: 'un résultat cité a été annulé',
  nouveau_prelevement: 'un prélèvement plus récent d’une analyse citée est arrivé',
  passation_plus_recente: 'un questionnaire cité a été repassé',
  passation_invalidee: 'une passation citée est exclue du raisonnement',
  date_echue: 'la date « à revoir le » est atteinte',
  besoin_avec_score: 'ce besoin porte désormais une source de score : aucun constat neuf ne s’y pose',
};

/** La nature de la date « à revoir le », affichée (DC-19, DC-20 ; [[D-347]] §4). */
export const NATURE_DATE_A_REVOIR = 'fixée par le praticien';

/** L'écran le dit près du champ ; la base ne peut pas le vérifier ([[D-347]] §3). */
export const AVERTISSEMENT_NOTE = 'Ne recopiez aucune valeur dans la note.';

/** Un constat n'est pas une mesure ([[D-347]] §6), et la surface le dit. */
export const AVERTISSEMENT_MESURE =
  'Un constat est votre décision sur un besoin évalué en entretien. Ce n’est pas une mesure : '
  + 'le besoin reste « non mesuré » ou « hors score » et n’entre dans aucun compte de besoins mesurés.';
