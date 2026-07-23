### SP-CONV LOT-06 — preuve visuelle des deux univers, et clôture de la campagne (2026-07-23)

La dérogation V12 est levée : `visual.spec.ts` monte en trois étages —
captures de revue (artefacts), **snapshots ARIA** committés (rail des
7 phases, frise des 6 étapes : la structure accessible est assertée en
texte, insensible aux polices), et **baselines `toHaveScreenshot`
comparées sous Linux uniquement et seulement si la baseline existe** (un
poste macOS ne compare jamais, une baseline absente ne casse jamais
`verify`). Le **portail est enfin capturé** — porte d'entrée, hub « Mon
parcours », sections dépliées — avec Jennifer Martin, patiente fictive
isolée des parcours E2E : le motif du refus V12 (interférence d'état sur
patient partagé) est levé sans nouvelle infra. Le bootstrap des baselines
passe par le workflow manuel `visual-baselines` (Ubuntu, réplique de
l'environnement CI, artefact relu puis committé en PR).

**La campagne SP-CONV est livrée** : sept lots en huit PR sur deux jours —
cadrage confronté au code, contrat d'épisode partagé, cockpit adaptatif
plein écran, suture time-travel, étapes patient 5-6 vivantes, « Mon carnet
alimentaire » (A7 amendé), preuve visuelle. L'Observatoire et le Jardin
regardent désormais la même trajectoire, au même instant, chacun depuis
son propre monde.
