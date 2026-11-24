# Handoff — H95 part B : le banc d'évaluation en mode « appel principal seul », seul sur `main`

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-banc-principal`, née d'`origin/main` `4f056861`.
- Reprend seulement `web/scripts/eval-d539/` de la branche `b-h95-ligne10-code` (PR #2322, brouillon, non conforme, à ne pas merger), sans la consigne `synthese-v40`.

## 2. Objectif

Faire entrer sur `main` le banc capable de jouer l'appel principal seul (D-557 §3, D-556 §5 et §6), pour les prochains rejeux. Accord du responsable du 2026-11-24 (« Oui », à la question posée en fin du lot `h95-b-ligne10-code`).

## 3. Décisions prises

- Le banc exige la consigne servie par `main`, `synthese-v39` (une constante, à reporter avec la consigne à chaque version). L'appel principal est reconnu par son étiquette, plus par sa version.
- Aucune consigne, aucun texte clinique ne change ; le banc reste hors de toute configuration de CI.

## 4. Fichiers modifiés

- `web/scripts/eval-d539/` : `evaluation.eval.ts`, `lancer.sh`, `extraire.mjs`, `paquets-codex.mjs`.
- `changelog.d/2026-11-24-h95b-banc-appel-principal.md` ; ce handoff.

## 5. Validations exécutées

- `npm run check:rapide` et `npm run check` (T1 complet) avant le commit.
- Le banc a été joué tel quel (en `synthese-v40`) pour l'évaluation de #2322 : 72 générations, entrées conformes 72/72. Ici, seule la version exigée change ; il n'est pas rejoué (appels payants au fournisseur, aucun besoin).

## 6. Problèmes ouverts

- `synthese-v40` non conforme (#2322, brouillon) ; questions `20261124-1425-b-h95` et `20261124-1426-b-h95` ouvertes ; la suite (nouvelle décision de retouche selon D-557 §3, ou autre voie) est au responsable.

## 7. Prochaine action exacte

Intégrateur : merger cette PR après « prête @sha ». Une nouvelle consigne évaluée par ce banc reporte `VERSION_EVALUEE`.

## 8. Interdits encore actifs

- Ne pas merger #2322 ; `synthese-v40` n'est pas servie.
- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED` ; ne retoucher ni `synthese-biologie-v2` ni le contrôle de D-545 §4.
- Aucune règle, aucun seuil, aucun texte clinique inventé ; aucun dossier réel visé ; aucune donnée patient au fournisseur ; forme opaque au dépôt (D-251 §4).
