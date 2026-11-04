# Handoff — 2026-11-04 — D-440 : constat en production de la carte « Sans avancée » (H07, audit 2 QB)

## Branche et état Git
- Branche `docs/d440-constat-fil-sans-avancee`, partie d'`origin/main@7f0ef511`, avancée par `--ff-only` à `5d0f2a91`. Worktree `.claude/worktrees/d440-constat` (session concurrente, cycle en git/gh direct).
- Une PR de documentation, squash. **La session ne merge pas** : elle déclare « prête @<sha> » à l'intégrateur (essai D-373).

## Objectif
Constater en production, après le merge et le déploiement de #1866, ce que sert la carte « Sans avancée » : situations, exclusions, cartes servies, conditions dures manquantes en situation 1 ; puis comparer à la prévision de D-440 §3.

## Décisions prises
- Préalable vérifié : #1866 mergée (`47e16957`), contenue dans `7f0ef511`, en service sur Scalingo depuis 22 h 06 UTC.
- Méthode : un script TypeScript passé au conteneur (one-off détaché, session PostgreSQL `default_transaction_read_only`). Il appelle la route réelle du Fil, `GET /api/praticien/fil`, avec une session simulée par remplacement de `next-auth`, et le module pur de la carte. Les préconditions passent par `preconditionsT0PourPatient`. Le script a d'abord été joué à blanc sur la base locale du worktree, puis lancé en production (one-off-5614). Il n'est pas versé.
- Arbitrage du responsable, liste commune `20261104-2352-d` : l'accord au singulier de la situation 3, livré par #1866, est gardé. Il complète D-440 §6, sans lot de code.

## Fichiers modifiés
- `docs/claude/plan-journal/H07/2026-11-04-03-constat-carte.md` : le constat, en agrégats masqués (D-298), et l'arbitrage du singulier.
- Ce handoff.

## Validations exécutées
- Passe à blanc locale : la route sert 200, et les cartes servies sont identiques à celles du module pur.
- Lecture en production : la route sert 200, et la cohérence avec le module pur est vraie.
- T1 `npm run check:rapide` avant le commit.

## Problèmes ouverts
- Le plafond de cinq cartes est atteint dès la mise en service (9 dossiers restent après les exclusions). Ce n'est pas un défaut : aucune décision n'est demandée.
- La ligne `20261104-2352-d` passe à `close` au merge de cette PR (intégrateur).

## Prochaine action exacte
CI vert (`wn-attendre-ci` en fond), revue de la tête (CodeRabbit, sinon PR-Agent, D-393), verdict sur chaque commentaire, puis déclaration « prête @<sha> » avec la ligne `20261104-2352-d`.

## Interdits encore actifs
- Ni migration ni `schema.prisma`. Aucun seuil hors D-440.
- Production en lecture seule, par conteneur `scalingo run -d`. Agrégats masqués sous cinq dossiers (D-298). Aucun identifiant de dossier couplé à des mesures dans le dépôt.
- Fixtures Sophie Nicola, Jennifer Martin, Michel Dogné seulement.
- Ne pas merger (essai D-373).
