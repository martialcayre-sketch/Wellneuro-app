# Handoff — 2026-08-04 — Persistance de l'agenda alimentaire (L3)

## Git

- Worktree `.claude/worktrees/agenda-ali-l3`, branche `worktree-agenda-ali-l3`,
  partie de `main` à `059fcaaa` (après #555). PR à ouvrir.
- Hors campagne, sans entrée `.wn/state.json` : deuxième lot d'une série sur
  l'agenda alimentaire, après L1-bis (PR #554).
- **Lot à MIGRATION** : `schema.prisma` + `prisma/migrations/`, plus l'effacement
  RGPD. Aucune auth, aucune route, aucun changement du score servi.

## Où en est la série

L1-bis a rendu `Q_ALI_09` assignable et non scoré, drapeau `WN_AGENDA_ALI` éteint.
L3 le rend **persistable**. Il ne livre ni saisie (L4) ni barème (L2) : l'ordre
décidé avec le praticien est **collecte d'abord, calibrage ensuite** — aucune
journée n'a jamais été recueillie, donc les cinq axes, leurs poids et la borne des
18 h n'ont aucune distribution réelle sur quoi s'appuyer.

## Les décisions qui ferment des options

**L'abstention, et son asymétrie.** Les quatre présences obligatoires acceptent
`null` — « je ne sais pas » —, distinct de la clé absente. Sans ce troisième état,
un patient ignorant le contenu d'une journée devait répondre au hasard ou **sauter
la journée entière**, perdant aussi ses horaires, qui sont la mesure principale.
**`soirPlusCopieux` ne l'accepte pas** (arbitrage praticien du 2026-08-04) :
facultatif, il n'alimente qu'un drapeau. Fait maintenant parce qu'aucune ligne
n'existe ; après le premier patient, cela coûtait un contrat v2 et une fenêtre de
recueil incomparable à elle-même.

**`null !== undefined` est vrai en JS — et il y avait CINQ prédicats, pas un.**
Le plan initial en nommait un seul. Un prédicat de couverture laissé en
`!== undefined` aurait compté la journée comme connue, puis le filtre `=== true`
l'aurait lue comme un « non » : un dénominateur divergeant de ses voisins, en
silence. Tous passent à `typeof … === 'boolean'`. La différence de contrat vit
dans le **type** et le **validateur**, jamais dans les prédicats.

**Quarantaine par ligne à la lecture.** Une première version faisait
`rows.map(toJourRow)` : une ligne illisible faisait disparaître **tout** l'agenda
du patient — exactement le mode de panne que `jour.ts` refuse en toutes lettres.
`listJours` rend désormais `{ jours, illisibles }` ; le compte remonte au lieu
d'être avalé, sans quoi un lot tronqué pourrait franchir les seuils
d'exploitabilité en ayant perdu des journées.

**Aucune contrainte unique** sur `(id_assignation, date_jour)`, délibérément :
`count(lignes) − count(distinct date_jour)` est le taux de correction, et avec
`soumisLe` la courbe d'abandon se lit en SQL, sans nouvelle migration.

**Trois écarts assumés au patron sommeil** : `persistence.ts` ne réexporte rien
(l'alimentaire a un `index.ts` pur — réexporter ferait entrer Prisma dans un
import client) ; la version de contrat est vérifiée en lecture (côté sommeil la
liste des versions lues n'est consultée nulle part, la constante y est
décorative) ; `canal` est honoré contre une liste fermée plutôt que forcé en dur.

## Validations

`npm run check` vert dans les **deux** positions de `WN_AGENDA_ALI`. **T3 complet
vert en 2 min 6 s** : PostgreSQL éphémère, `prisma migrate deploy` — le SQL manuel
réellement exécuté —, **drift check `migrate diff --exit-code`**, contrats SQL,
seed, 108 E2E.

**Cinq mutations vérifiées**, chacune tue un test : un prédicat remis en
`!== undefined` (2), la ligne d'effacement retirée (1), l'entrée de la liste de
mocks retirée (8), la ligne d'effacement **déplacée** (1), et au lot précédent le
drapeau en fail-open. Un garde vert qui n'a pas mordu ne prouve rien.

## Ce que la revue adversariale a corrigé

- **Condition de merge** — la position de la ligne d'effacement n'était gardée par
  rien : le garde structurel est un `String.includes`, aveugle au **déplacement**.
  Or c'est le déplacement qui casse — `effacerDossier` lèverait sur la FK RESTRICT
  et l'effacement RGPD deviendrait impossible pour tout dossier portant une
  journée. Mes quatre mutations testaient le retrait, jamais le déplacement. Test
  d'ordre ajouté, morsure vérifiée.
- **Contradiction interne** — le rejet de collection décrit plus haut.
- Un test dont le nom promettait plus que son assertion (lot d'une seule ligne :
  rejeter la ligne et rejeter la collection y sont indiscernables), et l'absence
  de banc direct pour `contrat.ts`. Les deux comblés.

## Problèmes ouverts

- **Aucun aller-retour contre une vraie base.** `persistence.test.ts` mocke Prisma
  intégralement, et aucune route n'existe. La thèse « l'abstention survit en
  base » n'est donc attestée que par un `vi.fn()` — or c'est précisément là que
  `as unknown as object` efface la garantie de type. Le véhicule idiomatique du
  dépôt est `prisma/checks/*.sql`, rejoué par le CI et par T3 ; **à poser avant
  L4**.
- **`null` ne se défend pas contre `if (x)`, `!x`, `Boolean(x)`** : TypeScript
  accepte ces tests sur `boolean | null` et ils lisent l'abstention comme un
  « non ». Aucun consommateur hors du domaine aujourd'hui ; l'écran de saisie L4
  est exactement le lieu où ce raccourci s'écrira. Un prédicat exporté
  (`estObserve(v): v is boolean`) rendrait la règle réutilisable.
- **`soirPlusCopieux` rejette `null` en silence**, sans erreur : un écran L4
  offrant trois états sur les cinq champs perdrait celui-ci sans signal.
- **RLS sans `REVOKE` nominatif** : conforme au patron sommeil et suffisant (RLS
  active sans policy bloque `anon`/`authenticated` sous PostgREST), mais en
  retrait du patron `c5_ciqual` qui révoque nominativement. À vérifier après merge
  sur des faits : `relrowsecurity` et `has_table_privilege('anon', …, 'SELECT')`.
- **`normaliserQids`** (`api/praticien/packs`) filtre sur le catalogue de scoring
  et non sur `IDS_SUSPENDUS` — défaut antérieur, hors périmètre.
- Le cycle protocole→épisode reste à **zéro ligne en base**. Gate HDS
  `G-TRUST-04`, échéance 2026-10-21.
- **Reporté** — campagne `2026-08-03-packs…` : LOT-07, et surtout la **signature
  clinique des six règles du LOT-05**, sans laquelle le LOT-06 livré n'affiche
  rien (`validationExterne: false` ⟹ production fermée).

## Prochaine action exacte

Ouvrir la PR, lire `verify`, merger. **Puis vérifier la base** par `execute_sql`
(agréger `_prisma_migrations` **par nom** — un nom porte plusieurs lignes).

Ensuite **L4** : `portail.ts` (authorize dédié, patron `agenda-sommeil/portail.ts`),
routes GET/POST `/api/portail/agenda-alimentaire`, aiguillage dans
`portail/[token]/questionnaires/[idAssignation]/page.tsx`, et la surface de saisie
— cible < 30 s/jour, rien de pré-coché. **La route devra dériver `idPatient` et
`idAssignation` de la SESSION, jamais du corps de requête** : sinon une journée
s'écrit dans le dossier A en pointant l'assignation de B, et l'effacement de B
devient impossible (FK RESTRICT). `saveJour` ne le vérifie pas, comme son jumeau
sommeil, parce que c'est la route qui le garantit.

## Interdits encore actifs

- **Frontière JA** — aucune quantité, aucun gramme, aucune kcal, aucune projection
  vers `Q_ALI_01`/`Q_ALI_02`. Sur les aliments, la formule exacte du contrat fait
  foi : « aucun aliment identifié **au-delà des présences ci-dessus** ».
- **Ne pas toucher** `BESOIN_SOURCES` ni `VERSION_SCORE_EQUILIBRE` ; **aucun
  barème, aucun indice /100** avant d'avoir vu des données réelles. La discordance
  déclaré/observé reste un objet séparé, et elle suppose la forme SIIN 57 servie —
  sous forme courte `MAX_RYTHME_CHRONO` vaut 0 et l'écart devra rendre `null`,
  jamais 0.
- **Ne pas allumer `WN_AGENDA_ALI`** avant L4 : le patient verrait un écran sans
  question.
- **IDP2** — toute table fille de `patients` entre dans la transaction
  d'effacement, **avant** les assignations. Le garde structurel n'attrape que le
  retrait, pas le déplacement : c'est le test d'ordre qui tient la position.
- **Aucune contrainte unique** sur `(id_assignation, date_jour)`.
