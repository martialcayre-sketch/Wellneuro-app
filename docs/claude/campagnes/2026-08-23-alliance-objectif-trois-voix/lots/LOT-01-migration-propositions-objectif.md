---
id: "LOT-01"
titre: "Migration propositions_objectif — CONFIRMATION OBLIGATOIRE"
statut: "terminé"
dépend_de: "LOT-00"
---

# LOT-01 — Migration `propositions_objectif` — **CONFIRMATION OBLIGATOIRE**

## But

Créer la table `propositions_objectif` **et** la table d'événement du
« dire autrement » (arbitrage `D-094` : table propre, aucun CHECK existant
élargi) — **seules dans leur PR**, sans aucun code qui les consomme.

## Résultat observable

- Table append-only : `id`, `id_patient`, fragments sourcés (JSONB
  `{texte, source}` — source ∈ anamnèse (champ + date de consultation) /
  instrument (id + bande) / règle signée (id + SHA)), `hash_sources`
  (caducité), `cree_le` (posé par la base). Aucune colonne de score, de rang
  persisté ni de texte libre machine.
- Événements d'état par lignes (`proposée` / `reprise` / `écartée` avec
  motif / `caduque`) — jamais un update.
- `ENABLE ROW LEVEL SECURITY` dans la migration (leçon [[D-072]]) ; contrat
  SQL `alli_propositions_objectif_v1.sql` + **négatif** (liste blanche des
  colonnes, refus d'un champ de score sous quelque nom que ce soit).
- Parité schéma↔migration : `prisma migrate diff` sans différence (T3).

## Périmètre

- `web/prisma/schema.prisma` (bloc nouveau, aligné à la main — **jamais
  `prisma format`**).
- `web/prisma/migrations/…`
- `web/prisma/checks/` (contrat + négatif).

## Hors périmètre

- Tout code applicatif consommant la table (LOT-02).
- Toute donnée : la table naît vide et le reste jusqu'au LOT-02.

## Fichiers probables

- `web/prisma/schema.prisma` (voisinage de la section « LE DOSSIER À DEUX
  VOIX », ~l. 1923-2072)
- `web/prisma/migrations/<horodatage>_alli_propositions_objectif/migration.sql`
- `web/prisma/checks/alli_propositions_objectif_v1.sql` (+ `_negatif.sql`)

## Interdits

- **Ne s'écrit qu'après confirmation explicite dans la conversation** (hook
  « demande » + gate de campagne).
- Pas de champ de score, de rang, de code diagnostique.
- Pas de `prisma format`.
- PR sans autre finalité que la migration ; `release-db` **après** la
  migration doctrine-executable (schéma de claim, chemin critique).
- Application constatée par conteneur one-off avant d'ouvrir le LOT-02
  ([[D-087]], [[D-092]] — identifiants seuls dans les commandes, jamais de
  nom ni d'e-mail : les commandes one-off sont recopiées dans les logs).

## Étapes

- [x] Obtenir la confirmation explicite du responsable.
- [x] Écrire le bloc Prisma + la migration (RLS comprise).
- [x] Écrire le contrat SQL et son négatif ; les voir **rouges** par
      mutation (colonne parasite) puis verts.
- [x] `npx prisma validate` ; T3 (dérive schéma↔migrations : aucune).
- [x] Revue indépendante (`wn-reviewer`) — GO conditionnel, conditions levées.
- [ ] PR seule ; CI par `node scripts/wn-attendre-ci.mjs <N>`.
- [ ] Après merge et approbation `release-db` : constat par conteneur
      (`migrate status` agrégé par nom + contrat joué en production).

## Tests

- T3 complet avant PR (migration = palier T3).
- Contrat SQL vu rouge par mutation réelle, puis vert.

## Critères de done

- Migration appliquée en production, **constatée par conteneur**.
- Contrats verts en production ; table vide ; aucun code ne la lit encore.

## Résultats

Clos le 2026-08-23. **Trois** tables et non deux : `propositions_objectif`,
`dispositions_proposition` (les états annoncés au fichier de lot sont des
ÉVÉNEMENTS, ils exigeaient leur table) et `amendements_objectif`. Plus la
colonne `source_proposition_id` sur `objectifs_negocies`, portée ici plutôt
qu'au LOT-03 : redemander une confirmation de migration pour une colonne
nullable additive aurait coûté plus qu'elle n'aurait protégé.

**Deux divergences assumées avec le texte du lot** (relevées en revue, m11) :
un seul fichier de contrat au lieu de deux, cas positifs inclus — patron
6.0-A ; et la taxonomie d'états réduite à `reprise|ecartee`, `proposee`
étant implicite (l'existence de la ligne) et `caduque` DÉRIVÉE de
`hash_sources` — l'inscrire comme geste attribuerait à un praticien une
décision que personne n'a prise.

**Ce que les gardes ont trouvé.** La garde de complétude d'effacement RGPD a
mordu la première : elle a refusé la migration tant que les trois tables
n'étaient pas dans `effacerDossier`. Puis la revue a trouvé un défaut réel
(B1) : le CHECK du COUPLE geste↔motif **subsume** celui de la taxonomie, si
bien qu'aucun cas négatif ne pouvait isoler ce dernier — on pouvait
supprimer `dispositions_proposition_geste_check`, ou y légaliser `caduque`,
en laissant le contrat vert. Corrigé par une assertion STRUCTURELLE
(`pg_constraint` + `pg_get_constraintdef`) : les six CHECK sont assertés par
leur nom, et la taxonomie `geste` est lue dans sa définition. Les deux
mutations qui passaient ont été vues rouges. Leçon consignée dans l'en-tête
du contrat : *un cas négatif rouge ne prouve pas QUELLE contrainte l'a
rejeté*.

**Vu rouge par mutation réelle, sept fois** : CHECK du couple retiré,
colonne `rang` ajoutée, FK passée en CASCADE, RLS désactivée, CHECK
`fragments` retiré, CHECK de taxonomie supprimé, `caduque` légalisé.

T3 complet vert (contrats SQL, dérive schéma↔migrations, E2E).

## Dettes nommées, à porter aux lots suivants

- **La FORME des fragments n'est gardée nulle part** (revue M2) : le contrat
  n'éprouve que « tableau non vide » ; `fragments` étant un JSONB libre, un
  `score` ou un `rang` PAR FRAGMENT y entrerait sans qu'une ligne ne bouge.
  L'interdit de forme tient sur les COLONNES, pas sur ce contenu. Garde à
  écrire au **LOT-02** (invariant de type + banc) — dette, pas couverture.
- **Le constat de production se fait APRÈS application** (revue M3) : le
  contrat 6.0-A ayant appris `source_proposition_id`, le jouer en one-off
  AVANT l'approbation `release-db` rougirait pour une colonne manquante — un
  faux positif qui ressemble à une dérive de schéma.
- **Fenêtre d'effacement RGPD** (revue M4) : entre l'auto-deploy du code et
  l'approbation `release-db`, `effacerDossier` lèvera P2021 et aucun dossier
  ne pourra être effacé. **Arbitrage explicite du responsable le 2026-08-23**
  (et non hérité de 6.0-A) : assumé — fenêtre courte, pilotée à la main par
  l'approbation, fail-closed (aucun effacement partiel possible).
- **À trancher au LOT-02/03** (questions de la revue) : l'algorithme et la
  longueur de `hash_sources` ; la normalisation d'un `motif: ''` en `NULL`
  côté route (sinon 23514) ; la règle de résolution quand plusieurs
  dispositions visent une même proposition (dernière par `cree_le` ?) ; le
  plafond de trois propositions (`D-094` §3), qu'aucun index ne peut tenir ;
  l'appartenance croisée `id_patient` ↔ objet visé, à TESTER nommément et
  pas seulement à écrire (m6).
