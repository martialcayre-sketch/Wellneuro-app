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

## Divergence documentaire signalée, non corrigée (hors périmètre HC-F)

- **Orthographe du patient fictif « Michel Dogne »/« Michel Dogné »** :
  `CAMPAGNE.md`/`REGISTRE_FRONTIERES.md` (décision HC-F du 2026-07-12)
  actent la forme **sans accent** comme correcte. Or `CLAUDE.md` (racine du
  dépôt, non modifié par HC-F), `README.md`, plusieurs docs projet, et
  surtout le **code de test réel**
  (`web/e2e/portail-parcours.spec.ts`, `web/e2e/helpers/db.ts`,
  `web/playwright.config.ts`) utilisent encore la forme **accentuée**. Un
  seul résidu interne à la campagne a été corrigé dans ce lot
  (`AUDIT_UI_REEL.md`) pour satisfaire le DoD `CAMPAGNE.md` (« aucune
  occurrence de… « Dogné » dans la campagne »). Le reste (16 fichiers hors
  `archive/`, dont du code de test et `CLAUDE.md` lui-même) est **signalé
  ici sans être corrigé** : hors périmètre de LOT-05 (fichiers projet-wide,
  pas de la campagne), et risqué à modifier à l'aveugle si un nom de patient
  identique à l'accent près existe en base de données de dev/CI (le
  changer dans le code de test sans vérifier la donnée réelle pourrait
  casser des assertions). À trancher explicitement par l'utilisateur : soit
  aligner tout le projet sur la forme sans accent (et vérifier les seeds
  DB), soit acter que la décision HC-F ne s'applique qu'au contenu produit
  par cette campagne.

## Dette héritée non spécifique à HC-F

- Aucune autre (le périmètre HC-F ne touche pas aux routes API métier, à
  l'auth, ni au scoring — cf. `CAMPAGNE.md` § Hors périmètre).
