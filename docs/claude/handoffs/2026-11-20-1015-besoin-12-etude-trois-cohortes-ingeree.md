# Handoff — 2026-11-20 — étude de trois cohortes du besoin 12 ingérée, lot de la file B

## Branche et état Git

- Branche `docs/besoin-12-matthews-ingere`, créée sur `origin/main` 513fcd72 (D-518 : la branche précédente avait été squashée par #2274). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. PR ouvertes relevées au moment d'écrire : #2269, #2178 ; aucune ne touche le registre des sources ni le journal H15.

## Objectif

Ingérer l'étude de trois cohortes du besoin 12 jusque-là en notice seule (`WN-SRC-0739`), sur le second accord du responsable du 2026-11-20, et en laisser la trace au dépôt : notice du registre, `README` du corpus, journal H15, changelog.

## Décisions prises

- Arbitrage du responsable : la licence CC BY déposée par l'éditeur et la mention de fouille de textes du dépôt de manuscrits suffisent, comme pour la méta-analyse `0738`. Réserve nommée : page de l'éditeur illisible (403), licence de fouille d'Elsevier lue limitée au contenu sous abonnement et muette sur l'IA ; droits `to_verify`.
- Un lot, route interne, `WN-SRC-0739`, `LOT_104` du 2026-11-20 : 4 passages en extraits mot pour mot (texte du manuscrit d'auteur), 7 claims `EN_ATTENTE_VALIDATION`, sans clé de lien. Famille exploratoire, sans usage clinique. Marge relevée avant l'envoi : plus grand lot en base `LOT_103`, rang `0739` libre en base.
- Les passages évitent la méthode (descriptions de mesures) et les recommandations cliniques de la discussion ; aucun item d'échelle reproduit ; les valeurs de dosages du résultat transversal ne sont pas reprises.
- Rang du journal H15 : `02` du 2026-11-20.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (notice `0739` mise à jour, 717 notices) et `docs/claude/corpus/README.md` ; `docs/claude/plan-journal/H15/2026-11-20-02-matthews-ingere-besoin-12.md` ; `changelog.d/2026-11-20-besoin-12-etude-trois-cohortes-ingeree.md` ; ce handoff.
- Hors dépôt : lignes d'ingestion en production (4 passages, 7 claims), dossier privé du besoin 12, bloc-notes de la session.

## Validations exécutées

- Avant l'envoi : lecture seule en conteneur (aucun lot au-delà de `LOT_103`) ; construction des passages et des claims avec contrôle des ancres et des nombres (zéro problème).
- Envois : réponses 200 sur les 2 appels, vérification de récupération et vérification des claims vraies.
- Constat après : lecture seule en conteneur, transaction annulée ; 4 passages actifs aux empreintes distinctes, 7 claims actifs `EN_ATTENTE_VALIDATION`, aucun exclu de la recherche, aucun embedding manquant.
- Documentation seule côté dépôt : anti-secrets, contrôles du plan-journal et invariants du CI (résultats dans la PR). Vitest non joué. Pas de T2.

## Problèmes ouverts

- Claims des dix sources du besoin 12 à valider par le responsable, puis étiquetage selon `D-325`.
- Reinhardt (`0740`) reste en notice seule (politique de fouille de Sage illisible).
- Besoin 10 : huit PDF à récupérer par le responsable ; besoin 6 : rapport de recherche approfondie à traiter, aucun envoi sans accord.

## Prochaine action exacte

1. CI de la tête (`node scripts/wn-attendre-ci.mjs <N>`, seul `0` vaut), revue de PR-Agent sur le sha de tête, boîte B relue et commentaires en ligne, « prête @<sha> ».
2. Traiter le rapport du besoin 6 (vérification, table des envois, arrêt pour accord).

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun code clinique avant signature et décision (J3-12f).
- Aucune ingestion hors de l'accord donné ; aucun étiquetage dans ce lot ; la signature ne se délègue jamais.
- Aucune migration dans ce lot ; production lue seulement par `scalingo run -d`, écrite seulement par la route d'ingestion accordée. L'URL des dossiers privés reste hors dépôt.
