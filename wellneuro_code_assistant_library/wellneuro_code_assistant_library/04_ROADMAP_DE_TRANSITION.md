# 04 — Roadmap de transition depuis l’état actuel

## Principe

Partir du socle existant sans refonte totale.

```text
Socle actuel : Next.js + Prisma + Auth + questionnaires + synthèse IA
↓
UX cockpit
↓
protocole minimal
↓
documents
↓
compagnon patient
↓
momentum
↓
modules avancés
```

## Phase 0 — Alignement documentaire

### Objectif

Rendre la documentation cohérente avec l’état réel du dépôt.

### Actions

- Vérifier `docs/roadmap.md` versus `docs/claude/SESSION_LOG.md`.
- Vérifier l’état réel des routes anciennement liées à Sheets.
- Mettre à jour README, roadmap, contexte projet si nécessaire.
- Ne pas changer de code métier dans cette phase.

### Critères d’acceptation

- Un agent de code sait quelle source fait foi.
- Les dettes actives sont explicitement listées.
- Les modules déjà livrés ne sont pas redéveloppés par erreur.

## Phase 1 — UX cockpit praticien

### Objectif

Transformer l’espace praticien en cockpit de décision.

### Branches suggérées

```text
feat/ux-practitioner-shell-3
feat/patient-cockpit-sections
feat/patient-decision-summary
```

### Hors périmètre

- migration DB ;
- changement de scoring ;
- changement IA ;
- protocole persistant.

## Phase 2 — Protocole 21 jours minimal

### Objectif

Créer un builder simple permettant de préparer un protocole phase 1.

### Branches suggérées

```text
feat/protocol-builder-v1-static
feat/protocol-therapeutic-load
feat/protocol-validation-review
```

### Démarrage conseillé

Commencer sans persistance DB si possible : objets TypeScript + état front + génération HTML imprimable. Ajouter la persistance seulement après validation UX.

## Phase 3 — Documents multi-destinataires

### Objectif

Générer des documents issus du protocole validé.

### Branches suggérées

```text
feat/document-bundle-v1
feat/patient-protocol-printable
feat/doctor-note-printable
```

## Phase 4 — Compagnon patient minimal

### Objectif

Créer un accueil patient longitudinal calme : priorité, action du jour, fiche, check-in.

### Branches suggérées

```text
feat/patient-home-companion-v1
feat/patient-checkin-ui-v1
feat/patient-action-card-v1
```

### Remarque

Le check-in peut d’abord être mocké ou local/non persistant. Persistance à confirmer ensuite.

## Phase 5 — Fiches conseils contextuelles

### Objectif

Créer une petite bibliothèque validée de fiches simples.

### Branches suggérées

```text
feat/advice-sheets-static-library
feat/advice-sheet-in-protocol
```

## Phase 6 — Momentum J7/J14/J21

### Objectif

Transformer le suivi en décision : continuer, alléger, densifier, pivoter, explorer.

### Branches suggérées

```text
feat/momentum-snapshots-v1
feat/j21-decision-panel
```

## Phase 7 — Modules avancés

### À lancer seulement après stabilisation

- compléments clean label ;
- Boussole alimentaire vertical slice ;
- biologie raisonnée catalogue ;
- messagerie contextualisée ;
- copilotes IA spécialisés.

## Ordre recommandé final

```text
0. Documentation et dette réelle
1. Shell cockpit praticien
2. Fiche patient découpée
3. Résumé décisionnel
4. Protocole 21 jours minimal
5. Charge thérapeutique
6. Documents validés
7. Compagnon patient minimal
8. Fiches conseils
9. Momentum J21
10. Clean label / Boussole / Messagerie / Biologie raisonnée
```
