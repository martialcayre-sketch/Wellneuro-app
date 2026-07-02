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

## Phase 4 — Connexion OAuth production (NextAuth)

- [ ] Vérifier dans Google Cloud Console le bon client OAuth (ID utilisé en prod Wellneuro).
- [ ] Vérifier `Origines JavaScript autorisées` : `https://app.wellneuro.fr`.
- [ ] Vérifier `URI de redirection autorisés` : `https://app.wellneuro.fr/api/auth/callback/google`.
- [ ] Vérifier l'absence d'URI erronée prioritaire (exemple : `https://www.wellneuro.fr/api/auth/callback/google` si non utilisée).
- [ ] Vérifier les variables Vercel de prod : `NEXTAUTH_URL=https://app.wellneuro.fr`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`.
- [ ] Tester la connexion praticien sur `/login` avec un compte `@wellneuro.fr`.
- [ ] Vérifier qu'aucune erreur `redirect_uri_mismatch` n'apparaît.

## Contrôle post-déploiement (Vercel + Google)

1. Déployer `main` puis confirmer le statut `Ready` sur Vercel.
2. Vérifier que le domaine `app.wellneuro.fr` répond sans `404`.
3. Vérifier le flux OAuth via `https://app.wellneuro.fr/login`.
4. En cas d'erreur OAuth, contrôler en priorité la paire:
	- Origin: `https://app.wellneuro.fr`
	- Redirect URI: `https://app.wellneuro.fr/api/auth/callback/google`
5. Attendre 5 à 10 minutes après un changement Google Cloud avant re-test.
6. Consigner l'incident et la correction dans `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`.

## Vérification sécurité

- [ ] Pas de clé API dans les feuilles Sheets.
- [ ] Pas de réponses patient complètes dans les erreurs d'audit.
- [ ] Email masqué dans `Booklet_Envois`.
- [ ] `bash scripts/check_no_secrets.sh` passe sans erreur.
- [ ] Aucune donnée sensible dans le dépôt Git.
