### Le corpus de synthèse est signé — le dernier verrou clinique du dépôt s'ouvre (2026-08-22)

`corpusSyntheseV1.ts` était la dernière table clinique non signée. Le
responsable l'a validée cliniquement en session (`D-082`), après relecture
intégrale : 30 lignes de cadre méthodologique pour le prompt de synthèse —
prudence, axes d'analyse, heuristiques, règles de formulation. **Pas un
caractère du contenu ne change** : seule la métadonnée passe à
`validationExterne: true`, datée.

- Le tableau gardé de `FEATURE_FLAGS.md` suit la signature — le banc
  `verrousSignatureDocumentes.guard.test.ts` compare les deux, signer en
  silence est impossible.
- Le drapeau `WN_ENABLE_CORPUS_CLINIQUE_V1=1` se pose en production **après**
  le déploiement portant la signature — ordre « validation d'abord, flag
  ensuite », et leçon de la classe `D-070`/`#707` : un drapeau posé n'existe
  que porté par un build.
- Ce que ça allume : le corpus cadre la formulation du brouillon de synthèse.
  Ce que ça ne change pas : la couche déterministe décide, le LLM formule
  (DC-02), et rien ne part au patient sans validation praticien.
