# Handoff — 2026-11-17 — F05 (BP-12a) : nouvel essai v11 sur les trois fiches sans version, 0/3

## Branche et état Git

- Worktree `.claude/worktrees/b-fiche-usage-iode-selenium`, session concurrente, cycle en git/gh direct.
- Branche `f05-essai-v11-trois-fiches`, depuis `origin/main` (`da2e48b5`, merge de #2216, qui contient #2210 et #2213). Le lot ne contient que la consignation.

## Objectif

Jouer le nouvel essai arbitré par le responsable (`20261117-0750-b`) sur les trois fiches restées sans version après la clôture `20261117-0115-b`, et le consigner sans texte de fiche.

## Décisions prises

- `20261117-0750-b` : nouvel essai, trois fiches (POLY P6, POLY P8, MG P5), consigne v11 inchangée, une passe.
- POLY P7 et MG P4 n° 1 ne sont pas rejouées : elles attendent la validation du responsable.

## Fichiers modifiés

- `docs/claude/plan-journal/F05/2026-11-17-04-textes-essai-v11-trois-fiches-sans-version.md`
- ce handoff.

## Validations exécutées

- `rediger.mjs`, une passe sur trois fiches, consigne `fiche-usage-v11+365c3413be8abfe1` : 0 brouillon, 3 échecs de contre-lecture (huit rubriques), aucun échec technique.
- Aucun dépôt, donc aucun constat de production.
- `node --test scripts/lib/plan-journal.test.mjs` et `bash scripts/check_no_secrets.sh` : verts.

## Problèmes ouverts

- POLY P7 n° 1 et MG P4 n° 1 attendent la validation du responsable.
- POLY P6, P8 et MG P5 restent sans version. POLY P8 « precautions » est refusée pour le même motif à chaque passage depuis la v8 ; MG P5 déborde cette fois de « argument_preference » vers les options (refusée au rejeu précédent pour une condition de dose omise). Seule une consigne v12 (Codex P0 puis approbation) changerait ces deux motifs ; un rejeu tel quel ne fait que retirer au sort.

## Prochaine action exacte

CI et PR-Agent à 0, puis déclarer cette PR « prête » à l'intégrateur. La suite des trois fiches attend l'arbitrage du responsable.

## Interdits encore actifs

- Aucun rejeu sans arbitrage. Aucun texte de fiche dans le dépôt (D-251 §4).
- La validation est un geste du responsable. Production en lecture seule, par conteneur ; un dépôt passe par la route interne.
- Ne jamais pousser sur la branche d'une PR sans revérifier qu'elle n'est pas mergée.
