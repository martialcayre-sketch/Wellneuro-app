# Handoff — 2026-09-19 — Le drapeau qui n'avait pas fermé, le verrou du sélecteur, et le plan mis au dépôt

## État Git

Branche `wn-cadrage-chaine-documentaire-2026-09-19`, partie de `origin/main`,
PR #1199 ouverte. Elle porte le cadrage, cette clôture, et la correction d'une
inversion relevée en revue.

Trois lots ont été mergés dans la même séance, **et les deux premiers sans leur
clôture** — voir les problèmes ouverts :

- `40c149e2` — amendement de `D-226` (PR #1196) ;
- `d171c487` — lot H, le verrou du sélecteur (PR #1198).

## Objectif en cours

Rendre au dépôt ce que la séance a établi, et ouvrir les lots de l'audit de la
chaîne documentaire dans l'ordre arbitré.

## Décisions prises

**Le geste de drapeau n'avait pas fermé la porte.** Une génération
`auto_rideau_second` a eu lieu le 2026-09-17 à 20:39:52 UTC, 1 h 50 après la
recréation des conteneurs. La garde était pourtant fail-closed et posée en
première ligne. Ce qui a fermé est le retrait du CODE, déployé à 22:08:04 UTC.
La cause de la non-propagation **n'est pas établie** et `D-226` le dit ainsi :
le CLI n'expose aucun historique des changements de variables.

**La réserve dépasse ce drapeau.** Variable absente de `env` et conteneurs
recréés ne CONSTATENT pas un effet, ils le rendent plausible. Seul le
comportement constate, et il lui faut un témoin — ici il n'y en a pas : aucune
réponse de questionnaire depuis le retrait du code.

**Le seuil de la requête de constat a changé.** Celui du geste de drapeau
(`18:49:15 UTC`) rend `1` pour toujours ; celui du retrait du code
(`22:13:00 UTC`) doit rendre `0`. Le fragment de changelog porte les deux, avec
ce que chacune mesure.

**Lot H.** Le dossier de l'URL s'applique une fois, suivi par son identifiant et
non par un booléen. Une course préexistante que le verrou rendait inatteignable
est fermée au passage : deux lectures de synthèses en vol pouvaient se croiser.

**Le plan en dix lots entre au dépôt** en cadrage plat, sans campagne : pas
d'état machine, pas d'entrée en file d'attente.

## Fichiers modifiés

Sur cette branche : `docs/claude/campagnes/CADRAGE_CHAINE_DOCUMENTAIRE_2026-09-19.md`,
`docs/claude/SESSION_LOG.md`, et ce fragment.

Déjà sur `main` : `docs/DECISIONS.md` (amendement de `D-226`),
`docs/FEATURE_FLAGS.md`, `docs/DOSSIER_RGPD.md`,
`changelog.d/2026-09-17-retrait-generation-automatique.md`,
`web/src/components/SynthesePanel.tsx`, `web/src/components/SynthesePanel.test.tsx`,
`changelog.d/2026-09-19-verrou-selecteur-patient.md`.

## Validations exécutées

T1 vert à chaque PR, **depuis `web/`** — le script n'existe pas ailleurs et la
racine rend 254. T2 vert sur le lot H, E2E Chromium et WebKit compris. Codes de
sortie lus dans le fichier : la notification de tâche a annoncé « exit code 0 »
sur une attente CI qui rendait `2`, et c'est le fichier qui a révélé un conflit.

**Cinq mutations sur le lot H**, chacune tuant précisément sa cible : le bug
d'origine, un demi-correctif qui répare l'affichage sans la relecture, l'arrivée
cassée, un booléen à la place de l'identifiant, la garde de génération retirée.
Sauvegarde par `cp`, restauration vérifiée par empreinte.

## Problèmes ouverts

**LA GARDE DE CLÔTURE A ÉTÉ CONTOURNÉE TROIS FOIS.**
`.claude/skills/wn-merge/SKILL.md` § 96 exige qu'une PR porte `SESSION_LOG.md`
ET un fragment de handoff, ou le merge est refusé. La garde vit dans le skill,
pas dans le CI : `gh pr merge` appelé directement passe outre. #1191 portait sa
clôture, #1196 et #1198 non. Constat de revue, pas de découverte propre.

**Trois synthèses automatiques validées n'ont jamais été envoyées.** Au dossier,
sans booklet expédié, invisibles faute de liste inter-patients — motif concret
du lot G, qui cesse d'être théorique.

**113 fichiers restent en CRLF** alors que `.gitattributes` déclare
`* text=auto eol=lf`. Chacun piège la prochaine écriture par script : le symptôme
est un `--stat` qui rend ~2N lignes pour un fichier de N. Le remède est
`git hash-object -w --no-filters`. Les renormaliser est une opération de dépôt,
non engagée.

**La rubrique 5 du registre des traitements** reste à mettre à jour, hors dépôt.

## Prochaine action exacte

Le `package.json` racine qui réexpédie vers `web/` — arbitrage rendu. Vérifier
d'abord ses trois effets de bord : détection de racine de paquet par les outils,
risque de `package-lock.json` parasite, et les étapes de CI qui font `cd web`.
Si l'un rend le remède pire que le mal, le dire plutôt que de livrer une
conformité de façade.

Ensuite, les lots de l'audit dans l'ordre du cadrage : A, B, C.

## Interdits actifs

Aucune modification de production sans permission explicite. Force-push exclu.
Aucun nom ni e-mail de patient réel dans le dépôt ; identités fictives limitées
à Sophie Nicola, Jennifer Martin et Michel Dogné (`AGENTS.md` § 2). Aucun seed ni
E2E contre un dossier réel. Aucun `schema.prisma` ni migration sans demande
explicite. Aucune donnée clinique patient publiée en artefact.
