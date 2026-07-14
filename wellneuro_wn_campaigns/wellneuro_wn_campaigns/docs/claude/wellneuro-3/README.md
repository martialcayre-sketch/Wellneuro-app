# Bibliothèque assistant de code — WellNeuro 3.0

Cette bibliothèque Markdown transforme la conversation de brainstorming et les documents fournis en **dossier opératoire pour un assistant de code**.

Elle ne contient pas de code applicatif et ne doit pas déclencher automatiquement de modification du dépôt. Elle sert à guider des branches courtes, auditables et compatibles avec l’état actuel de WellNeuro.

## Objectif produit

Passer de WellNeuro v2 — questionnaires, scores, synthèse IA, portail patient — à WellNeuro 3.0 :

```text
questionnaires + anamnèse + Mon équilibre
↓
fiche patient cockpit
↓
priorité clinique 21 jours
↓
protocole minimal validé
↓
documents multi-destinataires
↓
compagnon patient simple
↓
ajustement J7/J14/J21
```

## Principe directeur

> Sobriété clinique assistée : prioriser, simplifier, expliquer, valider, suivre.

L’app doit réduire le bruit clinique. Elle ne doit pas produire plus de recommandations que le patient ou le praticien ne peuvent réellement utiliser.

## Ordre de lecture recommandé

1. `00_START_HERE_AGENT_CODE.md`
2. `01_ETAT_ACTUEL_DEPOT_ET_ROADMAP.md`
3. `02_OBJECTIF_CIBLE_BRAINSTORM.md`
4. `03_HIERARCHISATION_STRATEGIQUE.md`
5. `04_ROADMAP_DE_TRANSITION.md`
6. `05_VERTICAL_SLICE_1_FICHE_PATIENT_COCKPIT_PROTOCOLE.md`
7. `13_PROMPTS_AGENT_CODE.md`
8. `14_DEFINITION_OF_DONE.md`

Les fichiers `06` à `12` détaillent les modules.

## Source intégrée

Le dossier `source_evolutions_originales/` reprend les fichiers Markdown fournis dans le zip initial : jumeau clinique, protocole 21 jours, Boussole alimentaire, clean label, biologie raisonnée, compagnon patient, messagerie, momentum, booklets et copilotes IA.

## Règles impératives

- Interface utilisateur en français.
- Pas de secret en dur.
- Patients fictifs uniquement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Pas de donnée patient réelle dans les maquettes, prompts, seeds ou tests.
- Pas de migration Prisma/SQL sans demande explicite et confirmation.
- Pas de prescription automatique.
- Pas de diagnostic automatique.
- Validation praticien obligatoire avant diffusion patient.
- Ne jamais mélanger dans une même PR : refonte UI, migration DB, logique clinique, IA générative, et sécurité.
