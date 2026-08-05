# Handoff — 2026-08-05 — Parcours patient unique : un contournement de révocation fermé (LOT-04)

## Branche et état Git

- Worktree : `dettes-lot04-parcours-patient`, branche `worktree-dettes-lot04-parcours-patient`, posée sur `main` à jour (0c52cc1d) au démarrage.
- Rien committé — tout le diff est encore en travail dans le worktree.
- Aucune PR ouverte.

## Objectif

Campagne `2026-08-05-cloture-des-dettes-wellneuro-5-0`, LOT-04 : « Un seul parcours patient ». Le périmètre écrit visait à dater/retirer le parcours legacy `/patient/[idAssignation]` au profit du portail permanent `/portail/[token]`. Le cadrage (revue adversariale préalable) a débordé ce périmètre : un défaut de sécurité vivant a été trouvé et fermé dans le même lot.

## Décisions prises

1. **Défaut trouvé** : 6 des 7 routes `api/patient/*` acceptaient un accès sans session (repli email + `idAssignation`) qui ne relisait jamais `patients.actif`/`accessTokenRevoked` — un patient révoqué par son praticien gardait un accès complet (lecture ET écriture).
2. **Mesure d'usage** (`execute_sql`, lecture seule, 2026-08-05) : 61 réponses / 8 patients distincts sur 30 jours hors session portail — usage réel, pas négligeable.
3. **Premier correctif (patché) → NO-GO en revue.** Revalider l'état du compte sur le chemin email fermait le trou mais laissait une surface d'attaque sans usage légitime, une fois la redirection posée.
4. **Décision finale : repli retiré entièrement**, sur les 6 routes — session `wn_portail` obligatoire, comme `api/patient/protocole` déjà. Vérifié **avant** ce choix, empiriquement, que `/portail/connexion` fonctionne réellement en production (logs runtime Vercel, hors dépôt : sessions Google et lien magique ouvertes dans les dernières 24h, 3 drapeaux actifs — `WN_G4_LIEN_MAGIQUE`, `WN_G4_REDEMANDE_PATIENT`, `WN_G5_GOOGLE_PATIENT`).
5. **Redirection inconditionnelle** `/patient/[idAssignation]` → `/portail/connexion` (`web/next.config.mjs`, `redirects()`, 307 — pas 308, réversible ; pas d'email en query string).
6. **2ᵉ NO-GO en revue** : les 6 routes renvoyaient 404 (lectures) / 403 (écritures) sur absence de session, mais le hub patient (`portail/[token]/questionnaires/[idAssignation]/page.tsx`) ne redirige vers le gate de reconnexion que sur 400/401 — une session expirée (TTL 12h glissantes) sur un lien profond atterrissait sur un écran d'erreur sans retour possible. **Corrigé en 401 uniforme.**
7. Décision consignée dans le registre : `docs/DECISIONS.md` D-028 (référence [[D-002]]).

## Fichiers modifiés

- `web/src/app/api/patient/{questionnaire,submit,assignations,consentement,equilibre,reponses}/route.ts` — repli email retiré, refus 401 uniforme sur absence de session.
- `web/src/lib/patient-session.ts` — inchangé au final (retour à HEAD ; `isEmailAuthorizedForAssignment`, ajoutée puis retirée en cours de lot, n'existe plus).
- `web/next.config.mjs` — `redirects()` ajouté.
- `web/src/app/patient/[idAssignation]/page.tsx` — commentaire daté de retrait prévu.
- Tests : `web/src/app/api/patient/patient-session-routes.test.ts`, `web/src/app/api/patient/questionnaire/route.test.ts`.
- `changelog.d/2026-08-05-parcours-patient-unique.md`.
- `docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/lots/LOT-04-validation.md` (statut, étapes, Résultats).
- `docs/claude/campagnes/2026-08-05-cloture-des-dettes-wellneuro-5-0/CAMPAGNE.md` (ligne LOT-04 du tableau).
- `docs/DECISIONS.md` (D-028).
- `docs/claude/SESSION_LOG.md` (entrée du jour).

## Validations exécutées

- T1 (`npm run check`) : vert (193 tests, type-check, lint, anti-secrets).
- T3 (`npm run test:worktree`) : vert, 120 tests E2E (Chromium + WebKit), build de production. Deux passes consécutives vertes (avant et après le correctif 401).
- Trois passes `wn-reviewer` (classe Auth) : 2 NO-GO (contournement de révocation ; codes HTTP incompatibles avec la reprise cliente), 3ᵉ passe **GO** sans réserve bloquante.
- Un flake sans rapport observé et écarté : `wn-etat-reel.test.mjs` a échoué une fois à cause d'un worktree créé par une session concurrente pendant l'exécution du test (`git worktree list` changeait entre deux appels internes au script) — confirmé environnemental par relecture directe et par un second run propre.

## Problèmes ouverts / non faits (documentés, hors périmètre)

- Props `email` mortes dans `ConsentScreen`/`GenericQuestionnaire`/`PlaintesForm` — le serveur ne les lit plus, mais les composants les envoient encore.
- Code d'événement `QUESTIONNAIRE_SUBMIT_FORBIDDEN` réutilisé pour un refus 401 (nom devenu imprécis).
- `web/src/app/patient/[idAssignation]/page.test.tsx` teste encore l'`EmailGate`, désormais mort (page inatteignable par la redirection).
- Retrait physique du répertoire `web/src/app/patient/[idAssignation]/` : laissé à un lot ultérieur nommé, une fois vérifié que le portail couvre le consentement RGPD (`ConsentScreen`) et la consultation de réponses verrouillées (`ConsultationScreen`) que la page legacy portait aussi.

## Prochaine action exacte

1. `git add` + commit du diff (11 fichiers de code/tests + docs).
2. `/wn-pr apply` — ouvrir la PR (`--body-file`, diff d'une seule finalité).
3. `node scripts/wn-attendre-ci.mjs <N>` — attendre `verify` vert (code 0 seul autorise à annoncer la PR prête).
4. Régime de merge en vigueur (`CLAUDE.md`) — classe Auth : Copilot revoit et merge aussi, la revue adversariale a déjà été faite ici.
5. Après merge : pas de vérification base de production nécessaire (aucune migration, le correctif touche le contrôle d'accès applicatif).

## Interdits encore actifs

- Pas de migration Prisma (aucune n'a été introduite ni n'est nécessaire).
- Pas de suppression du répertoire `patient/[idAssignation]/` sans le lot de vérification portail nommé ci-dessus.
- E2E réservés au Mac (`npm run test:e2e` réinitialise `PAT_SEED_03`, base partagée).
