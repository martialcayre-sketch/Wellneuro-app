# Handoff — 2026-11-25 — Refonte Lien / Empreinte, PRA-6o : « Trajectoire alimentaire » à 20 px, et un titre « Fiche patient » dans les états sans dossier

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6o-titres-554087`, worktree `.claude/worktrees/refonte-lien-pra6o-titres-554087`, créée sur `origin/main@97e0d72d` (récupéré le 2026-11-25), avancée par `--ff-only` à `46a8d56c` (#2363) avant le premier commit, sans commit propre (D-518).
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454, D-546).
- Lot ouvert par le responsable le 2026-11-25 (« Lancer les deux »), confié par la session d'orchestration, sur deux restes du handoff PRA-6n (`2026-11-24-0840-refonte-lien-pra6n-titres-fiche.md`, « Problèmes ouverts »).

## Objectif

Rétablir la hiérarchie visuelle de l'onglet Alimentation (« Trajectoire alimentaire », h2 en 30 px, dépassait le h1 du nom en 20 px) et donner un `h1` aux états de la fiche sans dossier (chargement, introuvable, session expirée, échec).

## Décisions prises

- Cadrage présenté en prototype (artefact Design System privé, D-481 §4), puis trois questions de la liste commune, répondues en session par le responsable le 2026-11-25 :
  - `20261125-1757-d` : A — « Trajectoire alimentaire » en `text-xl` (20 px), corps du titre de phase du poste.
  - `20261125-1758-d` : A — `h1` visible « Fiche patient », style du `h1` du nom, au-dessus du message ; texte accepté mot pour mot. Inscrit T-95 dans D-488 par DOC-22. Au cadrage, aucun DOC-n ouvert (DOC-19 et DOC-20 mergés, aucune PR ouverte sur D-488) ; le numéro DOC-21, d'abord retenu, a été pris pendant le lot par #2363 (complément de D-481, signature du hub patient, sans T-n) : l'amendement est renuméroté DOC-22 ; T-95 reste libre.
  - `20261125-1759-d` : lot non élargi.
- L'état « session expirée » n'était pas nommé par la consigne : il passe par la même branche que « introuvable » et reçoit le même titre (dit dans le prototype et dans la question).
- Le `h1` des états sans dossier est hors du `role="alert"` de l'échec : l'alerte reste le message et le bouton, lus une fois.
- Restes de PRA-6e (l.43-46) : tiroir en h4 et banc manquant soldés par PRA-6n ; restent le nom en 20 px (contre 30 px ailleurs) et les phases Suivi et Réévaluation jugées sur les seules données du banc — non élargis, ci-dessous.

## Fichiers modifiés

- `web/src/components/FichePatientPanel.tsx` : `titreSansDossier` (T-95) dans les retours `loading` et `!data || 'unavailable' in data`.
- `web/src/components/food-observation/PractitionerFoodObservationPanel.tsx` : `text-3xl` → `text-xl`.
- `web/src/components/FichePatientPanel.test.tsx` : banc PRA-6o (quatre états).
- `docs/decisions/D-488.md` (DOC-22, T-95) ; `docs/claude/propositions/2026-11-11-refonte-lien-etape2/registre-textes.md` (§2.14 et récapitulatif).
- `changelog.d/2026-11-25-refonte-lien-pra6o-titres-fiche.md`, ce handoff.

## Validations exécutées

- `npm ci` et `npx prisma generate` dans `web/` avant tout test.
- Vitest ciblé (fiche et `food-observation`) : 3 fichiers, 262 tests, vert. Le banc neuf mord : rejoué sur la fiche d'avant, ses quatre tests rougissent.
- T1 (`check:rapide`) : vert, 17 étapes.
- Contrôle à l'écran en local : `next dev`, base du worktree migrée et seedée (fixtures seules), cookie praticien des E2E, Desktop Chromium 1440 px, sonde locale non versée. Onglet Alimentation de Sophie Nicola, Jennifer Martin et Michel Dogné : h1 20 px, h2 20 px, h3 12,5 px ; états introuvable, session expirée, échec et chargement (provoqués par interception de la lecture) : un seul h1 « Fiche patient » en 20 px. Aucun saut, axe à 0 (WCAG 2.1 A/AA, `heading-order`, `page-has-heading-one`, `empty-heading`) sur les sept vues.
- Relecture `ui-ux-pro-max` (`ux`) : « Heading Hierarchy » et « Font Size Scale » conformes.
- T1 complet (`npm run check`) : vert.
- T2 (`test:worktree -- --fast`), machine chargée (charge 20 à 30, quatre T2 concurrents d'autres sessions), à `97e0d72d` plus le diff :
  - essai 1 : Vitest rouge sur deux bancs de durée de `lib/export-dossier/masquage.test.ts` (220 ms pour 200, 1,76 s pour 1,5 s), hors du diff ; le fichier seul passe (170 tests) ; E2E non joués ;
  - essai 2 : Vitest entier vert (18 670 tests, 62 sautés) ; E2E 478 réussis, 37 sautés, 1 rouge : `portail-rail-lateral.spec.ts:208` (confort 112,5 %, Desktop Chromium) voit en plus le lien « Transmettre un compte rendu d’analyses » sur Sophie Nicola, que `portail-reconnexion-transmissions` (U34) écrit en parallèle sur la même fixture ; la variante à 100 % passe juste avant. Portail patient, hors du diff.
- L'avance à `46a8d56c` n'apporte que de la documentation, `scripts/wn-attendre-ci.mjs` et la matrice de consommation : aucun fichier du diff.

## Problèmes ouverts

- Flaky hors lot (T2, essai 2) : `portail-rail-lateral.spec.ts:208` dépend des écritures parallèles de `portail-reconnexion-transmissions` sur PAT_SEED_01 ; à router vers la file du portail si le CI le reproduit.
- Antérieur, hors lot (relecture `ui-ux-pro-max`, « Loading Indicators ») : le message « Chargement de la fiche patient... » n'a ni `role="status"` ni `aria-busy`.
- Non élargis (question `20261125-1759-d`) : le `h1` de la fiche reste en 20 px quand les autres écrans praticien ont 30 px (touche la hauteur calculée du poste et les captures) ; les phases Suivi et Réévaluation ne sont jugées sans saut que sur les données du banc.

## Prochaine action exacte

1. CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond), PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer`, D-448), un verdict par commentaire en ligne ; puis « prête @<sha> » sur la PR, et numéro + sha à la session d'orchestration ; questions 1757-d à 1759-d : `pr` à renseigner.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488.
- Ni route, ni garde serveur, ni drapeau, ni schéma, ni migration ; rien de clinique ; production en lecture seule.
- Jamais de merge par la session ; D-518 : une branche avec commit propre en retard sur `main` demande l'arbitrage du responsable avant toute fusion.
