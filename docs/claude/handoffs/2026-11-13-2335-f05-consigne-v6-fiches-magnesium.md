# Handoff — F05 (BP-12a) : consigne v6 après le refus des fiches du magnésium

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-textes-mg`, partie d'`origin/main` après le merge de #2077 (v5), puis avancée par `--ff-only` tant qu'elle était vide. Un seul commit de lot.
- Branches locales `f05-textes-magnesium` et `f05-consigne-v5` : sans objet, leur contenu est sur `main`.

## Objectif

Rédiger les fiches d'usage du magnésium (`FU_MG_P1` à `P8`). Sous la v5, toutes sont refusées : la v6 de la consigne lève les défauts structurels et les contradictions constatés.

## Décisions prises

- Responsable, 2026-11-13 : `HYP_MG_1` n° 1 validé par lui-même à l'écran, sans délégation. « v6 de la rédaction », contre un essai identique, la mise en attente du magnésium et une boucle de révision.
- D-501 §9 (statut **accepté**, approbation du responsable du 2026-11-13). La « question » s'écrit en phrase interrogative. Aucune phrase ne dit ce que les sources taisent, hors la phrase d'absence. La « population » ne nomme que la population. L'objet des rubriques vient du cadrage v3 §3.2, et il est donné aux deux modèles. Consigne `fiche-usage-v6`, empreinte `fd994955a037a754` (approuvée après la correction du constat PR-Agent ; première empreinte approuvée `5097666dc4e683ce`).
- **À signaler à l'approbation** : l'objet des rubriques entre aussi dans la consigne de contre-lecture. C'est plus que « la rédaction seule » annoncée dans la question d'arbitrage ; c'est motivé par un refus de P7 (surveillance jugée hors de « surveillance_arret »).

## Fichiers modifiés

- `tools/corpus/fiches-usage/consignes/redaction.md`, `consignes/contre-lecture.md`, `lib/consigne.mjs`, `lib/consigne.test.mjs` (banc v6).
- `tools/corpus/fiches-usage/README.md`, `docs/TRUST_IA_FICHES_USAGE.md`, `docs/decisions/D-501.md` (§9).
- `changelog.d/2026-11-13-d501-consigne-fiches-usage-v6.md`, `docs/claude/plan-journal/F05/2026-11-13-03-textes-magnesium-fiches-consigne-v6.md`.

## Validations exécutées

- Production, lecture par conteneur : `HYP_MG_1` n° 1 est `validee` sur le texte déposé (one-off-2982). Les empreintes des trois libellés du magnésium sont égales à celles des brouillons locaux (one-off-2248). Aucune version de fiche du magnésium, des polyphénols ou du zinc.
- Rédaction v5 des huit fiches : 0 sur 8, 26 rubriques refusées. Rapports hors dépôt, `~/.wellneuro/corpus/fiches-usage/FU_MG_P*/2026-11-13T2*-revue.json`.
- Bancs `tools/corpus/fiches-usage/lib/*.test.mjs` : 20 sur 20 ; `run-certify-bancs.sh` et `npm run check` avant le commit.

## Problèmes ouverts

- La v6 est **approuvée** par le responsable le 2026-11-13, après l'avis Codex (trois P2 corrigés ; dépôt privé `wellneuro-revues`, `f05/2026-11-13-avis-codex-consigne-v6.md`) et l'avertissement sur la contre-lecture. D-501 §9 est « accepté ». Reste le merge par l'intégrateur.
- Mise à niveau des branches F05 de cette session par merge d'`origin/main` : autorisée pour la suite par le responsable (2026-11-13), quand aucun fichier n'est en commun, avec information à chaque fois. Faite deux fois sur #2090 (#2087, #2089, puis #2091 à #2094).
- Quinze refus sur 26 (faits sans claim, débordements) relèvent de la même famille que le fer. La v6 ne prétend pas les supprimer, et un essai sous la v6 peut encore n'en retenir aucune.
- Le fer reste en attente (#2061).

## Prochaine action exacte

Après l'approbation et le merge : nouvelle branche sur `main`, un seul essai des huit fiches (`rediger.mjs --fiche FU_MG_P1,…,FU_MG_P8 --designations ~/.wellneuro/corpus/fiches-usage/designations.json --claims ~/.wellneuro/corpus/claims/f05-epingles-2026-11-12.json`). Puis, pour chaque fiche entièrement acceptée : `deposer.mjs --validate`, puis `--cible https://app.wellneuro.fr`, constat par conteneur et liste des rubriques à valider par le responsable.

## Interdits encore actifs

- Production en lecture seule par conteneur ; un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature : gestes du responsable, sauf délégation D-509 explicite ; aucune délégation en cours.
- Pas de modification de la structure signée ; rien sous `web/src/lib/clinical/`.
- Pas de pull, merge ou rebase d'une branche qui a des commits sans arbitrage ; aucun essai hors de ceux arbitrés ; arbitrages rendus non reposés.
