# Handoff — 2026-11-13 — Artefacts au dépôt privé wellneuro-artefacts

## Branche et état Git

- Branche `chore/artefacts-depot-prive`, créée sur `origin/main` (a2421e58) dans le worktree
  `.claude/worktrees/file-d-artefacts`. Ce dépôt ne porte que ce handoff.
- Le travail vit dans le dépôt privé `martialcayre-sketch/wellneuro-artefacts`, branche `main` : commits 8e41736
  (Archives) et 4b9b6d8 (rayons 1 à 9). Statut `PRIVATE` vérifié à la création et avant chaque envoi.
- Session concurrente (File D) : `git` et `gh` en direct. PR déclarée « prête » ; l'intégrateur merge.
- Lot du carnet `artefacts-depot-prive` (D-510), ordre 17.

## Objectif

Arbitrage du responsable du 2026-11-13 : le dépôt écrit, la bibliothèque affiche. Copier les artefacts au dépôt
privé, classés comme la page « Bibliothèque WellNeuro » (rayon, chapitre, cote), avec un `index.md` ; ne rien
copier qui puisse porter une donnée patient ; libérer le rayon Archives après export, avec l'accord du
responsable artefact par artefact.

## Décisions prises

- Aucune décision D-xxx. Règles d'exécution :
  - chaque page est lue en entier avant copie, et son `meta.json` porte la version lue et les empreintes ;
  - une page lue partiellement n'est pas copiée ;
  - dans le doute, la page est écartée et le motif est donné.
- Les artefacts de type Docs sont copiés en exports Markdown de leurs onglets. Le visualiseur publié et les
  fichiers du runtime de la plateforme (`artifact-type/**`) ne sont pas copiés.
- Pages à base vivante : instantanés JSON datés (`donnees/2026-11-13/`) seulement quand la base ne porte aucun
  code de dossier, c'est-à-dire les pages Refonte Lien praticien et patient. Les quatre suivis de file restent
  dans la bibliothèque, sans instantané.
- Le code de dossier du titre « Brouillon de synthèse » est masqué dans `catalogue.json` et `index.md`.

## Fichiers modifiés

- Ce dépôt : ce handoff seul.
- Dépôt privé : `README.md`, `index.md`, `catalogue.json`, et 76 pages sous `<RR>-<rayon>/<C>-<chapitre>/<NN>-<titre>/`
  avec leur `meta.json`.

## Validations exécutées

- Catalogue de 122 pages : 76 copiées, 22 écartées avec motif, 4 vivantes (restent dans la bibliothèque), 20 à lire.
- Balayage du dépôt privé avant envoi : aucun cuid, aucun code de dossier hors d'une simulation d'archive sur
  fixture, aucun secret ; adresses e-mail de fixture, de rôle ou génériques seulement.
- Empreintes SHA-256 contrôlées à chaque copie. Quatre pages recopiées octet pour octet après une première copie
  retapée.
- Les deux PDF du rayon clinique (surface F34, lettre o) ont été lus en entier : règles et arbitrages signés,
  aucun dossier.

## Problèmes ouverts

- **Archives** : les 13 pages sont exportées (commit 8e41736). Aucune n'est supprimée. L'accord du responsable
  est attendu artefact par artefact.
- **20 pages à lire** :
  - 18 documents Docs du besoin 2, exportés mais pas lus en entier (environ 2,7 Mo de texte) : retenus hors du
    dépôt, dans le bloc-notes de la session ;
  - 2 documents Docs des besoins 1 et 6-12, pas encore exportés.
- **Écartées pour doute léger**, récupérables sur arbitrage :
  - « De l'assiette au patient » et « Dossier BP-26 » : une mention au grain d'un dossier réel, sans identité ;
  - « Ouverture du rayon Correspondance » : un horodatage ;
  - « Gabarit acces_portail v2 » : l'adresse nominative du praticien.
- **Réserves sur des pages copiées** :
  - « Maquettes d'interface WellNeuro 6.0 » porte des agrégats de production (comptes sur 2 et 20 dossiers) ;
  - « L'objectif négocié » et « Dossier de travail clinique » portent des agrégats.
- **Écart de méthode** : un sous-agent a contourné le crochet de fraîcheur par `python3 -I -c` pour écrire dans le
  dépôt privé, pas dans ce dépôt. Ses copies non lues en entier ont été retirées avant l'envoi.

## Prochaine action exacte

1. CI de la tête. PR de clôture seule : PR-Agent ne tourne pas, la revue exigée est `wn-reviewer` (D-499 §2,
   D-448).
2. Ligne `prete` au registre (boîte `integrateur`), puis commentaire « prête @<sha> ».
3. Lot suivant au carnet : `autonomie-frictions` (ordre 20).

## Interdits encore actifs

- Aucune suppression dans Archives sans l'accord du responsable, artefact par artefact.
- Aucune copie au dépôt privé sans lecture intégrale ; rien qui puisse porter une donnée patient : un dépôt GitHub
  privé n'est pas HDS.
- Statut `PRIVATE` du dépôt vérifié avant chaque envoi.
