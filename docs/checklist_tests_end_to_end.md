# Checklist de validation end-to-end (Next.js)

Exécuter cette checklist avec des données fictives uniquement.
Patients autorisés : Sophie Nicola, Jennifer Martin, Michel Dogné.

## Phase 1 — Parcours questionnaire (portail patient)

- [ ] Créer un patient fictif depuis `/dashboard/patients`.
- [ ] Assigner un questionnaire au patient fictif.
- [ ] Ouvrir le lien `/patient/[idAssignation]` généré.
- [ ] Vérifier l'email gate (email attendu vs assignation en base).
- [ ] Soumettre des réponses fictives.
- [ ] Vérifier le calcul du score sans modifier les seuils cliniques.
- [ ] Vérifier la remontée du résultat côté praticien (`/dashboard/patients`).
- [ ] Vérifier l'accusé de réception email patient.
- [ ] Confirmer qu'aucune donnée réelle n'est exportée ou committée.

## Phase 2 — Synthèse IA

- [ ] Vérifier `ANTHROPIC_API_KEY` dans les variables d'environnement (Vercel en prod, `.env.local` en dev).
- [ ] Générer une synthèse IA depuis `/dashboard/synthese` pour un patient avec au moins 2 questionnaires complétés.
- [ ] Vérifier le contenu prudent (pas de dosage, pas de protocole inventé).
- [ ] Ajouter une note praticien.
- [ ] Valider la synthèse.
- [ ] Rejeter une synthèse (avec note obligatoire).
- [ ] Régénérer une synthèse rejetée.
- [ ] Vérifier que l'absence de clé API n'empêche pas l'affichage des résultats classiques.

## Phase 3 — Booklet patient

- [ ] Sélectionner un patient fictif avec une synthèse IA validée.
- [ ] Cliquer « Préparer le booklet patient ».
- [ ] Vérifier que le bouton n'apparaît pas si la synthèse n'est pas validée.
- [ ] Vérifier la prévisualisation (iframe).
- [ ] Vérifier la date du document (date de validation praticien).
- [ ] Tester « Imprimer / PDF ».
- [ ] Vérifier que le bouton d'envoi est bloqué tant que la case de relecture n'est pas cochée.
- [ ] Cocher la relecture et envoyer au patient fictif.
- [ ] Vérifier la réception email.
- [ ] Vérifier l'audit `BookletEnvoi` (email masqué, statut `Envoye`).
- [ ] Tenter un renvoi : vérifier la confirmation renforcée.

## Phase 4 — Connexion OAuth production (NextAuth)

- [ ] Vérifier dans Google Cloud Console le bon client OAuth (celui utilisé en prod Wellneuro).
- [ ] Vérifier `Origines JavaScript autorisées` : `https://app.wellneuro.fr`.
- [ ] Vérifier `URI de redirection autorisés` : `https://app.wellneuro.fr/api/auth/callback/google`.
- [ ] Vérifier les variables Vercel de prod : `NEXTAUTH_URL=https://app.wellneuro.fr`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXTAUTH_SECRET`.
- [ ] Tester la connexion praticien sur `/login` avec un compte `@wellneuro.fr`.
- [ ] Vérifier qu'aucune erreur `redirect_uri_mismatch` n'apparaît.

## Contrôle post-déploiement (Vercel)

1. Déployer `main` puis confirmer le statut `Ready` sur Vercel.
2. Vérifier que le domaine `app.wellneuro.fr` répond sans `404`.
3. Vérifier le flux OAuth via `https://app.wellneuro.fr/login`.
4. En cas d'erreur OAuth, contrôler en priorité la paire :
	- Origin: `https://app.wellneuro.fr`
	- Redirect URI: `https://app.wellneuro.fr/api/auth/callback/google`
5. Attendre 5 à 10 minutes après un changement Google Cloud avant re-test.
6. En cas d'incident de routage/domaine, consulter d'abord le runbook `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`.

## Vérification sécurité

- [ ] Pas de clé API ni de secret dans le code source ou les commits.
- [ ] Pas de réponses patient complètes dans les logs ou l'audit.
- [ ] Email masqué dans l'audit `BookletEnvoi`.
- [ ] `bash scripts/check_no_secrets.sh` passe sans erreur.
- [ ] `cd web && npm run type-check` passe sans erreur.
- [ ] Aucune donnée sensible dans le dépôt Git.
