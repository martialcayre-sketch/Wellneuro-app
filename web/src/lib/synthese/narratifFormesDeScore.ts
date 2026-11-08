// LE SIGNALEMENT TECHNIQUE DU TEXTE PATIENT — [[D-462]] §4 (arbitrage
// `20261108-2304-a`), [[D-333]] §1.
//
// Le texte que lit le patient ne porte ni score, ni total calculé, ni pourcentage,
// ni nombre de besoins. La consigne le demande ; rien ne garantit que le modèle
// obéit. Ce module sert à le VOIR : il rend des codes de forme, jamais le texte.
// Il ne bloque rien et ne corrige rien, et aucune sortie n'en dépend.
//
// LIMITES ASSUMÉES, tenues par le banc. Une ligne de journal est leur seul effet :
//   — ne sont pas relevés un score tout en lettres sans ces mots (« soixante-deux »),
//     « six de vos besoins », « 3 nuits sur 7 », et un nombre à plus de trente
//     caractères du mot « score » ou « total » ;
//   — sont relevés à tort « 3 sur 7 nuits », « du 12/03 », « un besoin de repos »,
//     « oméga 3/6 » (avec une espace) et « au total 21 nuits ».
// Collé à son nom, le chiffre d'un nutriment n'est pas lu comme un nombre
// (oméga-3/6/9, vitamine B12).

export type FormeDeScore = 'proportion' | 'pourcentage' | 'score_nombre' | 'total_nombre' | 'nombre_de_besoins';

/** Une date complète n'est pas une proportion : `12/03/2026` n'est pas 12 sur 3. */
const DATE_COMPLETE = /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g;

/** Sans « un » : « votre score, un repère » n'annonce aucune valeur. */
const ENTIERS_EN_LETTRES =
  'deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent';

/** Un chiffre qui n'est pas celui d'un nom, ou un nombre en toutes lettres. */
const NOMBRE = String.raw`(?:(?<![\p{L}\d/-])\d|(?<![\p{L}\d-])(?:${ENTIERS_EN_LETTRES})(?!\p{L}))`;

/** Le mot, puis un nombre dans la même phrase, à trente caractères au plus. */
function motSuiviDUnNombre(mot: string): string {
  return String.raw`(?<!\p{L})${mot}(?!\p{L})[^.!?\n]{0,30}?${NOMBRE}`;
}

const FORMES: readonly (readonly [FormeDeScore, RegExp])[] = [
  ['proportion', /(?<![\p{L}\d/-])\d+(?:[.,]\d+)?\s*(?:\/|sur(?!\p{L}))\s*\d+/iu],
  ['pourcentage', new RegExp(String.raw`%|(?<!\p{L})pour\s*cent(?!\p{L})|${motSuiviDUnNombre('pourcentages?')}`, 'iu')],
  ['score_nombre', new RegExp(motSuiviDUnNombre('scores?'), 'iu')],
  ['total_nombre', new RegExp(motSuiviDUnNombre(String.raw`total(?:e|es|aux|is\p{L}*)?`), 'iu')],
  [
    'nombre_de_besoins',
    /(?<![\p{L}\d-])(?:\d+|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze)\s+besoins?(?!\p{L})/iu,
  ],
];

/** Les formes de score relevées dans le texte, dans un ordre fixe, sans doublon. */
export function formesDeScoreDuNarratif(narratif: string | null | undefined): FormeDeScore[] {
  const texte = (narratif ?? '').replace(DATE_COMPLETE, ' ');
  return FORMES.filter(([, motif]) => motif.test(texte)).map(([forme]) => forme);
}
