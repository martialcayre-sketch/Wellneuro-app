# Checklist de validation end-to-end du MVP GAS

Exécuter cette checklist avec des données fictives uniquement.
Patients autorisés : Sophie Nicola, Jennifer Martin, Michel Dogné.

## Phase 1 — Parcours questionnaire

- [ ] Initialiser le catalogue de questionnaires.
- [ ] Créer un patient fictif.
- [ ] Assigner un questionnaire au patient fictif.
- [ ] Vérifier l'affichage côté patient.
- [ ] Ouvrir le questionnaire depuis l'espace patient.
- [ ] Soumettre des réponses fictives.
- [ ] Vérifier le calcul du score sans modifier les seuils cliniques.
- [ ] Vérifier la remontée du résultat côté praticien.
- [ ] Tester le double rôle avec `martialcayre@wellneuro.fr` en environnement de développement.
- [ ] Confirmer qu'aucune donnée réelle n'est exportée ou committée.

## Phase 2 — Synthèse IA

- [ ] Vérifier `ANTHROPIC_API_KEY` dans les propriétés Apps Script.
- [ ] Vérifier `SHEET_ID` et `WEB_APP_URL` dans les propriétés Apps Script.
- [ ] Exécuter `testSyntheseIA()` depuis l'éditeur Apps Script.
- [ ] Vérifier la création de `Syntheses_IA` et `Audit_Syntheses_IA`.
- [ ] Générer une synthèse IA depuis l'interface praticien.
- [ ] Vérifier le contenu prudent (pas de dosage, pas de protocole inventé).
- [ ] Ajouter une note praticien.
- [ ] Valider la synthèse.
- [ ] Rejeter une synthèse (avec note obligatoire).
- [ ] Régénérer une synthèse rejetée.
- [ ] Sauver des notes après validation (statut passe à `Corrigee_Praticien`).
- [ ] Vérifier que l'absence de clé API n'empêche pas l'affichage des résultats classiques.

## Phase 3 — Booklet patient

- [ ] Sélectionner un patient fictif avec au moins 2 questionnaires complétés.
- [ ] Valider ou corriger la synthèse IA.
- [ ] Cliquer « Préparer le booklet patient ».
- [ ] Vérifier que le bouton n'apparaît pas si la synthèse n'est pas validée.
- [ ] Vérifier la prévisualisation (iframe).
- [ ] Vérifier la date du document (date de validation praticien).
- [ ] Vérifier le destinataire affiché.
- [ ] Tester « Imprimer / PDF ».
- [ ] Vérifier que le bouton d'envoi est bloqué tant que la case de relecture n'est pas cochée.
- [ ] Cocher la relecture et envoyer au patient fictif.
- [ ] Vérifier la réception email.
- [ ] Vérifier `Booklet_Envois` (email masqué, statut `Envoye`, opération `Envoi`).
- [ ] Tenter un renvoi : vérifier la confirmation renforcée.
- [ ] Vérifier qu'une synthèse trop vide est refusée.

## Vérification sécurité

- [ ] Pas de clé API dans les feuilles Sheets.
- [ ] Pas de réponses patient complètes dans les erreurs d'audit.
- [ ] Email masqué dans `Booklet_Envois`.
- [ ] `bash scripts/check_no_secrets.sh` passe sans erreur.
- [ ] Aucune donnée sensible dans le dépôt Git.
