# Handoff — 2026-11-19 — ingestion de huit textes libres du besoin 10, notice seule du besoin 8, lot de la file B

## Branche et état Git

- Branche `docs/besoin10-ingestion-textes-libres`, créée sur `origin/main` 4a415c14 (D-518 : la branche précédente, squashée par #2265, ne contenait plus la tête). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. PR ouvertes relevées au moment d'écrire : #2266, #2259, #2178, aucune ne touche le corpus ni le journal H15.

## Objectif

Verser au corpus les textes libres du besoin 10 dont la licence n'exclut ni la fouille de textes ni l'IA, sur l'accord du responsable du 2026-11-19, ajouter la notice sans texte de l'essai de 2026 du besoin 8, et en laisser la trace au dépôt : notices au registre des sources, compteurs du `README` du corpus, journal H15, changelog. Aucun étiquetage.

## Décisions prises

- Un lot par source, route interne de production, paquets de dix passages au plus (ici de un à cinq), claims entrés `EN_ATTENTE_VALIDATION`, sans clé de lien. Identifiants : `WN-SRC-0712` à `0719`, lots `LOT_087` à `LOT_094` du 2026-11-19. Marge relevée avant l'envoi : plus grand `sourceId` au registre et en base `0711`, plus grand lot `LOT_086`.
- Clause de licence relue dans le bloc de droits de chaque texte avant l'envoi : envois retenus = licence ouverte (1), CC BY (5), CC BY-NC sans clause d'exclusion (2). Écartés et listés « en attente » au dossier privé : CC BY-NC-ND, licence non déclarée, licence avec exclusion, texte non libre.
- Passages en extraits mot pour mot, relus contre le texte récupéré (page publique de l'ANSM, Europe PMC) ; chiffres des claims contrôlés contre le passage cité ; aucun item d'échelle reproduit. Le corrigendum d'une méta-analyse est ingéré à part (`0714`), la source d'origine (`0713`) renvoyant à lui.
- Notice seule `WN-SRC-0720` : l'essai de 2026 n'entre qu'au registre, licence avec exclusion de la fouille de textes et de l'IA (arbitrage du responsable).
- Question `20261119-1310-b` (droits des échelles publiées) : réponse C, rien pour l'instant, consigné au dossier privé.
- Rang du journal H15 : `09` (`08` est le plus grand sur `origin/main`).

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (neuf notices, 692 au total) et `docs/claude/corpus/README.md` (compteurs et plage) ; `docs/claude/plan-journal/H15/2026-11-19-09-ingestion-textes-libres-besoin-10.md` ; `changelog.d/2026-11-19-besoin-10-ingestion-textes-libres.md` ; ce handoff.
- Hors dépôt : lignes d'ingestion en production (23 passages, 38 claims, par la route interne), dossier privé du besoin 10 (section « Étape 4 »), bloc-notes de la session (`recherches/ing/`).

## Validations exécutées

- Avant l'envoi : lecture seule en conteneur (aucune ligne au-delà de `0711` ni de `LOT_086`) ; validation des 23 passages et des 38 claims contre les contrats de la route (le même analyseur que la route, hors ligne).
- Envois : un conteneur `scalingo run -d`, charges en gzip et base64 en argument, réponses 200 sur les 16 appels, vérification de récupération des passages et vérification des claims (présent, statut, actif, embedding, lien, empreinte) vraies.
- Constat après : lecture seule en conteneur, transaction annulée ; une ligne active par passage et par claim pour chacune des huit sources, empreintes distinctes, claims `EN_ATTENTE_VALIDATION`, aucun exclu de la recherche.
- Documentation seule côté dépôt : contrôles du plan-journal et anti-secrets (résultats dans la PR). Vitest non joué (worktree sans `npm ci`). Pas de T2.

## Problèmes ouverts

- Migration non destructive du doublon `WN-SRC-0546` / `0564` (réponse A à `20261119-1311-b`) : lot distinct, à instruire (mécanisme d'exclusion existant pour les claims ; aucun équivalent sans changement de schéma pour les passages, à constater avant d'écrire).
- Envois du besoin 10 en attente (licence ou texte non libre) : au dossier privé, à rouvrir si le responsable accorde d'autres licences.
- Claims des huit sources à valider par le responsable, puis étiquetage selon `D-325`.

## Prochaine action exacte

1. CI de la tête (`node scripts/wn-attendre-ci.mjs <N>`, seul `0` vaut), revue de PR-Agent sur le sha de tête, boîte B relue, « prête @<sha> ».
2. Instruire la migration du doublon (lot distinct, branche neuve sur `origin/main`) : inspecter le mécanisme d'exclusion et s'arrêter pour rendre compte s'il exige un changement de schéma.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun code clinique avant signature et décision (J3-12f).
- Aucune ingestion hors de l'accord donné ; aucun étiquetage dans ce lot ; la signature ne se délègue jamais.
- Aucune migration dans ce lot ; production lue seulement par `scalingo run -d`, écrite seulement par la route d'ingestion accordée. L'URL des dossiers privés reste hors dépôt.
