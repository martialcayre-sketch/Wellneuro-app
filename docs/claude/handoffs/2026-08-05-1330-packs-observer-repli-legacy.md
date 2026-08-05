# 2026-08-05 — LOT-02 : Packs, observer le repli legacy avant de le fermer

Campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0`, lot LOT-02.
Branche `worktree-lot-02-packs-observer-repli`. Statut : **code prêt, PR à
ouvrir**.

## Où en est le lot

`resolvePackQuestionnaireIds` (`web/src/lib/consultation/packRegistry.ts`,
**non modifié**) retombe sur `packs.qids` legacy dans trois cas distingués par
`raison` : `registre_absent`, `registre_vide` (bénins), `ensembles_divergents`
(vraie dérive). Seule la dérive était journalisée (WARN) — décision déjà
documentée en commentaire, pour éviter une alarme permanente sur tout pack neuf.
Le vrai trou n'était pas cette décision, c'est l'absence totale de trace pour les
deux cas bénins.

Ajouté : une branche `logger.info` (même event `PACK_REGISTRE_REPLI_LEGACY`,
niveau distinct) dans les deux seuls appelants du résolveur —
`web/src/app/api/praticien/packs/assign/route.ts` et
`web/src/app/api/portail/valider/route.ts` — plus `metadata: { raison,
registryCount }` sur le WARN existant (texte inchangé). Aucune abstraction
partagée créée : 2 call-sites, le duplicata suit le style déjà en place dans ces
fichiers.

## Constat de production (fait pendant le cadrage, pas différé à l'exécution)

`execute_sql` (lecture seule, réplique exacte de la logique de
`prisma/checkPackRegistryConsistency.ts`, script déjà existant depuis R3) :

| Résolution | Nombre |
|---|---|
| `registry` (match exact) | 7/8 |
| `ensembles_divergents` | 1/8 — `PACK_-bG21yeIvVYRhrdlYuWIMnFz` (« Base de consultation », pack `parDefaut`, envoyé à *chaque* onboarding) |
| `registre_absent` / `registre_vide` | 0/8 |

Le pack de base a `Q_SOM_09` (Agenda du sommeil 21 nuits, actif au catalogue)
côté legacy, absent du registre relationnel — un oubli de synchronisation, pas
une exclusion voulue.

**Recommandation datée (2026-08-05) : ne pas fermer le repli.** Il protège
aujourd'hui le pack le plus emprunté du produit. Avant toute fermeture,
resynchroniser le registre du pack de base (rejouer `syncPackToRegistry`) pour
qu'il inclue `Q_SOM_09`, puis revérifier par la même requête. Resynchroniser est
une correction de donnée, volontairement **hors périmètre** de ce lot
(observation seule).

## Validations

T1 vert. T2 (`test:worktree -- --fast`) : 2 échecs au premier passage
(`portail-parcours.spec.ts:110` et `portail-lien-magique.spec.ts:48`), **tous
deux verts au second passage sans aucune modification** — flakiness locale, le
second (timing sub-seconde) déjà documenté comme connu et vert en CI. Diff limité
aux 4 fichiers de code/tests prévus + 1 fragment changelog — confirmé par
`git status --short`. Revue `Explore` indépendante : **GO**, aucun défaut trouvé
(comportement HTTP inchangé, raisons mutuellement exclusives, metadata cohérente
avec la valeur réellement résolue, pas de donnée patient dans les logs).

## Ce qui reste ouvert — délibérément non fait ici

**Réconciliation `CAMPAGNE.md` (`lot_courant`, tableau des lots).** Le même
patron que LOT-00→LOT-01 : ce pointeur avance dans un geste **post-merge séparé**,
depuis `main`, via `node scripts/wn-campaign.mjs activate LOT-03` — pas dans la PR
du lot lui-même (c'est ce qui a dû être réparé après coup pour LOT-01, PR #577).
Ne pas le refaire ici évite le même oubli côté LOT-03 : **le geste explicite après
le merge de cette PR est d'exécuter cette commande depuis `main`.**

## Après le merge

1. `node scripts/wn-campaign.mjs activate LOT-03` depuis `main`.
2. `node scripts/wn-cycle.mjs --appliquer` depuis `main` (réconcilie
   `.wn/state.json`, notamment `git.branch`).
3. Prochain lot : LOT-03 — fermer `sum_decimal`, `count_threshold`, `ecab`.
