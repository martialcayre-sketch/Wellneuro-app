# Handoff — 2026-11-14 — dossier de preuve du besoin 4, étape 5 : contre-revue et positions v0.2 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin4-dossier-etape5`, créée sur `origin/main` 6c46405a (#2134). Worktree
  `.claude/worktrees/file-d1-suite`.
- Avant le lot, ce worktree portait encore `feat/export-pdf-biologie`. #2105 a été mergée par squash : la branche est
  morte et n'a pas été touchée.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin4-dossier-positions-v02` du carnet (file B, ordre 66) : rendre un verdict sur chaque constat de la
contre-revue de Codex, puis rédiger les positions v0.2 au dossier privé, prêtes pour la signature du responsable.

## Décisions prises

- La contre-revue a été lancée par le responsable et versée au dépôt privé des revues (`besoin4-perception/`,
  commit e1cf448). Verdict : GO avec corrections. Treize affirmations ; huit constats, dont trois P1, aucun P0.
- Chaque constat est recoupé avec le texte des claims lus par conteneur (pièce `claims.txt`). Les huit sont exacts et
  corrigés. Le constat sur les frontières des grilles est aussi routé à la décision distincte de la grille servie
  (J3-12f).
- Deux affirmations réfutées hors constats donnent aussi lieu à une correction : l'attribution des limites des
  marqueurs de perméabilité, et l'attribution d'un repère d'apport.
- La correspondance des frontières est lue dans le code (`web/src/lib/questions.ts`, sur `main` 6c46405a). Le
  questionnaire servi range sans provenance les valeurs que la pièce ne couvre pas, et ce rangement n'est pas uniforme.
  Ce fait est routé, et aucun code n'est changé.
- La v0.2 est rédigée dans un onglet distinct du dossier privé. La v0.1 reste pour trace. Le statut et deux mentions
  antérieures de la grille de cours d'hyperexcitabilité sont corrigés dans le premier onglet. Aucune position n'est
  signée.
- Boîte B (`D-503`) : aucune ligne `emis`. Le lot du carnet est passé à `pris`.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-14-06-dossier-besoin-4-contre-revue-v02.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-14-dossier-besoin-4-contre-revue-v02.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé : section « Contre-revue des positions v0.1 », statut, deux corrections ; onglet
    « Positions v0.2 » ;
  - le carnet (page de la file D) ;
  - le bloc-notes de la session : copies des pièces et de la revue.

## Validations exécutées

- Recoupement des huit constats avec le texte des claims cités, dans la pièce lue en production (one-off-2067,
  étape 4).
- Lecture du questionnaire servi dans le code, pour la correspondance des frontières.
- T1 rapide : vert (16 étapes). T1 complet et anti-secrets : résultats donnés dans la PR. Pas de T2 : documentation
  seule.
- Aucune lecture de production dans ce lot.

## Problèmes ouverts

- Signature des positions v0.2, case par case, par le responsable.
- Rangement des frontières des deux grilles, et vérification dans le code de la position d'éligibilité : décision
  distincte de la grille servie (J3-12f).
- Toujours ouverts :
  - l'usage logiciel de la MAIA-2 ;
  - les droits de `0660`, `0661` et `0664` ;
  - le tableau M1 du dossier, encore en v1 ;
  - les parts 60/20/20 (`DC-21`) ;
  - la phrase ajoutée à `D-516` ;
  - l'étape 2 du besoin 5, tenue par une autre session.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : le lot passe à `fait`.
3. Après la signature du responsable : la constater au dossier, puis préparer la décision clinique du guide (`D-312`
   §3), au gabarit de `D-516` pour le besoin 1.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés. Aucun code clinique : `BESOIN_SOURCES`, grille servie, rangement
  des frontières et nouvel instrument relèvent de décisions distinctes (J3-12f).
- La signature ne se délègue pas (`DC-16`) : aucune position n'est cochée par l'assistant.
- Aucune pièce privée dans un paquet de `wn-codex-avis.mjs`. Aucune migration ; pas de `prisma format`. Production lue
  seulement par `scalingo run -d`. Les URL du dossier privé restent hors dépôt.
