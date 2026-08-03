### Rayons cognition et intestin branchés à un écran de recherche corpus

Les notebooks 05 (« Cognition et mémoire », 1114 claims) et 07 (« Axe
intestin-cerveau », 370 claims) sont désormais 100 % validés en base. Ils
rejoignent `RAYON_VERS_NOTEBOOK` et, contrairement aux rayons déclarés mais
inertes (biologie, nutrition, stress, humeur, sommeil), obtiennent un
consommateur réel : une nouvelle section « Recherche corpus » dans
`dashboard/bibliotheque`, derrière le flag dédié `WN_RECHERCHE_CORPUS_ENABLED`
(éteint par défaut ; nommé pour ne pas se confondre avec
`WN_ENABLE_CORPUS_CLINIQUE_V1`, un double-verrou clinique sans rapport — voir
`docs/FEATURE_FLAGS.md`). Recherche libre par rayon, claims validés retournés
avec statut et date de validation — pas un navigateur de catalogue comme le
rayon compléments (celui-ci reste inchangé).

En corrigeant ce branchement, un couplage caché est retiré : `servirRayonCorpus`
forçait `WN_C4_ENABLED` pour **tout** rayon demandé, pas seulement
micronutrition — éteindre le flag compléments aurait aussi éteint
cognition/intestin. Le gate produit vit désormais dans la couche accès de
chaque route (`getPractitionerC4Access`, la nouvelle
`getPractitionerRechercheCorpusAccess`), pas dans le service générique par
rayon, **et** dans une allowlist dédiée (`RAYONS_RECHERCHE_CORPUS`) que la
nouvelle route applique : une revue adversariale a montré qu'une simple regex
syntaxique aurait laissé cette route servir n'importe quel rayon de la carte,
micronutrition compris, en contournant `WN_C4_ENABLED` — corrigé avant merge.

Notebook 06 (douleurs chroniques) reste hors périmètre : pas encore validé.
