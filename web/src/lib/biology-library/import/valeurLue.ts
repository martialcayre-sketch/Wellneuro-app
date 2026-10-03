// Lecture PURE de ce qu'une extraction a relevé (BIO-INGEST LOT-02, [[D-256]]
// A3/A4). L'extraction garde le texte TEL QU'IL EST ÉCRIT sur le compte rendu
// (« 12,5 », « <0,5 », « positif ») ; ce module dit seulement si ce texte est
// une mesure quantitative, et si l'unité lue est celle de l'analyte.
//
// AUCUNE CONVERSION ([[D-157]]). Deux unités concordent si elles s'écrivent
// pareil, aux variantes typographiques près (casse du litre, espaces, micro
// « µ »/« μ »/« u ») —
// jamais parce qu'un facteur les relierait. « mg/L » face à « g/L » diverge, et
// c'est au praticien d'écarter la ligne. Seule exception, de NOTATION : deux
// écritures d'une même grandeur, au facteur 1, listées une à une
// (`NOTATIONS_EQUIVALENTES`, [[D-260]]) — la valeur n'est jamais touchée.
//
// AUCUNE QUALIFICATION. Rien ici ne dit qu'une valeur est basse, haute ou
// normale ; « <0,5 » est refusé parce qu'il n'est pas un nombre, pas parce
// qu'il serait bas.

export type MotifEcart =
  | 'non_quantitative'
  | 'unite_divergente'
  | 'analyte_non_reconnu'
  | 'ecartee_par_praticien';

export const MOTIFS_ECART: readonly MotifEcart[] = Object.freeze([
  'non_quantitative',
  'unite_divergente',
  'analyte_non_reconnu',
  'ecartee_par_praticien',
]);

// Un nombre décimal signé, virgule ou point, espaces (y compris insécables)
// entre groupes de milliers. Rien d'autre : pas d'opérateur (<, >, ≤, ≥), pas
// d'exposant, pas de texte.
const NOMBRE = /^[+-]?\d{1,3}(?:[   ]\d{3})+(?:[.,]\d+)?$|^[+-]?\d+(?:[.,]\d+)?$/;

/**
 * La valeur lue est-elle une mesure QUANTITATIVE ? Rend le nombre, ou `null`
 * pour tout ce qui n'en est pas un (« <0,5 », « positif », « 1,2 x10^9 »).
 */
export function lireValeurQuantitative(texte: string): number | null {
  const brut = texte.trim();
  if (!NOMBRE.test(brut)) return null;
  const nombre = Number(brut.replace(/[   ]/g, '').replace(',', '.'));
  return Number.isFinite(nombre) ? nombre : null;
}

/**
 * La CASSE COMPTE — « mUI/L » (milli) n'est pas « MUI/L » (méga) (revue,
 * P2-8) — sauf pour le symbole du litre, qui s'écrit indifféremment « l » ou
 * « L » : « ng/ml » et « ng/mL » sont la même unité.
 *
 * Le « u » d'une impression ASCII vaut « µ », mais SEULEMENT en préfixe d'une
 * unité de quantité, de masse ou de volume — « umol », « ug », « uL »
 * (arbitrage du responsable, 2026-10-02). Variante typographique, pas une
 * conversion : « UI », « U/L » et « mUI » restent intacts.
 */
function formeUnite(unite: string): string {
  return unite
    .normalize('NFKC')
    .replace(/\s+/g, '')
    .split('/')
    .map(terme => terme.replace(/^u(mol|g|[lL])$/, '\u03BC$1'))
    .map(terme => (/^[mµμdcn]?[lL]$/.test(terme) ? `${terme.slice(0, -1)}L` : terme))
    .join('/');
}

/**
 * L'unité lue est-elle celle de l'analyte ? Égalité stricte après mise en
 * forme typographique — NFKC ramène le « μ » grec au « µ » micro. Une unité
 * lue absente face à une unité attendue ne concorde pas (on ne devine pas) ;
 * deux absences concordent.
 */
/**
 * Deux écritures d'une MÊME grandeur — facteur 1, la valeur lue reste celle du
 * compte rendu. Liste fermée, chaque paire validée par le responsable
 * ([[D-260]] : « µg/L » et « ng/mL », constaté sur un compte rendu réel). Une
 * paire reliée par un autre facteur (g/dL et g/L) n'a rien à faire ici.
 */
const NOTATIONS_EQUIVALENTES: readonly (readonly [string, string])[] = Object.freeze([
  ['µg/L', 'ng/mL'],
] as const);

export function unitesConcordent(lue: string | null, attendue: string | null): boolean {
  if (lue === null || lue.trim() === '') return attendue === null;
  if (attendue === null) return false;
  const a = formeUnite(lue);
  const b = formeUnite(attendue);
  if (a === b) return true;
  return NOTATIONS_EQUIVALENTES.some(([x, y]) => {
    const [fx, fy] = [formeUnite(x), formeUnite(y)];
    return (a === fx && b === fy) || (a === fy && b === fx);
  });
}

/**
 * L'écart que l'écran PRÉ-MARQUE pour une ligne — une suggestion, jamais une
 * décision : c'est le praticien qui confirme l'écart (consigne de la revue de
 * la migration). `null` si rien n'est à signaler. Sans analyte retenu, l'unité
 * ne se juge pas.
 */
export function preMarquage(
  ligne: { valeurLue: string; uniteLue: string | null },
  analyte: { unite: string | null } | null,
): MotifEcart | null {
  if (lireValeurQuantitative(ligne.valeurLue) === null) return 'non_quantitative';
  if (analyte && !unitesConcordent(ligne.uniteLue, analyte.unite)) return 'unite_divergente';
  return null;
}
