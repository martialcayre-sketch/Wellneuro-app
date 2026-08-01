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
  `OPP` « Opposition / Impulsivité » devient `IMP` « Impulsivité et agitation » : ses cinq
  items — excitable, mal à rester assis, interrompt, répond sans réfléchir, mal à
  attendre son tour — mesurent **tous** l'impulsivité et **aucun** l'opposition.
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
  peut se lire comme un verdict, et la description patient promet explicitement
  l'inverse d'un diagnostic.
- **Production lue le 2026-08-01, avant le geste** : zéro assignation, zéro
  réponse, zéro pack. Ni la réouverture ni le changement d'identifiant de
  sous-score ne rendent illisible une passation — il n'en existe aucune.

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

Onze mutations éprouvées, chacune vérifiée échouante puis restaurée — dont
« provocant », que la première version de la garde d'opposition laissait passer,
et l'ajout d'un vingt-neuvième item, que seul l'épinglage des identifiants
attrape.
