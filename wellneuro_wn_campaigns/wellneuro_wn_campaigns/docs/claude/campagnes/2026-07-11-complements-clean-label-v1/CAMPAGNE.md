---
id: "2026-07-11-complements-clean-label-v1"
titre: "Bibliothèque compléments clean label V1"
statut: "à_faire"
créée_le: "2026-07-11"
mise_à_jour: "2026-07-11"
lot_courant: "LOT-00"
---

# Bibliothèque compléments clean label V1

## Objectif

Livrer le vertical slice d’une bibliothèque clean label : quelques produits qualifiés, filtres essentiels, vigilance de doublons et intégration manuelle au protocole.

## Résultat observable

Le praticien compare des produits qualifiés, voit les raisons, sélectionne manuellement et génère une fiche patient.

## Contraintes non négociables

- Tous les textes d’interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogne.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L’IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Hors périmètre global

- Base exhaustive
- Commerce/affiliation
- Scan code-barres
- Décision automatique
- Conseil médical exhaustif

## Décisions prises

- V1 limitée à un petit nombre de catégories et produits qualifiés.
- Statuts retenu/acceptable/à vérifier/exclu.
- Aucune recommandation automatique ni prescription.
- Les interactions sont des vigilances, jamais une garantie de sécurité.

## Questions ouvertes

- Source prioritaire Compl’Alim/DGCCRF ?
- V1 statique ou persistance dédiée ?
- Qui valide et revalide un produit ?

## Dépendances

- Campagnes `2026-07-11-decision-clinique-21j-v1` et `2026-07-11-fiches-conseils-contextuelles-v1` stabilisées.
- Validation clinique du référentiel
- Décision explicite avant toute migration éventuelle

## Artefacts de préparation

- `BRIEF_COMPILED.md` : synthèse structurée des sources.
- `CAMPAIGN_DRAFT.md` : lecture séquentielle de la campagne.
- `sources/` : documents d’origine utiles au lot.

## Lots

| Lot | Objet | Statut | Dépend de |
|---|---|---|---|
| LOT-00 | Cadrage des sources et du périmètre | à_faire | aucun |
| LOT-01 | Modèle de qualification et règles déterministes | à_faire | LOT-00 |
| LOT-02 | Catalogue V1 qualifié | à_faire | LOT-01 |
| LOT-03 | UX praticien : filtres et comparaison | à_faire | LOT-02 |
| LOT-04 | Cohérence protocole et fiche patient | à_faire | LOT-03 |
| LOT-05 | Validation, maintenance et handoff | à_faire | LOT-04 |

## Commande `/wn` de reproduction

```text
/wn creer "Bibliothèque compléments clean label V1" --source docs/claude/wellneuro-3 --slug complements-clean-label-v1 --lots 6 --auto-final
```

## Done de campagne

- [ ] Périmètre réduit et maintenable.
- [ ] Chaque produit a source, date et statut.
- [ ] Filtres et badges expliqués.
- [ ] Doublons simples détectés.
- [ ] Sélection praticien manuelle.
- [ ] Aucune allégation non tracée.

## Backlog ultérieur

- Import automatisé
- Scanner
- Historique tolérance patient
- Moteur interactions avancé
