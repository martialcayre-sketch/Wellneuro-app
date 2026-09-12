# Handoff — 2026-09-12 — Bristol saisissable, et deux impasses du portail levées

## Branche et état Git

Branche `cloture/session-2026-09-12-bristol`, partie d'`origin/main` à
`df1e1152`. **Aucune PR ouverte** hors celle-ci.

Trois PR mergées dans cette session, chacune sur sa propre branche partie
d'`origin/main`, worktrees et branches supprimés après merge :

| PR | Commit sur `main` | Objet |
|---|---|---|
| #1033 | `42685f34` | L'échelle de Bristol offre enfin ses sept types à cocher |
| #1041 | `e26dc0c1` | Un recueil alimentaire clos quitte « À compléter » |
| #1043 | `d6bc86a0` | Le questionnaire échu, jamais rempli, retrouve un geste |

Aucune migration, aucun `schema.prisma`. **`origin` ne porte que `main`.**

## Objectif de la session

Un signalement d'usage : « le questionnaire de Bristol ne peut pas être saisi ».
Les deux lots suivants sont nés de ce que la lecture de la production a montré
en cherchant les suites du premier — ils n'étaient pas au programme.

## Décisions prises

- **Bristol : le correctif est dans le rendu, rien en aval ne bougeait.** L'item
  `BR1` porte `type: 'bristol'`, que `QuestionField` ne connaissait pas ; un type
  inconnu n'y lève AUCUNE erreur, il rend la légende seule. Le moteur `bristol`,
  `reponsesLisibles` et la route de soumission lisent la valeur et les options,
  jamais le type : ils attendaient un `1`-`7` que l'écran ne pouvait pas produire.
- **Le garde ne liste pas les types** : il rend les 1 154 items du catalogue
  servi et refuse celui qui ne produit aucun contrôle de formulaire. `BR1` en
  était le seul.
- **Le recueil alimentaire clos QUITTE « À compléter »** (arbitrage du
  responsable en séance) pour un groupe propre, `recueil_termine`. Ni `transmis`
  — rien n'est parti chez le praticien — ni `expire`, qui dit une date limite
  dépassée. La condition porte sur `rappel.cta === null` et non sur l'état seul :
  le jour où la clôture alimentaire existera, l'item reviendra de lui-même.
- **Le déblocage d'un questionnaire échu passe par l'écran, pas par la base.**
  L'API existait, l'écran ne l'offrait qu'aux demandes de correction. Filtre
  **en base** (`date_limite < aujourd'hui`, avec `not: null`), jamais après la
  troncature à 40 lignes — troisième fois que cette route corrige ce défaut.
- **L'échéance ne se recalcule JAMAIS côté client.** `isDeadlineExpired`
  construit une date sans fuseau : dans un navigateur elle se lit à l'heure du
  navigateur. C'est le serveur qui juge, et `assignationsMeta.echeanceDepassee`
  le dit. Écho absent ⟹ l'écran n'affiche rien et le signale.

## Ce qui a été refusé, et pourquoi

**Écrire en base pour débloquer PAT017.** Le responsable a autorisé le
déverrouillage ; `D-087` n'autorise l'écriture en production que par migration
relue puis release-db approuvée. L'autorisation portait sur le RÉSULTAT, pas sur
un contournement de cette règle — et un chemin propre existait. C'est ce refus
qui a fait apparaître l'angle mort, puis le lot #1043.

## Fichiers modifiés

`QuestionField.tsx`, `questionnaire-types.ts`, `portail/hubQuestionnaires.ts`,
`api/praticien/patients/route.ts`, `FichePatientPanel.tsx`, `patient-access.ts`.
Gardes : `QuestionField.saisissable.guard.test.tsx` (neuf, entré dans
`test:court14` sur exigence de `specs-drapeau-ali01`),
`patient-access.guard.test.ts` (neuf), plus les trois bancs existants touchés.

## Validations exécutées

T1 `npm run check` et T2 `npm run test:worktree -- --fast` **verts sur les trois
lots**. Dernier passage : 8 855 unitaires, 196 E2E, 3 min 14 s. Les baselines
visuelles ne bougent pas — le seed ne pose aucun agenda alimentaire.

**Quatre mutations jouées, quatre mutants tués**, dont un qui a d'abord SURVÉCU :
le stub « serveur sans écho » n'échoait aucune clé, si bien que le contrôle
passait par le mauvais chemin. Corrigé, il tombe.

## Lu en production (one-off `scalingo run -d`, jamais d'écriture)

- `Q_GAS_03` : **8 assignations, 8 patients, 0 passation** — impassable depuis
  son ajout, du 2026-07-24 au 2026-09-07. Aucune donnée à réparer.
- Bristol **vérifié après déploiement** : `REP_69zvlHb8OkBmU4r9q1heMH6G`,
  `BR1 = 2`, « Constipation », `VALID`.
- Agendas alimentaires : 5 ouverts, 2 à fenêtre close (PAT006, PAT019), **les
  deux ont d'autres tâches** — la conséquence latente ci-dessous ne touche
  personne aujourd'hui.
- Assignations jamais remplies à échéance dépassée : **une seule dans toute la
  base**, PAT017 / `Q_GAS_03`, échéance au 2026-08-01.

## Problèmes ouverts

1. **PAT017 reste bloqué.** Une fois #1043 déployée, le bouton existe dans sa
   fiche. Avant cela, seul un `PATCH /api/praticien/assignations` depuis une
   session praticien authentifiée le débloque.
2. **Conséquence latente de #1041** : `questionnairesTransmis` devient vrai dès
   que plus rien n'est « à compléter ». Un patient dont le SEUL reste serait un
   recueil clos verrait la frise avancer à « Vos éléments ont été transmis »,
   d'un recueil qui ne l'a pas été. Personne n'est dans ce cas — mesuré, pas
   supposé. À trancher par le lot de la clôture alimentaire.
3. **La clôture alimentaire est le vrai manque** derrière deux de ces trois
   lots : sans route de transmission, un recueil de 21 jours ne part jamais chez
   le praticien. Les trois contournent ce trou, aucun ne le comble.
4. **Un merge peut ne déclencher AUCUN déploiement.** #1033 mergée à 09:13:12
   pendant le build de #1032 : webhook perdu, pas mis en file, alors que
   `Automatic deployment: ✔, main`. Constater par contenance, jamais par l'écho
   de l'auto-deploy.

## Prochaine action exacte

Déployer `main` — `e26dc0c1` et `d6bc86a0` ne sont pas encore servis. Le
responsable a choisi d'attendre le prochain merge plutôt que de relancer.
Constater ensuite par contenance, puis débloquer PAT017 d'un clic.

## Interdits encore actifs

- Production : lecture par one-off détaché uniquement ; écriture par migration
  relue puis release-db approuvée (`D-087`). Le déploiement se **demande**.
- `git checkout --` ne défait JAMAIS une mutation : sauvegarder par `cp`,
  vérifier que la mutation s'est appliquée, restaurer par `cp`.
- Fichiers CRLF (`patient-access.ts`, `patients/route.ts`) : éditer avec
  `newline=''` ET des motifs en `\r\n`, sinon le fichier devient mixte.
