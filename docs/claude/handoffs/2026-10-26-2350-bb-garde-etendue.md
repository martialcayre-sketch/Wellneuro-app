# Handoff — 2026-10-26 — File C : bb, lot 1 — garde étendue aux plans idéal et de secours (D-384 §5, D-386, H49)

## Branche et état du dépôt

- Branche `lot/bb-garde-etendue`, partie de `origin/main` (58bb608d, #1722) ;
  worktree `act5-mineurs`, session concurrente, cycle en `git`/`gh` direct.
- Ni migration, ni drapeau, ni release-db.

## Objectif

Suite de la file C. Place 7 en attente de sa fenêtre (du 2026-11-01 au
2026-11-07) ; ba faite (#1714, #1722). bb n'avait plus de préalable texte :
son lot de code commence par la garde étendue de D-384 §5.

## Décisions prises

- D-386, arbitrage du responsable sur question à options : une version sert
  ses trois plans si elle a été créée après la mise en service constatée de la
  garde étendue. La marque est la colonne `created_at` de la ligne, posée à
  l'insertion (chaque version est une ligne neuve ; la date du contenu, elle,
  est héritée et n'est pas lue). Écartés : garde rejouée à la lecture,
  marque dans le contenu, confirmation persistée.
- Lot 1 : la route d'enregistrement d'une version passe le plan idéal et le
  plan de secours de chaque action sous `termeAnxiogene`, même régime que le
  plan minimal. Le jeton change pour toute version neuve (les textes gardés
  sont plus nombreux) : une confirmation en vol re-refuse une fois.

## Fichiers modifiés

- `web/src/app/api/praticien/protocoles/versions/route.ts` et `route.test.ts`
- `web/src/lib/documents/vocabulaire.ts` (carte des gardes, commentaire)
- `docs/DECISIONS.md` (D-386), `docs/claude/PLAN_WELLNEURO.md` (H49),
  `changelog.d/2026-10-26-bb-garde-etendue.md`, `docs/claude/SESSION_LOG.md`,
  ce handoff.

## Validations exécutées

- Bancs ciblés (route des versions, garde de refus atteignable,
  `lib/documents`) : 167 tests verts.
- T1 (`check:rapide`) vert ; T2 en cours au moment de ce handoff.
- Fixtures E2E qui portent des plans idéal et de secours : textes neutres.

## Problèmes ouverts

- Lot 2 : lecture des trois plans dans le détail (D-384 §2-§3) et « Jour
  difficile ? » (§4), sous drapeau éteint, avec l'instant de mise en service
  constaté de ce lot ; nom du drapeau et forme visuelle à fixer.
- Place 7 (ak) dans sa fenêtre ; un second dossier de test attend sa
  réapprobation (D-359 §3).

## Prochaine action exacte

T2 vert, PR, CI, revue CodeRabbit de la tête ; sonder les runs `release-db`
non conclus (D-374 §5) ; merge `--match-head-commit` ; déploiement constaté
sur Scalingo, instant relevé pour le lot 2.

## Interdits encore actifs

- Aucune migration ; aucun texte patient, seuil ou fenêtre inventés.
- Production lue par identifiant, depuis un conteneur seulement ; dans le
  dépôt, « un dossier de test », jamais son identifiant avec des mesures.
- Aucun lien d'artefact dans le dépôt.
- Rien sur la place 7 avant l'ouverture de sa fenêtre ; rien de bb servi au
  patient avant son activation (porte 18).
