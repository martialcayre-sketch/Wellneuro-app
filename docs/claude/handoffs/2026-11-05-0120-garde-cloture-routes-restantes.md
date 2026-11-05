# Handoff — 2026-11-05 — La fiche, le journal et les rendez-vous de suivi refusent un dossier clos

## Branche et état Git
- Branche `feat/garde-cloture-routes-restantes`, partie d'`origin/main@3550e6db`, worktree `.claude/worktrees/garde-cloture-routes-restantes`.
- Une PR, en squash. **La session ne merge pas sans autorisation du responsable** : ce lot n'entre pas dans la série rails et menus.

## Objectif
Solder les quatre points laissés ouverts par #1859 (option A du 2026-11-04) : trois routes d'écriture classées « ouvertes, non tranché », et le texte praticien montré au patient par `physio-traitements`.

## Décisions prises
- Arbitrage du responsable du 2026-11-05, dans la session de #1859 :
  - `portail/fiche` (POST) : fermé ;
  - `portail/ja/observations` : POST fermé, GET ouvert ;
  - `portail/protocole/checkin` : POST fermé, GET ouvert ;
  - `physio-traitements` : texte patient « Votre suivi est clôturé : vous ne pouvez plus modifier vos traitements. »
- Un message par geste, sans chiffre (D-333), à côté de `MESSAGE_DOSSIER_CLOS_PATIENT` dans `lib/patient/cycleDeVie.ts` : `…_FICHE`, `…_JOURNAL`, `…_CHECKIN`. Seul le texte physio a été validé mot à mot par le responsable ; les trois autres suivent la même forme.
- `refusClotureSuiviPour` prend un `error` optionnel, dont la valeur par défaut est le message questionnaire. Il est utilisé par le journal et le check-in.
- `fiche` passe par `accepteNouvelEnvoi(patient)` sur la ligne complète que rend `resolvePortailPatientFromSession`, comme `valider`. La route n'a pas de garde d'âge.
- `physio-traitements` : la clé `dossier_cloture` entre dans `MESSAGES_REFUS_PATIENT`. Les deux refus, avant la transaction et sous le verrou, la lisent. `MESSAGE_DOSSIER_CLOS` n'est plus importé par la route.

## Fichiers modifiés
- `web/src/lib/patient/cycleDeVie.ts`, `web/src/lib/patient/gardeClotureServeur.ts`, `web/src/lib/physio-traitements/messages.ts`.
- Routes : `api/portail/fiche`, `api/portail/ja/observations`, `api/portail/protocole/checkin`, `api/portail/physio-traitements`.
- Bancs : `fiche/route.test.ts` (neuf), `ja/observations`, `protocole/checkin` et `physio-traitements` (`route.test.ts`). Chaque banc couvre trois cas : clos → 409 sans écriture ; GET ouvert ; reprise → acceptée. Le texte patient est vérifié mot à mot.
- Banc sentinelle `lib/patient/gardeCloture.routes.guard.test.ts` : les trois routes passent dans `FERMEES` et ce banc ne compte plus aucune route « non tranchée ». Le contrôle des GET ouverts couvre le journal et le check-in. Sa découpe ne dépend plus de l'ordre GET/POST, car dans `checkin` le POST vient d'abord et l'ancienne découpe rendait une chaîne vide.
- `changelog.d/2026-11-05-garde-cloture-routes-restantes.md`.

## Validations exécutées
- Falsifications, toutes rouges puis restaurées :
  - garde neutralisée dans `fiche`, `ja/observations` et `checkin` : 2 rouges chacune ;
  - clé `dossier_cloture` retirée de `MESSAGES_REFUS_PATIENT` : 2 rouges ;
  - `portail/fiche` retiré de `FERMEES` : 1 rouge ;
  - garde glissée dans le GET de `checkin` : 1 rouge, sur la sentinelle.
- T1 (`npm run check`) : vert.
- T2 (`npm run test:worktree -- --fast`) : vert en 7 min 35 s, avec Vitest 16 146 passés et E2E 331 passés.
- Piège d'environnement : un worktree neuf a un `web/node_modules` vide. Vitest remonte alors silencieusement au `node_modules` de la copie principale, qui est en retard. Avant T1, lancer `npm ci` puis `npx prisma generate`.

## Problèmes ouverts
- Aucun sur ce périmètre.
- Le rouge local de parité `BANCS_BALAYAGE` (D-437), signalé par #1859, n'est pas réapparu : T1 est vert.

## Prochaine action exacte
Lire la revue de bot sur la tête, rendre un verdict à chaque remarque, puis faire merger la PR par le responsable, ou l'assistant sur son autorisation.

## Interdits encore actifs
- Ne toucher ni au menu « Autres espaces » ni à `/api/portail/session`.
- Pas de migration.
- Aucun chiffre sur une surface patient (D-333).
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
