# Handoff — 2026-08-18 — D-075 : les dossiers de test sont réels

- **État** : `docs/regle-dossiers-test-reels`, depuis `main` à `166d2c87`.
  Diff : `CLAUDE.md` (§Données patients), registre, changelog, journal.
- **Décision** : `D-075` — arbitrage praticien sur la règle de données.

## Ce qui change pour une session future

Les dossiers de test **sont réels** et se **lisent par identifiant** via
`execute_sql`. Refuser de vérifier un comportement sur un vrai dossier n'est
plus la bonne lecture de la règle — et ce refus avait un coût : au lot
`D-074`, la conclusion a failli reposer sur un journal d'accès que Playwright
pouvait tout aussi bien avoir écrit.

## Ce qui ne change pas, et pourquoi

- **Aucun nom ni e-mail réel dans le dépôt.** L'historique Git, les logs CI et
  les builds Vercel ne s'effacent pas.
- **Aucun seed ni E2E visant un dossier réel.** `web/prisma/seed.ts` écrit des
  réponses de questionnaire (`questionnaireReponse.upsert`) ; une réponse
  fabriquée déposée dans un dossier réel est une donnée que personne n'a
  produite, et elle alimenterait scoring, orientation et indications.
- Les trois identités de fixture (Sophie Nicola, Jennifer Martin, Michel
  Dogné) restent en place — elles ne prétendent plus lister les dossiers
  autorisés à exister.

## Point ouvert

Les identifiants des trois dossiers de test ne sont **pas** dans le dépôt et
n'y entreront pas. Une session qui en a besoin les demande au praticien (ils
figurent dans l'URL de la fiche patient).
