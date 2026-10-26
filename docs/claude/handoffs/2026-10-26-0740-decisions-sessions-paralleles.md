# Handoff — 2026-10-26 — Quatre files en parallèle : six décisions (D-370 à D-375)

## Branche et état du dépôt

- Branche `docs/decisions-sessions-paralleles`, worktree `wt-audit`, partie
  de `origin/main` (6bcd57ba). PR de documentation seule : aucun code, aucune
  migration, aucun `schema.prisma`, aucun drapeau.

## Objectif

Écrire au registre les arbitrages du responsable des 25 et 26 octobre 2026 sur le
travail en parallèle de quatre sessions (neuf questions à options), après la
contre-revue du dossier d'audit ; le dossier lui-même reste hors dépôt.

## Décisions prises

- Neuf réponses du responsable, par questions à options : (1) réservation du
  numéro à la rédaction, trou réservé toléré ; (2) mises à jour du plan en
  fragments, contre la recommandation ; (3) clôture par le handoff seul ;
  (4) intégrateur unique, contre la recommandation ; (5) gel écrit et
  correctif du déployeur ; (6) contrôle local avant merge, aucun check requis
  de plus ; (7) liste commune de questions et guichet, sans horaire fixe —
  consigne, sans décision ; (8) journal du crochet de fraîcheur, puis
  tolérance ; (9) gel par phases, tranché le 2026-10-26.
- Six décisions écrites, D-370 à D-375, numéros pris sur `main` (dernier :
  D-369). Deux PR ouvertes prennent les mêmes numéros : #1704 (D-370) et
  #1709 (D-370 à D-372). La dernière à merger renumérote, le garde refusant
  doublon et trou ; il faut alors reprendre les renvois croisés [[D-370]] à
  [[D-374]], les trois lignes du plan, le fragment, le journal et ce handoff.
- D-374 rouvre, en le disant, la question D-087 routée par l'arbitrage n° 2
  de D-248 : le départ du code au-dessus d'une migration en attente y était
  décrit et gardé ; le responsable a choisi de le retenir (Q5).
- D-373 devance le lot 4 de D-248 pour la seule discipline « un merge à la
  fois » du code ordinaire ; la garde anti-recul reste.
- Choix de rédaction, à confirmer par le responsable : le délai de prise en
  charge de l'intégrateur est fixé à cinq minutes (le p95 visé) ; la date
  d'adoption reste sur la ligne « Date » de chaque décision, pas dans le
  titre.
- Les fiches de plan des six lots d'outillage ne sont pas créées ici : elles
  se posent à l'ouverture de chaque lot.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-370 à D-375 en tête de la section active.
- `docs/claude/PLAN_WELLNEURO.md` : mises à jour datées sous H23, §5 « Ce qui
  ne s'accélère jamais » et §10.
- `changelog.d/2026-10-26-decisions-sessions-paralleles.md`, SESSION_LOG, ce
  handoff.

## Validations exécutées

- `node scripts/lib/decisions-numerotation.mjs` (garde du registre) et
  `bash scripts/check_no_secrets.sh` ; contre-lecture des six textes par
  treize agents (références au dépôt et à GitHub, fidélité aux arbitrages,
  forme publique, critique transversale du diff) : 38 constats appliqués,
  dont un de fond (D-248 arbitrage n° 2) ; voir le corps de la PR.

## Problèmes ouverts

- D-374 §1 : le comportement du déployeur est lu dans le code et décrit par
  D-248, pas rejoué ; le banc le rejoue avant le correctif.
- Le gel par phases n'entre en vigueur qu'avec le correctif du déployeur et
  la sonde par phases ; gel intégral jusque-là (D-374 §5).
- Les trois essais (intégrateur, contrôle avant merge, journal du plan) ont
  chacun leur mesure et leur seuil de repli, à tenir.

## Prochaine action exacte

Étape 1 : banc « migration portée par un ancêtre, tête de code verte » dans
`scripts/wn-deploiement-deployer.test.mjs`, puis correctif de `retenue()` à
quatre états, revue `wn-reviewer`. En parallèle, sans outillage : dans
`CLAUDE.md`, les exceptions au `/clear` après le merge (migration,
authentification, `.coderabbit.yaml`) et la fin de l'attente du CI de `main`
et du déploiement (D-373 §1) ; ligne de journal du crochet (D-375 §1) ;
mesure de référence en lecture seule. Puis le lot de clôture (D-372) avant
l'intégrateur (D-373).

## Interdits encore actifs

- Production en lecture seule par conteneur ; écriture par migration relue et
  release-db approuvée, une à la fois ; pas de merge sans revue CodeRabbit
  sur la tête ; aucun merge tant qu'un run release-db n'est pas conclu (gel
  intégral jusqu'à la livraison du correctif du déployeur et de la sonde par
  phases, D-374 §5) ; pas de pull, merge ni rebase sans arbitrage ; jamais
  `prisma format` ; aucun identifiant de dossier accompagné d'un constat ;
  aucun lien vers le dossier privé dans le dépôt.
