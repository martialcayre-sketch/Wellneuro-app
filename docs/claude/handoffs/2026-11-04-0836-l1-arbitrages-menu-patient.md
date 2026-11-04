# Handoff — 2026-11-04 — Portail patient : arbitrages après le lot L1 « rails et menus »

## Branche et état Git
- Branche `docs/l1-arbitrages-menu-patient`, partie d'`origin/main@1cb4b642`, worktree `.claude/worktrees/l1-arbitrages`.
- PR de documentation seule, squash ; merge par la session (autorisation du responsable du 2026-11-03 pour toute la série L0-L5).

## Objectif
Verser dans l'audit et dans le brouillon de D-423 les quatre points que L1 (PR #1840) laissait à trancher, avant L2.

## Décisions prises (responsable, 2026-11-04, options fermées)
- Q35 : « Ce que j’ai reçu » prend l'apostrophe typographique. D-423 §2 et §3 sont corrigés ; le code (`GROUPES_AUTRES_ESPACES` dans `entreesAutresEspaces.ts`, et son banc) garde l'apostrophe droite jusqu'à L2, qui rend l'étiquette.
- Q36 : un mineur au dossier clos garde les liens d'un mineur. Les entrées suivent l'âge seul (EP-20). Rien à changer en L2.
- Q37 : le plafond d'EP-03 est recalculé sur le lien mesuré de 50,8 px. L'allègement des liens de L2 (Q17, D-423 §2) réduit le bloc ; le constat à l'écran de L2 le remesure.
- Q38 : les questionnaires « à commencer » d'un dossier clos majeur passent dans un lot séparé, hors de ce chantier. Une session à part a été ouverte pour le diagnostic ; elle ne merge pas.

## Fichiers modifiés
- `docs/claude/propositions/2026-11-01-portail-rails-et-menus/README.md` : EP-03, constat de L1 (chapitre 11), note sous les textes acceptés (chapitre 15), nouveau chapitre 16.
- `docs/claude/propositions/2026-11-01-portail-rails-et-menus/decision-D-423-menu-patient.md` : apostrophe de §2 et §3, ligne de statut.
- `changelog.d/2026-11-04-l1-arbitrages-menu-patient.md`.

## Validations exécutées
- T1 (`cd web && npm run check`). Pas de T2 : aucun code ni aucune UI ne changent.

## Problèmes ouverts
- « treize servis le 2026-11-01 » (PLAN §8) toujours non reproduit ; l'origine du « quinze » reste une hypothèse.

## Prochaine action exacte
Arrêt avant L2 : le responsable constate l'écran (Q23). L2 rend ensuite les quatre groupes depuis la liste, avec l'apostrophe typographique, et verse D-423 au registre.

## Interdits encore actifs
- Ne toucher ni `[token]/page.tsx` ni `/api/portail/session` jusqu'à L3 (Q21, EP-07).
- Aucun chiffre sur une surface patient (D-333). Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
