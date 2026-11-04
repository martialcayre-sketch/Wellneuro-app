# Handoff — 2026-11-04 — Portail patient : un dossier clos ne se voit plus proposer de questionnaire à compléter

## Branche et état Git
- Branche `fix/portail-clos-majeur-parcours`, partie d'`origin/main@1cb4b642`, worktree `.claude/worktrees/fix-portail-clos-majeur-parcours`.
- Une PR, squash. **Pas de merge par la session** : ce lot n'est pas couvert par l'autorisation de la série rails et menus.

## Objectif
Corriger le constat incident de L1 (#1840) : sur le portail, un dossier clos (`suiviClotureLe` posé) d'un patient majeur affichait encore des questionnaires « à commencer » dans « Mon parcours » du hub.

## Diagnostic
- Hub `questionnaires/page.tsx` : `statutServi` force un dossier clos en « majeur ». C'est voulu : la sentinelle `lib/patient/texteMineurs.test.ts` le tient, pour qu'un mineur clos ne voie pas l'écran des mineurs. `enPause` ne vide donc la liste ni pour le clos majeur ni pour le clos mineur. La clôture ne posait que `recueilsEnPause`, qui masque le rendez-vous de suivi et les questionnaires renvoyés.
- Routes de saisie `api/patient/questionnaire` et `api/patient/submit`, ainsi que les agendas du portail : garde d'âge seule, aucune garde de clôture (`accepteNouvelEnvoi` absent). Conséquences :
  - clos majeur : le hub proposait et l'API acceptait ;
  - clos mineur : le hub proposait et l'API refusait (circuit mineur). L'UI et l'API divergeaient.
- Décisions : la clôture (`lib/patient/cycleDeVie.ts`, LOT-01 IDP2 D4) interdit les nouvelles affectations et les envois, et garde la lecture des archives. La route de clôture n'annule pas les affectations en cours. Rien ne tranchait le cas d'une affectation antérieure à la clôture : la question a été posée au propriétaire.

## Décisions prises
- Arbitrage du responsable du 2026-11-04, option A : un dossier clos ne recueille plus rien. Le hub retire ce qui reste « à compléter », et seulement le hub.
- Mise en œuvre : `enriched` est filtré sur `recueilsEnPause && groupe === 'a_completer'`. La liste, le compteur, la frise et le fil du jour, qui ne lit les agendas qu'à travers les `a_completer`, s'alignent ensemble. Ce qui est transmis, en correction, terminé ou expiré reste consultable. Le statut servi reste « majeur » pour un dossier clos, donc la sentinelle des mineurs est intacte.
- API de saisie inchangée : c'est une dette signalée, sans lot.

## Fichiers modifiés
- `web/src/app/portail/[token]/questionnaires/page.tsx` (filtre et commentaire).
- `web/src/app/portail/[token]/questionnaires/page.test.tsx` (banc des quatre cas : majeur, mineur, clos majeur, clos mineur).
- `changelog.d/2026-11-04-portail-clos-parcours.md`.

## Validations exécutées
- Banc de la page : 7 verts. Falsifié : sans le filtre, les deux cas clos sont rouges, puis le filtre est remis.
- T1 (`npm run check`) vert.
- T2 (`npm run test:worktree -- --fast`) vert en 10 min 11 s : Vitest 15 853, E2E 303 passés, 7 ignorés.

## Problèmes ouverts
- Dette : `api/patient/questionnaire`, `api/patient/submit` et les agendas du portail n'ont pas de garde de clôture. Un appel direct d'un majeur clos peut encore soumettre. À arbitrer : faut-il un refus `dossier_cloture` côté route ?
- La clôture n'annule pas les affectations en cours, qui restent « en attente » côté praticien.

## Prochaine action exacte
CodeRabbit revoit la PR, puis le responsable ou l'intégrateur la merge. La session ne merge pas.

## Interdits encore actifs
- Ne toucher ni au menu « Autres espaces » (série rails et menus, L2 et suivants), ni à `/api/portail/session`. Pas de migration.
- Aucun chiffre sur une surface patient (D-333). Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
