// LE VOCABULAIRE DES POSITIONS D'EXPERT ET DES ARBITRAGES (D-439 §2, §3) —
// module pur, sans base ni `node:crypto` : un composant client peut l'importer.
//
// Les formats recopient les CHECK de la migration `positions_expert_v1` : la
// route refuse avant la base, la base refuse encore si la route se trompe.
// Les bornes de longueur marquées TECHNIQUES ne sont pas cliniques (`DC-20`) :
// elles bornent un corps de requête, elles ne disent rien d'une position.

export const POSITION_ID_RE = /^WN-PE-[0-9]{4}$/;
export const VERSION_POSITION_RE = /^v[0-9]{1,4}\.[0-9]{1,4}$/;
export const FICHE_ID_RE = /^FU_[A-Z0-9_]+$/;
export const CONFLIT_ID_RE = /^CS-[A-Z0-9]+(-[A-Z0-9]+)*$/;
/** `identifiant@version`, le `v` facultatif comme dans `rag_corpus_claims`. */
export const CLAIM_REF_RE = /^(WN-CL-[0-9]{4}-[0-9]{3})@(v?[0-9]+\.[0-9]+)$/;
export const ID_LIGNE_RE = /^[a-z0-9]{8,64}$/i;
export const SHA256_RE = /^[0-9a-f]{64}$/;
export const JETON_RE = /^\d{1,19}$/;

/**
 * Liste fermée du CHECK `positions_expert_versions_dossier_ferme`, recopiée
 * dans son ordre (migration `positions_expert_dossiers_v2`, [[D-464]]). Un
 * dossier y entre à sa clôture : migration en ajout seul, puis cette liste.
 */
export const DOSSIERS_POSITION = [
  'fer',
  'vitamine_d',
  'zinc',
  'magnesium',
  'b9_b12',
  'iode_selenium',
  'polyphenols_antioxydants',
] as const;
export type DossierPosition = (typeof DOSSIERS_POSITION)[number];

/** Les quatre rubriques, dans l'ORDRE FIXE de l'empreinte. */
export const RUBRIQUES_POSITION = ['enonce', 'perimetre', 'population', 'limites'] as const;
export type RubriquePosition = (typeof RUBRIQUES_POSITION)[number];
export type ContenuPosition = Record<RubriquePosition, string>;

export const LIBELLES_RUBRIQUES: Record<RubriquePosition, string> = {
  enonce: 'Énoncé',
  perimetre: 'Périmètre',
  population: 'Population',
  limites: 'Limites',
};

export const LIBELLES_DOSSIERS: Record<DossierPosition, string> = {
  fer: 'Fer',
  vitamine_d: 'Vitamine D',
  zinc: 'Zinc',
  magnesium: 'Magnésium érythrocytaire',
  b9_b12: 'B9 et B12',
  iode_selenium: 'Iode et sélénium',
  polyphenols_antioxydants: 'Polyphénols et antioxydants',
};

export type ActePosition = 'signee' | 'retiree';
export type ActeArbitrage = 'pose' | 'revocation';

/** Bornes des CHECK de la migration. */
export const MOTIF_MAX = 4000;
export const AUTEUR_MAX = 320;
/** TECHNIQUE : la longueur d'une rubrique dans un corps de requête. */
export const RUBRIQUE_MAX = 20000;
/** TECHNIQUE : le nombre de claims d'appui dans un corps de requête. */
export const APPUIS_MAX = 50;

/** Les cinq cas d'A3 (six, le troisième en comptant deux) qui rendent une tête d'arbitrage « à relire ». */
export type CauseARelire =
  | 'conflit_modifie_ou_depublie'
  | 'fiche_hors_structure_ou_liste'
  | 'position_retiree'
  | 'position_remplacee'
  | 'position_a_relire'
  | 'claim_non_frais';

export const LIBELLES_CAUSES: Record<CauseARelire, string> = {
  conflit_modifie_ou_depublie: 'Le conflit a changé au registre, ou n’y est plus publié.',
  fiche_hors_structure_ou_liste: 'La fiche a quitté la structure signée ou la liste du conflit.',
  position_retiree: 'La position retenue n’est plus signée.',
  position_remplacee: 'La position retenue a été remplacée par une version neuve.',
  position_a_relire: 'La position retenue est elle-même à relire (claim d’appui qui n’est plus frais).',
  claim_non_frais: 'Le claim retenu n’est plus frais au corpus.',
};

/** Le libellé d'affichage d'une position, imposé par [[D-266]] §8. */
export const LIBELLE_POSITION = 'Position du responsable — preuves limitées';

export const estDossierPosition = (v: unknown): v is DossierPosition =>
  typeof v === 'string' && (DOSSIERS_POSITION as readonly string[]).includes(v);

/**
 * UTF-16 bien formé : une demi-paire de substitution isolée (`"\ud800"`, que
 * `JSON.parse` admet) est refusée par le type `jsonb` de PostgreSQL — l'écriture
 * finirait en 500. Constaté par le banc sur base réelle. Le caractère NUL
 * (`\u0000`) aussi : `jsonb` (22P05) et `text` le refusent (revue `wn-reviewer`).
 */
const bienForme = (v: string) =>
  !v.includes('\u0000') && !/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/.test(v);

/** Un texte visible : au moins un caractère qui n'est pas un espace (`~ '\S'`), en UTF-16 bien formé. */
export const estTexteVisible = (v: unknown): v is string => typeof v === 'string' && /\S/u.test(v) && bienForme(v);

/** Un motif tel que la base l'admet, rogné ; `null` sinon. */
export function motifAdmis(v: unknown): string | null {
  if (typeof v !== 'string' || !bienForme(v)) return null;
  const motif = v.trim();
  return motif.length > 0 && /\S/u.test(motif) && motif.length <= MOTIF_MAX ? motif : null;
}

export type ReferenceClaimPosition = { claimId: string; versionClaim: string };

/** `WN-CL-NNNN-NNN@vN.M` → le couple ; `null` si mal formé. */
export function lireReferenceClaim(ref: string): ReferenceClaimPosition | null {
  const m = CLAIM_REF_RE.exec(ref);
  return m ? { claimId: m[1], versionClaim: m[2] } : null;
}

export const ecrireReferenceClaim = (r: ReferenceClaimPosition) => `${r.claimId}@${r.versionClaim}`;

/** `vN.M` → [N, M] ; comparaison numérique, comme le trigger (jamais textuelle). */
export function numeroVersion(version: string): [number, number] | null {
  if (!VERSION_POSITION_RE.test(version)) return null;
  const [n, m] = version.slice(1).split('.').map(Number);
  return [n, m];
}

export function versionSuit(neuve: string, courante: string): boolean {
  const a = numeroVersion(neuve);
  const b = numeroVersion(courante);
  if (!a || !b) return false;
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]);
}

/**
 * Le contenu tel que la base l'admet : un objet de quatre rubriques
 * exactement, chacune un texte visible (et borné, techniquement). `null`
 * sinon. Les textes sont gardés tels quels, jamais rognés : l'empreinte porte
 * sur l'octet.
 */
export function contenuAdmis(v: unknown): ContenuPosition | null {
  if (typeof v !== 'object' || v === null || Array.isArray(v)) return null;
  const brut = v as Record<string, unknown>;
  const cles = Object.keys(brut);
  if (cles.length !== RUBRIQUES_POSITION.length) return null;
  if (!cles.every(c => (RUBRIQUES_POSITION as readonly string[]).includes(c))) return null;
  for (const r of RUBRIQUES_POSITION) {
    const t = brut[r];
    if (!estTexteVisible(t) || t.length > RUBRIQUE_MAX) return null;
  }
  return {
    enonce: brut.enonce as string,
    perimetre: brut.perimetre as string,
    population: brut.population as string,
    limites: brut.limites as string,
  };
}

/** Les claims d'appui tels que la base les admet : au moins un, bien formés, sans doublon. */
export function appuisAdmis(v: unknown): string[] | null {
  if (!Array.isArray(v) || v.length === 0 || v.length > APPUIS_MAX) return null;
  if (!v.every(a => typeof a === 'string' && CLAIM_REF_RE.test(a))) return null;
  if (new Set(v).size !== v.length) return null;
  return v as string[];
}
