# Handoff — 2026-11-16 — Refonte Lien / Empreinte, PRA-4 PR 4 : ateliers (P47 à P50)

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra4-pr4-5001dc`, dans le worktree `.claude/worktrees/festive-euclid-5b8aff`, créée sur `origin/main@73d47077`.
- Avancée par `--ff-only` à `94db7045` pendant les éditions (#2184, #2185 : crochets et outillage F05), puis à `1706ab8f` avant le commit (#2186 : docs F05) ; aucun fichier du diff.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454).

## Objectif

Poser dans le code, sur P47 à P50, les réponses (a) Q1, Q5, Q6, Q7, Q8, Q9, Q10 et Q11 du complément DOC-13 de D-481. Textes neufs : T-71 et T-72 seulement, mot pour mot de D-488. Écrans de signature (claims, règles, positions) : logique, confirmations et textes existants inchangés.

## Décisions prises

- Q7 (revue en lot du corpus) :
  - « Soumettre les décisions (N) » passe par `ui/GesteConfirme` (patron de la PR 1).
  - La question est T-71 ; le bouton plein est T-72 ; « Annuler » est le texte en service.
  - Les variantes de D-488 vivent dans `corpus/textesRevueLot.ts` : terme à zéro omis, terme à 1 au singulier, seconde phrase omise pour une seule décision.
  - `soumettreLot` n'est pas touché : même route, même `statutAttendu`, une décision par claim, même résumé, même reprise.
  - Constat `wn-reviewer` corrigé : les comptes (libellé, T-71, T-72, désactivation) ne portent plus que sur les marques des claims affichés, seules soumises. Une marque restée dans la Map après qu'un claim a quitté la file ne s'annonce plus.
  - Tout démarquer pendant que la confirmation est ouverte la referme (clé de remontage) : jamais de question « 0 décision ».
- Q6 :
  - Les onglets du corpus et de Règles prennent la forme des sous-vues de PRA-3b (`FichePatientPanel` : barre `bg-muted`, actif `bg-surface font-semibold shadow-card`), comme le dit D-481 ; ce n'est pas la chip `border-primary bg-primary/10`.
  - Les marques « À valider » / « À rejeter » et les verdicts « Conforme » / « Non conforme » de la voie rapide deviennent des boutons pressés bordés (`aria-pressed`).
  - Les classes communes vivent dans `corpus/habillageAtelier.ts`.
- Q11 :
  - La voie rapide passe par `PanneauSuperpose`, en `tiroir`, largeur `ample` (la plus grande de la primitive, qui n'a pas de plein écran).
  - Titre en `Dialog.Title` ; surtitre dynamique repris tel quel.
  - La description masquée reprend l'ancien `aria-label` « Voie rapide — {sourceId} ».
  - La croix « Fermer {titre} » remplace le bouton « Fermer » de l'en-tête ; celui de la phase « conclu » reste.
  - L'écoute d'Échap sur `window` est retirée : Radix la porte.
  - Constat `wn-reviewer` corrigé : un clic sur le voile ne ferme pas le tiroir (`onInteractOutside`, précédent `PacksPanel`), sinon la saisie en cours se perdait.
  - Le focus revient au bouton « Voie rapide » de la source une fois la table relue, ou au h2 « Sources en revue » si le bouton n'est plus actif.
- Q1 :
  - Atelier corpus et Règles passent par `EnTeteRayon` (h1).
  - Sous le h1, le corpus a ses h2 : « Sources en revue », « Étiquetage en lot », « Exclusion de la recherche en lot » et l'identifiant de chaque source de la file. Dans la voie rapide, les sections passent en h3 sous le titre du dialogue.
  - Règles : « Tester une intention » et les intentions en h2, les deux listes du catalogue en h3.
  - Positions d'expert : sections en h2, « Arbitrages enregistrés hors… » en h3.
- Q5 :
  - Les champs nus passent à 44 px avec l'anneau `focus-visible` : `CLASSE_CHAMP` dans le corpus, `classeChamp()` dans Règles, `CHAMP` dans Positions.
  - `ui/Select` reçoit `CLASSE_SELECT` en local (filtre notebook, sélecteurs de Positions).
  - « Changer » et les lignes d'ingrédient passent à 44 px.
  - Les `<summary>` (verbatims, historiques, formulaires de Règles) passent à 44 px avec l'anneau ; le patron vient de `PhysioTraitementsPanel`.
  - Cases et radios : zone de clic de 44 px par le libellé, anneau sur la case.
- Q8 : la table des sources passe en blocs empilés sous `md`, patron des assignations (PR 1) : `tr` gardés, clés `md:hidden`. L'E2E `corpus-voie-rapide-caduc` vise toujours `tr`.
- Q10 : `bg-card` passe à `bg-surface`, `destructive` à `status-danger`.
- Q9 : aucune entrée de menu, aucun drapeau touché.
- `GesteConfirme` (constat `wn-reviewer`) : le focus n'est rendu au déclencheur que s'il est retombé sur la page. Avant, une saisie de motif après « Annuler » se le faisait reprendre.
- Écarté avec motif : titre dans les `<summary>` de Règles. Un titre dans un rôle bouton est mal restitué ; aucun saut de niveau.

## Fichiers modifiés

- Pages : `web/src/app/dashboard/corpus/page.tsx` et `regles/page.tsx`, qui passent par `EnTeteRayon`.
- Corpus : `AtelierCorpus.tsx`, `AtelierCorpusPanel.tsx`, `AtelierVoieRapideModale.tsx`, `EtiquetageLotPanel.tsx`, `ExclusionRechercheLotPanel.tsx`, `ClesLienChamps.tsx`, sous `web/src/components/corpus/`.
- Corpus, fichiers neufs : `habillageAtelier.ts` et `textesRevueLot.ts`.
- Habillage seul : `web/src/components/regles/AtelierReglesPanel.tsx` et `web/src/components/positions-expert/AtelierPositionsPanel.tsx`.
- `web/src/components/ui/GesteConfirme.tsx`, retour du focus.
- Bancs :
  - `AtelierCorpusPanel.test.tsx` : six bancs de la revue en lot passent par la confirmation ; cinq neufs.
  - `AtelierCorpus.test.tsx` (neuf) et `textesRevueLot.test.ts` (neuf).
  - `AtelierReglesPanel.test.tsx` (onglets) et `GesteConfirme.test.tsx` (focus).
- `changelog.d/2026-11-16-refonte-lien-pra4-pr4.md`, ce handoff.

## Validations exécutées

- Vitest ciblé (corpus, règles, positions, rayons, `ui`) : vert, 26 fichiers, 249 tests avant les correctifs de revue ; corpus et `GesteConfirme` rejoués après : 7 fichiers, 73 tests, vert.
- Banc du voile prouvé rouge sans `onInteractOutside`, vert avec.
- `tsc --noEmit` : 0.
- T1 (`npm run check:rapide`) : vert, 16 étapes, après chaque passe d'édition.
- T2 (`npm run test:worktree -- --fast`) : vert en 10 min 4 s, parti à 21 h 33 sur l’état final du code, machine calme (aucun autre run, charge 3,5).
  - Contenu : Vitest entier (18 035 tests) ; 412 E2E réussis, 34 sautés (Chromium et WebKit) ; bancs à deux sessions des décisions de parcours, de l’exclusion signature ↔ constat NABM et des positions d’expert.
  - Un premier passage, parti avant les correctifs de revue, a été arrêté volontairement.
- Relecture `ui-ux-pro-max` (domaine `ux`) :
  - « Heading Hierarchy » : conforme.
  - « Touch Target Size » : conforme après l'ajout des `<summary>` à 44 px.
  - « Focus States » : conforme.
  - « Table Handling » : conforme, blocs empilés.
  - « Confirmation Dialogs » : conforme.
  - « Touch Spacing » : la barre d'onglets garde 4 px entre onglets, patron des sous-vues de PRA-3b que Q6 demande à l'identique, écarté avec ce motif ; les autres voisins sont à 8 px.
  - « Focus Not Obscured » (AAA) : le pied collant de la revue en lot et celui du tiroir peuvent couvrir un champ ; mineur, non traité.
- `wn-reviewer` :
  - premier passage : NO-GO sur deux constats (comptes de T-71, voile du tiroir), corrigés ; mineurs 3 à 5 corrigés, 6 écarté ;
  - rejugement du delta : GO sous réserve de T2 ; 147 tests rejoués par le relecteur (corpus, `GesteConfirme`, règles, Bibliothèque) ;
  - M1 (changelog muet sur `GesteConfirme`) corrigé ;
  - M2 laissé : une marque dont le claim revient dans la file réapparaît, mais elle est alors comptée par T-71 et visible avant confirmation, donc sans effet silencieux.
- La session n'a pas fait de contrôle à l'écran à 390, 834, 1 280 et 1 440 px : la connexion praticien passe par OAuth. Les E2E de T2 traversent l'atelier corpus et la voie rapide (tirage caduc).

## Problèmes ouverts

- Voie rapide : le tiroir `ample` borne à 896 px ce qui était plein écran. Les deux colonnes (échantillon, restitution) n'ont plus qu'environ 420 px chacune. C'est l'effet de Q11 (a) avec la primitive telle qu'elle est ; à constater à l'écran, et à rouvrir par une décision si c'est trop étroit.
- Hors PRA-4 (inchangé) : `chargerBibliotheque` avale l'échec ; `bibliotheque/options` sans entrée ; décor après COM-1 ; libellé accessible du sélecteur de statut des assignations ; titre dynamique de la fiche d'analyte.

## Prochaine action exacte

1. CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond). PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque.
2. « Prête @<sha> » sur la PR et dans la boîte `integrateur`.
3. Ligne PRA-4 de la page de suivi praticien, puis résumé `lien-praticien` de la page D.
4. Après le merge : PRA-4 est complet (quatre PR) ; la suite du plan praticien (PRA-5, PRA-6) se reçoit séparément.

## Interdits encore actifs

- Aucun texte d'interface hors de D-488 ; aucun décor avant COM-1.
- Écrans de signature : logique, confirmations et textes existants inchangés ; signature NABM en lot selon D-326 §2.
- Ni entrée de menu pour Règles et Positions d'expert, ni drapeau, ni route, ni garde serveur, ni schéma, ni migration ; rien de clinique ; production en lecture seule.
- Jamais de merge par la session ; toute écriture ArtifactData se fait avec `if_version`.
