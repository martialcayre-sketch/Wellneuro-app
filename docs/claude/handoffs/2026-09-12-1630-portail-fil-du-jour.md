# Handoff — 2026-09-12 — Le fil du jour du portail patient (LOT-07)

## Ce qu'il faut savoir avant tout le reste

**Le cadrage de la campagne `2026-09-12-vie-du-portail-patient` a eu tort, et
il le dit maintenant en tête de son propre `CAMPAGNE.md`.** La demande disait
« un fil du jour de ce qu'il y a à faire » et énumérait des tâches ; le cadrage
a lu cette liste comme un interdit (écart `E11`, principe `A6-R1`) et a
construit un récapitulatif rétrospectif à la place. Six lots, un drapeau, une
table, une route, une doctrine (`D-172`). Le drapeau a servi **treize minutes**.

Ne pas rouvrir ce débat : il est tranché, par le responsable, sur pièce — il a
ouvert son propre écran de patient. Ce qui reste à faire est écrit plus bas.

## État Git

Fusionnées aujourd'hui : **#1052** (retrait des deux boutons), **#1051**
(§ B.4 — le drapeau porte ses DEUX bascules).

**Branche en cours : `portail-fil-du-jour`.** PR à ouvrir.

`main` **local** reste détenu par le worktree `courrier-corps-null` : `gh pr
merge --delete-branch` affiche une erreur de checkout après chaque fusion —
**cosmétique**, le merge passe et l'état de la PR fait foi.

## État de la production

`WN_PORTAIL_JOURNAL` est **ABSENT**, donc fermé. Constaté par conteneur :
`env | grep -c` = 0, et les deux conteneurs web recréés à **13:37:57 UTC** —
sans le redémarrage, l'`env-unset` n'aurait rien éteint. L'écran « ce qui s'est
passé dans votre dossier » n'est servi à personne.

La table `portail_journal_reperes` est en place, vide, RLS active. **Elle
survit délibérément** : c'est elle qui fera disparaître une lecture du fil du
jour une fois faite.

## Ce que ce lot livre

`web/src/lib/portail/filDuJour.ts` — dérivation pure. Elle rend `{ taches,
repos }`. `MonParcoursAccueil` rend la liste **à la place de** « votre étape du
moment ». Le hub sonde `/api/portail/ce-qui-compte` pour savoir si la fenêtre
de dépôt est ouverte.

**La règle est unique** : une tâche disparaît quand le patient l'a faite. Aucune
condition de disparition n'a été inventée — un `cta` nul côté rappel d'agenda
est déjà le mot du domaine pour « rien à faire aujourd'hui ».

`calculerActionRecommandee` est **retirée**, avec ses deux `describe`. Ses
promesses sont rejouées dans `filDuJour.test.ts`.

## Ce qui reste, dans l'ordre

1. **Les lectures dans le fil** — nouveau bilan, nouvelle synthèse, qui
   **disparaissent une fois lues** (arbitrage du responsable). Elles demandent
   le repère de fraîcheur du LOT-02. **Attention au piège** : le repère est un
   SEUL instant par patient (`id_patient` en clé primaire — c'est ce qui rend
   un décompte de présence impossible). Il ne peut donc pas porter un accusé de
   lecture PAR document. La piste qui tient sans migration : lister les
   lectures **de la plus ancienne à la plus récente**, et faire avancer le
   repère à la date de celle qu'on ouvre — la liste se vide alors une par une.
   Le coût, à dire au responsable : lire la plus RÉCENTE d'abord ferait
   disparaître les précédentes.
2. **Le retrait du journal rétrospectif** — `lib/portail/journalDossier.ts`,
   `components/patient/JournalDossier.tsx`, le drapeau `WN_PORTAIL_JOURNAL`, et
   le repli « Depuis votre dernière visite » qui lui servait de filet. **Garder
   le repère et sa route.** Lot distinct : le diff qui construit ne doit pas
   être celui qui démolit.
3. **Amender `D-172`.** Elle décrit du code destiné au retrait, et son §
   « consigner n'est pas assigner » est le raisonnement qui a dévié. Ne pas
   l'effacer — l'amender, en disant ce qui a été appris.

## Une erreur d'ordre, et ce qu'elle enseigne sur les bancs

Les agendas **jamais commencés** avaient été remontés en 2ᵉ position, contre une
doctrine écrite dans `rappelPortail.ts` (« le mettre en tête enterrerait sans
terme un pack assigné »). Le banc censé l'épingler portait le **bon titre sur la
mauvaise assertion** — il attendait l'agenda en tête. Les 19 mutations ne
pouvaient pas le voir : elles éprouvent le code contre les bancs, pas les bancs
contre eux-mêmes. Seul l'E2E du parcours l'a trouvé. Corrigé : à commencer =
dernier.

## Preuve

T1 vert. **T3 complet** (et non T2 : l'écran d'accueil de tous les patients
change, et deux régressions avaient déjà passé un palier plus court).
**19 mutations jouées, 19 tuées.**

Deux survivants d'abord, et ils enseignent quelque chose : la distinction
« périssable / à commencer » n'a d'effet observable que **croisée entre les deux
familles d'agenda** — un recueil à commencer arrive de toute façon avant les
questionnaires quand sa famille est seule. Comblés par des bancs ; **aucun code
retiré pour les faire taire**.

T3 laisse **un rouge, et c'est `D-049`** : `portail-dossier-deux-voix`, iPhone
13/WebKit, `page.goto` expiré à **120 s exactement**, **aucune requête émise**
(l'unique occurrence de la route est le journal Playwright ; aucune entrée
serveur ne la porte), sur une surface qu'aucun fichier du diff ne touche.
Jamais observé en CI. Non présenté comme vert.

## Une erreur de méthode commise aujourd'hui, à ne pas refaire

J'ai lancé la campagne de mutation **sur l'arbre de travail pendant que T2 le
lisait**. T2 est revenu rouge sur un banc qui passait seul : le rouge était
celui d'un mutant, pas du code. Un verdict de suite rendu dans ces conditions
n'est pas rouge, il est **nul**. Une mutation et une suite complète ne partagent
jamais le même arbre.
