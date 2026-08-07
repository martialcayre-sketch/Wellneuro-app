### Contexte — `CLAUDE.md` allégé de 27 %, la gouvernance PR/merge sort du fichier toujours chargé

- La gouvernance PR/merge (attente du CI, ressort Copilot, période transitoire,
  exception migration/auth) part dans `docs/claude/REGLES_PR_MERGE.md`, chargé en
  entier par `/wn-merge` au moment utile. Elle pesait 7 417 o (27,8 %) dans un
  fichier relu à **chaque requête de chaque session**, et était de surcroît
  rechargée par le skill : payée deux fois. `CLAUDE.md` garde la décision non
  négociable et renvoie au doc. Texte déplacé verbatim, aucune règle perdue.
- Effet de bord : `/wn-merge` charge désormais le doc par `cat` au lieu
  d'extraire deux plages de `CLAUDE.md` par `sed` sur des titres — le couplage
  qui s'était rompu en silence le 2026-08-07 n'existe plus. Le garde d'ancres de
  `wn-check-automation.sh` devient un garde d'existence.
- Correction factuelle : la liste des fichiers cœur ne nommait que
  `patient/[idAssignation]` comme portail patient, alors que le portail courant
  est `portail/[token]` (`PROJET_CONTEXTE.md:27-28`) — l'erreur était servie à
  chaque session.
- Récits d'incident compressés en règle + date + lien (décommission GAS/Sheets,
  mesure d'économie de contexte, LOT-01b, `WN_ALI_01_SIIN57`, collision E2E Mac,
  PR #547/#548, cinq merges du 2026-07-21, worktree du 2026-07-20).
- Ajout : la délégation existe déjà sous deux formes — `/wn-plan`, `/wn-debug` et
  `/wn-review` portent `context: fork` (contexte isolé, lecture jamais repayée),
  `/wn-lot` prescrit des appels `Agent(...)` explicites. Documenté pour éviter
  d'ajouter une étape de délégation à un skill qui forke déjà.

`CLAUDE.md` : 26 722 o → 19 586 o (−26,7 %).
