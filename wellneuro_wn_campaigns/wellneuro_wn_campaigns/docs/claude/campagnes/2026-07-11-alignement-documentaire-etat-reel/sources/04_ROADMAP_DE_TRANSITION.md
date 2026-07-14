# 04 — Roadmap de transition depuis l'état actuel

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

Rendre la documentation cohérente avec l'état réel du dépôt.

### Actions

- Vérifier `docs/roadmap.md` versus `docs/claude/SESSION_LOG.md`.
- Vérifier l'état réel des routes anciennement liées à Sheets.
- Mettre à jour README, roadmap, contexte projet si nécessaire.
- Ne pas changer de code métier dans cette phase.

### Critères d'acceptation

- Un agent de code sait quelle source fait foi.
- Les dettes actives sont explicitement listées.
- Les modules déjà livrés ne sont pas redéveloppés par erreur.

## Phase 1 — UX cockpit praticien

### Objectif

Transformer l'espace praticien en cockpit de décision.

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
