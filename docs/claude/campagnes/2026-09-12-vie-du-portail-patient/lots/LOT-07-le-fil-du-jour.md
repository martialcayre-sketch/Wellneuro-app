---
id: "LOT-07"
titre: "le-fil-du-jour"
statut: "en cours — 2026-09-12"
dépend_de: "LOT-02 (le repère de fraîcheur survit et servira)"
---

# LOT-07 — Le fil du jour, celui que la demande disait

## Pourquoi ce lot existe

Parce que les six premiers ont répondu à côté. Le cadrage de la campagne a lu
« fil du jour de ce qu'il y a à faire » comme un interdit — au motif que lister
les tâches rouvrirait l'écart **E11** — et a construit à la place un
récapitulatif rétrospectif. Le responsable l'a cassé le jour même, en ouvrant
son propre écran : « plus une todo list qu'un calendrier rétrospectif ».

Le détail de la dérive est en tête de `../CAMPAGNE.md`. Ce lot ne le répète pas,
il le répare.

## Ce que le lot livre

`web/src/lib/portail/filDuJour.ts` — une dérivation PURE qui rend une LISTE de
tâches et, quand la liste est vide, un **repos** qui dit pourquoi.

`MonParcoursAccueil` rend la liste **à la place de** « votre étape du moment ».

## La règle, et elle est unique

> Une tâche est un geste que le patient peut poser MAINTENANT, et elle
> **disparaît** quand il l'a posé.

Une liste qui ne se vide jamais cesse d'être une liste de tâches et redevient le
mur de blocs que l'audit a fait démonter. Chaque espèce porte donc sa condition
de disparition — et **aucune n'a été inventée pour ce lot** : toutes existaient
déjà, ailleurs, et étaient déjà bancées là où elles vivent.

| Tâche | Elle disparaît quand | Elle revient quand |
|---|---|---|
| Noter ma nuit | `deriverRappelAgenda` rend `cta: null` — nuit du jour notée | demain matin |
| Noter ma journée | `deriverRappelAgendaAli` rend `cta: null` | le lendemain |
| Commencer / transmettre un recueil | idem, par le même `cta` | selon le rythme du recueil |
| Un questionnaire en attente | l'assignation quitte `a_completer` (transmise, expirée, verrouillée) | si le praticien la déverrouille |
| **Dire ce qui compte pour moi** | la fenêtre de dépôt se ferme — c'est-à-dire **dès que le patient a déposé** (`D-166`) | à la prochaine ancre de cycle confirmée |

Un `cta` nul, côté rappel d'agenda, n'est pas un état dégradé : c'est le mot par
lequel le domaine dit « il n'y a rien à faire aujourd'hui ». Le fil s'en sert
tel quel plutôt que de relire les états un par un — sinon la règle de
disparition existerait à deux endroits et finirait par diverger.

## L'INVITATION À DIRE CE QUI COMPTE — la pièce qui manquait vraiment

C'est le seul reproche du responsable qui porte sur une **absence**, et non sur
un excès : « jamais le patient n'a d'invitation à le saisir ». L'écran existait,
la route existait, le texte du praticien l'attendait.

Le LOT-05 avait essayé un bouton dans la navigation. Il a été retiré le jour
même (#1052) : doublon avec le dossier à deux voix, et surtout **une porte n'est
pas une invitation**.

Elle entre dans le fil **avant les questionnaires**, et c'est un arbitrage :
c'est la seule tâche du fil où le patient **parle** — toutes les autres lui
demandent de remplir. Après les questionnaires, elle ne lui arriverait qu'une
fois tout rempli, c'est-à-dire, pour la plupart des dossiers, jamais.

Elle n'apparaît que si la **fenêtre de dépôt** est ouverte — pas seulement le
drapeau. Une porte peut rester ouverte sur un écran qui explique pourquoi le
dépôt est clos ; une TÂCHE, non : ce serait nommer un geste que `D-166`
refuserait (`D-015`).

## Ce que le lot RENVERSE, et qu'il ne faut pas découvrir plus tard

**La réponse à l'écart E11 sur cette page.** On ne peut pas à la fois ne montrer
qu'une étape et dire au patient tout ce qui l'attend. Le principe **A6-R1**
(« une étape à la fois, pas de hub empilé ») n'est pas abrogé ailleurs ; il est
arbitré ici, en faveur de la demande.

**Ce qui en est gardé : la hiérarchie, pas le masquage.** La première tâche
garde le bouton plein et sa phrase d'appui — c'est elle, l'étape du moment — et
les suivantes descendent en liste de liens sous « Ensuite ». Rien n'est replié :
une tâche cachée sous un `<details>` ne serait pas une tâche.

## Ce que le lot RETIRE

`calculerActionRecommandee` et ses deux `describe`. Elle élisait UNE action ;
`construireFilDuJour` répond à la même question et en donne la liste. Elle n'a
pas été gardée « au cas où » : deux dérivations de « qu'est-ce que le patient a
à faire », lues par le même écran, divergeraient — et la divergence ne se
verrait pas, les deux rendant quelque chose de plausible. Chacune de ses
promesses est rejouée dans `filDuJour.test.ts`.

## Ce que le lot CORRIGE en passant, et qui n'était pas demandé

Un patient dont l'agenda courait et dont la nuit était notée voyait
« Consulter « Mon agenda du sommeil » » **présenté comme son étape du moment** :
une tâche là où il n'y en avait aucune. Le repli « premier à compléter » de
`calculerActionRecommandee` le rattrapait. Le fil rend maintenant
`rien_aujourdhui`, avec la phrase factuelle du recueil — « rien à faire » ne
doit pas se lire « rien ne se passe ».

## Ce que le lot NE fait PAS

- **Les lectures** — nouveau bilan, nouvelle synthèse — n'entrent pas encore
  dans le fil. Elles demandent le repère de fraîcheur du LOT-02, et une règle
  de disparition qui lui soit propre. C'est le lot suivant.
- **Le retrait du journal rétrospectif** (dérivation + écran + drapeau) : lot
  distinct, pour que le diff qui construit ne soit pas celui qui démolit.
- **Compter.** Aucun « 4 choses à faire ». Ce serait un chiffre fabriqué par
  l'écran (`DC-19`) et, surtout, une dette annoncée à quelqu'un qu'on veut
  mettre en mouvement. Un banc l'épingle.
- **Notifier.** Inchangé : le portail se consulte, il ne poursuit pas.

## Le coût, dit d'avance

**Une liste peut être longue.** Un patient à qui l'on a assigné un pack de six
questionnaires verra six lignes. C'est le prix de la demande, et c'est assumé :
il les voyait déjà, dans la section « À compléter », mais présentées comme un
inventaire plutôt que comme ce qu'il a à faire. Le dédoublonnage a été élargi à
tout le fil pour que rien ne s'affiche deux fois.

**L'invitation « ce qui compte » peut stationner.** La fenêtre de dépôt n'a pas
de terme : tant que le patient n'écrit pas, la ligne reste. C'est délibéré —
c'est précisément l'absence qu'on répare — mais c'est la seule tâche du fil qui
puisse rester sans que le patient soit en retard de quoi que ce soit. À
surveiller sur pièces, sur un dossier réel, avant d'en faire une règle.

## L'ORDRE A ÉTÉ ÉCRIT FAUX, ET C'EST L'E2E QUI L'A TROUVÉ

La première version remontait les agendas **jamais commencés** en 2ᵉ position,
au motif qu'« un recueil jamais ouvert est plus urgent qu'un formulaire de
plus ». C'était contredire une doctrine déjà écrite dans `rappelPortail.ts` —
« rien ne se perd à commencer demain », et surtout « le mettre en tête
**enterrerait sans terme un pack assigné** avant une consultation ». Un recueil
de 21 jours devant six questionnaires les repousse de trois semaines.

**Le banc qui devait l'épingler portait le bon titre sur la mauvaise
assertion** : « un agenda jamais commencé ne passe PAS devant un pack assigné »,
et il attendait l'agenda en tête. Un banc dont le titre et l'assertion se
contredisent ne garde rien — il fait passer la violation pour la règle. Aucune
mutation ne pouvait le voir : la mutation éprouve le code contre les bancs,
jamais les bancs contre eux-mêmes.

C'est `portail-parcours.spec.ts` qui l'a attrapé, en tombant sur l'écran de
l'agenda là où il attendait le premier questionnaire du pack. Ordre corrigé :
les recueils à commencer passent **en dernier**.

## DEUX E2E ONT DÛ CHANGER, ET POUR DES RAISONS OPPOSÉES

**`portail-agenda-alimentaire` épinglait le défaut.** Après une journée notée,
il attendait un lien « Consulter « Agenda alimentaire — 21 jours » » mis en
avant. Ce libellé n'existait dans aucun module : `deriverRappelAgendaAli` rend
`cta: null` — il n'y a rien à faire. C'est le repli « premier à compléter » qui
le fabriquait. Le test gardait donc le bug.

**Et sa réécriture a d'abord été fausse elle aussi.** J'y avais mis « Rien à
faire aujourd'hui » : or le fil n'est pas vide sur ce dossier — il porte
l'invitation à dire ce qui compte. Attendre un repos aurait **couplé ce spec à
l'état d'une autre surface** : le jour où `WN_CE_QUI_COMPTE` bascule, il tombe
sans que l'agenda soit en cause. Ce qui est éprouvé maintenant est l'**absence
de la tâche fabriquée**, et rien d'autre.

## Preuve

- T1 vert. **T3 complet** — et non T2 : ce diff touche l'écran d'accueil de tous
  les patients, et deux régressions avaient déjà échappé à un palier plus court.
- **19 mutations jouées, 19 tuées.** Deux survivants d'abord : la distinction
  « périssable / à commencer » n'a d'effet observable que **croisée entre les
  deux familles d'agenda** — un recueil à commencer arrive de toute façon avant
  les questionnaires quand sa famille est seule. Les deux ont été comblés par
  des bancs, **aucun code n'a été retiré pour les faire taire**.
- T3 laisse **un rouge, et c'est `D-049`** : `portail-dossier-deux-voix`,
  iPhone 13/WebKit, `page.goto` expiré à **120 s exactement**, et **aucune
  requête émise** — l'unique occurrence de la route dans la sortie est le
  journal d'appel Playwright, aucune entrée serveur ne la porte. Surface
  qu'aucun fichier de ce diff ne touche. Jamais observé en CI. Ce n'est pas
  présenté comme vert : le CI tranche.
