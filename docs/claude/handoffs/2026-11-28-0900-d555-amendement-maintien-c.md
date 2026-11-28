# Handoff — J3-12f, amendement daté de D-555 : option C maintenue, recherche du §1.4 lancée (documentation seule) (2026-11-28)

## 1. Branche et état Git

- Branche `docs/d555-amendement-maintien-c`, tirée d'`origin/main` (dc626fe38) dans le worktree `.claude/worktrees/agent-a81c34a8d1130b0ce`, sur feu vert du responsable (`D-518` : l'ancienne branche, dont la PR #2383 est mergée par squash, reste intacte ; ni stash, ni reset). Commit tardif avant le push.

## 2. Objectif

Porter dans `D-555` l'amendement daté demandé par le responsable (liste commune `20261127-0100-b`), texte validé mot pour mot (`20261127-0130-b`).

## 3. Décisions prises

- Paragraphe « Amendée le 2026-11-27 » en fin de `D-555`, Statut inchangé, texte commité tel que validé, sans retouche.
- Option C maintenue (règle publiée, condition exclue, table signée inchangée) ; écart avec `D-516` assumé à la date du 2026-11-27, mêmes agrégats qu'au 2026-11-22 (18, 7, 5, 1) ; avis de Codex à l'aveugle joint (`D-505`).
- Recherche du §1.4 lancée par le responsable (`D-312`). Issues : source certifiée, réécriture sur la mesure dérivée avec amendement signé de `D-516` §5.5 ; rien de certifié, reprise du lot de suspension gardé en local (§1.5).

## 4. Fichiers modifiés

- `docs/decisions/D-555.md` (paragraphe d'amendement en fin de fichier) ; `changelog.d/2026-11-28-d555-amendement-maintien-c.md` ; journal H15 `2026-11-28-01` ; ce handoff.

## 5. Validations exécutées

- Documentation seule : `npm run check` (résultat consigné à la déclaration « prête » sur la PR). CI, preuve PR-Agent (ou `wn-reviewer`) et sonde consignées sur la PR.

## 6. Problèmes ouverts

- Rapport de la recherche du §1.4 à recevoir du responsable : vérification de chaque source, dépôt privé, rapprochement un envoi à la fois, aucune ingestion sans accord.
- `WN_CONSTAT_BESOIN` éteint : constat en lecture seule au signal du coordinateur ; revue de l'écart au §1.6.
- Besoin 3 (`PRIO-PON-01`, `D-040`) : état des lieux après cette PR. P25 du besoin 8 (amendement de `D-567` à sa signature), hors de ce lot.

## 7. Prochaine action exacte

Intégrateur : merge de la PR déclarée « prête @sha ». Puis attendre le rapport de recherche du responsable.

## 8. Interdits encore actifs

Aucune signature ni rejet ; aucune écriture en production ; aucune identité, aucun texte de claim ni seuil au dépôt ; un merge à la fois et la session ne merge pas ; le drapeau `WN_CONSTAT_BESOIN` n'est jamais allumé par la session.
