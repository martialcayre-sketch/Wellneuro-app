# Handoff — 2026-11-08 — t63 : la génération et la rédaction de synthèse refusent un dossier fermé

## Branche et état Git
- Branche `fix/t63-synthese-garde-cloture`, worktree `.claude/worktrees/a-t63-synthese-garde-cloture`, partie d'`origin/main`, avancée en `--ff-only` sur `25f3cb9a` (aucun commit propre à ce moment, aucun recouvrement avec #1925 ni #1934).
- Une PR, en squash. Consigne du responsable : s'arrêter à « prête @<sha> ».
- Fait neuf de la soirée : l'intégrateur est replié (`D-454` §3, fragment H89 `2026-11-08-02`). La consigne d'arrêt a été donnée avant ; la question du merge est posée au responsable.

## Objectif
Dette t63, file A, §8 du plan : appliquer l'arbitrage d61 (question close `20261105-0938-d`, 2026-11-06), qui refuse `POST` et `PUT` de `api/praticien/synthese` quand le suivi est clos, par symétrie avec #1873.

## Décisions prises
- Aucune `D-xxx` : pas de règle clinique, l'arbitrage suffit. Questions `20261108-2258-a`, `2259-a`, `2300-a` de la liste commune, répondues le 2026-11-08 :
  - `PATCH` reste ouvert sur ses cinq actions, son motif est écrit au banc ;
  - le dossier désactivé non clos est refusé aussi, à son propre message, avant tout envoi au modèle ;
  - texte validé mot pour mot : « Le suivi de ce dossier est clôturé : aucune synthèse ne peut être générée ni rédigée. Rouvrez le suivi pour reprendre. »
- `accepteNouvelEnvoi` et `refusDossierFerme` sur la ligne déjà lue, et non `refusClotureSuiviPour`, qui relit le dossier et dirait « clos » à un dossier désactivé.
- Ordre : session, appartenance (404, anti-oracle), garde (409 JSON), puis assemblage de la matière, modèle, flux SSE ou écriture.

## Fichiers modifiés
- `web/src/app/api/praticien/synthese/route.ts` : garde de `POST` et `PUT`, fonction locale `refusCreationSynthese`.
- `web/src/lib/patient/cycleDeVie.ts` : `MESSAGE_DOSSIER_CLOS_SYNTHESE`.
- `web/src/components/SynthesePanel.tsx` : commentaire seul (409 parmi les refus JSON).
- Bancs : `route.post.test.ts`, `route.manual.test.ts`, `SynthesePanel.test.tsx`, `lib/patient/gardeCloture.routes.guard.test.ts` (classement par méthode) ; `actif` et `suiviClotureLe` ajoutés aux fixtures de patient de `orientation.restitution`, `passationCourante`, `schemaStrictRelance`, `traceIdReponse.guard`.
- `docs/claude/PLAN_WELLNEURO.md`, §8 : t63 soldée, trois lignes routées depuis la revue.
- `changelog.d/2026-11-08-synthese-garde-cloture.md`.

## Validations exécutées
- Huit falsifications, toutes rouges puis restaurées, rejouées après correction du banc : garde retirée de `POST` ; de `PUT` ; garde de `POST` après `preparerGeneration` ; garde de `PUT` après la création ; désactivé annoncé comme clos ; dossier clos seul ; garde ajoutée à `PATCH` ; texte modifié.
- T2 (`npm run test:worktree -- --fast`) vert en 10 min 24 s, Vitest 16 463 passés, E2E 357 passés, joué AVANT les corrections de revue et l'avance sur #1925. Ces corrections ne touchent que des bancs, des commentaires et de la documentation ; le CI rejoue l'ensemble.
- T1 (`npm run check`) vert avant le commit.
- Production, lecture seule par conteneur, agrégats du 2026-11-08 : aucun dossier clos, quatre désactivés non clos, aucune synthèse sur l'un d'eux. Le lot n'a donc aucun effet immédiat ; aucun refus n'a été observé sur un parcours réel.
- Revue `wn-reviewer` : aucun constat bloquant. M1 (motif de `PATCH` inexact sur `effacer`) corrigé ; F1, F2 (trous du banc) corrigés ; F4 (limite trop étroite) corrigé ; F3 écarté, la route ne lisant pas le dossier en `PATCH`, l'état de la ligne ne change rien à l'ouverture ; F5 (écran) routé au §8 ; message du livret sur dossier désactivé routé au §8 ; test d'affichage du refus ajouté.

## Problèmes ouverts
- Vider puis réécrire et valider une synthèse jamais remise reste possible sur un dossier fermé : c'est dans l'arbitrage de `PATCH`, la remise restant refusée. Signalé au responsable.
- Trois lignes neuves au §8 : course avec la clôture (après H95 part A), message de remise sur dossier désactivé, écran sans l'état du dossier.

## Prochaine action exacte
Lire les revues sur la tête, rendre un verdict à chaque commentaire, déclarer « prête @<sha> » et passer `t63` à « fait » sur la page de la file A au merge.

## Interdits encore actifs
- Ne toucher ni au prompt ni au contenu de la synthèse, ni à `web/src/lib/synthese/` : r5_07 (H95 part A) y travaille. En cas de conflit sur `route.ts`, le signaler au responsable sans le résoudre seul.
- Pas de migration, pas de règle clinique.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
