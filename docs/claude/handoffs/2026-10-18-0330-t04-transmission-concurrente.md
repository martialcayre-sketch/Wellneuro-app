# Handoff — 2026-10-18 — t04 : deux transmissions concurrentes, une seule réponse

## Branche et état Git

- Branche `t05-transmission-concurrente-verrou`, depuis `origin/main`
  586db8fc, worktree `d281-lot3-portail` (session concurrente, cycle en
  git/gh direct ; file A en autonomie, délégation du 2026-10-18).
- Aucune migration, `schema.prisma` inchangé.

## Objectif

Plan §8, dette « deux transmissions concurrentes d'un même questionnaire »
(h1, handoff 2026-10-10-1943:63-68). La course était démontrée dans le code,
sans occurrence observée.

## Décisions prises

- Aucune décision neuve. Le second envoi reçoit le même 409 `already_done`
  qu'un envoi séquentiel. On aligne donc le cas concurrent sur le cas
  séquentiel, sans nouveau contrat.
- Motif des clôtures d'agenda (`lib/agenda-sommeil/cloture.ts`) : une
  transaction et un `SELECT … FOR UPDATE` sur `assignations`, avec les refus
  `annulee`, `already_done` et `expired` (sauf déverrouillage) revérifiés sous
  verrou ; la date limite a été ajoutée sur la revue CodeRabbit.
- Le banc à deux sessions réelles demandé par CodeRabbit (P1) est écarté, avec
  motif. Le SQL du verrou s'exécute contre PostgreSQL dans l'E2E
  `portail-parcours` (T2). La sémantique de `FOR UPDATE` est celle des deux
  clôtures d'agenda en service, et un banc SQL éprouverait PostgreSQL, pas la
  route. Aucune contrainte
  d'unicité n'est possible : une assignation déverrouillée reçoit
  légitimement une seconde réponse.
- Les envois (accusé, alerte D-277) restent après l'écriture, pour le seul
  gagnant.

## Fichiers modifiés

- `web/src/app/api/patient/submit/route.ts` (+ `route.test.ts` : mock de
  transaction et de verrou, banc de concurrence avec contre-épreuve sur la
  route d'avant, trois cas rouges).
- `docs/claude/PLAN_WELLNEURO.md` (§8 soldé) ;
  `changelog.d/2026-10-18-t04-transmission-concurrente.md`.

## Validations exécutées

- Bancs de la route et des routes patient voisines : verts.
- T1 complet vert ; T2 (`--fast`) vert : Vitest 13 443 verts et 4 sautés, E2E 276 verts et 6 sautés.
- Revue `wn-reviewer` : go, aucun constat bloquant ; les trois bancs qu’elle jugeait manquants sont ajoutés (déverrouillée, modification demandée, transaction en échec).

## Problèmes ouverts

- Aucun.

## Prochaine action exacte

PR, CI, revue CodeRabbit sur le sha de tête, merge. Page de la file A : t04
passe à fait.

## Interdits encore actifs

- Aucune migration ni `schema.prisma` sans accord du responsable.
- Aucune règle clinique ni seuil touchés.
