# Handoff — 2026-10-16 — Fil du jour : incidents et demandes de droit scopés au praticien

## Branche et état Git

- Branche `fix/fil-incidents-droits-scope-praticien`, depuis `origin/main`
  f660faf8, worktree `d281-lot3-portail` (session concurrente, git/gh direct).
- Un commit ; PR à ouvrir, CI par `wn-attendre-ci`, revue CodeRabbit sur la
  tête, merge, déploiement constaté.

## Objectif

Défaut relevé par la revue de #1483 (P2-4) : au Fil du jour, les cartes
« Signalement » des incidents de confidentialité et des demandes de droit
lisaient `take: 10` sur toute la base, sans scope praticien ni ordre ; le
scope n'arrivait qu'après. Un autre praticien, ou un patient inactif, pouvait
évincer les signalements du praticien connecté.

## Décisions prises

- Choix du responsable (question du 2026-10-15) : corriger plutôt que
  seulement inscrire au plan.
- Scope `patient: { actif: true, ...filtrePatientsDuPraticien(email) }`
  avant la borne de dix — même prédicat que le filtre `actifs` en aval.
- Ordre : plus ANCIENS d'abord (revue P2-1) — délai légal de 72 h pour un
  incident, d'un mois pour une demande de droit. Les effets indésirables
  (#1483) restent plus récents d'abord.
- Revue CodeRabbit (sur d361558b) : une session sans e-mail est refusée en
  401, comme au panneau TRUST, au lieu du repli `?? ''` ; test ajouté (ferme
  aussi le P2-2 de wn-reviewer).

## Fichiers modifiés

- `web/src/app/api/praticien/fil/route.ts` et `route.test.ts`
- `changelog.d/2026-10-15-fil-incidents-droits-scope-praticien.md`

## Validations exécutées

- Suites du Fil : 86 tests verts (avec l'ordre final).
- T1 (`check:rapide`) vert ; T1 complet avant commit.
- T2 (`test:worktree -- --fast`) vert en 5 min 21 s, joué avant le passage
  de l'ordre `desc` à `asc` (seule différence ensuite : sens du tri et test
  unitaire, rejoué vert).
- Revue `wn-reviewer` (cloisonnement) : Go, aucun P0/P1 ; P2-1 appliqué.

## Problèmes ouverts

- Revue de #1483, P2-3 : panneau TRUST borné à 100, Fil et prévol sans borne.

## Prochaine action exacte

Ouvrir la PR, CI en fond, revue CodeRabbit sur la tête, merge, déploiement
constaté. Ensuite, suite de D-281 : désignation illisible au dépôt (§8, t22).

## Interdits encore actifs

- Aucune migration ni `schema.prisma`.
- Garde de diffusion D-281 inerte jusqu'à la signature (M-1).
- Pas d'auto-merge ; un merge à la fois, déploiement constaté.
