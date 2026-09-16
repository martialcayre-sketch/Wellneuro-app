# Handoff — 2026-09-16 — Les deux trous laissés ouverts par `D-214` sont fermés

## Branche et état Git

`wn-cloture-revue-handoff-2026-09-16`, branchée sur `origin/main` (`f5a06e9c`).
Diff documentaire : deux fichiers de règle, plus la clôture.

## Objectif

Fermer les deux réserves écrites au merge de `D-214` (`f5a06e9c`) le soir même,
plutôt que de les laisser vieillir : une clause manquante en §1.1, et un « défaut
de classe » qui demandait vérification avant d'être routé ou écarté.

## Décisions prises

**1. Le corps de chaque revue se lit — clause ajoutée en §1.1.** Copilot peut
conclure « Approval recommended » avec `comments generated: 0` et loger un
constat réel dans un bloc « Suppressed comments » de son corps de revue ;
`pulls/<N>/comments` rend alors `[]`. `gh pr view --json reviews` rend ce corps :
lire `.reviews[].body`, jamais s'arrêter au `state`.

**2. Le « défaut de classe » du gabarit de handoff est ÉCARTÉ, sur pièces.**
`/wn-handoff` liste bien les huit rubriques (`SKILL.md:48-57`). Rien n'était
cassé côté outil. Ce qui manquait est la **portée** : le skill porte
`disable-model-invocation`, donc un handoff écrit à la main — les deux du
2026-09-16 le sont — n'hérite d'aucune liste. Les huit rubriques entrent donc
dans `.claude/rules/docs-changelog.md`, armé sur `docs/**`, qui se charge au
moment où l'on écrit un handoff. **Aucun banc ajouté** : ajouter un contrôle
aurait été traiter un défaut d'outil qui n'existe pas.

## Fichiers modifiés

| Fichier | Rôle |
|---|---|
| `.claude/rules/pr-revue-et-release-db.md` | §1.1 : le corps de la revue se lit |
| `.claude/rules/docs-changelog.md` | Les huit rubriques, nommées là où un handoff s'écrit |
| `changelog.d/`, `SESSION_LOG.md`, ce handoff | Clôture |

## Validations exécutées

`node scripts/lib/skill-cross-invocation.mjs` · `node scripts/lib/skill-bang-cwd.mjs` ·
`node scripts/lib/decisions-numerotation.mjs` (214, sans trou) ·
`bash scripts/check_no_secrets.sh` · `node --test scripts/changelog-collate.test.mjs`.
Au CI : à constater sur la PR, `head=` du SNAPSHOT comparé à la tête réelle.

## Problèmes ouverts

- **Aucun pour ce lot.** Les deux réserves de `D-214` sont fermées, l'une par
  correction, l'autre par réfutation sur pièces.
- Le constat de #1161 visait **un seul** handoff — celui qu'elle examinait,
  corrigé dans la même PR (`7ce8e5d7`), qui porte donc les trois rubriques
  depuis. Le même manque a **ensuite** été observé sur celui du même jour à
  21 h 54 : mergé, et **non réécrit** — `handoffs/README.md` interdit de
  réinterpréter un handoff passé pour le faire entrer dans un format posé après
  lui. La règle vaut pour les suivants.

## Prochaine action

Aucune suite due. La séquence ouverte ce soir — poser les règles, les graver,
fermer leurs réserves — est terminée.

## Interdits encore actifs

- **Aucune écriture en production** dans ce lot ; approuver et déclencher
  `release-db` restent des gestes humains.
- **Pas de nouvelle décision** : `D-214` couvre la doctrine, ceci n'en est que
  l'application. Un numéro annoncé sans être écrit ne le réserve pas.
- **Pas de force-push** ; l'autorisation commit/push/PR/merge court jusqu'au
  **2026-09-17**, la production et les arbitrages restant à demander.
