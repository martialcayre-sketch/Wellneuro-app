---
id: "LOT-01"
titre: "Parcours E2E orientation → file d'envoi → envoi → déduplication"
statut: "livré"
dépend_de: "aucun"
---

# LOT-01 — Le parcours qui remplace les packs n'a aucune preuve E2E

## But

**Poser une preuve E2E du parcours orientation → file d'envoi → envoi →
déduplication**, aujourd'hui inexistante. À la fin de ce lot, un spec Playwright
enchaîne les quatre maillons sur patient fictif, chacun prouvé rouge par
mutation, vert en CI sur les deux projets — et le fait 2 de
`../../2026-08-06-packs-personnalises/CAMPAGNE.md`, qui porte aujourd'hui la
mention « aucune preuve E2E », peut être amendé.

## Diagnostic

La campagne `2026-08-06-packs-personnalises` a remplacé l'assignation de packs
figés par l'ajout à la file d'envoi depuis le panneau d'orientation. Ce parcours
est **le** chemin nominal du praticien depuis le 2026-08-07, et sa couverture E2E
est **zéro**.

Constat du cadrage du 2026-08-07 :

- `grep -rn orientation web/e2e/` ne rend **rien**.
- `web/e2e/dashboard-praticien.spec.ts:60-88` ne vérifie que le **titre** de la
  colonne file d'envoi ; le commentaire `:86` accepte explicitement l'état vide
  (« état vide accepté sur base éphémère »), et `:87` est l'assertion qui n'exige
  que la visibilité du titre — le test passe donc sans qu'aucune ligne n'ait
  jamais été ajoutée.
- `OrientationPanel` est bien **monté** par `TrajectoirePanel.tsx:255`, donc rendu
  quand `fiche-trajectoire.spec.ts:53` ouvre l'onglet — mais **aucune assertion
  ne le touche**, et le bouton « Ajouter à la file d'envoi »
  (`OrientationPanel.tsx:345`) n'est **jamais cliqué**.

Le LOT-04 de la campagne précédente a donc pu vérifier le fait 2 sur des bancs
unitaires seulement, et l'a écrit comme tel.

## Résultat observable

Un spec E2E qui, sur un patient fictif, enchaîne : ouvrir le panneau
d'orientation → cliquer « Ajouter à la file d'envoi » sur une recommandation →
constater la ligne dans la colonne file d'envoi → déclencher l'envoi → constater
l'assignation créée → rejouer l'ajout du même qid et constater la
**déduplication**, pas un doublon.

Le test échoue si l'un des quatre maillons casse — vérifié par mutation, pas
supposé.

## Périmètre

- `web/e2e/` : un spec dédié au parcours, ou une extension nommée d'un spec
  existant.
- Fixtures : patient fictif seul, réinitialisé par le harnais E2E existant.
- Neutralisation de l'envoi de mail (le parcours va jusqu'à
  `POST /api/praticien/file-envoi/envoyer`).

## Hors périmètre

- Toute modification de `OrientationPanel`, des routes `file-envoi` ou du moteur
  d'orientation : ce lot **observe**, il ne change pas le produit. Un défaut
  découvert ici devient un lot nommé.
- Les **cinq** dettes de packs laissées sans lot d'accueil : (a) `prisma/seed.ts`
  ne répare pas un pack de base cassé (`upsert` no-op au message de succès faux),
  (b) `resolvePackQuestionnaireIds` ne lit jamais `questionnaire_packs.actif`,
  (c) aucun écran ne réactive un pack, (d) le commentaire de
  `web/prisma/schema.prisma:155-156` cite encore le pack en **capitales**, (e) la
  suture `suggestedPackSelection` reste morte en place.
- Toute migration.

## Fichiers probables

- `web/e2e/` (spec nouveau ; `dashboard-praticien.spec.ts` et
  `fiche-trajectoire.spec.ts` en lecture, pour les sélecteurs et l'ouverture
  d'onglet)
- `web/e2e/README.md` si le harnais gagne une variable de neutralisation

## Interdits

- **Aucun patient réel** : Sophie Nicola, Jennifer Martin, Michel Dogné
  uniquement.
- **Aucun envoi de mail réel** : le point de neutralisation est posé avant
  d'exécuter le spec, pas après.
- **E2E exclusifs au Mac** : jamais depuis le PC, et **jamais deux runs en
  parallèle** — les fixtures sont partagées via `DATABASE_URL`, et deux passes
  simultanées s'effacent mutuellement leurs données en produisant des échecs
  erratiques (`docs/ROLES_MACHINES.md`). Tant qu'une autre session travaille,
  **seul le CI rend un verdict**.
- Pas de secret ; pas de migration ; pas de refactor hors lot.

## Étapes

- [ ] Confirmer que le constat de couverture ci-dessus tient toujours
      (`grep -rn orientation web/e2e/`).
- [ ] Choisir et poser le point de neutralisation du mail.
- [ ] Écrire le spec, maillon par maillon.
- [ ] Mutation : casser chaque maillon à tour de rôle et vérifier que le spec
      rougit à chaque fois ; restaurer après chacune.
- [ ] T3 complet, sortie redirigée puis relue.

## Tests

- T3 (`npm run test:worktree`) — E2E inclus ; une suite Vitest verte ne prouve
  rien sur les parcours.
- Quatre mutations au minimum : le bouton d'ajout, la persistance en file,
  l'envoi, la déduplication.

## Critères de done

- Le spec est vert en CI, sur les deux projets Playwright.
- Chaque maillon est prouvé rouge par mutation.
- Le fait 2 de `../../2026-08-06-packs-personnalises/CAMPAGNE.md` peut être relu
  avec une preuve E2E, et sa mention « aucune preuve E2E » est amendée en
  conséquence.

## Résultats

**Livré le 2026-08-07** — `web/e2e/orientation-file-envoi.spec.ts`, un test
enchaînant six étapes sur Sophie Nicola (`PAT_SEED_01`), vert en T3 sur les deux
projets Playwright. Sept mutations, chacune restaurée, **précédées d'une passe de
référence verte** — sans elle, un harnais cassé aurait rendu tout rouge et
« prouvé » les sept maillons d'un coup :

| Mutation | Assertion rougie |
|---|---|
| `orientationActive()` → `false` | `:76` la recommandation existe |
| `onClick` du bouton d'ajout neutralisé | `:82` la bascule « déjà dans la file » |
| brouillon créé avec `qids: []` | `:82` (même assertion) |
| titre d'instrument retiré du rendu de la colonne | `:96` la ligne porte le titre |
| `assignation.create` sauté | `:115` l'assignation est ouverte |
| le brouillon reste `brouillon` au lieu de `parti` | `:142` la file ne le sert plus |
| `dejaAssigne` forcé à `false` | `:155` `MESSAGE_DEJA_ASSIGNE` |

### Trois faits que ce lot a établis, et qui coûtaient cher à redécouvrir

1. **Le parcours était injouable en E2E, pour deux raisons indépendantes.**
   `WN_ENABLE_ORIENTATION_NNPP2` n'était posé nulle part côté dépôt (la route
   répondait `actif: false`), et le seed ne déclenche aucune règle :
   `scoresPourOrientation` **ignore le `scoresJson` stocké** et recalcule depuis
   `rawAnswers`, qu'aucune des 14 réponses seedées ne porte. Armer le drapeau
   sans provisionner une réponse — ou l'inverse — ne rend toujours rien.
2. **Sur la colonne file d'envoi, aucune assertion d'écran ne peut prouver une
   absence.** `brouillons` part de `[]` : l'état vide s'affiche **pendant le
   chargement**. `toHaveCount(0)` sur les lignes ET le message « La file est
   vide » ont tous deux laissé la mutation VERTE. Le maillon se lit au GET.
3. **Le spec exige la base éphémère seedée.** Contre la base de dev partagée, le
   panneau rend sa recommandation et son bouton, puis l'ajout échoue sur
   « Patient introuvable » — le POST filtre sur l'appartenance praticien.

### Ce que ce spec ne prouve pas

L'envoi du **mail** (`SMTP_URL` vide sur le banc, `sendFileEnvoiEmail` journalise
`Non_envoye`), le refus serveur 409 `deja_assigne`, le cas d'une cible **pack**,
le cas d'un patient sans email, et le nombre d'objets envoyés (`count` n'est pas
asserté). Une règle (`R-STR-01`) vers une cible (`Q_STR_05`), pas la table.
