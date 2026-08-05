const MESSAGE_C4_DESACTIVE = "Le rayon compléments n'est pas encore ouvert sur cet environnement. Son activation métier se fait via le flag WN_C4_ENABLED.";

export function isC4Enabled(value = process.env.WN_C4_ENABLED): boolean {
  return value === 'true';
}

export function getC4DisabledMessage(): string {
  return MESSAGE_C4_DESACTIVE;
}

// Nom distinct de WN_ENABLE_CORPUS_CLINIQUE_V1 (double verrou clinique,
// catégorie C de docs/FEATURE_FLAGS.md) à dessein : celui-ci est un simple
// flag produit ('true', ouvrable par l'environnement seul), l'autre exige en
// plus une validation clinique signée en code. Deux noms trop proches
// laisseraient un opérateur ouvrir l'un en croyant ouvrir l'autre.
const MESSAGE_RECHERCHE_CORPUS_DESACTIVE = "La recherche corpus clinique n'est pas encore ouverte sur cet environnement. Son activation métier se fait via le flag WN_RECHERCHE_CORPUS_ENABLED.";

export function isRechercheCorpusEnabled(value = process.env.WN_RECHERCHE_CORPUS_ENABLED): boolean {
  return value === 'true';
}

export function getRechercheCorpusDisabledMessage(): string {
  return MESSAGE_RECHERCHE_CORPUS_DESACTIVE;
}
