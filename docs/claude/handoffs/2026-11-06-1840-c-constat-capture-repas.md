# Handoff — 2026-11-06 — File C, place 11 : constat de la photo du repas (D-437 §7)

## Branche et état Git

Branche `docs/h83-constat-capture-repas`, partie d'`origin/main` f52afad1, dans le worktree
`.claude/worktrees/c-constat-capture-repas`. C'est une session concurrente : le cycle se fait en
`git`/`gh` direct, sans `/wn-*`. La PR est de doc seule : sans code, sans migration, sans
release-db.

## Objectif

Consigner le constat de [[D-437]] §7 de `WN_PORTAIL_CAPTURE_REPAS`. Le responsable a posé le drapeau
le 2026-11-04. Le bouton est resté invisible jusqu'au correctif de l'en-tête (#1878).

## Décisions prises

- Le constat est tenu pour fait. Le geste du responsable a été fait sur Android, un Pixel 9 Pro,
  sur un dossier de test majeur : photo prise, journée enregistrée, galerie sans photo. iOS est
  l'appareil manquant ; D-437 §7 l'admet s'il est noté.
- La journée a été lue par identifiant, depuis le merge de #1878 (12:27 UTC) : une journée, au
  canal portail, avec les clés du contrat seules et aucune trace d'image. Ma requête comptait
  une clé « hors contrat » : c'est `contractVersion`, présente sur toutes les journées du
  dossier. Il s'agit d'un oubli de ma liste de contrôle, pas d'un écart.
- Le nitpick de CodeRabbit et le constat de PR-Agent sur #1878 sont reportés au lot suivant,
  sur la fiche H83 : l'assertion `featurePolicy` dans l'E2E de l'agenda, et une garde contre
  un script d'une autre origine sur la route du questionnaire.

## Fichiers modifiés

- `docs/claude/plan-journal/H83/2026-11-06-02-constat-capture-repas.md` (neuf)
- `docs/FEATURE_FLAGS.md` (ligne `WN_PORTAIL_CAPTURE_REPAS`)
- ce handoff

## Validations exécutées

- `curl -sI` en production : `camera=(self), microphone=(), geolocation=()` sur la route du
  questionnaire, `camera=()` sur le hub.
- Deux lectures en conteneur détaché, en transaction `READ ONLY` : le constat en agrégats, puis
  les noms de clés seuls, sans aucune valeur. Aucune écriture.

## Problèmes ouverts

- iOS n'a pas été observé.
- Un patient qui a refusé la caméra ne voit pas le bouton, et rien ne lui dit pourquoi
  (D-437 §6, non rouvert).
- Il faut porter les deux points de #1878 dans le lot qui suit, sur la fiche H83.

## Prochaine action exacte

CI de cette PR par `node scripts/wn-attendre-ci.mjs <N>` en tâche de fond, puis revue sur la tête
et « prête @<sha> », sans merger (essai D-373). Ensuite, la ligne a11 de la page de suivi de la
file C passe à « fait ».

## Interdits encore actifs

- L'assistant ne pose aucun drapeau et ne redémarre rien.
- La production se lit seulement, par conteneur détaché et en agrégats ; aucune fixture pour un
  constat ; aucun nom ni e-mail de dossier dans le dépôt.
- Aucune IA, aucun texte patient neuf, aucune migration ; aucun lien d'artefact dans ce dépôt
  public ; aucun merge par la file C.
