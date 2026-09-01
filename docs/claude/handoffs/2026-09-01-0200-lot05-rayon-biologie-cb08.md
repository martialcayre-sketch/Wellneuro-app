# Handoff — 2026-09-01 — Rayon biologie CB : le rayon ouvre dans la Bibliothèque (LOT-05, CB-08)

## Branche et état Git

- Branche : `feat/cb08-rayon-biologie` (worktree `rayon-biologie-cb08`),
  basée sur `origin/main` `3713f169` (post-D-120/D-121, post-nettoyage
  Vercel/Supabase).
- T1 vert (`npm run check`, code 0). T2 `--fast` joué avant commit (résultat
  dans la PR).

## Objectif du lot

Donner à la bibliothèque de biologie fonctionnelle (987 actes NABM ingérés le
2026-07-26, **zéro appelant depuis**) sa première surface de consultation : le
rayon « Analyses biologiques » de la Bibliothèque praticien — le dû réel du
LOT-05 (CB-08) de la campagne `2026-08-02-rayon-biologie-cb`, seule part du
cadrage que les chaînes `D-068`→`D-073` n'avaient pas déjà livrée.

## Décisions prises (aucune clinique)

- **Adossé à `WN_CB_ENABLED`** (déjà `true` en production, `D-070`) : visible
  au déploiement. Choix nommé au changelog — le précédent `D-071` (drapeau
  neuf éteint) visait une surface par dossier ; ici catalogue global sans
  donnée patient, l'objet même de l'étage 1 documentaire.
- Encart fiche patient et cartes du fil du cadrage : **constatés déjà livrés
  hors campagne** (`PropositionBilanPanel`, cartes d'arbitrage) — pas réécrits.
  Dépendances LOT-02/LOT-03 caduques (CB-05 jamais construite).
- Bannière HDS de `dashboard/biologie` réécrite : « attend un hébergement
  HDS » était faux depuis `D-120`/`D-121` ; l'étage 2 reste différé par
  décision de roadmap, plus par l'hébergement.
- `catalogue-biologie` sort de `consommation_decisions.json` (verdict
  `a_brancher` soldé) ; `rayon:biologie` re-daté (2026-09-01, réexamen
  2026-10-01), toujours dormant — l'allowlist corpus est un geste praticien.

## Fichiers

- Nouveaux : `web/src/lib/biology-library/{access,catalogue}.ts` (+ tests),
  `web/src/app/api/praticien/biologie/catalogue/route.ts` (+ test),
  `web/src/components/biologie/{RayonBiologiePanel,FicheAnalytePanel}.tsx`
  (+ test), fragment changelog.
- Modifiés : `biology-library/featureFlag.ts` (message repli),
  `dashboard/bibliotheque/page.tsx` (+ section, tests étendus par rayon),
  `dashboard/biologie/page.tsx` (drapeau lu à la requête),
  `BibliothequePanel.tsx` (puce « Analyses biologiques » et bannière alignées
  sur l'état du drapeau — la phrase HDS périmée disparaît),
  `docs/claude/MATRICE_CONSOMMATION.md` (régénérée après `git add` — piège
  connu), `consommation_decisions.json`, fiche LOT-05 et CAMPAGNE.md.
- Contre-revue adverse du diff jouée avant la PR : 10 constats, 0 réfuté,
  tous corrigés (détail : Résultats de la fiche LOT-05).

## Problèmes ouverts / interdits actifs

- Données réelles maigres et c'est voulu : 0 plage laboratoire, 2 plages
  fonctionnelles, 0 appariement NABM signé → l'écran dit chaque absence ;
  « non évalué » ≠ « non remboursé » partout.
- La campagne `2026-08-02-rayon-biologie-cb` n'est PAS close : LOT-00→LOT-04
  recouverts par un autre chemin, CB-09 (étage 2) différé — la clôture et la
  requalification des lots recouverts restent un arbitrage du responsable.
- Jamais d'euros sur les actes ; jamais de score global ; vocabulaire d'écran
  gardé par banc (`RayonBiologiePanel.test.tsx`).

## Prochaine action exacte

Ouvrir la PR (`--body-file`), CI par `node scripts/wn-attendre-ci.mjs <N>`,
merge Copilot. Après merge : constater le rayon en production (drapeau déjà
posé — il faut un build qui le porte), puis arbitrage responsable sur la
clôture de la campagne CB.
