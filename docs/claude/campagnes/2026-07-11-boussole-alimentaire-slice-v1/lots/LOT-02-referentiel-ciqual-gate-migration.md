---
id: "LOT-02"
titre: "Référentiel Ciqual et gate migration"
statut: "migration_deployee — en_attente_gate_import"
dépend_de: "LOT-01 terminé"
---

# LOT-02 — Référentiel Ciqual et gate migration

## But

Préparer un référentiel PostgreSQL reproductible couvrant tous les aliments
Ciqual pour les seuls constituants validés en LOT-01.

## Résultat observable

Après deux confirmations distinctes, une migration Prisma vérifiée puis un
import append-only intègre ; avant ces confirmations, uniquement les plans,
dry-runs et rapports.

## Périmètre

- Modèle futur CiqualNutrientValue mappé vers ciqual_nutrient_values.
- Champs : id, ciqualCode, nutrientCode, value numeric(14,6) nullable,
  valueStatus, unit, datasetVersion, sourceRef, sourceHash, createdAt.
- Unicité datasetVersion/ciqualCode/nutrientCode, valeur non négative, statuts et
  unités fermés, index datasetVersion/ciqualCode.
- Manifeste versionné séparé pour les 12 vedettes.
- RLS activée sans policy et sans grant anon/authenticated.

## Hors périmètre

Deuxième historique supabase/migrations, accès client direct, OFF, scan,
nouveaux constituants non validés et toute suppression de dataset.

## Fichiers probables

web/prisma/schema.prisma, web/prisma/migrations/, script d'import borné,
manifeste des vedettes, fixtures et rapports d'intégrité.

## Interdits

- Ne créer ni migration ni import sans confirmations explicites séparées.
- Ne jamais importer par défaut : le mode par défaut est dry-run et l'option
  --apply exige la confirmation d'import distincte.
- Ne pas UPDATE ou DELETE une version publiée ; import transactionnel et
  append-only.
- Ne pas créer de policy ou grant Data API pour anon/authenticated.

## Étapes

- [x] Produire le plan de migration et le vérifier en base éphémère.
- [x] Obtenir la confirmation migration et créer la migration dans l'historique Prisma.
- [x] Déployer la migration par le pipeline Prisma/Vercel après revue.
- [ ] Produire le dry-run d'import et les contrôles de hash, lignes et unités.
- [ ] Obtenir une confirmation distincte pour l'import.
- [ ] Importer transactionnellement puis publier le rapport d'intégrité.

## Tests

prisma validate/generate, migration éphémère, absence de dérive, contraintes,
unicité, null/valueStatus, hash, volumes, unités, RLS, grants et Supabase
database advisors.

## Critères de done

- La migration est reproductible depuis web/prisma/migrations.
- Toutes les lignes attendues de la version sont présentes et hashées.
- Les 12 vedettes se résolvent via le manifeste sans limiter la distribution.
- La Data API ne peut pas lire la table.
- Migration et import possèdent chacun leur preuve de confirmation.

## Risques / points de vigilance

numeric(14,6) évite une dérive de flottants mais impose une conversion contrôlée.
Une source incomplète ne doit jamais être compensée par une valeur inventée.

## Références

- Supabase : Row Level Security
  https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase : migrations et développement local
  https://supabase.com/docs/guides/local-development/overview

## Résultats

### Préconditions acquises

- LOT-01 terminé et signé par le praticien valideur ; versions cliniques
  réservées et constituants figés.
- Source temporaire vérifiée le 2026-07-18 : `compo.xml`, MD5
  `2da725585946434df320d8041631998b`, sans donnée brute ajoutée au dépôt.
- Historique exécutable unique confirmé dans `web/prisma/migrations/`. Le
  fichier historique vide de 0 octet sous `web/supabase/migrations/` n'est pas
  utilisé et aucun nouveau fichier n'y est créé.
- Prisma 7.8.0 valide le schéma existant. Supabase CLI 2.109.1 est disponible.

### Plan de migration soumis à confirmation

1. Ajouter `CiqualNutrientValue` mappé sur `ciqual_nutrient_values`, avec
   `value` en `numeric(14,6)` nullable.
2. Fermer `valueStatus` à `exact`, `trace`, `below_limit`, `missing` et les
   unités à `g/100 g`, `mg/100 g` ; seule une valeur `exact` porte une valeur
   numérique. Toute valeur numérique doit être supérieure ou égale à zéro.
3. Ajouter l'unicité
   `(dataset_version, ciqual_code, nutrient_code)` et l'index
   `(dataset_version, ciqual_code)`.
4. Rendre l'identité `NeuroAxis` append-only par l'unicité composite
   `(axis_code, version_mapping)` ; rattacher `NutrientAxisWeight` par cette
   même paire et rendre unique
   `(axis_code, version_mapping, nutrient_code)`.
5. Activer RLS sur la nouvelle table, révoquer les privilèges de
   `anon`/`authenticated` et ne créer aucune policy Data API.
6. Vérifier la migration sur PostgreSQL éphémère, puis seulement après accord
   explicite l'appliquer au moyen de l'historique Prisma existant.

La migration n'est ni créée ni appliquée dans cette étape. Le conteneur de
travail ne fournit pas de serveur PostgreSQL local ; le test éphémère devra
donc être exécuté dans un environnement PostgreSQL temporaire avant toute
application à la base cible.

### Dry-run Ciqual préparatoire

Le périmètre validé contient 16 codes : `25000`, `31000`, `32000`, `34100`,
`40302`, `40303`, `40304`, `41833`, `42053`, `42263`, `10004`, `10110`,
`10120`, `10150`, `10190`, `10200`. Les glucides et le sodium restent
descriptifs ; le calcul PRAL validé utilise `25000`, `10120`, `10150`,
`10190` et `10200`.

- aliments source : **3 484** ;
- lignes attendues : **55 744** (`3 484 × 16`) ;
- clés composites dupliquées : **0** ;
- précision maximale observée : **6 décimales** ;
- plage compatible avec `numeric(14,6)` ;
- aucune trace, borne `<x` ou absence convertie en zéro.

| Code | Exact | Trace | `<x` | Absent |
|---|---:|---:|---:|---:|
| 25000 | 3 451 | 4 | 0 | 29 |
| 31000 | 3 272 | 134 | 8 | 70 |
| 32000 | 2 996 | 205 | 60 | 223 |
| 34100 | 3 239 | 45 | 130 | 70 |
| 40302 | 3 093 | 8 | 135 | 248 |
| 40303 | 2 567 | 9 | 144 | 764 |
| 40304 | 2 554 | 9 | 147 | 774 |
| 41833 | 1 892 | 3 | 212 | 1 377 |
| 42053 | 1 636 | 2 | 910 | 936 |
| 42263 | 1 560 | 10 | 955 | 959 |
| 10004 | 3 141 | 2 | 151 | 190 |
| 10110 | 2 929 | 4 | 149 | 402 |
| 10120 | 2 566 | 0 | 19 | 899 |
| 10150 | 2 488 | 2 | 52 | 942 |
| 10190 | 2 604 | 0 | 13 | 867 |
| 10200 | 2 676 | 1 | 23 | 784 |

Le futur import restera en dry-run par défaut. Sa création puis son exécution
`--apply` restent soumises au gate d'import distinct, après migration validée.

### Confirmation et migration vérifiée

- confirmation humaine reçue le 2026-07-18 : « Je confirme la migration C5
  LOT-02 selon le plan documenté. » ;
- référence : `C5-LOT02-MIGRATION-MC-2026-07-18-v1` ;
- preuve Git : `9538b78f346204c1b71091d21b669e0a99230088` ;
- schéma Prisma étendu avec `CiqualNutrientValue` et identité composite
  `axisCode + versionMapping` ;
- migration unique :
  `20260718100010_c5_ciqual_reference_v1/migration.sql` ;
- deux replays PostgreSQL 17 vierges réussis, avec puis sans rôles Data API ;
- dérive Prisma nulle ; RLS active ; aucune policy ; aucun grant
  `anon`/`authenticated` ; lecture `anon` refusée ;
- contraintes de statut, valeur, unité, unicité et relation versionnée
  exercées avec succès.

Le détail reproductible figure dans `RAPPORT_MIGRATION_LOT-02.md`. La migration
est déployée sur Supabase Production et aucune donnée Ciqual n'a été importée
par cette passe. La confirmation d'import ne sera demandée qu'après le dry-run
contrôlé de l'outil d'import. C5 demeure inactive à `2/8`.

### Déploiement de production contrôlé

- PR `#117` fusionnée sur `main` le 2026-07-18 ; commit de fusion
  `3c0019989cae3ed2b76d8b57de1a61a5a2348374` ;
- déploiement Vercel Production `dpl_BrJGmRwcteZDSK3xPdZcV9XDPPoj`, état
  `Ready`, alias `https://app.wellneuro.fr` ;
- préflight SQL de production exécuté avec succès avant toute écriture ;
- `prisma migrate deploy` a reconnu 14 migrations, appliqué
  `20260718100010_c5_ciqual_reference_v1` et confirmé leur application
  complète ;
- smoke test public : redirection attendue vers `/login`, réponse HTTP 200 ;
- aucun import, aucune activation C5 et aucune surface LOT-03 à LOT-07 dans ce
  déploiement.

Le contrôle `supabase db advisors` reste requis : l'environnement de travail
ne possède ni liaison CLI au projet ni `SUPABASE_ACCESS_TOKEN`. Ce contrôle
n'est donc pas déclaré acquis et devra être exécuté avant la clôture du lot.
