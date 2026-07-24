### Migrations C4 : catalogue produits + contraintes de lignée clinical_rules (2026-07-24)

Pose des deux migrations du rayon compléments (autorisation praticien explicite
du 2026-07-24), toutes deux **additives** (aucune table existante modifiée en
place, aucun DROP, aucun backfill — les tables concernées sont vides en prod).

- **`20260724133000_c4_supplement_product_catalogue`** — trois tables du
  catalogue C4A : `supplement_products` (identité commerciale, provenance,
  fraîcheur, statut importée/vérifiée/inactive, empreinte de formulation),
  `supplement_product_compositions` (produit → ingrédient/forme/dose, pivot
  clinique intact) et `supplement_product_versions_courantes` (pointeur de
  version courante). RLS deny-all, CHECK de vocabulaire et de signature,
  index partiel d'unicité. Contrat CI `c4_supplement_catalogue_v1.sql`.
- **`20260724133100_c4_clinical_rules_contraintes_lignee`** — index partiels
  d'unicité de lignée sur `clinical_rules` (une version, un brouillon actif, une
  validée active) + traçabilité durable de la désactivation
  (`raison_desactivation`/`desactive_par`/`desactive_le` + CHECK). Prérequis
  d'activation de l'atelier de règles (LOT-03b). Contrat CI
  `c4_clinical_rules_lignee_v1.sql`.

Le drift check passe sans dérive (banc vérifié). Rien n'est activé côté produit :
`WN_C4_ENABLED` reste éteint. Le rayon reste *dark*.
