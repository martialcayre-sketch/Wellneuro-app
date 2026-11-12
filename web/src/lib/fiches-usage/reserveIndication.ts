// LES CLAIMS SOUS RÉSERVE D'INDICATION — [[D-465]] §3, [[D-498]], lus par
// l'outil de rédaction des fiches d'usage ([[D-501]]).
//
// La réserve : dans les listes de bilan que portent ces claims, la présence du
// marqueur ne vaut pas indication de le demander, y compris dans un texte
// produit par l'IA. L'outil hors ligne (`tools/corpus/fiches-usage/`) marque
// ces claims dans le message du rédacteur et du contre-lecteur ; sa consigne
// dit ce que la marque interdit.
//
// DES IDENTIFIANTS SEULEMENT ([[D-251]] §4). Aucun module de l'application qui
// appelle le modèle ne l'importe : la porte 3 du banc de [[D-498]] le
// rougirait. La liste est comparée, dans ce banc, à la sienne, écrite en
// clair : les deux ne bougent qu'ensemble.
//
// HORS DE `lib/clinical/` À DESSEIN : ce dossier déclenche une release-db au
// merge, et ce module n'a rien à appliquer.

export const CLAIMS_SOUS_RESERVE_INDICATION: readonly string[] = [
  // [[D-465]] §3 : les cinq écarts clos.
  'WN-CL-0043-017',
  'WN-CL-0168-025',
  'WN-CL-0178-054',
  'WN-CL-0376-016',
  'WN-CL-0386-003',
  // [[D-498]] : signés sous la même réserve.
  'WN-CL-0043-005',
  'WN-CL-0377-016',
];
