# Checklist de validation end-to-end (Next.js)

Exécuter cette checklist avec des données fictives uniquement.
Patients autorisés : Sophie Nicola, Jennifer Martin, Michel Dogné.

## Phase 0 — Parcours patient unifié (portail permanent `/portail/[token]`) — lot R1

Flux patient principal. À exécuter en R1 avant tout nouveau chantier.

> Exécution R1 du 2026-07-09 — environnement A (prod `app.wellneuro.fr`), patient
> fictif Michel Dogné (`PAT_SEED_03`). Étapes API/serveur validées par pilotage
> HTTP. Complément du 2026-07-10 : étapes navigateur validées en Chromium headless
> (Playwright, desktop + émulation iPhone 13) sur le même patient fictif —
> 21/22 vérifications PASS. Seul reste à faire sur téléphone réel : la validation
> tactile finale (l'émulation ne remplace pas le device).

- [x] Créer ou sélectionner un patient fictif depuis `/dashboard/patients`.
- [x] Créer / envoyer un accès portail (token) au patient.
- [x] Ouvrir `/portail/[token]`.
- [x] Saisir l'email **une seule fois** (vérifier qu'il n'est pas redemandé ensuite).
- [x] Donner le consentement (groupé, tracé — version + finalité horodatées).
- [x] Compléter la fiche signalétique (contrôle des champs requis vérifié : 400 si incomplet).
- [x] Compléter l'anamnèse (motif & attentes, histoire, signaux d'alerte, antécédents, traitements/compléments).
- [x] Valider l'onboarding (4 assignations créées depuis le pack par défaut « Base de consultation »).
- [x] Vérifier la redirection vers le hub « Mes questionnaires ». *(navigateur — lien « Accéder à mes questionnaires » après onboarding ; rechargement du hub sans re-saisie email via cookie session)*
- [x] Ouvrir un questionnaire au choix.
- [x] Sauvegarder un brouillon, quitter puis revenir → vérifier la restauration du brouillon. *(navigateur — clé `wellneuro:draft:{idAssignation}`, badge « Brouillon enregistré » + bouton « Reprendre » au hub, réponses restaurées)*
- [x] Réinitialiser un questionnaire **non transmis** (vérifier que le reset est bien limité au non-transmis). *(navigateur — brouillon vidé, badge redevenu « À compléter » ; un questionnaire transmis s'ouvre en lecture seule, sans boutons brouillon/reset)*
- [x] Transmettre un questionnaire au praticien → vérifier le verrouillage (retransmission refusée en 409).
- [x] Consulter les réponses verrouillées (via cookie de session, sans email en URL).
- [x] Demander une correction avec commentaire (commentaire + horodatage tracés en base).
- [x] Vérifier l'affichage de la demande côté praticien (fiche patient).
- [x] Déverrouiller manuellement côté praticien.
- [x] Corriger et retransmettre côté patient (nouvelle version relue, re-verrouillage effectif).

Critères de validation :

- [x] Pas de ressaisie répétée de l'email ; aucun email exposé en URL de page. *(`/api/portail/session` est passé en POST JSON — vérifié en navigateur le 2026-07-10 : aucune query string sur l'appel session. Constat résiduel : la vue « Consulter » (réponses verrouillées) appelle encore `GET /api/patient/reponses?…&email=…` avec l'email en query string — même classe de problème, correctif à prévoir hors lot de validation.)*
- [x] Consentement non redemandé inutilement (hérité au niveau assignation).
- [x] Navigation libre entre questionnaires depuis le hub (aucun ordre imposé).
- [x] Statuts compréhensibles (badges textuels : « À compléter », « Transmis au praticien », « Correction demandée », « Déverrouillé par le praticien » — jamais la seule couleur).
- [ ] Rendu mobile utilisable (téléphone réel). *(Émulation iPhone 13 validée le 2026-07-10 : aucun débordement horizontal, boutons ≥ 38 px, badges textuels lisibles ; titres de questionnaires tronqués sur mobile — amélioration UX à considérer en R4. Le passage sur téléphone réel reste à faire.)*
- [x] Aucune donnée réelle exportée ou committée.

## Phase 1 — Parcours questionnaire (flux patient legacy `/patient/[idAssignation]`)

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

## Design system praticien — série D1

- [x] `/login` et `/dashboard` (shell, NavBar) : thème sombre praticien
  lisible, logo « Wellneuro » en accent or, contraste AA vérifié (D1-3).
- [x] `/dashboard` (métriques) : `MetricCard`/skeleton conformes au
  thème sombre, bandeau « indisponible » lisible (D1-4).
- [x] `/dashboard/patients` : formulaires, tableau patients (`PatientRow`),
  panneau édition, panneau résultats, tableau assignations — conformes
  au thème sombre avec les 3 patients fictifs autorisés (D1-5).
- [ ] `ScoreGauge`/`ScoreRadar`/`ScoreBarChart`/`ScoreSparkline`/
  `ScoreThreshold` (Recharts, D1-2b) : seuils cliniques jamais signalés
  par la seule couleur (icône/motif/libellé requis).
- [ ] `docs/design-system-d1.md` (D1-6) à jour avec les composants livrés.

## Contrôle post-déploiement (Vercel)

Commande de vérification rapide avant/pendant bascule:

```bash
bash scripts/release_go_no_go.sh --url https://app.wellneuro.fr
```

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
