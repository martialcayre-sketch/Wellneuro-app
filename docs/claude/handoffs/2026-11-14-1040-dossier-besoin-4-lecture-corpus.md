# Handoff — 2026-11-14 — dossier de preuve du besoin 4, étape 2 : lecture du corpus (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin4-dossier-etape2`, créée sur `origin/main` a66b8e06 (après le merge de #2088 en 52250953),
  dans le worktree `.claude/worktrees/b-bp17-cadre`.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Étape 2 du dossier du besoin 4, sur l'accord du responsable (« go », 2026-11-14) : lire le corpus en production par
conteneur, inventorier hors dépôt, poser chaque manque en question, puis s'arrêter pour arbitrage.

## Décisions prises

- Questions de l'étape 1 (`20261113-2257-b`, `2258-b`, `2259-b`) et `20261114-0937-b` passées à `close` après le
  merge de #2088.
- Boîte B du registre (`D-503`) : `merge_fait` de #2088 et la relance de #2085 passés à `traite` ; les messages sur
  #2085, #2090 et D-513 v36 sont lus et laissés à leurs sessions (File B Bis, file A).
- Carnet (`D-510`) : lot `besoin4-dossier-etape2` inscrit (file B, ordre 61) et pris.
- Lecture en production, en lecture seule (transaction annulée), par deux conteneurs : one-off-7064 et one-off-5085.
  Requêtes jouées d'abord à blanc sur une base locale. Inventaire au dossier privé (section de lecture, deux tables),
  hors dépôt ; faits de l'état initial corrigés au dossier (zonuline : libellé non repris, pas de matrice absente).
- Cinq manques posés en questions cliniques (liste commune, file B) : `20261114-1030-b` à `1034-b` (M1 à M5),
  recommandés A, A, A, A, B. Tranchés par le responsable dans la session (`repondue`, à passer à `close` au merge) :
  M1 A, M2 A, M3 A ; **M4 C** (chercher une source de la séquence, aucune règle entre-temps) et **M5 C** (un
  instrument d'intéroception publié à choisir et sourcer), tous deux contre la recommandation. Reportés au dossier.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-14-01-dossier-besoin-4-lecture-corpus.md` (nouveau).
- `changelog.d/2026-11-14-dossier-besoin-4-lecture-corpus.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé du besoin 4 ; la liste commune, le registre et le carnet (page de la file D) ; la
  mémoire `dossier-besoin-4-perception.md`.

## Validations exécutées

- `node scripts/wn-plan-journal-rubriques.mjs` : `0` ; `node --test scripts/lib/plan-journal.test.mjs` : `0`.
- `bash scripts/check_no_secrets.sh` : `0` ; T1 complet (`npm run check`) : `0`. Pas de T2 : documentation seule.
- Première tête cd7d11da : CI `0`.

## Problèmes ouverts

- Le registre des instruments décrit le TFD sans bande servie : à corriger dans un lot de registre, sans changement
  clinique.
- M2 = A : une décision distincte et un lot de catalogue (`questions.ts` sous instantané) aligneront la grille servie
  de `Q_INF_01`, hors de J3-12f, après signature de la grille au dossier.
- M5 = C : le choix de l'instrument d'intéroception (licence, version française, validation) est à proposer au
  dossier ; son entrée au catalogue et au score demandera une décision et du code, avec relèvement de version.
- M4 = C : aucune source connue au corpus ; si la recherche n'aboutit pas, la question revient au responsable.
- Toujours ouverts hors de ce lot : les parts 60/20/20 (responsable, `DC-21`) ; la confirmation de la phrase ajoutée à
  `D-516` après validation.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut) ; revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque.
2. Relire la boîte B, puis déclarer « prête @<sha> » ; l'intégrateur merge. Au merge, passer M1 à M5 à `close`.
3. Étape 3 : réunir les sources (claims des quatre pièces, source externe de LBP et de zonuline, source de la
   séquence, instrument d'intéroception), ingestion sur accord, envoi par envoi, collision WN-SRC vérifiée sur `main`
   et les PR ouvertes ; puis étiquetage et positions.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les
  messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun code clinique : `BESOIN_SOURCES`, la convergence et la lecture
  biologique partent avec J3-12f, après signature et décision (`D-312` §3) ; `questions.ts` reste intact.
- Aucune ingestion, aucun étiquetage, aucune signature sans accord. Aucune migration, aucune écriture en base ; pas de
  `prisma format`. Production lue seulement par `scalingo run -d`. L'URL du dossier privé reste hors dépôt.
