# Handoff — 2026-09-28 — Fiches d'assiette : arbitrages pour les lots 8 à 11

## 1. Branche et état Git

`wn-fiches-assiette-arbitrages-lots-8-11`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`6132ba24` (#1243, M2). PR de documentation seule. Un merge à la fois.

## 2. Objectif

Consigner les arbitrages rendus par le responsable le 2026-09-28, après
l'application de M2. Ils fixent les lots 8 à 11 et qualifient la table des
remises au titre du RGPD.

## 3. Décisions prises

Rendues par le responsable, consignées en amendement de `D-251` :

1. **La table des remises relève de l'article 9** (catégorie particulière).
2. **Lot 8 — l'aperçu fait foi.** Si l'état des fiches change entre l'aperçu
   et le clic, le clic est refusé et le nouvel aperçu s'affiche.
3. **Lots 9 et 10 — une fiche remise reste quand son assiette quitte le
   protocole.** Elle reste lisible, avec la mention « ne fait plus partie de
   votre protocole actuel ».
4. **Lot 11 — l'objet de l'e-mail neutre** est « Un document de votre
   praticien vous attend ».
5. **Document TRUST sur l'IA** : un lot dédié avant l'ouverture, rédigé par
   Claude et validé par le responsable.
6. **Premier protocole servi de bout en bout** sur un dossier de test, dès le
   lot 8 livré, drapeau fermé.

## 4. Fichiers modifiés

- `docs/DECISIONS.md` : l'amendement de `D-251` du 2026-09-28 (suite).
- `docs/DOSSIER_RGPD.md` : la ligne de `FicheAssietteRemise` en rubrique 5,
  qualifiée art. 9.
- `changelog.d/2026-09-28-fiches-assiette-arbitrages-lots-8-11.md` (fragment de
  changelog).
- `docs/claude/handoffs/2026-09-28-1356-fiches-assiette-arbitrages-lots-8-11.md`
  (ce handoff).
- `docs/claude/SESSION_LOG.md` (entrée de clôture).

## 5. Validations exécutées

- **M2 est constatée en production par conteneur** (lecture seule, agrégats) :
  - migration appliquée, en une tentative ; aucune migration sans tentative
    aboutie ;
  - table vide, avec ses 8 colonnes, la RLS, ses 3 triggers et ses 3 FK en
    RESTRICT ;
  - CHECK d'espèce étendu à `fiche_assiette`.
- **Le run `release-db` 36417128366** est vert à toutes ses étapes. Sa
  sentinelle, liée au run, est `WN_RELEASE_DB_OK id=36417128366-1`.
- **La production sert `6132ba24`.**
- **La base de dev du worktree est remise à niveau**, avec l'accord du
  responsable. L'ébauche de M2, vide, a été retirée, puis la migration mergée
  rejouée : aucune dérive, contrat vert.
- T1 : voir la PR.

## 6. Problèmes ouverts

- **Les sept fiches attendent toujours la relecture et la validation du
  responsable**, au rayon « Fiches conseils ».
- **Le lot 8 se conçoit sur les notes de M2** (handoff du 2026-09-27, 21 h 56) :
  - remises dans un ordre stable de `source_id` ;
  - `createMany` ou SQL, jamais `create` ;
  - nettoyage des E2E à étendre.

## 7. Prochaine action exacte

Le lot 8 : la remise au clic « Valider pour diffusion », avec son aperçu
(jeton d'aperçu, refus si l'état a changé). Ensuite, servir un premier
protocole sur un dossier de test.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun texte de Fiche MY au dépôt, en PR ou au journal.
- `WN_FICHES_ASSIETTE` reste fermé jusqu'au §10 : sept fiches validées,
  espace de lecture constaté, document TRUST sur l'IA publié, contre-revue.
