# Handoff — 2026-11-16 — Cockpit : questions cliniques tranchées depuis le cockpit (D-531)

## Branche et état Git

- Branche `claude/festive-lamport-i5wneb`, avancée par `--ff-only` sur `origin/main` (e6412209), un commit propre : ce lot.
- Session cloud de suivi des files (hors carnet). PR ouverte en brouillon.

## Objectif

Demande du responsable du 2026-11-16 : une question `clinique` de la liste commune doit pouvoir se trancher depuis le cockpit, sinon l'outil perd son intérêt.

## Décisions prises

- `D-531` (accepté) : le bouton du cockpit s'ouvre aux questions `clinique` ; une ligne `reponses` de `source` `cockpit` vaut réponse du responsable ; la session la reporte au lieu de l'écarter ; la décision `D-xxx` et le fragment `changelog.d/` restent la porte du service. Amende la dernière phrase de `D-510` §6.
- `migration` reste en séance (non demandé).

## Fichiers modifiés

- `docs/decisions/D-531.md` (neuf).
- `docs/ROLES_MACHINES.md` : rubriques « Réponse depuis le cockpit » et « Autorité » de la liste commune.
- `scripts/lib/registres.mjs` et `scripts/lib/registres.test.mjs` : libellé du rappel d'autorité des lots bloqués.
- `changelog.d/2026-11-16-cockpit-questions-cliniques.md`, `docs/claude/plan-journal/H89/2026-11-16-01-cockpit-questions-cliniques.md`.
- Hors dépôt : `cockpit.html` de la page de suivi de la file D, publiée (version 1794831679-e054) ; `index.html` inchangé à l'octet.

## Validations exécutées

- `node --test scripts/lib/registres.test.mjs` : 19 réussis, 0 échec.
- `node scripts/lib/decisions-numerotation.mjs` : OK (trous D-496, D-527, D-529 en avertissement).
- `bash scripts/check_no_secrets.sh` : voir le commit.
- T1 (`npm run check:rapide`) non joué : aucun fichier sous `web/`.

## Problèmes ouverts

- **Réservation de D-531** : la poussée de `refs/tags/reserve/D-531` est refusée par le proxy git de la session cloud. À réserver avec `node scripts/wn-reserver-decision.mjs` depuis une session locale avant le merge ; si le numéro est pris, renuméroter la décision et ses renvois.
- Entre la publication du cockpit et le merge de cette PR, une session qui lirait l'ancienne consigne écarterait une ligne clinique avec motif et le signalerait : rien n'est perdu, la réponse se redonne.

## Prochaine action exacte

CI de la PR, revue PR-Agent (`node scripts/wn-revue-pr-agent.mjs <N>`), réservation du numéro, puis « prête » à l'intégrateur.

## Interdits encore actifs

- Une réponse clinique du cockpit n'autorise aucun code sans sa décision `D-xxx` mergée et son fragment `changelog.d/`.
- La page de suivi reste privée ; aucun partage sans règle d'accès réservant `reponses` au propriétaire.
- Ni donnée patient ni contenu clinique dans le registre des messages.
