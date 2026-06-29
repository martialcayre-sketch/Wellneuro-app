# Contexte Projet

## Vision

Wellneuro NNPP2 est un MVP de parcours praticien-patient en neuronutrition clinique.
Le socle actuel est Google Apps Script + Google Sheets.

## Priorite produit

Stabiliser le MVP GAS end-to-end avant toute migration.

## Hors perimetre (sauf demande explicite)

- Migration Next.js
- Migration PostgreSQL
- Auth0
- Hebergement HDS

## Architecture actuelle

- `Code.gs` / `src/gas/Code.gs`: logique serveur et orchestration GAS
- `Questions.gs` / `src/gas/Questions.gs`: catalogue et scoring questionnaires
- `index.html` / `src/gas/index.html`: interface patient/praticien
- Google Sheets: stockage patients fictifs, assignations, reponses, resultats

## Flux metier simplifie

1. Initialiser ou verifier catalogue de questionnaires.
2. Creer un patient fictif autorise.
3. Assigner un questionnaire.
4. Patient saisit des reponses.
5. Score calcule et visible cote praticien.

## Definition d'une intervention IA utile

Une intervention est utile si elle:
- reduit le risque de regression,
- respecte la securite/RGPD,
- conserve le cadre clinique existant,
- facilite les tests end-to-end.
