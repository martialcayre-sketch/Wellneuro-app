### CI : `main` de nouveau vert — E2E épinglé sur Ubuntu 24.04, rang du journal H15 renuméroté (2026-11-19)

- **E2E** : `ubuntu-latest` désigne `ubuntu-26.04` depuis le 2026-11-19 ; le WebKit de Playwright y cherche
  `libicudata.so.74` (l'image porte libicu78) et tous les projets iPhone 13 échouaient avant d'ouvrir une page.
  Le job `e2e` de `ci.yml` et `visual-baselines.yml` (mêmes références d'écran) sont épinglés sur `ubuntu-24.04`,
  dernière image où le job passait. Les autres jobs restent sur `ubuntu-latest`. Écarté : monter Playwright, hors
  périmètre d'un correctif d'image.
- **Journal du plan** : #2258 et #2256 avaient chacune posé un fragment H15 de rang `2026-11-19-02` ; le contrôle
  « Journal du plan » refusait le doublon sur `main`. Le fragment du besoin 5 passe au rang `04` (renommage seul,
  contenu inchangé), et la suite `02` → `03` du besoin 8 reste juste.
