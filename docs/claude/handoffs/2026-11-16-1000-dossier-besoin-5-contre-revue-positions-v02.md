# Handoff — 2026-11-16 — dossier de preuve du besoin 5, étape 5 : contre-revue, positions v0.2 et lot 2 d'étiquetage (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-positions-v02`, tirée d'`origin/main` 43abb6d7 (#2160), avancée sans commit propre par `--ff-only` sur cbe52d14, dans le worktree `.claude/worktrees/b-besoin5-positions-v02`, créé pour ce lot.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin5-dossier-positions-v02` du carnet (file B, ordre 70), inscrit `bloque` le 2026-11-15 puis pris le 2026-11-16 au retour de la revue. Déposer les pièces de contre-revue des positions v0.1, traiter les constats de Codex, rédiger les positions v0.2 au dossier privé, puis, après la signature des claims externes par le responsable, poser le lot 2 d'étiquetage. Documentation seule, sans code.

## Décisions prises

- Reprise du besoin 5 sur demande du responsable. Boîte B relue : un seul message non lu (merge d'un lot F05 d'une autre session), accusé sans effet.
- Pièces déposées le 2026-11-15 au dépôt privé des revues, dossier `besoin5-mouvement-repos/`, au gabarit du besoin 4 : consigne à seize affirmations, décisions et état initial, copie des positions v0.1, claims lus en production (one-off-3898). Dépôt vérifié PRIVATE avant envoi ; empreintes des quatre fichiers comparées après envoi.
- Codex, lancé par le responsable : GO avec corrections, huit constats (trois P1), aucun P0. Les huit sont **corrigés** dans l'onglet « Positions v0.2 » ; verdicts consignés au premier onglet (section « Étape 5 »). Huit positions changent ; aucune valeur, aucun claim ni aucune source ajoutés.
- Le responsable a signé les 37 claims externes le 2026-11-16. Lot 2 sélectif (gabarit du lot 1) : 31 claims cités par les positions, chacun dans la rubrique de la première position qui le cite ; les six non cités restent sans clé. Geste fait dans l'atelier (Chrome du responsable) par délégation permanente (`D-325` §5) ; liste consignée au premier onglet du dossier privé, jamais au dépôt.
- Rang du journal H15 : `01` du 2026-11-16, toujours libre sur `main` après l'avance.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-16-01-dossier-besoin-5-contre-revue-positions-v02.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- Ce handoff.
- Hors dépôt : le dossier privé du besoin 5 (premier onglet : dépôt des pièces, section « Étape 5 », signature et lot 2 ; onglet « Positions v0.2 », avec sa mise à jour du jour) ; le dépôt privé des revues ; le carnet (page de la file D).

## Validations exécutées

- Lectures en production, toujours en lecture seule et dans une transaction annulée : one-off-9453 (37 en attente, avant signature), one-off-3898 (claims des pièces : 41 + 37 + 17, chaque claim cité présent), one-off-3709 (37 `VALIDE` après signature), one-off-8064 (après le lot 2 : 72 claims au besoin 5, tous `VALIDE`, 31 actes `etiquetage` du jour).
- Liste du lot 2 relue par `lireListeEtiquetage` (tsx, worktree) : 31 lignes, aucune erreur. Aperçu de l'atelier : « 31 claims lus » ; retour : « 31 claims étiquetés. ».
- Revue Codex lue en entier ; chaque correction reprise mot pour mot de son claim.
- Banc du journal du plan (27 sur 27), anti-secrets, T1 `check:rapide` et T1 complet `check` verts avant l'ajout du lot 2 au fragment ; rejoués avant le commit (résultats dans la PR). Pas de T2 : documentation seule.

## Problèmes ouverts

- Signature des positions v0.2 case par case, par le responsable.
- Pièces attendues du responsable, chaque ingestion sur son accord : PDF de 0575, textes intégraux du PSQI et de l'Epworth, publication primaire du MFI-20 ; pièces de validation du MFI et de Horne ; licence et version française du MSK-HQ.
- Vérification du verrou de signature dans le logiciel : lot de code J3-12f.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut) ; revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : passer le lot du carnet à `fait`.
3. Suite du besoin 5 : signature des positions v0.2, puis décision du guide au gabarit de D-526.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil ni aucun poids inventés ; aucun seuil tiré de la mémoire de l'assistant.
- Aucun code clinique : `BESOIN_SOURCES`, convergence, grilles servies et nouvel instrument relèvent de décisions distinctes, appliquées par J3-12f.
- Étiquetage délégué sur les claims `VALIDE` seulement ; la signature ne se délègue pas (`DC-16`).
