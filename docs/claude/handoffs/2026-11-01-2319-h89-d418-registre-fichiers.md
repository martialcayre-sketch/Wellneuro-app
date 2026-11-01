# Handoff — 2026-11-01 — H89 : D-418, le registre des décisions en un fichier par décision

## Branche et état du dépôt

- Branche `docs/d418-registre-un-fichier-par-decision`, worktree
  `.claude/worktrees/h89-integrateur-a`, partie de `origin/main` f22cbc73
  (#1812 mergée).
- Texte seul :
  - la décision D-418 ;
  - une ligne au plan, dans la table des dettes et des écarts ;
  - un fragment de changelog, un fragment du journal de H89 et ce handoff.
- Ni code, ni migration.

## Objectif

Écrire la décision qui fait passer le registre des décisions à un fichier
par décision. Le responsable en a retenu le principe le 2026-11-01, après
trois renvois pour conflit sur `docs/DECISIONS.md` dans la journée.

## Décisions prises

- D-418, réservée par `wn-reserver-decision.mjs` :
  - `docs/decisions/D-NNN.md`, nommé par le seul numéro ;
  - amendements dans le fichier de la décision amendée ;
  - migration des 414 entrées en une fois, avec un banc de découpage ;
  - `docs/DECISIONS.md` en page fixe, lecture d'ensemble par une commande ;
  - outillage adapté dans la même PR (§5) ;
  - bascule après l'essai de D-373, quand aucune PR ouverte ne touche le
    registre (§6).
- Écartés, avec leur motif dans la décision :
  - le nom de fichier avec intitulé ;
  - la migration progressive ;
  - l'index généré et versionné ;
  - la suppression du fichier ;
  - `merge=union`, déjà proscrit par `.gitattributes` pour ce fichier ;
  - la résolution des conflits par l'intégrateur.
- La forme des §1 à §6 est de l'intégrateur. Le responsable la relit à la
  revue.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-418 ajoutée en tête de la section active).
- `docs/claude/PLAN_WELLNEURO.md` (une ligne dans la table des dettes et
  des écarts).
- `changelog.d/2026-11-01-d418-registre-un-fichier-par-decision.md` (créé).
- `docs/claude/plan-journal/H89/2026-11-01-02-registre-un-fichier-par-decision.md`
  (créé).
- Ce handoff (créé).

## Validations exécutées

- `node scripts/lib/decisions-numerotation.mjs` : OK, 416 décisions. Il
  avertit de deux trous en vol, D-406 (#1809) et D-416 (#1816), tous deux
  réservés.
- Inventaire des consommateurs du registre, en lecture seule, par un agent
  `Explore` : il fonde le §5.
- `npm run check` et l'anti-secrets avant le commit.

## Problèmes ouverts

- La réservation des numéros `WN-SRC` (§7) n'est pas arbitrée.
- #1809 (D-406) et #1816 (D-416) sont ouvertes et touchent le registre.
  Si l'une est mergée avant cette PR, un conflit d'en-tête est probable :
  la règle actuelle s'applique jusqu'à la bascule.
- L'essai de D-373 compte 30 PR sur 30. Il reste les jours actifs 6 et 7.

## Prochaine action exacte

L'intégrateur merge cette PR selon le même cycle : revue de la tête,
`verify`, étapes 7 bis et 7 ter. Le lot de bascule est pris par la file A
après l'essai.

## Interdits encore actifs

- Dépôt public : aucun lien d'artefact, aucun coût, aucune identité réelle.
- Aucun checkout ni switch dans le worktree d'une autre session.
- Aucun auto-merge, aucun `/model` pendant l'essai.
- La clôture de la semaine de journal de H86 et le temps 2 de H91 ne
  commencent pas avant le 2026-11-03.
