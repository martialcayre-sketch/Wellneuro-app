# Handoff — F05 (BP-12a) : consigne v5, le libellé d'une hypothèse ; libellés du magnésium

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-consigne-v5`, partie d'`origin/main` (`a70f8081`). Elle porte le commit du correctif d'outil, repris de `f05-textes-magnesium` (commit propre à cette session, jamais poussé, aucun fichier en commun avec l'avance de `main`), puis la v5.
- `f05-textes-magnesium` est laissée telle quelle en local ; elle n'a plus d'objet.

## Objectif

Débloquer la rédaction des libellés d'hypothèse du besoin 2 (`HYP_MG_1` d'abord), refusés par la contre-lecture v4 faute d'un claim qui qualifie l'état de « fonctionnel », qualification imposée par D-477 §2.

## Décisions prises

- Responsable, 2026-11-13 : magnésium, puis polyphénols, puis zinc, un dossier par lot ; délégation D-509 « valide les libellés pour moi » sur `POP_ADULTE` n° 1 et `POP_GENERALE` n° 1 ; correction de l'outil (option a), un rejeu unique de `HYP_MG_1` (option a), puis la v5 de la contre-lecture (option c), contre la saisie manuelle.
- D-501 §8 (amendement, statut **proposé**) : la qualification d'état fonctionnel est une forme du cadre signé, pas un fait ; tout autre élément du libellé reste un fait. Consigne `fiche-usage-v5`, empreinte `ca5c7963d000d68e`. La consigne de rédaction ne change pas.

## Fichiers modifiés

- `tools/corpus/fiches-usage/consignes/contre-lecture.md` (paragraphe v5), `lib/consigne.mjs` (version, empreinte), `lib/consigne.test.mjs` (banc v5).
- `tools/corpus/fiches-usage/lib/preparation.mjs` (`lireReponseLibelle`), `rediger.mjs` (`redigerTexte`), `lib/preparation.test.mjs`.
- `tools/corpus/fiches-usage/README.md`, `docs/TRUST_IA_FICHES_USAGE.md`, `docs/decisions/D-501.md` (§8).
- `changelog.d/2026-11-13-d501-consigne-fiches-usage-v5.md`, `docs/claude/plan-journal/F05/2026-11-13-02-textes-magnesium-libelles-consigne-v5.md` (dont la trace écrite D-509).

## Validations exécutées

- `scripts/run-certify-bancs.sh` → 0 ; `cd web && npm run check` → 0 (884 tests, 1 ignoré).
- Production, lecture par conteneur : les deux libellés de population du magnésium sont `validee`, chacun sur le texte déposé. Aucune version de fiche du magnésium, des polyphénols ou du zinc.
- Les deux refus de `HYP_MG_1` donnent le même motif (rapports hors dépôt, `~/.wellneuro/corpus/fiches-usage/HYP_MG_1/`).

## Problèmes ouverts

- La v5 est **approuvée** par le responsable le 2026-11-13, après un avis Codex à sa demande (au dépôt privé `wellneuro-revues`, `f05/2026-11-13-avis-codex-consigne-v5.md`). Aucun défaut dans le paragraphe v5 ; un constat P2 sur les séparateurs de ligne de la lecture tolérante, corrigé. D-501 §8 est « accepté ». La branche a été mise à niveau par un merge d'`origin/main`, sur arbitrage du responsable (#2072 et #2073, aucun fichier commun). Reste le merge par l'intégrateur.
- Le fer reste en attente (#2061) ; P3 reste en v1.
- `designations.json` (hors dépôt) devra recevoir `POP_ADULTE`, `POP_GENERALE` et `HYP_MG_1` tirés de la production avant les fiches du magnésium.

## Prochaine action exacte

Après l'approbation et le merge : nouvelle branche sur `main`, un rejeu unique de `HYP_MG_1` sous la v5 (`rediger.mjs`, libellé) ; s'il est retenu, `deposer.mjs --validate` puis `--cible https://app.wellneuro.fr`, constat par conteneur, validation par le responsable (aucune délégation en cours pour ce libellé) ; puis les huit fiches du magnésium.

## Interdits encore actifs

- Production en lecture seule par conteneur ; un dépôt passe par la route interne, jamais par SQL.
- Aucun texte de fiche, de libellé ou de claim dans le dépôt public (D-251 §4).
- Validation et signature : gestes du responsable, sauf délégation D-509 explicite, au périmètre nommé ; la délégation du 2026-11-13 ne couvrait que les deux libellés de population.
- Pas de modification de la structure signée (`ficheUsageBesoin2V1.ts`) ; rien sous `web/src/lib/clinical/`.
- Pas de pull, merge ou rebase d'une branche qui a des commits sans arbitrage ; arbitrages rendus non reposés ; aucun rejeu hors de ceux arbitrés.
