# Handoff — 2026-11-18 — besoin 9 : décision du guide D-541 acceptée (D-312, H15), lot de la file B

## Branche et état Git

- Branche `docs/besoin9-decision-guide`, créée sur `origin/main` 1354683df (#2246 mergée), puis fusionnée avec `origin/main` (4e90a1f98, `git merge`, sans rebase) sur arbitrage du responsable du 2026-11-19 (`D-518`), pour cette branche et ce lot seulement. Worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`.
- Session concurrente (file B), mission « 12 besoins, séquentiel » du 2026-11-18. `git` et `gh` en direct.

## Objectif

Consigner la signature des positions v0.2 du besoin 9 et rédiger la décision du guide au gabarit de `D-526` et `D-529`, en forme opaque. Documentation seule.

## Décisions prises

- Constat de l'onglet à la révision 36 : trente-cinq cases sur trente-cinq. La case de la règle du guide signe la position (règle non signable, objets documentés), pas la règle. Le paragraphe d'introduction de l'onglet, périmé, n'est pas touché (document de signature du responsable).
- `D-541` réservée par `wn-reserver-decision` (le numéro 540 était déjà pris), statut « accepté » par le responsable le 2026-11-18 (rédaction générale et deux choix de rédaction). Transposition des positions sans rien y ajouter. Arbitrages du §6 tranchés le même jour : `2355-b` = C (suspendre les quatre lignes pour les relire une à une, par décision et lot distincts ; aucune extinction par D-541 ; P32 non amendée), `2356-b` = A (deux libellés du BMS-10 distingués), `2357-b` = B (correction de trois items du DASS-21).
- Choix de rédaction acceptés : le système nerveux autonome est « non évalué par défaut » parce qu'aucune position ne le retient (la source réunie est sans texte) ; les claims listés au §5.5 le sont d'après le rôle de provenance ou de limite que leur donnent les positions P4, P5, P29 et P35.
- Lot de suspension des quatre lignes inscrit au carnet (file A, `besoin9-suspension-lignes-stress`), message à la file A.
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

- Lot de suspension des quatre lignes (`besoin9-suspension-lignes-stress`, file A) : à arbitrer par la file A (lot distinct ou fondu dans J3-12f) ; il part après le merge de `D-541`. Aucune ligne n'est éteinte par `D-541`.
- Le bandeau périmé de l'onglet des positions (« rien n'est signé »).
- Le lot `besoin9-decision-guide` passe à `fait` au merge de la PR #2250. Les parts des strates et la pondération des besoins se décident avec J3-12f.

## Prochaine action exacte

1. CI de la tête (`wn-attendre-ci.mjs`, seul `0` vaut), revue sur le sha de tête, sortie de brouillon, boîte B relue, puis « prête @<sha> ».
2. S'arrêter à « prête » : l'intégrateur merge ; le lot de suspension des quatre lignes est à la file A.

## Interdits encore actifs

- Aucun texte de claim, aucune valeur, aucune borne, aucun seuil, aucun nom de rubrique au dépôt, ni dans les tests, ni dans les messages de commit (`D-251` §4, `D-325` §5).
- Aucune règle, aucun seuil, aucune dose ni aucun poids inventés. Aucun code clinique : J3-12f applique.
- Aucune ingestion sans accord pour chaque envoi ; la signature ne se délègue pas.
- Aucune migration ; pas de `prisma format`. Production lue seulement par `scalingo run -d`. L'URL des dossiers privés reste hors dépôt.
