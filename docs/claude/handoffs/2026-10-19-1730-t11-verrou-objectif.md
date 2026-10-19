# Handoff — t11, PR 2 sur 2 : course perdue en 409, refus « désactivé »

## Branche et état du dépôt

- Branche `t11-verrou-objectif`, worktree `d281-lot3-portail`. Code
  consommateur seul : la migration
  `20261019150000_alli_objectif_supersedes_unique_v1` est la PR 1 (#1578,
  `t11-migration`, règle `pr-revue-et-release-db.md` §3), mergée et appliquée
  avant celle-ci.

## Objectif

Dette t11 : deux têtes de chaîne possibles (lecture puis écriture, aucun
verrou), dossier désactivé répondu « clôturé », 404 contre 403. Arbitrage du
responsable (2026-10-19) : verrou en base (migration accordée, merge et
release-db sans redemander), message propre au dossier désactivé, écart
404/403 gardé.

## Décisions prises

- Index unique TOTAL sur `objectifs_negocies.supersedes_objectif_id` : ferme
  la fourche (deux révisions de la même version) ; les racines (NULL) restent
  multiples. Déclaré au schéma (`@@unique`, map explicite) pour la parité
  schéma ↔ migrations.
- Constat préalable en production (conteneur `one-off-5565`, lecture seule,
  2026-10-19 14:05) : 10 objectifs, 0 version révisée deux fois — l'index
  s'applique sans départage.
- P2002 sur le `create` d'une RÉVISION ⇒ 409 `objectif_supplante`, même
  réponse que la lecture-puis-409 ; sur une racine, il reste un 500 (revue
  `wn-reviewer`, P2 1).
- `refusDossierFerme` (`lib/patient/cycleDeVie.ts`) : `dossier_desactive` +
  message propre ; la clôture prime ; dossier absent = refus historique.
  Câblé sur les six routes de l'objectif seulement (objectifs, fin, accord,
  relance, proposition-priorite, propositions-objectif).
- Découpage en deux PR (migration seule, puis code) : la règle de release-db
  le veut, même si ce code se déploie sans risque avant l'index.

## Fichiers modifiés

- `web/src/lib/patient/cycleDeVie.ts` + test ; six routes de l'objectif ;
  `objectifs/route.test.ts` (désactivé, P2002 sur révision, P2002 sur racine) ;
  cas « désactivé » sur fin, accord, proposition-priorite,
  propositions-objectif ; banc neuf `objectifs/relance/route.test.ts`.
- Plan, changelog, SESSION_LOG.

## Validations exécutées

- Vitest cycle de vie + routes de l'objectif : 176 verts.
- Revue `wn-reviewer` (sur l'ensemble code + migration) : go, aucun P0/P1 ;
  P2 1 à 3 traités ici, P2 4 (recompter avant release-db) tenu à la PR 1.
- T1 complet, T2 : voir la PR.

## Problèmes ouverts

- L'écart 404/403 reste (arbitrage) ; le message « clôturé » sert encore aux
  dossiers désactivés hors objectif (hors périmètre arbitré).

## Prochaine action exacte

PR, CI, CodeRabbit, merge une fois l'index constaté en production ; t11 →
fait sur la page de suivi de la file A.

## Interdits encore actifs

- Pas de `prisma format` ; aucune décision clinique sans D-xxx.
