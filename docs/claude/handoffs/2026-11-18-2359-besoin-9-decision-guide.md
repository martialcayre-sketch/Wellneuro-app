# Handoff — 2026-11-18 — besoin 9 : décision du guide D-541 proposée (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin9-decision-guide`, créée sur `origin/main` 1354683df (#2246 mergée). Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel » du 2026-11-18. `git` et `gh` en direct.

## Objectif

Consigner la signature des positions v0.2 du besoin 9 et rédiger la décision du guide au gabarit de `D-526` et `D-529`, en forme opaque. Documentation seule.

## Décisions prises

- Constat de l'onglet à la révision 36 : trente-cinq cases sur trente-cinq. La case de la règle du guide signe la position (règle non signable, objets documentés), pas la règle. Le paragraphe d'introduction de l'onglet, périmé, n'est pas touché (document de signature du responsable).
- `D-541` réservée par `wn-reserver-decision` (le numéro 540 était déjà pris), statut « proposée ». Transposition des positions sans rien y ajouter ; les trois arbitrages (§6) sont des questions ouvertes avec l'avis de Codex à l'aveugle (`20261118-2355-b` à `2357-b`), l'option proposée par la session est écrite aux §3 et §5.
- Choix de rédaction à confirmer : le système nerveux autonome est « non évalué par défaut » parce qu'aucune position ne le retient (la source réunie est sans texte) ; les claims listés au §5.5 le sont d'après le rôle de provenance ou de limite que leur donnent les positions P4, P5, P29 et P35.
- Rang du journal H15 : `05` (le `04` est pris sur `origin/main` par #2246).

## Fichiers modifiés

- `docs/decisions/D-541.md` (nouveau) ; `docs/claude/GUIDE_12_BESOINS_NEURONUTRITION.md` (section du besoin 9) ; `docs/claude/PLAN_WELLNEURO.md` (deux lignes J3-12f, renvoi).
- `docs/claude/plan-journal/H15/2026-11-18-05-besoin-9-decision-guide.md`, `changelog.d/2026-11-18-besoin-9-decision-guide.md` ; ce handoff.
- Hors dépôt : dossier privé du besoin 9 (constat de signature), questions et lot du registre.

## Validations exécutées

- Lecture de l'onglet en lecture seule ; lecture du code pour les lignes qui lisent une bande d'un instrument du besoin 9 : `R-STR-01`, `R-STR-02`, `BIO-STR-01`, et `C-STR` et `STOP-STR` relevées par la revue de la PR.
- Avis de Codex : quatre appels à l'aveugle (le premier sujet repris sur quatre lignes), état conforme.
- `wn-reviewer` sur 0f273d432 : GO avec corrections (une contradiction active omise, la section du guide réécrite avant l'acceptation, deux présentations d'options ouvertes comme acquises), corrigées dans le commit suivant.
- type-check, decisions-check, plan-journal-check, campaign-audit-check, ancres-check verts ; anti-secrets (indexé) vert ; vitest non joué en local (worktree sans `npm ci`). Pas de T2 : documentation seule.

## Problèmes ouverts

- Acceptation de `D-541` par le responsable, et réponses à `20261118-2355-b` (quatre lignes, avis de Codex C, proposition A), `2356-b`, `2357-b`. Si l'option A du premier est retenue, la position P32 est amendée dans le dossier privé et à re-signer. La PR ne se merge qu'après l'acceptation (la section du guide est dans la PR).
- Le bandeau périmé de l'onglet des positions (« rien n'est signé »).
- Le lot `besoin9-decision-guide` reste `pris` jusqu'à l'acceptation. Les parts des strates et la pondération des besoins se décident avec J3-12f.

## Prochaine action exacte

1. S'arrêter à l'acceptation ou aux questions du responsable ; la PR #2250 reste en brouillon.
2. Après l'acceptation, reporter les réponses dans `D-541` (statut, §6), CI (`wn-attendre-ci.mjs`, seul `0` vaut), revue sur le sha de tête, boîte B relue, puis « prête @<sha> ».

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique : J3-12f applique.
- Aucune ingestion sans accord pour chaque envoi ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
