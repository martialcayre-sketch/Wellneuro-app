# Handoff — 2026-11-11 — Refonte Lien / Empreinte, PAT-1 : shell et navigation du portail patient

## Branche et état du dépôt

- Branche `claude/refonte-lien-pat1`, créée depuis `origin/main` (`20911e7b`) dans le worktree `wt-refonte-pat1`.
- Un commit de lot. À déclarer « prête @<sha> » pour l'intégrateur après la CI et la revue de bot ; la session ne merge pas.
- Checkout principal non touché. Aucun fichier du socle COM-0 touché ; aucun fichier praticien touché (`VuesRapides`, `NavBar`, `SidebarRail` intacts).

## Objectif

Lot PAT-1 du plan patient (`docs/claude/propositions/2026-11-11-refonte-lien-etape2/plan-patient.md`, fiche « PAT-1 — Shell et navigation » ; X02 patient, U42, U10 pour « Autres espaces »). Cadre : [[D-482]] (rail patient trois états), [[D-483]] (rail seul dès 1 024 px), [[D-488]] (T-21 à T-23, T-32), amendements de [[D-447]] et [[D-460]] du 2026-11-11.

## Décisions prises

- **État du rail dans le layout.** `rail/etatRail.tsx` : un contexte `FournisseurEtatRail`, monté dans `FournisseurMenuPortail` (lui-même monté par `portail/layout.tsx`, qui persiste d'une page à l'autre). L'état survit à la navigation, pas au rechargement ; aucun `localStorage`, aucun `sessionStorage`, `stockageAppareil.ts` intact (Q56).
- **Le rail reste la `nav` « Mon espace ».** Les commandes T-21 à T-23 sont rendues en pied de la même `nav` (prop `pied` de `ListeMonEspace`), après la liste. Ainsi les mesures E2E et le lien d'évitement restent inchangés.
- **Réduit** : `w-nav-rail-compact` (13 rem) et `px-2` ; mêmes liens, mêmes libellés passés à la ligne (`break-words`), mêmes cibles `min-h-11` ; jamais d'icônes seules.
- **Escamoté** : le rail n'est plus rendu (hors page, clavier et arbre d'accessibilité), le cadre perd ses classes de colonnes, la réserve de place aussi.
- **Bouton « Menu » qui rouvre le rail** : un second bouton, du même nom, `hidden lg:inline-flex`, rendu seulement rail escamoté sur une page du rail ; le déclencheur du panneau reste `lg:hidden`. Un seul des deux est affiché à chaque largeur ([[D-444]] §2) et le second n'annonce pas un dialogue qu'il n'ouvre pas. Masquer passe le focus à ce bouton (`flushSync` puis `focus`) ; rouvrir passe le focus à l'entrée active du rail, sinon à sa première (même règle que la fermeture du panneau au seuil). Rail escamoté, un panneau fermé au seuil rend le focus à ce bouton.
- **Hub** : `NavAutresEspaces` lit `rail` et `actif` dans le contexte du menu ; dès 1 024 px (`lg:hidden`), elle n'est pas rendue quand le rail est servi — et déjà pendant la lecture de sa garde, comme la réserve du rail, pour éviter un saut à l'arrivée de la garde. Garde refusée (mineur, murs, échec), elle revient.
- **Habillage Lien** sans drapeau ([[D-481]] §3) : fond `bg-rail` (sauge, jeton patient), bord `rail-border`, encre `rail-foreground`, intertitres `rail-muted-foreground` (4,9:1 sur sauge), survol `rail-surface`, entrée active `rail-surface` + `shadow-nav-active` + graisse. Le panneau « Mon espace » (sous 1 024 px) garde ses classes : il relève d'un lot ultérieur s'il doit changer.
- **Icônes** : `IconeMonEspace` au trait `TRAIT_ICONE` (rail, panneau, barre basse) ; commandes du rail avec `PanelLeftClose`/`PanelLeftOpen`/`EyeOff`, décoratives, sous le seul drapeau des icônes comme les entrées.
- **Onglets de l'en-tête** : `VuesRapidesPortail.tsx` supprimé (seul consommateur : `portail/layout.tsx`).
- **Tests amendés** comme le routait la revue de COM-0 : `RailMonEspace.test.tsx` (forme : `bg-rail`, `border-rail-border` au lieu de `bg-surface`/`border-border` ; il interdit toujours le thème praticien et l'aplat `bg-rail-primary`). `autresEspaces.test.tsx:247` n'a pas eu à changer : « Autres espaces » ne consomme aucun jeton `rail-`.

## Fichiers modifiés

- Neufs : `web/src/components/patient/rail/etatRail.tsx`, `web/src/components/patient/rail/textesRail.ts`.
- `web/src/components/patient/rail/RailMonEspace.tsx` : trois états, commandes, habillage sauge.
- `web/src/components/patient/menu/MenuMonEspace.tsx` : `rail` dans le contexte, fournisseur de l'état du rail, `pied` et `classeActifIcones` de `ListeMonEspace`, bouton qui rouvre le rail.
- `web/src/components/patient/menu/iconesMonEspace.tsx` : `strokeWidth={TRAIT_ICONE}`.
- `web/src/components/patient/autres-espaces/NavAutresEspaces.tsx` : `lg:hidden` rail servi.
- `web/src/components/patient/autres-espaces/entreesAutresEspaces.ts` : T-32.
- `web/src/app/portail/layout.tsx` : onglets retirés, `rail` passé au fournisseur.
- Supprimé : `web/src/components/patient/barre-basse/VuesRapidesPortail.tsx`.
- Tests : `RailMonEspace.test.tsx`, `MenuMonEspace.test.tsx`, `organisationIcones.test.tsx`, `entreesAutresEspaces.test.ts`, `autresEspaces.test.tsx` (T-32).
- E2E : `portail-rail-lateral.spec.ts` (trois états, hub sans « Autres espaces », plus d'onglets) ; `portail-autres-espaces.spec.ts` (au bureau, vu à 1 023 px) ; `portail-bilan`, `portail-dossier-deux-voix`, `portail-frise-etapes`, `portail-transmission-compte-rendu` (la liste des espaces visible : « Autres espaces » ou le rail) ; `portail-menu.spec.ts` (T-32).
- `changelog.d/2026-11-11-refonte-lien-pat1-shell-navigation.md`, ce handoff.

## Validations exécutées

- **T1** (`cd web && npm run check`) : vert. Vitest ciblé du portail : 137 fichiers, 3 276 tests verts avant les derniers ajouts ; rail et menu : 100 puis 59 tests verts.
- **T2** (`npm run test:worktree -- --fast --keep-db`) : vert en 8 min 47 s — Vitest 983 fichiers (16 785 tests passés, 50 ignorés), Playwright 362 passés, 28 ignorés, 0 échec (Desktop Chromium et iPhone 13 / WebKit). Les cinq nouveaux cas du rail (`trois états`) et le hub sans « Autres espaces » passent sur Chromium ; ils sont sautés sur iPhone 13, où le rail ne sert pas.
- **Constat à l'écran local** (build de production de T2, base éphémère conservée, patients fictifs ; captures Playwright relues une à une, non versionnées) : Sophie Nicola à 1 280 px déplié, réduit, escamoté (focus visible sur « Menu ») ; hub à 1 280 px, rail seul, frise gardée, « Autres espaces » absent ; 1 024 px en confort 100 % et 112,5 %, déplié et réduit, libellés entiers passés à la ligne ; 1 023 px, bouton « Menu » seul, panneau, « Autres espaces » présent ; Michel Dogné rendu mineur dans la base éphémère seulement : ni rail ni bouton « Menu » ; questionnaire en cours : pas de rail.
- **Relecture `ui-ux-pro-max`** (`.claude/skills/ui-ux-pro-max/data/ux-guidelines.csv`, lecture seule) :
  - l.4 « Current page/section should be visually indicated » : entrée active sur `rail-surface`, filet `nav-active`, graisse, `aria-current` ;
  - l.29 « Keyboard focus [...] needs a visible indicator » et l.42 « Keep tab order aligned with visual order » : anneau global, jamais `outline-none` ; commandes après la liste, comme à l'écran ; focus déplacé au bouton « Menu » à l'escamotage, à l'entrée active à la réouverture ;
  - l.46 « Provide skip to main content link » : « Aller au contenu » reste premier (E2E) ;
  - l.113 « Clip text in fixed-width or fixed-height boxes » et l.114 « Wrap stack resize » : libellés passés à la ligne en réduit, mesurés sans coupe à 1 024 px en confort 112,5 % ;
  - l.69 « Avoid horizontal scrolling » : aucun débordement mesuré à 1 024 px, réduit compris.
  Aucune règle n'a demandé de changement ; aucune ne prime sur une décision ([[D-456]]).

## Problèmes ouverts

- **Panneau « Mon espace » sous 1 024 px** : il garde son habillage d'avant (fond surface, filet `border-primary`). L'aligner sur le rail sauge n'est pas demandé par la fiche PAT-1 ; à trancher dans un lot ultérieur (PAT-7 au plus tard).
- **Reprises de COM-0 hors de PAT-1**, toujours routées aux lots suivants : barre de progression de `GenericQuestionnaire` (argile sur sauge, PAT-4) ; halo cuivre de `PatientJourneyProgress.tsx:49` (PAT-3) ; icônes `text-accent` et champs `control-border` (lots d'écrans).
- **Zoom 200 %** : mesuré par équivalence — une fenêtre de 2 048 px à 200 % rend 1 024 px CSS, la largeur des mesures E2E (rail réduit et déplié, confort 112,5 % compris) ; une fenêtre plus étroite à 200 % passe sous 1 024 px CSS, donc au bouton « Menu » et au panneau.

## Prochaine action exacte

Commit, push, PR, CI (`node scripts/wn-attendre-ci.mjs <N>`, head= du SNAPSHOT vérifié), revue (`@coderabbitai full review`, sinon PR-Agent, sinon `wn-reviewer`), verdict sur chaque remarque, puis commentaire « prête @<sha> » et page de suivi patient (`PAT-1` → `prete`). Après le merge par l'intégrateur : PAT-3 dans un worktree neuf.

## Interdits encore actifs

- Fichiers COM-0 gelés ; tout besoin commun passe par un COM-n, un seul ouvert à la fois, annoncé dans les deux pages de suivi.
- Aucun texte hors de [[D-488]] ; aucun chiffre, compteur ni pastille côté patient ([[D-333]]).
- Aucun drapeau posé ou retiré (`WN_PORTAIL_MENU`, `WN_PORTAIL_RAIL_LATERAL`, `WN_PORTAIL_MENU_ICONES` gardent leur état) ; aucune modification clinique, de questionnaire, de scoring, de route, de garde, de sonde ni de schéma.
- `lib/portail/stockageAppareil.ts` jamais pour un état de rail (Q56).
- Production en lecture seule, et seulement sur demande. Aucune identité ni aucun identifiant de dossier réel au dépôt.
