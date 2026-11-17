# Handoff — 2026-11-17 — Refonte Lien / Empreinte, DOC-17 : noms accessibles de PRA-6b inscrits dans D-488

## Branche et état du dépôt

- Branche `claude/refonte-lien-doc17-pra6b-noms`, créée depuis `origin/main` (`8b35cec3`). Worktree `.claude/worktrees/refonte-lien-pra6b-noms-accessibles-1b5c75` (session PRA-6b, lancée par la session PRA-6).
- Documentation seule : un amendement de D-488, le registre des textes (§1.8), un renvoi dans `plan-praticien.md`, un fragment de changelog et ce handoff.
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Inscrire les noms accessibles de PRA-6b, acceptés par le responsable (« Oui, les six », question `20261117-2150-d`), avant le code qui les pose.

## Décisions prises

- [[D-488]], amendement DOC-17 : T-77 « Trier la liste des patients » (P02), T-78 « Date limite (optionnel) » et T-79 « Filtrer par statut » (P37) ; réemplois « Pack » et « Patient » (P37), et, sur P52, « Patient » / « synthèse validée », segments du titre visible.
- Les noms sont invisibles (`aria-label`, `aria-labelledby`) : aucun libellé visible, aucune mise en page.
- Liste commune : `20261117-2150-d` passée à `repondue` (version 2). Elle passe à `close` au merge.

## Fichiers modifiés

- `docs/decisions/D-488.md` (titre, amendement en fin de fichier).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md` (§1.8, numérotation, récapitulatif).
- `docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-praticien.md` (PRA-6).
- `changelog.d/2026-11-17-refonte-lien-doc17-pra6b.md` (neuf).
- Ce handoff.

## Validations exécutées

- `npm run check` (T1 complet) et `check_no_secrets.sh` : voir la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- PRA-6c (courses de `SynthesePanel`) est tenu par une autre session ; PRA-6b ne touche pas `SynthesePanel.tsx`.
- Les autres lots PRA-6d à PRA-6j suivent l'ordre de `20261117-1421-d`.

## Prochaine action exacte

1. PR, CI (`wn-attendre-ci.mjs`, en tâche de fond), `wn-revue-pr-agent.mjs` → 0, un verdict par remarque.
2. Déclarer « prête @<sha> », ligne `prete` (état `emis`) au registre D-503.
3. Après le merge : PR de code PRA-6b (quatre composants, bancs Vitest `getByRole(..., { name })`, T1 complet puis T2 `--fast`).

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié.
- Aucune route, garde, drapeau, migration. Production en lecture seule.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
- Branche avancée par `git merge --ff-only origin/main` seulement (D-518).
