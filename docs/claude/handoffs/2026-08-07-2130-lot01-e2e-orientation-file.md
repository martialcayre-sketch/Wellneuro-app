# Handoff — 2026-08-07 21:30 — LOT-01 : preuve E2E du parcours d'envoi

**Campagne** : `2026-08-07-dettes-packs-residuelles` · **Lot** : LOT-01 · **Statut** : livré
**Branche** : `worktree-lot01-e2e-orientation-file`

## Où en est le lot

Le parcours orientation → file d'envoi → envoi → déduplication a sa première
preuve de bout en bout : `web/e2e/orientation-file-envoi.spec.ts`, six étapes sur
Sophie Nicola (`PAT_SEED_01`), vert en T3 sur les deux projets Playwright, sept
mutations rouges — précédées d'une **passe de référence verte**, sans laquelle un
harnais cassé aurait rendu tout rouge et « prouvé » les sept maillons d'un coup.

Diff : le spec (neuf), deux helpers dans `web/e2e/helpers/db.ts`, deux variables
dans `webServer.env` de `web/playwright.config.ts`, et quatre documents. **Aucun
fichier produit touché** — le lot observe.

## Ce qu'il faut savoir avant de toucher à ce spec

**1. Deux verrous indépendants le rendaient injouable, et il faut les deux.**
`orientationActive()` est un ET : `WN_ENABLE_ORIENTATION_NNPP2` (n'était posé
nulle part côté dépôt ; **posé en production depuis le 2026-08-04**) et la
signature de la table. Et même armé, le seed ne déclenche rien :
`scoresPourOrientation` **ignore le `scoresJson` stocké** et recalcule depuis
`rawAnswers`, qu'aucune des 14 passations seedées ne porte. D'où
`provisionnerReponseOrientation`.

**2. Sur la colonne file d'envoi, une absence ne s'assère pas à l'écran.**
`brouillons` part de `[]` : « La file est vide » et un décompte à zéro sont vrais
**pendant le chargement**. Les deux ont laissé VERTE une mutation qui cassait
réellement le produit. Ce maillon se lit sur la réponse du GET.

**3. Le spec exige la base éphémère seedée** (`npm run test:worktree`). Contre la
base de dev partagée, il rougit sur « Patient introuvable » — le POST filtre sur
l'appartenance praticien. Ce rouge-là ne dit rien du code.

**4. Le nettoyage est chirurgical, et pas pour la raison qu'on croit.**
`resetPortailState` filtre sur `idAssignation: { not: null }` : elle n'aurait
**jamais** nettoyé la fixture, qui porte `idAssignation: null` comme le seed. Elle
est inadaptée, pas dangereuse.

## Ce qui n'est pas couvert, et qu'on pourrait croire couvert

L'envoi du **mail** (`SMTP_URL` vide sur le banc), le 409 `deja_assigne` du
second envoi, une recommandation ciblant un **pack**, un patient sans email, et
le nombre d'objets envoyés. **Une** règle (`R-STR-01`) vers **une** cible
(`Q_STR_05`) — pas la table.

## Reste à faire

- Merger la PR, puis **clore la campagne** : LOT-00 et LOT-01 sont livrés, elle
  n'a pas d'autre lot.
- Les cinq dettes de packs nommées au `## Hors périmètre` du lot restent sans lot
  d'accueil.
- Un fait périmé subsiste hors de ce diff : plusieurs commentaires de
  `web/playwright.config.ts` présentent `WN_G4_*`/`WN_G5_*` comme éteints en
  production alors qu'ils y sont posés depuis le 2026-07-21/22. Le diff pose
  l'avertissement ; il ne réécrit pas les commentaires eux-mêmes.
