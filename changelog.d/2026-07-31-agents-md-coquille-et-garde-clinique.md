### `AGENTS.md` cesse de décrire pour ne plus dériver ; la garde clinique de Copilot visait un répertoire qui n'existe pas

**Le diagnostic de la veille était faux, et c'est ce qui rend le correctif
différent.** `AGENTS.md` avait été déclaré orphelin sur la foi d'un `grep` dans
le seul `CLAUDE.md`. Il était en réalité chargé depuis
`.github/copilot-instructions.md` (« Lire `AGENTS.md`, `CLAUDE.md` et
`docs/claude/PROJET_CONTEXTE.md` avant une tâche structurante ») — donc **servi
au relecteur des PR**, avec une architecture arrêtée au 2026-07-14 : ni corpus
RAG, ni migration HDS, ni règle du worktree. Pas un fichier mort : un
instantané périmé lu par un agent, ce qui est pire, et se corrige autrement.

**Il est ramené de 86 lignes à ce qui ne peut pas dériver** — les cinq interdits
dont la violation ne se rattrape pas (secret, donnée patient, migration,
logique clinique, changement minimal) et un tableau de renvois. Tout ce qui
décrivait quelque chose est parti : architecture, routes, commandes, dates.
La règle qui l'a fait regonfler une première fois est désormais écrite **dans le
fichier**, pas dans le journal : rien ici qui soit déjà écrit ailleurs, rien de
datable.

**Le crible qui s'ensuit trouve mieux que ce qu'il cherchait.**
`.github/instructions/clinical.instructions.md` — la garde qui protège les
questions, cotations et seuils côté Copilot — s'appliquait à
`web/src/lib/questions/**`. **Ce répertoire n'existe pas.** Le catalogue et le
moteur de scoring tiennent dans `web/src/lib/questions.ts`, 193 Ko, un fichier.
Le glob ne matchait rien : depuis sa création, la garde clinique ne couvrait
pas le fichier clinique, et rien ne pouvait le signaler — un `applyTo` qui ne
matche aucun fichier ne produit ni erreur, ni avertissement, ni trace. Il vise
désormais `web/src/lib/questions*` en plus du répertoire, au cas où il naîtrait.

La même garde récupère les règles de gouvernance qu'`AGENTS.md` portait seul et
que le rétrécissement aurait fait disparaître côté Copilot : mise à jour de
`docs/questionnaires-drive-mapping.md`, fixture obligatoire pour un
questionnaire `certifié`, métadonnée `certification` dans `scoresJson` — plus
la règle qui a coûté un plafond à 50 sur le Q_ALI_01, **une absence de réponse
rend non scoré, jamais `0`**.

**`/wn-conventions` apprend les deux étages.** La skill livrée quelques heures
plus tôt ne regardait que `.claude/` — soit la moitié du parc, et pas celle qui
revoit les PR. Elle couvre maintenant `.github/copilot-instructions.md`,
`instructions/`, `agents/` et `prompts/`, développe chaque `applyTo` contre le
dépôt réel, et compare les paires d'agents équivalents entre les deux étages :
un `Reviewer` qui ignore une règle que son homologue applique rend deux
verdicts différents sur le même diff.

Son premier contrôle est réécrit par la même occasion : il enseignait l'erreur
qui vient d'être commise. Chercher le lecteur d'un fichier de règles **dans
tout le dépôt**, jamais dans un seul fichier — et distinguer « lu et périmé »,
qui est le pire état, de « lu par personne ».
