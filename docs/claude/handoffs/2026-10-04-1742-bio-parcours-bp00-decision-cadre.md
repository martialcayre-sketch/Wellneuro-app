# Handoff — 2026-10-04 — BIO-PARCOURS BP-00 : décision-cadre D-266, campagne ouverte

## Branche et état Git

- Branche `docs/bp-00-decision-cadre`, PR #1307. **Historique réécrit** en un seul commit sur
  `origin/main`, poussé en `--force-with-lease` sur arbitrage de l'utilisateur. Motif : le verdict
  Codex P0-1, du contenu clinique lié aux claims avait été poussé sur la branche publique. Les
  anciens commits restent joignables par SHA dans la chronologie de #1307 ; seul le support GitHub
  peut les purger, par geste de l'utilisateur.
- `origin/main` (#1306) avait été intégré par merge avant la réécriture ; les deux entrées de
  `SESSION_LOG.md` sont côte à côte.
- Campagne `2026-10-04-bio-parcours` **parallèle**, lot courant LOT-01 ; la primaire reste
  `2026-09-30-bio-ingest / LOT-03` (`.wn/state.json`).

## Objectif

BP-00 : rendre BIO-PARCOURS exécutable. Il fallait consigner les arbitrages du cadrage v3.1,
amender frontières et doctrine, verser le cadrage, ouvrir la campagne et réaligner BIO-INGEST et
la file d'attente. Le lot est purement documentaire.

## Décisions prises

- **`D-266` acceptée** par le responsable le 2026-10-04, sur le texte corrigé après revue.
- Arbitrages de session :
  - identifiants `LOT-nn` = `BP-nn`, les lots b en LOT-28/29/30 (l'audit exige `^LOT-\d{2}` et des
    ordinaux uniques) ;
  - fiches de phase 0 seulement ; campagne parallèle ; cadrage versé dans cette PR ;
  - table de correspondance nature ↔ statut explicite ;
  - constantes produit nommées sans valeur ;
  - remise à niveau par merge d'`origin/main`.
- Choix prudents issus de la revue et acceptés avec D-266 :
  - la passe Codex ciblée (migrations, modules signés, frontières) **ne vaut que pour la
    campagne** ; hors campagne, la politique est inchangée ;
  - DC-45 reste orpheline (8 reprises, compte du marqueur : 5) ;
  - DC-20 et DC-47 sont « actées en doctrine, banc dû » ;
  - le contexte DC-46 est nommé sans être exécuté : BP-05 arrête la liste, les formes et les
    valeurs ;
  - le **mot** « prescription » reste proscrit côté patient, « protocole personnalisé » compris.
- Cadrage versé sans contenu clinique : sorties d'adressage, médicaments interférents et
  attributions de claims sont renvoyés au Claude Doc `c054ca75-…` (rev 67), qui fait foi.

## Fichiers modifiés

`docs/DECISIONS.md` (D-266) · `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md` ·
`docs/claude/REGISTRE_FRONTIERES.md` · `docs/ROADMAP_PRODUIT.md` · `docs/claude/POLITIQUE_REVUE.md`
· `.claude/rules/pr-revue-et-release-db.md` (« même lot, seconde PR ») ·
`docs/claude/campagnes/` :
- `CADRAGE_BIO_PARCOURS_v3_2026-10-04.md` (nouveau) ; le v1 porte un bandeau « remplacé » ;
- `2026-10-04-bio-parcours/` : `CAMPAGNE.md` et 7 fiches ;
- BIO-INGEST : cadrage, `CAMPAGNE.md`, fiches LOT-04, LOT-05 et LOT-07 (nouvelle) ;
- `FILE_ATTENTE.md` (l. 77 parapluie, l. 78 close, l. 81 amendée) et `ACTIVE_CAMPAIGN.md`.

Plus `.wn/state.json`, `changelog.d/2026-10-04-bio-parcours-bp00-decision-cadre.md` et
`SESSION_LOG.md`.

## Validations exécutées

- **T1 complet** (`cd web && npm run check`) : code 0 sur `f7463c86`. Il a fallu un
  `npx prisma generate` préalable : le client était périmé après le pull du #1300, sans lien avec
  le lot. **T1 à rejouer** sur la tête de branche, avant le push.
- `wn-etat-reel` : un seul écart, préexistant (`validation.last_checked_at` vieux de 27 jours).
- **Revue `wn-reviewer`** : audit des campagnes, numérotation et ancres de doctrine verts. Aucun
  P0, six P1 tous corrigés. P2 corrigés, sauf l'ambiguïté d'ids entre campagnes, seulement
  nommée en hors périmètre.
- Aucune identité réelle dans le diff (grep `PAT0…` et adresses).
- **Passe Codex** (première passe) : verdict BLOQUER, deux P0, tous deux corrigés.
  - **P0-1** : le cadrage versé portait encore du contenu clinique lié aux claims (§6.1, §6.2,
    l. 210, sources externes, analytes absents). Le §6 a été réécrit en forme opaque :
    identifiants seuls, mécanismes, renvois au Claude Doc.
  - **P0-2** : le cadrage disait DC-20 et DC-47 « armées ». Elles sont désormais « actées en
    doctrine, banc dû », et la légende « arm. » désigne le geste confié au lot, jamais un état
    acquis.

  Les autres invariants contrôlés par Codex tiennent.

## Problèmes ouverts

- **Seconde passe Codex** sur la tête réécrite : le signal d'escalade est un P0 corrigé. Elle se
  fait avant le merge, sous forme de passe de correction.
- Purge des anciens SHA de #1307 par le support GitHub : geste facultatif de l'utilisateur.
- Questions 2 à 5 du §6.5 du cadrage (preuves, instrument de fatigue, vue patient, évaluateur
  indépendant) : elles ne bloquent aucun lot de phase 0.
- La tenue de la prémisse de D-037 (absence de CPS) face au mot « prescription » est renvoyée à
  BP-26.

## Prochaine action exacte

1. `node scripts/wn-attendre-ci.mjs 1307` en fond sur la tête réécrite, code 0 exigé.
2. Passe Codex de correction, puis lecture des commentaires en ligne
   (`gh api …/pulls/1307/comments`), puis merge.
3. Session neuve : BP-01 (gardes avant surface, T2) ou BIO-INGEST LOT-03, selon l'arbitrage. BP-02
   peut avancer en parallèle (lecture conteneur, session hors mode auto).

## Interdits encore actifs

- Aucune règle clinique, aucun seuil, aucune dose ni aucune valeur inventés ; aucun texte
  clinique au dépôt public (`D-251` §4).
- Aucun texte TRUST servi ne change avant BP-24 ; `D-234` et `D-257` A7 restent intactes.
- Aucune migration sans confirmation distincte, `release-db` approuvée et constat par conteneur ;
  le consommateur part dans le même lot, en seconde PR.
- Toujours préfixer « BIO-INGEST » les LOT-03, 04, 05 et 07 de cette campagne.
- Ne pas lancer `wn-campaign.mjs activate` sans `--parallel` : cela remplacerait la primaire.
