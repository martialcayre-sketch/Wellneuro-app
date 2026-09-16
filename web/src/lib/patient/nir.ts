// LE NIR DÉCLARÉ, ET SA CLÉ DE CONTRÔLE.
//
// Ce que le praticien saisit ici est un NIR DÉCLARÉ — recopié d'une carte Vitale
// ou d'une attestation —, jamais une INS certifiée : rien n'interroge le
// téléservice INSi, et ce module ne prétend pas le faire. Il vérifie une forme
// et une clé, c'est-à-dire qu'il attrape la faute de frappe, pas l'usurpation.
//
// POURQUOI VÉRIFIER LA CLÉ PLUTÔT QUE LA SEULE FORME. La base garde déjà la
// forme (`patients_nir_forme`, LOT-03) : quinze caractères, département corse
// admis. Mais un numéro bien formé et faux se recopie sans que rien ne bronche,
// et il finit sur un courrier adressé à un confrère ou sur une demande de prise
// en charge. La clé — deux chiffres calculés sur les treize autres — refuse la
// majorité des transpositions et des chiffres substitués. C'est le seul
// contrôle disponible hors téléservice, et il coûte une division.
//
// LA CLÉ N'EST PAS EN BASE, ET C'EST VOULU. Un `CHECK` SQL ne sait pas calculer
// un modulo sur une substitution corse sans devenir illisible ; surtout, un
// refus de base remonte en erreur technique, là où un refus applicatif peut
// dire au praticien CE QUI ne va pas.

/** Forme attendue : la même que le `CHECK` de la base, au caractère près. */
const FORME = /^[0-9]{5}(2[AB]|[0-9]{2})[0-9]{8}$/;

export type VerdictNir =
  | { valide: true; nir: string }
  | { valide: false; motif: 'forme' | 'cle' };

/**
 * Normalise un NIR saisi : espaces et points retirés, lettres corses en
 * majuscules.
 *
 * Les cartes Vitale et les attestations impriment le numéro par groupes
 * (« 1 84 12 75 116 001 42 ») ; refuser cette écriture-là obligerait le
 * praticien à retaper ce qu'il a sous les yeux, ce qui ajoute des fautes au
 * lieu d'en retirer.
 */
export function normaliserNir(saisie: string): string {
  return saisie.replace(/[\s.\-]/g, '').toUpperCase();
}

/**
 * Vérifie forme ET clé de contrôle.
 *
 * La clé vaut `97 − (n mod 97)`, où `n` est le nombre formé par les treize
 * premiers caractères — la Corse substituée : `2A` → `19`, `2B` → `18`. C'est
 * la seule irrégularité de l'algorithme, et elle existe parce que les deux
 * départements corses ont remplacé en 1976 le département 20, dont les numéros
 * restent valides.
 *
 * Treize chiffres valent au plus ~9,9 × 10¹², très en deçà de
 * `Number.MAX_SAFE_INTEGER` (~9 × 10¹⁵) : le calcul tient en `number` sans
 * perte. Un `BigInt` ne changerait rien au résultat et rendrait la lecture plus
 * lourde.
 */
export function verifierNir(saisie: string): VerdictNir {
  const nir = normaliserNir(saisie);
  if (!FORME.test(nir)) return { valide: false, motif: 'forme' };

  const corps = nir.slice(0, 13).replace('2A', '19').replace('2B', '18');
  const cleAttendue = 97 - (Number(corps) % 97);
  const cleSaisie = Number(nir.slice(13));

  return cleAttendue === cleSaisie ? { valide: true, nir } : { valide: false, motif: 'cle' };
}

/** Le message rendu au praticien, qui doit dire CE QUI ne va pas. */
export function messageNirInvalide(motif: 'forme' | 'cle'): string {
  // « CARACTÈRES » ET NON « CHIFFRES », et ce n'est pas un détail de style : un
  // NIR corse porte `2A` ou `2B` au rang du département. Dire « 13 chiffres »
  // à un praticien qui a un numéro corse sous les yeux le renvoie chercher une
  // faute qu'il n'a pas commise — ou lui fait croire que le numéro de son
  // patient est invalide (constat de revue, 2026-09-16).
  return motif === 'forme'
    ? 'Numéro de sécurité sociale invalide : 15 caractères attendus — 13 pour le numéro (dont « 2A » ou « 2B » pour la Corse), puis la clé à 2 chiffres.'
    : 'Numéro de sécurité sociale invalide : la clé de contrôle ne correspond pas aux 13 premiers caractères. Vérifiez la saisie.';
}
