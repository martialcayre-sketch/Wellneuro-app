# Handoff — 2026-09-30 — Les assiettes indiquées, classées pour l'aide au choix

## 1. Branche et état Git

`feat/assiettes-classement`, worktree `.claude/worktrees/deploy-anti-recul-lot1`,
partie de `origin/main` à `6ef931a6` (#1257, `D-253`). Elle reprend le travail
de `feat/assiettes-hierarchie` (commit provisoire `f96bbc03`, jamais poussé),
renuméroté de `D-253` en `D-254`. Un merge à la fois.

## 2. Objectif

Le responsable : « la proposition d'assiettes n'est toujours pas hiérarchisée
pour l'aide au choix ».

## 3. Décisions prises

- **`D-254`**, critère arbitré en séance : « priorité puis convergence ».
- **La priorité visée** est la priorité retenue, à défaut celle que propose la
  carte : c'est le repli de la re-passation ciblée. Le lien passe par
  `BESOIN_SOURCES`, sous-score strict.
- **La convergence** est le nombre de voies atteintes. Tri stable.
- **Toutes les voies atteintes sont évaluées**, chacune comme une disjonction à
  une branche, pour garder la garde de complétude.
- **Numérotation** : le garde de `decisions-numerotation.mjs` refuse un trou.
  Le classement prend donc `D-254`, et le calendrier ancré sur la diffusion
  devient `D-255`.

## 4. Fichiers modifiés

- `web/src/lib/clinical/indicationsAssiettesService.ts` et son banc :
  `voiesAtteintes`.
- `web/src/components/patient-cockpit/hierarchieAssiettes.ts` et son banc :
  module neuf, pur.
- `AssiettesIndiqueesPanel.tsx` et son banc : groupes, règle dite, liste du
  menu dans l'ordre de la carte, repli sans `voiesAtteintes`.
- `ClinicalRuntimeSection.tsx` : `prioriteViseeAssiettes` passée à la carte.
- `scripts/specs-drapeau-ali01.test.mjs` : les deux specs neuves citent
  `BESOIN_SOURCES` ; elles entrent dans l'allowlist motivée. Elles ne lisent
  que les besoins 4, 8 et 10, jamais Q_ALI_01 : même verdict sous les deux
  drapeaux.
- `docs/DECISIONS.md` (`D-254`), changelog, ce handoff, SESSION_LOG.

## 5. Validations exécutées

- Bancs : 30 pour le service, 9 pour le module, 36 pour la carte, tous verts
  avant la reprise ; ils sont rejoués sur la branche.
- Mutations : 7 jouées, toutes détectées :
  - première voie seule ;
  - branche évaluée comme feuille ;
  - sous-score ignoré ;
  - tri retiré ;
  - première voie lue seule ;
  - menu dans l'ordre de la table ;
  - priorité ignorée.
- T1 : vert, après l'entrée de ces deux specs dans l'allowlist. T2 : voir la
  PR.

## 6. Problèmes ouverts

- `lib/clinical/` est touché : le merge déclenche `release-db`, sans
  migration, à faire approuver par le responsable.
- Suivent ensuite les quatre lots de `D-255` (calendrier ancré sur la
  diffusion). Le plan est validé et consigné en mémoire.
- Le constat de l'espace de lecture des fiches sur `PAT032` reste à faire.

## 7. Prochaine action exacte

PR, CI, revue Copilot, merge, approbation de `release-db`, puis suivi du
déploiement. Ensuite, le lot 1 de `D-255`.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248).
- Aucun poids ni aucune valeur de score dans le classement (`DC-19`, `D-157`).
- Les dossiers se lisent par identifiant, jamais par nom.
- Ne jamais confirmer un J21 pour débloquer une saisie.
