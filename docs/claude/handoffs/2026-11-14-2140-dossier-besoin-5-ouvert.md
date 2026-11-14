# Handoff — 2026-11-14 — dossier de preuve du besoin 5 ouvert (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-dossier-ouvert`, créée sur `origin/main` 68bf4a73 après le merge de #2124. Elle a été
  avancée sans commit propre par `--ff-only` sur dffdd573 (#2131), qui ne touche aucun des fichiers lus. Worktree
  `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Le carnet de la file B n'avait plus de lot `pret`. L'étape 4 du besoin 4 demande des claims signés ; or aucun ne l'est
(constat par conteneur). La session a donc pris la suite de la ligne « dossiers des autres besoins » (ordre 1, 4, 5,
9) : étape 1 du dossier du besoin 5, au gabarit des besoins 1 et 4. Sans code, rien d'ingéré.

## Décisions prises

- Boîte B (`D-503`) : `20261114-2035-integrateur-b-2124` (`merge_fait` de #2124) passé à `traite`. L'intégrateur
  avait déjà passé `besoin4-dossier-etape3-suite` à `fait` et clos `1404-b`.
- Constat de signature : one-off-7941, lecture seule, transaction annulée. Les 44 claims des sources du besoin 4
  (`0446`, `0447`, `0463`, `0464`, `0660` à `0665`) et `WN-CL-0553-010` sont tous `EN_ATTENTE_VALIDATION`. L'option a
  est donc impossible.
- Carnet (`D-510`) : lot `besoin5-dossier-ouvert` inscrit (file B, ordre 64) et pris.
- Dossier privé « Mouvements, fonctions corporelles et repos (besoin 5) » ouvert en Claude Doc, lien hors dépôt. Il
  contient le statut, « À trancher en premier » (T1 à T3) et le cadre (état initial, acquis, interdits).
- Questions versées à la liste commune, avec l'avis de Codex joint : `wn-codex-avis.mjs --mode question`, trois avis
  conformes, code 0, A pour les trois. Elles ont été tranchées par le responsable dans la session :
  - `20261114-2045-b` (support, ordinaire) : A ;
  - `20261114-2046-b` (sources, clinique) : A ;
  - `20261114-2047-b` (périmètre, clinique) : **C, contre la recommandation et l'avis de Codex**. Les fonctions
    corporelles au sens large entrent au dossier (mobilité, fatigue comme axe propre, rythme biologique). Chaque
    variable ajoutée est sourcée ou déclarée « non évalué ». `D-438` est relue sans être rouverte. Les conditions de
    retour de `PRIO-FAT` et `PRIO-MOB` sont relues, sans être réputées remplies.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-14-04-dossier-besoin-5-ouvert.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-14-dossier-besoin-5-ouvert.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé ;
  - les lignes de la liste commune, du registre et du carnet (page de la file D) ;
  - dans le bloc-notes de la session : les paquets et avis Codex (`b5/`) et la requête du constat (`sig/`).

## Validations exécutées

- Lecture de production en lecture seule par `scalingo run -d` (one-off-7941, `BEGIN TRANSACTION READ ONLY` …
  `ROLLBACK`) : agrégats par source et statut seulement.
- Avis Codex : trois appels, état `conforme`, dossier vide intact, aucun élément interdit.
- Fichiers lus inchangés entre 68bf4a73 et dffdd573 (`git diff --stat` vide).
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Écarts relevés, à relire à l'étape 2, sans correction dans ce lot :
  - le guide donne à l'agenda un niveau de preuve différent de celui que `D-424` signe ;
  - `R-SOM-01` lit le PSQI mais n'est pas rattachée au besoin 5 ;
  - la source du mouvement, l'Epworth, le MFI-20 et l'agenda manquent à la convergence.
- Réserves de Codex sur T2, gardées au dossier :
  - une publication du GPAQ ou du NAP ne valide pas le sous-score SIIN servi ;
  - distinguer faible activité physique et sédentarité.
- Besoin 4 : signature dans l'atelier toujours attendue (M1, grille 0446, `LOT_060`, `LOT_061`). L'étape 4
  (étiquetage, positions) se prend dès qu'elle est faite.
- Toujours ouverts :
  - l'usage logiciel de la MAIA-2 ;
  - les droits de `0660`, `0661` et `0664` ;
  - le tableau M1 du dossier du besoin 4, encore en v1 (la v2 fait foi) ;
  - les parts 60/20/20 (`DC-21`) ;
  - la phrase ajoutée à `D-516`.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : `2045-b` à `2047-b` passent à `close`, le lot à `fait`.
3. Ensuite : étape 2 du besoin 5, lecture du corpus par conteneur, sur le périmètre élargi (T3 = C) ; ou l'étape 4
   du besoin 4 si les claims sont signés entre-temps.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés. Aucun code clinique : `BESOIN_SOURCES`, convergence et nouvel
  instrument relèvent de décisions distinctes, appliquées par J3-12f.
- Aucune ingestion sans accord pour chaque envoi. Étiquetage délégué sur les claims `VALIDE` seulement ; la
  signature ne se délègue pas (`DC-16`).
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL du dossier privé
  reste hors dépôt.
