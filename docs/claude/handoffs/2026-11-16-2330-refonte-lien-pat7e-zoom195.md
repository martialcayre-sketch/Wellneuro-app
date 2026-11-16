# Handoff — 2026-11-16 — Refonte Lien / Empreinte, PAT-7e : débordements à 195 px (zoom 200 % au téléphone)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat7e-zoom195`, créée depuis `origin/main` (`021deae8`, après le merge de #2193 en `f15bc271`), avancée par `--ff-only` à `7edaeda6` (#2194, documentation seule). Worktree `.claude/worktrees/pat4-questionnaires-agendas` (session PAT).
- Code d'interface seul : des classes CSS, un fragment de changelog, ce handoff. Aucune migration, aucun drapeau, aucun texte.
- La session ne merge pas : c'est l'intégrateur qui merge, sur « prête @<sha> ».

## Objectif

Supprimer les débordements horizontaux à 195 px CSS relevés au §3.5 du constat de PAT-7 en partie (U10, U21, U26, U34, U35, U37, U38). La convention de 195 px vient de [[D-506]].
- Choix du responsable : `20261116-1509-d` (« Un petit lot PAT-7e après PAT-7a »), avec la consigne « retours à la ligne en CSS, sans texte neuf ».

## Décisions prises

- Pas de décision neuve. Identification faite d'abord, par une sonde des boîtes et des nœuds de texte :
  - U26 : le `h1` « Bilan neuronutritionnel » (texte sorti de sa boîte, donc invisible à la seule mesure des éléments) ;
  - U10 et U21 (qui renvoie au hub) : le chevron du volet « Mon accompagnement » (6 px), et le `h2` « Votre accompagnement » de `PatientPageHeader`, dans ce volet ;
  - U34 : le bouton « J'en ai pris connaissance » (1 px) ;
  - U35 : le `h1` de `PatientPageHeader` ;
  - U37 et U38 : les pastilles de `MesChoix`, et sous elles des paragraphes de `DocumentTrust` (jusqu'à 53 px).
- Technique : `[overflow-wrap:anywhere]` (motif déjà employé dans le dépôt) pour les mots trop longs, plus `max-[319px]:hyphens-auto` pour couper à la syllabe sous 320 px seulement (`lang="fr"` est posé sur `<html>`). Sans césure, WebKit coupait au caractère (« Réutilisa/tion », « proposé/e ») ; avec elle, il coupe à la syllabe (« Réutili-/sation », « connais-/sance »).
- `MesChoix` : rangées en `flex-wrap`, libellé `min-w-0 grow basis-24` ; la pastille passe sous le libellé quand les deux ne tiennent pas sur une ligne.
- Cause de fond, laissée ouverte : à 195 px, la carte du portail (32 px de marge intérieure de chaque côté) ne laisse que 65 à 97 px de texte.

## Fichiers modifiés

- `web/src/components/patient/ui/PatientPageHeader.tsx`, `web/src/components/patient/MonBilan.tsx`
- `web/src/app/portail/[token]/questionnaires/page.tsx`, `web/src/app/portail/[token]/informations/page.tsx`
- `web/src/components/patient/biologie/TransmissionCompteRendu.tsx`
- `web/src/components/patient/trust/DocumentTrust.tsx`, `web/src/components/patient/trust/MesChoix.tsx`
- `changelog.d/2026-11-16-refonte-lien-pat7e-zoom195.md`, ce handoff.

## Validations exécutées

- **Mesure avant correctif**, build de production de `main` (code d'interface de `f15bc271`), fixtures seules, 24 écrans, iPhone 13 (WebKit), 195 × 422 : U10 et U21 à 6 px, U26 à 54, U34 à 1, U35 à 39, U37 et U38 à 61.
- **Après correctif**, deux passes (avec puis sans césure) : 0 px sur les 24 écrans ; captures des zones relues (volet du hub, pastilles, bouton).
- **Toutes les configurations** (bureau 1 440 → 390, zoom 200 % à 640, confort ; téléphone 390, 195, confort) sur U10, U26, U34, U35, U37 et U38 : débordement 0, axe sans violation. Hauteurs de page de U10 et U35 identiques à celles de la passe PAT-7a, hors 195 px. U37 et U38 gagnent 23 px à 390 px, mais l'annulation des classes dans la page ne change rien à la hauteur : l'écart vient des données de la base locale, que chaque passe enrichit. Seul changement visible au-delà de 320 px : la rangée « Réutilisation secondaire » (même hauteur, pastille sur une ligne).
- `check:rapide` 0. T2 : voir la PR.
- Le spec de mesure reste local (`side-session-notes/…/pat7-outillage/`), retiré du worktree avant T2.

## Problèmes ouverts

- À 195 px, la marge intérieure des cartes (`p-8`) limite la colonne de texte : une marge réduite aux très petites largeurs serait une décision de mise en page, hors de ce lot.
- PAT-7d attend une décision sur D-488 §7 (« Réessayer » au hub, U24, U25).
- Restent à PAT-7 : M1, comparaison aux prototypes, écrans non vus, en-tête de U10 après PAT-3b (qui attend COM-1).

## Prochaine action exacte

1. Commit, PR, CI (`wn-attendre-ci.mjs`, en tâche de fond), `wn-revue-pr-agent.mjs` → 0, un verdict par remarque.
2. Déclarer « prête @<sha> », ligne `prete` au registre D-503, suivi patient à jour.
3. Au merge : accuser `merge_fait`, mettre à jour le suivi ; puis PAT-7d si D-488 §7 est tranchée, sinon le reste de PAT-7.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488. Aucun décor avant COM-1. Fichiers COM-0 gelés.
- Rien de clinique. Aucun texte de consentement, de droits ni de sécurité modifié, pied d'urgence compris.
- Aucune migration, aucun drapeau. Production en lecture seule ; constat à l'écran en local seulement.
- Patients fictifs seulement : Sophie Nicola, Jennifer Martin, Michel Dogné.
- Jamais de merge par la session. Toute écriture ArtifactData épinglée par `if_version`.
- T2 avant tout commit UI ou API, jamais deux T2 en parallèle sur le Mac.
