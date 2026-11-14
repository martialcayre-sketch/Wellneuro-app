# Handoff — 2026-11-14 — dossier de preuve du besoin 4, étape 4 : étiquetage et positions v0.1 (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin4-dossier-etape4`, créée sur `origin/main` 18c57d30 (#2132), puis avancée sans commit propre par
  `--ff-only` sur 304e5709 (#2133). Worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Lot `besoin4-dossier-etape4` du carnet (file B, ordre 65) : étiqueter au besoin 4 les claims signés, par délégation
permanente (`D-325` §5), puis rédiger les positions v0.1 au dossier privé, au gabarit du besoin 1, et les soumettre à
une contre-revue avant la signature.

## Décisions prises

- Boîte B (`D-503`) : `merge_fait` de #2132 passé à `traite`. L'intégrateur avait déjà clos `2045-b` à `2047-b` et
  passé `besoin5-dossier-ouvert` à `fait`. Lot `besoin4-dossier-etape4` pris au carnet.
- Lot 1 : les 45 claims signés, étiquetés au besoin 4 dans l'atelier. La répartition par rubrique suit le besoin 1.
  Aucun rejet.
- Question `20261114-2206-b` (E1, clinique), avis de Codex joint (A, confiance moyenne) : sur quels claims fonder les
  positions ? Tranchée **A** en séance par le responsable : lot 2 sélectif, seuls les claims que les positions citent.
- Lot 2 : 35 claims retenus, dont 27 de cours et 8 de la validation française de l'instrument d'intéroception. Les
  écarts sont motivés au dossier privé : marqueurs de perméabilité des cours, une autre grille d'hyperexcitabilité,
  options conditionnées à une perméabilité non mesurable, enfant, cas cliniques, doses d'autres besoins.
- Positions v0.1, de P1 à P24, en onglet du dossier privé, aucune signée. LBP, zonuline et la règle de séquence y sont
  « non évaluées ».
- Contre-revue : `wn-codex-avis.mjs` refuse les pièces privées (`D-505`). Pièces déposées au dépôt privé des revues,
  dossier `besoin4-perception/` (dernier commit 78f80c25). Comme au besoin 1, le lancement de Codex est un geste du
  responsable.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-14-05-dossier-besoin-4-etiquetage-positions.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-14-dossier-besoin-4-etiquetage-positions.md` (nouveau) ; ce handoff.
- Hors dépôt :
  - le dossier privé : sections Étiquetage, lots 1 et 2, constats compris ; onglet « Positions v0.1 » ; statut ;
  - la liste commune (`2206-b`), le registre et le carnet (page de la file D) ;
  - le dépôt privé des revues ;
  - le bloc-notes de la session : `b4e4/` (listes, avis, pièces) et `sig/` (requêtes et scripts de lecture par
    morceaux).

## Validations exécutées

- Lectures de production en lecture seule par `scalingo run -d`, transactions annulées :
  - one-off-7020 : 45 claims `VALIDE`, sans clés ;
  - one-off-3989 : répartition du besoin 1, prise pour précédent ;
  - one-off-3309 : 619 claims de cours sur six axes ;
  - one-off-9739 : texte entier des retenus ;
  - one-off-2067 : 113 claims des pièces de la contre-revue.
- Listes vérifiées par le lecteur de l'atelier (`lireListeEtiquetage`) : 45 lignes, puis 35, aucune erreur.
- Gestes dans l'atelier : « 45 claims étiquetés. », puis « 35 claims étiquetés. ».
- Constats par conteneur :
  - one-off-6911 : 45 claims au besoin 4, 45 actes ;
  - one-off-9029 : 80 claims au besoin 4, tous `VALIDE`, 80 actes, rubriques additives.
- Avis de Codex sur E1 : code 0. Aucune identité dans les pièces de contre-revue (contrôle par motifs). Le dépôt des
  revues est vérifié `PRIVATE` avant l'envoi.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- Contre-revue des positions v0.1 : à lancer par le responsable. Ensuite, un verdict par constat, la v0.2, puis la
  signature case par case.
- Une autre grille d'hyperexcitabilité au corpus (source 0048, autre échelle) : à rapprocher lors de la décision qui
  alignera la grille servie (`M2`).
- La source 0553 sert aussi le besoin 7. Son étiquetage futur devra poser « 4, 7 », car l'atelier remplace les clés.
- Toujours ouverts :
  - l'usage logiciel de la MAIA-2 ;
  - les droits de `0660`, `0661` et `0664` ;
  - le tableau M1 du dossier, encore en v1 ;
  - les parts 60/20/20 (`DC-21`) ;
  - la phrase ajoutée à `D-516` ;
  - l'étape 2 du besoin 5.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : `2206-b` passe à `close`, le lot à `fait`.
3. Lot suivant : verdicts sur la contre-revue, v0.2, signature. À défaut, l'étape 2 du besoin 5.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés. Aucun code clinique : `BESOIN_SOURCES`, grille servie et nouvel
  instrument relèvent de décisions distinctes (J3-12f).
- Étiquetage délégué sur les claims `VALIDE` seulement. La signature ne se délègue pas (`DC-16`), et aucune position
  n'est cochée par l'assistant.
- Aucune pièce privée dans un paquet de `wn-codex-avis.mjs`. Aucune migration ; pas de `prisma format`. Production lue
  seulement par `scalingo run -d`. Les URL du dossier privé restent hors dépôt.
