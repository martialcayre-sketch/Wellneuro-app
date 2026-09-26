# Handoff — 2026-09-26 — La Boussole alimentaire quitte la sous-vue Protocole

## 1. Branche et état Git

`wn-boussole-retiree-protocole`, worktree
`.claude/worktrees/deploy-anti-recul-lot1`, partie de `origin/main` à
`438d5150` (#1229, D-249).

## 2. Objectif

Décision du responsable, après lecture de l'artefact « De l'assiette au
patient » : retirer la Boussole du cockpit au niveau du protocole, « pour
l'instant, pour moins de bruit ».

## 3. Décisions prises

- `D-250` : l'observatoire et le geste d'insertion ne sont plus montés dans la
  sous-vue Protocole.
- Retrait par démontage, réversible : composant, route
  `/api/praticien/boussole`, API d'insertion du constructeur, contrats V2/V4 et
  relecture restent en place. `WN_C5_ENABLED` n'est pas touché.
- Écarté : reloger le résumé « faisabilité publiée » du Journal alimentaire.
  Ses données restent lisibles dans l'onglet Alimentation.

## 4. Fichiers modifiés

`web/src/components/patient-cockpit/ClinicalRuntimeSection.tsx` (montage,
état et effet de la sélection Boussole retirés ; `useC5Enabled` n'y sert plus)
· `ClinicalRuntimeSection.test.tsx` (le cas du drapeau affirme l'absence) ·
`docs/DECISIONS.md` (`D-250`) ·
`changelog.d/2026-09-26-boussole-retiree-protocole.md` ·
`docs/claude/SESSION_LOG.md` · ce handoff.

## 5. Validations exécutées

- Production, lecture agrégée par conteneur : 0 protocole 21 jours, donc 0
  `foodCompassRef`.
- Banc du cockpit : 48/48. Le cas modifié rougit contre la version antérieure
  (observatoire trouvé), mutation jouée.
- T1 vert. T2 vert (598 fichiers Vitest, 10 047 tests ; 213 E2E).

## 6. Problèmes ouverts

- Composant et route Boussole praticien sans écran : à supprimer ou reloger (la
  Bibliothèque, rayon « Fiches conseils ») par une décision ultérieure.
- Le « pourquoi » patient passe à la fiche d'assiette : cadrage en cours
  (Fiche MY augmentée par IA, envoi automatique à la validation du protocole,
  inbox et espace de lecture au portail).

## 7. Prochaine action exacte

Merger seul ; constater en production, phase Actions > Protocole, que la carte
des assiettes est en tête et qu'aucune Boussole ne paraît.

## 8. Interdits encore actifs

- « Un merge à la fois » (D-248) jusqu'au lot 4.
- Aucune identité patient dans le dépôt ; dossiers réels lus par identifiant.
