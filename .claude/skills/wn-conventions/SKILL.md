---
description: Audite les fichiers d'instructions WellNeuro (CLAUDE.md, AGENTS.md) et les définitions d'agents et de skills — dérive, fichier que rien ne lit, règle en prose qui devrait être exécutable. Lecture seule.
argument-hint: "[fichier, agent ou skill ; vide = tout]"
disable-model-invocation: true
context: fork
agent: Explore
effort: medium
---

# WellNeuro — audit des règles et des définitions d'agents

!`cd "$(git rev-parse --show-toplevel)" && git log -1 --format='%ad  %s' -- CLAUDE.md AGENTS.md .github/copilot-instructions.md`
!`cd "$(git rev-parse --show-toplevel)" && ls .claude/agents/ .claude/skills/ .github/agents/ .github/instructions/ .github/prompts/`

Cible : `$ARGUMENTS` (vide : tout le parc ci-dessous)

## Le parc est à deux étages — les auditer ensemble

Ce dépôt instruit **deux** familles d'agents, et n'en auditer qu'une laisse
l'autre dériver seule :

| Lecteur | Fichiers |
|---|---|
| Claude Code | `CLAUDE.md`, `.claude/agents/*.md`, `.claude/skills/wn*/SKILL.md`, `.claude/settings.json` |
| Copilot — qui **revoit et merge** les PR | `.github/copilot-instructions.md`, `.github/instructions/*.instructions.md`, `.github/agents/*.agent.md`, `.github/prompts/*.prompt.md` |
| Les deux | `AGENTS.md` |

Le second étage est le plus facile à oublier — il n'est jamais chargé dans la
session qui l'audite — et le plus coûteux à laisser dériver, puisqu'il instruit
le relecteur. Ne jamais rendre un audit qui ne l'a pas ouvert.

**Un `applyTo:` est une affirmation vérifiable, pas une intention.** Un glob de
`.github/instructions/` qui ne matche aucun fichier existant est une règle qui
ne s'applique jamais, et rien ne le signale. Développer chaque glob contre le
dépôt réel. Le 2026-07-31, `clinical.instructions.md` visait
`web/src/lib/questions/**` — un répertoire qui n'existe pas — alors que le
catalogue et le moteur de scoring tiennent dans `web/src/lib/questions.ts` :
la garde clinique ne couvrait pas le fichier clinique.

Lecture seule. Rendre des écarts d'adhérence, jamais des préférences de style.

## 1. Qui lit ce fichier — et la question ne se répond pas dans un seul dossier

Premier contrôle, et le plus rentable. Pour chaque fichier d'instructions :
**qui le charge ?** Chargement automatique déclaré, ou référence depuis un
autre fichier de règles — **des deux étages**. Aucun des deux : le fichier est
mort, et ses règles avec lui, y compris celles qui n'existent nulle part
ailleurs.

**Chercher la référence dans tout le dépôt, jamais dans un seul fichier.** Le
2026-07-31, `AGENTS.md` a été déclaré orphelin sur la foi d'un `grep` dans le
seul `CLAUDE.md` ; il était en réalité chargé depuis
`.github/copilot-instructions.md`, donc servi au relecteur des PR. Le
diagnostic « personne ne le lit » était faux, et il menait à la mauvaise
conclusion : le vrai défaut n'était pas un fichier mort mais **un instantané
périmé servi à un agent** — plus grave, et corrigé autrement.

Une fois le lecteur identifié, deux cas :

- **lu et périmé** — le pire état : ses affirmations fausses circulent. Le
  ramener à ce qui ne peut pas dériver, ou le remettre à jour ;
- **lu par personne** — extraire les règles uniques vers un fichier vivant
  avant toute autre décision. Ne jamais retirer sans confirmation.

## 2. Dérive : ce que le fichier affirme contre ce que le dépôt fait

Vérifier chaque affirmation datée ou vérifiable contre le code, la
configuration et `git log` — chemin qui n'existe plus, commande absente de
`package.json`, variable d'environnement retirée, décision annulée depuis.
Une affirmation invérifiable se signale comme telle plutôt que d'être acceptée.

## 3. Chaque ligne doit porter quelque chose

Couper ce qui se déduit de la lecture du code ou des conventions générales du
langage. Un fichier de règles long se lit moins bien qu'un fichier court, et
son coût est payé à **chaque** session. Signaler les redites entre `CLAUDE.md`,
`AGENTS.md` et `.github/copilot-instructions.md` : la même règle en trois
exemplaires dérive toujours d'au moins un côté, et c'est le côté qu'on ne
relit pas.

## 4. Définitions d'agents — des deux étages

Pour chaque `.claude/agents/*.md`, `.claude/skills/wn*/SKILL.md` **et**
`.github/agents/*.agent.md` :

- **un métier par définition** — un agent qui fait deux choses n'est appelé pour
  aucune ;
- **outils au minimum nécessaire** — un agent qui se dit en lecture seule ne
  déclare ni écriture, ni exécution. Rapprocher le frontmatter du texte : c'est
  le frontmatter qui décide, le texte ne fait qu'exprimer une intention ;
- **une seule convention de nommage d'outils par famille** — deux syntaxes
  coexistantes dans un même dossier signifient qu'au moins une est ignorée
  silencieusement ;
- **`model` et `effort` explicites** côté Claude, cohérents avec `/wn-model` ;
- **la `description` dit *quand* déléguer**, pas ce que l'agent sait faire :
  c'est elle, et elle seule, qui décide de l'appel ;
- **pas de doublon fonctionnel** — deux définitions qui se recouvrent produisent
  un routage arbitraire. Le repérer, nommer celle qui garde le périmètre.

Vérifier aussi que les **paires d'agents équivalents** entre les deux étages
n'ont pas divergé : un `Reviewer` qui ignore une règle que son homologue
applique rend deux verdicts différents sur le même diff.

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

1. **Critique** — fichier lu mais périmé ; règle unique portée par un fichier
   que rien ne lit ; `applyTo` qui ne matche aucun fichier ; affirmation fausse
   pouvant conduire à un geste risqué ; agent sur-doté en outils.
2. **À corriger** — dérive, doublon, `description` qui ne dit pas quand
   déléguer, modèle absent.
3. **Optionnel** — allègements, redites sans conséquence.

Chaque constat : fichier et ligne, règle enfreinte, correction exacte. Ne
modifier aucun fichier ; ne proposer aucune suppression sans confirmation.
