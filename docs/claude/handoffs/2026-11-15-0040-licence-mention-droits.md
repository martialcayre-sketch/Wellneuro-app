# Handoff — 2026-11-15 — Mention « Tous droits réservés » à la racine, contenus tiers exclus (lot `licence-mention-droits`)

## Branche et état du dépôt

- Branche `docs/licence-mention-droits`, créée depuis `origin/main@eace5bab` (merge de #2137) dans le worktree `.claude/worktrees/orch-ci` (session Orchestration, file D).
- Un commit, posé juste avant le push. PR de documentation et de configuration ; « prête @<sha> » pour l'intégrateur.

## Objectif

Mettre en œuvre la réponse du responsable à `20261114-1825-d` : aucune licence, rendue explicite. Il s'agit de poser la mention à la racine, d'exclure nommément les contenus tiers, de déclarer `license: UNLICENSED` et d'examiner le bundle livré au navigateur (réserve de l'avis Codex). Aucune concession de droits.

## Décisions prises

- Titulaire : « Wellneuro ». Le responsable a tranché au lot (AskUserQuestion, 2026-11-15), entre trois options :
  - la marque, recommandée ;
  - son nom ;
  - aucun titulaire.
  L'identité juridique exacte n'est pas dans le dépôt (trou relevé au dossier RGPD) ; elle se précisera après l'avis juridique.
- Phrases retirées du premier jet, faute de source :
  - « ne constitue pas un dispositif médical » : une qualification réglementaire, que la note renvoie à l'avocat ;
  - une ligne de contact.
- Contenus tiers nommés :
  - `web/src/lib/questionnaires/` ;
  - les skills tiers `frontend-design`, `supabase-postgres-best-practices`, `ui-ux-pro-max` et `webapp-testing` sous `.claude/skills/`, et `supabase-postgres-best-practices` sous `.agents/skills/` ; les skills `wn-*` sont ceux du dépôt ;
  - les référentiels publics, fixtures `web/prisma/fixtures/nabm-test/` comprises ;
  - les dépendances.
- `UNLICENSED` est posé aussi dans l'entrée racine de `web/package-lock.json`, pour que le fichier de verrouillage reste aligné sur `web/package.json`.
- Bundle : le minificateur de Next.js 15.5.25 force `comments: false`. Sur 314 fichiers JS, aucune mention de licence tierce n'est servie. Le constat est écrit ; le remède fait un lot à part (`licences-tierces-bundle`, ordre 83, `pret`) : un fichier de mentions généré au build et servi en statique.

## Fichiers modifiés

- `LICENSE` (neuf).
- `package.json`, `web/package.json`, `web/package-lock.json` (une ligne chacun).
- `docs/claude/propositions/2026-11-14-orchestration-5-licence/examen-bundle-navigateur.md` (neuf).
- `changelog.d/2026-11-15-licence-mention-droits.md`, ce handoff.

## Validations exécutées

- Les trois fichiers JSON sont relus par `json.loads` après l'édition.
- T1 complet (`npm run check`) et `check_no_secrets.sh --staged` : voir la PR.

## Problèmes ouverts

- Question `20261114-1825-d` : à clore au merge de ce lot.
- Questions à poser à l'avocat, hors session et hors de ce lot (note §3) :
  - la titularité du code écrit par les sessions ;
  - la visibilité publique des textes d'instruments ;
  - la marque.
- Carnet : `garde-portail-routes-restantes` (ordre 53, DOC d'abord), `cockpit-seconde-page` (81) et `licences-tierces-bundle` (83) sont `pret`.

## Prochaine action exacte

1. CI à 0, puis PR-Agent → 0 (ou `wn-reviewer` en repli), et un verdict sur chaque remarque.
2. « prête @<sha> » pour l'intégrateur, registre et carnet ; au merge, `20261114-1825-d` passe à close.
3. Lot suivant : `garde-portail-routes-restantes` (ordre 53).

## Interdits encore actifs

- Aucune licence concédée sans décision du responsable, et aucun fichier qui semblerait accorder des droits sur un contenu tiers.
- Aucune identité réelle dans le dépôt.
- Ne jamais lancer `npm install` à la racine (`package.json` racine).
