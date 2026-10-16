# Handoff — ACT-1, conditions d'utilisation, PR 2 sur 2 (D-292, lettre k)

## Branche et état Git

- Branche `feat/conditions-utilisation-pr2`, depuis `origin/main` 1ab0793f
  (PR 1 #1502 mergée en 7715a194), dans le worktree
  `.claude/worktrees/cc8-migration` (session concurrente).
- Commits : 4a6d8ae3 (code et docs), 18837888 (suites de revue), puis ce
  handoff. PR ouverte depuis cette branche.

## Objectif

Fin du lot de code de D-292, dernier préalable technique d'ACT-1 (H70), sous
`WN_PORTAIL_CONDITIONS`, éteint, sans migration : la destination du lien
magique, le gabarit d'e-mail, l'envoi au cockpit.

## Décisions prises

- Destination du lien dans l'URL (`?vers=conditions`), liste fermée, résolue
  sous `/portail/<idPatient>`, lue après toutes les gardes ; valeur inconnue =
  accueil, sans refus. Aucune colonne neuve (lot sans migration).
- Gabarit `conditions_utilisation` v1 : texte de la proposition validée mot
  pour mot, plus la phrase des 24 h ; signé « Wellneuro » ; `Reply-To` au
  praticien du dossier ; `valideLe` 2026-10-16.
- Destinataires : dossiers en cours, portail ouvert, majeurs, **suivis** (le
  texte vise « les patients déjà suivis » ; un nouveau patient lit les
  conditions à l'accueil), sans accusé de la version en vigueur, non réservés.
- Envoi unique tenu en base : réservation avant envoi sous la clé unique
  existante `(source_type, source_id)` ; échec = libération ; trace non soldée
  = réservation gardée (jamais deux e-mails). Lots de dix par appel.
- Section du cockpit sous « Confiance & droits », absente drapeau fermé ;
  l'envoi exige aussi `WN_G4_LIEN_MAGIQUE` et `SMTP_URL`.
- D-292 amendée (puce « PR 2, mise en œuvre »).

## Fichiers modifiés

- Lien : `web/src/lib/portail/{lienMagique.ts,emissionLienMagique.ts}`,
  `web/src/app/portail/lien/[jeton]/route.ts`, `web/src/lib/consultation/email.ts`.
- Gabarit et journal : `web/src/lib/correspondance/{registreGabarits.ts,patient.ts}`.
- Envoi : `web/src/lib/trust/{envoiConditions.ts,annonceConditions.ts,avantDeCommencer.ts}`,
  `web/src/app/api/praticien/conditions-utilisation/route.ts`,
  `web/src/components/EnvoiConditionsPanel.tsx`, `web/src/app/dashboard/droits/page.tsx`.
- Page : `web/src/app/portail/[token]/conditions/page.tsx` (réessais, retour à l'accueil).
- Garde : `web/src/app/api/praticien/leveeRevocationConfirmee.guard.test.ts` (route lectrice).
- Docs : `docs/DECISIONS.md` (D-292), `docs/FEATURE_FLAGS.md`,
  `docs/claude/PLAN_WELLNEURO.md` (H70), `docs/claude/MATRICE_CONSOMMATION.md`
  (régénérée : une surface indirecte de plus, via le module d'e-mail),
  `changelog.d/2026-10-16-conditions-utilisation-pr2.md`.

## Validations exécutées

- T1 complet vert sur 4a6d8ae3 puis sur 18837888.
- T3 sur 4a6d8ae3 : rouge à l'étape unitaire (garde de révocation : route non
  classée), corrigé dans 18837888. T3 complet sur 18837888 : vert (unitaires,
  contrats SQL, build, 271 E2E Chromium + WebKit), drapeau fermé.
- Revue `wn-reviewer` de 4a6d8ae3 : aucun P0, un P1 (envoi unique non garanti),
  six P2. P1 et P2 2, 3, 4 corrigés ; P2 5 et 6 consignés (FEATURE_FLAGS, H70).
  Contre-vérification de 18837888 : P1 fermé, aucun P0/P1 introduit, go.

## Problèmes ouverts

- Réservation orpheline invisible au cockpit (P2 de la contre-revue) : routée
  sur H70, à lire par conteneur à l'activation.
- Une erreur SMTP survenue après l'acceptation du message libère la
  réservation : un nouveau clic renverrait (rare, sens assumé).
- Aucun E2E drapeau ouvert ; le parcours se constate sur un vrai dossier.
- `publieLe` de la v1 vaut 2026-10-16, pas le jour de l'activation.

## Prochaine action exacte

Merge de la PR 2 après revue CodeRabbit sur le sha de tête. Puis ACT-1 :
ouvrir `WN_PORTAIL_CONDITIONS` (geste du responsable), envoyer depuis
« Confiance & droits », constater l'accusé sur un premier vrai dossier par
identifiant en conteneur ; garder `WN_G4_LIEN_MAGIQUE` ouvert 24 h au moins.

## Interdits encore actifs

- Aucune migration sans demande explicite ; une release-db à la fois.
- `WN_PORTAIL_CONDITIONS` éteint jusqu'à ACT-1.
- Ne pas toucher aux entrées SESSION_LOG des autres sessions ; jamais de
  switch dans la copie principale.
