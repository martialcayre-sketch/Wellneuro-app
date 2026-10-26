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
  chemin de release-db (`git log -1 --first-parent -- <chemins>`), lit les
  runs release-db créés depuis lui (API Actions, `created=>=`, toutes pages,
  marge d'une heure en UTC) et garde ceux de la plage [porteur, cible] : le
  run de son push et tout `workflow_dispatch` relancé sur une tête
  postérieure. `migrate deploy` appliquant tout ce qui attend, un run attesté
  sur ce commit ou un descendant atteste les migrations plus anciennes.
- Quatre états par run : appliquée (run vert, ou run rouge dont les étapes
  « Release en one-off (préflights + migrate deploy) » et « Vérification —
  migrate status sur conteneur » sont vertes — la garde anti-recul, échec
  volontaire après application) ; en attente ; échec avant application (le
  one-off n'a pas tourné) ; inconnu (le one-off a tourné sans attestation).
  Priorité : appliquée, puis en attente, inconnu, échec, aucun run visible.
  Les trois derniers avertissent ; aucun n'écrit. Les étapes se lisent par
  `actions/runs/<id>/jobs`, pour un run conclu non vert ou en attente sur un
  ancêtre.
- Revue `wn-reviewer` (constat moyen, corrigé) : un run en exécution sur un
  ancêtre qui a déjà lu la tête (étape de déclenchement conclue) ne livre
  pas un commit mergé après, et son run du déployeur, retenu au vert, ne
  repartait pas. Attente bornée de la fin du run (vingt minutes,
  `timeout-minutes` 50 → 70), puis nouveau jugement ; passé la borne,
  retenu et averti. Un run `waiting`/`queued`, ou qui porte la cible
  elle-même, n'attend pas.
- Écarté : lire les journaux du run (archive) plutôt que ses étapes ;
  borner la fenêtre aux cent derniers runs (une migration ancienne sans run
  visible serait retenue sans fin).
- Choix signalé au responsable (constat 5 de la revue) : un commit clinique
  (`web/src/lib/clinical/**`, D-044 §3) non approuvé retient ses descendants
  comme une migration, sinon un commit de code mergé au-dessus contournerait
  la porte humaine. Coût dans le cas D-374 §3 : l'approbation du run du
  commit clinique reste due avant que la tête ne reparte.
- `toucheReleaseDb` disparaît, absorbée par `dernierCommitReleaseDb` ; les
  trois lectures restent sans valeur par défaut (fail-closed). Le commit plus
  neuf livré par la branche (`livre-non-verifie`) passe par la même retenue.
- D-248 : paragraphe « Inchangé, et à connaître » retiré par ligne datée ;
  D-374 : « §1 livré » ; fiche H85 au plan (rang 1).

## Fichiers modifiés

- `scripts/wn-deploiement-deployer.mjs`, `scripts/wn-deploiement-deployer.test.mjs`.
- `.github/workflows/deploiement-production.yml` : commentaires et
  `timeout-minutes` du job `deploiement` 50 → 70.
- `docs/DECISIONS.md` (D-374, D-248), `docs/claude/PLAN_WELLNEURO.md` (H85),
  fragment de changelog, SESSION_LOG, ce handoff.

## Validations exécutées

- Banc du déployeur : 67 cas verts (54 avant le lot) ; bancs voisins
  (`release-db-comportement`, `wn-deploiement-observation`,
  `release-db-invariants`, `ci-invariants`) : 79 verts.
- Huit mutations, chacune attrapée : ancienne lecture, étapes ignorées,
  borne basse absente, attente lue avant appliquée, inconnu lu comme échec,
  boucle d'attente retirée, cible elle-même attendue, borne haute absente.
- API en lecture seule : le run rouge de l'incident du 2026-10-19 expose les
  deux étapes d'attestation en succès et la garde anti-recul en échec ;
  `created=>=` avec `--paginate --slurp` rend les seize runs depuis le
  19 octobre. La revue a rejoué le classement sur les onze derniers runs
  rouges ou annulés : huit « appliquée », trois « échec ».
- Revue `wn-reviewer` : aucun bloquant ; constats 1 à 4 corrigés, 5 signalé,
  6 noté ci-dessous. `check_no_secrets`, numérotation, contrôle de clôture :
  verts.

## Problèmes ouverts

- Non rejoué en production : la retenue d'une tête de code au-dessus d'une
  migration en attente, l'attente d'un run en exécution, le run relancé en
  `workflow_dispatch` ; tenus par le banc.
- La fenêtre de runs dépend de la date du commit porteur (UTC, marge d'une
  heure) : un historique réécrit ou un commit daté dans le futur de plus
  d'une heure la fausserait (« aucun run visible », retenu) — exclu sur
  `main`, datée par GitHub au merge.
- La retenue clinique étendue aux descendants attend la confirmation du
  responsable ; la restreindre aux migrations est une ligne de
  `CHEMINS_RELEASE_DB`, tenue par le banc de parité.
- Le gel par phases attend la sonde de `wn-merge` (D-374 §4) et la
  réécriture du piège 2 de `pr-revue-et-release-db.md` §5, lot distinct.

## Prochaine action exacte

CI (`wn-attendre-ci`), revue CodeRabbit sur la tête, merge hors run
release-db en vol (gel intégral), déploiement constaté par le run du
déployeur. Puis, sans outillage : D-373 §1 dans `CLAUDE.md` et la ligne de
journal du crochet (D-375 §1) ; ensuite la sonde par phases (D-374 §4,
fiche à poser), qui fait entrer le gel par phases en vigueur.

## Interdits encore actifs

- Production en lecture seule par conteneur ; écriture par migration relue
  et release-db approuvée, une à la fois ; aucun merge tant qu'un run
  release-db n'est pas conclu (gel intégral, D-374 §5) ; pas de merge sans
  revue CodeRabbit sur la tête ; pas de pull, merge ni rebase sans
  arbitrage ; jamais `prisma format` ; aucune écriture Scalingo hors
  `integration-link-manual-deploy main` dans le seul déployeur ; aucun
  identifiant de dossier accompagné d'un constat ; aucun lien vers le
  dossier privé dans le dépôt.
