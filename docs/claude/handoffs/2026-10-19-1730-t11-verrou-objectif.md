# Handoff — t11 : verrou de révision de l'objectif, refus « désactivé »

## Branche et état du dépôt

- Branche `t11-verrou-objectif`, partie de `origin/main` 926a0420. Worktree
  `d281-lot3-portail`. **Migration** : `20261019150000_alli_objectif_supersedes_unique_v1`.
  #1574, #1576, #1577 ouvertes avant elle (conflit attendu sur `SESSION_LOG.md`).

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
- P2002 sur le `create` ⇒ 409 `objectif_supplante`, même réponse que la
  lecture-puis-409. Aucune autre unicité sur `objectifs_negocies` ni sur
  `dispositions_proposition` : un P2002 ne peut venir que de cet index.
- `refusDossierFerme` (`lib/patient/cycleDeVie.ts`) : `dossier_desactive` +
  message propre ; la clôture prime ; dossier absent = refus historique.
  Câblé sur les six routes de l'objectif seulement (objectifs, fin, accord,
  relance, proposition-priorite, propositions-objectif).
- Code et migration dans la même PR : le code ne dépend pas de l'index (le
  P2002 ne survient qu'après application) — ordre de déploiement sans risque.

## Fichiers modifiés

- `web/prisma/migrations/20261019150000_alli_objectif_supersedes_unique_v1/migration.sql`,
  `web/prisma/schema.prisma` (une ligne `@@unique` + commentaire).
- `web/prisma/checks/alli_objectif_supersedes_unique_v1_negatif.sql` (nouveau),
  `.github/workflows/ci.yml` (une étape).
- `web/src/lib/patient/cycleDeVie.ts` + test ; six routes de l'objectif ;
  `objectifs/route.test.ts` (deux cas).
- Plan, changelog, SESSION_LOG.

## Validations exécutées

- Vitest cycle de vie + routes de l'objectif : 169 verts.
- T1 complet, T3, revue `wn-reviewer` : voir la PR.

## Problèmes ouverts

- L'écart 404/403 reste (arbitrage) ; le message « clôturé » sert encore aux
  dossiers désactivés hors objectif (hors périmètre arbitré).

## Prochaine action exacte

PR, CI, CodeRabbit, merge (après #1577), puis **release-db** approuvée,
sentinelle, constat de l'index par conteneur ; t11 → fait sur la page de
suivi de la file A.

## Interdits encore actifs

- Pas de `prisma format` ; aucune décision clinique sans D-xxx.
