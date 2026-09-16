// Le bloc de signature du praticien — UNE SEULE fois dans le produit.
//
// Il vivait dans quatre gabarits du registre, recopié caractère pour
// caractère, et nulle part ailleurs : le courrier médecin partait donc sans
// signataire, du littéral « Docteur, » à une date. Une lettre qu'on imprime
// et qu'on remet à un médecin dit QUI l'écrit, et à quel titre — c'est ce
// titre, « Docteur en Pharmacie », qui dit au lecteur que l'auteur n'est pas
// médecin.
//
// POURQUOI IL QUITTE LE REGISTRE. Le registre des gabarits est signé : chaque
// version porte l'empreinte canonique de son `corps`, et le banc de hash-lock
// rougit si un caractère bouge. Sortir le bloc en constante partagée ne
// change AUCUN des quatre corps — la concaténation rend la même chaîne, et
// les quatre empreintes inchangées en sont la preuve, vérifiée à chaque CI.
// Le dupliquer une cinquième fois, en revanche, aurait laissé la qualité du
// praticien diverger en silence entre l'e-mail et le papier.
export const SIGNATURE_PRATICIEN =
  'Martial Cayre\n' +
  'Docteur en Pharmacie — praticien en santé fonctionnelle\n' +
  'Labellisé Neuro-Nutrition® (Institut SIIN)\n' +
  'Wellneuro — wellneuro.fr';
