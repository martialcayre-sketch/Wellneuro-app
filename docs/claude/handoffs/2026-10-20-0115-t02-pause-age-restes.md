# Handoff — t02 : pause d'âge, deux restes du lot (h) soldés

## Branche et état du dépôt

- Branche `t02-pause-age-restes`, worktree `d281-lot3-portail`, partie de
  `origin/main` (fde0f807). Nuit en autonomie file A du 2026-10-19.

## Objectif

Restes du lot (h) de D-284 §3 (handoff 2026-10-14-1445, P2-c et banc
manquant) qui ne demandent ni décision ni migration.

## Décisions prises

- `GET /api/patient/questionnaire` : si les réponses ne sont pas verrouillées,
  la garde d'âge (`refusSaisieSantePour`) est jouée et son refus rendu en 409,
  texte et raison identiques à `api/patient/submit` (textes validés le
  2026-10-14). L'écran affiche déjà le message d'erreur de la route : aucun
  texte neuf. Des réponses verrouillées restent consultables.
- Banc `web/src/lib/patient/gardeAge.routes.guard.test.ts` : balayage des
  routes d'écriture sous `api/patient` et `api/portail` ; six gardées, dix-huit
  ouvertes avec motif (périmètre de l'arbitrage du 2026-10-14).
- Non traités (restent au plan, avec J3-mineurs) : le signal de sécurité de
  l'envoi d'un mineur (inhérent à la pause : relève d'une décision) et
  l'origine de la date (colonne, donc migration).

## Fichiers modifiés

- `web/src/app/api/patient/questionnaire/route.ts` + test (trois cas ; la
  fixture par défaut porte une date de naissance adulte).
- `web/src/lib/patient/gardeAge.routes.guard.test.ts` (nouveau).
- Plan (ligne t02), changelog, SESSION_LOG.

## Validations exécutées

- Tests de la route (15) et banc (5) verts. T1 et T2 : voir la PR.

## Problèmes ouverts

- Les deux restes ci-dessus.

## Prochaine action exacte

PR, CI, CodeRabbit, merge, déploiement constaté ; t02 → en attente (restes)
sur la page de suivi de la file A.

## Interdits encore actifs

- Aucun texte patient neuf sans validation du responsable ; rien de clinique
  sans D-xxx.
