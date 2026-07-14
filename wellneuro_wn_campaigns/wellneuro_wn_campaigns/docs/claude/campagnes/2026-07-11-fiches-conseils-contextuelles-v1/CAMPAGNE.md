---
id: "2026-07-11-fiches-conseils-contextuelles-v1"
titre: "Fiches conseils contextuelles V1"
statut: "à_faire"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-00"
---

# Fiches conseils contextuelles V1

## Objectif

Livrer un catalogue réduit de fiches validées, sélectionnables dans le protocole et lisibles côté patient.

## Résultat observable

Le praticien choisit une fiche validée et le patient la consulte depuis son protocole avec une version imprimable.

## Contraintes non négociables

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Hors périmètre global

- RAG
- Génération IA temps réel
- Bibliothèque exhaustive
- Scan produit

## Décisions prises

- Commencer avec 8 à 12 fiches à forte valeur.
- Contenu statique validé affichable sans IA à l’exécution.
- Une seule fiche prioritaire par phase 1.
- Aucun contenu patient non validé.

## Questions ouvertes

- Quel format canonique : Markdown frontmatter ou TypeScript ?
- Quelles 8 premières fiches ?
- Comment gérer le versionnage sans DB ?

## Dépendances

- Campagne `2026-07-11-decision-clinique-21j-v1` terminée ; persistance facultative mais recommandée.
- Design system
- Protocole V1

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : lecture séquentielle de la campagne.
- `sources/` : documents d’origine utiles au lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Audit du corpus et sélection V1 | à_faire | aucun |
| LOT-01 | Format canonique et catalogue statique | à_faire | LOT-00 |
| LOT-02 | Sélection dans le protocole | à_faire | LOT-01 |
| LOT-03 | Affichage patient et impression | à_faire | LOT-02 |
| LOT-04 | Tests, documentation et handoff | à_faire | LOT-03 |

## Commande `/wn` de reproduction

```text
/wn creer "Fiches conseils contextuelles V1" --source docs/claude/wellneuro-3 --slug fiches-conseils-contextuelles-v1 --lots 5 --auto-final
```

## Done de campagne

- [ ] Catalogue réduit et sourcé.
- [ ] Sélection praticien reliée au protocole.
- [ ] Affichage patient accessible.
- [ ] Impression simple.
- [ ] Aucune IA requise à l’exécution.

## Backlog ultérieur

- RAG corpus
- Recommandations automatiques encadrées
- Recettes Ciqual
