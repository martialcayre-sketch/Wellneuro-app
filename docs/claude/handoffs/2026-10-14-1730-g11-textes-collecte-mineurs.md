# Handoff — 2026-10-14 — G-11 (H38) : textes patient de la collecte et des mineurs

## Branche et état Git

`docs/g11-textes-collecte-mineurs`, dans le worktree
`.claude/worktrees/bio-ingest-cloture`, partie d'`origin/main` 250a6fe0 (#1439).
Un commit de doc, aucun code.

## Objectif

Écrire le premier jet des deux textes G-11, puis le faire corriger et valider
par le responsable (arbitrage du 2026-10-14, clôture du lot (h) de D-284).

## Décisions prises

- Six arbitrages sur questions à options. Un dépôt par erreur se retire par une
  demande. Le texte de dépôt se lit, sans accusé. Les exemples de documents
  sont gardés. Le texte du jeune le tutoie. Les parents « peuvent demander »
  le contenu du dossier, sans accès au portail. Le 119 est ajouté au texte du
  jeune.
- Textes **validés tels quels** par le responsable le 2026-10-14.
- Non publiés : chacun part au portail avec ce qu'il décrit, J3-collecte et
  ACT-4 pour l'un, J3-mineurs et ACT-5 pour l'autre.

## Fichiers modifiés

- `docs/claude/propositions/2026-10-14-g11-textes-patient/README.md` (neuf :
  arbitrages et textes mot pour mot).
- `docs/claude/PLAN_WELLNEURO.md` (G-11 fait au tableau du rang 0, mise à jour
  de H38).
- Fragment `changelog.d/2026-10-14-g11-textes-collecte-mineurs.md`,
  SESSION_LOG, ce handoff.

## Validations exécutées

- T1 complet vert (`npm run check`, 506 tests ; anti-secrets OK). Lot de doc :
  pas de T2.

## Problèmes ouverts

- Les 15–17 ans attendent l'avocat (D-284). Le texte 2 applique 18 ans sans
  nuance.
- « Vos données personnelles » est à mettre à jour à l'ouverture de la
  collecte (lettre l) : une version distincte, à valider.
- Le circuit des droits des mineurs reste à écrire (D-283 §5), dans le sens de
  l'arbitrage 5.
- La date de naissance du dossier d'essai du responsable reste à constater.
  Identifiant attendu ; lecture par conteneur.

## Prochaine action exacte

1. Attendre le CI de la PR (`node scripts/wn-attendre-ci.mjs <N>`), lire les
   commentaires de revue, puis merger.
2. Constater la date de naissance du dossier d'essai dès que l'identifiant est
   donné.

## Interdits encore actifs

- Les textes ne changent plus sans nouvelle validation du responsable.
- Aucun texte publié avant que sa fonction soit construite et déployée.
- Aucune identité réelle au dépôt ; production en lecture par conteneur, par
  identifiant, sans métrique de contenu dans un fichier durable.
