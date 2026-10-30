### Gouvernance : une PR documentaire peut citer le handoff de son lot (D-396, 2026-10-30)

- D-396 amende l'étape 7 de `wn-merge`. Une PR documentaire peut citer
  dans sa déclaration « prête » le handoff de son lot au lieu d'en créer
  un, si trois conditions sont réunies :
  - elle est documentaire au sens du CI (`docs_only=true`) ;
  - le handoff cité est présent sur `origin/main` ;
  - son titre et ce handoff nomment une même décision ou une même fiche.
- Sinon, elle est renvoyée comme avant. Une PR qui touche du code crée
  toujours son handoff, et le contrôle de clôture du CI ne change pas.
