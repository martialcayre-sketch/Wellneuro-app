### Trois créneaux uniques, trois remèdes différents — et un garde de skills passé en fail-closed (2026-08-04)

Trois fichiers que toute branche de lot réécrit conflictaient dès que deux
sessions vivaient en parallèle. Pendant le seul lot précédent, ils ont produit
deux collisions de numéro de décision (`D-013` puis `D-014` pris deux fois, huit
renvois à renuméroter chaque fois), une PR entière dont l'objet unique était de
réparer le handoff après un merge (#563), et deux handoffs perdus. **Le remède
n'est pas le même pour les trois**, et c'est le point :

- **`docs/claude/SESSION_LOG.md` → `merge=union`.** Journal strictement
  append-only, dont la résolution est toujours « garder les deux ». L'attribut
  rend cette résolution automatique. Ce fichier et lui seul : `union` duplique en
  silence une ligne modifiée des deux côtés, ce qui est inoffensif là où l'on
  n'ajoute qu'en fin et faux partout ailleurs. Une exception est nommée aux deux
  endroits où quelqu'un agit — `.gitattributes` et l'en-tête du skill de
  compaction : il est le seul à RETIRER des entrées, et `union` y ressusciterait
  en silence celles qu'une compaction vient d'archiver.
- **Le handoff → un fragment par lot.** `docs/claude/HANDOFF_CURRENT.md`
  disparaît au profit de `docs/claude/handoffs/AAAA-MM-JJ-HHMM-slug.md`, sur le
  modèle de `changelog.d/`. **Aucun fichier « courant » n'est généré** : il
  recréerait le créneau qu'on supprime ; le handoff courant est le fichier le
  plus récent du dossier. Les trois handoffs perdus ou écrasés du 2026-08-04 y
  sont restaurés comme fragments datés — la démonstration du remède autant que
  sa justification. `scripts/wn-cycle.mjs` ne contrôle plus un chemin littéral
  mais l'ajout d'un fragment dans la branche.
- **`docs/DECISIONS.md` reste à créneau unique, assumé.** Une décision se lit
  dans la suite des autres et huit renvois pointent vers des `D-NNN` précis :
  l'éclater coûterait plus que le conflit. Ce qu'on rend impossible, c'est la
  collision *silencieuse* — `scripts/lib/decisions-numerotation.mjs` refuse un
  doublon, un trou et un désordre de la section active. Un conflit de merge est
  bruyant et se résout ; un doublon de numéro se propage. Corollaire écrit dans
  l'en-tête du garde **et dans le message qu'il imprime** : **un numéro ne se
  libère jamais** — une décision dépassée se déplace sous « archivées » sans
  changer de numéro, une décision annulée le dit dans son corps, et on ne
  renumérote que sur une branche jamais publiée. Sans cette phrase, le premier
  retrait de décision bloquait `main` sans indiquer le geste.

**Le garde des invocations croisées entre skills passe en fail-closed.** Il
cherchait un verbe impératif dans les 90 caractères précédant un `/wn-x` : pas de
verbe, pas de constat. Six branchements morts vivaient sous ce CI vert, parce
qu'ils sont écrits en titres d'étape nominaux — « 5. **Revue** — `/wn-review` »,
« 7. **PR** — `/wn-pr` puis `/wn-merge` ». Une numérotation d'étape *est* un
impératif, et aucune liste de verbes ne l'aurait attrapée. Désormais toute
référence vers un skill non exposé à l'outil `Skill` est un constat, sauf
marqueur explicite. La charge de la preuve change de camp : ce n'est plus au
garde de deviner qu'une prose est un ordre, c'est à l'auteur de déclarer qu'elle
ne l'est pas. Là où la ligne prescrivait vraiment quelque chose — les tableaux
de classes de `/wn-lot`, ses étapes numérotées —, elle est **réécrite** en disant
ce qu'elle doit produire ; le reste est déclaré en mention. Les sept skills
historiques `wn-r0`…`wn-r6`, qui n'existent que pour rediriger, gardent leurs
commandes écrites en clair avec la barre oblique, chacune sous son marqueur : les
retirer aurait éteint le garde par simple reformatage, et une prescription future
écrite là serait redevenue invisible.

**Le marqueur nomme sa cible** : `<!-- mention-seule: wn-review -->`, plusieurs
cibles séparées par des virgules. Un marqueur valant pour la ligne entière était
un blanc-seing local — dans le tableau de classes de `/wn-lot`, celui posé pour
la cellule « Garde particulier » éteignait la cellule « Revue », qui prescrivait
`/wn-review`. Trois refus : marqueur sans cible, cible nommée absente de la
ligne, référence que nul marqueur ne nomme. Le motif de référence exige en outre
que le `/` **ouvre un jeton** : il appariait `.claude/skills/wn*/SKILL.md` et en
tirait `/wn`, ce qui faisait passer des marqueurs n'exemptant rien.

**Le garde lisait mal le drapeau qu'il interroge.** `estInvocableParLeModele`
rendait « invocable » — donc hors périmètre, donc tout branchement vert — sur un
`SKILL.md` sans frontmatter, sur `disable-model-invocation: true # commentaire`,
sur `"true"` entre guillemets, sur un BOM avant le `---`, et sur les autres
booléens vrais de YAML 1.1 — `yes`, `on`, `y`, `1`. La valeur se lit désormais
largement, et un frontmatter illisible est un **constat**, jamais un silence.

**Les contrôles bloquants du CI et `npm run check` sont mis à parité**, bancs
compris — les sept bancs d'outillage et le scan anti-secrets du dépôt entier
entrent dans `check` (+2,5 s), et `scripts/parite-check-ci.test.mjs` échoue
désormais dès qu'une étape bloquante du CI manque à `check` — l'inverse n'est pas
contrôlé, `check` faisant légitimement plus. Sa dérivation lit aussi les blocs
`run: |` multi-lignes : un futur garde écrit sous cette forme en sortait
silencieusement, et la parité restait verte. Un palier qui ne couvre
pas ce que le CI vérifie ne protège de rien : c'est la leçon du lint, rejouée.
Tout s'exécute depuis la racine (`cd ..`) — lancés depuis `web/`, les gardes
rendent « aucun skill lu » et `wn-campaign-audit.mjs` rapportait
`totalCampaigns: 0` sans erreur.

**Vingt blocs `!` de skills lisaient un `git status --short` aveugle.** Le
porcelain collapse un répertoire entièrement non suivi en une seule ligne :
`docs/claude/handoffs/` neuf y passait inaperçu. `wn-cycle.mjs` avait été
corrigé, pas les skills qui décident si la clôture est faite (`/wn-lot`,
`/wn-pr`, `/wn-review`…). Les vingt blocs reçoivent `--untracked-files=all` et
l'ancre de racine. Enfin, le nom d'un fragment de handoff est **exigé**
(`AAAA-MM-JJ-HHMM-slug.md`) : sans cela, un `notes.md` déposé là aurait été
accepté comme handoff et désigné comme le courant.
