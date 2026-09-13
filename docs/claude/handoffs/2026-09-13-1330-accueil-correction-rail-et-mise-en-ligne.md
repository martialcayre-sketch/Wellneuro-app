# Handoff — accueil : débordement du rail corrigé, mise en ligne constatée (2026-09-13 13:30)

Suite de `2026-09-13-1226-accueil-moins-de-defilement.md`, qui décrit l'état
d'AVANT ce correctif. Ce fragment ne le remplace pas : il le prolonge.

## Branche et état Git

- **Mergé sur `main`** : `adb501d1` (PR #1081). Branche et worktree supprimés.
- Les quatre commits du lot, dans l'ordre : `506e1da2` (#1074) · `cad2d617`
  (#1077) · `5e59a76f` (#1080, clôture) · `adb501d1` (#1081, ce correctif).

## Ce qui a été signalé, et ce que chaque signalement était vraiment

Le propriétaire a rapporté **deux** défauts sur une capture de production. Ils
n'avaient pas la même nature, et c'est le point à retenir.

1. **« Météo d'adhésion et Agendas n'ont pas été déplacés. »** Le code était
   juste ; **la release en ligne était en retard**. Journal Scalingo : `506e1da2`
   (sans le déplacement) tournait encore à l'heure de la capture, `cad2d617`
   était au statut `starting`. Constaté par CONTENANCE
   (`git merge-base --is-ancestor cad2d617 <sha déployé>`), jamais par égalité.
2. **« Le texte "aucun échange consigné" dépasse de la fenêtre. »** Vrai défaut,
   introduit par #1074.

## Le défaut, et sa cause exacte

Dans la ligne repliée de `PanneauRail`, le résumé portait `shrink-0` : il gardait
sa largeur maximale, donc **rien ne pouvait céder**. « Correspondance récente »
plus « Aucun échange consigné » demandent quelques pixels de plus que les 268 px
utiles d'un rail de 300 px — le titre passait à deux lignes et le résumé sortait
quand même de la carte.

**Correctif** : `flex-wrap` sur le `summary` autorise le passage à la ligne, et
`whitespace-nowrap` sur le résumé choisit QUELLE rupture a lieu — le résumé
descend entier sous le titre au lieu de se couper en deux au milieu.

**Mesuré au navigateur après correction**, build de production :

| Panneau replié | Bord droit du résumé | Bord droit de la carte | Hauteur |
|---|---|---|---|
| File d'envoi | 1399 px | 1416 px | 23 px (une ligne) |
| Correspondance récente | 1298 px | 1416 px | 44 px (deux lignes) |

## Fichiers modifiés

- `web/src/components/fil/PanneauRail.tsx` — la ligne repliée.
- `changelog.d/2026-09-13-accueil-moins-de-defilement.md` — fragment du lot
  **amendé sur place** (il n'était pas encore publié) plutôt que doublé d'une
  entrée « correction d'un défaut jamais sorti ».

## Validations exécutées

- **T2 verte** : 9023 unitaires (1 skipped) + 196 e2e, 3 min 20 s.
- CI `verify` réellement joué et vert (`wn-attendre-ci` = 0).
- Captures de revue à 1440 px (rail étroit — le cas qui débordait) et 2560 px.

## Problèmes ouverts

- **`WN_RELEASE_SHA` n'est pas posée côté Scalingo.** `releaseSha()` retombe donc
  sur `'local'` et l'en-tête affiche « build local » **en production** : on ne
  peut pas lire depuis l'écran quelle version on regarde, et Sentry tague la
  release `local`. Poser la variable redémarre l'application — arbitrage
  propriétaire en attente.
- **Mise en ligne de `adb501d1` non constatée** : au moment d'écrire, le dernier
  déploiement réussi est `cad2d617`.
- Hors lot, inchangés : clôture de l'agenda alimentaire (`a_transmettre` sans
  CTA), second `T0`, lettre DPA, trois trous du § 7 RGPD.

## Prochaine action exacte

Constater `adb501d1` en ligne par contenance, puis regarder le rail replié sur
`app.wellneuro.fr` — c'est là que le défaut a été vu, pas en local.

## Interdits encore actifs

Inchangés : aucune identité patient réelle dans le dépôt ; production en lecture
par `scalingo run -d`, écriture par migration relue puis `release-db` approuvée ;
pas de `schema.prisma` ni de clinique/scoring sans demande explicite.
