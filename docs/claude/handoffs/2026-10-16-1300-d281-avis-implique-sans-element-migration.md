# Handoff — 2026-10-16 — D-281 §5, t25 : avis « impliqué, élément non identifiable », PR 1 (migration seule)

## Branche et état Git

- Branche `feat/d281-avis-implique-non-identifiable-migration`, depuis
  `origin/main` fdd5e140 (#1497), worktree `d281-lot3-portail` (session
  concurrente, cycle en git/gh direct).
- Un commit de lot ; PR de migration seule. Après le merge : `release-db`
  approuvée par le responsable, sentinelle du run, constat par conteneur,
  puis seulement la PR 2 (code).

## Objectif

Plan §8, fiche t25 ; arbitrages du responsable du 2026-10-16. Sur un programme
visé illisible, le praticien peut rendre « impliqué » sans élément, avec un
aménagement obligatoire, au lieu de devoir déclarer « non impliqué ».

## Décisions prises

- Ouvert sur le seul programme visé illisible ; jamais quand le patient a
  désigné l'élément ; aménagement obligatoire (même liste fermée) ; si l'avis
  s'ouvrait un jour sur programme lisible, la pause des compléments serait
  maintenue. D-281 §5 amendée dans cette PR (revue P1-1).
- La base admet « impliqué » sans élément (`trust_aev_coherence_check` :
  aménagement exigé, élément facultatif) et le refuse sur un élément désigné
  par le patient ou un signalement délié de son programme (trigger
  `trust_aev_avant_insertion`, corps de 20261015130000 repris à l'identique,
  un bloc ajouté). « Programme illisible seul » : tenu par le code (PR 2).

## Fichiers modifiés

- `web/prisma/migrations/20261016110000_saf_ei_avis_implique_sans_element_v1/migration.sql`
- `web/prisma/checks/trust_aev_implique_sans_element_v1_negatif.sql` (neuf),
  `.github/workflows/ci.yml` (sa ligne)
- `web/prisma/checks/trust_aer_rattachement_verdict_v1_negatif.sql` : le cas
  « impliqué sans élément » devient « sans élément ni aménagement »
- `docs/DECISIONS.md` (D-281 §5), `docs/claude/PLAN_WELLNEURO.md` (t25),
  `changelog.d/2026-10-16-d281-avis-implique-sans-element-migration.md`
- `schema.prisma` inchangé (Prisma ne modélise pas les CHECK).

## Validations exécutées

- T3 (`npm run test:worktree`) vert en 5 min 57 s : migration appliquée sur
  base éphémère, dérive schéma ↔ migrations « No difference detected », les
  deux contrats (`trust_aev_implique_sans_element_v1_negatif.sql`, et celui
  du lot 2 modifié) verts. Contre-épreuve sans la migration non jouée : la
  revue établit par lecture que les trois avis acceptés rougiraient en 23514
  sous l'ancienne contrainte.
- Revue `wn-reviewer` (P0) : Go conditionnel, aucun P0 ; P1-1 (D-281 §5 non
  amendée) corrigé ; fonction comparée mécaniquement à la précédente.
- Passe Codex obligatoire (P0) : geste du responsable, avant le merge.

## Problèmes ouverts — pour la PR 2 (code)

- `validerDemandeVerdict` : admettre « impliqué » sans élément quand
  `elements === null` (même chemin que l'écran : `elementsDesProgrammesVises`),
  aménagement exigé ; refuser sur programme lisible et sur élément désigné.
- Écran : choix « Impliqué, élément non identifiable » + aménagement quand le
  programme ne se lit pas ; libellé dédié dans l'historique (revue P2-2, au
  lieu de « Élément sans intitulé lisible »).
- `elementsEnPause` : un avis « impliqué » sans élément lève aujourd'hui la
  pause des compléments ; l'arbitrage veut la maintenir s'il s'ouvrait sur
  programme lisible — fixer par un test (revue P2-1).
- Route du verdict : un refus P0001 du nouveau bloc rendrait 500 ; le rendre
  inatteignable par la validation (revue P2-2).
- Commentaire de `web/src/app/api/portail/trust/signalement/route.ts`
  (« « aucun » seulement, si le programme lui-même est illisible ») à mettre à
  jour.
- Banc de cas fictifs D-281 (`bancCasFictifsD281.test.ts`) : ajouter le cas.

## Prochaine action exacte

PR de migration, CI, revue CodeRabbit, passe Codex du responsable, merge ;
`release-db` approuvée par le responsable, sentinelle `WN_RELEASE_DB_OK
id=<run>`, `migrate status` par conteneur ; puis la PR 2.

## Interdits encore actifs

- Pas de code consommateur avant la `release-db` constatée.
- Aucune autre modification de `schema.prisma`.
- Garde de diffusion inerte jusqu'à la signature (M-1, D-281 §6).
- Un merge à la fois ; jamais pendant l'attente d'une `release-db`.
