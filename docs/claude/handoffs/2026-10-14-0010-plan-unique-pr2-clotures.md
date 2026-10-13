# Handoff — 2026-10-14 — Plan unique WellNeuro 6.0 : clôtures des campagnes, gabarits vides, audit régénéré (PR 2 du versement)

## Branche et état Git

`docs/plan-unique-pr2`, dans le worktree `.claude/worktrees/plan-unique-pr2`,
partie de `origin/main` (`57ab15ed`, #1417, PR 1 mergée, déploiement
Scalingo constaté `success` le 2026-10-13 à 23 h 19, heure de Paris).
Documentation seule :
aucun code, aucune migration, aucun drapeau. PR ouverte avec ce handoff.

## Objectif

Deuxième des six PR de `D-285` §7 : statuts des campagnes et des lots au sens
de `scripts/wn-campaign-audit.mjs` (plan §9, table « Campagnes à fermer »),
`lot_courant` « aucun », cinq gabarits LOT-00 à LOT-04 de compléments clean
label supprimés, deux mots de statut, quatre corrections de forme, cases
« Done » des campagnes fermées cochées sur preuve ou annotées,
`AUDIT_REGLES_CAMPAGNES.md` régénéré.

## Décisions prises

- Statuts posés tels que le plan §9 les écrit, sauf trois corrections après
  contre-lecture sur pièces : (1) compléments clean label : « objet livré par
  les PR C4 #330 à #353 puis consolidé par
  2026-08-02-rayon-complements-alimentaires » (le plan écrit « absorbée…
  PR #332 à #353 » ; les PR C4 de cette plage, juillet 2026) ; (2) LOT-03 de
  la chaîne alimentaire : « les quatre règles retenues par D-045 et le dossier
  des candidates restent en référence » (le plan §7 dit « jamais commencé,
  aucune D-xxx », contredit par `D-045` du 2026-08-11, PR #655 et #657) ;
  (3) rayon compléments : « LOT-01 à LOT-05 livrés, LOT-00 refermé sans objet
  le 2026-08-06 » (LOT-00 n'a jamais été livré, PR #594).
- Hypothèse du plan appliquée : `lot_courant` « aucun » pour biologie
  exploitée. Les quatre champs git de la chaîne alimentaire restent inchangés.
- Cases « Done » : quinze cases instruites par trois lecteurs, puis un
  contre-lecteur par case déclarée prouvée ; quatre cochées sur preuve relue
  (chaîne alimentaire 2 et 3, chronologie HDS, migration séparée de biologie
  exploitée), onze annotées d'une ligne datée disant ce qui tient et ce qui
  manque.
- Dates : statuts, lignes datées et `mise_à_jour` portent le 2026-10-13, date
  de `D-285` ; la PR est construite dans la nuit du 13 au 14.

## Fichiers modifiés

- Onze `CAMPAGNE.md` : frontmatter ; sections « État au 2026-10-13 » pour
  compléments, journal, agenda, chaîne, HDS ; lignes datées pour alliance,
  rayon, boussole ; cases Done pour chaîne, HDS, biologie exploitée.
- Sept fiches de lots : journal LOT-05 ; chaîne LOT-02, LOT-03, LOT-04 ; HDS
  LOT-01, LOT-02, LOT-04.
- Supprimées : `2026-07-11-complements-clean-label-v1/lots/LOT-00` à
  `LOT-04` (gabarits « À compléter ») ; les cinq documents à la racine restent.
- Régénéré : `docs/claude/campagnes/AUDIT_REGLES_CAMPAGNES.md` (51 campagnes,
  0 erreur, 1 warning préexistant `duplicate_lot_ordinal`).
- Neufs : `changelog.d/2026-10-14-plan-unique-pr2-clotures.md`,
  `docs/claude/SESSION_LOG.md` (entrée), ce handoff.

## Validations exécutées

- `npm ci` et `npx prisma generate` dans le worktree, sans lien externe.
- T1 complet (`cd web && npm run check`) : vert, code 0, dont
  `campaign-audit-check`, `decisions-check`, `ancres-check`, `hooks-check` et
  les deux passes anti-secrets.
- `node scripts/wn-campaign-audit.mjs --fail-on-warning-codes …` (commande
  de la CI) : code 0 après les statuts, rejoué code 0 après les corrections.
- `bash scripts/check_no_secrets.sh` : OK ; aucun `.env*` ; aucun tiret
  cadratin dans un statut posé ; aucun e-mail, aucun « vous » dans les ajouts.
- Contre-lecture sur pièces : dix cases déclarées prouvées, six réfutées ;
  douze faits, deux infirmés et deux réfutés à la portée (corrections ci-dessus).
- Relecture adverse du diff final par quatre lecteurs, chaque constat soumis
  à deux contre-lecteurs : résultat au corps de la PR.
- T2 non joué : aucun écran, aucune route, aucun code touché.

## Problèmes ouverts

- Trois constats de la contre-lecture, hors périmètre de cette PR : (a) la
  synthèse IA ne lit pas les pseudo-items `AGA_*` de `Q_ALI_09`, relus contre
  un catalogue qui n'en déclare aucun et rendus non résolus
  (`web/src/lib/scoring/reponsesLisibles.ts`, `web/src/lib/synthese/generation.ts`) ;
  (b) le banc de vocabulaire de verdict du LOT-04 de biologie exploitée laisse
  passer « élevé » et « bas » (`EstimeMesurePanel.test.tsx:932-933`) ; (c) le
  plan §7 motive l'abandon du moteur de propositions par « jamais commencé,
  aucune D-xxx », contredit par `D-045` : une décision clinique acceptée
  reste sans sort écrit au plan. À verser au plan (prochaine version) ou en
  PR de code.
- Le plan (§7, §9) porte encore les formulations corrigées ici, et le §7
  « restes a et b sous R:ao » que rien ne définit au dépôt hors F78 :
  prochaine version du plan. `docs/claude/campagnes/README.md:35` dit REPRISE « ouverte » : PR 3
  (qui ne prévoit que la ligne 5). Les textes périmés des corps (HDS
  « Questions ouvertes », table des lots du rayon) : traces datées, PR 6.
- Deux lectures à confirmer par le responsable (héritées de la PR 1) : cc
  compte-t-elle comme une place de la file C ; porte 15 pour le code de bf.

## Prochaine action exacte

1. PR #1419 déclarée en conflit par GitHub (`SESSION_LOG.md`, deux entrées en
   fin de fichier, #1418 arrivé pendant la construction) : sur accord du
   responsable, fusionner `origin/main` dans la branche en gardant les deux
   entrées (#1418 puis celle-ci), pousser ; puis CI
   (`node scripts/wn-attendre-ci.mjs 1419`, code 0 seul), commentaires en
   ligne lus (`gh api repos/{owner}/{repo}/pulls/1419/comments`), un verdict
   chacun, merge, déploiement constaté.
2. PR 3 (pilotage) depuis un worktree neuf sur `origin/main` :
   `.wn/state.json` (tête de `next_action`, `blocking_issues`, `active_lot` à
   la main) puis `node scripts/wn-cycle.mjs --appliquer` ; fiches LOT-11 et
   LOT-12 de l'agenda sommeil, LOT-25 de BIO-PARCOURS ; statut de LOT-05 de
   BIO-INGEST ; `BIOFLOW_ROADMAP.md` ; `PROJET_CONTEXTE.md:189-202` ;
   `campagnes/README.md:5` (plan §9 et §11).

## Interdits encore actifs

- Un merge à la fois ; la PR 3 attend le déploiement constaté de celle-ci ;
  jamais d'auto-merge sur une PR de lot.
- Aucune migration, aucun `schema.prisma`, aucune règle clinique ni seuil
  dans les six PR du versement ; aucune release-db.
- Le fichier non suivi de la copie principale
  (`web/src/lib/clinical-engine/safetyEffetIndesirable.cas-fictifs.test.ts`)
  ne se pousse pas tel quel.
- La copie principale est restée sur `0763e48c` : `git pull` humain avant
  toute édition, le garde de fraîcheur la bloque sinon.
- Aucune identité, aucun constat de production hors agrégat, aucun texte non signé.
