# Handoff — 2026-11-01 — H89 : arbitrage du compte après une reprise (amendement de D-373 §5)

## Branche et état du dépôt

- Branche `docs/h89-arbitrage-reprise`, worktree
  `.claude/worktrees/h89-arbitrage`, partie de `origin/main` a7e9eb44
  (#1796 mergée).
- Texte seul : un amendement de `D-373` §5, un fragment de changelog, un
  fragment du journal de H89 et ce handoff. Ni code, ni migration.

## Objectif

Écrire dans `D-373` §5 l'arbitrage du responsable sur le compte après une
reprise, et corriger les faits du fragment de reprise du 2026-10-31 que la
contre-revue Codex a relevés.

## Décisions prises

- Amendement de `D-373` §5, sur arbitrage du responsable du 2026-11-01
  (question à options, texte proposé par la contre-revue Codex). À la
  reprise, le délai de service de l'arriéré se compte depuis la reprise, et
  les attentes et dépassements antérieurs restent au bilan. Le compteur de
  repli repart de zéro, sans remettre à zéro les trente PR ni les sept
  jours. Écartés : le cumul historique, qui replierait l'essai aussitôt, et
  la clôture de l'essai.
- Le fragment du 2026-10-31 n'est pas réécrit. Ses corrections partent dans
  le fragment de ce jour : chronologie de l'arriéré, durées relevées sur
  GitHub, #1788 classée en collision, méthode du rang de jour actif.
- Le dépassement de #1786 reste le quatrième du bilan. Il tient au constat
  tardif du repli, sans incidence sur son déclenchement.

## Fichiers modifiés

- `docs/DECISIONS.md` (`D-373` §5, paragraphe d'amendement ajouté).
- `changelog.d/2026-11-01-d373-compte-apres-reprise.md` (créé).
- `docs/claude/plan-journal/H89/2026-11-01-01-arbitrage-reprise.md` (créé,
  rang `01` compté sur `origin/main`).
- `docs/claude/handoffs/2026-11-01-1103-h89-arbitrage-reprise.md` (créé).

## Validations exécutées

- Horodatages GitHub relus pour #1775, #1786, #1788, #1790 et #1794 :
  déclarations, annonce de reprise et `mergedAt`.
- `node --test scripts/lib/plan-journal.test.mjs`, le banc du changelog et
  `bash scripts/check_no_secrets.sh --staged` avant le commit.

## Problèmes ouverts

- #1795 (J2-mom) et #1765 sont ouvertes, sans déclaration.
- L'échantillon des trente PR reste à rendre reproductible au bilan final,
  avec la liste des exclusions : publications, #1787, collision #1788,
  merges hors liste.

## Prochaine action exacte

L'intégrateur merge cette PR selon le même cycle : revue de la tête,
`verify`, étapes 7 bis et 7 ter de `wn-merge`. Il poursuit ensuite la
veille des déclarations sous la règle amendée.

## Interdits encore actifs

- Dépôt public : aucun lien d'artefact, aucun coût, aucune identité réelle.
- Aucun checkout ni switch dans le worktree d'une autre session.
- Aucun auto-merge, aucun `/model` pendant l'essai.
- La clôture de la semaine de journal de H86 et le temps 2 de H91 ne
  commencent pas avant le 2026-11-03.
