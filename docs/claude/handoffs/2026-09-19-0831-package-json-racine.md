# Handoff — 2026-09-19 — Les paliers de validation se lancent depuis la racine du dépôt

## État Git

Branche `wn-package-json-racine-2026-09-19`, partie de `origin/main` à
`71e0f808`. Quatrième et dernier des arbitrages rendus en séance.

## Objectif en cours

Rendre exécutable une règle écrite depuis des semaines et oubliée trois fois en
deux jours : « T2 se lance depuis `web/` ».

## Décisions prises

**Un `package.json` racine réexpédie, et ne fait que cela.** `check` et
`test:worktree` n'existaient que dans `web/package.json` ; lancés depuis la
racine du dépôt — répertoire courant habituel d'une session en worktree — ils
rendaient 254 avec « missing script ».

**Le motif n'est pas le confort, c'est un faux vert.** Une tâche de fond a
rapporté ce 254 comme « exit code 0 ». Le palier a été cru passé alors qu'il
n'avait jamais démarré.

**LE RÉEXPÉDITEUR MENTAIT DÈS LE PREMIER JET.** `npm run test:worktree -- --fast`
lancé à la racine devenait `npm --prefix web run test:worktree --fast` : sans le
`--` final dans le script de la racine, npm AVALE le drapeau au lieu de le
transmettre. La séquence **complète** a tourné à la place de la rapide, et **seul
le libellé du journal le trahissait** — « Séquence CI complète verte » au lieu de
« Séquence rapide verte ». Le code de sortie était 0 dans les deux cas. Corrigé
par un `--` terminal sur chaque script, et le banc l'exige désormais.

**Le déploiement a été vérifié AVANT d'écrire, pas après.** Scalingo porte
`PROJECT_DIR=web` et descend donc dans `web/` avant toute détection de buildpack ;
le CI travaille en `working-directory: web` à chaque étape ; aucun
`package-lock.json` n'existe à la racine ; `outputFileTracingRoot` n'est pas
configuré, et Next.js ancre sa racine au lockfile le plus proche, qui reste celui
de `web/`.

## Fichiers modifiés

`package.json` (créé), `scripts/racine-reexpedition.test.mjs` (créé),
`web/package.json` (le banc inscrit au palier d'outillage),
`changelog.d/2026-09-19-package-json-racine.md`, `docs/claude/SESSION_LOG.md`,
et ce fragment.

## Validations exécutées

**T1 et T2 lancés DEPUIS LA RACINE**, ce qui est la preuve de la réexpédition
elle-même : l'en-tête du journal montre `wellneuro-racine@0.0.0` puis
`npm --prefix web run … -- --fast`, et la séquence se déclare « rapide ».
`T1-EXIT=0`, `T2-EXIT=0`, lus dans le fichier.

**Trois mutations sur le réexpéditeur**, chacune tuant exactement une assertion :
une dépendance déclarée, un script réexpédié qui n'existe pas à destination, et
une commande qui diverge de son homologue.

## Problèmes ouverts

**Le banc ne garde pas la LISTE des scripts réexpédiés.** Il vérifie que ceux qui
sont là sont corrects, pas qu'un palier manque. Si `web/package.json` reçoit un
jour un troisième palier, rien ne rappellera de l'ajouter ici. C'est un choix :
exiger l'exhaustivité ferait rougir le banc à chaque script interne ajouté à
`web/`, ce qui le rendrait bruyant puis ignoré.

**113 fichiers restent en CRLF** alors que `.gitattributes` déclare
`* text=auto eol=lf`. Non engagé.

**La garde de clôture de `/wn-merge` n'est exécutée par aucun contrôle CI.**
Elle vit dans le skill ; `gh pr merge` appelé directement passe outre — trois PR
mergées sans elle le 2026-09-19. C'est le pendant exact du défaut que ce lot
corrige, et il reste ouvert.

**La rubrique 5 du registre des traitements**, hors dépôt.

## Prochaine action exacte

Les lots A, B et C du cadrage de la chaîne documentaire, dans cet ordre : faire
charger l'onglet Patient de `/dashboard/documents` par l'aperçu fidèle qui
existe déjà, puis porter les deux mentions réglementaires au rendu, puis faire
lire la note du praticien par la garde de vocabulaire.

## Interdits actifs

Aucune modification de production sans permission explicite. Force-push exclu.
Aucun nom ni e-mail de patient réel dans le dépôt ; identités fictives limitées
à Sophie Nicola, Jennifer Martin et Michel Dogné (`AGENTS.md` § 2). Aucun seed ni
E2E contre un dossier réel. Aucun `schema.prisma` ni migration sans demande
explicite. Aucune donnée clinique patient publiée en artefact. **Ne jamais lancer
`npm install` à la racine du dépôt.**
