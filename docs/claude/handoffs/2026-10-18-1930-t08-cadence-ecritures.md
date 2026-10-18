# Handoff — t08 : cadence des écritures par dossier (D-326)

## Branche et état Git

- Branche `t08-cadence-ecritures`, partie de `origin/main` 77aff719, main
  74cdfd82 fusionnée. Worktree `d281-lot3-portail`. PR à ouvrir. #1557
  (repli localhost) et #1559 (t16) sont ouvertes en parallèle : conflit
  attendu sur `SESSION_LOG.md` et le plan, à résoudre en gardant les deux
  côtés.

## Objectif

Dette du plan « Aucune cadence (limite de débit) sur les routes portail
authentifiées ni sur les routes praticien des objectifs » (t08), selon les
arbitrages du 2026-10-18 : écritures seules, sans migration, plafonds larges
par famille, texte « envois nombreux ». Clôt aussi la ligne t09 (journal
d'accès), close sans code le même jour.

## Décisions prises

- [[D-326]] : compter en base, avant d'écrire, les lignes du dossier sur
  l'heure glissante (patron de la redemande du lien magique) ; 429
  `reason: 'cadence'`. Plafonds : agendas 60, portail 20, objectifs
  praticien 30, proposition IA 10.
- `portail/dossier` : un plafond pour ses quatre gestes (quatre tables,
  seule cette route y écrit), compté avant la lecture du corps.
- Objectifs praticien : un plafond pour `objectifs`, `/accord`, `/fin`
  (`lib/praticien/cadenceObjectifs.ts`).
- `trust/choix` : compté sous le verrou de ligne déjà pris ; **le retrait
  n'est jamais plafonné**.
- `trust/signalement` **hors plafond** (signal de sécurité, demande de droit) —
  choix de l'assistant, à confirmer (voir Problèmes ouverts).
- `pack-reevaluation` : seules les réponses du patient sont comptées.
- `PropositionPackReevaluation` affichait un texte fixe « Réessayez » sur
  tout échec : il affiche le texte du serveur pour `cadence` seulement.
  Les huit autres écrans affichaient déjà `error` (relu par un agent).

## Fichiers modifiés

- Nouveaux : `web/src/lib/securite/cadenceEcritures.ts` (+ test),
  `web/src/lib/praticien/cadenceObjectifs.ts` (+ test).
- Routes portail : `agenda-sommeil`, `agenda-alimentaire`, `ce-qui-compte`,
  `comprehension`, `protocole/checkin`, `pack-reevaluation`, `trust/choix`,
  `dossier` (+ leurs bancs).
- Routes praticien : `objectifs`, `objectifs/accord`, `objectifs/fin`,
  `objectifs/proposition-priorite` (+ bancs, sauf `accord` et `fin`, qui
  n'en ont pas : couverts par le banc du helper).
- `web/src/components/patient/PropositionPackReevaluation.tsx` (+ test).
- `docs/DECISIONS.md` (D-326), plan (lignes t08 et t09 soldées), changelog,
  SESSION_LOG.

## Validations exécutées

- Vitest des routes et modules touchés : verts (portail 80 + 10 + 24 + 111 +
  36 + 40 + 27 ; praticien 542 ; composant 6).
- T1, revue `wn-reviewer`, T3 : voir la PR.

## Problèmes ouverts

- Question au responsable : chaque signalement envoie une notification au
  praticien ; faut-il borner la notification (pas l'enregistrement) ?
- Le plafond n'est pas exact sous concurrence (D-326 §3), assumé.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge après #1557 et #1559 (un
merge à la fois, déploiement constaté), avec `--match-head-commit`.

## Interdits encore actifs

- Aucune migration ni modification de `schema.prisma` sans accord explicite.
- Aucune décision clinique sans D-xxx et fragment `changelog.d/`.
