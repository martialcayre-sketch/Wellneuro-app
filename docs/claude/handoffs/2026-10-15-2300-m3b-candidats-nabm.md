# Handoff — M-3b : candidats NABM pré-remplis dans la fiche d'analyte (F54, file A rang 1)

## Branche et état Git

- Branche `feat/m3b-candidats-nabm`, worktree `.claude/worktrees/file-d1-suite`, partie de `origin/main` à eff28cf3.
- Session concurrente : cycle en `git`/`gh` direct ; ni écriture ni checkout dans la copie principale.

## Objectif

Afficher pré-remplis, dans la fiche d'analyte, les candidats NABM préparés le 2026-10-15, pour une signature en un clic par l'écran de M-3. Sans migration, rien en base avant la signature.

## Décisions prises

- Arbitrages du responsable du 2026-10-15 appliqués tels quels (liste relue versée au code, sans migration ; constat « aucun acte » renvoyé à M-3c) ; rien de reposé.
- Liste recalée sur le constat par conteneur du soir (V105, 85 analytes, codes présents et actifs, 5 signées dont zinc et magnésium en « groupe au choix »).
- Module pur `candidatsNabm.ts`, situation par analyte, candidats (code, nature, motif) ; millésime de préparation V105.
- Le serveur rend un candidat seulement s'il est présent et actif au millésime courant et si le couple n'a aucune ligne (signée ou proposition) ; plusieurs candidats par analyte restent proposables (acte isolé et acte de groupe coexistent dans `remboursable.ts`).
- Écran : nature présélectionnée mais modifiable ; « À juger » affiché ; mention sans signature pour aucun acte, valeur calculée, regroupement.
- Les motifs ne reprennent que ce que disent les libellés relus ; les incompatibilités entre actes, non relues ce soir, n'y figurent pas.

## Fichiers modifiés

- Neufs : `web/src/lib/biology-library/candidatsNabm.ts`, `candidatsNabm.test.ts`.
- Modifiés : `correspondancesNabm.ts` (+ banc), route `nabm/correspondances` (+ banc), `CorrespondancesNabmSection.tsx` (+ banc), `importeursBiologyLibrary.guard.test.ts` (motif ; aucun importeur neuf).
- Docs : `docs/claude/PLAN_WELLNEURO.md` (F54, ligne M-3b), `changelog.d/2026-10-15-m3b-candidats-nabm.md`.

## Validations exécutées

- Bancs ciblés verts (77) : liste, lib, routes, section avec contre-épreuve, garde des importeurs.
- T1 (`check:rapide`) et T1 complet (`npm run check`) verts ; T2 (`test:worktree --fast`) : résultat consigné dans la PR.
- Revue `wn-reviewer` : GO avec réserves, aucun P0 ni P1. Corrigés : mention « rien à signer » tue quand une correspondance existe déjà ; aucun candidat pour un analyte inactif ; bancs ajoutés (candidat à côté d'une signée, refus du POST puis relecture). Maintenu conforme à la consigne : candidat résolu au millésime courant, même après la V105 (l'écran dit « préparées sur le millésime V105 »). Signalé au responsable : `BIO_CRP` et `BIO_CRP_US` proposent le même acte 1804.

## Problèmes ouverts

- R1 (journal des signatures) et le constat signé « aucun acte » : M-3c, rang 2, migration.
- R2 (course millésime ↔ écriture) inchangée.
- Un changement de millésime laisse la liste préparée sur la V105 : le serveur relit chaque code, mais un libellé changé ne se voit qu'à l'écran.

## Prochaine action exacte

1. PR, CI (`wn-attendre-ci`), revue CodeRabbit sur le sha de tête, merge `--match-head-commit`, constat du déploiement.
2. Après le merge : ligne r1_12 de la page de la file A à « fait », n08 (BioFlow), page des candidats.
3. Geste du responsable : G-3, signer la liste étendue depuis la Bibliothèque ; puis constat par conteneur.

## Interdits encore actifs

- Aucune signature écrite par migration ou script ; rien en base avant la signature.
- Pas de nom ni d'e-mail de signataire au dépôt ; le lien de la page des candidats ne va pas au dépôt.
- Ne pas brancher les remboursements dans la proposition avant le journal (R1, M-3c).
