# Handoff — 2026-11-26 — Refonte Lien / Empreinte, PRA-3a décor : motif d'alliance dans l'en-tête de la fiche

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra3a-decor-2857d4`, worktree `.claude/worktrees/refonte-lien-pra3a-decor-2857d4`, créé sur `origin/main` `7c1a9c59` ; avancé par `--ff-only` seulement (aucun commit propre avant celui du lot) jusqu'à `32380ddf`. `npm ci` et `npx prisma generate` joués avant tout test.
- Une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur (D-373, D-454, D-546).

## Objectif

Lot PRA-3a décor de la refonte Lien, ouvert par le responsable le 2026-11-26 (« Décor PAT-2 et PRA-3a »). PRA-3a avait été livré sans décor, en attendant COM-1. Le lot pose un motif d'alliance discret dans l'en-tête de la fiche-trajectoire (P04), par `LienDecor`, sans diminuer l'espace utile ([[D-481]] §1 bis). Cahier : `plan-praticien.md`, « PRA-3 ».

## Décisions prises

- **Ni DOC-n ni COM-n** : [[D-481]] §1 bis nomme déjà l'emplacement, avec ses deux motifs « choisi au prototype », et `LienDecor` accepte déjà `entete-fiche`. Au cadrage, aucun DOC-n ni COM-n n'était ouvert (registre des messages relu, aucune PR ouverte sur D-481 ni sur `LienDecor`).
- **Prototype avant tout code** ([[D-481]] §4) : https://claude.ai/artifact/ESnJCQWtYivEKaPbZ3GGJN (artefact Design System privé, version 2). Il présente le témoin et trois variantes, au bureau (avec et sans le bouton d'aperçu), à la tablette et au téléphone. Les captures viennent de la fiche réelle, rendue en local sur fixtures, avec une sonde jamais versée.
- **Constat de la sonde** : posé tel quel, le motif faisait passer l'en-tête de 45,5 à 100 px à 768 px, où la rangée a moins de 10 px libres. D'où une règle commune aux trois variantes :
  - le motif ne prend que l'espace libre (enveloppe `flex-1 basis-0`) ;
  - une marge négative `-ml-3` annule l'écart `gap-3` qu'ajouterait un enfant de plus ;
  - une requête de conteneur l'affiche entier ou pas du tout.
- **Résultat de la règle** : 108 relevés (trois fixtures × six largeurs × avec et sans aperçu), aucun écart de hauteur.
- **Réponse écrite du responsable, 2026-11-26** : « A, arcs contre l'identité » (question `20261126-2231-d` de la liste commune ; elle vaut accord sur la règle commune, y compris l'absence du motif à la tablette et à 1024 px).
- **Pose** : `LienDecor emplacement="entete-fiche" element="alliance-arcs"`, 106 px de large, 12 px après l'identité.
  - Au téléphone, une ligne d'identité en rangée (nom et e-mail, puis l'enveloppe).
  - Dès `sm`, `contents` rend ces deux enfants à la rangée de l'en-tête.
  - L'enveloppe porte `[container-type:inline-size]` ; le motif porte `hidden [@container(min-width:118px)]:block`.
- **Constat du banc E2E, corrigé** : la règle de conteneur passe après le `print:hidden` de la primitive dans la feuille de style, et l'emportait. Le motif restait imprimé. L'enveloppe porte donc son propre `print:hidden`. Le défaut de fond est dans `LienDecor` (problèmes ouverts).
- **Relecture `ui-ux-pro-max`**, en lecture seule : aucun écart.
  - `icon-context-accessibility` : décor `aria-hidden`.
  - Décalage de mise en page : taille fixe, espace libre seulement.
  - `mobile-first` : style de base au téléphone.
  - `contents` : sur un `div` sans rôle ; le `h1` garde le sien (connaissance générale, sans résultat de la base).

## Fichiers modifiés

- `web/src/components/FichePatientPanel.tsx` : pose du motif dans l'en-tête.
- `web/src/components/FichePatientPanel.test.tsx` : banc PRA-3a (pose après l'identité et avant les actions, `aria-hidden`, classes de la règle, un seul `h1`, aucun motif pendant le chargement).
- `web/e2e/fiche-entete-decor.spec.ts` (neuf) : réception du lot, Chromium et WebKit.
- `web/e2e/visual.spec.ts-snapshots/` : baselines de la fiche régénérées par le workflow `visual-baselines` (voir « Validations exécutées »).
- `changelog.d/2026-11-26-refonte-lien-pra3a-decor.md`, ce handoff.

## Validations exécutées

- Vitest `FichePatientPanel` (banc PRA-3a) : vert.
- T1 (`check:rapide`) : 0 ; T1 complet (`npm run check`) : 0.
- E2E `fiche-entete-decor.spec.ts` en local (`next dev`, base du worktree, fixtures) : 8 réussis, 6 sautés (cas réservés à l'autre projet), Chromium et WebKit.
  - Le banc mord : avant le correctif, le test d'impression rougissait sur les deux moteurs.
  - Sans la marge négative, la sonde mesurait l'en-tête à 100 px au lieu de 45,5 px à 768 px.
- T2 `--fast` à `32380ddf` plus le diff : vert en 12 min 48 s. Vitest 1 096 fichiers, 18 728 tests (62 sautés) ; E2E 495 réussis, 45 sautés, aucun rouge (Chromium et WebKit, build de production).
- Baselines visuelles : workflow `visual-baselines` sur la branche (run 45902732024, succès).
  - Cinq images changent : cockpit, tiroir des 12 besoins et onglet Trajectoire au bureau ; cockpit et onglet Trajectoire sur iPhone 13.
  - Comparaison pixel à pixel avec les baselines de `main` : l'écart tient dans la seule boîte des arcs (92 × 22 px, 231 à 241 pixels), à droite de l'identité. Chaque image a été relue sur cette zone, puis promue.
  - Les trois autres (tiroir sur iPhone 13, connexion du portail ×2) sont identiques au bit près et ne sont pas versées.

## Problèmes ouverts

- **`LienDecor` ne protège pas son `print:hidden`** : une classe d'affichage à variante passée par l'appelant (ici `[@container(...)]:block`) vient après dans la feuille de style et le défait. Contourné ici par l'enveloppe. À traiter dans la primitive par un micro-lot COM-n (fichier commun `components/ui/`), à router vers la session d'orchestration.
- Non vus : écran réel de tablette, lecteur d'écran réel, dossier au nom ou à l'e-mail très longs (le motif s'efface alors, par construction).
- Les fixtures n'ont pas d'assignation : le bouton « Voir ce que recevra le patient » a été simulé pour la mesure du prototype. Le spec E2E n'en dépend pas : il compare chaque largeur à son témoin.

## Prochaine action exacte

CI à 0 (`node scripts/wn-attendre-ci.mjs <N>` en tâche de fond), PR-Agent prouvé sur la tête (`node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer`, D-448), un verdict par commentaire en ligne. Puis « prête @<sha> » sur la PR, ligne au registre des messages, et numéro + sha à la session d'orchestration. Question `20261126-2231-d` : `pr` à renseigner.

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc).
- Aucun texte d'interface hors de D-488 ; aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Contrôles à l'écran en local, sur fixtures seulement. Aucune identité ni aucun identifiant de dossier réel au dépôt.
- Jamais de merge par la session ; D-518 : une branche avec un commit propre en retard sur `main` demande l'arbitrage du responsable avant toute fusion.
