---
id: "LOT-02"
statut: "à_faire — GATÉ par confirmation explicite de la migration"
dépend_de: "LOT-01"
---

# LOT-02 — V2 : la migration du schéma de claim (CONFIRMATION OBLIGATOIRE)

## But

À la fin de ce lot, `rag_corpus_claims` porte les axes que la doctrine lui
demande — et **rien ne les consomme encore**. La migration est seule dans sa
PR.

**Aucun claim n'est invalidé, ni ne peut l'être par ce lot.** La colonne
`statut` n'est pas touchée : une migration `ADD COLUMN` n'écrit aucune ligne
existante, les 8 224 claims restent `VALIDE` avec leur `validateur` et leur
`valide_at`, et `match_wellneuro_rag_claims` — la seule voie de récupération —
continue de les servir à l'identique. Le lot ajoute des **axes de
qualification**, il ne rejuge aucune certification praticien.

## Périmètre pressenti (à confirmer au moment du schéma)

**Trois axes**, tous **nullables**, aucun avec un défaut porteur de sens
clinique :

| Axe | Règle | Vocabulaire |
|---|---|---|
| Catégorie | `DC-07` | `A` descriptif · `B` associatif · `C` orientation · `D` intervention · `E` sécurité |
| Niveau d'exécution | `DC-13` | `AUTO` · `AUTO_WITH_EXPLANATION` · `SUGGEST_ONLY` · `PRACTITIONER_REQUIRED` · `PROHIBITED_AUTOMATION` |
| Nature du seuil | `DC-20` | `clinical` · `instrument` · `data_quality` · `technical` · `regulatory` |

`rag_corpus_claims` est une **table SQL-brut hors `schema.prisma`**
(`prisma.config.ts`, `tables.external`) : la migration s'écrit en SQL, pas par
`prisma migrate dev` sur un modèle. Chaque vocabulaire arrive avec sa
contrainte `CHECK`, sur le patron de `rag_corpus_claims_typologie`.

## Pourquoi la population n'est PAS dans cette liste — arbitrage du 2026-08-23

Le cadrage prévoyait un quatrième axe, `population` (`DC-14`), lu fail-closed :
un claim sans population déclarée n'aurait valu pour aucune population.
Appliqué aux 8 224 claims tous `VALIDE`, cela revenait à écarter tout le
corpus d'un moteur qui n'existe pas encore. **Arbitrage du responsable : la
population ne va pas sur le claim.**

Trois raisons, et elles tiennent au dépôt :

1. **Un claim descriptif n'a pas de population** — « le magnésium participe à
   la transmission neuromusculaire » est vrai, point. C'est la **proposition**
   « prendre du magnésium » qui a une population, des exclusions et des
   interactions. `DC-11` le dit déjà : c'est le claim *d'intervention* qui
   porte indication, population, contre-indications. Les exclusions réelles —
   vegan, cœliaque — ne qualifient d'ailleurs pas un savoir mais un **produit**
   (gélule de gélatine, excipient au gluten).
2. **Le précédent du dépôt est « général déclaré », pas « silence
   restrictif »** — `BiologyFunctionalRange.population` et les plages du
   catalogue biologie portent `NOT NULL DEFAULT 'adulte_tout_venant'` avec un
   `CHECK` fermé (`schema.prisma:1668`, migration `cb_biologie_catalogue_v1`,
   `D-068`/`D-069`). Ce défaut n'enfreint pas `DC-14` : `'adulte_tout_venant'`
   est une **valeur écrite**, pas une absence. `DC-14` interdit de lire un
   *silence* comme une généralité ; elle n'interdit pas de déclarer qu'un
   contenu vise la population générale.
3. **On ne peut pas déclarer à la place du curateur.** Écrire
   `adulte_tout_venant` sur 8 224 lignes par une clause `DEFAULT` fabriquerait
   8 224 déclarations cliniques que personne n'a prononcées — `DC-17`,
   `DC-19`. Le défaut est légitime au moment où un curateur l'accepte, jamais
   rétroactivement par migration.

L'axe population et ses exclusions vont donc sur le **registre
d'interventions** (95 entrées, champ `neCouvrePas` aujourd'hui `null` sur les
95) — c'est le LOT-05. Curation humainement faisable : 95, pas 8 224.

## Qui consomme les trois axes restants

Aucun lot de cette campagne. Le consommateur réel est la campagne **Curation
signée** (rang 4, cadence praticien continue) : elle n'a aujourd'hui **aucun
endroit où écrire** la catégorie, le niveau d'exécution ou la nature du seuil
d'un claim. C'est ce qui justifie que le lot parte tôt malgré la perte de son
chemin critique — pas une dépendance interne, mais un déblocage externe.

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
- **Aucune colonne `population` sur le claim** — arbitrage du 2026-08-23,
  ci-dessus. Sa réintroduction demanderait une décision qui renverse cet
  arbitrage, pas une commodité d'implémentation.
- Aucun `NOT NULL`, aucun `DEFAULT` porteur de sens clinique sur les colonnes
  neuves : un défaut écrit par la migration serait une déclaration clinique
  que personne n'a prononcée (`DC-17`, `DC-19`).
- Aucun backfill, même « évident » : remplir un axe doctrinal sur 8 224 claims
  est un acte de curation signée, pas une migration.
- **Ne toucher ni `statut`, ni `validateur`, ni `valide_at`** : la
  certification praticien n'est pas le sujet de ce lot.
- Aucun SQL destructif.

## Dépendances

En amont : LOT-01 (le statut réel de `DC-07`/`DC-13`/`DC-20` est écrit).
En aval : **aucun lot de la campagne ne consomme ces colonnes** (voir
ci-dessus). Le déblocage est externe — Curation signée.

## Étapes

1. Proposer le SQL (trois colonnes, `CHECK`, index si justifié) —
   **s'arrêter et demander la confirmation**.
2. Après confirmation : migration seule dans sa branche/PR, contrat SQL et son
   négatif, étape CI qui les nomme, T3 local.
3. `release-db` après approbation ; **constater par conteneur** : colonnes
   présentes, contraintes actives, 8 224 lignes à `NULL`, `statut` inchangé
   sur les 8 224, aucune valeur inventée.
4. Fragment `changelog.d/` ; décision `D-xxx` portant le vocabulaire des trois
   axes et la règle de lecture (niveau d'exécution absent ⇒ le plus
   restrictif, `DC-13`).

## Tests

- T3 avant la PR, contrats SQL de `prisma/checks` compris.
- Le contrat négatif doit être **vu rouge** : une valeur hors vocabulaire
  insérée doit lever.
- Vérification post-release par conteneur, en lecture seule, sans lire aucune
  ligne patient (le corpus n'en contient pas — `patient_identifiable = false`
  est une contrainte de la table).

## Critères de done

- [ ] Confirmation explicite obtenue avant toute écriture de migration.
- [ ] **Trois** colonnes, aucune population sur le claim.
- [ ] Migration seule dans sa PR, releasée, **constatée par conteneur** —
      `statut` inchangé sur les 8 224 claims, vérifié explicitement.
- [ ] Contrat SQL + négatif vus rouges, joués en CI et en T3.
- [ ] Aucun backfill, aucun défaut clinique, aucun code consommateur.
- [ ] Décision `D-xxx` + fragment `changelog.d/`.
