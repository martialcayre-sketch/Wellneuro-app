# Handoff — 2026-10-28 — J3-cabinet, PR 2 : le rejeu du cockpit et la fin de cycle sortent de leurs routes (D-385, H58)

## Branche et état du dépôt

- Branche `lot/j3-cabinet-pr2-rejeu-fin-cycle`, partie de `origin/main`
  (e57521c4, #1757) ; worktree `file-d1-suite`, session concurrente, cycle en
  `git`/`gh` direct. Aucune PR J3-cabinet n'était ouverte en tête de lot.
- Code seul : ni migration, ni drapeau, ni release-db, aucun fichier sous
  `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`.

## Objectif

PR 2 sur 3 de J3-cabinet (plan :
`docs/claude/propositions/2026-10-27-j3-cabinet-plan/README.md`, §3, §6, §7) :
sortir côté serveur le rejeu d'épisode du cockpit et la fin de cycle du
portail, à comportement constant, pour que le chargeur de la PR 3 rejoue un
dossier et compte sa fin de cycle par les mêmes chemins.

## Décisions prises

Pas de D-xxx neuve.
- **Arbitrage du responsable (2026-10-28)** : la garde
  `couverturesAdressageAppelants.guard.test.ts` est amendée, seul banc existant
  touché. La construction C1 de `rejouerChaine` a déménagé de la route vers
  `rejeuEpisodeCockpit.ts` ; le module entre dans `APPELANTS`, le total reste
  quatre, chacune passe ses couvertures.
- **Huit exports au lieu des quatre fonctions du plan** : `ancreCycleDepuis`
  et `suffixeEnveloppe` (le POST les partage) et le type `EntreesRuntime`
  (`repassationDepuisAncre`) suivent le bloc ; `PREFIXE_EPISODE`,
  `identiteActe` et `episodeRejouable` restent privés au module.
- `JOUR_MS` part avec `JOURS_FIN_DE_CYCLE` dans `finDeCycle.ts` (privé, comme
  dans les autres modules de `lib/protocol/`).

## Fichiers modifiés

- Nouveaux :
  - `web/src/lib/clinical-engine/rejeuEpisodeCockpit.ts` (bloc l.272-575 de
    l'ancienne route, transcrit à l'identique, `export` ajoutés) ;
  - `web/src/lib/clinical-engine/rejeuEpisodeCockpit.guard.test.ts` ;
  - `web/src/lib/protocol/finDeCycle.ts`, `finDeCycle.test.ts`.
- Modifiés :
  - `web/src/app/api/praticien/cockpit/route.ts` (imports seuls) ;
  - `web/src/app/api/portail/protocole/route.ts` (`estFinDeCycle(jourZero,
    new Date())`, même endroit d'évaluation) ;
  - `web/src/lib/clinical-engine/couverturesAdressageAppelants.guard.test.ts`.
- Clôture : `changelog.d/2026-10-28-j3-cabinet-pr2-rejeu-fin-cycle.md`,
  `docs/claude/plan-journal/H58/2026-10-28-01-j3-cabinet-pr-2.md` (bascule H90
  faite : fragment, pas d'édition de la fiche), ce handoff.

## Validations exécutées

- **Relevé du plan revérifié en tête de lot** : `portail/protocole/route.ts`
  l.159 et l.217 (au lieu de :144) ; `cockpit/route.ts` l.278, 360, 386, 527,
  546 — exacts.
- **Vitest complet** après extraction : 906 fichiers verts, un seul rouge, la
  garde C1 (deux tests), amendée ensuite sur arbitrage.
  `cockpit/route.test.ts` et `portail/protocole/route.test.ts` verts sans
  réécriture (dont les cas `finDeCycle`, l.286-307).
- `tsc --noEmit` et ESLint propres ; T1 (`check:rapide`) vert.
- T2 (`npm run test:worktree -- --fast`) : résultat dans la PR.
- **Revue `wn-reviewer` (P1), sur `diff`/`show`** : aucun P0 ni P1, verdict
  « go ». Transcription vérifiée ligne à ligne (huit lignes de différence, les
  huit `export`).
  - P2-1 corrigé : la garde « un seul rejeu » balaie tout `src/`, pas
    seulement la route ; une copie dans le futur chargeur rougirait.
  - P2-2 routé vers la PR 3 (voir ci-dessous).
  - P2-3 (handoff manquant) : ce fichier.

## Problèmes ouverts

- **Pour le chargeur de la PR 3 (P2-2 de la revue).**
  - Horloge : aucune fonction déplacée ne la lit, ni ses appelés directs ; le
    seul `new Date` est `new Date(asOf)`, une conversion. Leur « présent » est
    `asOf` absent, c'est-à-dire tout ce que la base porte.
  - Le chargeur ne peut PAS passer `maintenant` comme `asOf` :
    `resoudreAsOf` refuse toute date qui n'est pas un repère du patient
    (`lectureAsOf.ts`). Appeler avec `asOf` absent ; `maintenant` ne sert qu'à
    `estFinDeCycle`.
  - `loadRuntimeInputs` refait la lecture du patient filtrée par praticien,
    une par dossier : à compter dans le coût mesuré (§3 du plan).
  - `rejeuEpisodeCockpit.ts` importe `@/lib/prisma` : serveur seul, jamais
    importé par un composant `'use client'` (le chargeur et la route le sont).
- Routés de la PR 1, toujours ouverts : le câblage du cockpit
  (`preconditionsProposition`, carte de la fixture, `lusPourLaCarte`) au banc
  de parité ; l'élection du jalon.

## Prochaine action exacte

Dans une séance dédiée : la PR 3 de J3-cabinet — `lib/praticien/comptesCabinet.ts`
(qui importe `rejeuEpisodeCockpit` et `estFinDeCycle`), la route
`GET /api/praticien/comptes-cabinet`, la page `/dashboard/cabinet` et son
entrée de rail, les bancs du §5 (parité fiche ↔ page, « sous cinq » par
tableau). Le message d'attente de la page se propose mot pour mot.

## Interdits encore actifs

- Aucune migration sans accord (G-7, porte 9) ; aucun seuil, dose, poids ou
  borne inventé ; aucun texte d'écran inventé.
- Aucun fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`
  (déclencheurs de release-db, D-044, D-389 §5).
- Production en lecture seule, depuis un conteneur ; aucun identifiant de
  dossier dans le dépôt.
- Aucune liste de dossiers sur la page ; aucun journal d'accès par dossier.
- Un merge à la fois ; avant chaque merge, `wn-sonde-release-db.mjs` à `0`.
