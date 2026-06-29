## Phase 4A - Dashboard Ops praticien : contexte pre-deploiement

## Objectif du document
Ce document formalise le contexte complet avant finalisation Git de la Phase 4A du MVP Wellneuro NNPP2.
La Phase 4A ajoute une visibilite operationnelle dans le tableau praticien, sans modifier la logique clinique, sans changer les seuils de scoring, et sans migration technique hors Google Apps Script + Google Sheets.

## Etat Git et deploiement au moment de redaction
- Branche active: main.
- Depot: travaux locaux en cours sur le lot Phase 4A.
- Fichiers concernes par le lot ops:
  - src/gas/Code.gs
  - src/gas/index.html
- Aucun deploiement GAS n’est confirme pour ce lot a ce stade.
- Aucun changement clinique n’est introduit par ce lot.

## Perimetre fonctionnel de la Phase 4A
Inclus:
- Ajout d’un bloc Suivi operationnel dans l’interface praticien.
- Affichage de compteurs de pilotage issus des feuilles techniques existantes.
- Affichage d’une activite recente.

Exclus:
- Modification des questionnaires.
- Modification des regles de scoring.
- Nouvelles recommandations cliniques.
- Automatisation d’envoi patient.
- Migration Next.js/PostgreSQL/Auth0/HDS.

## Implementation technique realisee
### Backend GAS
Dans src/gas/Code.gs:
- Ajout d’une aggregation metriques praticien via getPracticienMetrics_.
- Enrichissement du retour de getPraticienDashboard pour exposer les metriques.
- Sources: Syntheses_IA, Booklet_Envois, Audit_Syntheses_IA.

### Frontend HTML
Dans src/gas/index.html:
- Ajout d’une carte Suivi operationnel dans la vue praticien.
- Raccordement des metriques au chargement de la home praticien.
- Indicateurs: syntheses IA, validations/corrections, booklets envoyes, erreurs audit, derniere activite.

## Contraintes securite et conformite maintenues
- SHEET_ID jamais en dur.
- SHEET_ID via Script Properties uniquement.
- Aucun secret/token/donnee patient reelle commit.
- Patients fictifs autorises: Sophie Nicola, Jennifer Martin, Michel Dogne.
- Pas d’augmentation de donnees de sante en logs.

## Verification technique effectuee sur le lot
- Verification syntaxe JS index.html.
- Verification syntaxe Code.gs.
- Controle anti-secrets.
- Verification coherence diff.
- Diagnostics editeur sans erreur bloquante.

## Verification fonctionnelle recommandee avant commit final
1. Verifier l’affichage du bloc Suivi operationnel en vue praticien.
2. Verifier le peuplement des compteurs.
3. Verifier le comportement si feuilles vides.
4. Verifier absence d’impact sur synthese IA et booklet.
5. Verifier absence d’information sensible dans erreurs UI.

## Decisions de conception
- Priorite a la stabilisation MVP GAS.
- Increment faible risque: observabilite operationnelle.
- Aucun changement de logique clinique.
- Aucun deploiement automatique.

## Prochaines etapes proposees Phase 4B
1. Ajouter un historique recent ops.
2. Ajouter un filtre temporel 7 jours / 30 jours.
3. Completer la trace dans CHANGELOG.md apres validation du perimetre.
