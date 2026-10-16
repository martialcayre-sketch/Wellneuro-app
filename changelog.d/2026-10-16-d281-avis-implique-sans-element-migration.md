### Sécurité : la base admet l'avis « impliqué, élément non identifiable » (D-281 §5, migration seule, 2026-10-16)

- **Le cas** : quand le programme visé par un signalement sans élément
  désigné ne passe pas le contrôle d'intégrité, le praticien ne pouvait
  rendre que « non impliqué » pour lever la garde de diffusion. Arbitrages
  du responsable du 2026-10-16 (plan §8, t25) : ouvrir un avis
  « impliqué » sans élément, sur le seul programme illisible, avec un
  aménagement obligatoire (même liste fermée). Migration accordée.
- **Migration seule** (`20261016110000_saf_ei_avis_implique_sans_element_v1`) :
  la contrainte de cohérence du verdict exige l'aménagement pour
  « impliqué », l'élément devient facultatif. Le trigger d'insertion de
  l'avis refuse « impliqué » sans élément quand le patient a désigné
  l'élément, ou quand le signalement ne vise aucun programme. Aucune
  colonne, table ni index ; `schema.prisma` inchangé ; aucune donnée
  touchée.
- **Ce que la base ne tient pas** : « seulement sur programme illisible ».
  L'intégrité se juge par une empreinte que seul le code recalcule ; la
  route du verdict le tiendra, en PR séparée après la `release-db`. D'ici
  là, aucun écrivain ne produit cette forme.
- **Contrats SQL** : `trust_aev_implique_sans_element_v1_negatif.sql`,
  branché au CI ; dans `trust_aer_rattachement_verdict_v1_negatif.sql`, le
  cas « impliqué sans élément » devient « sans élément ni aménagement ». La
  règle `SAF-EI-01` reste non armée.
