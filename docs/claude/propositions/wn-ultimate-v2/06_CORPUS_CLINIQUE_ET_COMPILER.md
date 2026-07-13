---
id: "wellneuro-corpus-clinique-compiler-v2"
version: "2.0"
date_source_declaree: "2026-07-14"
integre_le: "2026-07-13"
statut_integration: "proposition_non_executable_a_valider"
---

# Corpus clinique SIIN et Clinical Knowledge Compiler

## 1. Décision

Le corpus SIIN n’est pas connecté directement au LLM ni indexé indistinctement.

```text
Drive
→ SourceDocument
→ extraction ancrée
→ claims atomiques
→ revue
→ conflits
→ règles et blocs
→ build candidat
→ validation
→ publication
→ retrieval borné
```

## 2. Rôles

| Outil | Rôle |
|---|---|
| Drive | archive brute et probante |
| NotebookLM | atelier éditorial |
| GitHub | corpus validé et revu |
| Compiler | transformation, validation, builds |
| PostgreSQL | runtime, recherche exacte et hybride |
| LLM | structuration et rédaction |
| Praticien | validation clinique |

## 3. Objets publiables

- `SourceClaim` ;
- `KnowledgeCard` ;
- `RuleDefinition` ;
- `InterventionBlock` ;
- `SafetyStatement` ;
- `PatientContentBlock`.

Les `SourceDocument` bruts ne sont pas récupérables par le runtime patient.

## 4. Quatre dimensions séparées

1. qualité/provenance de mesure patient A/B/C/D ;
2. classe d’autorité documentaire ;
3. statut de validation du claim ;
4. applicabilité clinique.

## 5. Retrieval firewall

Le moteur prépare un `RetrievalPlan`.

Filtres obligatoires :

- domaines ;
- types de claims ;
- audience ;
- version ;
- population ;
- juridiction ;
- autorité minimale ;
- intentions autorisées ;
- sources exclues ;
- nombre maximal.

Réponses possibles :

- résultats publiés ;
- insuffisance ;
- conflit ;
- contexte incomplet ;
- décision médicale requise ;
- build non publié ;
- abstention.

## 6. Conflits

Un conflit bloquant interdit :

- publication de la règle ;
- utilisation par C1 ;
- diffusion de contenu dépendant.

Les nuances non bloquantes restent visibles.

## 7. SourceDelta

Toute modification d’une source produit :

- hash précédent et nouveau ;
- pages ou sections impactées ;
- claims impactés ;
- règles dépendantes ;
- blocs d’intervention ;
- documents ;
- fixtures ;
- besoin de suspension.

## 8. Builds

Chaque build possède :

- version ;
- hash du manifeste ;
- version du compiler ;
- listes d’objets ;
- conflits non résolus ;
- tests ;
- validateur ;
- statut ;
- rollback possible.

## 9. Manifeste initial

L’audit recense 391 sources. Le manifeste initial doit être transformé avant ingestion :

- `validation_praticien` → `validation_praticien_requise` + `clinical_review_status` ;
- `statut` scindé en importance, audience et cycle de vie ;
- notebooks secondaires transformés en tableau ;
- ajout de hash, version, droits, langue, juridiction et dates.

## 10. Pilote sommeil/chronobiologie

Le pilote couvre une tranche verticale :

- sources inventoriées ;
- claims ;
- conflits ;
- règles ;
- cartes ;
- blocs d’intervention ;
- contenus patient ;
- build candidat ;
- recherche bornée ;
- replay des patients fictifs ;
- provenance dans DecisionCard.

## 11. Gates

- G0 droits ;
- G1 taxonomie et schémas ;
- G2 qualité d’extraction ;
- G3 claims et conflits du pilote ;
- G4 architecture runtime et firewall ;
- G5 migration PostgreSQL/pgvector ;
- G6 acceptation du pilote.

## 12. Campagne C1B

Conserver huit lots :

1. audit, frontières, droits, inventaire ;
2. contrats ;
3. ingestion, parsing, déduplication, delta ;
4. compiler, revue, conflits et build candidat ;
5. intégration runtime ;
6. outillage ;
7. pilote sommeil ;
8. tests, go/no-go et handoff.

C1B reste sous `_prepared` tant que l’activation explicite des campagnes n’est pas corrigée.
