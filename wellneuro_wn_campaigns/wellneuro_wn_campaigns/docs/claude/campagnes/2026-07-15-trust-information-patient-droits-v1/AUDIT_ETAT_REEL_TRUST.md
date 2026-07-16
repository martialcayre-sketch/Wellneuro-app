# Audit de l'état réel — TRUST LOT-00

> Réalisé le 2026-07-16 sur le commit courant de `main` (post-merge PR #71,
> #72-#77 : DA A5-R1, programme 5.0, campagne SP-FIL). Chaque constat cite sa
> preuve dans le dépôt. Répond aux dix questions obligatoires du LOT-00.

## 1. Point d'entrée patient réellement actif

Le portail permanent `/portail/[token]` (token d'accès révocable porté par
`Patient.accessToken` + `accessTokenRevoked`, second facteur = confirmation de
l'email pré-enregistré via `POST /api/portail/session`). Le flux legacy
`/patient/[idAssignation]` subsiste en compatibilité (gelé, styles non
tokenisés) — candidat au décommissionnement, hors périmètre TRUST V1.

## 2. Information déjà présentée au patient

- **Écran de consentement du wizard** (`web/src/app/portail/[token]/page.tsx`,
  composant local `ConsentScreen`) : texte court, affiché une seule fois.
- **Écran de consentement legacy** (`web/src/components/patient/ConsentScreen.tsx`) :
  texte plus long et **divergent** du précédent (mentionne « indice de
  suivi », droits étendus).
- **Footer du portail** (`web/src/app/portail/layout.tsx`) : une phrase
  statique (« Cet espace ne constitue pas un diagnostic médical… »), aucun
  lien.
- **Bandeau de rappel** avant saisie de questionnaire
  (`portail/[token]/questionnaires/[idAssignation]/page.tsx`) : rappel du
  cadre + droits de modification/suppression.
- **Aucune page permanente** d'information, de confidentialité ou de droits
  n'existe (grep `mentions|privacy|droits|cgu|faq` sur `web/src/app` : vide).
  L'information « droits » est enfermée dans l'écran de consentement
  one-shot.

## 3. Où le consentement est stocké

- `Consultation.consentement` (`"non_donne"`/`"donne"`) +
  `consentementHorodatage`, `consentementVersion`, `finaliteConsentement`.
- Pré-estampillage des assignations du pack
  (`api/portail/valider/route.ts` → `assignPackToPatient`), champs
  `Assignation.consentement*` + `consentementRetraitDate` (jamais exposé en
  UI patient).

## 4. Une version de texte est-elle persistée ?

**Non — c'est le défaut central.** `CONSENTEMENT_VERSION = 'v1'`
(`web/src/lib/consultation/portail.ts`) est stockée à chaque recueil, mais
**aucun lien n'existe entre ce numéro et le texte réellement affiché** : le
texte est en dur dans deux composants divergents, non archivé, non hashé.
Modifier le texte ne change pas la version. (Une constante dupliquée
`CONSENTEMENT_VERSION` vit aussi dans `api/patient/consentement/route.ts`.)

## 5. Sous-traitants réellement impliqués

| Sous-traitant | Rôle constaté | Preuve |
|---|---|---|
| Vercel | hébergement applicatif (`app.wellneuro.fr`) | déploiements production |
| Supabase | base PostgreSQL (données patients) | `DATABASE_URL`, Prisma |
| Anthropic | assistance IA (synthèses) | `web/src/lib/anthropic.ts`, `ANTHROPIC_API_KEY`, `CLAUDE_MODEL` |
| Fournisseur SMTP | envoi des emails | `SMTP_URL` (nodemailer) |
| Google | OAuth **praticien uniquement** (`@wellneuro.fr`) | `web/src/lib/auth.ts` |

Aucun autre appel réseau sortant constaté côté runtime.

## 6. Contenus envoyés par email

1. **Assignation** (`api/praticien/assignations`, `sendAssignmentEmail`) :
   titre du questionnaire + lien portail + date limite. Générique hormis le
   titre d'instrument (acceptable, consigné).
2. **Accusé de réception** (`api/patient/submit`, `sendAck`) : générique.
3. **Booklet** (`api/praticien/booklet`) : **contenu de santé complet en
   HTML dans l'email** — c'est l'exception assumée au principe « notification
   générique » ; l'envoi est verrouillé (voir §8).

Expéditeur unique `"Wellneuro" <noreply@wellneuro.fr>`. Pas de SMS/push.
Aucun retry ni file d'attente ; échec silencieux pour 1 et 2 si `SMTP_URL`
absente (booklet : 503 explicite).

## 7. Isolation des données par praticien

Application **mono-praticien de fait** : `Patient.praticienEmail` existe mais
les routes praticien ne filtrent pas dessus (`metrics` compte globalement).
L'accès praticien est verrouillé par OAuth restreint au domaine
`@wellneuro.fr`. L'isolation multi-praticien reste un prérequis G-TRUST-04
pour toute ouverture à d'autres praticiens.

## 8. Validation humaine persistée

Chaîne IA correctement gardée :
- `SyntheseIA.statut` : `Brouillon_IA` → `Validee_Praticien`/`Corrigee_Praticien`
  (+ `dateValidation`, `notesPraticien`) ;
- l'envoi du booklet **exige** un statut validé **et** `relectureConfirmee`
  (`api/praticien/booklet/route.ts`) ; blocages tracés dans `BookletEnvoi`
  (`Blocage_Relecture`) ;
- audit dédié `AuditSynthese` (modèle, versionPrompt, statut, erreur courte).

## 9. Écrans portant déjà des mentions IA

**Côté patient : aucune dans le portail.** Les seules mentions vivent dans le
booklet email : « Validé par votre praticien » (en-tête), « Document généré
après validation par votre praticien » + « Ce bilan ne constitue pas un
diagnostic médical » (pied), « préparé après validation humaine » (corps de
l'email). « Mon équilibre » est un calcul déterministe (aucune IA —
`api/patient/equilibre` n'importe jamais `SyntheseIA`).

## 10. Parcours legacy à décommissionner

`/patient/[idAssignation]` + `api/patient/consentement` (constante de version
dupliquée). Décision : hors périmètre TRUST V1, mesuré et documenté au
handoff (LOT-06) ; aucun nouveau développement ne doit s'y raccorder.

## Risques priorisés

- **P0 — version de consentement sans texte lié** (§4) : corrigé par TRUST
  LOT-01/02 (registre versionné + hash + re-sourçage de l'écran).
- **P0 — aucune information permanente ni voie d'exercice des droits** :
  corrigé par LOT-02/03.
- **P1 — booklet = données de santé dans l'email** : assumé et documenté
  (chaîne validée + relecture) ; alternative « consultation dans le portail »
  au handoff C3/IDP.
- **P1 — pas de journal d'événements patient** : corrigé par la migration
  TRUST (tables append-only).
- **P2 — emails d'assignation portant le titre d'instrument** : consigné ;
  générique par ailleurs.
- **P2 — flux legacy non tokenisé** : gelé, décommission à planifier.
