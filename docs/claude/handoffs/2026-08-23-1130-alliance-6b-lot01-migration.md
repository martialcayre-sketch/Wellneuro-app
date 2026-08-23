# Handoff — Alliance 6.0-B LOT-01 : la migration de l'objectif à trois voix

- Date : 2026-08-23, 11h30
- Campagne : `2026-08-23-alliance-objectif-trois-voix` (parallèle ;
  `doctrine-executable` reste primaire)
- Branche : `feat/alliance-6b-lot01-migration`
- Décision fondatrice : [[D-094]]

## Où en est le travail

LOT-00 (doctrine) et LOT-01 (migration) sont clos. La migration
`20260823120000_alliance_objectif_trois_voix_v1` crée **trois** tables
événement — `propositions_objectif`, `dispositions_proposition`,
`amendements_objectif` — et ajoute `source_proposition_id` (nullable) à
`objectifs_negocies`. Additive pure, aucun backfill. T3 complet vert, parité
schéma↔migrations prouvée.

**Rien n'est appliqué en production.** L'ordre à tenir : merge → auto-deploy
du code seul → approbation `release-db` → constat par conteneur. La migration
de `doctrine-executable` (schéma de claim) passe **devant** dans le tuyau.

## Ce que la revue a trouvé, et que je n'aurais pas vu

**Un cas négatif rouge ne prouve pas QUELLE contrainte l'a rejeté.** Le CHECK
du couple geste↔motif **subsume** celui de la taxonomie : ses deux branches
exigeant `geste = 'reprise'` ou `'ecartee'`, toute autre valeur est déjà
rejetée par lui. Mes deux cas négatifs visant la taxonomie passaient donc par
la mauvaise contrainte — et supprimer `dispositions_proposition_geste_check`,
ou y légaliser `caduque`, laissait le contrat **vert**. On pouvait ainsi
inscrire en base un geste que personne n'a posé, l'invariant même que le
fichier prétendait garder.

Corrigé par assertion **structurelle** (`pg_constraint` +
`pg_get_constraintdef`) : les six CHECK du lot sont assertés par leur nom, et
la taxonomie `geste` est lue dans sa définition (littéraux comptés, ni plus
ni moins). Les deux mutations qui passaient ont été vues rouges.

La garde de complétude d'effacement RGPD, elle, avait mordu la première :
elle a refusé la migration tant que les trois tables n'étaient pas dans
`effacerDossier`.

## Décisions prises en chemin

- **Trois tables et non deux** : les états annoncés au fichier de lot sont
  des ÉVÉNEMENTS, ils exigeaient leur table (`dispositions_proposition`).
- **`source_proposition_id` portée ici** plutôt qu'au LOT-03 : redemander une
  confirmation de migration pour une colonne nullable additive aurait coûté
  plus qu'elle n'aurait protégé.
- **Taxonomie réduite à `reprise|ecartee`** : `proposee` est implicite
  (l'existence de la ligne) et `caduque` se DÉRIVE de `hash_sources` —
  l'inscrire comme geste attribuerait à un praticien une décision qu'il n'a
  pas prise.
- **Fenêtre d'effacement RGPD assumée** (arbitrage explicite du responsable,
  pas hérité de 6.0-A) : entre l'auto-deploy et l'approbation `release-db`,
  `effacerDossier` lèvera P2021 — fenêtre courte, pilotée à la main,
  fail-closed.

## Ce qui reste ouvert

- **La FORME des fragments n'est gardée nulle part** : `fragments` est un
  JSONB libre ; l'interdit « aucun score, seuil, bande ni rang » ne tient que
  sur les COLONNES. Un `"rang": 1` par fragment passerait. Garde à écrire au
  **LOT-02** — dette nommée, pas couverture acquise.
- **Constat de production APRÈS application seulement** : le contrat 6.0-A
  ayant appris `source_proposition_id`, le jouer avant l'approbation
  rougirait pour une colonne manquante — un faux positif qui ressemble à une
  dérive de schéma.
- **À trancher au LOT-02/03** : algorithme et longueur de `hash_sources` ;
  normalisation d'un `motif: ''` en `NULL` côté route ; règle de résolution
  quand plusieurs dispositions visent une même proposition ; plafond de trois
  propositions ([[D-094]] §3), qu'aucun index ne peut tenir ; appartenance
  croisée `id_patient` ↔ objet visé, à TESTER nommément.
- Aucune borne de longueur sur `motif`, `texte`, `hash_sources` (précédent
  6.0-A) — dette de route.
- La fenêtre [[D-093]] court toujours (2026-10-04) et attend un premier
  objectif rédigé à la main : l'écran existe, le geste est clinique.

## Prochaine action

PR du LOT-01, seule dans son périmètre. Puis, après merge et approbation
`release-db`, constat par conteneur avant d'ouvrir le LOT-02.
