# Handoff — 2026-09-24 — LOT-02 du chantier 6 : les portes biologiques signées (D-246)

## 1. Branche et état Git

`wn-chantier6-lot02-module-signe-2026-09-24`, worktree
`.claude/worktrees/porte-biologique`, partie de `origin/main` à `e2939ce8`
(LOT-01 appliqué en production).

## 2. Objectif

Écrire et faire signer la table qui relie assiette → marqueurs → claims, sans
aucun nombre (`D-245`).

## 3. Décisions prises

- `D-246` : cinq lignes, huit claims, signature du responsable à 06:16:52 UTC,
  après ajout de `BIO_AG_ERYTHROCYTAIRES` à l'assiette oméga 3.
- `exige_prescriptif = false` (7 claims sur 8 descriptifs, relu en production).
- Écartés, pour mémoire : `WN-CL-0340-007`, `WN-CL-0292-005` (cadrage §6).

## 4. Fichiers modifiés

`web/src/lib/clinical/portesBiologiquesAssiettesV1.ts` (créé) · son
`.guard.test.ts` (créé) · `claimsEpinglesFraicheur.guard.test.ts` ·
`shaPerimetreLitteral.guard.test.ts` ·
`web/prisma/checks/rag_claim_fraicheur_tables_signees_v1.sql` et
`_negatif.sql` · `docs/FEATURE_FLAGS.md` · `docs/DECISIONS.md` · cadrage §6 ·
`changelog.d/2026-09-24-portes-biologiques-signees.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Huit claims vérifiés au conteneur contre le prédicat de fraîcheur.
- Bancs ciblés : 5 fichiers, 77 cas verts ; mutation (un marqueur retiré de la
  ligne sérotoninergique) → le cas « SIGNÉE » rougit, restauré → vert.
- Contrat négatif de fraîcheur joué sur la base locale du worktree : vert.
- T3 avant la PR (résultat au corps de PR).

## 6. Problèmes ouverts

- Marqueurs cités sans code au catalogue : 5-HIA urinaire, HVA/MHPG,
  adipokines.
- Épargne digestive et psychobiotique : autres marqueurs, non recherchés.

## 7. Prochaine action exacte

PR, CI, revue lue, merge **seul** → `release-db` (fichier sous `lib/clinical/`) :
approuver, constater la sentinelle et la première ligne des déploiements. Puis
LOT-03 : lecteur du dernier résultat, route, section de carte, lexique interdit,
E2E.

## 8. Interdits encore actifs

Ne pas toucher `indicationsAssiettesV1.ts`. Aucun nombre dans la table des
portes. Aucun autre merge pendant l'attente de `release-db`.
