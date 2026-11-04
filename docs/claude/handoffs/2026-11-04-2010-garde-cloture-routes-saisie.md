# Handoff — 2026-11-04 — Les routes de saisie patient refusent un dossier clos (option A)

## Branche et état Git
- Branche `feat/garde-cloture-routes-saisie`, partie d'`origin/main@137012d6`, worktree `.claude/worktrees/garde-cloture-routes-saisie`.
- Une PR, squash. **Pas de merge par la session** : ce lot n'est pas couvert par l'autorisation de la série rails et menus.

## Objectif
Solder la dette laissée par #1846 : `api/patient/questionnaire`, `api/patient/submit` et les agendas du portail ne gardaient que l'âge. Un appel direct d'un majeur clos pouvait soumettre ; un mineur clos recevait `circuit_mineur_requis`.

## Décisions prises
- Arbitrage du responsable du 2026-11-04, **option A** : les routes de saisie refusent `dossier_cloture` (409) sur un dossier clos. Les affectations en cours restent en l'état et redeviennent remplissables à la reprise. Rien n'est annulé à la clôture.
- Message patient neuf, `MESSAGE_DOSSIER_CLOS_PATIENT` dans `lib/patient/cycleDeVie.ts` : « Votre suivi est clôturé : vous ne pouvez plus répondre à ce questionnaire. » `MESSAGE_DOSSIER_CLOS` reste réservé au praticien.
- Garde `refusClotureSuiviPour` (`lib/patient/gardeClotureServeur.ts`) : lit `actif` et `suiviClotureLe`, applique `accepteNouvelEnvoi`. Un dossier introuvable est refusé. Elle passe AVANT la garde d'âge dans chaque route.
- `api/patient/questionnaire` (GET) : même exemption que l'âge, `verrouille` et `modification_demandee` restent consultables. Les GET des agendas restent ouverts aux archives.
- `api/portail/valider` : vérifié, c'était bien un chemin d'assignation sur dossier clos (une consultation ouverte avant la clôture menait au pack de base, contre D4 de LOT-01 IDP2). Gardé par `accepteNouvelEnvoi(patient)`, avant l'âge.
- Banc sentinelle `lib/patient/gardeCloture.routes.guard.test.ts`, sur le modèle de `gardeAge.routes.guard.test.ts` : toute route d'écriture sous `api/patient` et `api/portail` est classée, fermée ou ouverte avec son motif ; l'ordre clôture puis âge est vérifié sur les routes de saisie.

## Fichiers modifiés
- `web/src/lib/patient/cycleDeVie.ts`, `web/src/lib/patient/gardeClotureServeur.ts` (neuf).
- Routes : `api/patient/submit`, `api/patient/questionnaire`, `api/portail/agenda-sommeil`, `api/portail/agenda-sommeil/cloture`, `api/portail/agenda-alimentaire`, `api/portail/valider`.
- Bancs : les six `route.test.ts` (clos majeur → 409 sans écriture ; clos mineur → `dossier_cloture` ; lecture seule consultable ; GET d'agenda ouvert ; reprise acceptée), plus le banc sentinelle.
- `changelog.d/2026-11-04-garde-cloture-routes-saisie.md`.

## Validations exécutées
- Falsifications, toutes rouges puis annulées : chacune des six gardes neutralisée (3 à 4 rouges par route, sentinelle comprise) ; l'âge passé devant la clôture dans `agenda-sommeil/cloture` (2 rouges : le cas mineur clos et la sentinelle d'ordre).
- T1 (`npm run check`) : typage et Vitest verts. Un seul rouge, hors lot : `scripts/wn-controle-fusion.test.mjs`, parité `BANCS_BALAYAGE`, qui ne connaît pas `web/src/components/patient/agenda-alimentaire/CaptureRepas.test.tsx` (entré par #1857, D-437). Le CI de main est vert sur `137012d6`.
- T2 (`npm run test:worktree -- --fast`) vert en 7 min 41 s : Vitest 15 970, E2E 309 passés, 7 ignorés.

## Problèmes ouverts
- Trois routes d'écriture restent ouvertes au dossier clos **faute d'arbitrage**, classées comme telles dans la sentinelle : `portail/fiche`, `portail/ja/observations`, `portail/protocole/checkin`. Hors de l'option A, qui ne vise que les routes de saisie de questionnaire.
- `portail/physio-traitements` renvoie au patient `MESSAGE_DOSSIER_CLOS`, le texte praticien (« Rouvrez le suivi »). Vu en passant, non touché.
- Le rouge local de parité `BANCS_BALAYAGE` ci-dessus, à confier au lot D-437.

## Prochaine action exacte
CodeRabbit revoit la PR, puis le responsable ou l'intégrateur la merge. La session ne merge pas.

## Interdits encore actifs
- Ne toucher ni au menu « Autres espaces » (série rails et menus) ni à `/api/portail/session`. Pas de migration.
- Aucun chiffre sur une surface patient (D-333). Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
