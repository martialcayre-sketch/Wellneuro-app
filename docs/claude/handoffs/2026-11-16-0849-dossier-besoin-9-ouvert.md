# Handoff — 2026-11-16 — dossier de preuve du besoin 9 ouvert (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin9-dossier-ouvert`, créée sur `origin/main` 43abb6d7 dans le worktree
  `.claude/worktrees/b-besoin4-decision-guide` : la branche de #2157 y était mergée et le worktree propre, et la
  création d'un worktree neuf était refusée depuis la session. Avancée sans commit propre par `--ff-only` sur
  cbe52d14, qui ne touche aucun des fichiers lus.
- Session concurrente (file B) : `git` et `gh` en direct, pas de `/wn-*`.

## Objectif

Le carnet de la file B n'avait plus de lot `pret`. Pour le besoin 5, le responsable a répondu qu'aucun de ses deux
gestes n'était fait (signature des 37 claims, lancement de la contre-revue) : le lot `besoin5-dossier-positions-v02`
reste `bloque`. La session a donc pris la suite de la ligne « dossiers des autres besoins » (ordre 1, 4, 5, 9) :
étape 1 du dossier du besoin 9, au gabarit des besoins 1, 4 et 5. Sans code, rien d'ingéré.

## Décisions prises

- Boîte B (`D-503`) : `20261115-2222-integrateur-b-2157` (merge de #2157) et `20261116-0817-d-b` (consigne des
  résumés pour la page BioFlow, laissée à la session qui la tient) passés à `lu`. Carnet : `besoin4-decision-guide`
  à `fait`, vérifié.
- Carnet (`D-510`) : lot `besoin9-dossier-ouvert` inscrit (file B, ordre 85) et pris.
- Dossier privé « Sensations-émotions fondamentales et gestion du stress (besoin 9) » ouvert en Claude Doc, lien hors
  dépôt : statut, « À trancher en premier » (T1 à T3), cadre (état initial, acquis, interdits).
- Fait relevé : la cible signée du 2026-10-18 (journal H15, `2026-10-18-02`) retire `Q_STR_01` et `Q_STR_03` du
  besoin 9 à J3-12f ; `D-424` ne signe donc pas leur niveau de preuve. Acquis, non rouvert.
- Questions versées à la liste commune, avec l'avis de Codex joint : `wn-codex-avis.mjs --mode question`, trois avis
  conformes, code 0 (A, A, C). Tranchées par le responsable dans la session :
  - `20261116-0846-b` (support, ordinaire) : A ;
  - `20261116-0847-b` (sources, clinique) : A ;
  - `20261116-0848-b` (périmètre, clinique) : C, avec la recommandation et Codex.
- Rang du journal H15 : `02`, parce que #2161 (besoin 5, étape 5, autre session) porte `2026-11-16-01`.

## Fichiers modifiés

- `docs/claude/plan-journal/H15/2026-11-16-02-dossier-besoin-9-ouvert.md` (nouveau).
- `docs/claude/PLAN_WELLNEURO.md` : ligne « dossiers des autres besoins », dernière colonne.
- `changelog.d/2026-11-16-dossier-besoin-9-ouvert.md` (nouveau) ; ce handoff.
- Hors dépôt : le dossier privé ; les lignes de la liste commune, du registre et du carnet (page de la file D) ;
  les paquets et avis Codex dans le bloc-notes de la session (`b9/`).

## Validations exécutées

- Aucune lecture de production : l'étape 1 lit le code seulement.
- Avis Codex : trois appels, état `conforme`, dossier vide intact, aucun élément interdit.
- Fichiers lus inchangés entre 43abb6d7 et cbe52d14 (l'avance ne touche que F05 et `D-501`).
- Anti-secrets et T1 complet : résultats donnés dans la PR. Pas de T2 : documentation seule.

## Problèmes ouverts

- **Chevauchement avec #2161** : les deux PR modifient la même cellule de la ligne « dossiers des autres besoins » du
  plan. La seconde à merger fusionne `origin/main` et garde les deux ajouts.
- **Besoin 5** : #2161 annonce des claims externes signés et une contre-revue rendue, alors que le responsable avait
  répondu « rien fait » au début de ce lot ; la ligne `besoin5-dossier-positions-v02` du carnet était `bloque` à
  07:20 UTC. À rapprocher par la session de #2161, pas ici.
- Réserves de Codex, gardées au dossier : la règle « protocole d'urgence » et ses interventions exigent leurs propres
  preuves ; distinguer le CAR du cortisol isolé ; distinguer stress, épuisement et burn-out contre les doubles
  comptes ; la traduction servie de la PSS-10 reste à confirmer.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut). Revue PR-Agent prouvée, sinon `wn-reviewer` (`D-448`) ; un
   verdict par remarque. Relire la boîte B, puis déclarer « prête @<sha> » sur la PR et au registre.
2. Au merge : `0846-b` à `0848-b` passent à `close`, le lot à `fait`.
3. Ensuite : étape 2 du besoin 9, lecture du corpus par conteneur, sur le périmètre élargi (T3 = C).

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests,
  ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique : `BESOIN_SOURCES`,
  convergence et nouvel instrument relèvent de décisions distinctes, appliquées par J3-12f.
- Aucune ingestion sans accord pour chaque envoi. Étiquetage délégué sur les claims `VALIDE` seulement ; la
  signature ne se délègue pas (`DC-16`).
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL du dossier privé
  reste hors dépôt. Ne pas toucher au worktree `file-d1-suite`.
