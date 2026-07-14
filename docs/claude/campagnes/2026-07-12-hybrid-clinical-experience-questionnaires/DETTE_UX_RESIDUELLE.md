# Dette UX résiduelle — HC-F

Dette non bloquante, consciemment acceptée à la clôture de la campagne
HC-F. Aucun élément ci-dessous n'a été maquillé comme résolu.

## Dette de code / portail patient

- **Brouillon wizard non chiffré** (`web/src/app/portail/[token]/page.tsx`).
  Mitigé par une expiration à 30 jours (`WIZARD_DRAFT_TTL_MS`, LOT-04) mais
  le contenu reste en clair dans le stockage local de l'appareil. À traiter
  si un audit sécurité futur l'exige.
- **`readWizardDraft` ne valide pas la forme du JSON parsé**, contrairement à
  `questionnaire-draft.ts` qui le fait. Incohérence mineure sans conséquence
  pratique constatée (LOT-04).
- **Persistance serveur du brouillon patient absente** — l'état
  « Synchronisé » n'existe pas dans l'implémentation (voir
  `LEXIQUE_UX_WELLNEURO.md`). Tout futur besoin de reprise multi-appareil
  nécessite de construire cette persistance, hors périmètre HC-F.
- **`GET /api/patient/reponses` accepte encore un `email` en query string**
  (compat legacy, cookie de session prioritaire) — même classe de problème
  que l'ancien constat Phase 0 (email exposé en URL). Pré-existant à HC-F,
  non touché par cette campagne ; correctif à prévoir hors périmètre.
- **`MonEquilibreAccueil`/`Detail`** : même problème d'auto-fetch
  patient-only que `ConsultationScreen.tsx` avant LOT-03 — non couvert par
  `PatientPreview` (le bouton « Voir Mon équilibre » y est simplement
  masqué en mode prévisualisation). Classé Vague 2
  (`MATRICE_ECRANS_MIGRATION.md`).

## Dette de navigation praticien

- **Pas de *focus trap* complet dans la sheet mobile « Plus »**
  (`MobileBottomNav.tsx`) — le focus peut sortir du panneau au Tab. Acceptée
  depuis LOT-03/LOT-04 ; à traiter hors périmètre de cette campagne si un
  besoin réel est identifié.
- **Palette de commandes praticien** : arbitrage différé (LOT-00), non
  révisé depuis. Aucun prérequis technique bloquant si un futur lot souhaite
  la livrer.

## Dette de validation (cette session, LOT-05)

- **WebKit/iPhone 13 non exécutable localement** dans ce sandbox
  (librairies système manquantes : `libgstreamer-1.0.so.0` et ~30 autres).
  Confirmé distinct du problème Chromium (celui-ci résolu par Xvfb+headed,
  13/13 verts). Limitation d'environnement pré-existante et déjà acceptée
  depuis C0-UX LOT-03 (« OK en CI ») ; non résolue ici — installer
  l'ensemble des dépendances WebKit manquantes serait disproportionné pour
  ce lot documentaire. **Revalidation WebKit à faire via CI** si un jour
  nécessaire (déjà verte historiquement sur les runs CI GitHub Actions).
- **Zoom 200 %, lecteur d'écran réel, device mobile physique** : non testés
  manuellement dans cette session (pas d'accès à un navigateur interactif
  humain ni à un device réel dans ce sandbox). Les garde-fous équivalents
  (zones tactiles ≥44px, `focus-visible`, absence de dépendance au seul
  survol, libellés accessibles) sont couverts par les assertions
  automatisées de la suite e2e (13/13 vertes), mais ne remplacent pas une
  vérification humaine. Limitation récurrente depuis C0-UX R1/LOT-03,
  jamais bloquante pour les lots précédents.
- **Captures aux largeurs de référence non produites** dans cette session
  (pas d'outil de capture image disponible hors du sandbox de test) — même
  limitation déjà actée en LOT-00 (« captures de référence LOT-00 non
  produites, outil indisponible »). Les assertions `scrollWidth`/
  `clientWidth` de la suite e2e couvrent l'absence de débordement horizontal
  aux largeurs 375/768/1024/1440px, mais pas un contrôle visuel humain.

## Divergence documentaire résolue (LOT-05, hors et dans périmètre HC-F)

- **Orthographe du patient fictif « Michel Dogne »** : la forme **sans
  accent** est confirmée comme la donnée réelle (`web/prisma/seed.ts:47`,
  `nom: 'Dogne'`) — ce n'était donc pas une divergence arbitraire mais une
  incohérence documentaire à corriger. Après vérification que le code de
  test ne compare la chaîne « Dogné » à aucune assertion réelle (seules des
  mentions en commentaire et un libellé de `describe`), les 17 fichiers
  hors `archive/` et hors log historique (`web/playwright.config.ts`,
  `web/e2e/portail-parcours.spec.ts`, `web/e2e/helpers/db.ts`,
  `web/e2e/README.md`, `CLAUDE.md`, `AGENTS.md`, `README.md`,
  `README_AUTOMATISATION_CLAUDE_CODE.md`, `.wn/config.yml`,
  `docs/checklist_tests_end_to_end.md`, `docs/securite_rgpd.md`,
  `docs/claude/CLAUDE_MD_MINIMAL_WELLNEURO.md`,
  `docs/claude/PROJET_CONTEXTE.md`, `docs/claude/README_MINIMAL.md`,
  `docs/claude/campagnes/2026-07-11-alignement-documentaire-etat-reel/lots/LOT-00-audit-sources-verite.md`,
  `docs/claude/campagnes/2026-07-11-refonte-ux-shell-3-0/CAMPAGNE.md`,
  `tests/patients_fictifs.md`) ont été alignés sur la forme sans accent.
  `docs/claude/SESSION_LOG.md` n'a volontairement pas été rétro-modifié
  (journal append-only, entrées historiques non réécrites). Suites Vitest
  et e2e Desktop Chromium revalidées vertes après correctif (voir
  `VALIDATION_FINALE.md`).

## Dette héritée non spécifique à HC-F

- Aucune autre (le périmètre HC-F ne touche pas aux routes API métier, à
  l'auth, ni au scoring — cf. `CAMPAGNE.md` § Hors périmètre).
