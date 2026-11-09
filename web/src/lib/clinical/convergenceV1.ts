import type { DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';
import type { GraduationConvergence, ImportanceContradiction } from './contradictionFinding';

// ─────────────────────────────────────────────────────────────────────────────
// LA TABLE DE CONVERGENCE — `DC-29`, forme `CONVERGENCE` de l'objet de [[D-041]].
//
// CE FICHIER EST DU CLINIQUE, PAS DU CODE (`DC-17`). Il porte, en constantes
// nommées et motivées, ce que trois décisions ont dicté :
// - [[D-443]] : la graduation par FAMILLES DE MESURE concordantes, ses quatre
//   bornes, le registre des familles, l'exclusion de `Q_ALI_01` du compte
//   digestif ;
// - [[D-450]] : `ANAMNÈSE` distincte de `AUTO` ; une condition atteinte compte
//   sur un axe où une règle a déclenché ; l'injection en synthèse ;
// - [[D-453]] : le rattachement de chaque condition déclencheuse de
//   `ORIENTATION_RULES_V1` au besoin qu'elle DOCUMENTE, et les quatre
//   conditions visibles sans compter.
//
// AUCUNE DE CES VALEURS N'EST FONDÉE PAR UNE SOURCE DU CORPUS ([[D-103]], verdict
// sur `DC-29`) : ce sont des arbitrages WellNeuro, nommés comme tels
// ([[D-426]] §2). La convergence augmente la PRIORITÉ, jamais la certitude.
//
// ENTRE DANS L'EMPREINTE SIGNÉE de la table d'orientation
// (`ORIENTATION_RULES_SHA256`, terme `convergence`) : retoucher une ligne
// referme le verrou d'orientation jusqu'à re-signature.
//
// MODULE FEUILLE : aucun import de valeur, aucun Prisma — la table d'orientation
// l'importe pour son empreinte, et les bancs le lisent sans base.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Le registre des familles de mesure — [[D-443]] §2. Une famille est un MODE
 * DE RECUEIL AUX BIAIS PLAUSIBLEMENT DISTINCTS. Sept familles candidates ;
 * seules `AUTO` et `ANAMNESE` sont lues par les règles d'orientation
 * d'aujourd'hui ([[D-443]] §4) : les cinq autres n'entrent dans la convergence
 * d'un axe que par une décision propre, sous provenance, avec son lot.
 *
 * Les quatre règles du registre :
 * 1. `AUTO` est UNE SEULE famille, quel que soit le nombre d'instruments ;
 * 2. les sous-scores des mêmes réponses font une famille ;
 * 3. une dépendance inconnue entre deux sources vaut même famille ;
 * 4. `ANAMNESE` est distincte de `AUTO` (confirmée par [[D-450]] §1).
 */
export const FAMILLES_MESURE_V1 = [
  { id: 'AUTO', libelle: 'auto-questionnaires', luParLesRegles: true },
  { id: 'ANAMNESE', libelle: 'anamnèse', luParLesRegles: true },
  { id: 'CLINICIEN', libelle: 'évaluation clinicien', luParLesRegles: false },
  { id: 'TIERS', libelle: 'hétéro-évaluation par un tiers', luParLesRegles: false },
  { id: 'JOURNAL', libelle: 'journal et agendas', luParLesRegles: false },
  { id: 'BIOLOGIE', libelle: 'biologie', luParLesRegles: false },
  { id: 'PHYSIO', libelle: 'mesures physiologiques', luParLesRegles: false },
] as const;

export type FamilleMesure = (typeof FAMILLES_MESURE_V1)[number]['id'];

/** Les deux familles que la table de rattachement peut citer ([[D-443]] §4). */
export type FamilleLue = Extract<FamilleMesure, 'AUTO' | 'ANAMNESE'>;

/**
 * Les quatre bornes de la graduation — [[D-443]] §1. SEUIL CLINIQUE
 * (`DC-20`), de provenance « arbitrage WellNeuro du 2026-11-03 » : aucune
 * source ne les fonde. Elles comptent des familles, elles ne mesurent pas une
 * vraisemblance. Lues dans l'ordre : la première dont `minFamilles` est atteint
 * en partant de la plus haute l'emporte.
 *
 * À flux constants, aucun axe ne dépasse `CONVERGENCE_FAIBLE` ([[D-443]] §3,
 * plafond assumé) ; les deux niveaux supérieurs restent atteignables le jour
 * où une autre famille entre dans les règles.
 */
export const BORNES_GRADUATION_CONVERGENCE: readonly { minFamilles: number; graduation: GraduationConvergence }[] = [
  { minFamilles: 4, graduation: 'CONVERGENCE_FORTE' },
  { minFamilles: 3, graduation: 'CONVERGENCE_MODEREE' },
  { minFamilles: 2, graduation: 'CONVERGENCE_FAIBLE' },
  { minFamilles: 1, graduation: 'SIGNAL' },
];

/**
 * Une CONDITION, au grain où elle se rattache : un instrument et son sous-score
 * (absent = score global), ou une valeur d'un champ d'anamnèse.
 *
 * LE SEUIL N'EN FAIT PAS PARTIE. `Q_MOD_03 / digestion` est la même condition
 * à `>= 7` (`R2-GAS-01`) et à `>= 4` (`R2-GAS-02`) : elle documente le même
 * besoin, et chaque feuille garde son propre seuil quand elle est évaluée
 * ([[D-450]] §3 — aucun seuil n'est créé).
 */
export type ConditionConvergence =
  | { type: 'instrument'; idQuestionnaire: string; sousScore?: string }
  | { type: 'drapeau'; champ: keyof DrapeauxAnamnese; valeur: string };

export type RattachementConvergence = {
  condition: ConditionConvergence;
  /** Le ou les besoins que la condition DOCUMENTE ([[D-453]] §1, §3). */
  besoins: readonly number[];
  famille: FamilleLue;
  /** Provenance de la ligne, recopiée de [[D-453]] §3. */
  provenance: string;
  /**
   * Comment la source se nomme dans le constat. Un instrument se nomme par son
   * identifiant, une fois par axe ([[D-443]] §7) : ce libellé ne sert qu'aux
   * déclarations d'anamnèse, qui doivent rester identifiables comme telles
   * ([[D-453]] §3, ligne « thème du guide »).
   */
  libelle?: string;
};

/**
 * LES QUATORZE RATTACHEMENTS — [[D-453]] §3, recopiés tels quels, dans leur
 * ordre. Famille `AUTO` pour les auto-questionnaires, `ANAMNESE` pour les
 * déclarations d'anamnèse.
 *
 * Notes de la décision, gardées près des lignes qu'elles qualifient :
 * - (a) le DNSM est dissocié : `DA` au besoin 8, `SE` au besoin 9 — arbitrage
 *   clinique d'organisation des informations, sans validation publiée ; « Mon
 *   équilibre » garde `DA` et `SE` au besoin 10, l'écart est assumé ;
 * - (b) `RYTHME_BIOLOGIQUE` porte sur le rythme veille-sommeil, pas sur
 *   l'alimentation : le rattachement suit le contenu des items, il ne valide ni
 *   le barème ni le seuil ;
 * - (c) l'antécédent respiratoire est un contexte de l'exploration du sommeil,
 *   pas une mesure de l'état respiratoire actuel : pas de besoin 6, et le
 *   libellé reste « déclaré », jamais « confirmé » ni « actif ».
 */
export const RATTACHEMENTS_CONVERGENCE_V1: readonly RattachementConvergence[] = [
  { condition: { type: 'instrument', idQuestionnaire: 'Q_SOM_01' }, besoins: [5], famille: 'AUTO', provenance: 'BESOIN_SOURCES ; guide, besoin 5' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_STR_02' }, besoins: [9], famille: 'AUTO', provenance: 'BESOIN_SOURCES ; guide, besoin 9' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_GAS_01' }, besoins: [4], famille: 'AUTO', provenance: 'BESOIN_SOURCES ; guide, besoin 4' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_ALI_01' }, besoins: [1], famille: 'AUTO', provenance: 'BESOIN_SOURCES ; guide, besoin 1' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_INF_03', sousScore: 'DA' }, besoins: [8], famille: 'AUTO', provenance: 'arbitrage WellNeuro, contenu des items (a)' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_INF_03', sousScore: 'SE' }, besoins: [9], famille: 'AUTO', provenance: 'arbitrage WellNeuro, contenu des items (a)' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_MOD_01', sousScore: 'SOMMEIL' }, besoins: [5], famille: 'AUTO', provenance: 'arbitrage WellNeuro, thème du guide' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_MOD_01', sousScore: 'ADAPTATION_STRESS' }, besoins: [9], famille: 'AUTO', provenance: 'arbitrage WellNeuro, thème du guide' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_MOD_01', sousScore: 'RYTHME_BIOLOGIQUE' }, besoins: [5], famille: 'AUTO', provenance: 'arbitrage WellNeuro, contenu des items (b)' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_MOD_03', sousScore: 'sommeil' }, besoins: [5], famille: 'AUTO', provenance: 'arbitrage WellNeuro, thème du guide' },
  { condition: { type: 'instrument', idQuestionnaire: 'Q_MOD_03', sousScore: 'digestion' }, besoins: [4], famille: 'AUTO', provenance: 'arbitrage WellNeuro, thème du guide' },
  {
    condition: { type: 'drapeau', champ: 'antecedentsDomaines', valeur: 'Digestif (SII, reflux, MICI…)' },
    besoins: [4], famille: 'ANAMNESE', provenance: 'arbitrage WellNeuro, thème du guide',
    libelle: 'antécédent « Digestif (SII, reflux, MICI…) » déclaré',
  },
  {
    condition: { type: 'drapeau', champ: 'facteursDeclenchants', valeur: 'Stress aigu / burn-out' },
    besoins: [9], famille: 'ANAMNESE', provenance: 'arbitrage WellNeuro, thème du guide',
    libelle: 'facteur déclenchant « Stress aigu / burn-out » déclaré',
  },
  {
    condition: { type: 'drapeau', champ: 'antecedentsDomaines', valeur: 'Respiratoire / apnée du sommeil' },
    besoins: [5], famille: 'ANAMNESE', provenance: 'arbitrage WellNeuro (c)',
    // Libellé imposé par [[D-453]] §3 (c) : jamais « apnée confirmée » ni « active ».
    libelle: 'antécédent respiratoire / apnée du sommeil déclaré',
  },
];

export type ConditionSansCompte = {
  condition: ConditionConvergence;
  /**
   * Les cartes de convergence où la condition reste VISIBLE, sans ouvrir ni
   * compter. « moral » : besoins 8 et 9 ([[D-453]] §4). Les trois autres : le
   * besoin que leur règle explore (`needIds`) — arbitrage du responsable du
   * 2026-11-07. Elle n'apparaît que si la carte existe.
   */
  besoinsCarte: readonly number[];
  /** Ce que voit le praticien ([[D-453]] §4). */
  libelle: string;
  /** Pourquoi elle ne compte pas, recopié de la décision. */
  motif: string;
};

/**
 * LES QUATRE CONDITIONS VISIBLES QUI N'OUVRENT NI NE COMPTENT — [[D-453]] §4.
 * Leur rôle dans le déclenchement des explorations ne change pas : la fonction
 * d'une condition dans une règle d'orientation ne lui confère pas
 * automatiquement une valeur dans le compte de convergence.
 */
export const CONDITIONS_SANS_COMPTE_V1: readonly ConditionSansCompte[] = [
  {
    condition: { type: 'instrument', idQuestionnaire: 'Q_MOD_03', sousScore: 'fatigue' },
    besoinsCarte: [5],
    libelle: 'plainte « fatigue » actuelle',
    motif: 'son intensité ne précise pas le besoin concerné ; motif d’explorer, pas mesure',
  },
  {
    condition: { type: 'instrument', idQuestionnaire: 'Q_MOD_03', sousScore: 'moral' },
    besoinsCarte: [8, 9],
    libelle: 'plainte « moral » — plainte globale, composante à préciser',
    motif: 'item unique qui mêle deux composantes ; elle comptera le jour où une source précisera la composante',
  },
  {
    condition: { type: 'drapeau', champ: 'antecedentsDomaines', valeur: 'Psychiatrique (anxiété, dépression, burn-out)' },
    besoinsCarte: [8],
    libelle: 'antécédent « Psychiatrique (anxiété, dépression, burn-out) » déclaré, contexte clinique',
    motif: 'déclaration historique et composite, sans composante ni présence actuelle',
  },
  {
    condition: { type: 'drapeau', champ: 'attentes', valeur: 'Améliorer le sommeil' },
    besoinsCarte: [5],
    libelle: 'attente « Améliorer le sommeil », objectif de consultation',
    motif: 'elle dit ce que la personne souhaite, sans observation supplémentaire',
  },
];

/**
 * `Q_ALI_01` NE COMPTE JAMAIS AU BESOIN DIGESTIF — [[D-443]] §5, précisée par
 * [[D-453]] §5 : l'exclusion reste limitée au besoin 4 ; le questionnaire
 * alimentaire compte au besoin 1. La table de rattachement ne le place pas au
 * besoin 4 ; cette liste le dit en clair, et le moteur la relit pour qu'une
 * ligne ajoutée par erreur ne puisse pas l'y faire compter.
 */
export const EXCLUSIONS_CONVERGENCE_V1: readonly { idQuestionnaire: string; besoin: number; motif: string }[] = [
  {
    idQuestionnaire: 'Q_ALI_01',
    besoin: 4,
    motif: 'l’enquête alimentaire mesure l’équilibre de l’alimentation, non un symptôme digestif',
  },
];

/**
 * L'importance du constat — FIXE, quelle que soit la graduation (arbitrage du
 * responsable du 2026-11-07). Aucune décision ne relie la graduation à la
 * priorité du cockpit, et une table de correspondance aurait été une borne
 * clinique nouvelle sans source. La graduation reste lisible à côté.
 */
export const IMPORTANCE_CONVERGENCE: ImportanceContradiction = 'useful_not_urgent';

/** Le geste proposé, identique sur tout constat de convergence. */
export const ACTION_CONVERGENCE =
  'Explorer ce besoin en entretien. Le niveau compte les familles de mesure concordantes : il en relève la priorité, pas la certitude.';

/**
 * Ce que tout constat de convergence NE dit pas (`DC-24`, `DC-29`,
 * [[D-443]] §1 et §6, [[D-453]] §4).
 *
 * La quatrième : [[D-470]], texte validé par le responsable le 2026-11-09
 * (question `20261107-1748-a`). Le constat cite les règles qui DÉCLENCHENT ; il
 * ne dit pas ce que le panneau d'orientation montre de leurs recommandations.
 */
export const LIMITATIONS_CONVERGENCE: readonly string[] = [
  'La convergence relève la priorité de l’exploration ; elle ne rend aucun constat plus certain.',
  'Seuls les auto-questionnaires et l’anamnèse sont lus : une famille de mesure non recueillie n’est ni concordante ni rassurante.',
  'Une lecture rassurante d’un autre instrument du besoin n’est pas confrontée ici : seule une règle de discordance signée le ferait.',
  'Les règles citées comme « déclenchées » satisfont leur critère de déclenchement sur les données retenues. Leurs recommandations peuvent toutefois être affichées comme éteintes, rangées parmi les explorations écartées ou absentes parce que les questionnaires concernés sont déjà renseignés.',
];

/**
 * Limites PROPRES à un besoin, en plus des communes. Besoin 1 : [[D-453]] §5,
 * ajoutée sur arbitrage du responsable du 2026-11-07 (revue `wn-reviewer`) — le
 * questionnaire alimentaire décrit un profil déclaré, il ne mesure aucun statut.
 */
export const LIMITATIONS_PAR_BESOIN: Readonly<Record<number, readonly string[]>> = {
  1: ['Le questionnaire alimentaire décrit un profil alimentaire déclaré défavorable ; il n’établit ni carence nutritionnelle ni statut biologique.'],
};

/**
 * Libellés du NIVEAU, pour l'écran et la synthèse. Ce sont des libellés, pas un
 * degré de vérité : ils disent combien de familles concordent.
 */
export const LIBELLE_GRADUATION: Record<GraduationConvergence, string> = {
  SIGNAL: 'signal — une famille de mesure',
  CONVERGENCE_FAIBLE: 'convergence faible — deux familles de mesure',
  CONVERGENCE_MODEREE: 'convergence modérée — trois familles de mesure',
  CONVERGENCE_FORTE: 'convergence forte — quatre familles de mesure ou plus',
};

/** Le terme `convergence` de l'empreinte signée de la table d'orientation. */
export const TABLE_CONVERGENCE_V1 = {
  familles: FAMILLES_MESURE_V1,
  bornes: BORNES_GRADUATION_CONVERGENCE,
  rattachements: RATTACHEMENTS_CONVERGENCE_V1,
  sansCompte: CONDITIONS_SANS_COMPTE_V1,
  exclusions: EXCLUSIONS_CONVERGENCE_V1,
  importance: IMPORTANCE_CONVERGENCE,
  action: ACTION_CONVERGENCE,
  limitations: LIMITATIONS_CONVERGENCE,
  limitationsParBesoin: LIMITATIONS_PAR_BESOIN,
  libellesGraduation: LIBELLE_GRADUATION,
} as const;
