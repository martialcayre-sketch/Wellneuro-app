---
id: "LOT-01"
titre: "Migration propositions_objectif — CONFIRMATION OBLIGATOIRE"
statut: "à_faire"
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

- [ ] Obtenir la confirmation explicite du responsable.
- [ ] Écrire le bloc Prisma + la migration (RLS comprise).
- [ ] Écrire le contrat SQL et son négatif ; les voir **rouges** par
      mutation (colonne parasite) puis verts.
- [ ] `npx prisma validate` ; T3 (dérive schéma↔migrations : aucune).
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

À compléter à la clôture.
