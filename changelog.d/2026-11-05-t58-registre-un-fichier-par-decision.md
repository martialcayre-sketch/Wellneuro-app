### Registre des décisions : un fichier par décision (2026-11-05)

Lot t58 de la file A, bascule de [[D-418]] (§1 à §6), en une seule PR.

- Les 442 décisions du registre unique (D-001 à D-442, toutes actives) vivent
  chacune dans `docs/decisions/D-NNN.md`, nommé par son seul numéro, première
  ligne `# D-NNN — <titre>` ; les archivées iront sous
  `docs/decisions/archivees/`. Texte repris à l'identique, à deux exceptions
  près (§3) : le titre (`###` devenu `#`) et 28 liens relatifs au fichier
  (`../web/…`, `claude/…`, `changelog.d/…`), rebasés vers la même ressource.
  Les ancres écrites depuis la racine ne bougent pas. Les lignes vides entre
  deux entrées ne sont pas reprises : chaque fichier finit par un seul saut
  de ligne.
- `scripts/wn-decisions-decouper.mjs` (`--depuis <ref>` ou `--fichier`,
  `--verifier`) découpe et se rejoue sur un `main` plus récent ; son banc
  juge, tant que la base de la PR porte le registre unique, chaque fichier du
  dépôt contre son entrée.
- `docs/DECISIONS.md` devient une page fixe : où vit le registre, comment le
  lire. Lecture : `node scripts/wn-decisions.mjs` (tout, du plus récent au
  plus ancien), `… D-418` (une décision), `… --titres`. Aucun index versionné.
- Le garde de numérotation juge par nom de fichier : nom canonique, titre
  accordé au nom, une décision par fichier, doublon actif/archivé, trou sans
  réservation et décision supprimée sur une PR (base d'avant la bascule
  comprise), et refuse toute décision écrite dans la page fixe (§6). Le
  « désordre » de D-370 §3 n'a plus d'objet.
- La réservation lit le plus haut numéro dans l'arbre de `docs/decisions/`
  sur `main`, archivées comprises ; un arbre tronqué est une lecture
  impossible.
- Ce qui se serait vidé en silence rougit désormais, banc à l'appui :
  `recent_decision_ids` de `wn-cycle --appliquer` (refus, rien d'écrit), le
  périmètre de `wn-ancres-doctrine` (code 2 sur un périmètre vide),
  `version-prompt-documents.test.mjs` (lève sur un registre vide ou sans date).
- Les dix tests web qui relisent un texte opposable passent par
  `web/src/lib/doctrine/lireDecision.ts` (`lireDecision`, `lireToutesDecisions`),
  qui lève sur une décision absente.
- Textes à jour : `wn-kit-doctor`, `.wn/documentation.yml`, commentaires de
  `ci.yml`, `.gitattributes` et `.coderabbit.yaml` (aucun filtre ni consigne
  de revue changé), skills `wn-merge` (7 bis : `git diff … -- docs/decisions/`),
  `wn-finish`, `wn-lot`, `AGENTS.md`, `REGLES_PR_MERGE.md`, `PROJET_CONTEXTE.md`,
  `doctrine/README.md`, `CONSTITUTION_CLINIQUE.md`. Aucun garde retiré.
