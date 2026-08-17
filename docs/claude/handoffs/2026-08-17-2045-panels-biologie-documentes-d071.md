# Handoff — 2026-08-17 — D-071 : la table des panels documentés, migration seule

- **État** : `feat/branchement-proposition-bilan`, depuis `origin/main` à
  `94b456f4`. Migration + contrat SQL + effacement IDP2. T1 vert ; T3 vert
  hors le blocage WebKit `D-049` (page.goto expiré, journal réseau vide —
  classé par le harnais, vert au run précédent sur le même diff).
- **Décision** : `D-071`, §2 et §3 portés par cette PR ; §1 et §4 attendent la
  PR de branchement.

## Pourquoi cette table

`D-070` a établi que `deriverStatutsBiologie` n'a aucun appelant. En cadrant
le branchement, un trou plus profond est apparu : le champ `documentes` du
moteur n'a **aucune source**. Sans elle, `deja_documente` et `a_repeter` sont
inatteignables — l'outil repropose un bilan que le patient vient de faire
faire, sans jamais signaler qu'il ignore la question. Le praticien a tranché
pour l'ouverture de la table plutôt que pour l'aveu à l'écran.

## Ce que le découpage a appris

Le plan mettait l'effacement IDP2 en PR de code. **T3 l'a réfuté** : le banc de
complétude d'`effacement.test.ts` se dérive du SCHÉMA, pas des appelants — il
rougit dès que le modèle apparaît. `arbitrages_biologiques` avait tenté le même
report (#680, « migration seule ») et ajouté un second commit. Le coût est
donc nommé au lieu d'être découvert : entre le déploiement Vercel et
l'approbation `release-db`, un effacement de dossier échoue — **fermé**, et un
banc neuf le prouve désormais au lieu de l'affirmer.

## Ce que la revue a changé (NO-GO → GO)

- **RLS deny-all manquante** : une table neuve de `public` rejoint le périmètre
  Supabase Data API, et celle-ci porte un lien nominatif dossier ↔ panel ↔
  date ↔ praticien. `arbitrages_biologiques` a le même trou — motif de le
  fermer, pas de le reproduire.
- **Le contrat gardait moins que sa description** : il comptait un index *par
  son nom*. Recréé non unique sous le même nom, il passait vert. Réécrit à sept
  termes (cas positif, doublon 23505, CHECK, liste blanche de colonnes,
  unicité réelle + colonnes ordonnées, FK `confdeltype='r'`, RLS) et **tué par
  neuf mutations** avant d'être retenu.

## Dettes nommées

- Deux replis **fail-open** du moteur deviennent atteignables : date illisible
  ou date future concluent `deja_documente`, donc retirent le panel
  (`DC-24`, `DC-25`). Aucun banc. À traiter **avant** le premier appelant.
- La borne « date non future » vit côté route (Postgres refuse `now()` dans un
  CHECK) — elle n'existe pas tant que la route n'existe pas.
- Le `RESTRICT` vers `biology_panels` couple le référentiel aux données
  patient : retirer un code de panel du catalogue sera bloqué dès qu'une
  déclaration le cite.

## Prochaine action

PR-1 relue et mergée, puis `release-db` **approuvée**, puis seulement la PR de
branchement : service `propositionService.ts`, route
`GET/POST /api/praticien/biologie/proposition`, panneau cockpit, derrière le
drapeau neuf et éteint `WN_CB_PROPOSITION`. Contrat M-B impératif — table
canonique passée VERBATIM.
