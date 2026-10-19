# Handoff — t05c : geste de lettre sans consultation porteuse

## Branche et état du dépôt

- Branche `t05-lettre-sans-porteuse`, partie de `origin/main` 892f0948.
  Worktree `d281-lot3-portail`.

## Objectif

Dernier reste de D-275 (P2-3 du handoff 2026-10-10-0850) : le bouton de
lettre restait offert sans consultation porteuse, et ne pouvait qu'échouer.

## Décisions prises

- Arbitrage du responsable (2026-10-19) : expliquer plutôt que masquer.
- La réponse `ready` du cockpit porte `sansConsultationPorteuse: true` quand
  `loadRuntimeInputs` ne trouve pas de porteuse (même lecture que la chaîne,
  aucune requête neuve), à côté de la carte : l'empreinte ne bouge pas.
- Absent = porteuse présente ou inconnue : le geste reste, et le refus
  `sans_consultation_porteuse` de la route reste le rempart.
- Pas de D-xxx : aucune règle, aucun seuil, aucun texte de lettre.

## Fichiers modifiés

- `web/src/app/api/praticien/cockpit/route.ts` (type, `reponsePrete`, deux
  appels) et `route.test.ts` (un cas : porteuse ⇒ absent ; aucune ⇒ `true`).
- `web/src/components/patient-cockpit/AdressagePanel.tsx` et son test (deux cas).
- `web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` (passage).
- Plan (ligne t05 soldée), changelog, SESSION_LOG.

## Validations exécutées

- Vitest ciblé (panneau, route cockpit, section) : 146/146.
- T1 complet vert ; T2 vert (6 min 43 s) ; CI vert.
- Revue CodeRabbit : un nitpick (rejeu GET non couvert), corrigé par
  aa685069 (test du rejeu sans porteuse) ; `main` 926a0420 (F38) fusionnée.

## Problèmes ouverts

- Aucun pour t05. Suite de la file A : t07b, t12 puis t11 (verrou), t14, t15,
  migration NIR (règle de permission).

## Prochaine action exacte

PR, CI, CodeRabbit sur la tête, merge, déploiement constaté ; t05 → fait sur
la page de suivi de la file A.

## Interdits encore actifs

- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
