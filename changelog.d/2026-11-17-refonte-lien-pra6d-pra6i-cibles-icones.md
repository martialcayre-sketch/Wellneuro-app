### Refonte Lien, PRA-6d et PRA-6i : les cibles restantes du portail praticien passent à 44 px, listes déroulantes comprises sous WebKit ; icônes au trait de 1,75 px et panneau de compréhension sur sa surface (2026-11-17)

Deux lots du constat à l'écran de PRA-6 (`pra6-constat.md`, §3.4 et §3.8),
réunis pour ne régénérer qu'une fois les captures de référence de la fiche.
Aucun texte, aucun décor, ni route, ni garde, ni drapeau, ni schéma.

**PRA-6d — cibles de 44 px (`min-h-11`)**

- Fiche : « ← Retour aux patients » et « ← Retour aux fiches-trajectoires »
  (23 px), « Y aller » (36 px), replis « Motif » et « Écart » des besoins
  (22 px).
- Alimentation : « ← Retour fiche patient », « Réinitialiser le brouillon
  local », et les deux choix « Accepter » / « Modifier », libellé compris.
- Fil : liens de nom des panneaux Nouveaux patients, Météo d'adhésion et File
  d'envoi ; la ligne repliée de tout panneau vide de l'accueil
  (`PanneauRail`, d'où « File d'envoi » et « Correspondance récente »), avec
  une marge négative qui garde la carte repliée à sa hauteur.
- Listes déroulantes natives : sous WebKit (Safari, iPhone), une `<select>`
  stylée ignore `min-height` mais respecte `height` (mesuré : 22 px avec
  `min-height: 44px`, 44 px avec `height: 44px`). `ui/Select` porte
  désormais `h-11` pour tous ses appelants ; les `CLASSE_SELECT` et les
  `<select>` natives qui portaient `min-h-11` reçoivent `h-11` ; les classes
  de champ partagées avec des saisies (`CHAMP`) le reçoivent pour les seules
  listes (`[&:is(select)]:h-11`, la forme de `patientInputClassName`).

**PRA-6i — icônes et jetons**

- Dix-huit icônes Lucide à trait 2 passent à `TRAIT_ICONE` (fiche,
  `PatientPreview`, `ExportDossierPanel`, `ModeConsultation`,
  `BanniereDiffere`, `TwoLevelReading`) ; cinq sans trait explicite le
  reçoivent (`InboxQuestionnaires`, `PhysioTraitementsPanel`,
  `DecisionsParcoursPanel`).
- `bg-card`, sans jeton donc sans effet, devient `bg-surface` sur le panneau
  « Ce que j'ai compris de vous » (`ComprehensionPanel`), le jeton de ses
  voisins.

Restes : la liste de filtre native de `AssignationsPacksPanel` et les listes
de `PacksPanel` (fichiers de PRA-6b, en cours) ; les listes de
`PractitionerFoodObservationPanel`, sans `min-h-11` ; « Ouvrir la
fiche-trajectoire » de l'inbox (40 px, non mesuré par le constat).

Bancs : `PanneauRail`, `NouveauxPatientsAside`, `MeteoAdhesionAside`,
`FileEnvoiAside` et `PractitionerFoodObservationPanel` vérifient la classe de
cible. Captures de référence de la fiche régénérées par `visual-baselines`.
