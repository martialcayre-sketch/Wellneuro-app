# Handoff — 2026-11-07 — Skill tiers `ui-ux-pro-max`, réduit à la relecture

## Branche et état Git

`chore/skill-ui-ux-pro-max`, worktree `.claude/worktrees/skill-ui-ux-pro-max`, partie de `origin/main@2e788656`. Le `main` local n'est pas touché.

## Objectif

Le responsable veut toutes les relectures avec ce skill, posé dans le projet par PR, après le verdict `/wn-tiers`.

## Décisions prises

- Verdict `/wn-tiers` : SOUS RÉSERVE, au commit `b7d5353e` ; détail et réserves dans `changelog.d/2026-11-07-skill-ui-ux-pro-max.md`.
- Périmètre projet, choisi par le responsable.
- `disable-model-invocation` non posé, description restreinte à la relecture : recommandation de l'assistant, annoncée au responsable, sans objection à ce stade.
- Le skill s'ajoute aux relectures bloquantes de `wn-merge`, sans les remplacer. Il n'est pas câblé dans le cycle.
- Pas de `D-xxx` : même traitement que `frontend-design` (`source` en frontmatter, détail au changelog).

## Fichiers modifiés

- `.claude/skills/ui-ux-pro-max/` : 46 fichiers amont, dont `SKILL.md` adapté, et `LICENSE.txt`.
- `.gitignore` : exception limitée à `.claude/skills/ui-ux-pro-max/data/**/*.csv`.
- `changelog.d/2026-11-07-skill-ui-ux-pro-max.md` et ce handoff.

## Validations exécutées

- Empreinte des 46 fichiers à la copie : `b3485272…`, celle du contenu relu.
- `diff -rq` avec l'amont : seuls `SKILL.md` et `LICENSE.txt` diffèrent ; `scripts/tests/` et `validate_data.py` sont absents.
- Recherches réelles `--domain ux`, `--domain icons` et `--stack nextjs`, depuis la racine et depuis `web/` : résultats rendus, aucun `__pycache__`, aucun `design-system/`.
- `git check-ignore` : `web/foo.csv`, `exports/x.csv` et `.claude/skills/autre/x.csv` restent ignorés.
- `check_no_secrets.sh` : OK. `skill-bang-cwd` et `skill-cross-invocation`, bancs et contrôles : 66 tests passés, 21 skills.
- `wn-kit-doctor` : les lignes sur les skills sont vertes ; 40/43 au total, à l'identique sur `origin/main` sans ce skill (un motif de variable de base de données dans un document de campagne, hors de ce diff).
- `.gitignore` a des fins de ligne mêlées (CRLF et LF). Une première édition y a retiré la règle du cache Compl'Alim, vue au diff avant tout push : l'exception a été réinsérée octet par octet depuis `origin/main`, et le diff final n'y compte que 2 ajouts. Cause exacte de ce retrait non établie : relire ce fichier au diff après toute édition.
- Non lancés : T1 et T2, le diff ne touchant ni `web/`, ni UI, ni API. Le CI fait foi.

## Problèmes ouverts

- Le rejet du 2026-09-06 est levé par demande du responsable, sans décision écrite : à consigner si le skill reste.
- `references/quick-reference.md` cite encore `--design-system` ; le cadre du `SKILL.md` l'emporte, le fichier restant identique à l'amont.
- La copie de l'environnement cloud n'est pas couverte par le verdict. Elle a été lancée avant tout contrôle, selon le rapport de cette session.
- Le constat à l'écran de la série « rails et menus » attend toujours le bloc du responsable. Il n'est pas traité ici et ne dépend pas de ce skill.

## Prochaine action exacte

CI et revue de la PR, puis merge sur demande du responsable. Ensuite, reprendre le constat dès que son bloc « Ce que j'ai vu » est fourni.

## Interdits encore actifs

- Ne pas lancer `--persist` ni `--design-system`, ni utiliser le skill pour choisir style, palette ou police.
- Ne pas copier `stack/`, `cli/` ni passer par `npx ui-ux-pro-max-cli`.
- Une nouvelle version amont repasse par `/wn-tiers` : le verdict porte sur un commit.
- Ne pas élargir l'exception de `.gitignore` : `*.csv` y protège les exports de données.
