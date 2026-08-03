### Un garde pour la classe de défaut, pas pour ses deux instances

`wn-route`, puis les six branchements vers `/wn-reprompt` : deux fois la même
panne, et deux fois un CI vert. `disable-model-invocation: true` retire un skill de
la liste exposée à l'outil `Skill` ; une consigne écrite dans un autre skill — « un
texte libre passe d'abord par `/wn-reprompt` » — devient alors une prose parfaitement
valide qui désigne une capacité absente. Aucune suite de tests ne regarde là. Le
symptôme n'apparaît qu'au moment où quelqu'un tape `/wn-campaign` et attend le
reprompting qui ne vient pas.

`scripts/lib/skill-cross-invocation.mjs` ferme la classe : il lit les 32 `SKILL.md`,
en déduit qui est réellement exposé, et refuse toute consigne impérative vers une
cible qui ne l'est pas. Branché bloquant dans le CI et dans `wn-kit-doctor`.

**Ce qu'il ne fait pas est ce qui décide de sa survie.** Un contrôle qui épinglerait
toute mention rendrait un mur de faux positifs et serait débranché dans la semaine :
les deux routeurs (`/wn`, `/wn-route`) nomment des skills à longueur de table, et
leur sortie s'adresse à l'utilisateur, qui tape la commande. Seule la formulation
impérative compte — un verbe d'invocation, liste fermée, dans les 90 caractères qui
précèdent la cible. Trois formes sont explicitement épargnées, et chacune a son cas
au banc :

- la **mention en table** d'un routeur — c'est son métier ;
- l'**interdiction** qui cite le même verbe : `wn-lot` écrit « Interdit … ou
  réinvoquer `/wn-context` », l'inverse d'un ordre. La règle est étroite à dessein —
  la marque de prohibition doit **ouvrir le paragraphe**. Chercher la négation
  n'importe où en amont éteindrait tout : le français en met partout, et « une
  demande qu'on ne peut pas router sans deviner passe d'abord par `/wn-X` » est un
  ordre ;
- le **drapeau cité en commentaire de frontmatter** — la forme exacte que portent les
  deux seuls skills exemptés, dont le bloc « EXCEPTION DÉLIBÉRÉE » cite la clé qu'il
  interdit de rétablir. La lire comme la clé inverserait le verdict sur eux deux.

**Contre-factuel mesuré** : sur l'état exact de la PR #529 reconstitué, le contrôle
rend **5 violations** — `wn-campaign`, `wn-debug`, `wn-lot`, `wn-plan`, `wn-route`. La
sixième (`/wn`) est une annonce de route sans verbe, et n'en est pas une.

**Une troisième instance trouvée au passage.** `wn-route` ordonnait d'invoquer `/wn`,
`/wn-model` ou `/wn-ultra` quand une demande ne tombe dans aucune ligne des grilles
condensées — trois skills qui portent tous le drapeau. Le repli annoncé était donc
inexécutable depuis qu'il était écrit. Corrigé sans lever trois drapeaux de plus : la
consigne demande maintenant un `Read` ciblé du fichier de grille, qui obtient la même
chose sans dépendre d'une capacité absente.

Trois codes de sortie, comme le garde anti-secrets : `0` sain, `1` consigne morte,
`2` aucun skill lu — un scan sans objet rendrait sinon la même sortie qu'un dépôt
sain. Et l'étape CI est **volontairement hors du filtre `docs_only`** : une PR qui ne
touche que des `SKILL.md` est classée documentaire, la gater reviendrait à ne jamais
l'exécuter sur exactement les PR qu'elle vise.
