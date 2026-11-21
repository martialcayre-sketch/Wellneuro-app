# Handoff — 2026-11-21 — Refonte Lien / Empreinte, PRA-6l : cibles restantes du praticien

## Branche et état du dépôt

- Branche `claude/refonte-lien-pra6l-cibles-fb0b3f`, worktree `.claude/worktrees/refonte-lien-pra6l-cibles-fb0b3f`, avancée par `--ff-only` jusqu'à `e2033a9f` (#2296) avant le commit.
- La session ne merge pas : l'intégrateur merge sur « prête @<sha> » (D-373, D-454).

## Objectif

Les restes de PRA-6d (#2237, handoff `2026-11-17-2330-refonte-lien-pra6d-pra6i-cibles-icones.md`, « Problèmes ouverts ») portés à 44 px, sur son patron. Lot ouvert par le responsable le 2026-11-21, en parallèle de PRA-6k (`SynthesePanel`) et PRA-6m (reflow à 195 px).

## Décisions prises

- **`AssignationsPacksPanel`** : `CLASSE_SELECT` reçoit `h-11`, comme les quatre `CLASSE_SELECT` de PRA-6d. Elle sert aussi des `<Select>` qui l'avaient déjà par la source ; sans effet sur eux.
- **`PacksPanel`** : `inputCls` sert des saisies (texte, date) et six listes natives ; `[&:is(select)]:h-11`, la forme des `CHAMP` de PRA-6d, plutôt qu'une seconde classe.
- **Alimentation** : `h-11` sur les cinq `<select>` (issue, friction, assiette, jalon, charge perçue).
- **Inbox du Fil** : le lot nommait « Ouvrir la fiche-trajectoire ». Les cinq autres gestes du même tiroir étaient aussi à `min-h-10` (40 px) : « Confirmer la lecture », « Retirer du raisonnement clinique », « Rétablir dans le raisonnement », « Confirmer le retrait », « Annuler ». Même fichier, même défaut, même classe : portés ensemble à `min-h-11`. Écart de périmètre assumé et déclaré dans la PR.
- **Preuve** : E2E `web/e2e/cibles-44px-pra6l.spec.ts`, boîte englobante ≥ 44 px (tolérance 0,5 px : WebKit rend 43,99999), Chromium et iPhone 13. Le tiroir de l'inbox est vide au seed : la lecture `GET /api/praticien/inbox-questionnaires` est servie par `page.route` sur PAT_SEED_01 (fixture), tout autre verbe est avorté — aucune écriture.
- **Captures de référence** : aucune ne montre ces contrôles (Bibliothèque capturée en `pixel: false`, ni Alimentation ni tiroir de l'inbox capturés). Pas de régénération.

## Fichiers modifiés

- `web/src/components/bibliotheque/AssignationsPacksPanel.tsx`, `web/src/components/PacksPanel.tsx`, `web/src/components/food-observation/PractitionerFoodObservationPanel.tsx`, `web/src/components/fil/InboxQuestionnaires.tsx`.
- `web/e2e/cibles-44px-pra6l.spec.ts` (nouveau).
- `changelog.d/2026-11-21-refonte-lien-pra6l-cibles.md`, ce handoff.

## Validations exécutées

- T1 complet (`npm run check`) : 0.
- T2 (`npm run test:worktree -- --fast`) : 0, sur `288e1b24` + le diff (l'avance à `e2033a9f`, corpus seul, est venue après). Vitest 18 412 passent, 62 ignorés ; E2E 439 passent, 37 ignorés ; les six cas du nouveau banc verts sur les deux projets.
- Le banc rougit sur l'ancien code : mesure isolée (Playwright, page de test), liste stylée à `min-height: 44px` seul = 22 px sous iPhone 13, 44 px avec `height`. Les boutons à `min-h-10` mesurent 40 px dans les deux moteurs.

## Problèmes ouverts (restes)

- Les deux listes de la modale d'édition d'un pack (`PacksPanel`) ne sont pas mesurées par l'E2E (il faudrait ouvrir l'édition d'un pack) : même `inputCls` que les quatre listes mesurées.
- Pas de passe à l'écran : la hauteur est prouvée par la mesure E2E, pas par une revue visuelle.

## Prochaine action exacte

Attendre le merge par l'intégrateur.

## Interdits encore actifs

- Ni route, ni garde, ni drapeau, ni schéma, ni règle clinique.
- Aucun texte d'interface hors D-488 ; identités de fixture seulement.
- Ne toucher ni `SynthesePanel`, ni `EnTeteRayon`, ni les titres de page (PRA-6k, PRA-6m).
- La session ne merge pas.
