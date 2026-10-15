# Handoff — file D.1, suite du 2026-10-15 : lettres j, q, s, aa, ab, av, w, co ; G-10, porte 4, M-3

## Branche et état Git

- Branche `worktree-file-d1-suite`, worktree `.claude/worktrees/file-d1-suite`, partie de main à 7a5969c3 (déploiement constaté en production : succès, 10:38 UTC).
- La copie principale porte d'autres sessions : ni écriture ni checkout. #1475 (BP-04) est à une autre session.

## Objectif

Suite de la file D.1 (plan §4), dans l'ordre demandé :
1. report d'« at ; R:Drive » en D.1 ;
2. lettres j, q, s, aa, ab, av et guide w ;
3. G-10 et porte 4 ;
4. co ;
5. véhicule de M-3.

## Décisions prises

- Arbitrages du responsable sur questions à options (mémoire `lettres-j-q-s-aa-ab-av-w-co-arbitrages-2026-10-15`). Ils sont devenus D-306 (j), D-307 (q), D-308 (s), D-309 (aa), D-310 (ab), D-311 (av), D-312 (w, méthode) et D-313 (co).
- Écarts à la recommandation :
  - s : statut posé en liste fermée, écrite par le responsable ;
  - ab : entrée « Connaissances » ;
  - co : conclusion « non requise » maintenue ;
  - w : réponse libre, « dossier de preuve à l'instar de B2 fer ». Le modèle est le dossier du besoin 2 (BP-07), document privé du responsable.
- M-3 : écran praticien, sans migration ; écarté : la migration de données.
- G-10 : quatre instruments répétés en production, plus la HADS.

## Fichiers modifiés

- `docs/DECISIONS.md` (D-306 à D-313).
- `docs/DOSSIER_RGPD.md` : rubrique 13 (réexamen du 2026-10-15) et ligne 13 du tableau §14.
- `docs/claude/PLAN_WELLNEURO.md` :
  - portes 4, 11, 12 ;
  - tables des lettres ;
  - fiches F63, F38, F57, F58, F55, H14, F33, H15, F68, F54, H13, H08 ;
  - §4 et file D (D.1, D.3).
- `changelog.d/2026-10-15-lettres-j-q-s-aa-ab-av-w-co.md`, `docs/claude/SESSION_LOG.md`, ce handoff.

## Validations exécutées

- Faits vérifiés au code avant les questions :
  - `BANDES_DE_BRUIT` vide et non publiée ;
  - paliers 70 et 34 ;
  - rail « Atelier corpus » avec l'étiquette « 4.0 » ;
  - onglets de la fiche ;
  - `remboursable.ts` (quatre états ; `regimeDocumentaire` sans appelant hors de son fichier) ;
  - mention « Hors nomenclature (à la charge du patient) » de `courrier.ts` ;
  - commentaires du laboratoire servis par la série ;
  - RLS de `biology_analyte_nabm` contournée par l'application ;
  - D-122 §1.
- T1 complet : voir la PR.

## Problèmes ouverts

- De la main du responsable :
  - la liste fermée des statuts posés (s), par sa propre D-xxx, avant le code de F58 ;
  - les neuf critères de l'AIPD, cochés avec leur motif (co) ;
  - les références test-retest des cinq instruments (G-10) ;
  - les sources de la porte 4 (H08).
- Lots de code à placer :
  - écran de signature NABM (M-3, file A, rang 1) ;
  - banc d'imports de la biologie avec J3-bioflow (j) ;
  - J2-med (q) ;
  - EF-0 et l'entrée « Connaissances » (ab) ;
  - mentions du courrier dans J3-base (aa).
- w : un dossier de preuve par besoin, un à la fois, lecture par conteneur.
- Restes inchangés :
  - re-mesure du sommeil le 2026-10-29, puis le 2026-11-12 ;
  - J2-radar, date obligatoire, NF-7, EF-3b ;
  - dette du repère de cabinet (D-298 §5) ;
  - retrait de `WN_BIO_EXTRACTION_ASYNC`, sur confirmation.

## Prochaine action exacte

1. Pousser, ouvrir la PR, CI en fond, revue CodeRabbit sur le sha de tête, commentaires lus, merge après le déploiement constaté du précédent.
2. Ensuite, sur demande : cadrage du lot de l'écran NABM (M-3).

## Interdits encore actifs

- Un merge à la fois, déploiement constaté avant le suivant (D-248).
- Release-db humaine, une à une (D-087).
- Aucun mot de statut, aucune source, aucun seuil, aucune part ni aucun acte NABM proposés par l'assistant.
- Constats en agrégats (D-298) ; identifiants de dossier sans métrique.
- Dossiers de preuve hors dépôt ; au dépôt, identifiants et mécanismes seulement (D-251 §4).
