# Handoff — 2026-11-27 — Réconciliation de l'audit des 12 besoins (lot besoins-reconciliation-audit, file D)

## Branche et état Git

- Branche `claude/clever-mayer-82p7cn`, tirée d'`origin/main` (`a43cac11`).
- Un commit de documentation, poussé ; PR ouverte par la passe de
  l'orchestrateur cloud (journal `20261127-2108-orch`).

## Objectif

Écrire `docs/claude/besoins/RECONCILIATION_AUDIT_12_BESOINS.md` : une ligne
par constat ou recommandation de l'audit des 12 besoins (lettre w, `D-312`),
avec son sort et une référence vérifiée sur `origin/main`. Premier des six
lots inscrits sur la réponse à `20261127-2046-b`.

## Décisions prises

- Source des constats : la page privée « Audit des 12 besoins », lue en
  entier (sections 1 à 12, tableaux d'arbitrages, d'impact et de
  visualisation compris), et non seulement les reprises des fiches.
- Six familles, 64 lignes : mesure (M-01 à M-19), règles et seuils (R-01 à
  R-09), poids et bandes (P-01 à P-08), preuves (E-01 à E-10), interface
  (I-01 à I-09), gouvernance (G-01 à G-09).
- Un constat traité en partie a deux lignes, une par sort (M-08/M-09,
  R-01/R-02, M-04/M-05, M-15/M-16).
- Forme opaque (`D-251` §4) : ni seuil, ni valeur, ni compte de production,
  ni texte de claim.

## Fichiers modifiés

- `docs/claude/besoins/RECONCILIATION_AUDIT_12_BESOINS.md` (nouveau)
- `changelog.d/2026-11-27-besoins-reconciliation-audit.md` (nouveau)
- ce handoff

## Validations exécutées

- Chaque `fichier:ligne` du tableau relu sur `origin/main` (`a43cac11`) ;
  numéros de ligne de `constants.ts` corrigés après relecture.
- `npm run check:rapide` → 0 (après `npm ci` et `npx prisma generate` dans le
  clone frais).
- `npm run check` : voir le commentaire de la PR (code de sortie rapporté
  tel quel).
- Pas de T2 ni de T3 (passe cloud, `D-540`).

## Problèmes ouverts

- Constats sans suite, à porter par un lot ou une question si le responsable
  le veut : R-02 (section du besoin 2 du guide non réécrite, sa règle de
  décision d'origine reste à `GUIDE_12_BESOINS_NEURONUTRITION.md:64`), M-09
  (pas de garde général des `max`), I-04, I-05, I-07 (pas de filtre par
  besoin dans l'atelier), M-18, R-09, E-03, G-07.
- M-05 : le résidu snapshot/routes de `D-329` §2 attend « un lot qui
  tranchera la complétude de l'agenda dans le snapshot » ; aucun lot
  inscrit trouvé.
- La ligne `reponses` `20261125-1005-d--20261125T130513-vseh` (file D,
  `envoyee`) n'a pas été reportée : la passe cloud n'écrit ni dans
  `questions` ni dans `reponses`.

## Prochaine action exacte

Intégrateur : servir la PR après « prête @<sha> » (documentation seule, P2).
File D : les cinq autres lots de réconciliation, quand le carnet les inscrit.

## Interdits encore actifs

- Aucune décision, aucun code, ni guide ni registre des sources touchés par
  ce lot ou ses suites sans lot propre.
- Aucune identité réelle, aucun compte de production au dépôt.
- La passe cloud ne merge pas, ne répond à aucune question, ne prend pas de
  second lot.
