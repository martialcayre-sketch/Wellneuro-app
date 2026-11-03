# Handoff — 2026-11-03 — Audit 3 : le dossier désactivé a son refus sur cinq routes de plus (D-432)

## Branche et état du dépôt

- Branche `fix/audit3-dossier-desactive-cinq-routes`, partie de
  `origin/main` 8ae6c496 ; worktree `.claude/worktrees/audit3-cinq-routes`,
  session concurrente, cycle en `git`/`gh` direct.
- Lot de code sans migration : aucun changement de `schema.prisma`, aucun
  fichier sous `web/src/lib/clinical/`, ni `indicationsBiologieV1.ts`. Pas
  de release-db.
- Dépend de #1831 (Q3 quinquies, D-427), encore ouverte : le resserrement du
  type de `refusDossierFerme` (`cycleDeVie.ts`) est repris **à l'identique**,
  octet pour octet, pour que les deux branches fusionnent sans conflit.
  D-432 s'insère en tête du registre, D-427 sous D-428 : pas de conflit
  attendu non plus.
- Essai `D-373` : PR déclarée « prête @<sha> », **non mergée** par cette
  session ; l'intégrateur merge, de préférence après #1831.

## Objectif

La suite tranchée par le responsable le 2026-11-02, après un avis de Codex,
sur la dette relevée par la revue de #1831 : `refusDossierFerme` à la place
du 404 « introuvable » sur cinq `POST` praticien — `packs/assign`,
`file-envoi`, `file-envoi/envoyer`, `agenda-sommeil/relance`,
`consultations`. `token` exclu (un dossier clos garde son lien). Le refus
prend la place de l'ancien. Le 403 d'appartenance de `consultations` est
conservé. Aucun texte neuf.

## Décisions prises

- D-432 (réservée par `wn-reserver-decision.mjs`), précise D-427 §1 :
  - §1 : cinq routes rendent `refusDossierFerme` (409) ; la clôture prime
    (`phaseDossier`) ; un dossier absent ou d'un autre praticien reste
    « introuvable » ;
  - §2 : chaque route garde l'ordre de ses refus. Sur le rappel de l'agenda
    de sommeil, le refus du désactivé vient avant le portail révoqué, à la
    place du 404 ; un dossier actif au portail révoqué garde
    `portal_revoked` avant la clôture.
- L'arbitrage n'a pas de ligne dans la liste commune (il n'est consigné que
  dans la mémoire des sessions). Rien n'est à horodater au merge.

## Fichiers modifiés

- `web/src/app/api/praticien/packs/assign/route.ts` (+ test). **Fichier en
  CRLF** : indexé par `git hash-object -w --no-filters` puis
  `git update-index --cacheinfo`.
- `web/src/app/api/praticien/file-envoi/route.ts` (+ test).
- `web/src/app/api/praticien/file-envoi/envoyer/route.ts` (+ test).
- `web/src/app/api/praticien/agenda-sommeil/relance/route.ts` (+ test, ligne
  « patient inactif » du tableau adaptée).
- `web/src/app/api/praticien/consultations/route.ts` (+ test).
- `web/src/lib/patient/cycleDeVie.ts` — type de retour seul, copie de #1831.
- Docs : `docs/DECISIONS.md` (D-432),
  `changelog.d/2026-11-03-audit3-dossier-desactive-cinq-routes.md`, ce
  handoff.

## Validations exécutées

- Bancs : 87 passés sur les cinq fichiers. Par route, un désactivé (409,
  raison et message), un désactivé clôturé (la clôture prime), un absent
  (404 conservé) ; pour l'agenda, en plus, un désactivé au portail révoqué.
- Mutations (route d'origine remise, puis restaurée) : chaque banc rougit,
  2 échecs (pack, file, envoi, consultation), 3 (agenda).
- T1 complet : code 0.
- T2 `--fast` : code 0 au premier passage (Vitest : 15 688 passés,
  40 sautés ; E2E : 303 passés, 7 sautés).

## Problèmes ouverts

- Texte du 404 de `packs/assign` « Patient introuvable (email non
  présent/actif). » : le « /actif » devient inexact ; laissé, aucun texte
  neuf n'est permis (même verdict que sur #1831).
- Aucun autre reste. Q2 de l'audit 3 revient avec l'audit 2.

## Prochaine action exacte

Attendre le CI (`node scripts/wn-attendre-ci.mjs <N>`), la revue CodeRabbit
(sinon PR-Agent, D-393) sur la tête, un verdict par commentaire, puis
déclarer « prête @<sha> ». L'intégrateur merge, après #1831.

## Interdits encore actifs

- Pas de merge par cette session (essai D-373).
- Pas de migration ni de `schema.prisma`.
- `token` hors périmètre ; ne pas rouvrir l'audit 3 ni reposer Q3 quater,
  Q3 quinquies ou cette suite.
