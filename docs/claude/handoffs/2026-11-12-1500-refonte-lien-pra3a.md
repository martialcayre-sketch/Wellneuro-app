# Handoff — 2026-11-12 — Refonte Lien / Empreinte, PRA-3a : structure de la fiche-trajectoire

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra3a`, créée depuis `origin/main` (`d43edf94`, après DOC-3 #2012), dans le worktree `wt-refonte-pra3a`.
- Un commit de lot. À déclarer « prête @<sha> » pour l'intégrateur après la CI et la revue de bot ; la session ne merge pas.
- Checkout principal non touché. Aucun fichier COM-0 ni patient modifié.

## Objectif

Lot PRA-3a du plan praticien (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-praticien.md`, §3) : en-tête de fiche sans vues rapides (AM-3, [[D-484]] §2), rail des sept phases repliable (T-14), panneau de contexte escamotable (T-15), information critique gardée dans la zone de travail, aucun brouillon démonté, focus qui suit la commande, aucun contenu d'un dossier précédent, aperçu de diffusion qui ne diffuse rien. Cadre : [[D-486]] §3, [[D-488]].

**Préalable [[D-481]] §4** : aucune trace de prototype validé pour la famille « fiche-trajectoire » au départ du lot. Prototype « Prototype PRA-3a — Fiche-trajectoire, structure » (artefact claude.ai privé, sept planches) publié, puis validé par le responsable le 2026-11-12 avec les réponses proposées aux cinq questions :

- Q1 : phases masquées entièrement (pas de rail réduit aux icônes) ;
- Q2 : replis gardés d'un dossier à l'autre pendant la session, perdus au rechargement, rien d'écrit sur l'appareil ;
- Q3 : contexte fermé, les traitements déclarés et la décision de parcours restent dans la zone de travail, sans intitulé neuf ;
- Q4 : le nom du dossier n'est plus répété dans le bandeau du poste de pilotage ;
- Q5 : à la réouverture, focus sur « Masquer … » du panneau rouvert.

Trace : journal de la fiche PRA-3 sur la page de suivi praticien.

## Décisions prises

- **Mémoire des replis** : `web/src/components/patient-cockpit/replisFiche.ts`, un état de module lu par `useSyncExternalStore`, au-dessus de la clé du dossier ([[D-072]] §4). Aucune écriture sur l'appareil ; aucun identifiant patient dans l'état. `contexteMasque` à `null` tant que rien n'est choisi dans la session : la largeur décide.
- **Escamotage d'office du contexte de 1 024 à 1 279 px** (planche 1 024 px du prototype) : porté par des classes Tailwind (`lg:max-xl:hidden`), pas lu en script — aucun éclair, aucune mesure de fenêtre. Au-delà, affiché ; un choix de la session l'emporte ensuite à toute largeur.
- **Sous 1 024 px, rien ne change** : colonnes empilées, aucune commande (planche téléphone).
- **Grille → flex** : la rangée du poste de pilotage passe de `lg:grid-cols-[13rem,1fr,15rem]` à `lg:flex` avec colonnes `lg:w-52` / `lg:flex-1` / `lg:w-60` — mêmes largeurs, et une colonne repliée sort du flux sans table de gabarits.
- **Replier masque, ne démonte pas** : `display: none` au bureau (hors page, clavier, arbre d'accessibilité), composants montés ; le runtime clinique, le brouillon P15 et les approbations restent.
- **Focus** : posé après le rendu (effet), sur la commande d'arrivée. « Masquer les phases » au pied du rail, hors du `tablist` (une commande n'est pas un onglet) ; « Masquer le contexte » en tête de la colonne « Instruments » ; « Afficher les phases » et « Afficher le contexte » aux deux bouts du bandeau, dans l'ordre visuel.
- **Information critique (Q3), lecture retenue** : les deux instruments existants « Données physiologiques et traitements » et « Décisions de parcours », sous leurs drapeaux, sont rendus aussi dans la zone de travail quand le contexte est fermé. Leur contenu ne se lit qu'à l'ouverture, comme dans la colonne : replier n'émet aucune requête (`G-TRUST-04` : aucun accès de plus au journal). Afficher les lignes elles-mêmes demanderait une lecture et un résumé neufs : contenu de PRA-3b.
- **En-tête de fiche** : identité (nom, adresse) et actions déjà présentes, inchangées ; les vues rapides étaient déjà retirées par PRA-1.
- **Icônes** : `PanelLeftClose` / `PanelLeftOpen` (phases), `PanelRightClose` / `PanelRightOpen` (contexte), au trait `TRAIT_ICONE`.

## Fichiers modifiés

- Neuf : `web/src/components/patient-cockpit/replisFiche.ts`.
- `web/src/components/FichePatientPanel.tsx` : commandes, colonnes repliables, encart critique, nom retiré du bandeau, deux instruments factorisés pour deux emplacements.
- `web/src/components/FichePatientPanel.test.tsx` : six cas PRA-3a, remise à zéro des replis entre les cas.
- `web/e2e/fiche-trajectoire.spec.ts` : bloc « replis des phases et du contexte (PRA-3a) », bureau seulement.
- `changelog.d/2026-11-12-refonte-lien-pra3a-fiche-structure.md`, ce handoff.

## Validations exécutées

- Bancs Vitest de la fiche : 179 sur 179, dont six cas PRA-3a (focus aller et retour pour chaque panneau, rail monté et brouillon gardé au repli, escamotage d'office du contexte, encart critique sous drapeaux, aucune requête au repli, mémoire de session sans écriture sur l'appareil, nom absent du bandeau).
- **T1** (`cd web && npm run check`) vert sur l'état final.
- **T2** (`npm run test:worktree -- --fast`) vert sur l'état final, seul : Vitest 16 980 passés (50 ignorés) ; Playwright, build de production, Chromium et WebKit : 369 passés, 35 ignorés, 0 échec — dont les deux e2e PRA-3a (clavier, rechargement, escamotage d'office à 1 100 px) et `mode-consultation.spec.ts`.
  *Observé* : trois passages intermédiaires rouges en Vitest seul, tous par délai dépassé (5 s) ou seuil de durée, sous une charge machine de 20 à 55 (suites d'autres sessions) : `ProtocolMiniBuilder.test.tsx`, `GenericQuestionnaire.test.tsx`, `masquage.test.ts`, deux bancs de garde, `contradictionsService.test.ts` — tous hors du diff et verts seuls. Un seul était du lot : le cas « mémoire de session » de `FichePatientPanel.test.tsx` (deux montages complets) ; il reçoit un délai de 20 s et restaure son espion en `finally`.
- **Constat à l'écran local** (build de production sur la base éphémère de T2, patients fictifs Sophie Nicola, Jennifer Martin, Michel Dogné), captures Chromium non versées :
  - 1 440 px : trois colonnes, « Masquer le contexte » en tête des instruments, nom absent du bandeau ; replié, « Afficher les phases » et « Afficher le contexte » aux deux bouts du bandeau, zone de travail pleine largeur ;
  - 1 280 × 800 : contexte affiché ; les boutons d'instrument s'écrasaient sous leur contenu (la colonne rétrécissait ses enfants), **corrigé** par `[&>*]:shrink-0`, la colonne défile ;
  - 1 100 px : contexte escamoté d'office ; la puce de phase et « Afficher le contexte » passaient séparément à la ligne, **corrigé** en les groupant à droite ;
  - téléphone 390 px : inchangé, aucune commande de repli, instruments après la zone de travail.
- **CI #2019, premier passage (`c2f9a3c3`)** : contrôles, typage et tests, PR-Agent et CodeRabbit verts ; `e2e` rouge sur trois références au pixel seulement (`visual.spec.ts` : fiche-cockpit bureau et iPhone, tiroir des 12 besoins bureau), `verify` rouge par agrégation. Références régénérées par le workflow `visual-baselines` sur la branche, comparées aux références de `main` : exactement ces trois-là diffèrent, les cinq autres sont identiques à l'octet. Relues une à une : bandeau sans le nom, « Masquer le contexte » en tête des instruments, « Masquer les phases » au pied du rail (bureau) ; nom retiré du bandeau seulement (iPhone) ; contenu des écrans identique. Trois images commises dans `web/e2e/visual.spec.ts-snapshots/`.
- **Revue CodeRabbit** (`c2f9a3c3`, un commentaire en ligne, aucun nitpick) : clic rejoué dans `toPass()` dans les deux e2e PRA-3a → **corrigé** : le test attend le rail « posé » (plus aucune « indéterminée », signal de `visual.spec.ts`), puis clique une seule fois. **PR-Agent** : description et guide, aucun constat.
- **Relecture `ui-ux-pro-max`** (lecture seule, `ux-guidelines.csv`) :
  - « Focus States » et « Keyboard Navigation » : anneau `focus-ring` sur les quatre commandes ; colonnes repliées hors du parcours ; ordre de tabulation conforme à l'ordre visuel ;
  - « Focus Not Obscured (Minimum) » : commandes dans le flux, jamais sous une superposition ;
  - « Target Size (Minimum) » : `min-h-11` (44 px) ;
  - « Overflow Hidden » : voir la correction à 1 280 × 800 ci-dessus ;
  - « Deep Linking » : **écartée**, les replis ne vont pas dans l'adresse (Q2 validée : mémoire de session seulement) ;
  - aucune animation ajoutée (mouvement réduit sans objet).

## Problèmes ouverts

- **Motif d'alliance de l'en-tête de fiche** ([[D-481]] §1 bis, ligne P04, lot PRA-3a au plan) : non posé. Il passe par `LienDecor` (micro-lot COM-1), absent de `main`, et son choix (`alliance-arcs.svg` ou `linked-loops-muted.svg`) devait figurer au prototype, qui ne le porte pas. À reprendre une fois COM-1 mergé, avec une planche de prototype ajoutée et validée.
- **Information critique, lignes affichées** : la lecture retenue garde les deux instruments accessibles, pas leurs lignes visibles. Un résumé lisible sans ouvrir (traitements en cours, décision active) relève de PRA-3b et d'une lecture à arbitrer (`G-TRUST-04`).
- **Hauteur du poste de pilotage** (`lg:h-[calc(100dvh-11.75rem)]`) : l'en-tête de fiche et les onglets dépassent désormais 11,75 rem, la page défile d'une trentaine de pixels au bureau et « Masquer les phases », au pied du rail, est sous la ligne de flottaison à 800-900 px de haut — atteignable au défilement et au clavier. Comportement de la hauteur antérieur au lot ; pour PRA-6 (vérifications de largeurs et de hauteurs).
- **Libellés de phase tronqués** dans la colonne de 13 rem (« 2. Données fi… ») : déjà sur la référence visuelle de `main`, inchangé ; contenu du rail, pour PRA-3b.
- **Reportés de PRA-1, toujours pour PRA-6** : rail réduit à faible hauteur ; e2e des infobulles ; specs qui cliquent avant l'hydratation (`mode-consultation-sans-chiffre`).

## Prochaine action exacte

Commit, push, PR (`--body-file`), CI (`node scripts/wn-attendre-ci.mjs <N>` en fond, `head=` vérifié), revue `@coderabbitai full review` (sinon PR-Agent, sinon `wn-reviewer`), verdict à chaque remarque, puis « prête @<sha> » et PRA-3 à `prete` (pr, sha) sur la page de suivi praticien.

## Interdits encore actifs

- Fichiers COM-0 gelés ; tout besoin commun passe par un `COM-n`, un seul ouvert à la fois, annoncé dans les deux pages de suivi.
- Aucun texte hors de [[D-488]] ; aucun drapeau posé ou retiré ; aucune modification clinique, de questionnaire, de scoring, de route, de garde ni de schéma ; aucune migration.
- Aucun fichier patient (`components/patient/**`, `components/patient-companion/**`, `app/portail/**`, `lib/portail/**`, `CerclesConcentriques`).
- Contenus des panneaux : PRA-3b.
- Production en lecture seule, et seulement sur demande. Aucune identité ni identifiant de dossier réel au dépôt.
