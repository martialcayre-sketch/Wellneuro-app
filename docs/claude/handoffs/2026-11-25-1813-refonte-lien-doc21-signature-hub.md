# Handoff — 2026-11-25 — Refonte Lien / Empreinte, DOC-21 : signature du hub patient retenue

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc21-signature-hub`, worktree neuf
  `.claude/worktrees/refonte-lien-doc21`, créé sur `origin/main` `97e0d72d` fraîchement
  fetché.
- Une PR, documentaire seule. La session ne merge pas : « prête @<sha> » à l'intégrateur.
- Lot frère ouvert en même temps : COM-2 (`claude/refonte-lien-com2-hub-patient`). PAT-3b
  (`claude/refonte-lien-pat3b-signature-hub-aaa4bc`) suit les deux.

## Objectif

Inscrire dans [[D-481]] §1 bis l'élément du hub patient « Mon parcours » (U10), que la
ligne « Hub patient » laissait sans nom, après la révision et la revalidation du
prototype PAT-3 exigées par le §4 avant PAT-3b.

## Décisions prises

- Prototype révisé : https://claude.ai/artifact/GgXXFgPGumAtdxZUB2cky7, rangée « PAT-3b »
  (version 17) — trois variantes au téléphone (A boucles d'alliance atténuées à droite du
  titre, B arcs d'alliance, C bandeau `quiet-sweep` en tête de carte), la retenue au bureau.
- Réponses écrites du responsable le 2026-11-25 : « C, 76/88 px, DOC+COM », puis, sur la
  hauteur, « 52/64 comme dessiné ».
- Inscrit : `quiet-sweep.svg` en bandeau, bord à bord en tête de la carte, 52 px au
  téléphone, 64 px au bureau, recadré ; ordre DOC-21, COM-2, PAT-3b.

## Fichiers modifiés

- `docs/decisions/D-481.md` : ligne « Hub patient » du §1 bis, complément DOC-21 ;
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-patient.md` (§1, PAT-3b) ;
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/socle-commun.md` (section COM-2) ;
- `changelog.d/2026-11-25-refonte-lien-doc21-signature-hub.md`, ce handoff.

## Validations exécutées

- T1 (`npm run check:rapide`), dont `decisions-check` ; résultats dans la déclaration
  « prête ».
- Aucun code : pas de T2 requis pour une PR documentaire.

## Problèmes ouverts

- Aucun. La pose et le constat de l'en-tête de U10 appartiennent à PAT-3b.

## Prochaine action exacte

Merge de DOC-21 et de COM-2 par l'intégrateur, puis PAT-3b.

## Interdits encore actifs

- Aucun texte d'interface sans acceptation mot pour mot ; aucun chiffre côté patient
  ([[D-333]]).
- Aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater).
