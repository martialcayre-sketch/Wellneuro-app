# AUDIT_UI_REEL — LOT-00 HC-F

Audit factuel du dépôt réel (aucune modification de code), préalable aux
arbitrages de LOT-00. Périmètre : shell praticien, portail patient, design
system, contrats C1. Le catalogue de questionnaires est explicitement hors
périmètre HC-F (→ QX).

## 1. Désynchronisation constatée (signalée, non corrigée)

`docs/claude/campagnes/ACTIVE_CAMPAIGN.md` affiche encore *« Statut : EN
COURS — puis activation de HC-F au merge de la PR #31 amendée »*. Or les PR
#31/#32/#33 sont déjà fusionnées sur `origin/main` et HC-F est activable (ce
LOT-00 en est l'exécution). Ce fichier est désynchronisé — à corriger sur
instruction explicite, pas dans ce lot.

## 2. Shell praticien réel

- **Composants** : `NavBar.tsx` (racine, état rail compact/étendu persisté
  `localStorage:wn-rail-expanded`) compose `SidebarRail.tsx` (desktop
  `≥1024px` + drawer tablette `768–1024px`) et `MobileBottomNav.tsx`
  (`<768px`, 3 items + bottom-sheet « Plus »). Monté par
  `web/src/app/dashboard/layout.tsx` qui pose `data-theme="praticien"`.
- **Géométrie mesurée** : rail réduit `w-16` (64px) / étendu `w-64` (256px,
  `duration-200`) ; item nav `px-3 py-3`, icône/badge `h-10 w-10` ; header
  `h-16`, boutons carrés `h-11 w-11` ; bottom nav `h-16`, icônes `h-6 w-6`,
  cible tactile `min-h-[44px]`. Aucun breakpoint custom — uniquement les
  défauts Tailwind (`md` 768px, `lg` 1024px).
- **Icônes** : **aucune librairie SVG installée** (`lucide-react` absent de
  `package.json`). Navigation actuelle = abréviations 2 lettres en pastille
  (`AC`, `PT`, `SY`, `PM`) + emojis/glyphes Unicode pour le reste du header
  (`☰`, `🔔`, `▾`, `✕`, `‹›`, `•••`). Confirme le constat déjà connu de
  `CAMPAGNE.md` (« pas de vraies icônes »).
- **Tokens/couleurs** : `globals.css` définit une palette brute
  (`--teal-*`, `--gold-*`, `--cream-*`, `--violet-*`) puis des tokens
  sémantiques par `[data-theme]`. Tokens historiques `--primary: #1a3a5c` /
  `--accent: #4a9d8f` toujours consommés en dur par `SynthesePanel.tsx`
  (non migré). Aucun hex code en dur dans `NavBar/SidebarRail/MobileBottomNav`
  — ces trois composants sont déjà entièrement tokenisés.
- **Pages praticien** (`web/src/app/dashboard/**`) :

  | Route | Complexité visuelle |
  |---|---|
  | `/dashboard` | moyenne (MetricsSection, PatientsATraiter, accès rapides) |
  | `/dashboard/patients` | déléguée à `PatientsPanel` |
  | `/dashboard/patients/[idPatient]` | déléguée à `FichePatientPanel` (déjà substantielle : score, badges preuve, cercles concentriques, objets cliniques, momentum) |
  | `/dashboard/patients/[idPatient]/besoins` | déléguée à `DetailBesoinsPanel` |
  | `/dashboard/synthese` | déléguée à `SynthesePanel` — **non migré**, tokens Lot 0 |
  | `/dashboard/parametres` | simple, deux blocs `<dl>` lecture seule |

## 3. Portail patient réel

- **Routes** : pas de sous-routes séparées pour gate/consentement/fiche/
  anamnèse — tout vit dans **un seul fichier** `portail/[token]/page.tsx`
  piloté par une state machine React locale (`EmailGate`, `ConsentScreen`
  local, `FicheForm`, `AnamneseForm`, `DoneScreen`). Seuls
  `questionnaires/page.tsx` (hub) et `questionnaires/[idAssignation]/page.tsx`
  (saisie/lecture seule/Mon équilibre) sont des routes distinctes.
- **Composants patient** : `ConsentScreen.tsx` (flux legacy par assignation,
  sauté dans le flux portail actuel), `ConsultationScreen.tsx` (lecture
  seule + demande de correction), `GenericQuestionnaire.tsx` (moteur de
  saisie générique, autosave), `MonEquilibreAccueil/Detail.tsx`,
  `PlaintesForm.tsx`, `QuestionField.tsx`.
- **Sauvegarde/réseau** : brouillon local (`web/src/lib/questionnaire-draft.ts`,
  `localStorage`) puis envoi groupé unique (`POST /api/patient/submit`).
  Distinction déjà présente dans l'UI : « Brouillon enregistré sur cet
  appareil… » vs « Transmettre au praticien » / badge « Transmis au
  praticien ». Base réutilisable pour le contrat « conservé / synchronisé /
  transmis » de LOT-04.
- **Lexique existant** (échantillon) : « Votre espace patient », « Avant de
  commencer », « Fiche de renseignements », « Merci ! Vos renseignements ont
  bien été transmis à votre praticien. », « À compléter / Correction
  demandée / Transmis au praticien / Expiré », « Ce brouillon est conservé
  uniquement sur cet appareil. », « Vos réponses sont verrouillées en
  lecture seule. », « Votre demande de modification a été transmise… en
  attente de validation par votre praticien. »
- **Tests** : `web/e2e/portail-parcours.spec.ts` (245 lignes, patient fictif
  Michel Dogné) couvre tout le parcours séquentiel jusqu'au déblocage/
  re-soumission après correction.

## 4. Point de risque de frontière de données (à signaler, hors périmètre HC-F)

`web/src/app/api/patient/reponses/route.ts` renvoie `scoresJson` **brut,
non filtré**, incluant l'interprétation clinique détaillée (labels de
sévérité, sous-scores par neurotransmetteur) — la même structure que celle
exposée au praticien via `api/praticien/reponses/route.ts`. Par contraste,
`api/patient/equilibre/route.ts` applique explicitement un filtre
patient-safe (commentaire : *« jamais les niveaux de preuve A/B/C/D,
réservés praticien »*). Aucune fuite visible dans l'UI actuelle
(`ConsultationScreen.tsx` n'affiche que titre/date), mais la donnée brute
est accessible côté client (devtools/réseau). **Ce n'est pas un correctif
de ce lot documentaire** (LOT-00 est sans code) — à signaler explicitement
à l'utilisateur comme correctif candidat, hors HC-F.

## 5. Contrats C1 existants

- C1 (`2026-07-11-decision-clinique-21-jours-v1`) prévoit : cockpit
  (PatientHeader + radar + 5 objets cliniques + momentum + accès 12
  besoins), carte de décision (provenance A/B/C/D, pas de score de
  confiance continu), protocole 21 jours (3 actions max, plans idéal/
  minimal/secours, budget de charge thérapeutique).
- **Aucun contrat de données formel n'existe encore côté C1** — son propre
  LOT-01 « Contrats » n'est pas fait. Les fichiers cibles qu'elle cite
  (`PatientCockpit.tsx`, `DecisionSummaryCard.tsx`, `ProtocolMiniBuilder.tsx`,
  etc.) **n'existent pas** dans le dépôt.
- Base réelle déjà existante : `FichePatientPanel.tsx` (score, badges de
  preuve, cercles concentriques, objets cliniques, momentum) — c'est sur
  cette base que C1 construira, pas sur un nouveau modèle HC-F.
- Modèles Prisma pertinents : `Patient`, `Consultation`, `Assignation`,
  `Pack`/`QuestionnairePack*`, `QuestionnaireDefinition/Category`,
  `QuestionnaireReponse`, `SyntheseIA`/`AuditSynthese`, `BookletEnvoi`,
  `NeuroAxis`, `ClinicalIntentTag/Criterion/Rule`, `ProtocolReviewFlag`.
  Aucun modèle `Protocole21Jours` ni `DecisionClinique` — pas de collision
  actuelle, mais `ProtocolReviewFlag` à surveiller si C1 introduit sa propre
  notion de protocole.

## 6. `docs/design-system-d1.md` — contradiction interne non résolue

Le document affirme deux choses incompatibles à ce stade :

- Sections 1–2 et le tableau de traçabilité (§ « Fichiers migrés ») décrivent
  un thème praticien **entièrement sombre**, appliqué à `NavBar`,
  `dashboard/layout.tsx`, `login/page.tsx`, `MetricsSection`,
  `PatientsPanel`, titres de `dashboard/page.tsx` et `patients/synthese`.
- La section 5 (amendée 2026-07-12) dit : *« Sans objet depuis la décision
  "tout en mode clair" […] tous deux clairs, rail praticien sombre
  structurel »* — c.-à-d. que seul le **rail de navigation** reste visuellement
  sombre, tout le reste (espace de travail, pages) devient clair.

Ces deux sections ne peuvent pas être vraies simultanément pour
`MetricsSection`/`PatientsPanel`/les titres de pages, actuellement décrits
comme sombres dans le tableau. **Résolution explicite requise en LOT-01**
(qui a justement pour mission l'amendement effectif de ce document) — pas
dans ce lot.

Structure du document (7 sections) : tokens, thèmes, composants (Badge,
MetricCard, PatientRow, composants de score Recharts non branchés),
traçabilité page↔thème↔lot, interdits/autorisations, réconciliation tokens
UX 3.0, traçabilité lots↔PR.

## 7. Captures de référence

**Non produites dans cette session** : nécessitent un serveur de dev lancé
(`npm run dev`) et une capture navigateur/Playwright, non disponibles dans
cet environnement d'exploration en lecture seule. À produire avant de
clore LOT-00 si des captures « avant » sont jugées nécessaires — sinon
acter leur absence dans `ARBITRAGES_LOT_00.md`.
