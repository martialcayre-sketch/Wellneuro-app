# Handoff — 2026-10-26 — Déployeur : la tête retenue jusqu'à l'application attestée (D-374 §1)

## Branche et état du dépôt

- Branche `fix/deployeur-retenue-migration-ancetre`, worktree `wt-audit`,
  partie de `origin/main` (d645bfd8). Session concurrente, cycle en
  `git`/`gh` direct. Code d'outillage de production (le déployeur) ; aucune
  migration, aucun `schema.prisma`, aucun chemin clinique, aucun drapeau.

## Objectif

Étape 1 de la séquence « Quatre files en parallèle » (D-370 à D-375) : le
banc qui rejoue « migration portée par un ancêtre, tête de code verte » —
le comportement que D-248 (arbitrage n° 2) décrivait et gardait —, puis
`retenue()` à quatre états (D-374 §1). Préalable du gel par phases ; le gel
reste intégral jusqu'à la sonde (D-374 §4 et §5).

## Décisions prises

- La retenue part du DERNIER commit de la ligne de la cible qui touche un
  chemin de release-db (`git log -1 --first-parent -- <chemins>`), et lit
  les runs release-db créés depuis lui (API Actions, `created=>=`, toutes
  pages, marge d'une heure en UTC), gardés s'ils sont sur sa ligne jusqu'à
  la cible : le run de son push, et tout `workflow_dispatch` relancé sur
  une tête postérieure. `migrate deploy` appliquant tout ce qui attend, un
  run attesté sur ce commit ou sur un descendant atteste aussi les
  migrations plus anciennes ; un run antérieur au commit porteur n'atteste
  rien.
- Quatre états par run : appliquée (run vert, ou run rouge dont les étapes
  « Release en one-off (préflights + migrate deploy) » et « Vérification —
  migrate status sur conteneur » sont vertes — la garde anti-recul, échec
  volontaire après application) ; en attente (run non conclu) ; échec avant
  application (le one-off n'a pas tourné : rejet, garde, build) ; inconnu
  (le one-off a tourné sans attestation complète). Priorité : appliquée,
  puis en attente, inconnu, échec, aucun run visible. Les trois derniers
  avertissent ; aucun n'écrit. Les étapes se lisent par
  `actions/runs/<id>/jobs`, seulement pour un run conclu non vert.
- Écarté : lire les journaux du run (archive, plus lourde, même
  permission) ; borner la fenêtre aux cent derniers runs (une migration
  ancienne sans run visible serait retenue sans fin).
- Le commit plus neuf livré par la branche (`livre-non-verifie`) passe par
  la même retenue. La relecture juste avant l'écriture (revue #1222) est
  gardée, défensive ; une lecture en échec propage sans écriture.
- `toucheReleaseDb` disparaît, absorbée par `dernierCommitReleaseDb` ; les
  trois lectures restent sans valeur par défaut (fail-closed).
- Revue `wn-reviewer` (constat moyen, corrigé) : un run en exécution sur un
  ancêtre qui a déjà lu la tête (étape de déclenchement conclue) ne livre
  pas un commit mergé après, et le run du déployeur de ce commit, retenu au
  vert, ne repartait pas. Le déployeur attend désormais la fin du run (borne
  de vingt minutes, `timeout-minutes` du job 50 → 70), puis rejuge ; passé
  la borne, retenu et averti (« relancer le déployeur, action=deployer »).
  Un run `waiting`/`queued`, ou qui porte la cible elle-même, n'attend pas.
- Choix signalé au responsable (constat 5 de la revue) : `CHEMINS_RELEASE_DB`
  garde `web/src/lib/clinical/**` — un commit clinique non approuvé retient
  ses descendants, comme une migration (sinon un commit de code mergé
  au-dessus contournerait la porte humaine de D-044 §3). Coût dans le cas
  D-374 §3 : l'approbation du run du commit clinique reste due avant que la
  tête ne reparte, même si un ancien run a déjà déployé la tête.
- D-248 : le paragraphe « Inchangé, et à connaître » est retiré par ligne
  datée ; D-374 : statut « §1 livré » ; fiche H85 au plan (rang 1) ;
  commentaires de `deploiement-production.yml` mis à jour, sans changement
  de comportement (le banc d'invariants lit le workflow sans ses
  commentaires).

## Fichiers modifiés

- `scripts/wn-deploiement-deployer.mjs` (noyau `retenue()`,
  `classerRunReleaseDb`, `ETAPES_ATTESTATION`, câblage CLI, titre du
  résumé) ; `scripts/wn-deploiement-deployer.test.mjs` (cas D-374 §1, cas
  du lot 3 adaptés, invariants du câblage et de l'API mis à jour, parité
  des étapes avec `release-db.yml`).
- `.github/workflows/deploiement-production.yml` : commentaires, et
  `timeout-minutes` du job `deploiement` 50 → 70 (trois attentes bornées).
- `docs/DECISIONS.md` (D-374 statut, D-248 ligne datée),
  `docs/claude/PLAN_WELLNEURO.md` (H85), fragment de changelog, SESSION_LOG,
  ce handoff.

## Validations exécutées

- `node --test scripts/wn-deploiement-deployer.test.mjs` : 67 cas verts
  (54 avant le lot) ; bancs voisins (`release-db-comportement`,
  `wn-deploiement-observation`, `release-db-invariants`, `ci-invariants`) :
  79 verts.
- Huit mutations du correctif, chacune attrapée par le banc : ancienne
  lecture (le seul commit cible), étapes ignorées, borne basse absente,
  attente lue avant appliquée, inconnu lu comme échec, boucle d'attente
  retirée, cible elle-même attendue, borne haute absente.
- Par l'API, en lecture seule : le run release-db de l'incident du
  2026-10-19 (rouge) expose les deux étapes d'attestation en succès et la
  garde anti-recul en échec ; le filtre `created=>=` avec
  `--paginate --slurp` rend les seize runs depuis le 19 octobre, en une page.
  La revue a rejoué `classerRunReleaseDb` sur les étapes réelles des onze
  derniers runs rouges ou annulés : huit « appliquée » (garde anti-recul),
  trois « échec » (rejet, annulation, garde « dernier déployé »).
- Revue `wn-reviewer` sur 8d07a8d3 : aucun bloquant ; un constat moyen et
  trois trous de banc corrigés (ci-dessus), un choix signalé, une note (la
  date du commit porteur, ci-dessous). `check_no_secrets`, numérotation des
  décisions, contrôle de clôture : verts (voir le corps de la PR).

## Problèmes ouverts

- Non rejoué en production : la retenue d'une tête de code au-dessus d'une
  migration en attente, et la lecture d'un run relancé en `workflow_dispatch`
  sur une tête postérieure ; tenus par le banc. Le premier déploiement après
  le merge constate le chemin nominal.
- La fenêtre de runs dépend de l'horodatage du commit porteur (UTC, marge
  d'une heure) : un historique réécrit, ou un commit daté dans le futur de
  plus d'une heure, la fausserait (« aucun run visible », retenu) — exclu
  sur `main`, datée par GitHub au merge.
- La retenue d'un commit clinique étendue à ses descendants (choix
  ci-dessus) attend la confirmation du responsable ; la restreindre aux
  seules migrations est une ligne de `CHEMINS_RELEASE_DB`, tenue par le banc
  de parité avec `release-db.yml`.
- Le gel par phases attend la sonde de `wn-merge` (D-374 §4) et la
  réécriture du piège 2 de `pr-revue-et-release-db.md` §5, lot distinct.

## Prochaine action exacte

Revue `wn-reviewer` sur le diff, CI (`wn-attendre-ci`), revue CodeRabbit
sur la tête, merge hors run release-db en vol (gel intégral), déploiement
constaté par le run du déployeur. Puis, sans outillage : D-373 §1 dans
`CLAUDE.md` et la ligne de journal du crochet (D-375 §1) ; ensuite la sonde
par phases (D-374 §4, fiche à poser), qui fait entrer le gel par phases en
vigueur.

## Interdits encore actifs

- Production en lecture seule par conteneur ; écriture par migration relue
  et release-db approuvée, une à la fois ; aucun merge tant qu'un run
  release-db n'est pas conclu (gel intégral, D-374 §5) ; pas de merge sans
  revue CodeRabbit sur la tête ; pas de pull, merge ni rebase sans
  arbitrage ; jamais `prisma format` ; aucune écriture Scalingo hors
  `integration-link-manual-deploy main` dans le seul déployeur ; aucun
  identifiant de dossier accompagné d'un constat ; aucun lien vers le
  dossier privé dans le dépôt.
