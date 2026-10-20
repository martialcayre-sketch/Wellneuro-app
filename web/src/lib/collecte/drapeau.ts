// `WN_PORTAIL_DEPOT_DOCUMENTS` ([[D-330]] §4, J3-collecte) — valeur exacte
// `'true'`, absent = fermé. Variable serveur : la page et la route du portail la
// lisent, un composant client ne la voit pas.
//
// NEUF ET ÉTEINT à la livraison. Il ferme la SURFACE PATIENT (le dépôt, sa page,
// son lien, la ligne « Transmis » de « Mes échanges ») ; il s'ouvre avec ACT-4,
// place 4 de la file C (H77), après ACT-3 constatée et J2-conf.
//
// L'écran du praticien ne lui est PAS soumis : il ne lit que ce qui a été
// déposé, et un drapeau refermé après un premier dépôt ne doit pas priver le
// praticien de consulter ou de retirer un document déjà reçu. Sur un dossier
// sans dépôt, drapeau fermé, il ne s'affiche pas.

export function depotDocumentsOuvert(value = process.env.WN_PORTAIL_DEPOT_DOCUMENTS): boolean {
  return value === 'true';
}
