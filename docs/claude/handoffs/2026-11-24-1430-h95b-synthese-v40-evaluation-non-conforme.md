# Handoff — H95 part B : `synthese-v40` (D-557), évaluation de l'appel principal seul non conforme

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-ligne10-code`, née de `origin/main` `4ca99cfd` après le merge de #2313 (`6ca7da42`) ; `origin/main` fusionnée ensuite (`a22b0d1d`, #2320, aucun fichier commun).
- Commit du code évalué : `40966261`. Lot `h95-b-ligne10-code` (file B, carnet D-510), **rangé `bloque`** : verdict non conforme, suite au responsable.
- PR en brouillon, **non déclarée « prête »** : rien de ce lot ne doit être mergé en l'état.

## 2. Objectif

Servir `synthese-v40` (D-557 §2) après une évaluation conforme de l'appel principal seul (D-557 §3) : consigne, gardes, banc en mode appel principal seul, puis évaluation.

## 3. Décisions prises

- Le paragraphe de D-557 §2 est inséré au mot près après celui de D-545 §5 ; le garde reconstruit la section depuis les citations de D-539, D-545 et D-557.
- Mode `principal` du banc : drapeau éteint pendant les générations, comme en service ; le bloc est construit par le banc avant les générations, pour vérifier les entrées et pour la lecture.
- **Verdict : non conforme** (17 générations sur 72 en violation, toutes ligne 10, dont 2 aussi ligne 11 ; 6 communes aux deux lectures). Arrêt, sans retouche des textes (D-557 §3).
- Deux cas que la grille ne tranche pas sont portés au responsable : `20261124-1425-b-h95` et `20261124-1426-b-h95`, avec un avis Codex à l'aveugle (A, puis B ; confiance moyenne). Le verdict n'en dépend pas.

## 4. Fichiers modifiés

- `web/src/lib/anthropic.ts` (paragraphe, `synthese-v40`, commentaire de version).
- Gardes : `promptBiologie.guard.test.ts`, `promptAlimentaire.guard.test.ts`, `anthropic.corpusActif.guard.test.ts`, `biologie.generation.test.ts`.
- Banc : `web/scripts/eval-d539/` (`evaluation.eval.ts`, `lancer.sh`, `extraire.mjs`, `paquets-codex.mjs`).
- `changelog.d/2026-11-24-h95b-synthese-v40-code.md` ; journal H95 `2026-11-24-02-part-b-evaluation-synthese-v40.md` ; ce handoff.

## 5. Validations exécutées

- `npm run check:rapide` et `npm run check` (T1 complet) verts avant le commit ; `tsc --noEmit` vert.
- Essai de fumée du banc (1 génération), puis 72 générations : 72 HTTP 200, entrées conformes 72/72, aucun second appel.
- Cotation : quatre lectures de session indépendantes, quatre avis Codex (code 0, après l'essai adverse du nouveau binaire `0.171.0-alpha.13.2`, barrière tenue).
- Pièces au dépôt privé des revues : `h95-d557-evaluation-2026-11-24/` (cotation, résumé, pièces brutes) ; copie locale `~/Developer/wn-eval/h95-d557-2026-11-24/`.
- Pas de T2 : rien ne doit être mergé.

## 6. Problèmes ouverts

- `synthese-v40` est non conforme. Selon D-557 §3, une nouvelle retouche passe par une décision, puis par un nouveau rejeu de l'appel principal en entier. Les textes validés ne se retouchent pas sans elle.
- Questions `1425-b-h95` et `1426-b-h95` ouvertes ; elles valent lecture de la grille pour la suite.
- La branche porte le banc en mode `principal`, qui peut servir aux prochains rejeux. S'il doit entrer seul sur `main`, une PR séparée sans la consigne est à décider.
- Étape 3 (second appel) inchangée : D-556 §7.

## 7. Prochaine action exacte

Au responsable : lire le constat (journal H95, fragment `2026-11-24-02`), répondre à `1425-b-h95` et `1426-b-h95`, et dire la suite : nouvelle décision de retouche, ou autre voie. La PR de ce lot reste en brouillon d'ici là.

## 8. Interdits encore actifs

- Ne pas merger ni déclarer « prête » la PR de ce lot ; `synthese-v40` n'est pas servie.
- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED` ; ne retoucher ni `synthese-biologie-v2` ni le contrôle de D-545 §4.
- Aucune règle, aucun seuil, aucun texte clinique inventé ; aucune retouche des textes de D-545 et de D-557 sans décision.
- Aucun dossier réel visé ; aucune donnée patient envoyée au fournisseur ; forme opaque au dépôt (D-251 §4).
