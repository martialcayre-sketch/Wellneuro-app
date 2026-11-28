# Handoff — 2026-11-28 — Refonte Lien / Empreinte, PRA-2 décor : germe sur les états vides réels du portail praticien

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra2-decor-etats-vides-94c64e`, worktree `.claude/worktrees/refonte-lien-pra2-decor-etats-vides-94c64e`, créé sur `origin/main` `dc626fe3`, fraîchement récupéré. Aucun commit propre avant celui du lot.
- `npm ci` et `npx prisma generate` ont été joués avant tout test. La base locale du worktree vient de `scripts/wn-dev-db.sh --migrate --seed` (fixtures seules).
- Une PR. La session ne merge pas : elle déclare « prête @<sha> » à l'intégrateur (D-373, D-454, D-546).

## Objectif

Lot PRA-2 décor, états vides, de la refonte Lien côté praticien. Il pose le « petit ornement sur un état vide réel seulement » (`plan-praticien.md`, § PRA-2 ; [[D-481]] §1 bis et §1 quater), par `LienDecor`. Le lot suit la connexion (#2395), PRA-3a (#2385) et PRA-3b (#2406).

## Décisions prises

- **Ni DOC-n ni COM-n.** `LienDecor` admet déjà `etat-vide` avec `nutrition-sprout` et `neural-branches`. Aucun ornement hors du kit n'a été demandé, et `components/ui/` n'est pas touché.
- **Inventaire**, en lecture seule. Six vides réels au corps des écrans, chacun distinct de son échec de lecture :
  - Fil du jour : `FilDuJour.tsx`, Fil sans carte ni trace lue, sans alerte de calcul ;
  - Patients : `RayonPatientsPanel.tsx`, tableau lu sans ligne. La même phrase sert à la recherche sans résultat ;
  - Agenda : `AgendaPraticien.tsx` ;
  - Fiches-trajectoires : `TrajectoiresPanel.tsx` ;
  - Comptes du cabinet : `ComptesCabinetPanel.tsx` ;
  - Confiance & droits : `TrustPanel.tsx`.

  Les rails du Fil replient leur vide dans un `<details>` fermé. Paramètres et Correspondance n'ont pas de vide propre. Le portail praticien n'a pas de mode sombre.
- **Prototype** ([[D-481]] §4), artefact Design System privé : https://claude.ai/artifact/1M6gvfyJebfWGDZTKHenzD (version 2).
  - Captures du code réel en local, sur les fixtures. Les vides viennent de la réponse de l'API locale vidée ; chaque variante est injectée par une sonde jamais versée.
  - Variante A : germe de 160 px, centré. Variante B : `neural-branches` de 128 px. Variante C : germe de 120 px à gauche.
  - Chaque variante est capturée au bureau, au téléphone, à 195 px et à l'impression.
- **Réponse écrite du responsable, 2026-11-28, dans la session de lot** (liste commune `20261128-0838-d`, répondue) :
  - **Q1 A** : germe `nutrition-sprout`, 160 px, centré au-dessus de la phrase, 12 px avant ;
  - **Q2** : les six vides du corps ;
  - **Q3** : captures téléversées dans l'artefact. Le premier essai avait été refusé par le classifieur du mode auto, le second a été fait après la réponse.
- **Pose** : `<LienDecor emplacement="etat-vide" element="nutrition-sprout" className="mx-auto mb-3 w-40 max-w-full" />`.
  - Patients : dans la cellule, sous la condition `!rechercheTable`, c'est-à-dire la recherche qui a produit le tableau affiché, et non la saisie en cours. C'est le correctif du constat PR-Agent sur `c8e2acef` : avec `!search.trim()`, effacer une recherche sans résultat aurait montré le germe sur ce résultat jusqu'à la relecture.
  - Agenda : la phrase passe dans un `div` avec le germe. Son texte ne change pas.
  - Aucun texte neuf, aucune classe d'affichage passée à la primitive.
- **Non ornés** :
  - les erreurs et les chargements ;
  - la recherche sans résultat (Patients, fiches-trajectoires) ;
  - le Fil sous une alerte de calcul, ou avec une trace lue (« Rien n'appelle plus… ») ;
  - les rails du Fil ;
  - les listes pleines.
- **Relecture `ui-ux-pro-max`** (lecture seule) : aucun écart. Le germe est `aria-hidden` à côté d'une phrase visible. La place est réservée par `aspect-ratio`. Aucun défilement horizontal à 195 px.

## Fichiers modifiés

- Composants, pose du germe : `web/src/components/fil/FilDuJour.tsx`, `dossier/RayonPatientsPanel.tsx`, `agenda/AgendaPraticien.tsx`, `trajectoires/TrajectoiresPanel.tsx`, `cabinet/ComptesCabinetPanel.tsx`, `TrustPanel.tsx`.
- Bancs Vitest des six composants. Chacun vérifie la pose sur le vide et l'absence sur l'échec et sur la liste pleine. S'y ajoutent, pour Patients et les fiches-trajectoires, l'absence sur la recherche sans résultat, et pour le Fil, l'absence sous une alerte et avec une trace lue.
- `web/e2e/praticien-etats-vides-decor.spec.ts` (neuf). Réception écran par écran, Chromium bureau et iPhone 13 WebKit :
  - un germe hors de l'accessibilité, au-dessus de la phrase et dans sa zone ;
  - absent à l'impression ;
  - à 195 px, ni défilement ni débordement ;
  - aucun germe sur l'échec ni sur la liste pleine.
- `changelog.d/2026-11-28-refonte-lien-pra2-decor-etats-vides.md`, ce handoff.

## Validations exécutées

- T1 (`check:rapide`) : 0 après les poses.
- Vitest des six composants et de `LienDecor` (garde comprise) : 8 fichiers, 208 tests passés.
- E2E `praticien-etats-vides-decor.spec.ts` en local (`next dev`, base du worktree) : 24 passés (Chromium bureau, WebKit iPhone 13). Un premier passage avait rougi 10 tests sur une mesure fausse du banc (boîte de l'élément au lieu du nœud texte), corrigée avant le vert.
- Constat local du code réel, sur les six écrans au bureau et à l'iPhone 13 : un germe centré au-dessus de la phrase. Le compteur « 3 patient(s) » de la capture de Patients vient de la sonde, qui ne vidait que le tableau.
- T1 complet (`npm run check`) : 0.
- Après le correctif PR-Agent (Patients) : Vitest de `RayonPatientsPanel` 66 passés, banc de régression compris ; E2E Patients 4 passés ; T1 et T1 complet : 0.
- T2 (`npm run test:worktree -- --fast`) : son résultat est dans la déclaration « prête ».

## Problèmes ouverts

- Non vus : téléphone réel, lecteur d'écran réel. WebKit n'a été vu que par l'E2E.
- Hors lot, relevés à l'inventaire et non traités :
  - les échecs des fiches-trajectoires, des Comptes du cabinet et de Confiance & droits n'ont pas de « Réessayer » ;
  - le Fil indisponible ne porte pas `role="alert"` ;
  - le formulaire de l'Agenda n'a pas de vide quand il n'y a aucun patient.
- `portail-rail-lateral.spec.ts:208` reste instable en local (vert au CI), routé à la file A.

## Prochaine action exacte

1. CI à 0 : `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond.
2. PR-Agent prouvé sur la tête : `node scripts/wn-revue-pr-agent.mjs <N>` → 0, sinon `wn-reviewer` (D-448). Un verdict par commentaire.
3. « prête @<sha> » sur la PR, ligne au registre des messages, `pr` dans la question `20261128-0838-d`.
4. Numéro et sha à la session d'orchestration.

## Interdits encore actifs

- Un décor ne passe que par `LienDecor` ([[D-481]] §1 quater, gardé par le banc). Un ornement hors du kit est un COM-n distinct.
- Aucun texte d'interface sans acceptation mot pour mot ni DOC-n. Aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Contrôles à l'écran en local, sur fixtures seulement. Aucune identité ni aucun identifiant de dossier réel au dépôt. Production en lecture seule.
- La session ne merge jamais. D-518 : une branche avec un commit propre en retard sur `main` demande l'arbitrage du responsable avant toute fusion.
