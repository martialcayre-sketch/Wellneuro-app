# Handoff — 2026-11-25 — Refonte Lien / Empreinte, COM-1 : primitive commune du décor `LienDecor`

## Branche et état du dépôt

- Branche `claude/refonte-lien-com1-liendecor-b82e12`, worktree neuf
  `.claude/worktrees/refonte-lien-com1-liendecor-b82e12`, créé sur `origin/main` `30d2a0d1`
  fraîchement fetché, avancé par `--ff-only` à `8bb812f8` en cours de lot (branche sans
  commit propre ; `main` n'avait touché que des docs).
- Un commit de lot, une PR. La session ne merge pas : « prête @<sha> » à l'intégrateur.
  L'annonce dans les deux pages de suivi revient à la session d'orchestration.

## Objectif

Poser la primitive commune du décor ([[D-481]] §1 quater), micro-lot COM-1 rouvert par le
responsable le 2026-11-25 (« Rouvrir COM-1 ») après son report du 2026-11-12. Cahier :
`docs/claude/propositions/2026-11-11-refonte-lien-etape2/socle-commun.md`, « COM-1 ».
Aucun écran ne l'emploie dans ce lot.

## Décisions prises

- **Choix d'éléments non tranchés par D-481, posés au responsable le 2026-11-25** (réponses
  écrites dans la session COM-1) :
  - en-tête de fiche (P04) : « Les deux, choix au prototype » — `alliance-arcs` et
    `linked-loops-muted` acceptés ; le prototype PRA-3a, validé par le responsable, choisit
    avant toute pose ;
  - hub patient (U10) : « Oui, U10 hors COM-1 » — aucun élément nommé, un COM-n l'ajoutera
    quand le prototype PAT-3 révisé le nommera ;
  - états vides (X03) : « Oui, les deux » — `nutrition-sprout` et `neural-branches`.
- **Catalogue** (`LIEN_DECOR`) : `connexion-praticien` (fond `login-calm`),
  `entree-patient` (fond `screen-mobile` sous 768 px, `screen-desktop` dès `md`),
  `deux-voix` (`divider-two-voices`), `entete-fiche`, `etat-vide`. Aucun motif `patterns/` :
  D-481 n'en retient aucun. L'ornement neuf du §1 ter reste hors lot.
- **Rendu sans `<img>`** : `span` à `background-image`, donc rien dans l'arbre
  d'accessibilité, rien à glisser, pas de `next/image` ni de dérogation de lint.
  Fond : `absolute inset-0 -z-10`, le parent porte `relative isolate` et le contenu posé
  dessus est une carte opaque ; les SVG du kit laissent le centre libre. Ornement : dans le
  flux, aux proportions de son SVG (`aspect-ratio`), largeur fixée par l'appelant.
- **Socle** : `aria-hidden`, `pointer-events-none select-none print:hidden`, aucune classe
  de mouvement. `classesAdmises` retire des classes de l'appelant le mouvement
  (`animate-`, `transition`, `duration-`, `ease-`, `delay-`, `will-change-`, variantes
  `motion-safe:`/`motion-reduce:`), le pointeur, la sélection, l'empilement (`z-`) et les
  variantes `print:`. Le découpage ignore les `:` entre crochets : propriétés et variantes
  arbitraires (`[animation:…]`, `[pointer-events:auto]`, `[@media_print]:`) sont retirées
  aussi (constat PR-Agent sur la première tête, corrigé). Un fond n'accepte pas de classes.
- **Refus** : au typage (union discriminée, `@ts-expect-error` au banc) et à l'exécution
  (rend `null`, clé héritée comprise par `Object.hasOwn`).
- **Garde du §1 quater** (`LienDecor.guard.test.ts`, à part : un banc qui balaie une
  arborescence est un `guard`, parité de `scripts/wn-controle-fusion.test.mjs`, rouge au
  premier CI) : aucun fichier de `web/src` ne cite
  `wellneuro-lien/(backgrounds|ornaments|patterns)/` hors de la primitive ; prouvée rouge sur
  sources fabriquées. La marque (`brand/`) n'est pas visée.

## Fichiers modifiés

- `web/src/components/ui/LienDecor.tsx` (neuf) ;
- `web/src/components/ui/LienDecor.test.tsx` et `LienDecor.guard.test.ts` (neufs) ;
- `changelog.d/2026-11-25-refonte-lien-com1-liendecor.md`, ce handoff.

Aucun fichier de COM-0, aucun écran, aucun texte d'interface.

## Validations exécutées

- Banc et garde : 37 tests verts ; il a d'abord attrapé un vrai défaut (une clé
  héritée, `toString`, passait pour un emplacement), corrigé par `Object.hasOwn`.
- `tsc --noEmit` vert (les cinq `@ts-expect-error` sont tous effectivement en erreur) ;
  `next lint` sans avertissement sur les deux fichiers.
- Les huit SVG servis relus : statiques, sans texte, sans ressource externe.
- T1 complet (`npm run check`) : code 0 (`test:changed` a joué le banc, 37 tests).
- T2 `--fast` : code 0, Vitest 18 598 verts, E2E 471 verts, en 12 min 53 s.
- Pas de constat à l'écran : aucun écran n'emploie la primitive.

## Problèmes ouverts

- La pose dans les écrans attend les lots nommés : connexion `login-calm` (PRA-2), fond de
  l'entrée (PAT-2), séparateur des deux voix et vides réels (PAT-5, PAT-6, PRA-3b), motif
  d'alliance de l'en-tête de fiche (PRA-3a, après une planche de prototype validée),
  en-tête de U10 (PAT-3b, après le prototype PAT-3 révisé, puis un COM-n pour l'élément).
- Le seuil 768 px de l'entrée patient suit le point `md` de l'application ; la planche
  PAT-2 le confirmera ou le corrigera.

## Prochaine action exacte

Après le merge : les sessions PRA et PAT emploient `LienDecor` dans leurs lots de pose ;
chaque emplacement figure d'abord dans le prototype de sa famille ([[D-481]] §4).

## Interdits encore actifs

- Un lot ne pose un décor que par `LienDecor` (§1 quater, gardé par le banc).
- Aucun texte d'interface sans acceptation mot pour mot ; aucun chiffre côté patient
  ([[D-333]]).
- Aucun drapeau, aucune modification clinique, de route, de garde ni de schéma.
- Production en lecture seule. Aucune identité ni aucun identifiant de dossier au dépôt.
