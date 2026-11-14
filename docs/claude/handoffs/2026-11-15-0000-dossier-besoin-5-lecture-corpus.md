# Handoff — 2026-11-15 — dossier de preuve du besoin 5, étape 2 : lecture du corpus (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin5-dossier-etape2`, créée sur `origin/main` 6c46405a (#2134), puis avancée sans commit propre par
  `--ff-only` sur 0045026a (#2138). Worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin5-dossier-etape2` du carnet (file B, ordre 67). Lire le corpus par conteneur sur le périmètre élargi
(T3 = C) et relire les écarts de l'étape 1. Poser les manques en questions, avec l'avis de Codex joint. Documentation
seule.

## Décisions prises

- Boîte B (`D-503`) : `merge_fait` de #2134 passé à `traite`. Lot `besoin5-dossier-etape2` pris au carnet.
  `besoin4-dossier-positions-v02` laissé bloqué : aucun rendu Codex au dépôt privé des revues à 22:05. Depuis, #2138
  (autre session) a rendu la contre-revue et les positions v0.2.
- Lecture faite (constats : journal H15, `2026-11-14-07`) ; inventaire au dossier privé, section « Étape 2 ».
- Cinq questions cliniques versées à la liste commune, `20261114-2305-b` à `2309-b`. Avis de Codex à l'aveugle
  (`wn-codex-avis.mjs --mode question`, cinq avis conformes, code 0) : A, A, A, B, A. Tranchées par le responsable dans
  la session : M1 A, **M2 B contre la recommandation et Codex**, M3 A, M4 B (la recommandation suivait Codex),
  **M5 B contre la recommandation et Codex**. Statut `repondue` ; elles passent à `close` au merge.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-14-07-dossier-besoin-5-lecture-corpus.md` (nouveau). Rang 07 : #2138 a pris
  le 06.
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-14-dossier-besoin-5-lecture-corpus.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé du besoin 5 : statut, section « Étape 2 » et table M1 à M5 ;
  - la liste commune, le registre et le carnet (page de la file D) ;
  - le bloc-notes de la session, `b5e2/` : requêtes, sorties, paquets et avis Codex, `recoller.py`.

## Validations exécutées

- Lectures de production en lecture seule par `scalingo run -d`, transactions annulées :
  - one-off-3850 : comptes par axe et pièces des instruments ;
  - one-off-9098 : passages des pièces, mentions des instruments, carnets par axe ;
  - one-off-6965 : claims ciblés et seuils dans les passages ;
  - one-off-9080 : sources externes du registre ;
  - one-off-6344 : bandes des pièces pro.
- Sorties longues coupées en plusieurs lignes de log, recollées par `recoller.py` (bloc-notes), qui ne garde que le
  dernier démarrage du conteneur : one-off-6965 avait déjà servi le 2026-10-22.
- Avis Codex : cinq appels, `etat: conforme`.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Étape 3 du besoin 5, réunir les sources, chaque envoi sur accord :
  - ingérer `0392`, `0393`, `0396` et `0397` ;
  - tirer des claims des pièces en base et des sources externes du registre ;
  - inscrire puis ingérer les publications primaires du PSQI et de l'Epworth ;
  - chercher le GPAQ de l'OMS, une source pour la règle du guide (dont `0575`) et un instrument publié de mobilité.
- M2 B : deux lectures de l'Epworth coexistent au dossier. La finalité d'origine de l'échelle, dite par la pièce, se
  vérifie dans la publication.
- Hors de ce dossier, pour J3-12f :
  - le rattachement de `R-SOM-01` ;
  - l'alignement de la convergence ;
  - l'alignement des grilles servies (Epworth, quatre sous-échelles de `Q_MOD_01`).
- Le niveau B de l'agenda dans le guide est à corriger à la signature de la section du guide (`D-424` fait foi).
- Toujours ouverts, côté besoin 4 : la signature des positions v0.2 (#2138), l'usage logiciel de la MAIA-2, les droits
  de `0660`, `0661` et `0664`.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : `2305-b` à `2309-b` passent à `close`, le lot à `fait`.
3. Lot suivant : étape 3 du besoin 5 (à inscrire au carnet), en commençant par l'inscription des numéros WN-SRC :
   relire `main` et les PR ouvertes d'abord.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun seuil tiré de la mémoire de l'assistant.
- Aucun code clinique : `BESOIN_SOURCES`, convergence, grilles servies et nouvel instrument relèvent de décisions
  distinctes, appliquées par J3-12f.
- Aucune ingestion sans accord pour chaque envoi. Étiquetage délégué sur les claims `VALIDE` seulement ; la
  signature ne se délègue pas (`DC-16`).
- Aucune pièce privée dans un paquet de `wn-codex-avis.mjs`. Aucune migration ; pas de `prisma format`. Production lue
  seulement par `scalingo run -d`. L'URL du dossier privé reste hors dépôt.
