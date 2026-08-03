### Outillage — l'attente du CI devient exécutable, et deux décisions rejoignent le registre

- **La boucle d'attente du CI ne savait pas dire qu'un check n'existait pas.**
  L'idiome documenté attendait que plus rien ne soit `pending`, puis lisait
  `gh pr checks`. Il confondait « aucun check en attente » avec « aucun check du
  tout » : sur la PR #550, le 2026-08-03, il a rendu la main sur deux checks
  Vercel verts alors que `verify` — seul check obligatoire de la protection de
  `main` — n'avait jamais été créé. Le correctif a été refait **à la main** sur
  #553. Une règle oubliée deux fois ne se réécrit pas une troisième : elle
  devient exécutable. C'est le geste qui avait déjà réglé le lint (présent en
  CI, absent de T1) et la fenêtre de clôture d'un lot (`wn-cycle.mjs`).
- `scripts/wn-attendre-ci.mjs` rend **six** codes de sortie là où la boucle en
  rendait un : vert (`0`), échec (`1`), **n'a pas tourné** (`2`), délai dépassé
  (`3`), indéterminé (`4`), **vert mais PR en conflit** (`5`). Le `2` est celui
  qui manquait ; les `4` et `5` ont été ajoutés plutôt que de faire porter à
  d'autres codes des sens distincts — « le check n'a pas tourné », « je n'ai
  rien pu lire » et « ce vert ne porte pas sur le résultat fusionné »
  n'appellent pas le même geste. **`0` est le seul code qui autorise à annoncer
  une PR prête.**
- **Trois faux verts trouvés par la revue adversariale, dont deux reproduits sur
  des PR réelles.** Le dessin — fonction pure, faits injectés — est ce qui les a
  rendus trouvables ; il ne les a pas empêchés.
  - **Deux runs du même nom.** `ci.yml` se déclenche sur `push` *et* sur
    `pull_request` : une PR issue d'une branche `campaign/**` porte **deux**
    check runs nommés `verify` (constaté sur la PR #528). Un `Map` construit par
    `.map()` gardait la **dernière** entrée — c'est-à-dire l'ordre du tableau,
    que l'API ne garantit pas. `[verify FAILURE, verify SUCCESS]` se lisait
    « vert ». Les entrées homonymes sont désormais agrégées : un nom n'est vert
    que si **toutes** ses entrées le sont.
  - **Un vert périmé sur une PR en conflit.** Le script rendait `0` sur la
    PR #553 pendant cette session : `verify` était vert, mais `main` avait bougé
    et la PR était passée en `CONFLICTING`. `mergeStateStatus` n'était consulté
    que lorsqu'un check *manquait* ; dès qu'un run existait, le conflit devenait
    invisible. Avec `strict: false`, ce vert n'atteste rien du résultat fusionné.
  - **Une liste illisible repliée en silence.** Protection de branche
    inaccessible → repli sur `verify`, verdict `0`, et les autres checks
    qualifiés de « NON obligatoires » — au moment précis où l'on venait
    d'échouer à lire lesquels l'étaient. `null` et `[]` sont maintenant traités
    pareil, et aucun des deux ne mène au vert.
- **Sur `2`, le script nomme la cause au lieu de la laisser deviner.** Trois
  causes connues d'un `verify` absent, dont **une seule était documentée** : PR
  en conflit (GitHub ne crée aucun run — le cas #550), branche squashée puis
  rebranchée, commit de tête attribué à Copilot (run gelé en `action_required`).
- **Expirer n'est pas réussir.** Une boucle d'attente qui rend `0` au bout de son
  délai ne prouve que sa propre patience — c'est la vacuité contre laquelle le
  contrat de la barrière D-003 venait d'être dessiné, transposée. Le délai rend
  `3`, et l'absence d'un check rend `2` **même** quand c'est le délai qui met fin
  à l'attente : l'absence est l'information utile, un message de « run lent »
  enverrait chercher ce qui n'existe pas.
- **La liste des checks attendus vient de la protection de branche**, pas d'une
  constante : `verify` en est aujourd'hui le seul membre (`strict: false`,
  `enforce_admins` actif — relu sur GitHub, pas dans un document). Un second
  check rendu obligatoire sera suivi sans toucher au script. Si la protection est
  illisible, repli sur `verify` **avec avertissement imprimé**, jamais en silence.
- **Le banc a vu chaque décision échouer.** 30 cas, et 19 mutations appliquées
  une par une : chacune doit faire tomber le test qui la vise. **Le premier
  banc, à 18 cas, en laissait deux survivre** — la déduplication par nom et la
  distinction `[]`/`null` —, et c'est la revue qui les a trouvées, pas le banc.
  Un banc vert ne prouve que ce qu'il sait interroger.
- **Deux mutations ont d'abord été muettes sans que le banc soit en cause** : la
  forme `` `` || `…` `` ne mutait rien, la chaîne vide étant *falsy* en
  JavaScript. Une mutation qui ne mute pas fait passer une assertion pour
  couverte — le pilote de falsification doit lui-même être falsifiable.
- **Câblé dans `ci.yml`** — 5 bancs déclarés avant, 6 après. Un banc posé sans
  sa ligne ne tourne **nulle part** ; c'est le compteur qui le prouve, pas le
  fichier.
- **Les endroits qui portaient l'idiome sont alignés** : `CLAUDE.md`, `/wn-pr`,
  `/wn-merge`, et les **deux** protocoles de `docs/ROLES_MACHINES.md`. Le
  protocole nominal — celui du poste qui merge — avait d'abord été oublié au
  profit du seul protocole dégradé : l'endroit le plus coûteux à manquer.
  `/wn-merge` affirmait par ailleurs qu'un `verify` absent « signale le piège
  `action_required` » : une cause sur trois présentée comme la seule.
- **Le coût en appels `gh` est borné.** Quatre appels par tour toutes les 20 s
  auraient fait jusqu'à 180 appels par attente — plus que les 81 appels de
  sondage qui ont motivé toute la règle d'économie. Ce qui ne dépend que du SHA
  de tête (protection, auteur, existence d'un run) est lu une fois : ~45.
- **`docs/ROLES_MACHINES.md` affirmait `enforce_admins` désactivé.** Faux depuis
  le 2026-07-21, et démenti par la lecture directe du réglage. Sa conclusion
  (« toujours passer par une PR ») restait juste, sa prémisse promettait une
  échappatoire qui n'existe pas.
- **Registre** — `D-010` (la barrière D-003 se garde au point de passage, pas
  chez ses lecteurs : ce qui rend légitimes les quatre modules qui lisent sans
  filtrer `statut`, et ce qui oblige toute nouvelle voie de restitution à passer
  par la fonction) et `D-009` (un écart de restitution de l'IA se journalise et
  ne se censure pas — né d'un détecteur qui, à allowlist vide, avait accusé une
  synthèse fidèle et persisté l'accusation au dossier). Aucune ne double D-003
  ni D-007, qui citent la barrière sans dire comment elle est gardée.
- D-010 référence le contrat livré par la PR #553, **encore ouverte** au moment
  d'écrire : référence en avant assumée.
