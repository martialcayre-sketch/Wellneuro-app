# Backlog priorisé — Reprise dev WellNeuro

Date : 2026-07-09

---

## Priorité P0 — À faire avant toute nouvelle évolution

### Tâche 1 — Réaligner la documentation

**Type** : documentation
**Risque** : faible
**Impact** : très élevé

Fichiers :

- `README.md`
- `AGENTS.md`
- `docs/roadmap.md`
- `docs/claude/PROJET_CONTEXTE.md`
- `docs/claude/SESSION_LOG.md`

Description :

Mettre à jour les documents pour refléter :

- décommission Sheets/OAuth ;
- portail patient permanent ;
- hub questionnaires ;
- session cookie signée ;
- registre packs/questionnaires ;
- synthèse IA enrichie par anamnèse.

---

### Tâche 2 — Vérifier l'absence de dépendance Sheets résiduelle

**Type** : audit code
**Risque** : faible
**Impact** : élevé

Rechercher :

- `SHEET_ID`
- `spreadsheets`
- `sheets.googleapis.com`
- `googleapis`
- `access_token`
- `migrate-historique`

Sortie attendue :

- liste des occurrences ;
- statut : actif / obsolète / documentation uniquement ;
- correction documentaire si nécessaire.

---

### Tâche 3 — Test E2E portail patient sur patient fictif

**Type** : test manuel
**Risque** : moyen
**Impact** : très élevé

Utiliser uniquement :

- Sophie Nicola ;
- Jennifer Martin ;
- Michel Dogné.

Sortie attendue :

- checklist remplie ;
- bugs constatés ;
- captures éventuelles ;
- décisions UX.

---

## Priorité P1 — Stabilisation produit

### Tâche 4 — Compléter le pack « Base de consultation »

**Type** : configuration / UI
**Risque** : moyen
**Impact** : élevé

À vérifier :

- questionnaires inclus ;
- ordre ;
- durée totale ;
- lisibilité patient ;
- absence de doublon majeur avec l'anamnèse.

---

### Tâche 5 — Vérifier la demande de correction enrichie

**Type** : E2E patient/praticien
**Risque** : moyen
**Impact** : élevé

Vérifier :

- commentaire facultatif côté patient ;
- statut visible ;
- affichage côté fiche patient ;
- déverrouillage manuel ;
- retransmission.

---

### Tâche 6 — Tester la synthèse IA avec anamnèse

**Type** : E2E clinique
**Risque** : moyen à élevé
**Impact** : élevé

Scénarios :

- sans anamnèse ;
- avec anamnèse ;
- avec traitements ;
- avec compléments ;
- avec signal d'alerte ;
- avec DNSM.

---

## Priorité P2 — Dette technique structurante

### Tâche 7 — Lire les packs depuis le registre relationnel

**Type** : dev backend
**Risque** : moyen
**Impact** : élevé

Principe :

- lecture primaire depuis `questionnaire_packs` ;
- fallback `packs.qids` ;
- pas de suppression de colonne ;
- pas de migration destructive.

---

### Tâche 8 — Rapport de cohérence legacy vs registre

**Type** : script / audit
**Risque** : faible
**Impact** : moyen

Comparer :

- `packs.qids` ;
- `questionnaire_packs` ;
- `pack_questionnaires`.

Sortie :

- packs cohérents ;
- packs partiellement synchronisés ;
- questionnaires inconnus ;
- ordre divergent.

---

### Tâche 9 — Harmonisation design patient

**Type** : UI
**Risque** : faible à moyen
**Impact** : moyen

Cibles :

- hub questionnaires ;
- page questionnaire ;
- messages d'erreur ;
- boutons ;
- badges ;
- consentement.

Ne pas modifier :

- logique patient ;
- scoring ;
- APIs ;
- schéma Prisma.

---

## Priorité P3 — Préparation clinique avancée

### Tâche 10 — Geler le contrat du moteur de priorisation

**Type** : cadrage clinique / technique
**Risque** : élevé
**Impact** : élevé

Ne pas implémenter avant validation de R0-R5.

Décisions à trancher :

- nombre maximal d'actions par phase ;
- poids du score de priorité ;
- gestion biomarqueur vs questionnaire ;
- traçage des overrides praticien ;
- sobriété de prescription.

---

### Tâche 11 — Préparer le module compléments clean label

**Type** : cadrage
**Risque** : élevé
**Impact** : très élevé

Ne pas démarrer le code avant :

- validation du registre produits ;
- sources réglementaires ;
- garde-fous grossesse / vegan / intolérances ;
- additifs controversés ;
- interactions ;
- posologies VNR vs posologies neuronutrition.

---

## Décision de backlog

Ne pas ouvrir P3 avant clôture de P0 et P1.

Le flux clinique central doit être robuste avant l'automatisation des protocoles.
