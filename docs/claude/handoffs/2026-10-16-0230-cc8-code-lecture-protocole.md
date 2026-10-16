# Handoff — CC-8, code du journal de lecture du protocole (D-315 amendée)

## Branche et état Git

- Branche `feat/cc8-journal-lecture-protocole-code`, worktree
  `.claude/worktrees/cc8-migration`, partie d'`origin/main` 28049522 (#1492).
- La copie principale est utilisée par une autre session : ne pas y faire
  de `switch`.

## Objectif

Code consommateur de J2-cc8, après la release-db constatée de #1490 :
enregistrer la première ouverture du détail de chaque version diffusée,
sous drapeau éteint jusqu'à ACT-1.

## Décisions prises

- Arbitrages du responsable du 2026-10-16, portés dans D-315 (amendement) :
  replié = titre, raison, axe ; détail = actions et critère ; libellé « Voir
  le détail de mon protocole » ; version lue dépliée d'office ; nouvelle
  diffusion repliée ; action en pause (D-281) ⇒ déplié d'office, sans trace.
- Désignation par la `cycleRef` reçue avec la vue ; le serveur résout la
  diffusion. Limite consignée (revue P1, A1) : la règle « servi » de la route
  du protocole n'est pas rejouée à l'écriture.
- Drapeau `WN_PORTAIL_LECTURE_PROTOCOLE`, éteint : accueil et routes
  inchangés, sauf un POST `protocole` qui rend 404 au lieu de 400.
- Écarté (revue R2) : « Jour difficile » garde son plan d'une action ferme
  quand le détail est replié (aucune action en attente ni en pause).

## Fichiers modifiés

- `web/src/lib/portail/lectureProtocole.ts` (neuf)
- `web/src/app/api/portail/lectures/route.ts` et son test
- `web/src/app/api/portail/protocole/route.ts` et son test
- `web/src/components/patient-companion/PatientCompanionHome.tsx` et son test
- `web/src/lib/portail/portailLecturesPatient.guard.test.ts` (APPEND_ONLY)
- `docs/DECISIONS.md` (D-315 amendée), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (porte 9, H60),
  `changelog.d/2026-10-16-cc8-lecture-protocole-code.md`

## Validations exécutées

- T1 et T3 complets verts avant la revue (5 min 33 s) ; rejoués après les
  corrections (voir la PR).
- `wn-reviewer` P1 : GO sous condition ; A1 et A2 traités par amendement,
  R1 (focus), R3 (commentaire), R6 (formulation) corrigés ; tests ajoutés
  (préfixe et empreinte complète refusés, drapeau `TRUE`/`1` fermé, trois
  pauses dépliées sans trace, focus).

## Problèmes ouverts

- ACT-1 (H70) : pose du drapeau, accusé des conditions, constat sur un
  premier vrai dossier par identifiant en conteneur (porte 18).
- PR #1488 (BP-12a, autre session) : sa release-db passe après, une à la fois.

## Prochaine action exacte

1. PR, `wn-attendre-ci` en fond, revue CodeRabbit sur la tête, verdicts.
2. Merge (`--match-head-commit`), déploiement constaté. Pas de release-db.
3. Puis ACT-1 sur demande du responsable.

## Interdits encore actifs

- Drapeau posé seulement avec ACT-1, sur ordre du responsable.
- Pas d'auto-merge ; pas d'écriture en base hors release-db.
