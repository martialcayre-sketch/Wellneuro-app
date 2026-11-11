# Handoff — Playwright : installation Ubuntu bloquée avant les E2E

## Branche et état Git

Branche `fix/playwright-installation-reflow`, dans le worktree
`.claude/worktrees/codex-playwright`, créée depuis `origin/main` (`226c9fc8c`).
La copie principale et les autres sessions restent sur leurs branches.

## Objectif

Analyser et corriger les problèmes E2E Playwright actuels.

## Décisions prises

- Cause **observée en CI**, run `43049069649`, job `130620904423` : le miroir
  `azure.archive.ubuntu.com` ne répond plus. L’installation attend environ
  vingt secondes par paquet et est annulée après presque une heure, avant
  tout test. Plusieurs branches présentent la même étape bloquée.
- Remplacer ce seul miroir par `https://archive.ubuntu.com/ubuntu` dans les
  sources et listes de miroirs du runner. Garder suites, composants,
  signatures et dépôts tiers ; garder les dépendances système Playwright.
- Borner les accès APT et l’installation ; refuser une mise à jour d’index
  incomplète. Aucun réessai de test.
- Ne publier le rapport obligatoire qu’après une étape de tests exécutée :
  son absence après un échec de préparation était un second échec trompeur.
- Ancien échec de `lecture-datee-reflow` dans le run `42113077329` : non
  reproduit localement sur la tête testée, y compris cinq exécutions par
  navigateur. Aucun correctif UI ni assouplissement d’assertion. Sa cause
  actuelle reste **inconnue faute de preuve** ; aucune fréquence déduite.

## Fichiers modifiés

- `.github/workflows/ci.yml`, `.github/workflows/visual-baselines.yml`
- `scripts/wn-playwright-apt.mjs`, `scripts/ci-invariants.test.mjs`
- `changelog.d/2026-11-11-playwright-miroir-ubuntu.md`
- Ce handoff.

## Validations exécutées

- `npm run check:rapide` et `npm run check` : verts.
- `npm run test:worktree -- --fast --keep-db` : vert, base éphémère isolée,
  16 734 tests unitaires réussis ; contrats SQL, bancs de concurrence et build
  de production réussis ; Playwright : **357 réussis, 23 ignorés**.
- `lecture-datee-reflow.spec.ts --repeat-each=5` : **10/10 réussis**, Chromium
  et WebKit iPhone 13, sans réessai automatique.
- Invariants CI : **17/17 réussis**, dont conservation des signatures et des
  dépôts tiers, idempotence, ordre des étapes et rapport après exécution.
- Les deux workflows sont parsés avec `js-yaml`, sans erreur.
- Le miroir officiel répond HTTP 200 depuis cette machine. L’installation
  APT réelle exige encore le constat du CI Ubuntu de la PR.
- Les chargements dotenv des commandes locales ont été neutralisés par un
  préchargement temporaire hors dépôt : aucun fichier `.env*` consulté.

## Problèmes ouverts

Constater l’installation et la suite sur le runner Ubuntu de la PR, puis la
revue de tête. Un résultat macOS ne prouve pas le fonctionnement d’APT.
L’ancien échec de reflow ne justifie aucun changement applicatif à ce stade.

## Prochaine action exacte

Ouvrir la PR du lot et attendre son CI par `wn-attendre-ci.mjs`. Lire la revue
de tête ; l’intégrateur effectue le merge selon la procédure habituelle.

## Interdits encore actifs

Aucun secret ni donnée patient réelle ; aucune modification clinique, de
schéma ou de migration ; aucune écriture en production. Pas de réessai
Playwright ni de relance d’un rouge WebKit CI. Aucun merge par cette session.
