import { jourOuverture, type OuverturesMesEchanges } from '@/lib/portail/mesEchanges';

// `WN_PORTAIL_MES_ECHANGES` ([[D-293]], J3-base) — valeur exacte `'true'`,
// absent = fermé. Variable serveur : la page et la route la lisent, un composant
// client ne la voit pas.
//
// NEUF ET ÉTEINT à la livraison. Il ne se pose pas avant le code de ai
// ([[D-293]] §4 : « tant qu'il n'existe pas, Mes échanges ne s'ouvre pas ») ; il
// s'ouvre avec ACT-3, place 3 de la file C (H76).

export function mesEchangesOuvert(value = process.env.WN_PORTAIL_MES_ECHANGES): boolean {
  return value === 'true';
}

// JOUR D'OUVERTURE DES SURFACES QUE LE JOURNAL LIT (t14, arbitrage du
// 2026-10-19) : `<DRAPEAU>_OUVERT_LE=AAAA-MM-JJ` (jour de Paris), posé AVEC le
// drapeau, au même geste — c'est la procédure d'allumage
// (`docs/FEATURE_FLAGS.md`). Sans base ni migration. Absent ou illisible : aucune
// mention, la ligne reste celle d'avant.
//
// Seules les espèces REMISES par le praticien sous un drapeau propre y sont :
// une remise peut précéder l'ouverture de sa page. Ce que le patient transmet
// (comptes rendus, questionnaires, signalements) ne peut pas précéder la
// surface qui le recueille.
export function ouverturesMesEchanges(env: NodeJS.ProcessEnv = process.env): OuverturesMesEchanges {
  const ouvertures: OuverturesMesEchanges = {};
  const fiches = jourOuverture(env.WN_FICHES_ASSIETTE_LECTURE_OUVERT_LE);
  if (fiches) ouvertures.fiche_assiette = fiches;
  const lettre = jourOuverture(env.WN_LETTRE_ADRESSAGE_PATIENT_OUVERT_LE);
  if (lettre) ouvertures.lettre_adressage = lettre;
  return ouvertures;
}
