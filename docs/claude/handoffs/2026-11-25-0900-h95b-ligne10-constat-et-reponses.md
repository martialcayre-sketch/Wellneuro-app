# Handoff — H95 part B : constat de `synthese-v40` et réponses de cotation versés sur `main`

## 1. Branche et état Git

- Worktree `b-h95-second-appel`, branche `b-h95-ligne10-constat`, née d'`origin/main`. PR de doc seule.
- #2322 (`synthese-v40`, non conforme) fermée sans merge, sur arbitrage du responsable du 2026-11-25. Son constat et son handoff partent ici, inchangés.
- #2324 (le banc seul) est mergée (`f7482e8a`).

## 2. Objectif

Verser sur `main` le constat de l'évaluation de `synthese-v40` (journal H95, `2026-11-24-02`), le handoff du lot (`2026-11-24-1430`) et les réponses du responsable aux questions de cotation (journal H95, `2026-11-25-01`).

## 3. Décisions prises

- `20261124-1425-b-h95` : A (violation). Le responsable note que le sens voulu était celui de B, que A tient quand même, et la formulation qu'il préférerait lire. `20261124-1426-b-h95` : B. Les deux réponses sont inscrites au registre, statut `repondue`.
- Après les réponses : 19 générations en violation sur 72, verdict non conforme inchangé.
- Suite : nouvelle décision de retouche (D-557 §3), instruite par la session ; le texte est écrit ou validé par le responsable.

## 4. Fichiers modifiés

- `docs/claude/plan-journal/H95/2026-11-24-02-part-b-evaluation-synthese-v40.md` (repris de #2322, inchangé).
- `docs/claude/plan-journal/H95/2026-11-25-01-part-b-reponses-cotation-v40-suite.md`.
- `docs/claude/handoffs/2026-11-24-1430-h95b-synthese-v40-evaluation-non-conforme.md` (repris de #2322, inchangé) ; ce handoff.

## 5. Validations exécutées

- `npm run check:rapide` (journal du plan et ancres compris).
- Le décompte de 19 générations est relu sur la cotation détaillée du dépôt privé des revues : les 17 du constat, plus la génération de la réponse 1425 et une génération du cas (b) (réponse 1426).

## 6. Problèmes ouverts

- La décision de retouche est à instruire : formes relevées, textes au responsable, puis un rejeu de 72 générations sur le banc de #2324.
- Les deux questions passent à `close` quand la décision qui les cite est acceptée.

## 7. Prochaine action exacte

Instruire le projet de décision de retouche de la ligne 10 (numéro réservé par `wn-reserver-decision`), à partir de la cotation détaillée et des réponses ; aucun texte clinique n'y est arrêté sans le responsable. Y examiner aussi, sous la réponse 1426 B, les états nommés d'après le DNST à l'indicatif sans modalisateur, que la cotation n'a pas levés comme doutes (relevés par la revue de la PR de doc, au dépôt privé seulement) : 19 est le compte sur les cas levés.

## 8. Interdits encore actifs

- `synthese-v40` n'est pas servie ; ne pas reprendre #2322.
- Ne pas poser `WN_SYNTHESE_BIOLOGIE_ENABLED` ; ne retoucher ni `synthese-biologie-v2` ni le contrôle de D-545 §4.
- Aucune règle, aucun seuil, aucun texte clinique inventé ; aucune retouche des textes de D-545 et de D-557 sans décision.
- Aucun dossier réel visé ; aucune donnée patient au fournisseur ; forme opaque au dépôt (D-251 §4).
