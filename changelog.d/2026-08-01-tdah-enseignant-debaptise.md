### Certification — le « Conners enseignant » débaptisé, et un sous-score qui nommait un trouble jamais mesuré

- **L'instrument ne portait pas son nom.** Servi sous « Échelle de Conners —
  Version Enseignant », il porte en réalité les critères diagnostiques du TDAH ;
  la source porte les items de Conners, dont ses **cinq items d'opposition**
  — provocant, rancunier, réplique, s'oppose activement, crises de colère —,
  absents du servi. La preuve est la **lecture des libellés**, item par item : ceux
  du servi sont des critères diagnostiques. Le banc du 2026-07-30 avait rendu
  **zéro divergence critique** — 28 items des deux côtés, cotés 0-3 des deux
  côtés.
- **C'est le cas que la règle du « nombre d'items » désigne comme le plus
  dangereux** : un comptage identique à contenus différents est une substitution,
  et c'est le seul cas que le compteur déclare conforme. Le verdict n'était pas
  faux, il ne portait que sur les deux seuls contrôles que la source permettait.
- **Débaptisé plutôt que reconstruit**, sur arbitrage praticien. Le servi n'est
  pas un Conners abîmé : c'est une grille cohérente avec elle-même. La
  reconstruire jetterait un instrument utilisable pour en fabriquer un autre dont
  les droits (© MHS) ne sont pas dégagés. Il devient « Repérage du TDAH par
  l'enseignant (grille WellNeuro) » et `statutContenu: cree_localement`.
- **Le sous-score renommé est un fait clinique, indépendant du nom de
  l'instrument** — il devait être corrigé dans les deux branches de l'arbitrage.
  `OPP` « Opposition / Impulsivité » devient `IMP` « Impulsivité et agitation » : ses
  cinq items — excitable, mal à rester assis, interrompt, répond sans réfléchir, mal
  à attendre son tour — mesurent l'impulsivité et l'agitation motrice, et **aucun**
  ne mesure l'opposition. (« Mal à rester assis » est un item d'agitation : c'est
  pourquoi l'étiquette ne dit pas « Impulsivité » seule.)
  Un praticien lisant « Opposition / Impulsivité : 13/15 » aurait conclu à un
  trouble oppositionnel chez un enfant à qui la question n'a jamais été posée. La
  section A perd pour la même raison son titre « Opposition et comportement ».
- **La réserve de droits change d'objet, elle ne disparaît pas.** La mention
  « © MHS (licence requise) » visait l'échelle de Conners, que l'instrument ne
  reproduit pas et dont il ne se réclame plus — elle est donc **sans objet**, et
  elle **revivrait** si la grille était un jour reconstruite sur les items de
  Conners : c'est pourquoi elle reste au dossier au lieu d'être effacée. Ce qui la
  remplace n'est pas instruit : les items reprennent des critères diagnostiques
  dont l'APA est l'éditeur, reformulés pour l'observation en classe, sans
  algorithme diagnostique ni seuil. L'instrument **reste** pour cette raison dans
  la population sous réserve que garde `droitsAssignabilite.guard.test.ts`.
- **Les `sourceIds` du Conners sont conservés, et ce n'est pas une affirmation de
  dérivation** — c'est l'inverse : la comparaison à ces deux documents est la
  **pièce** qui établit que le servi n'est pas le Conners. Les retirer retirerait
  la preuve.
- **Aucun seuil, aucune bande, aucun total global** : c'est ce qui distingue cet
  instrument du MMSE, tenu au barreau inférieur le même jour parce que **ses**
  bandes rendent « Démence sévère » sans avoir été comparées à rien. Ici, rien ne
  peut se lire comme un verdict — et c'est le **code** qui le garantit, pas une
  phrase d'écran : l'instrument étant en passation praticien, sa description patient
  n'est plus rendue nulle part.
- **Production lue le 2026-08-01, avant le geste** : zéro assignation, zéro
  réponse, zéro pack. Le changement d'identifiant de sous-score ne rend donc
  illisible aucune passation — il n'en existe aucune.

**Quatre bloquants relevés en revue adversariale, tous soldés.**

- **« Aucun total global » était FAUX au moment où c'était écrit.** Le moteur
  additionnait les quatre axes et rendait 84 : ce nombre partait en
  `scorePrincipal`, s'affichait « Score brut : 62 » au Fil praticien — **sans
  dénominateur, sans bande** — et arrivait au modèle de synthèse. Aucune source ne
  donne de sens à un /84 sur cette grille. `sansTotalGlobal` est posé, et deux
  fixtures du CI vérifient l'absence de total **et** le calcul des quatre axes.
  C'est la phrase sur laquelle reposait toute la montée de barreau : elle est
  maintenant vraie.
- **La débaptisation était à moitié faite.** Trois des quatre libellés d'axes
  restaient les traductions littérales des échelles publiées du CTRS-R:S —
  « Inattention / Cognitif », « Hyperactivité », et surtout « Index TDAH », qui est
  le *Conners' ADHD Index* au mot près. L'arbitrage demandait de retirer « ni le
  nom Conners **ni les intitulés empruntés** » : l'architecture s'en réclamait
  encore quand le nom ne s'en réclamait plus.
- **L'instrument n'est PAS rouvert au portail patient**, contrairement à une
  première rédaction. L'arbitrage du 2026-07-31 tranchait l'**identité**, pas la
  **surface** — et la surface pose un problème propre : cette grille est renseignée
  par un **enseignant**. L'ouvrir au portail laissait deux issues, toutes deux
  mauvaises : le parent remplit à la place de l'informant annoncé (les consignes
  disent « destiné aux ENSEIGNANTS », huit items portent sur le comportement **en
  classe**), ou le lien magique du patient est transmis à un tiers, qui accède
  alors à **tout son portail**. Il rejoint `PASSATION_PRATICIEN`, comme son
  homologue `Q_GEO_03`, « renseigné en consultation avec l'informant ».
- **« Dix-sept libellés à similarité 0,00 » ne prouvait pas ce qu'on lui faisait
  porter.** Le banc compare **par position**, et ce même dossier a requalifié neuf
  0,00 du Tinetti en « artefact d'alignement ». La preuve invoquée est désormais la
  lecture des libellés — elle est plus forte. Et le compte des items d'opposition
  de la source revient à **cinq**, conforme à la pièce du 2026-07-30 ; « six » avait
  été écrit sans nouvelle pièce.

Deux résidus retirés du registre : `anneePublication: 1997` (l'année du CTRS-R:S)
et `traductionValidee`, conservés sur une grille déclarée créée localement. Les
`sourceIds` et le `driveMd`, eux, restent — délibérément : ce sont les pièces de
la comparaison qui établit la **non**-correspondance.

**Seconde passe de revue : deux bloquants de plus — les deux premiers ci-dessous,
suivis de deux remarques soldées avec eux. Et le premier bloquant est le défaut de
ce lot rejoué dans le lot lui-même.**

- **Ma propre garde affirmait plus qu'elle ne vérifiait.** Elle s'intitule
  « n'emprunte plus AUCUN intitulé d'échelle publiée » et n'itérait que les
  sous-scores : les deux motifs qu'elle interdit **survivaient dans les titres de
  sections** — « Inattention et cognitif », et « Index TDAH — Items clés ». Or
  l'aperçu praticien affiche ces titres en capitales : sur la **seule surface qui
  reste**, le praticien lisait « INDEX TDAH » en tête de la dernière section
  pendant que l'axe correspondant portait un autre nom. Le test frère, trois blocs
  plus haut dans le même fichier, itérait bien les sections pour « opposition ».
- **Le libellé de l'axe `IDX` a dû être corrigé deux fois.** « Retentissement
  scolaire et relationnel » ne couvrait que **cinq** de ses huit items : la
  rêverie (de l'inattention, comptée hors de l'axe « Inattention »), la tolérance
  à la frustration et la labilité de l'humeur en débordaient. C'était remplacer un
  emprunt par une approximation — la même mécanique en mineur. L'axe s'appelle
  « Items clés de repérage » : neutre, et vrai des huit.
- **Trois affirmations étaient devenues fausses** avec le retour à `actif: false` :
  « ni la réouverture… », « ses cinq items mesurent **tous** l'impulsivité » (la
  phrase contredisait le renommage qu'elle annonçait), et « la description patient
  promet l'inverse d'un diagnostic » — invoquée deux fois comme garantie alors que
  cette description n'est plus rendue nulle part.
- **Trois titres divergeaient, et le seul visible n'était déclaré par aucun
  document** : l'aperçu rend `def.titre`, qui portait « … critères DSM » quand le
  rayon et le registre portaient autre chose. Une garde neuve exige l'accord.

Quatorze mutations éprouvées, chacune vérifiée échouante puis restaurée — dont
« provocant », que la première version de la garde d'opposition laissait passer,
l'ajout d'un vingt-neuvième item, que seul l'épinglage des identifiants attrape,
et les deux emprunts réintroduits en titre de section.
