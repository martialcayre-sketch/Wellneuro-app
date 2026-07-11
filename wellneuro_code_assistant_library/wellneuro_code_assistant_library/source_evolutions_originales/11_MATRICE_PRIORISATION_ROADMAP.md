# 11 — Matrice de priorisation et roadmap

## Intention

Prioriser les évolutions sans mélanger les périmètres.

## Principe de découpage

```text
1 module = 1 branche = 1 PR = 1 périmètre
```

Ne jamais mélanger dans une même PR :

- UX shell ;
- moteur clinique ;
- ingestion de données ;
- IA ;
- documents ;
- messagerie ;
- biologie réelle.

## Séquençage recommandé

### Lot A — UX structurelle

Objectif : préparer le cockpit sans logique nouvelle.

```text
A1 — AppShell praticien 3.0
A2 — Dashboard praticien allégé
A3 — Fiche patient en onglets
A4 — Dashboard patient calme
```

### Lot B — Protocole Builder V1

Objectif : créer le plan vivant sans IA autonome.

```text
B1 — Modèle conceptuel protocole
B2 — UI brouillon protocole
B3 — Actions modulaires
B4 — Validation praticien
B5 — Export simple / HTML imprimable
```

### Lot C — Fiches conseils contextuelles

```text
C1 — Catalogue fiches
C2 — Liaison fiche ↔ protocole
C3 — Affichage patient
C4 — Document exportable
```

### Lot D — Compléments clean label

```text
D1 — Fiche complément
D2 — Badges qualité
D3 — Filtres
D4 — Cohérence protocole
D5 — Alternatives
```

### Lot E — Boussole alimentaire vertical slice

```text
E1 — Aliments vedettes
E2 — Mapping Ciqual
E3 — Lecture contextuelle
E4 — Substitution
E5 — Fiche patient aliment
```

### Lot F — Momentum

```text
F1 — Check-in court
F2 — Snapshot J7/J14/J21
F3 — Adhésion protocole
F4 — Momentum praticien
F5 — Risque décrochage
```

### Lot G — Messagerie

```text
G1 — Catégories de message
G2 — Lien message ↔ objet clinique
G3 — Brouillon IA praticien
G4 — Validation/envoi
```

### Lot H — Biologie raisonnée

```text
H1 — Catalogue marqueurs sans résultat patient
H2 — Packs dynamiques
H3 — Document médecin
H4 — Résultats réels seulement après cadre HDS
```

## Priorisation par valeur / risque

| Module | Valeur | Risque | Priorité |
|---|---:|---:|---|
| UX cockpit | Haute | Faible | 1 |
| Protocole Builder | Très haute | Moyen | 2 |
| Fiches conseils | Haute | Faible | 3 |
| Compléments clean label | Très haute | Moyen | 4 |
| Boussole alimentaire | Très haute | Moyen/élevé | 5 |
| Momentum | Haute | Moyen | 6 |
| Messagerie | Haute | Élevé | 7 |
| Biologie réelle | Très haute | Très élevé/HDS | 8 |

## Branches suggérées

```text
feat/ux-practitioner-shell-3
feat/ux-patient-home-v1
feat/protocol-builder-v1
feat/contextual-advice-sheets
feat/supplement-library-v1
feat/food-compass-slice-v1
feat/momentum-checkins-v1
feat/contextual-messaging-v1
docs/biology-reasoned-catalog
```

## Critères transverses de Definition of Done

- UI française.
- Aucun secret.
- Patients fictifs uniquement.
- Type-check OK.
- Pas de migration sans confirmation.
- Garde-fous vocabulaire.
- Validation praticien si contenu diffusé patient.
- Pas de donnée biologique réelle hors cadre prévu.

## Prompt agent planification

```text
À partir de cette roadmap, propose un plan de développement en branches courtes pour WellNeuro. Respecte : une branche = un périmètre, pas de migration sans confirmation, UI française, patients fictifs uniquement. Priorise UX cockpit, protocole builder, fiches conseils, compléments, puis Boussole alimentaire. Pour chaque branche : objectif, fichiers probables, risques, critères d’acceptation, tests.
```
