### Collecte documentaire : les tables des documents déposés par le patient (D-329, J3-collecte)

- Migration `documents_deposes_patient_v1`, en deux tables : les documents
  que le patient dépose dans son dossier, et les classements du praticien.
  Aucun code ne dépose encore ; le dépôt s'ouvrira à la place 4 de la file C,
  derrière un drapeau.
- La base tient les bornes du compte rendu (PDF ou image, 10 Mio,
  empreinte), une catégorie de la liste, et deux gestes du seul praticien du
  dossier : la première consultation, datée, et le retrait. Le retrait efface
  le document et garde la ligne. Les classements sont en ajout seul. RLS sans
  politique.
- L'effacement nommé du dossier supprime les classements puis les documents.
  Un banc borne les écrivains, et la déclaration RGPD est posée avant les
  tables.
