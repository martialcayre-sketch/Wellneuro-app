// Normalisation d'une saisie de recherche (D-320 §1) — module PUR, sans
// dépendance : « homocysteine » trouve « Homocystéine », « oestradiol »
// trouve « Œstradiol ». Les diacritiques tombent (NFD), les ligatures se
// déplient, la casse et la ponctuation s'effacent.

export function normaliserRecherche(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('fr-FR')
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Les mots d'une saisie, normalisés ; vide si rien ne reste. */
export function jetons(texte: string): string[] {
  const normalise = normaliserRecherche(texte);
  return normalise ? normalise.split(' ') : [];
}
