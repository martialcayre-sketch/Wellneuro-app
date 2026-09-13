### Release DB — trois défauts du workflow, dont un qui refusait ce qu'il venait de déclencher (2026-09-13)

**Le SHA repointé mourait avec son étape.** Quand la tête de `main` a dépassé le
commit approuvé sans toucher aux migrations, l'étape de déclenchement déploie la
tête — puis affectait `GITHUB_SHA="$TETE"`. Une affectation de variable **shell**,
dans une étape qui est un processus distinct : la valeur ne franchissait pas la
frontière. L'étape suivante attendait donc le déploiement du **commit approuvé**,
que Scalingo ne build jamais pour lui-même dans ce cas, et refusait au bout de
vingt minutes — un refus « SAUTÉ » certain d'avance, **après** qu'un déploiement a
été déclenché. Le report passe désormais par `$GITHUB_ENV`, sous le nom
`WN_SHA_ATTENDU` plutôt qu'en écrasant `GITHUB_SHA` : surcharger une variable
`GITHUB_*` par ce canal n'est pas une capacité documentée, et ferait surtout mentir
toutes les étapes suivantes sur ce qui a déclenché le run. Deux faits distincts,
deux noms. La garde lit la variable avec un repli **strict** sur le commit approuvé :
si le report manquait, elle exigerait le commit que l'humain a réellement vu.

Le banc d'invariants épinglait le mécanisme défectueux — il exigeait littéralement
`GITHUB_SHA="$TETE"`. Son intention était juste ; c'est ce qu'il demandait qui ne
pouvait pas marcher. Il épingle maintenant le **canal**, sur chaque sortie de
l'étape, et la lecture côté garde.

**Le résumé disait ce que le push apporte, pas ce qui va partir.** `migrate deploy`
applique toutes les migrations en attente, reliquat d'un push antérieur non
approuvé compris. Le résumé le signalait en avertissement sans jamais calculer la
liste : l'approbateur devait la reconstituer à la main, au moment précis où on lui
demande de décider. Il borne désormais sa plage au **dernier run `release-db`
réussi** — un run réussi signifiant que `migrate deploy` a tourné jusqu'à son
commit de tête, c'est une borne exacte et non une heuristique. Quand elle n'est pas
lisible (premier run, API muette, historique réécrit), le résumé retombe sur la
plage du push **en le disant**, plutôt que de présenter une liste partielle comme
complète (`DC-24`). La liste est aussi rendue sur `workflow_dispatch`, qui en était
privé alors que c'est le chemin de **reprise** — celui où un reliquat existe par
construction.

**Un invariant de sécurité resserré, pas levé.** Lire les métadonnées des runs
demande le `GITHUB_TOKEN`, et `resume` tourne AVANT l'approbation humaine : le banc
interdisait jusqu'ici tout `secrets.` dans ce job. Il liste maintenant l'exception
nommément — tout AUTRE secret rougit — et exige en plus que `resume` porte son
propre bloc `permissions:` sans aucun droit d'écriture, pour qu'un élargissement
futur au niveau workflow ne lui rende pas silencieusement des droits. `actions: read`
est posé sur ce job seul, et non sur le workflow, afin de ne pas suivre le job qui
détient le jeton Scalingo. Ce que `D-087` protège est inchangé : le jeton qui écrit
en production reste derrière l'approbation.

**La garde du drapeau affirmait sur la production ce qu'elle n'était pas en état de
savoir.** Elle avalait le code de sortie du CLI puis comparait la sortie à `1` :
une panne d'API transitoire produisait donc « `WN_MIGRATIONS_PAR_RELEASE_DB` ≠ 1
sur l'app ». Le drapeau valait bien 1, et le diagnostic a envoyé chercher une
variable mal posée le 2026-09-13. Trois issues sont désormais distinctes : lu et
égal à 1, lu et différent — l'affirmation est alors vraie —, et **pas lu**, qui
refuse aussi (un drapeau qu'on ne sait pas lire n'est pas un drapeau constaté,
`DC-24`) mais dit l'ignorance, après trois tentatives espacées : une panne de trois
secondes ne doit pas coûter une release.

**Les trois correctifs ont été joués, pas seulement relus.** Le `scalingo` et le
`gh` sont factices, mais `git` est le vrai et `$GITHUB_ENV` est un vrai fichier —
c'est le canal dont dépend le premier correctif. Le défaut rapporté est reproduit
sur le banc : sans le report, la garde refuse en « SAUTÉ ». Le résumé est éprouvé
sur six cas (borne antérieure à une migration, postérieure, API muette, aucun run
réussi, borne inatteignable, dispatch), et la garde du drapeau sur ses trois issues,
y compris sous `bash -e`.

**Une note de méthode, parce qu'elle a failli passer pour un fait.** Le commentaire
justifiant `if … then sleep` au lieu de `[ … ] && sleep` affirmait que la seconde
forme ferait sortir l'étape sous `bash -e`. Mesuré : les deux survivent — `set -e`
exempte les commandes d'une liste `&&` sauf la dernière. La forme explicite est
gardée, pour que le lecteur n'ait pas à connaître cette exemption, mais la
justification dit maintenant ce qui a été mesuré.

#### Ce que la revue indépendante a fait ajouter

**Le nouveau message du drapeau refaisait la faute à l'envers.** Il affirmait « le
CLI n'a pas répondu (API indisponible, jeton, réseau) » — ce qui exclut l'hypothèse
que le drapeau ait été **retiré** de l'app. Or `D-112` nomme cette ambiguïté comme
une dette : `env-get` rend la même erreur pour une variable absente et pour un
incident d'API, et toute garde qui lit une variable d'app doit « distinguer les deux
cas **ou dire qu'elle ne le peut pas** ». Le message nomme désormais les deux
hypothèses, commence par la plus grave — un drapeau retiré signifie que le
postdeploy migre de nouveau, donc que la base a pu être écrite hors approbation —
et donne le geste de levée de doute.

**Quatre gardes ajoutées, chacune fermant une mutation qui restait VERTE.** Le banc
tenait la *présence* du report, pas son **ordre** : déplacer la ligne d'une position,
avant le repointage, ramenait le défaut rapporté à l'identique sans rougir. Un
secret se cite aussi par `secrets['X']`, forme que la garde ne lisait pas — et comme
le contrôle des permissions était conditionné à la détection d'un jeton, cette forme
désarmait les deux gardes d'un coup : le jeton de production dans un job
pré-approbation, banc vert. Rien ne tenait les permissions du **workflow**, dont
hérite le job qui détient ce jeton. Et rien n'attachait le refus à la garde des
migrations non approuvées, l'invariant central de `D-087` : remplacer son `exit 1`
par un `echo` passait, un autre refus de la même tranche satisfaisant l'assertion.

**Un défaut que j'ai introduit et qu'une garde attrape désormais.** Un accent grave
dans une chaîne entre guillemets est une substitution de commande : le message du
drapeau contenait `env-get` entre accents graves, donc l'exécutait. `bash -n` ne
voit rien — la syntaxe est valide. Un banc refuse maintenant tout accent grave non
échappé dans un `echo "…"`.

**Deux affirmations du résumé rectifiées.** La date affichée était `created_at`, la
date de CRÉATION du run : un run créé le 10 et approuvé le 12 s'affichait « le 10 »,
ce qui envoie chercher la mauvaise fenêtre dans les journaux. Et la phrase « aucune
migration en attente » ne couvrait pas les **suppressions**, écartées par
construction du filtre — le trou est maintenant dit, avec sa conséquence
(`migrate deploy` refuse sur la dérive, sans écrire).

**Un fait établi plutôt que supposé.** La borne repose sur `status=success`, donc
sur l'idée qu'un run rejeté par un relecteur ne conclut pas `success`. Constaté sur
le rejet du 2026-09-13 : il conclut **`cancelled`**. Le filtre l'écarte de lui-même.
C'était le seul sens dangereux — un rejet comptant comme réussi ferait sauter la
borne en avant et sous-lister sans le dire.

**Un point où je n'ai pas suivi la revue.** Elle lit comme un défaut le fait que le
court-circuit « un déploiement existe déjà » reporte le commit approuvé et non la
tête. Sur ce chemin, rien n'a été déployé : l'image reste celle du dernier build
réussi, et attendre la tête ferait attendre un déploiement que personne n'a
déclenché. Le SHA attendu est donc juste. Ce qui est vrai, et antérieur à ce lot,
c'est qu'un build échoué sur ce commit mène à un refus — refus correct, puisque
l'image n'est pas celle qui a été approuvée. Le raisonnement est écrit dans le code
plutôt que laissé à deviner.

**Enfin, mes propres harnais prouvaient moins qu'ils ne l'annonçaient.** Celui du
drapeau comparait avec une apostrophe typographique là où le workflow en écrit une
droite : deux assertions ne tenaient rien. Celui du résumé n'assertait rien du tout
et perdait son `stderr`. Les deux sont réécrits, tournent sous `bash -e` comme les
étapes réelles, portent une condition par cas et sortent non nul en cas d'échec. Le
harnais du drapeau joue en plus le cas « drapeau absent », et celui du résumé le cas
« dispatch sans borne » — qui a révélé un texte incohérent, corrigé : un
déclenchement manuel lisait « apportées par ce push » et se voyait reprocher un
`before` que `workflow_dispatch` ne porte pas.
