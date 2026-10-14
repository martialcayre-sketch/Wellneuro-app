# Handoff — lettre cj : D-296, rationalisation des packs biologiques

## Branche et état Git

- Branche `docs/cj-d296-rationalisation-packs`, partie de `origin/main` 39a1d1d3, avancée sur 8080ee8f (#1453, D-295) avant la PR. Le commit local d'origine (`docs/cj-rationalisation-packs`, cd49b2c4, partie de 56e84c29) y est réappliqué : il portait D-291, prise entre-temps sur main par #1444. La décision est renumérotée D-296 (plan, D/7) ; D-292 à D-294 sont prises sur main, D-295 est réservée par #1453.
- Documentation seule. PR à ouvrir.
- Fichier non suivi `web/src/lib/clinical-engine/safetyEffetIndesirable.cas-fictifs.test.ts` : caduc (plan, D/4), effacé le 2026-10-14.

## Objectif

Écrire la décision de rationalisation des packs biologiques (plan, fiche F49 ; PR 1 de l'audit des panels du 2026-10-05).

## Décisions prises

- D-296 acceptée telle quelle par le responsable le 2026-10-14, sur question à options.
- L'analyte devient l'unité canonique.
- Les quinze panels sont classés : 9 axes cliniques à convertir, 1 gabarit optionnel à déprécier, 3 indications ou populations à convertir, 2 motifs « non indiqué » conservés.
- Un panel converti passe inactif à la signature des indications v2 (F53), jamais supprimé.
- Le gel des packs devient permanent ; l'autre option (gel jusqu'aux indications v2) est écartée.
- Formulations de l'audit écartées : priorité « conditionnel » et « niveaux 1 à 4 », absentes du code. Les panels n'ont que les niveaux `socle` et `approfondissement`.

## Fichiers modifiés

- `docs/DECISIONS.md` : D-296.
- `docs/architecture/bioflow/BIOFLOW_ROADMAP.md` : la règle du gel renvoie à D-296 §3.
- `docs/claude/PLAN_WELLNEURO.md` : §5 « Règles de BioFlow » ; mise à jour de la fiche F49.
- `changelog.d/2026-10-14-cj-rationalisation-packs-biologiques.md`.

## Validations exécutées

- Constat de production par conteneur, en agrégats et en lecture seule, le 2026-10-14 : identique à l'audit. 15/15 panels actifs ; 78 items sur 35 analytes ; 85 analytes ; 0 correspondance NABM ; 0 lien analyte ; 0 panel documenté ; 0 arbitrage ; 0 action d'exploration sur 3 brouillons.
- Code : 15 règles d'indication, chacune sur un panel ; 0 occurrence de `BiologyCatalogRef`.
- T1 : vert sauf `decisions-check`, rouge parce que D-290 (#1440, une autre session) n'est pas mergée. `ancres-check` et anti-secrets sont verts.

## Problèmes ouverts

- Levé : #1440 et #1444 sont mergées ; la décision porte D-296 sur une branche neuve partie de main.

## Prochaine action exacte

1. `npm run check`, push.
2. Attendre le CI avec `wn-attendre-ci`, lire les commentaires de revue, merger.
3. Passer la ligne n03 de la page de suivi BioFlow à « fait ».

## Interdits encore actifs

- Aucun nouveau `BiologyPanel` clinique (D-296 §3).
- Aucune conversion ni désactivation de panel avant F53.
- Aucun axe nommé hors de la lettre cm.
- Aucun lien sans claim.
- Pas d'auto-merge sur une PR de lot.
