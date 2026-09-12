### Le portail patient a un fil du jour — et un cadrage a dû reconnaître son erreur (2026-09-12)

La demande disait : « prévoir au portail patient un **fil du jour** —
questionnaires à remplir, lectures synthèses, bilans, actions à faire comme
déclarer ce qui compte pour moi, reminders agenda sommeil et alimentaire ».
C'est une liste de tâches, et elle est explicite.

Le cadrage de la campagne `2026-09-12-vie-du-portail-patient` a lu cette liste
comme un **interdit** : lister ce qui est dû rouvrirait l'écart `E11` de
l'audit 5.0, contre le principe `A6-R1` « une étape à la fois ». Il a conclu
que la demande portait « en réalité » sur l'autre moitié — le récapitulatif
rétrospectif, « celle qui n'entre en concurrence avec rien » — et six lots ont
été construits là-dessus. Les quatre arbitrages soumis ensuite portaient tous
sur le journal ; **aucun ne rouvrait le renversement**, si bien que le cadrage
approuvé était déjà penché quand il a été lu.

Le responsable a ouvert son propre écran de patient et l'a cassé en une
phrase : « plus une todo list qu'un calendrier rétrospectif. beaucoup de code
pour rien. » Le drapeau `WN_PORTAIL_JOURNAL` a été allumé à 13:24 UTC et retiré
à 13:37:57 — treize minutes de service (§ B.4 de `docs/FEATURE_FLAGS.md`). Les
deux boutons posés au LOT-05 ont été retirés le jour même (#1052) : doublon avec
« mon dossier à deux voix ».

**Ce que le fil du jour est.** `lib/portail/filDuJour.ts` rend une LISTE de
tâches, et un **repos** quand elle est vide. Une tâche est un geste que le
patient peut poser maintenant, et elle **disparaît** quand il l'a posé — une
liste qui ne se vide jamais cesse d'être une liste de tâches. Aucune condition
de disparition n'a été inventée : un `cta` nul, côté rappel d'agenda, est déjà
le mot par lequel le domaine dit « rien à faire aujourd'hui » ; une assignation
transmise quitte déjà `a_completer` ; la fenêtre de « ce qui compte » se ferme
déjà au premier dépôt (`D-166`).

**L'invitation à dire ce qui compte entre enfin dans le portail**, et avant les
questionnaires : c'est la seule tâche où le patient PARLE, et la placer après
reviendrait à ne l'inviter qu'une fois tout rempli — pour la plupart des
dossiers, jamais. Elle n'apparaît que si la **fenêtre de dépôt** est ouverte,
pas seulement le drapeau : une porte peut s'expliquer, une tâche impossible ne
le peut pas (`D-015`).

**La réponse à `E11` est renversée sur cette page, et c'est dit.** On ne peut
pas à la fois ne montrer qu'une étape et dire au patient tout ce qui l'attend.
Ce qui en est gardé est la HIÉRARCHIE, pas le masquage : un seul bouton plein,
les suivantes en liens sous « Ensuite », rien de replié.

**Un défaut corrigé en passant.** Un patient dont l'agenda courait et dont la
nuit était notée voyait « Consulter « Mon agenda du sommeil » » présenté comme
son étape du moment — une tâche là où il n'y en avait aucune, fabriquée par le
repli « premier à compléter ». Le fil rend « Rien à faire aujourd'hui », suivi
de la phrase factuelle du recueil.

`calculerActionRecommandee` est retirée : deux dérivations de « qu'est-ce que
le patient a à faire », lues par le même écran, divergeraient sans que la
divergence se voie. Ses promesses sont rejouées dans `filDuJour.test.ts`.

**Ce qui n'est pas fait.** Les lectures — nouveau bilan, nouvelle synthèse —
n'entrent pas encore dans le fil : elles demandent le repère de fraîcheur du
LOT-02, seul rescapé du journal rétrospectif. Le retrait du journal lui-même
est un lot distinct.
