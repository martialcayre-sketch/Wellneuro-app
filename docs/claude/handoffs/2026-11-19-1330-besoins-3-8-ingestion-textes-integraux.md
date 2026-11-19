# Handoff — 2026-11-19 — ingestion de neuf textes intégraux libres (besoins 3 et 8), lot de la file B

## Branche et état Git

- Branche `docs/besoins3-8-ingestion-texte-integral`, créée sur `origin/main` c60501a2 (D-518 : la branche précédente ne contenait pas la tête). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. Aucun fichier commun avec #2264, #2259, #2178 (PR ouvertes relevées au moment d'écrire).

## Objectif

Verser au corpus neuf textes intégraux en accès libre des besoins 3 et 8, sur l'accord explicite du responsable du 2026-11-19 (dix envois nommés, ces dix seuls), et en laisser la trace dans le dépôt : notices au registre des sources, compteurs du `README` du corpus, journal H15, changelog. Aucun étiquetage.

## Décisions prises

- Un lot par source, route interne de production, paquets de dix passages au plus (ici de deux à quatre), claims entrés `EN_ATTENTE_VALIDATION`, sans clé de lien. Identifiants : `WN-SRC-0703` à `0711`, lots `LOT_078` à `LOT_086` du 2026-11-19. Marge relevée avant l'envoi : plus grand `sourceId` au registre et en base `0702`, plus grand lot `LOT_077`.
- Passages en extraits mot pour mot, relus contre le texte intégral récupéré (Europe PMC, ou NCBI pour deux manuscrits d'auteur) ; chiffres des claims contrôlés contre le passage cité ; aucun item d'échelle reproduit.
- Le dixième envoi (besoin 8, envoi 3) est retenu : sa licence exclut la fouille de textes et de données et l'entraînement d'IA, fait nouveau par rapport à l'accord ; aucune écriture. Confirmation demandée au responsable.
- Droits : `to_verify` pour cinq sources (licences non commerciales, manuscrits d'auteur à droits d'éditeur), `verified` pour les quatre CC BY 4.0. Constat, sans décision.
- Deux questions ordinaires ouvertes à la liste commune, avec avis de Codex à l'aveugle (paquets sans pièce privée ni donnée patient, sans option recommandée) : `20261119-1310-b` (inventaire des droits d'usage des échelles publiées servies, HAD d'abord) et `20261119-1311-b` (doublon `WN-SRC-0546` / `0564`). Rien n'est modifié par elles.
- Rang du journal H15 : `08` (`07` est le plus grand sur `origin/main`, aucune PR ouverte ne touche le journal).

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (neuf notices, 683 au total) et `docs/claude/corpus/README.md` (compteurs et plage) ; `docs/claude/plan-journal/H15/2026-11-19-08-ingestion-textes-integraux-besoins-3-8.md` ; `changelog.d/2026-11-19-besoins-3-8-ingestion-textes-integraux.md` ; ce handoff.
- Hors dépôt : lignes d'ingestion en production (26 passages, 48 claims, par la route interne), dossiers privés des besoins 3 et 8 (sections « Ingestion du 2026-11-19 », liste des PDF à fournir), questions et messages du registre, bloc-notes de la session (`recherches/ing/`).

## Validations exécutées

- Avant l'envoi : lecture seule en conteneur (aucune ligne au-delà de `0702` ni de `LOT_077`) ; validation des 26 passages et des 48 claims contre les contrats de la route (le même analyseur que la route, hors ligne).
- Envois : un conteneur `scalingo run -d` par série, charges en gzip et base64 en argument, réponses 200 sur les 18 appels, vérification de récupération des passages à similarité 1, vérification des claims (présent, statut, actif, embedding, lien, empreinte) toutes vraies.
- Constat après : lecture seule en conteneur, transaction annulée ; une ligne active par passage et par claim pour chacune des neuf sources, empreintes distinctes, claims `EN_ATTENTE_VALIDATION`. Pour le doublon, lecture seule aussi (état des 8 et 10 claims, des 6 et 24 passages).
- Documentation seule côté dépôt : contrôles du plan-journal et anti-secrets (résultats dans la PR). Vitest non joué (worktree sans `npm ci`). Pas de T2.

## Problèmes ouverts

- Envoi 3 du besoin 8 : licence incompatible avec la fouille de textes, en attente du responsable.
- Réponses aux deux questions (`1310-b`, `1311-b`) ; le registre des sources dit encore « claims en attente de signature » pour `WN-SRC-0564` alors que la base les montre signés (doublon, constat porté à la question).
- Vingt et un envois à résumé seul : PDF à fournir par le responsable (dix pour le besoin 3, onze pour le besoin 8, dont deux pages libres NICE et HAS).
- Besoin 10 : recherche approfondie reçue, à traiter ensuite (dépôt privé, vérification, rapprochement) ; aucune ingestion sans nouvel accord.

## Prochaine action exacte

1. CI de la tête (`node scripts/wn-attendre-ci.mjs <N>`, seul `0` vaut), revue de PR-Agent sur le sha de tête, boîte B relue, « prête @<sha> ».
2. Reprendre le besoin 10 : dépôt dans le dépôt privé, vérification des références (dont l'erratum de janvier 2026 de la méta-analyse de Stenzel), rapprochement avec le registre, tableau des envois (sécurité des précurseurs d'abord, M2 = B), puis s'arrêter à la liste des envois.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun code clinique avant signature et décision (J3-12f).
- Aucune ingestion hors de l'accord donné (dix envois nommés) ; aucun étiquetage dans ce lot ; la signature ne se délègue jamais.
- Aucune migration ; production lue seulement par `scalingo run -d`, écrite seulement par la route d'ingestion accordée. L'URL des dossiers privés reste hors dépôt.
