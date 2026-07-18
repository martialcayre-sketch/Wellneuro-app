---
id: "LOT-05"
titre: "Compagnon patient minimal"
statut: "à_faire"
dépend_de: "LOT-04"
---

# LOT-05 — Compagnon patient minimal

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-05-compagnon-patient.md`.

## But

Exposer la priorité, l'action du jour, la fiche et le check-in sur mobile.

## Résultat observable

Accueil patient calme lié au protocole actif.

## Périmètre

- Une action principale.
- Progression simple (factuelle, jamais un pourcentage d'observance).
- Mode « jour difficile » / « je n'ai pas suivi ».
- Accès protocole et fiche.

## Hors périmètre

- Score détaillé.
- Messagerie.
- Notifications push.

## Fichiers probables

- `web/src/app/patient/**`
- `web/src/components/patient-companion/**`
- Layout patient

## Interdits

- Tous les textes d'interface utilisateur sont en français.
- Aucun secret, jeton, mot de passe ou identifiant sensible en dur.
- Aucune donnée patient réelle dans le code, les exemples, les maquettes, les seeds ou les tests.
- Patients fictifs autorisés uniquement : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Aucune migration Prisma/SQL et aucune écriture Supabase sans demande explicite et confirmation distincte.
- Changements minimaux : pas de refactor global hors périmètre du lot.
- Aucune modification des seuils, pondérations ou règles cliniques sans instruction explicite, versionnage et trace documentaire.
- L'IA produit des brouillons ; le praticien valide avant toute diffusion patient.

## Étapes

- [ ] Intégrer les données persistées.
- [ ] Respecter le thème patient clair.
- [ ] Tester les états sans protocole / check-in dû / terminé.
- [ ] Tester tactile.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l'affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Le patient sait quoi faire en 10 secondes.
- [ ] Aucun détail clinique anxiogène.

## Risques / points de vigilance

- Répliquer le cockpit praticien côté patient.

## Résultats

**Livré le 2026-07-18** (branche `feat/c2a-lot-04-checkins`, **sans migration**).

**Cadrage 5.0 (borné R8-lite)** : accueil du **protocole actif** dans le portail cookie
`/portail/[token]`, **jamais** un accueil de trajectoire « Ma spirale » (= SP-SPI, Phase B,
gaté IDP). Thème patient existant (« Jardin »), aucun score, aucun pourcentage d'observance.

Fichiers créés :
- `web/src/lib/protocol/portailProtocol.ts` — helpers partagés `authorizePortail` +
  `resolveProtocoleDiffuse` (factorisés depuis la route check-in LOT-04, qui les réutilise).
- `web/src/app/api/portail/protocole/route.ts` (GET) — **vue patient-safe dérivée à la volée**
  du `protocol_draft` diffusé (§8.3) : `purpose`, `followUpCriterion`, `adviceSheetRef`,
  `actionPrincipale {title, minimalPlan}` (miroir de `PatientProtocolAction` — jamais
  `idealPlan`/`rescuePlan`/limitations internes/`therapeuticLoad`) + `finDeCycle`. Intégrité
  re-vérifiée via `reconstructProtocolDraft`. + `route.test.ts` (401, inter-patient 404,
  sans-protocole, vue dérivée sans fuite interne, finDeCycle).
- `web/src/components/patient-companion/PatientCompanionHome.tsx` (+ test) — action du jour,
  accès fiche + rendez-vous de suivi (CTA mis en avant si check-in dû), progression factuelle
  (réutilise `ProtocolCheckinTrend`), mode « jour difficile » rassurant, états sans-protocole /
  check-in dû / fin de cycle. Monté en tête du hub `portail/[token]/questionnaires/page.tsx`.

Décision d'architecture : `buildPatientProtocolView` (`c1-patient-protocol-view-v1`) exige la
**DecisionCard non persistée (§8.0)** ; plutôt que recomputer la chaîne clinique dans une route
patient (fragile au staleness), on dérive le sous-ensemble patient-safe **directement du
payload du draft**. Conséquence : `priorityLabel` **différé** ; `purpose` sert de titre patient.

Validations : `type-check` ✅, Vitest ✅ (route 6 + compagnon 4 ; check-in non régressé après
factorisation), `next lint` ✅.

Écarts / dette : `priorityLabel` non exposé (DecisionCard non persistée) ; **état « terminé »**
= heuristique `approvedAt + 24 j` (pas de flag de cycle en base — un vrai cycle de vie relève de
C2B) ; modèle **mono-protocole**. L'accueil de **trajectoire** (« Ma spirale ») reste à faire en
**SP-SPI** (post-IDP).
