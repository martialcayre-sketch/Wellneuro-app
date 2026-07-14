---
id: "2026-07-13-journal-alimentaire-21j-v1"
titre: "JA — Journal alimentaire 21 jours V1"
statut: "cadrée — règles cliniques candidates"
créée_le: "2026-07-13"
mise_à_jour: "2026-07-13"
lot_courant: "aucun"
---

# JA — Journal alimentaire 21 jours V1

## Objectif

Recueillir des observations alimentaires simples pendant une période bornée,
sans les transformer en score clinique officiel ni en réponses de
questionnaire.

## Frontières

**Possède** : saisies alimentaires, corrections/suppressions, événements
datés, couverture, fiabilité explicite, agrégats descriptifs, observations et
discordances.

**Consomme** : charte patient HC-F. Le futur branchement patient consommera un
protocole actif C2 ; C5 pourra lire les observations publiées sans posséder le
journal.

**Ne possède pas** : score Mon équilibre, scoring SIIN, décision C1,
contextualisation C5, persistance C2 ou projections questionnaire.

## Décisions actées

- Domaine TypeScript pur avant toute persistance.
- V1 : saisie rapide, favoris et copie uniquement.
- Voix, photo, offline et rappel rétrospectif différés.
- Aucune projection vers `Q_ALI_01` ou `Q_ALI_02`.
- Les 25 marqueurs et neuf axes du prototype sont des candidats à auditer,
  pas un référentiel canonique.
- Toute migration, durée de conservation ou activation patient exige un gate
  C2/RGPD distinct.

## Lots à compiler

| Lot | Objet | Gate |
|---|---|---|
| JA-00 | Audit clinique/RGPD des marqueurs, axes, couverture, fiabilité et rétention | validation praticien |
| JA-01 | Contrats TypeScript purs, événements, correction/suppression et feature flags | JA-00 |
| JA-02 | Agrégats descriptifs, jours partiels/atypiques et discordances | JA-01 |
| JA-03 | Saisies quick/favori/copie et accessibilité mobile | JA-02 |
| JA-04 | Tests, replay fictif, documentation et go/no-go persistance | JA-03 |

La persistance, le portail et la synchronisation seront compilés dans un lot
ultérieur dépendant de C2A et d'une autorisation de migration explicite.
