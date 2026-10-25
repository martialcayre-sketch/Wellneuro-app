# Handoff — 2026-10-25 — ap : « Ma bibliothèque », le contenant livré éteint (D-360)

## Branche et état du dépôt

- Branche `lot/ap-bibliotheque`, partie de `origin/main` (09c8c6c4),
  worktree `act5-mineurs`. Session concurrente, cycle en `git`/`gh` direct.
- D-360 est provisoire : #1692 et #1693 visent aussi ce numéro. Il se fixe
  au merge, sur le dernier numéro de `origin/main`.

## Objectif

Place 10 de la file C (H82, lettre ap, D-357) : faire accepter les trois
titres d'écran, puis livrer le contenant sans migration, sous
`WN_PORTAIL_BIBLIOTHEQUE` éteint.

## Décisions prises

- Arbitrages du responsable du 2026-10-25, sur questions à options :
  - titres à la première personne : « Ma bibliothèque » (titre de la page et
    libellé du lien), « Remis par mon praticien », « Pour mieux comprendre
    ma démarche » ;
  - servie au dossier majeur, la bibliothèque remplace le lien « Fiches
    remises par mon praticien » ; le mineur garde le sien (D-360 §2).
- Choix de l'assistant, écrits dans D-360 §3 :
  - le lien ne paraît que si un rayon a quelque chose à montrer ;
  - une page atteinte sans document ne montre que son titre ;
  - aucun texte d'état neuf.
- Le même jour, hors de ce lot : le texte du geste de la place 9 (H81) est
  accepté, et son point de départ fixé au premier jour noté du carnet. Ils
  sont à verser par une PR de doc après ce lot.

## Fichiers modifiés

- Route `web/src/app/api/portail/bibliotheque/route.ts` et page
  `web/src/app/portail/[token]/bibliotheque/page.tsx`, avec leurs bancs.
- Drapeau : `web/src/lib/portail/bibliothequeDrapeau.ts`.
- Composants : `web/src/components/patient/bibliotheque/` (composant, textes,
  banc) et `LienBibliotheque` (lien et banc).
- Fiches : la sonde `api/portail/fiches-assiette?interrupteur=1` répond
  désormais `bibliotheque`, et `LienFichesRemises` en tient compte (bancs
  étendus). `CarteFicheRemise` est extraite de `FichesRemises`.
- Lien ajouté au hub dans `questionnaires/page.tsx`.
- Gabarit ajouté à `lib/observability/masquageChemin.ts`.
- Documents : `docs/DECISIONS.md` (D-360), `docs/FEATURE_FLAGS.md`, le plan
  (H82 et ligne de la place 10), `docs/claude/MATRICE_CONSOMMATION.md`
  (régénérée), le fragment `changelog.d/2026-10-25-ap-bibliotheque-contenant.md`,
  `SESSION_LOG.md` et ce handoff.

## Validations exécutées

- Bancs ciblés : 10 fichiers, 104 tests verts. T1 rapide vert.
- `wn-reviewer` : GO, sans P0 ni P1.
  - P2-1 corrigé : D-360 §2 dit maintenant que, si seule la sonde de la
    bibliothèque tombe en panne, aucun des deux liens ne paraît jusqu'au
    rechargement.
  - P2-2 accepté : un mineur qui tape l'adresse voit la coquille de la page
    et le message du 409, comme sur « Mes échanges ».
  - P2-3 accepté, laissé ouvert : le retour depuis une fiche mène à la page
    des fiches.
- Premier T3 rouge : la matrice de consommation avait dérivé, car la
  nouvelle route est une surface indirecte de la Boussole. Elle est
  régénérée.
- Deuxième T3 rouge : le gabarit de masquage de la nouvelle page manquait.
  Il est ajouté.
- Troisième T3 vert en 7 min 1 s : 14 997 tests Vitest, 296 E2E.

## Problèmes ouverts

- Place 9 :
  - la fenêtre de service autour du terme n'est pas fixée ;
  - le code attend H74 (file A) ;
  - le texte et le point de départ sont à verser au plan.
- Le retour depuis une fiche ouverte par la bibliothèque (P2-3).

## Prochaine action exacte

Dans l'ordre :
1. CI en fond (`node scripts/wn-attendre-ci.mjs <N>`).
2. Revue CodeRabbit sur le sha de tête, un verdict par commentaire.
3. Renuméroter D-360 si #1692 ou #1693 a pris le numéro.
4. Merge `--match-head-commit`, puis déploiement constaté sur Scalingo.
5. Après ce merge : PR de doc pour la place 9.

## Interdits encore actifs

- Pas d'activation de `WN_PORTAIL_BIBLIOTHEQUE` avant le constat de la
  place 9.
- Aucun texte patient sans validation.
- Aucune fenêtre ni aucun seuil inventés.
- Aucune migration ; production en lecture seule par conteneur.
- Aucun lien d'artefact dans le dépôt.
- Un merge à la fois.
