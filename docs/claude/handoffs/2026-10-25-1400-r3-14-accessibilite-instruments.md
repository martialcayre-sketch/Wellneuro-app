# Handoff — 2026-10-25 — r3_14 : les instruments des 12 besoins sous banc d'accessibilité (Q12)

## Branche et état du dépôt

- Branche `claude/r3-14-accessibilite`, partie de `origin/main` (66391a0f),
  rebasée sur e859875d (F79 #1687 et t44 #1692, mergées pendant le lot) sur
  arbitrage du responsable. Worktree `j3-12e-ingestion`, session concurrente, cycle en
  `git`/`gh` direct.

## Objectif

Lot r3_14 de la file A (audit F59, Q12 « oui aux trois ») : banc automatique
sur la fiche praticien (B), onglet et tiroir au parcours E67 du poste B (A),
« Mon équilibre » aux étapes d'E67 (C). La passe humaine elle-même reste un
geste de la file D (H64).

## Décisions prises

- Arbitrages du responsable (questions à options, 2026-10-25) : banc posé
  maintenant, sans attendre J3-12b ; en cas de violation, correctif dans le
  lot s'il ne demande aucun texte d'écran (sinon texte soumis ou renvoi à
  F9a), jamais de règle désactivée ; portée bornée au panneau de l'onglet et
  au tiroir.
- Inventaire : J3-12b réorganise l'onglet (H15) ; le banc vise le panneau par
  son id et le tiroir par son rôle et son nom, donc survit à cette
  réorganisation. F9a (caption, radar, graduations, `role="status"`) reste
  après J3-12b.
- Premier passage du banc : zéro violation, aucun correctif d'écran.

## Fichiers modifiés

- `web/e2e/fiche-besoins-accessibilite.spec.ts` (nouveau).
- `docs/PASSE_ACCESSIBILITE_E67.md` (étape 9, écrans praticien, critère de
  fin).
- `docs/claude/PLAN_WELLNEURO.md` (mise à jour sous H64).
- `changelog.d/2026-10-25-r3-14-accessibilite-instruments.md`,
  `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- T2 (`npm run test:worktree -- --fast`) vert en 7 min 44 s, avant la
  revue : 14 997 tests Vitest, 300 E2E dont les deux tests du banc sous
  Desktop Chromium et iPhone 13 (zéro violation axe). Rejoué vert après
  les corrections de revue et le rebase, en 7 min 39 s : 14 997 tests
  Vitest, 300 E2E, le banc compris (retour du focus vérifié sous les deux
  projets).
- T1 rapide vert ; ESLint du spec vert ; anti-secrets vert.
- `/code-review medium`, dix constats. Corrigés : boucle de dépliage bornée,
  avec une assertion finale ; l'ancrage sur une classe Recharts est remplacé
  par les replis rendus ; les comptes exacts de replis sont remplacés par
  leur présence ; le tiroir est désigné par son nom ; le tiroir s'ouvre au
  clavier, et le retour du focus sur son bouton est vérifié après Échap ;
  axe attend la fin des animations de la zone. Écartés avec motif : le motif
  d'URL `**/api/…?**` (le même que les deux bancs voisins ; le client envoie
  toujours `?idPatient=`, et un mock manqué ferait échouer l'assertion de
  présence de l'écart, absent du seed) ; le typage `satisfies` des fixtures
  (aucun banc E2E n'importe les types des routes ; une fixture périmée rend
  une branche dégradée, que les assertions de présence font rougir) ; la
  grille E67 (le modèle de relevé est une ligne d'exemple, sans liste
  d'écrans à aligner ; le critère de fin nomme déjà les neuf étapes et les
  trois écrans du poste B) ; le « zéro violation » du plan (constaté par le
  T2 ci-dessus, que la revue ne voyait pas ; la mention « 8 étapes » est une
  mise à jour datée, laissée telle quelle).
- Pas de T3 : aucun chemin clinique, aucune migration.

## Problèmes ouverts

- La passe humaine E67 (file D) n'est pas jouée : le banc ne juge pas
  l'annonce réelle au lecteur d'écran.
- Les défauts de l'audit qu'axe ne classe pas en violation A ou AA (radar
  sans nom, cercles portés par la couleur, tables sans caption) restent à
  F9a, après J3-12b.
- La migration t44 (#1692), mergée pendant le lot, attend sa release-db
  (celle de F79 est passée) : ne pas merger ce lot tant qu'un run release-db
  est en attente (anti-recul).

## Prochaine action exacte

CI en fond (`node scripts/wn-attendre-ci.mjs <N>`), revue CodeRabbit sur le
sha de tête, vérifier qu'aucun run release-db n'attend, merge, observation
du déploiement Scalingo (pas de release-db pour ce lot). Puis pages file A
(r3_14 fait) et Instruments (Suivi des lots), et mémoires.

## Interdits encore actifs

Aucune migration ; aucun drapeau ; ni le calcul ni la version du score
(v15) ; production en lecture seule ; aucun texte d'écran sans relecture du
responsable ; aucune couleur ni aucun mot qui juge la valeur (D-333 §2 r4) ;
garde `frontierePortail` verte ; pas de `retries` Playwright, un rouge WebKit
du CI ne se relance jamais ; aucun identifiant de dossier accompagné d'un
constat. Hors périmètre : r3_09, r3_12, t33, les deux points t43, F9a, le
constat de réapprobation de D-359.
