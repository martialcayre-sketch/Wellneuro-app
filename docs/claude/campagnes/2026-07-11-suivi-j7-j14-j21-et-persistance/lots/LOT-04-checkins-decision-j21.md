---
id: "LOT-04"
titre: "Check-ins et décision J21"
statut: "livré"
dépend_de: "LOT-03"
---

# LOT-04 — Check-ins et décision J21

> Compilé le 2026-07-16 depuis `../sources/lots/LOT-04-checkins-decision-j21.md`.

## But

Collecter tolérance/adhésion minimale aux **points d'étape** J7/J14/J21
(« rendez-vous de suivi » côté patient) et préparer la décision J21 — jamais
de score, jamais d'alimentation de « Mon équilibre » (arbitrage A1).

## Résultat observable

Check-ins J7/J14/J21 persistés (`protocol_checkins`) et panneau décisionnel
praticien au point d'étape.

## Périmètre

- Questions courtes (2 à 4 maximum) : énergie, sommeil, digestion, stress,
  adhésion à l'action principale.
- Labels de décision : continuer/alléger/densifier/pivoter/explorer/stopper.
- Résumé J21 = point de jonction (le score a-t-il bougé ? l'action a-t-elle
  été tenue ? était-elle tolérée ?) via les contrats publics des deux côtés —
  `momentum.ts` reste l'unique propriétaire des jalons de mesure.
- Aucune interprétation diagnostique.

## Hors périmètre

- Score prédictif.
- Urgence médicale.
- Chat.

## Fichiers probables

- `web/src/components/patient-companion/**`
- `web/src/components/patient-cockpit/J21DecisionPanel.tsx`
- Routes check-ins

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

- [ ] Définir questions et fréquence.
- [ ] Créer la soumission sécurisée (session portail + assignation).
- [ ] Afficher une tendance simple (factuelle, jamais un pourcentage
      d'observance côté patient).
- [ ] Créer la décision manuelle praticien.

## Tests

- `bash scripts/check_no_secrets.sh`
- `cd web && npm run type-check`
- `cd web && npm run scoring-check` lorsque le lot touche indirectement l'affichage des scores
- Smoke test navigateur avec Sophie Nicola, Jennifer Martin et Michel Dogné
- Vérification mobile/tablette lorsque le lot touche une interface

## Critères de done

- [ ] Check-in < 15 secondes.
- [ ] Le praticien distingue adhésion et effet.
- [ ] Aucun libellé culpabilisant (formulation factuelle positive).

## Risques / points de vigilance

- Sur-sollicitation.
- Interprétation excessive.

## Résultats

**Livré le 2026-07-18** (branche `feat/c2a-lot-04-checkins`, **sans migration** — table
`protocol_checkins` déjà présente depuis LOT-02).

Décisions de cadrage (validées avec l'utilisateur) : (1) **décision J21 sans nouvelle
table** — panneau praticien en lecture seule + labels comme actions guidées vers le
versionnement/diffusion existants ; (2) **slice patient complète** (API + formulaire +
tendance) ; (3) **check-in à 4 questions** (adhésion, tolérance, énergie, sommeil).

Fichiers créés :
- `web/src/lib/protocol/checkinDomain.ts` (domaine pur : catalogue, validation,
  planification J7/J14/J21 ±3 j, chaînage append-only) + `checkins.ts` (persistance) +
  `resumeJ21.ts` (point de jonction momentum + check-ins) — avec tests.
- Route patient `web/src/app/api/portail/protocole/checkin/route.ts` (POST/GET, cookie
  portail obligatoire, email-gate exclu §8.4, assignation d'ancrage résolue côté serveur,
  point d'étape imposé par le calendrier de diffusion) + test.
- Route praticien `web/src/app/api/praticien/protocoles/checkins/route.ts` (GET check-ins
  + résumé J21, garde mono-praticien §8.8) + test.
- UI patient `web/src/components/patient-companion/ProtocolCheckinForm.tsx` +
  `ProtocolCheckinTrend.tsx` (tendance factuelle, aucun %), sous-route
  `web/src/app/portail/[token]/suivi/page.tsx`.
- UI praticien `web/src/components/patient-cockpit/J21DecisionPanel.tsx` (résumé + 6 labels)
  + test, monté dans `ClinicalRuntimeSection.tsx` ; lien « rendez-vous de suivi » ajouté au
  hub portail (`questionnaires/page.tsx`).

Validations : `type-check` ✅, Vitest **100/100** sur les répertoires touchés (dont 48
nouveaux : domaine, persistance, résumé, routes patient/praticien, panneau J21), `next lint`
✅, `scoring-check` ✅ (aucun score touché), anti-secrets ✅, `git status web/prisma/` **vide**
(aucune migration).

Écarts / dette : le volet **score** du résumé J21 est `null` en V1 (aucun historique
d'équilibre daté n'est branché sur `momentum.ts` ici) — le point de jonction reste honnête
via les check-ins ; brancher les lectures d'équilibre relève de C2B. Modèle V1
**mono-protocole** côté patient (approbation active la plus récente). Smoke test navigateur
et CI de PR restent à exécuter avant merge.
