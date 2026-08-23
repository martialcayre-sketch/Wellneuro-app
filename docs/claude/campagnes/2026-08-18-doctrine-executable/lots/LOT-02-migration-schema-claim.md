---
id: "LOT-02"
statut: "à_faire — GATÉ par confirmation explicite de la migration"
dépend_de: "LOT-01"
---

# LOT-02 — V2 : la migration du schéma de claim (CONFIRMATION OBLIGATOIRE)

## But

À la fin de ce lot, `rag_corpus_claims` porte les axes que la doctrine lui
demande — et **rien ne les consomme encore**. La migration est seule dans sa
PR ; `release-db` passe entre elle et tout code qui en dépend (LOT-05,
LOT-06).

C'est le chemin critique de la campagne : le délai d'approbation `release-db`
est incompressible, et c'est pour cela que ce lot part tôt.

## Périmètre pressenti (à confirmer au moment du schéma)

Quatre axes, tous **nullables**, tous **lus fail-closed** :

| Axe | Règle | Vocabulaire |
|---|---|---|
| Catégorie | `DC-07` | `A` descriptif · `B` associatif · `C` orientation · `D` intervention · `E` sécurité |
| Niveau d'exécution | `DC-13` | `AUTO` · `AUTO_WITH_EXPLANATION` · `SUGGEST_ONLY` · `PRACTITIONER_REQUIRED` · `PROHIBITED_AUTOMATION` |
| Population | `DC-14` | à arbitrer : énuméré fermé ou structure ; l'absence **restreint** |
| Nature du seuil | `DC-20` | `clinical` · `instrument` · `data_quality` · `technical` · `regulatory` |

`rag_corpus_claims` est une **table SQL-brut hors `schema.prisma`**
(`prisma.config.ts`, `tables.external`) : la migration s'écrit en SQL, pas par
`prisma migrate dev` sur un modèle. Chaque vocabulaire arrive avec sa
contrainte `CHECK`, sur le patron de `rag_corpus_claims_typologie`.

## L'arbitrage à porter au responsable, avant d'écrire

**Mesure du cadrage : 8 224 claims, tous `VALIDE`.** Les quatre colonnes
naissent donc `NULL` sur les 8 224 lignes. Or `DC-14` pose que l'absence de
population déclarée **se lit comme une restriction, jamais comme une
généralité**, et `DC-13` que le niveau absent est le plus restrictif. Appliqué
littéralement le jour du merge, cela rend 8 224 claims hors population et non
exécutables automatiquement.

Deux lectures, et le lot ne tranche pas seul :

1. **Effet immédiat assumé** — la restriction est l'état honnête du corpus
   tant qu'il n'est pas curé ; rien ne se dégrade puisque rien ne s'exécute
   automatiquement aujourd'hui (`D-003`).
2. **Derrière un drapeau** — la lecture fail-closed n'entre en vigueur qu'une
   fois la curation avancée, le temps que la campagne Curation signée
   remplisse les axes.

L'arbitrage se pose **avant** l'écriture du schéma, avec la mesure sous les
yeux : ce qui consomme réellement ces colonnes aujourd'hui, et ce qui les
consommera au LOT-05.

## Fichiers probables

- `web/prisma/migrations/<horodatage>_rag_claim_axes_doctrine_v1/migration.sql`
- `web/prisma/checks/rag_claim_axes_doctrine_v1.sql` (+ son négatif)
- `.github/workflows/ci.yml` — sans une étape qui **nomme** le contrat, un
  fichier posé dans `prisma/checks/` ne tourne nulle part (leçon `D-042`).
- `docs/DECISIONS.md`, `changelog.d/`

## Interdits

- **Ne pas écrire la migration avant la confirmation explicite** dans la
  conversation (règle `CLAUDE.md` + gate de campagne).
- **Jamais `prisma format`** — il réaligne une centaine de lignes étrangères
  au diff.
- Aucun code applicatif, aucune route, aucun écran dans ce lot : les colonnes
  arrivent inertes.
- Aucun `NOT NULL`, aucun `DEFAULT` porteur de sens clinique sur les colonnes
  neuves : un défaut sur la population **serait** une extrapolation hors
  population, c'est-à-dire exactement ce que `DC-14` interdit.
- Aucun backfill, même « évident » : remplir un axe doctrinal sur 8 224 claims
  est un acte de curation signée, pas une migration.
- Aucun SQL destructif.

## Dépendances

En amont : LOT-01 (le statut réel de `DC-07`/`DC-13`/`DC-14`/`DC-20` est écrit).
En aval : LOT-05 et LOT-06 ne démarrent qu'après `release-db` exécutée **et**
l'état constaté par conteneur Scalingo.

## Étapes

1. Poser l'arbitrage ci-dessus au responsable, mesure à l'appui.
2. Proposer le SQL (colonnes, `CHECK`, index si justifié) — **s'arrêter et
   demander la confirmation**.
3. Après confirmation : migration seule dans sa branche/PR, contrat SQL et son
   négatif, étape CI qui les nomme, T3 local.
4. `release-db` après approbation ; **constater par conteneur** : colonnes
   présentes, contraintes actives, 8 224 lignes à `NULL`, aucune valeur
   inventée.
5. Fragment `changelog.d/` ; décision `D-xxx` portant le vocabulaire des
   quatre axes et la règle de lecture fail-closed.

## Tests

- T3 avant la PR, contrats SQL de `prisma/checks` compris.
- Le contrat négatif doit être **vu rouge** : une valeur hors vocabulaire
  insérée doit lever.
- Vérification post-release par conteneur, en lecture seule, sans lire aucune
  ligne patient (le corpus n'en contient pas — `patient_identifiable = false`
  est une contrainte de la table).

## Critères de done

- [ ] Arbitrage du responsable obtenu et consigné (effet immédiat ou drapeau).
- [ ] Confirmation explicite obtenue avant toute écriture de migration.
- [ ] Migration seule dans sa PR, releasée, **constatée par conteneur**.
- [ ] Contrat SQL + négatif vus rouges, joués en CI et en T3.
- [ ] Aucun backfill, aucun défaut clinique, aucun code consommateur.
- [ ] Décision `D-xxx` + fragment `changelog.d/`.
