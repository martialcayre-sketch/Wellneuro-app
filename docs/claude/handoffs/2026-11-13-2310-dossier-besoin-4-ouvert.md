# Handoff — 2026-11-13 — dossier de preuve du besoin 4 ouvert (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin4-dossier-ouvert`, créée sur `origin/main` d9c4f769 (#2084), dans le worktree
  `.claude/worktrees/b-bp17-cadre`. #2079 est mergée (2938b1bb).
- Le 2026-11-14, `origin/main` avait avancé (481c2450, #2094, sans toucher les quatre fichiers) et le hook de
  fraîcheur refusait les corrections de revue (`D-518`) : commit rejoué sur 481c2450 par cherry-pick, sans conflit,
  sur arbitrage du responsable (question `20261114-0937-b`, A), puis poussé en `--force-with-lease`.
- Session concurrente de la file B : `git` et `gh` en direct, sans `/wn-*`.

## Objectif

Étape 1 du dossier de preuve du besoin 4, au modèle de l'ouverture du besoin 1 (journal H15, `2026-11-12-08`) :
état initial lu dans le code, dossier privé ouvert, questions d'arbitrage, PR de documentation opaque. Sans code.

## Décisions prises

- Boîte B du registre (`D-503`) : `20261113-2141-integrateur-b` (`merge_fait` de #2079) et `20261113-2235-d-3`
  (réponse à `20261113-2312-b` : options de `R2-ALI-01` au cadrage de J3-12f) passées à `traite`. Ce dossier ne
  rouvre pas `R2-ALI-01`.
- Carnet (`D-510`) : lot `besoin4-dossier-ouvert` inscrit (file B, ordre 54) et pris.
- Dossier privé « Perception et sensations corporelles (besoin 4) » ouvert en Claude Doc (lien hors dépôt) :
  statut, « À trancher en premier » (T1 à T3), cadre (état initial, acquis, interdits).
- Questions versées à la liste commune et tranchées par le responsable dans la session :
  `20261113-2257-b` (support, ordinaire) A ; `20261113-2258-b` (sources, clinique) A ;
  `20261113-2259-b` (périmètre des variables, clinique) **C, contre la recommandation** (A) : la perception
  corporelle au sens large entre au dossier, chaque variable ajoutée sourcée ou déclarée « non évalué ».

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-13-05-dossier-besoin-4-ouvert.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-13-dossier-besoin-4-ouvert.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé ; les lignes de la liste commune, du registre et du carnet.

## Validations exécutées

- `node scripts/wn-plan-journal-rubriques.mjs` : `exit=0`.
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.
- Tête 0c5160b1 : CI `0`, PR-Agent `0` avec une remarque (mot d'état de la ligne du plan), corrigée.
  `wn-reviewer` : GO, sans P0 ni P1 ; P2-1 (« à appliquer » avec J3-12f), P2-2 (libellé muet sur la matrice, non
  repris par le résolveur), P2-3 (sha de lecture) et P2-4 (mot d'état) sont corrigés. Ses deux questions sont
  écartées : le message `20261113-2235-d-3` existe au registre et répond bien à `2312-b` ; l'horodatage du handoff
  est sans effet, puisque `D-372` §2 juge le dernier handoff par branche.

## Problèmes ouverts

- Écart de registre : `instrument_registry.json` décrit le TFD sans bande servie, le catalogue en sert ; à relire à
  l'étape 2, sans correction dans ce lot.
- `Q_INF_01` alimente le besoin 4 au score sans y être rattaché en convergence : constat d'état initial, à relire
  avec le périmètre élargi (T3 = C).
- Toujours ouverts hors de ce lot : les parts 60/20/20 (responsable, `DC-21`) ; la confirmation de la phrase
  « Ne touche pas » ajoutée à `D-516` après validation.

## Prochaine action exacte

1. CI de la tête en tâche de fond (`wn-attendre-ci.mjs`) ; seul `0` vaut.
2. Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un verdict par remarque.
3. Relire la boîte B et la ligne du carnet, puis déclarer « prête @<sha> » ; l'intégrateur merge.
4. Ensuite : l'étape 2 du dossier (lecture du corpus par conteneur, en lecture seule), sur les variables du guide et
   de la perception corporelle au sens large.

## Interdits encore actifs

- Ni texte de claim, ni valeur, ni seuil, ni analyte rattaché à une règle, ni rubricage au dépôt, dans les tests ou
  les commits (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucun poids inventés ; aucun code clinique avant la signature et la décision (`D-312` §3).
- Rien d'ingéré ni de signé ; l'étiquetage délégué ne porte que sur des claims `VALIDE` (`DC-16`).
- Aucune migration ; pas de `prisma format` ; production lue seulement par `scalingo run -d`. L'URL du dossier privé
  reste hors dépôt.
