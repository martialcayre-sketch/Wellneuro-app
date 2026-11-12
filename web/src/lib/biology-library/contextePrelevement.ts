// Le contexte de prélèvement d'un résultat de biologie ([[D-497]], BP-05,
// LOT-05). Module PUR : lu par les routes d'écriture, la série et le bloc de
// saisie côté client — aucun import serveur.
//
// Sept champs en trois formes (§2), « inconnu » par défaut et toujours écrit
// (§4). La forme reprend AU CARACTÈRE PRÈS les CHECK de la migration
// `20261112120000_contexte_prelevement_biologique_v1` : la base fait foi, ce
// module dit le refus avant elle. Les bornes sont TECHNIQUES (un jour de cycle
// se compte à partir de 1, un délai n'est pas négatif) ; aucune borne haute,
// aucune catégorie, aucune comparaison à une consigne (§2, §9).

export const DECLARATIONS = ['oui', 'non', 'inconnu'] as const;
export type Declaration = (typeof DECLARATIONS)[number];

export const ETATS = ['renseigne', 'inconnu'] as const;
export type Etat = (typeof ETATS)[number];

export const UNITES_DELAI = ['heure', 'jour'] as const;
export type UniteDelai = (typeof UNITES_DELAI)[number];

/** Les cinq déclarations, dans l'ordre d'affichage de D-497 §2. */
export const CHAMPS_DECLARATION = [
  'aJeun',
  'supplementationArretee',
  'traitementInterferent',
  'episodeInflammatoire',
  'grossesse',
] as const;
export type ChampDeclaration = (typeof CHAMPS_DECLARATION)[number];

/** Les sept champs, dans l'ordre d'affichage de D-497 §2. */
export const CHAMPS_CONTEXTE = [...CHAMPS_DECLARATION, 'jourCycle', 'delaiDernierePrise'] as const;
export type ChampContexte = (typeof CHAMPS_CONTEXTE)[number];

export type ContextePrelevementSaisi = {
  aJeun: Declaration;
  supplementationArretee: Declaration;
  traitementInterferent: Declaration;
  episodeInflammatoire: Declaration;
  grossesse: Declaration;
  jourCycleEtat: Etat;
  jourCycle: number | null;
  delaiDernierePriseEtat: Etat;
  delaiDernierePrise: number | null;
  delaiDernierePriseUnite: UniteDelai | null;
};

export const CONTEXTE_INCONNU: Readonly<ContextePrelevementSaisi> = Object.freeze({
  aJeun: 'inconnu',
  supplementationArretee: 'inconnu',
  traitementInterferent: 'inconnu',
  episodeInflammatoire: 'inconnu',
  grossesse: 'inconnu',
  jourCycleEtat: 'inconnu',
  jourCycle: null,
  delaiDernierePriseEtat: 'inconnu',
  delaiDernierePrise: null,
  delaiDernierePriseUnite: null,
});

export const LIBELLES_CHAMP: Record<ChampContexte, string> = {
  aJeun: 'À jeun',
  supplementationArretee: 'Supplémentation arrêtée',
  traitementInterferent: 'Traitement susceptible d’interférer',
  episodeInflammatoire: 'Épisode inflammatoire déclaré',
  grossesse: 'Grossesse au prélèvement',
  jourCycle: 'Jour du cycle',
  delaiDernierePrise: 'Délai depuis la dernière prise',
};

export const LIBELLES_DECLARATION: Record<Declaration, string> = {
  oui: 'oui',
  non: 'non',
  inconnu: 'inconnu',
};

export const MESSAGE_CONTEXTE_INVALIDE =
  'Le contexte du prélèvement est mal formé : chaque champ vaut oui, non ou inconnu ; '
  + 'un jour du cycle renseigné est un entier à partir de 1 ; un délai renseigné est un entier '
  + 'positif ou nul, en heures ou en jours.';

const estDeclaration = (v: unknown): v is Declaration =>
  typeof v === 'string' && (DECLARATIONS as readonly string[]).includes(v);
const estEtat = (v: unknown): v is Etat => typeof v === 'string' && (ETATS as readonly string[]).includes(v);
const estUnite = (v: unknown): v is UniteDelai =>
  typeof v === 'string' && (UNITES_DELAI as readonly string[]).includes(v);
// `Number.isSafeInteger` : la colonne est un INTEGER ; au-delà, la base
// refuserait. Ce n'est pas une borne clinique, c'est la capacité du type.
const estEntierBase = (v: unknown): v is number =>
  typeof v === 'number' && Number.isSafeInteger(v) && v <= 2147483647;

export type VerdictContexte =
  | { ok: true; contexte: ContextePrelevementSaisi }
  | { ok: false; raison: 'contexte_invalide' };

/**
 * Juge un contexte reçu du client. ABSENT (`undefined` ou `null`) rend
 * `CONTEXTE_INCONNU` : un client antérieur à BP-05, pendant le déploiement,
 * écrit un contexte « inconnu », jamais rien (§4). Toute autre forme fausse
 * est refusée, jamais corrigée.
 */
export function validerContextePrelevement(brut: unknown): VerdictContexte {
  if (brut === undefined || brut === null) return { ok: true, contexte: { ...CONTEXTE_INCONNU } };
  if (typeof brut !== 'object' || Array.isArray(brut)) return { ok: false, raison: 'contexte_invalide' };
  const c = brut as Record<string, unknown>;
  const refus = { ok: false as const, raison: 'contexte_invalide' as const };

  for (const champ of CHAMPS_DECLARATION) {
    if (!estDeclaration(c[champ])) return refus;
  }

  if (!estEtat(c.jourCycleEtat)) return refus;
  const jourCycle = c.jourCycle ?? null;
  if (c.jourCycleEtat === 'inconnu') {
    if (jourCycle !== null) return refus;
  } else if (!estEntierBase(jourCycle) || jourCycle < 1) {
    return refus;
  }

  if (!estEtat(c.delaiDernierePriseEtat)) return refus;
  const delai = c.delaiDernierePrise ?? null;
  const unite = c.delaiDernierePriseUnite ?? null;
  if (c.delaiDernierePriseEtat === 'inconnu') {
    if (delai !== null || unite !== null) return refus;
  } else if (!estEntierBase(delai) || delai < 0 || !estUnite(unite)) {
    return refus;
  }

  return {
    ok: true,
    contexte: {
      aJeun: c.aJeun as Declaration,
      supplementationArretee: c.supplementationArretee as Declaration,
      traitementInterferent: c.traitementInterferent as Declaration,
      episodeInflammatoire: c.episodeInflammatoire as Declaration,
      grossesse: c.grossesse as Declaration,
      jourCycleEtat: c.jourCycleEtat,
      jourCycle: jourCycle as number | null,
      delaiDernierePriseEtat: c.delaiDernierePriseEtat,
      delaiDernierePrise: delai as number | null,
      delaiDernierePriseUnite: unite as UniteDelai | null,
    },
  };
}

/** Les champs que le contexte ne connaît pas (§5 : ils rendent la série non comparable). */
export function champsInconnus(ctx: ContextePrelevementSaisi): ChampContexte[] {
  const inconnus: ChampContexte[] = CHAMPS_DECLARATION.filter(champ => ctx[champ] === 'inconnu');
  if (ctx.jourCycleEtat === 'inconnu') inconnus.push('jourCycle');
  if (ctx.delaiDernierePriseEtat === 'inconnu') inconnus.push('delaiDernierePrise');
  return inconnus;
}

/**
 * Les champs RENSEIGNÉS des deux côtés dont la valeur diffère (§5, motif
 * « contextes différents »). Un champ inconnu d'un côté ne diffère pas : il
 * manque, et `champsInconnus` le dit déjà. Aucune tolérance, aucune
 * équivalence d'unité : 24 h et 1 jour diffèrent, parce que la conversion
 * serait une interprétation.
 */
export function champsQuiDifferent(a: ContextePrelevementSaisi, b: ContextePrelevementSaisi): ChampContexte[] {
  const differents: ChampContexte[] = CHAMPS_DECLARATION.filter(
    champ => a[champ] !== 'inconnu' && b[champ] !== 'inconnu' && a[champ] !== b[champ],
  );
  if (a.jourCycleEtat === 'renseigne' && b.jourCycleEtat === 'renseigne' && a.jourCycle !== b.jourCycle) {
    differents.push('jourCycle');
  }
  if (
    a.delaiDernierePriseEtat === 'renseigne'
    && b.delaiDernierePriseEtat === 'renseigne'
    && (a.delaiDernierePrise !== b.delaiDernierePrise || a.delaiDernierePriseUnite !== b.delaiDernierePriseUnite)
  ) {
    differents.push('delaiDernierePrise');
  }
  return differents;
}

/** La valeur d'un champ, dite pour l'écran — « inconnu » écrit, jamais un blanc. */
export function valeurAffichee(ctx: ContextePrelevementSaisi, champ: ChampContexte): string {
  if (champ === 'jourCycle') {
    return ctx.jourCycleEtat === 'renseigne' && ctx.jourCycle !== null ? String(ctx.jourCycle) : 'inconnu';
  }
  if (champ === 'delaiDernierePrise') {
    if (ctx.delaiDernierePriseEtat !== 'renseigne' || ctx.delaiDernierePrise === null) return 'inconnu';
    return `${ctx.delaiDernierePrise} ${ctx.delaiDernierePriseUnite === 'jour' ? 'j' : 'h'}`;
  }
  return LIBELLES_DECLARATION[ctx[champ]];
}

/** Les colonnes Prisma d'une ligne de contexte (sans dossier ni praticien). */
export function colonnesContexte(ctx: ContextePrelevementSaisi): ContextePrelevementSaisi {
  return {
    aJeun: ctx.aJeun,
    supplementationArretee: ctx.supplementationArretee,
    traitementInterferent: ctx.traitementInterferent,
    episodeInflammatoire: ctx.episodeInflammatoire,
    grossesse: ctx.grossesse,
    jourCycleEtat: ctx.jourCycleEtat,
    jourCycle: ctx.jourCycle,
    delaiDernierePriseEtat: ctx.delaiDernierePriseEtat,
    delaiDernierePrise: ctx.delaiDernierePrise,
    delaiDernierePriseUnite: ctx.delaiDernierePriseUnite,
  };
}
