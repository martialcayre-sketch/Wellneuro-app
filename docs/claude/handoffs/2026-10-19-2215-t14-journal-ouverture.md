# Handoff — t14 : « affiché à partir d'aujourd'hui » au journal patient

## Branche et état du dépôt

- Branche `lot/t14-journal-ouverture`, partie de `origin/main` d867b290.
  Worktree `file-d1-suite`.

## Objectif

Dette t14 (plan §8, LOT-06 de la vie du portail) : à l'ouverture d'une
surface fermée, « Mes échanges » faisait paraître des faits anciens sans
ligne « révélé aujourd'hui ».

## Décisions prises

- Arbitrage 7 du responsable (2026-10-19) : le jour d'ouverture se pose AVEC
  le drapeau, réglage daté, sans base ni migration, ajouté à la procédure
  d'allumage.
- Convention `<DRAPEAU>_OUVERT_LE=AAAA-MM-JJ` (jour de Paris), lue par
  `ouverturesMesEchanges` pour les seules espèces remises sous un drapeau
  propre : fiches d'assiette, courrier pour le médecin. Ce que le patient
  transmet ne peut pas précéder sa surface.
- L'élément reste à son jour ; une mention s'ajoute sous la ligne :
  « Affiché à partir d'aujourd'hui » le jour même, « Affiché à partir du … »
  ensuite (mots de l'arbitrage).
- Constat au démarrage : tous les drapeaux lus par le journal sont déjà
  allumés en production, `WN_PORTAIL_MES_ECHANGES` compris (2026-10-18).
  Aucune variable `_OUVERT_LE` posée : le mécanisme sert les ouvertures à
  venir. Poser rétroactivement le jour des fiches ou du courrier serait un
  geste de production non demandé.

## Fichiers modifiés

- `web/src/lib/portail/mesEchanges.ts` (+ test) : `afficheDepuis`,
  `jourOuverture`, `libelleAfficheDepuis`.
- `web/src/lib/portail/mesEchangesDrapeau.ts` : `ouverturesMesEchanges`.
- `web/src/app/api/portail/echanges/route.ts` (+ test).
- `web/src/components/patient/mes-echanges/MesEchangesJournal.tsx` (+ test).
- `docs/FEATURE_FLAGS.md` (procédure d'allumage, § B), changelog, SESSION_LOG.

## Validations exécutées

- Vitest ciblé (domaine, route, composant) : 37/37.
- T1 complet et T2 : voir la PR.

## Problèmes ouverts

- Ligne t14 du plan (§8) non soldée ici : `PLAN_WELLNEURO.md` est touché par
  des PR ouvertes d'autres sessions (#1580, #1581) ; à solder dans une PR de
  doc après elles.
- t15 est porté par #1580 et le reste de t11 par #1584 (mergée), tous deux
  d'une autre session.

## Prochaine action exacte

PR, CI, CodeRabbit sur la tête, merge, déploiement constaté ; t14 → fait sur
la page de suivi de la file A.

## Interdits encore actifs

- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
- Ne pas toucher aux fichiers des PR ouvertes d'autres sessions.
