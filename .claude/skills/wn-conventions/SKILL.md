---
description: Audite les fichiers d'instructions WellNeuro (CLAUDE.md, AGENTS.md) et les définitions d'agents et de skills — dérive, fichier que rien ne lit, règle en prose qui devrait être exécutable. Lecture seule.
argument-hint: "[fichier, agent ou skill ; vide = tout]"
disable-model-invocation: true
context: fork
agent: Explore
effort: medium
---

# WellNeuro — audit des règles et des définitions d'agents

!`git log -1 --format='%ad  %s' -- CLAUDE.md AGENTS.md`
!`ls .claude/agents/ .claude/skills/`

Cible : `$ARGUMENTS` (vide : `CLAUDE.md`, `AGENTS.md`, `.claude/agents/*.md`,
`.claude/skills/wn*/SKILL.md`, `.claude/settings.json`)

Lecture seule. Rendre des écarts d'adhérence, jamais des préférences de style.

## 1. Un fichier de règles que rien ne référence est un fichier que rien ne lit

C'est le premier contrôle, et le plus rentable. Pour chaque fichier
d'instructions : **qui le charge ?** Chargement automatique déclaré, import
depuis un autre fichier de règles, ou mention explicite dans `CLAUDE.md`. Aucun
des trois : le fichier est mort, et **ses règles avec lui — y compris celles
qui n'existent nulle part ailleurs**.

Le 2026-07-31, `AGENTS.md` était dans cet état : dernière modification le
2026-07-14, aucune mention dans `CLAUDE.md`, une architecture d'avant le corpus
RAG, la migration HDS/Scalingo et la règle « une session = un worktree ». Il
portait pourtant seul trois règles de gouvernance du scoring (mise à jour de
`docs/questionnaires-drive-mapping.md`, fixture obligatoire dans
`scripts/check_questionnaire_certification.js` pour un questionnaire
`certifié`, métadonnée `certification` dans `scoresJson`). Une règle vraie dans
un fichier mort ne protège de rien.

Pour chaque fichier orphelin, rendre les trois issues et recommander une :
le raccrocher (référence depuis `CLAUDE.md`), en extraire les règles uniques
vers un fichier vivant, ou le retirer. Ne jamais retirer sans confirmation.

## 2. Dérive : ce que le fichier affirme contre ce que le dépôt fait

Vérifier chaque affirmation datée ou vérifiable contre le code, la
configuration et `git log` — chemin qui n'existe plus, commande absente de
`package.json`, variable d'environnement retirée, décision annulée depuis.
Une affirmation invérifiable se signale comme telle plutôt que d'être acceptée.

## 3. Chaque ligne doit porter quelque chose

Couper ce qui se déduit de la lecture du code ou des conventions générales du
langage. Un fichier de règles long se lit moins bien qu'un fichier court, et
son coût est payé à **chaque** session. Signaler les redites entre `CLAUDE.md`
et `AGENTS.md` : la même règle en deux exemplaires dérive toujours d'un côté.

## 4. Définitions d'agents et de skills

Pour chaque `.claude/agents/*.md` et `.claude/skills/wn*/SKILL.md` :

- **un métier par définition** — un agent qui fait deux choses n'est appelé pour
  aucune ;
- **outils au minimum nécessaire** — un agent en lecture seule ne déclare ni
  `Write`, ni `Edit`, ni un `Bash` sans restriction ;
- **`model` et `effort` explicites**, cohérents avec `/wn-model` ;
- **la `description` dit *quand* déléguer**, pas ce que l'agent sait faire :
  c'est elle, et elle seule, qui décide de l'appel ;
- **pas de doublon fonctionnel** — deux skills qui se recouvrent produisent un
  routage arbitraire. Le repérer, nommer celui qui garde le périmètre.

## 5. Une règle en prose qui ne tient pas doit devenir exécutable

C'est le contrôle le plus utile et le plus souvent omis. Chercher les règles
**déjà écrites et enfreintes quand même** : un rappel réécrit une deuxième fois
dans un fichier de règles est le signal, pas la solution.

Une règle qui peut devenir un hook, une permission, un test ou une étape de
`npm run check` doit l'être — et alors **disparaître de la prose**, qui ne la
rappelle plus. Le lint est l'exemple du dépôt : présent en CI, absent de
`npm run check`, il a laissé passer une PR verte en local et rouge en CI
(LOT-01b) ; ce qui l'a réglé n'est pas un paragraphe mais une commande.

Rendre, pour chaque règle candidate : le mécanisme visé (hook, permission,
test, script), et ce qui reste à écrire.

## Sortie

1. **Critique** — fichier orphelin portant des règles uniques ; affirmation
   fausse pouvant conduire à un geste risqué ; agent sur-doté en outils.
2. **À corriger** — dérive, doublon, `description` qui ne dit pas quand
   déléguer, modèle absent.
3. **Optionnel** — allègements, redites sans conséquence.

Chaque constat : fichier et ligne, règle enfreinte, correction exacte. Ne
modifier aucun fichier ; ne proposer aucune suppression sans confirmation.
