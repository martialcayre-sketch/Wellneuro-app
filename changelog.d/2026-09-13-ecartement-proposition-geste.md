### Orientation — le geste d'écarter une proposition, et le réveil qui l'empêche d'être définitif (2026-09-13)

La table posée par la PR précédente (`D-178`) est appliquée en production ; ce lot
la lit et la remplit. Le praticien peut écarter une exploration proposée avec un
motif écrit, la retrouver dans un repli « N écartées » qui porte motif, auteur et
date, et la reprendre depuis là — par un second geste, motivé lui aussi.

**Les règles figées dans la ligne viennent du SERVEUR, jamais du client**, et
c'est ce qui rend le réveil fiable plutôt que décoratif. La route rejoue
l'orientation et prend les règles que le moteur sert au moment du geste : un
client pourrait sinon figer une liste couvrant tous les axes, et la proposition ne
reviendrait jamais — faire taire un axe clinique en silence est exactement ce que
`DC-30` interdit. Le `supersedes` n'est pas accepté du client non plus : la route
lit le fil de la cible et chaîne sur la tête qu'elle vient de calculer. Les cinq
règles que la migration disait « à la charge de la route » sont ainsi fermées par
construction, pas par vigilance ; seule l'alternance des espèces est vérifiée
explicitement.

**Et cette alternance se juge sur le VERDICT, pas sur le fil seul** — la première
rédaction s'y trompait, et la revue l'a arrêtée. Elle refusait tout écartement dès
que la tête du fil en était un ; or pendant un réveil, le fil a bien un écartement
pour tête alors que l'écran montre la ligne comme à examiner. Le praticien se
voyait refuser l'écartement d'une ligne visible, sans aucune autre sortie — la
reprise ne vit que dans le repli des écartées, où une ligne réveillée n'est pas.
La cible restait gelée, sur le cas même que `D-178` existe pour couvrir. Une
proposition réveillée se ré-écarte donc, par un geste qui **chaîne** sur la tête et
fige les règles du moment, règle neuve comprise : sans cela elle se réveillerait
aussitôt sur le motif qui vient de la ramener. Ce qui reste refusé est le geste
vide — ré-écarter sans qu'aucune règle neuve ne soit apparue.

L'en-tête de la migration qualifie un `ecartement` supplantant un `ecartement` de
« sans aucun sens ». Cette phrase a une prémisse fausse, que le réveil falsifie ;
le fichier étant appliqué en production — Prisma en garde l'empreinte, et la
retoucher casserait `migrate deploy` —, la correction est écrite dans la route.

**L'état courant est la tête de chaîne, jamais la ligne la plus récente par
date.** `fait_le` vaut l'horodatage de transaction sur une colonne à la
milliseconde : deux gestes d'une même transaction la partagent, et deux
transactions rapprochées peuvent la partager aussi. Un tri par date élirait au
hasard. La lecture du fil vit dans un module feuille partagé par la route qui
écrit et le service qui lit — deux implémentations de cette règle divergeraient, et
c'est l'écran qui mentirait.

**Deux refus ajoutés en écrivant la route.** On n'écarte pas une cible qui n'est
plus proposée : l'écartement figerait une liste de règles vide, que le `CHECK`
refuse — et à raison, un tel écartement ne se réveillerait jamais. Et on n'écrit
pas dans un fil illisible : si des lignes existent mais qu'aucune tête ne se
dégage — cycle, `supersedes` pendouillant, deux racines —, le geste est refusé
plutôt qu'ajouté au désordre. La **lecture**, elle, retombe sur « visible » dans ce
cas : sur un fil qu'on ne sait pas lire, montrer est le seul défaut réparable —
cacher ferait disparaître une exploration sans que personne ne l'ait demandé
(`DC-24`).

**Ce que la course laisse, la base le tranche.** Deux écartements simultanés
lisent tous deux « aucune tête » et tentent deux racines : l'index partiel de
racine refuse le second. Deux reprises chaînent sur la même tête : l'unicité de
`supersedes` refuse la seconde. La route traduit le conflit en phrase française
plutôt que de laisser fuiter un code Postgres — et sa branche d'erreur générique
ne dit jamais le détail, un message d'erreur de base portant la ligne refusée,
donc le motif écrit par le praticien.

**Deux phrases pour l'écran vide, parce que ce sont deux faits différents.**
« Aucune exploration complémentaire n'est proposée » serait faux quand la table en
propose et que le praticien les a écartées : ce qui est vide, c'est la liste à
examiner, pas la proposition. Le repli des écartées est rendu là aussi — c'est
même là qu'il compte le plus, puisque c'est le seul endroit d'où la reprise est
atteignable.

**Trois autres défauts trouvés par la revue, dont deux qu'aucun test ne voyait.**
Un motif fait d'une seule espace **insécable** passait la route ET la base :
`btrim(motif, E' \t\r\n')` ne connaît que quatre caractères, et le repli aurait
affiché « Écartée le … par … » suivi de rien — l'écartement sans motif écrit que
`D-178` interdit, obtenu sans rien contourner. La garde refuse désormais quatorze
blancs Unicode, donc **davantage** que la base : c'est le seul sens dans lequel une
divergence est admise. Le geste n'avait par ailleurs aucune **garde de péremption**,
seul appel asynchrone du panneau à en manquer : un écartement confirmé sur un
dossier puis une navigation affichait, sur le dossier suivant, un message vert
affirmant qu'une proposition venait d'y être écartée. Enfin le motif est stocké
sans ses bords blancs — deux motifs identiques à un saut de ligne près se liraient
autrement comme deux textes différents à l'audit.

**Et deux bancs ne tenaient rien, vérifié par mutation.** Retirer le filtre
d'appartenance du `where` laissait les 26 cas de la route **verts**, la route
écrivant alors sur le dossier d'un autre praticien ; retirer `idPatient` du `where`
du fil laissait les cas du service verts, les écartements d'un dossier masquant
alors des propositions dans un autre — en y affichant leur motif. Les deux `where`
sont désormais assertés, et les deux mutants meurent. C'est la même vacuité que le
contrat SQL avait attrapée sur le lot de la table : un banc ne prouve que ce qu'il
TENTE.

**Conséquence assumée sur la synthèse**, et elle est juste : le bloc d'orientation
du prompt se construit depuis les recommandations servies, donc une ligne écartée
n'atteint plus le modèle. Proposer dans la synthèse ce que le praticien a refusé
par écrit contredirait son geste.

**Une conséquence de second ordre, dite plutôt que supposée** (une première
rédaction du commentaire affirmait l'inverse) : `orientationInjectee` vaut
`actif && recommandations.length > 0`, donc il passe à faux quand **toutes** les
recommandations sont écartées, et le garde de fidélité de restitution d'orientation
ne tourne plus. Ce garde n'a jamais censuré la prose du modèle — rien ne change pour
le patient —, mais l'écart qu'il journalisait n'est alors plus relevé : c'est la
trace d'audit qui change de comportement, et elle ne doit pas changer en silence.
L'armer sur `recommandations + ecartees` touche le garde de synthèse, pas ce lot.

**La borne du repli est écrite aussi** : un écartement dont la cible n'est plus
proposée du tout n'apparaît nulle part à l'écran — il n'y a plus rien à écarter ni à
reprendre, et le geste reste entier en base. Le cas voisin — un instrument écarté
puis absorbé dans un pack recommandé — n'est pas atteignable : aucune règle publiée
ne cible un pack depuis le 2026-08-06.
