# 2026-08-20 09:00 — Biologie consolidée ouverte, HDS en parallèle

## Ce qui a changé

- **`2026-08-18-biologie-consolidee` ACTIVÉE en primaire**, `CAMPAGNE.md` +
  trois lots écrits ; `2026-08-18-echeance-hds-g-trust-04` passe en
  **parallèle** avec son LOT-01 (elle garde son échéance du 2026-10-21).
- État machine et `ACTIVE_CAMPAIGN.md` synchronisés par les scripts ; audit
  campagnes 0 erreur, cohérence d'état 24/24.

## Ce que le cadrage a établi — à ne pas refaire

- **L'ancrage `D-073` est déjà gardé à l'écriture** :
  `web/prisma/checks/c3_correspondance_ancrage_v1_negatif.sql` éprouve les
  CHECK (SHA sans version, version sans SHA, longueur invalide → 23514). Le
  manque est la **relecture**, à un seul endroit :
  `web/src/app/api/praticien/correspondance-medecin/route.ts`, constante
  `SELECTION` (~ligne 115), qui n'a ni `ancrageSha256` ni `ancrageVersion`.
- **Le POST du courrier renvoie déjà l'ancre** et l'écran l'affiche à la
  lettre qu'on vient d'établir — mais rien n'est comparé à la table courante.
  Ne pas confondre les deux chemins.
- **`packs_registre_coherence_v1.sql` ne double pas le contrat du LOT-03** :
  il porte la dérive `packs.qids` ↔ miroir relationnel. Deux descriptions
  cohérentes d'un même pack peuvent être toutes deux fausses.
- **Patron E2E qui évite le piège du seed** :
  `web/e2e/fiche-trajectoire-peuplee.spec.ts` — `beforeAll`/`afterAll`, mode
  sériel, `PAT_SEED_03`. Helpers de provisionnement/nettoyage dans
  `web/e2e/helpers/db.ts` (voir `provisionnerReponseOrientation` et le
  commentaire de `nettoyerOrientationFileEnvoi`, qui explique pourquoi
  `resetPortailState` est inadaptée).

## Le point doctrinal du LOT-01

Le verdict d'ancrage a **trois** états. `sans_ancrage` (les deux colonnes
nulles — lettre antérieure à `D-073`, ou correspondance non biologique) n'est
**pas** `perimee` : `DC-24`, une donnée absente n'est jamais un défaut. Le
confondre ferait porter un soupçon à tout l'historique. Et le vivant se
compare sur **SHA + version**, jamais le SHA seul — un banc par mutation doit
le prouver.

## Vérifié

- `wn-campaign.mjs status` : biologie primaire (0/3), HDS parallèle (1/4) ;
  `next` rend LOT-01. Audit 0 erreur (1 warning préexistant), cohérence 24/24.
- Aucun fichier de code au diff ; aucune migration.
