# Handoff — 2026-10-28 — Audit 1 : registre des drapeaux contre production

## Branche et état du dépôt

- Branche `docs/audit-drapeaux-registre`, partie de `origin/main` (e57521c4,
  #1757) ; worktree `j3-12e-ingestion`, session concurrente, cycle en
  `git`/`gh` direct.
- PR de documentation seule : ni code, ni migration, ni release-db attendue.

## Objectif

Comparer `docs/FEATURE_FLAGS.md` (§A à §D) à la production Scalingo et au
code, classer les écarts, les faire trancher, puis réaligner le registre.

## Décisions prises

Arbitrages du responsable du 2026-10-28 (Q1 à Q5, toutes sur l'option
recommandée, après une contre-revue Codex) :

- Q1 : `WN_PORTAIL_APPUI_RENVOI` reste posé ; sa pose est consignée ; le
  constat D-353 §5 se fait du 2026-11-01 au 2026-11-07 ; aucune autre
  activation de la file C avant lui.
- Q1 bis : mesure des dossiers exposés (faite).
- Q2 : une seule PR de documentation (celle-ci).
- Q3 : les deux constats partiels vérifiés en base (faits).
- Q4 : quatre interrupteurs d'outillage au registre (§E) ; le banc ne
  change pas.
- Q5 : les e-mails des conditions autour de la coupure du lien magique,
  comptés (fait).

## Fichiers modifiés

- `docs/FEATURE_FLAGS.md` ;
- `docs/claude/plan-journal/H80/2026-10-28-01-pose-relevee-par-audit.md` ;
- `docs/claude/plan-journal/H49/2026-10-28-02-ecart-porte-18.md` ;
- `changelog.d/2026-10-28-audit-drapeaux-registre.md` ;
- ce handoff.

## Validations exécutées

Lectures de production, toutes en lecture seule :

- `scalingo env`, filtré : noms seuls, et valeurs booléennes des seuls
  drapeaux du registre ;
- `env-get` sur les trois drapeaux ouverts ;
- `scalingo timeline` : « Edit Variables », « Delete Variable » et
  « Restart ».

Mesures par conteneur détaché, en agrégats, transaction en lecture seule ou
script sans écriture :

- Q1 bis : 34 dossiers, 3 avec un protocole diffusé, 1 fenêtre croisée,
  0 renvoi ;
- Q3 : 2 choix versionnés ; 3 lectures de fiches rattachées à 3 remises ;
- Q5 : 15 e-mails partis le 20-10, aucun pendant la coupure ; 5 liens
  utilisés, 10 jamais utilisés, ces 10 dossiers ont reçu un nouveau lien
  depuis.

T1 et anti-secrets : voir la PR.

## Problèmes ouverts

- La place 7 attend son constat (fenêtre du 1er au 7 novembre). La file C
  reste bloquée jusque-là, malgré la mention « porte 18 levée » de #1757.
- La pose de `WN_PORTAIL_APPUI_RENVOI` vient du compte du responsable ; la
  session ou le geste d'origine n'est pas identifié.
- La chronologie Scalingo n'a pas pu être lue en entier (limite de débit) :
  la date de retrait de `WN_BIO_EXTRACTION_ASYNC` n'est pas connue.
- Page de l'audit, hors dépôt :
  https://claude.ai/artifact/B7hACzMmQ4DEKiRhCywpcU

## Prochaine action exacte

CI (`wn-attendre-ci`), revue de la tête (faite par `wn-reviewer` en
dérogation à D-290/D-393 : CodeRabbit en quota, PR-Agent a élagué le
registre de son diff), sonde
`wn-sonde-release-db`, merge `--match-head-commit`. Puis, du 2026-11-01 au
2026-11-07, le constat de la place 7 (D-353 §5).

## Interdits encore actifs

- Production en lecture seule : ni `env-set`, ni `env-unset`, ni `restart`
  par l'assistant.
- Aucun identifiant de dossier ni aucune valeur de secret dans le dépôt.
- Aucune activation de la file C avant le constat de la place 7.
- Ne pas remplir le questionnaire renvoyé du dossier de constat avant sa
  lecture.
