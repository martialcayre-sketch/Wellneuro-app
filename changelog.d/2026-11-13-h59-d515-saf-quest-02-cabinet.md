### Instruments du cabinet : décision D-515, règle `SAF-QUEST-02` du lot D-277 (2026-11-13)

Documentation seule, aucun code. [[D-515]] fixe comment une réponse positive à
la question désignée d'un instrument du cabinet (`CAB_`) déclaré « oui » fait
naître un constat de sécurité. Elle répond aux arbitrages `20261112-2023-a` à
`2025-a` et `20261113-1807-a` du responsable.

- **La règle.** `SAF-QUEST-02`, neuve et sous sa propre signature, reprend
  [[D-275]] §2 : toute valeur autre que le « non » désigné produit un
  constat, une valeur hors options aussi, une réponse illisible produit une
  limitation (A2). Aucune gradation, aucun seuil.
- **La copie.** À l'envoi, l'identifiant de la question, la valeur « non » et
  une copie JSON figée (nom de l'instrument, énoncé, options verbatim) sont
  copiés sur l'assignation. Les trois colonnes sont nullables, avec un CHECK de
  cohérence.
- **Les effets.** Les mêmes qu'un constat du catalogue : inhibition totale
  jusqu'à la lettre, carte du Fil, lettre qui cite la réponse comme un texte du
  praticien. Le message et le courriel de [[D-277]] gardent leurs textes signés.
- **La désignation inconnue.** Elle produit une limitation, jamais un « non ».
- **L'ordre des lots.** La migration et sa release-db, puis le code derrière
  `WN_ENABLE_DECLARATION_SUICIDE_CAB` et sa release-db, puis le recomptage
  des copies NULL, puis l'allumage par le responsable.

La table `SAF-QUEST-01` et sa signature, et les textes de [[D-275]] et de
[[D-277]], ne changent pas.
