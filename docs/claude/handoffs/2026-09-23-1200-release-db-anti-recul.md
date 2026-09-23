# Handoff — 2026-09-23 — `release-db` ne peut plus faire reculer la production

## 1. Branche et état Git

`wn-release-db-recul-2026-09-23`, worktree `.claude/worktrees/release-db-recul`,
partie de `origin/main` à `2ded4484`. Un commit, PR vers `main`.

## 2. Objectif

Fermer les deux défauts du workflow révélés par le recul de production du
matin : un run sur commit dépassé qui conclut vert fait redéployer ce commit par
Scalingo ; et le remède (`workflow_dispatch` sur `main`) tournait en boucle.

## 3. Décisions prises

- **Déclenchement** : ne s'abstient que si le déploiement le PLUS RÉCENT porte
  le commit.
- **Garde anti-recul** : dernière étape du job, échec volontaire quand la tête
  de `main` à la fin du run n'est plus le commit du run — après la release,
  jamais à sa place. Critère d'abord posé sur le SHA déployé, corrigé en cours
  de lot : une tête arrivée pendant la release restait exposée.
- **Écarté** : refuser d'emblée un run push dépassé — reviendrait sur
  l'arbitrage du 2026-09-06 et prolongerait une fenêtre de migration.
- Pas de numéro `D-xxx` : outillage, aucun arbitrage clinique ni de régime.

## 4. Fichiers modifiés

`.github/workflows/release-db.yml` · `scripts/release-db-comportement.test.mjs`
· `.claude/rules/pr-revue-et-release-db.md` · `docs/DEPLOIEMENT_RELEASE_DB.md`
· `changelog.d/2026-09-23-release-db-anti-recul.md` · ce handoff.

## 5. Validations exécutées

Bancs `release-db` 39/39 ; trois mutations, trois rouges (ancien `grep` ;
`exit 1` → `exit 0` dans la garde ; critère ramené au SHA déployé). T2 `--fast` joué avant la PR (résultat au
corps de PR). T1 isolé a rougi sur `generation.ts` faute de `node_modules` dans
le worktree neuf — pas sur le diff.

## 6. Problèmes ouverts

- Le correctif n'est éprouvé qu'au banc : sa première exécution réelle sera le
  prochain run `release-db`. Relire alors `scalingo --app wellneuro deployments`.
- Check rouge laissé sur `2ded4484` par les runs 35755369469 et 35854104186 —
  sans effet.
- Hypothèse non vérifiée : Scalingo ne déploie pas un commit dont un check
  est en ÉCHEC (cohérent avec l'interblocage du 2026-08-23, jamais constaté
  directement sur un échec).

## 7. Prochaine action exacte

Lire la revue Copilot (corps + `pulls/<N>/comments`), puis merger avec
`--subject`. Ce merge ne touche pas `web/src/lib/clinical/**` ni les
migrations : il ne déclenche pas `release-db`.

## 8. Interdits encore actifs

Ne jamais approuver un run `release-db` resté en attente sur un commit qui n'est
plus la tête : l'annuler et relancer sur `main`. Aucune identité réelle dans le
dépôt. Pas de force-push.
