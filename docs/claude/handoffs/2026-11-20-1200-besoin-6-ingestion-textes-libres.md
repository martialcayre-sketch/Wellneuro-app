# Handoff — 2026-11-20 — dix textes libres du besoin 6 ingérés, lot de la file B

## Branche et état Git

- Branche `docs/besoin-6-ingestion-textes-libres`, créée sur `origin/main` 1e0fe302 (D-518, #2275 mergée). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel ». `git` et `gh` en direct. PR ouvertes relevées au moment d'écrire : #2269, #2276, #2178 ; aucune ne touche le registre des sources ni le journal H15.

## Objectif

Ingérer les dix textes libres du rapport de recherche du besoin 6 que le responsable a accordés le 2026-11-20, poser quatre notices seules, et en laisser la trace au dépôt : registre, `README` du corpus, journal H15, changelog.

## Décisions prises

- Accord du responsable : ingestion de dix textes (méta-analyse et essai de respiration consciente, revue sur le prāṇāyāma, revue de cas d'événements indésirables du yoga, étude de laboratoire sur l'hyperventilation avant apnée, méta-analyse sur l'oxymétrie de pouls, revue d'instruments pédiatrique, validation d'instruments de dyspnée, revue critique du trouble du schéma respiratoire, recommandations sur la variabilité de la fréquence cardiaque). Clause de licence relue dans chaque fichier avant l'envoi, avec balayage de la fouille de textes et de l'IA : aucune exclusion.
- Un lot par source, route interne, `WN-SRC-0746` à `0755`, `LOT_105` à `LOT_114` : 35 passages en extraits mot pour mot, 47 claims `EN_ATTENTE_VALIDATION`, sans clé de lien. Aucun item d'échelle, aucun seuil de score, aucune fréquence, durée ni dose repris ; les recommandations sont rapportées comme déclarées par les auteurs.
- Même cas que le besoin 12 : manuscrit d'auteur portant la mention de fouille de textes (`0755`), droits `to_verify`, réserve nommée (licence CC BY du rapport non confirmée, page de l'éditeur illisible). Textes CC BY-NC (`0753`, `0754`) en `to_verify`.
- Notices seules `0756` à `0759` : revue de 2026 dont la licence n'a pu être lue chez l'éditeur (page anti-robot ou authentification) et trois textes CC BY-NC-ND.
- À part, pour la fiche conseil `D-415` : `0749` et `0750`. Populations notées : `0750` (laboratoire, apnées à jeun), `0752` (enfants), `0753` (bronchopneumopathie obstructive).
- Rang du journal H15 : `03` du 2026-11-20.

## Fichiers modifiés

- `docs/claude/corpus/source_registry.json` (14 notices, 731 au total) et `docs/claude/corpus/README.md` ; `docs/claude/plan-journal/H15/2026-11-20-03-ingestion-textes-libres-besoin-6.md` ; `changelog.d/2026-11-20-besoin-6-ingestion-textes-libres.md` ; ce handoff.
- Hors dépôt : lignes d'ingestion en production (35 passages, 47 claims), dossier privé du besoin 6, bloc-notes de la session.

## Validations exécutées

- Avant l'envoi : lecture seule en conteneur (plus grand rang en base `0739`, plus grand lot `LOT_104`) ; construction des passages et des claims avec contrôle des ancres et des nombres (zéro problème après correction de deux ancres et d'un renvoi de passage).
- Envois : un conteneur, vingt appels, tous 200, vérification de récupération et vérification des claims vraies.
- Constat après : lecture seule en conteneur, transaction annulée ; 35 passages actifs aux empreintes distinctes, 47 claims actifs `EN_ATTENTE_VALIDATION`, aucun exclu de la recherche, aucun embedding manquant, aucune source au-delà de `0755`.
- Documentation seule côté dépôt : anti-secrets, contrôles du plan-journal et invariants du CI (résultats dans la PR). Vitest non joué. Pas de T2.

## Problèmes ouverts

- Claims des vingt sources des besoins 12 et 6 à valider par le responsable, puis étiquetage selon `D-325`.
- Besoin 10 : huit PDF à récupérer par le responsable. Besoin 6 : étapes suivantes après validation.
- Transcriptions de quatorze vidéos de cours à verser comme pièces internes (consigne du coordinateur, après ce lot).

## Prochaine action exacte

1. CI de la tête (`node scripts/wn-attendre-ci.mjs <N>`, seul `0` vaut), revue de PR-Agent sur le sha de tête, boîte B relue et commentaires en ligne, « prête @<sha> ».
2. Verser les transcriptions de cours comme pièces internes (notices seules au dépôt, `D-251` §4).

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés ; aucun code clinique avant signature et décision (J3-12f).
- Aucune ingestion hors de l'accord donné ; aucun étiquetage dans ce lot ; la signature ne se délègue jamais.
- Aucune migration dans ce lot ; production lue seulement par `scalingo run -d`, écrite seulement par la route d'ingestion accordée. L'URL des dossiers privés reste hors dépôt.
