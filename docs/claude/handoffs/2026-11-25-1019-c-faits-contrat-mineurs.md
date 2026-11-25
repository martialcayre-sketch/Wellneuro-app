# Handoff — 2026-11-25 — File C, lot `faits-contrat-mineurs` : faits du contrat transcrits mot pour mot (D-537 §9)

## Branche et état du dépôt

- Branche `c-faits-contrat-mineurs`, avancée par `--ff-only` sur
  `origin/main` (68c0d494a), dans le worktree
  `.claude/worktrees/suivi-c-h74-frise`. Session concurrente : cycle en
  `git`/`gh` direct.
- Documents seuls : aucun code, aucune migration, aucun drapeau, pas de
  release-db.
- D-454 : la PR est déclarée « prête @<sha> », puis l'intégrateur la merge.
- Boîte C : vide au démarrage, rien à accuser. Le lot est inscrit au carnet
  (`faits-contrat-mineurs`, file C, `pris`).

## Objectif

Transcrire mot pour mot, dans la rubrique 4 du dossier RGPD, le texte du
responsable sur la durée, l'engagement et l'arrêt de l'accompagnement
(question `20261117-2200-c-4`, réponse « Je les écris, la session les
transcrit mot pour mot »).

## Décisions prises

- Le responsable a écrit sa première phrase le 2026-11-20 : l'activité n'est
  pas commerciale, et son intervention est bénévole.
- Elle ne couvrait pas la trame. Le responsable a alors demandé de couvrir
  les points d'après la doctrine et le notebook 00. La session a montré que
  ces sources ne décrivent pas l'offre :
  - la doctrine est clinique ;
  - le notebook 00 « Gouvernance du corpus » n'est que dans NotebookLM.

  Le responsable a choisi « Je les écris ».
- À sa demande, la session a reposé les points avec des mises en situation
  et des exemples de forme, présentés comme non recommandés.
- Le 2026-11-25, il a répondu aux huit points. Le texte est transcrit tel
  quel, orthographe comprise. Seuls les retours à la ligne sont de la
  session.
- La liste des points posés figure à côté, hors citation, pour que les
  numéros se lisent.

## Fichiers modifiés

- `docs/DOSSIER_RGPD.md` :
  - rubrique 4 : paragraphe « Faits du contrat », après « Consentement aux
    données de santé » ;
  - trois renvois datés : admission d'un premier mineur, R2 « Nécessaire »,
    R2 conclusion ;
  - rubrique 14 : ligne 4.
- `docs/decisions/D-537.md` : une ligne datée au §9.
- `docs/claude/plan-journal/H79/2026-11-25-01-faits-contrat-mineurs.md`.
- `changelog.d/2026-11-25-faits-contrat-mineurs.md`.
- Ce handoff.

## Validations exécutées

- Fait vérifié au code : `web/src/lib/patient/cycleDeVie.ts`. Seul le
  praticien clôt un suivi, et la phase `desactive` est distincte de
  `suivi_cloture`.
- Contrôle du texte transcrit : il ne contient ni identité réelle, ni
  donnée de dossier.
- `npm run check` : voir la PR.

## Problèmes ouverts — dépendances débloquées, sans conséquence tirée ici

- **R2, réexamen de la nécessité de l'accord parental** (D-537 §4, rubrique
  4 « Analyse de proportionnalité ») : il est débloqué et revient à la file
  C. Il n'est pas inscrit au carnet dans ce lot.
- **Qualification d'« acte usuel »** (D-537 §1 et §9) : elle n'est pas
  tranchée. Elle dépend des mêmes faits et va avec R2.
- **Notice adaptée** (`notice-mineurs-15-17`) : toujours bloquée par
  J3-mineurs (file A). Elle pourra s'appuyer sur ces faits.
- Restent avant la première admission :
  - J3-mineurs ;
  - la notice adaptée ;
  - la validation de l'AIPD (`aipd-mineurs-validation`, bloqué) ;
  - l'accord des deux titulaires.
- La question `20261117-2200-c-4` se close au merge.

## Prochaine action exacte

1. `npm run check`, commit, push, PR (`--body-file`). Lancer
   `wn-attendre-ci` en fond, puis `wn-revue-pr-agent`, avec un verdict par
   constat.
2. Déclarer « prête @<sha> » à la boîte `integrateur`, puis mettre à jour
   le lot (`pr`, `handoff`).
3. Au merge : clore `-c-4`. Ensuite, inscrire R2 au carnet ou le prendre,
   selon le responsable.

## Interdits encore actifs

- Ne pas rédiger, compléter ni reformuler le texte du responsable.
- Ne pas lever la porte 24. N'écrire aucune D-xxx de la file A, et ne pas
  cadrer J3-mineurs.
- Ne toucher ni la frise ni cg (H63). Aucune identité réelle, aucune
  métrique de dossier.
- Aucun mot du 2B ne change.
- N'admettre aucun mineur : la pause reste en service.
- L'AIPD ne se tient pas pour validée.
- Citer l'avis comme un « avis GPT », sans le recopier.
