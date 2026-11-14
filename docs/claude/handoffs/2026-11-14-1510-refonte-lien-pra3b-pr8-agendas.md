# Handoff — 2026-11-14 — Refonte Lien PRA-3b, PR 8 : agendas et journal (P58 à P60)

## Branche et état du dépôt

- Branche `worktree-refonte-lien-pra3b-pr8-agendas`, créée depuis `origin/main@80130dd0`, puis avancée par `--ff-only` sur `5112d4f0` (crochet de fraîcheur, aucun commit propre à ce moment).
- Worktree `.claude/worktrees/refonte-lien-pra3b-pr8-agendas`. La session ne merge pas : l'intégrateur merge sur « prête @<sha> ».
- Dernière PR de la matrice des huit : après son merge, PRA-3b est entièrement livrée.

## Objectif

PR 8 de PRA-3b (matrice, ligne 8 : agendas et journal, P58 à P60), selon Q6 b (DOC-8, [[D-481]]) et les réponses « a » du responsable à Q3 et Q17 (« Toutes en a », 2026-11-13). Texte posé : T-66 (inscrit dans [[D-488]] par DOC-8) et T-17 aux emplacements neufs P58, P59.

## Décisions prises

- Q6 relue sur la planche « Questions » : l'option proposée y est b, et c'est b que DOC-8 a tranchée. « Toutes en a » ne la vise pas : elle répondait aux quatorze autres questions.
- P58, Q6 b : rubriques de l'infobulle extraites dans `lignesNuit(point)`, lue à la fois par l'infobulle et par la liste « Voir les nuits une par une ». Les neuf rubriques restent dans le même ordre et sous les mêmes libellés. Le bouton porte `aria-expanded` et `aria-controls` ; le focus reste sur lui ; la liste est cachée par `hidden`. Le graphe passe sous `aria-hidden` dans la même PR, et un banc d'équivalence compare, nuit par nuit, les lignes de l'infobulle rendue et celles de la liste.
- P58, autres points de la planche (option b) : couleurs en jetons (`primary` à trois opacités, liseré `lien-champagne`, repères `muted-foreground`). Les étiquettes inclinées sont remplacées par le numéro de nuit à l'horizontale. La légende est inchangée (« Liseré ambré » reste exact pour le champagne).
- P58, P59 :
  - titre d'épisode en h3 (Q2 a, sous le h2 du tiroir) ;
  - « Clôturer et agréger » et « Clôturer et verser au dossier » passent de plein à bordé (Q3 a), 44 px, avec anneau de focus ;
  - l'échec de lecture prend `role="alert"` et « Réessayer » (Q17 a) ;
  - le focus est rendu à la racine du panneau (`tabIndex={-1}`) une fois la relecture lue ;
  - le panneau du sommeil efface désormais son message au rechargement, comme le panneau alimentaire, sans quoi « Chargement impossible. » survivait à une relecture réussie.
- P60 : « Révision » et « Choix du patient et mise en œuvre » passent de h4 à h3. Boutons, champs, sommaires et « Réessayer » reçoivent l'anneau de focus ; leur 44 px était déjà en place.
- E2E `agenda-sommeil-praticien` : l'infobulle se cherche dans `.recharts-tooltip-wrapper`, ses textes existant aussi dans la liste ; ajout du parcours de la liste, au clavier et au doigt.
- Éditions par Edit et Write seulement.

## Fichiers modifiés

- `web/src/components/agenda-sommeil/ChronogrammeSommeil.tsx` et son banc (équivalence, masquage, repli).
- `web/src/components/agenda-sommeil/AgendaSommeilPraticienPanel.tsx` et son banc.
- `web/src/components/agenda-alimentaire/AgendaAlimentairePraticienPanel.tsx` et son banc.
- `web/src/components/decisions-parcours/DecisionsParcoursPanel.tsx` et son banc.
- `web/e2e/agenda-sommeil-praticien.spec.ts`.
- `changelog.d/2026-11-14-refonte-lien-pra3b-pr8-agendas.md`, ce handoff.

## Validations exécutées

- Vitest des trois dossiers : 48 bancs verts, 5 ignorés (drapeau SIIN).
- T1 complet (`npm run check`) vert avant le fragment et le handoff.
- T2, CI, PR-Agent : voir la PR.

## Problèmes ouverts

- `JourneeCard` (P59) garde sa date en paragraphe : la planche ne la vise pas, elle reste hors de cette PR.
- Hérités : « Consultation du … » du tiroir des renseignements (PR 1) ; « Activer la décision JA » sous T-63 (PR 5) ; titre des portes biologiques (PR 6b) ; fenêtre sans verrou de Q18 ; `ProtocolMiniBuilder.test.tsx` sans `cleanup` global ; revue de sécurité de l'export pseudonymisé (Q15 a).

## Prochaine action exacte

Revue PR-Agent, puis fusion par l'intégrateur. Ensuite, page de suivi PRA-3 : PRA-3b entièrement livrée.

## Interdits encore actifs

- Rien de clinique ; aucun texte hors de D-488 ; aucune migration, route ni drapeau.
- Identités fictives seulement ; production en lecture seule ; crochet de fraîcheur jamais contourné.
