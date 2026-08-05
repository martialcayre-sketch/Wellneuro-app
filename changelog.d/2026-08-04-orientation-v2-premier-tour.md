### Orientation — la table V2 sait parler au premier rendez-vous (2026-08-04)

- **Le diagnostic : la table V1 ne pouvait rien proposer au premier rendez-vous.**
  Ses six règles se déclenchent sur `Q_SOM_01` (PSQI), `Q_STR_02` (PSS-10) et
  `Q_GAS_01` (TFD SIIN) — trois instruments qui ne sont **pas** au pack de base
  réellement administré (`Q_MOD_03`, `Q_MOD_01`, `Q_INF_03`, `Q_ALI_01`). Elles
  étaient justes, sourcées, publiées — et muettes au seul moment où le praticien
  attend quelque chose. Aucun banc ne pouvait le voir : chacune se déclenchait
  correctement sur l'instrument qu'elle cite.
- **La doctrine des deux tours, et la table passe de 6 à 20 règles.** Le
  *premier tour* lit ce que le pack de base et l'anamnèse permettent de voir, et
  **propose** les instruments (PSQI, PSS-10, TFD, Horne, Berlin, Epworth,
  Pichot, HAD, BMS-10) — seize règles. Le *second tour* attend le retour de ces
  instruments : ce sont les quatre règles de mesure de V1, conservées telles
  quelles et requalifiées pour ce qu'elles sont — l'aval, pas du code mort. La
  ligne de doctrine de V1 est inchangée : un drapeau déclaré seul ne propose
  jamais un pack, seulement un instrument.
- **Chaque règle reste sourcée, et l'inventaire des sources a été refait.** Les
  `claimId` cités ont été relus en base le 2026-08-04 (`rag_corpus_claims` :
  `statut = 'VALIDE'`, `prescriptif = true`, `active = true`,
  `version_claim = 'v1.0'`) — c'est le maillon que le CI ne couvre pas, il
  n'atteint que le format d'un identifiant. **Trois règles envisagées ont été
  abandonnées** et l'abandon est écrit dans la table pour qu'on ne les
  redécouvre pas : **faute de source**, le pack cardio-métabolique sur une
  plainte de surpoids déclarée et `Q_FIB_01` sur une plainte de douleur — aucun
  claim relu ne les fonde ; **par redondance**, `Q_ALI_02` sur un mode
  alimentaire dégradé, dont la source désigne `Q_ALI_01`, déjà au pack de base :
  la règle proposerait de repasser ce qui vient d'être passé. **Une quatrième a
  été réintégrée** après
  qu'un relecteur a montré que la source existait : `WN-CL-0287-009` fonde
  explicitement le pack digestif « lorsque le score global de l'enquête
  alimentaire SiiN détaillée est défavorable ». La note d'abandon avait cherché
  une source pour la mauvaise règle, puis conclu de cet échec qu'il n'y avait
  rien — « aucun claim ne justifie X » se vérifie sur la règle qu'on veut
  écrire, pas sur le thème dont elle relève.

#### Un défaut de scoring fermé au passage : une passation abandonnée orientait

Le moteur `subscore` calcule un axe **dès qu'un item est renseigné**. Un total
partiel est donc réel, mais biaisé **vers le bas** — ce qui manque n'ajoute
rien — et indiscernable d'un axe complet et bas pour qui ne lit que `total`. Sur
`Q_MOD_01`, dont l'échelle est inversée et dont les déclencheurs comparent en
`<=`, ce biais **fabriquait** la dégradation : trois items répondus à leur
**meilleure** valeur, puis abandon, produisaient **sept recommandations dont deux
packs**, au motif d'un « sommeil non réparateur » que le patient venait de
décrire comme excellent.

- Les sous-scores servent désormais `repondus` et `items` (`questions.ts`), et le
  moteur d'orientation **refuse un axe dont le recueil est incomplet** : ni sa
  valeur, ni sa bande. La garde ne trie pas par opérateur — elle refuse la
  mesure, parce que c'est la mesure qui n'existe pas.
- **Même garde au niveau global**, pour l'enquête alimentaire : le moteur
  `seuils_points` sert son interprétation sans condition de complétude, si bien
  qu'une enquête abandonnée après trois items rendait la bande la plus sévère de
  sa grille et engageait un pack.
- Asymétrie à ne pas perdre, écrite dans le code : `Q_MOD_03` est immunisé **par
  construction** (chaque domaine est un item unique, un domaine sans réponse rend
  `null`), `Q_MOD_01` et `Q_INF_03` ne le sont pas. La classe de défaut n'est pas
  close pour autant : un **PSQI partiel** rend toujours un total et une bande, et
  ne publie aucun compte d'items que cette garde saurait lire. Défaut
  pré-existant, nommé dans le moteur, non fermé par ce lot.

#### Un pack absorbe désormais ses membres

Quand un pack est recommandé, les questionnaires de **sa** composition ne
s'affichent plus en lignes distinctes : le praticien voyait le pack **et**
plusieurs de ses propres instruments, et devait déduire lui-même que tout
assigner les ferait passer deux fois. Arbitrage praticien : **pas de plafond** de
recommandations — l'absorption retire la redondance, jamais la quantité. Ce qui
est absorbé n'est pas perdu : les motifs et les besoins remontent sur le pack
(la traçabilité claim par claim est préservée), le pack prend le **niveau le plus
fondamental** de ce qu'il absorbe — un pack qui absorbe une cible `socle` reste
au socle —, et les objectifs des membres remontent **préfixés par leur cible**
(« via `Q_NEU_11` : … »), de sorte qu'ils ne puissent pas se lire comme une
description du pack.

#### Une règle est solidaire de l'instrument que son claim couvre

`R2-ALI-01` déclenche sur le **libellé** de bande de l'enquête SIIN, et non sur
sa couleur. `Q_ALI_01` désigne deux instruments selon `WN_ALI_01_SIIN57` — la
forme SIIN57 (57 items, /90) en production, la forme courte à 14 items (/42)
partout où la variable manque, drapeau **éteint par défaut**. Les deux émettent
`warning` et `danger` : un déclencheur de couleur engageait donc un pack sur la
forme courte aussi, que le claim cité — « l'enquête alimentaire SiiN
**détaillée** » — ne couvre pas. Les libellés, eux, appartiennent à une forme et
à une seule ; drapeau éteint, la règle cesse d'elle-même de mordre. Le banc
exerce les deux positions du drapeau sur les **définitions réelles**, scorées par
le scoreur réel.

**La table reste NON signée.** `ORIENTATION_METADATA` est inchangée
(`validationExterne: false`) : la route `/api/praticien/orientation` demeure
fail-closed, aucune de ces vingt règles n'atteint un praticien ni un patient. La
signature est un acte praticien, postérieur à la relecture clinique.
