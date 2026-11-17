# Handoff — 2026-11-17 — Refonte Lien / Empreinte, PRA-6d et PRA-6i : cibles restantes, icônes et jetons

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6d-cibles-icones-ff4316`, worktree `.claude/worktrees/refonte-lien-pra6d-cibles-icones-ff4316`, avancée par `--ff-only` jusqu'à `f50692e5` (merge de PRA-6c, #2234).
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454).

## Objectif

Les deux lots du constat PRA-6 (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/pra6-constat.md`, §3.4 et §3.8) que le responsable a placés après PRA-6b (question 20261117-1421-d), réunis pour ne régénérer qu'une fois les captures de référence de la fiche.

## Décisions prises

- **Listes déroulantes sous WebKit.** Mesuré avant d'éditer (Playwright, Chromium, WebKit bureau, iPhone 13) : une `<select>` stylée (bordure, fond) ignore `min-height` sous WebKit (22 px) mais respecte `height` (44 px) ; Chromium tient les deux. Correction à la source : `ui/Select` porte `h-11` pour tous ses appelants, y compris ceux des fichiers de PRA-6b et de `SynthesePanel`, sans les éditer ; `CLASSE_SELECT` (quatre fichiers) et les `<select>` natives qui portaient `min-h-11` reçoivent `h-11` ; les classes `CHAMP` partagées avec des saisies le reçoivent pour les listes seules (`[&:is(select)]:h-11`, forme déjà employée par `patientInputClassName`). Écartée : une règle CSS globale `select.min-h-11`, efficace mais invisible depuis le composant.
- **`PanneauRail`.** La ligne repliée passe à `min-h-11` avec `-my-2.5` : la carte repliée garde sa hauteur (≈ 48 px au lieu de 47). Le contenu déplié passe de `mt-2` à `mt-5` pour rendre la marge mangée. Une seule correction couvre « File d'envoi » (P01) et « Correspondance récente » (P53).
- **Noms du Fil.** `min-h-11 py-3` sur les liens de nom de trois panneaux (Nouveaux patients, Météo, File d'envoi) : `truncate` conservé, la hauteur de ligne grandit.
- **Replis « Motif » et « Écart ».** `min-h-11 py-3.5` sans changer l'affichage du `summary` (un `flex` retirerait le marqueur sous Chromium).
- **Icônes.** Les dessins SVG (`SpiraleEpisodes`, `CerclesConcentriques`, frises, coche du portail) gardent leur trait : ce ne sont pas des icônes Lucide. `Sprout` de `MonEquilibreAccueil` (patient) est hors du lot praticien.
- **`bg-card` → `bg-surface`** : le jeton des panneaux voisins de `patient-cockpit/`.

## Fichiers modifiés

- Cibles : `FichePatientPanel.tsx`, `patient-cockpit/DetailMotifNonMesure.tsx`, `food-observation/PractitionerFoodObservationPanel.tsx`, `fil/PanneauRail.tsx`, `fil/NouveauxPatientsAside.tsx`, `fil/MeteoAdhesionAside.tsx`, `fil/FileEnvoiAside.tsx`.
- Listes : `ui/Select.tsx`, les quatre `CLASSE_SELECT`, `ImportCompteRenduPanel` et `LectureImportBiologique` (`CHAMP`), et onze `<select>` natives à `min-h-11` (Trust, Agenda, biologie, correspondance, cockpit).
- Icônes et jeton : `FichePatientPanel.tsx` (douze), `PatientPreview`, `ExportDossierPanel`, `ui/ModeConsultation`, `ui/BanniereDiffere`, `ui/TwoLevelReading`, `fil/InboxQuestionnaires`, `PhysioTraitementsPanel`, `DecisionsParcoursPanel`, `ComprehensionPanel`.
- Bancs : `PanneauRail`, `NouveauxPatientsAside`, `MeteoAdhesionAside`, `FileEnvoiAside`, `PractitionerFoodObservationPanel` (`.test.tsx`).
- Captures de référence : `web/e2e/visual.spec.ts-snapshots/` (workflow `visual-baselines`).
- `changelog.d/2026-11-17-refonte-lien-pra6d-pra6i-cibles-icones.md`, ce handoff.

## Validations exécutées

- Mesure isolée des listes (Playwright, page de test) : Chromium 44 px dans tous les cas ; WebKit bureau et iPhone 13, 22 px avec `min-height: 44px` sur une liste stylée, 44 px avec `height: 44px`.
- Vitest ciblé (Fil, observation alimentaire, cockpit, `ui`, fiche) : 1 499 passent, bancs de cible compris.
- T1 complet (`npm run check`) : 0.
- T2 (`npm run test:worktree -- --fast`) : 0. Vitest 18 239 passent, 56 ignorés ; E2E 423 passent, 37 ignorés.
- Captures de référence : workflow `visual-baselines` (run 44182337708) sur la tête de la branche. Les six captures de la fiche changent, les deux du portail sont identiques à l'octet (non committées). Chaque image relue avec un calque de différence : « Y aller » et « ← Retour » plus hauts (contenu décalé de 8 px, `fiche-trajectoire-onglet` passe de 1 058 à 1 066 px), lignes du tiroir des besoins plus hautes (repli « Motif » à 44 px : B1 à B7 visibles au lieu de B1 à B10 sur 900 px), traits d'icônes ; rien d'autre.

## Problèmes ouverts (restes)

- `bibliotheque/AssignationsPacksPanel.tsx:398` (liste de filtre native, `min-h-11` sans `h-11`) et les listes natives de `PacksPanel.tsx` : fichiers de PRA-6b, laissés. Les `<Select>` de ces fichiers sont déjà corrigés par la source.
- Listes de `PractitionerFoodObservationPanel` (Alimentation) sans `min-h-11` : non relevées par le constat, laissées.
- « Ouvrir la fiche-trajectoire » de l'inbox du Fil (`min-h-10`, 40 px) : non mesuré par le constat (tiroir fermé), laissé.
- Pas de nouvelle passe à l’écran : la hauteur des listes sous WebKit est prouvée par la mesure isolée, pas écran par écran.
- Le tiroir des 12 besoins est plus long (lignes de 62 à 87 px environ) : coût assumé de la cible de 44 px ; à revoir seulement si le responsable le juge trop lâche.

## Prochaine action exacte

Attendre le merge par l'intégrateur. Lots suivants de l'ordre retenu : PRA-6f, PRA-6g, PRA-6h, l'un après l'autre.

## Interdits encore actifs

- Ni route, ni garde, ni drapeau, ni schéma, ni règle clinique.
- Aucun texte d'interface hors D-488 ; aucun décor avant COM-1 ; identités de fixture seulement.
- La session ne merge pas.
