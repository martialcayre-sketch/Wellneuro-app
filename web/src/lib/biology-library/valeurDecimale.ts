// Valeur DÉCIMALE EXACTE d'un résultat biologique (BIO-INGEST LOT-10). Module
// PUR, sans import : l'écran et le serveur le partagent.
//
// La valeur voyage en CHAÎNE de la saisie ou de la ligne lue jusqu'à la
// colonne `numeric` — jamais en `number` JavaScript, dont le flottant
// IEEE 754 arrondit (0,1 + 0,2, ou au-delà de 15 chiffres significatifs).
//
// FORME CANONIQUE : point décimal, ni zéro de tête ni zéro de queue, ni `+`
// ni `-0`. C'est la forme que la colonne rend : son échelle est FIXE
// (`DECIMAL(65,30)`), elle ne garde donc pas les zéros de queue — « 1,50 »
// et « 1,5 » sont une seule et même valeur consignée.
//
// AUCUNE BORNE DE VALEUR, aucune qualification (DC-19/DC-20) : seule la
// capacité TECHNIQUE de la colonne est gardée, pour refuser en français plutôt
// que laisser Postgres refuser (partie entière) ou ARRONDIR EN SILENCE
// (au-delà de 30 décimales).

/** `DECIMAL(65,30)` : 65 chiffres dont 30 après la virgule. */
export const CHIFFRES_ENTIERS_MAX = 35;
export const DECIMALES_MAX = 30;

/** Écriture canonique d'un décimal déjà découpé en signe, partie entière et fraction. */
export function canoniserDecimal(negatif: boolean, entier: string, fraction: string): string {
  const e = entier.replace(/^0+/, '') || '0';
  const f = fraction.replace(/0+$/, '');
  const absolu = f === '' ? e : `${e}.${f}`;
  return negatif && absolu !== '0' ? `-${absolu}` : absolu;
}

// Ce que la saisie accepte : un décimal signé, virgule ou point, chiffres
// éventuellement absents d'un côté (« ,5 », « 5, »). Pas d'exposant, pas
// d'hexadécimal, pas d'« Infinity », pas de séparateur de milliers.
const SAISIE = /^([+-]?)(\d*)(?:[.,](\d*))?$/;

/**
 * La valeur TAPÉE, en forme canonique — ou `null` si ce n'est pas un nombre
 * décimal. Tout ce qui n'est pas une chaîne est refusé : un `number` a déjà
 * perdu l'exactitude que ce module garde.
 */
export function lireDecimalSaisi(texte: unknown): string | null {
  if (typeof texte !== 'string') return null;
  const m = SAISIE.exec(texte.trim());
  if (!m) return null;
  const [, signe, entier, fraction = ''] = m;
  if (entier === '' && fraction === '') return null;
  return canoniserDecimal(signe === '-', entier, fraction);
}

/** La valeur canonique excède-t-elle la colonne (35 chiffres entiers, 30 décimales) ? */
export function depasseCapacite(canonique: string): boolean {
  const [entier, fraction = ''] = canonique.replace(/^-/, '').split('.');
  return entier.length > CHIFFRES_ENTIERS_MAX || fraction.length > DECIMALES_MAX;
}
