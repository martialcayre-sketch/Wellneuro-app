# Handoff — 2026-11-20 — ingestion de neuf textes libres du besoin 12, sept notices seules, lot de la file B

## Branche et état Git

- Branche `docs/besoin-12-ingestion-textes-libres`, créée sur `origin/main` 8c1d3bde (D-518 : la branche précédente, squashée par #2273, ne contenait plus la tête). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. PR ouvertes relevées au moment d'écrire : #2269, #2178 ; aucune ne touche le registre des sources ni le journal H15.

## Objectif

Verser au corpus les textes libres du besoin 12 dont la licence n'exclut ni la fouille de textes ni l'IA, sur l'accord du responsable du 2026-11-20, ajouter les notices sans texte des autres références, et en laisser la trace au dépôt : registre, compteurs du `README` du corpus, journal H15, changelog. Aucun étiquetage.

## Décisions prises

- Un lot par source, route interne de production, paquets de dix passages au plus (ici de trois à cinq), claims entrés `EN_ATTENTE_VALIDATION`, sans clé de lien. Identifiants : `WN-SRC-0730` à `0738`, lots `LOT_095` à `LOT_103` du 2026-11-20. Marge relevée avant l'envoi : plus grand `sourceId` en base `0719`, plus grand lot `LOT_094` ; les rangs `0721` à `0729` sont des notices du registre (#2273), d'où le départ à `0730`.
- Clause de licence relue dans le bloc de droits de chaque texte avant l'envoi : six CC BY 4.0, deux CC BY-NC (sans clause d'exclusion), un texte à licence CC BY de l'article sous réserve générale de son éditeur. Passages en extraits mot pour mot, relus contre le texte récupéré (Europe PMC) ; chiffres des claims contrôlés contre le passage cité par l'outil de construction ; aucun item d'échelle reproduit.
- Hoang 2022 (`0738`) : ingestion malgré la réserve de fouille de textes et d'IA du pied de page JAMA, contre la recommandation de la session (notice seule) ; le responsable fait primer la licence CC BY de l'article ; réserve nommée à la notice (`rightsStatus` à vérifier) et au dossier privé.
- Notices seules `WN-SRC-0739` à `0745` : Matthews et Reinhardt (politique de fouille de l'éditeur illisible, 403), trois CC BY-NC-ND, un manuscrit sans licence, un texte non libre.
- Rang du journal H15 : `01` du 2026-11-20 (aucun fragment de ce jour sur `origin/main`).

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (seize notices, 717 au total) et `docs/claude/corpus/README.md` (compteurs et plage) ; `docs/claude/plan-journal/H15/2026-11-20-01-ingestion-textes-libres-besoin-12.md` ; `changelog.d/2026-11-20-besoin-12-ingestion-textes-libres.md` ; ce handoff.
- Hors dépôt : lignes d'ingestion en production (36 passages, 55 claims, par la route interne), dossiers privés des besoins 12 et 10, bloc-notes de la session (`recherches/ing/`).

## Validations exécutées

- Avant l'envoi : lecture seule en conteneur (aucune ligne au-delà de `0719` ni de `LOT_094`) ; construction des 36 passages et des 55 claims avec contrôle des ancres et des nombres contre les passages cités (zéro problème).
- Envois : un conteneur `scalingo run -d`, charges en gzip et base64 en argument, réponses 200 sur les 18 appels, vérification de récupération des passages et vérification des claims (présent, statut, actif, embedding, lien, empreinte) vraies.
- Constat après : lecture seule en conteneur, transaction annulée ; une ligne active par passage et par claim pour chacune des neuf sources, empreintes distinctes, claims `EN_ATTENTE_VALIDATION`, aucun exclu de la recherche. Le décompte des liens passage-claim par requête a échoué (nom de colonne) ; les liens ont été vérifiés à l'envoi, claim par claim.
- Documentation seule côté dépôt : anti-secrets, contrôles du plan-journal et invariants du CI (résultats dans la PR). Vitest non joué (worktree sans `npm ci`). Pas de T2.

## Problèmes ouverts

- Claims des neuf sources à valider par le responsable, puis étiquetage selon `D-325`.
- Matthews (`0739`) : la copie de manuscrit PMC est marquée disponible pour la fouille de textes et la licence CC BY est déposée par l'éditeur, mais la page de l'éditeur est illisible ; à rouvrir si le responsable l'arbitre. Reinhardt (`0740`) : politique de fouille de Sage illisible.
- Besoin 10 : huit PDF à récupérer par le responsable (envois 3, 5, 6, 10, 13, 14, 20, 23), dont Farias NC-ND en exception assumée ; aucune ingestion avant réception.

## Prochaine action exacte

1. CI de la tête (`node scripts/wn-attendre-ci.mjs <N>`, seul `0` vaut), revue de PR-Agent sur le sha de tête (`node scripts/wn-revue-pr-agent.mjs <N>`), boîte B relue et commentaires en ligne, « prête @<sha> ».
2. Attendre les PDF du besoin 10, puis l'accord du responsable avant tout nouvel envoi.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun code clinique avant signature et décision (J3-12f).
- Aucune ingestion hors de l'accord donné ; aucun étiquetage dans ce lot ; la signature ne se délègue jamais.
- Aucune migration dans ce lot ; production lue seulement par `scalingo run -d`, écrite seulement par la route d'ingestion accordée. L'URL des dossiers privés reste hors dépôt.
