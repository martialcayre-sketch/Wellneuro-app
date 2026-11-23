# Handoff — 2026-11-21 — Refonte Lien / Empreinte, PRA-6m : les écrans praticien tiennent à 195 px

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6m-reflow-195-dca29c`, worktree `.claude/worktrees/refonte-lien-pra6m-reflow-195-dca29c`, créée sur `origin/main` `288e1b24`, avancée par `--ff-only` à `e2033a9f` (#2296), puis à `27ed4100` (#2297, documentation seule) avant le premier commit. Après le merge de PRA-6k (#2298) et PRA-6l (#2299), `origin/main` fusionnée dans la branche (`f2e617db`, sans conflit, aucun fichier commun) sur l'accord direct du responsable (D-518, question `20261121-1812-pra6m`). Après la revue de `wn-reviewer`, `origin/main` (`e6e4ebcf`, #2301 à #2305, aucun fichier commun) fusionnée de nouveau (`aee5c6e1`), sur un second accord direct (question `20261121-1922-pra6m`), pour lever ses deux réserves.
- Code d'interface seul : des classes CSS, une règle de `globals.css`, un banc E2E, un fragment de changelog et ce handoff. Ni route, ni garde, ni drapeau, ni schéma, ni texte.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454, D-546).

## Objectif

Le lot « 195 px » du praticien, ouvert par le responsable le 2026-11-21 : supprimer les débordements horizontaux à 195 px CSS (zoom 200 % sur un téléphone de 390 px) relevés au §3.7 de `pra6-constat.md` et remesurés au handoff de PRA-6g, sur la convention déjà appliquée au portail (PAT-7e #2201, PAT-7f #2238), et le prouver par un E2E.

## Décisions prises

- Pas de décision neuve. Patron du portail : `[overflow-wrap:anywhere]` pour les mots trop longs, césure (`hyphens-auto`, `lang="fr"`) sous 320 px seulement ; tout ce qui pourrait changer une mise en page au-delà de 320 px est borné à `max-[319px]:`.
- **Titres de page `text-3xl`, un seul geste** : la chaîne de classes commune (`EnTeteRayon` et les douze titres de onze pages du tableau de bord, Patients et Droits compris) reçoit `[overflow-wrap:anywhere] max-[319px]:hyphens-auto`. Titres en bloc : sans effet tant que le mot tient.
- **Champs de formulaire, une règle commune** (`globals.css`, `@layer base`, sous 320 px, `:where([data-theme='praticien'])`, spécificité nulle) :
  - `max-width: 100%` sur `input`, `select`, `textarea` : tient un champ dans un conteneur de largeur définie (P25, P35, P40).
  - `contain: paint` sur `select` : sous WebKit, un `<select>` plus étroit que le texte de son option choisie garde ce texte en débordement interne, et la page défile sans qu'aucun élément ne dépasse. C'était la cause « non identifiée » de P51 et P52, trouvée par retrait (`display:none` successifs jusqu'au plus profond élément dont le retrait supprime le débordement). Premier correctif, `overflow: hidden` : vert sous WebKit macOS (T2), **rouge au CI** (WebKit Linux, 49 à 123 px) ; le détecteur renforcé y a lu `overflow` calculé à `visible` et `appearance: auto` : la liste garde son apparence native et le moteur y force `overflow: visible`. `contain: paint` ne passe pas par `overflow` : sous WebKit macOS, `overflow` reste calculé `visible` et la page tient à 195. Le contour de focus de la liste, comparé en capture avec et sans `contain`, est identique. La règle commune couvre P51 sans toucher `SynthesePanel.tsx`.
  - Le détecteur du banc nomme désormais le coupable par retrait quand rien ne dépasse et que la page défile pourtant (commit `86f5088e`).
  - Mesuré : quand c'est le **conteneur** qui suit la largeur native du champ (item de grille à piste implicite, item de flex), `max-width: 100%` ne suffit pas sous WebKit. Le correctif va alors au conteneur : `grid-cols-1` (minmax(0, 1fr), précédent de `BibliothequePanel`) ou `max-w-full` sur le libellé (patron de PRA-6g).
- **Fil du jour (P01, 91 px)** : la grille heure | pastille | carte laissait ~50 px à la carte. Sous 320 px, la carte passe sur toute la largeur sous l'heure et la pastille (`col-span-full`), et l'axe vertical absolu, qui la traverserait, s'efface. `FilDuJour.tsx` n'est pas l'inbox du Fil (`InboxQuestionnaires`, tenu par PRA-6l).
- Au cas par cas, tous sous 320 px : en-têtes du rail (`PanneauRail`), du Fil et du catalogue (`BibliothequePanel`) en `flex-wrap` ; résumé replié du rail en `whitespace-normal` ; lignes des Paramètres en `flex-wrap`, adresse coupable ; compteurs de l'Atelier des règles empilés ; choix d'analyte de `SaisieBilan` sans `min-w-48` ; champ de test des règles sans `min-w-64` ; libellés du tableau du cabinet et des analytes coupables ; marge du tri des Compléments retirée.
- Sans borne, parce que sans effet tant que le contenu tient : `grid-cols-1` (Agenda, Correspondance, Paramètres, trois grilles de l'Atelier des règles), `max-w-full` (libellés des Compléments, rangée « Notebook » du Corpus), `min-w-0` (section du cabinet, liste « Notebook »), `[overflow-wrap:anywhere]` sur les codes de population (`RayonFichesUsagePanel`).
- **Banc** : pas de nouveau fichier (patron de PRA-6g). `e2e/bibliotheque-mobile.spec.ts` reçoit un `describe` à 195 px, un test par écran (seize), sur le détecteur existant. Largeur posée par le test : Chromium et WebKit le jouent. P01 attend en plus ses cartes (le titre « Aujourd'hui » ne paraît qu'après leur chargement).

## Fichiers modifiés

- `web/src/app/globals.css` (règle commune des champs, sous 320 px).
- Titres : `web/src/app/dashboard/bibliotheque/EnTeteRayon.tsx` et `web/src/app/dashboard/{page,agenda,cabinet,copilote,correspondance,documents,droits,parametres,patients,synthese,trajectoires}/page.tsx`.
- `web/src/components/fil/FilDuJour.tsx`, `web/src/components/fil/PanneauRail.tsx`, `web/src/components/BibliothequePanel.tsx`, `web/src/components/agenda/AgendaPraticien.tsx`, `web/src/components/biologie/RayonBiologiePanel.tsx`, `web/src/components/cabinet/ComptesCabinetPanel.tsx`, `web/src/components/complements/RayonComplementsPanel.tsx`, `web/src/components/corpus/AtelierCorpus.tsx`, `web/src/components/fiches-usage/RayonFichesUsagePanel.tsx`, `web/src/components/patient-cockpit/SaisieBilan.tsx`, `web/src/components/regles/AtelierReglesPanel.tsx` (classes seules ; aucune logique de règle touchée).
- `web/src/components/PacksPanel.tsx` (après le merge de PRA-6l) : deux lignes. Le fichier est versé en CRLF sur `main` ; une première écriture l'avait converti en LF (736 lignes au diff, réserve de `wn-reviewer`), reprise depuis la version de `main` : ses fins de ligne sont intactes.
- `web/e2e/bibliotheque-mobile.spec.ts`, `changelog.d/2026-11-21-refonte-lien-pra6m-reflow-195.md`, ce handoff.

## Validations exécutées

- **Remesure avant correctif** sur `origin/main` (`288e1b24`), `next dev`, base locale du worktree migrée et seedée (fixtures seules : Sophie Nicola, Jennifer Martin, Michel Dogné), cookie praticien des E2E, WebKit (iPhone 13), 195 × 332. Sonde locale non versée (`e2e/pra6m-195.local.spec.ts`). Débordements : P01 91, P25 48, P33 75, P34 17, P35 33, P36 57, P37 73, P40 99, P44 77, P46 49, P47 40, P49 94, P51 7, P52 7, P53 74, P57 73. P35, P36 et P49, que PRA-6g mesurait à 0, débordent ici : le poste charge le `web/.env.local` de la copie principale, dont les drapeaux ouvrent des écrans fermés au banc (l'Atelier des règles, notamment). Les chiffres sont donc ceux d'un poste, pas du banc.
- **Après correctif**, même sonde : quinze écrans sur seize à 0, puis P37 à 0 après la fusion de `main` (voir problèmes ouverts).
- Capture à 195 px de P01 après correctif, relue : la carte du Fil se lit en pleine largeur sous l'heure et la pastille.
- **Banc** `bibliotheque-mobile.spec.ts` contre `next dev`, base locale : 36 verts sur 36 (Chromium et WebKit), tests existants de PRA-6g compris ; après la fusion de `main`, `contain: paint` et P37 : 38 verts sur 38. Pas de passe rouge sans correctif : le détecteur est celui de PRA-6g, et la mesure « avant » ci-dessus, faite avec la même logique, voyait chacun des quinze écrans déborder.
- `npm run check:rapide` : 0. `npm run check` (T1 complet, `TMPDIR` isolé, cf. PRA-6g) : 0.
- Après la fusion de `main`, `contain: paint` et P37 : `npm run check` 0 ; T2 `--fast` 0 (séquence verte en 10 min 7 s, E2E 471 verts dont les 32 tests à 195 px sur le build de production).
- Après la seconde fusion (`aee5c6e1`), CRLF rétablis et banc précisé (P37, P46, P49) : `npm run check` 0 ; T2 `--fast` 0 (E2E 471 verts, 37 sautés, dont les 32 tests à 195 px sur le build de production).
- T2 `--fast` (`TMPDIR` isolé, joué seul sur le Mac après attente du calme, sur `e2033a9f` + le diff) : 0, séquence verte en 10 min 37 s ; E2E 463 verts, 37 sautés, dont les 30 tests à 195 px sur le build de production. #2297, arrivée ensuite, ne touche que de la documentation.

## Problèmes ouverts

- **P37 (Questionnaires)** : d'abord laissé en reste (sa rangée « Modifier / Désactiver » vit dans `PacksPanel.tsx`, alors tenu par PRA-6l). Après le merge de PRA-6l et la fusion de `main`, remesuré à 73 px sur l'arbre fusionné, puis corrigé dans ce lot (`li` en `flex-wrap`, rangée d'actions en `basis-full`, sous 320 px) et ajouté au banc. Le seed pose un pack (`PACK_SEED_BASE`) : le test attend son bouton « Modifier », et mesure donc la rangée corrigée (la réserve de `wn-reviewer`, « aucun pack au banc », ne tenait pas, mais le test ne le prouvait pas).
- **Inbox du Fil (P01), observé en capture à 195 px, sans débordement** : dans « Questionnaires à consulter », le nom du patient est tronqué jusqu'à sa première lettre (« M… », « J. ») à côté de la date. Ce n'est pas un défilement, mais l'information se perd. `fil/InboxQuestionnaires.tsx`, que tenait PRA-6l, n'est pas touché par ce lot : à reprendre dans un lot à part, si le responsable le veut.
- **P51** : tenu par la règle commune ; `SynthesePanel.tsx` n'est pas touché. Le banc tourne sur l'arbre fusionné, PRA-6k comprise.
- **Couverture du banc** : sans `WN_C4_ENABLED` au banc, P49 n'y montre que le message d'atelier fermé ; les grilles corrigées de `AtelierReglesPanel` ne sont mesurées que sur le poste (drapeau du `.env.local`). Même chose pour la recherche ouverte de P46, dont le test attend désormais l'un des deux états (message ou bouton « Rechercher »), comme à 320 px. Les deux limites sont écrites dans le banc.
- Hors périmètre, non traités : la liste « Intention clinique » rognée à 320 px sur P49 (§3.7) ; les écrans praticien que le constat n'a pas mesurés à 195 px.

## Prochaine action exacte

1. CI de #2300 sur la tête (`node scripts/wn-attendre-ci.mjs 2300` en fond), `node scripts/wn-revue-pr-agent.mjs <N>` → 0, un verdict par remarque.
2. Commentaire « prête @<sha> » sur la PR, ligne `prete` (état `emis`) au registre D-503 pour l'intégrateur.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; la césure ou le repli ne change pas un texte. Aucun décor avant COM-1.
- Ni route, ni garde, ni drapeau, ni schéma, ni règle clinique. Production en lecture seule ; constat à l'écran en local, fixtures seules.
- La session ne merge pas. Branche avancée par `git merge --ff-only origin/main` seulement (D-518).
