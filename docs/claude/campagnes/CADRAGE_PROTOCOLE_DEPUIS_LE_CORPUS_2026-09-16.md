# Cadrage — Le protocole assisté tiré du corpus

*Rédigé le 2026-09-16. Cadrage, pas ouverture.*

> **ARBITRÉ LE 2026-09-16 — [[D-206]].** A1, A2 et A3 sont tranchés, et le
> véhicule aussi : **pas de campagne, un seul lot borné**. Ce qui reste ouvert
> est A4 et A5. Les lots ci-dessous sont réécrits en conséquence.

Ce document cadre un sujet **né en session le 2026-09-16 et sans véhicule** : la
campagne « 5. Actions — le protocole assisté » a été close le matin même, à usage
mesuré **zéro**, et l'assistance au remplissage des actions n'y figurait pas.

Deux demandes le composent, et elles n'en font qu'une :

1. **Comment pré-remplir les zones d'une action** — intitulé, type, plan idéal,
   plan minimal, plan de secours, charge, cases biologie et impact — et aider le
   praticien à choisir ses une à trois actions ?
2. **La matière existe déjà dans le corpus** : les fiches de synthèse portent des
   protocoles de prise en charge déjà construits. Ce que Wellneuro doit savoir
   produire à ce stade est **un protocole complet hiérarchisé**.

## Ce qui n'est PAS à construire — le mécanisme d'assistance existe trois fois

Aucun des trois ne manque, et aucun n'a de matière :

- **La suggestion depuis une table signée.** `suggererDepuisLignes`
  (`baremeChargePur.ts:103`) lit un barème signé et rend un niveau, son motif et
  la ligne qui le fonde. Le chemin « table relue → suggestion au praticien →
  geste libre » est **en service** depuis `D-198`.
- **La recherche de corpus servie au praticien.** En production depuis le
  2026-08-22 (`WN_RECHERCHE_CORPUS_ENABLED`, `D-081`), élargie à quatre rayons
  par le LOT-01 (`D-188`).
- **Le producteur d'intentions.** Le LOT-05 (`D-190`) pose qu'une action peut
  naître **suspendue** — `conditionnelle_biologie` — et non ferme.

Ce cadrage n'ouvre donc **aucun chantier de moteur d'assistance**. Il ouvre la
question de **ce qu'on lui donne à lire**.

## Ce que le corpus donne, et ce qu'il ne donne pas

Les mesures sont consignées dans `MESURES_AUDIT_CORPUS_2026-09-16.md` et ne sont
pas répétées ici. Trois d'entre elles décident du périmètre :

- **La matière existe et couvre le contrat.** 123 documents portent une conduite,
  575 actions couvrent **les dix types** du contrat V4, 107 documents portent une
  hiérarchie explicite.
- **Le corpus donne le plafond, pas le plancher.** Plan idéal : 99 % des actions.
  Plan minimal : **19 %**. Plan de secours : **19 %**. Or `minimalPlan` est le
  champ que `projeterContenuPatient` sert **au patient**. Pré-remplir depuis le
  corpus remplirait donc surtout ce que le patient ne lit pas.
- **Un axe clinique ne suffit pas à désigner une conduite.** Trois documents
  traitent l'insomnie et proposent trois conduites différentes, départagées par le
  **tableau** et non par la plainte.

## LES DEUX CONTRAINTES DURES, et les ignorer coûterait une réécriture

**1. Un périmètre signé se hache en entier.** `BAREME_CHARGE_SHA256` vaut
`sha256(JSON.stringify(BAREME_CHARGE_V1))` : **toute ligne ajoutée périme la
signature acquise**. Une « première table extensible » n'existe pas. La première
table de catalogue doit être **petite ET stable**, ou bien assumer que chaque
ajout redemande une attestation praticien complète.

**2. Le précédent passe par un claim signé, jamais par un document verbatim.**
Le seul chemin corpus → table signée → runtime qui existe au dépôt est
`WN-CL-0287-009` dans `orientationRulesV1.ts:1127`. Son régime est écrit en clair
à cet endroit, et c'est lui qu'il faut reprendre :

> les claims **fondent l'indication** et disent **où mène la règle** ; ce que la
> table ajoute au-delà d'eux est un **raccourci clinique assumé**, pris là,
> nommé là, avec ses appuis.

Une ligne de catalogue sans `claimId` ne « saute » donc pas une formalité : elle
court-circuite la couche où vit la signature clinique. C'est l'objet de A1.

## Les arbitrages

| # | Arbitrage | État |
| --- | --- | --- |
| **A1** | **Qu'est-ce qui signe une ligne ?** | **TRANCHÉ — régime `WN-CL-0287-009`.** Un claim signé fonde l'**indication** ; ce que la ligne ajoute au-delà est un **raccourci assumé, nommé sur place**. Écarté : l'attestation praticien sur la table entière (régime du barème, `D-198`). **Conséquence mécanique** : la première table ne peut naître que sur un axe déjà curé — **sommeil** (297 claims validés) ou **humeur** (283). |
| **A2** | **Quelle est l'unité ?** | **TRANCHÉ — le tableau clinique.** Écartés : l'indication (65 des 123 documents ne posent aucun critère d'entrée individuel) et l'assiette (elle ne couvre que l'alimentaire). **Réserve reportée au lot** : le nombre de tableaux distincts n'est pas mesuré — normaliser AVANT de dimensionner la table. |
| **A3** | **Qui écrit le plan minimal ?** | **TRANCHÉ — une règle le dérive de l'idéal.** Trois conditions encadrent le principe, et aucune n'est négociable : la dérivation **sélectionne dans le texte du plan idéal, elle ne compose pas** ; elle est déterministe, affichée au praticien et **modifiable par lui** avant diffusion ; elle demande **sa propre décision `D-xxx`**. `D-206` arbitre le principe, il n'autorise aucune implémentation. |
| A4 | Les **514 « à ne pas faire »** n'ont d'autre propriétaire que la situation qui les porte. Entrent-ils au catalogue, à la gate de population, ou nulle part pour l'instant ? | **ouvert** — bloque le LOT-05 |
| A5 | Le pré-remplissage est-il **proposé et modifiable**, ou **cité sans réécriture possible** ? `DC-24` refuse déjà de poser par défaut la valeur la plus engageante. | **ouvert** — bloque le LOT-04 |

## Les lots — réécrits par [[D-206]]

**Pas de campagne.** `D-112` pèse sur trois campagnes de suite et la dernière a
été close à usage mesuré zéro : le premier lot part en **chantier hors file**,
sans `CAMPAGNE.md` et sans créneau primaire. Les suivants ne s'écrivent qu'au vu
de son résultat.

| Lot | Objet | Décision requise | Dépend de |
| --- | --- | --- | --- |
| **LOT-01** | **Le seul lot ouvert.** La forme d'une ligne — clé de tableau clinique, champs, `claimId` fondant l'indication, emplacement du raccourci assumé — **et** une première table sur `sommeil` ou `humeur`. Une PR. La normalisation des tableaux cliniques se fait ici, avant de dimensionner. | non — `D-206` a tranché | — |
| LOT-02 | **Le pointeur, jamais le contenu.** Une ligne désigne une source et un libellé de conduite ; le texte clinique reste hors dépôt. **Le patron existe déjà** : `C5B_RECOMMENDED_PLATES` (`plates.ts`) porte un catalogue d'assiettes avec version, `contentHash` par entrée et hachage de catalogue, sous la mention « aucune composition n'est inventée ici ». Trois entrées au cadrage, **quinze depuis [[D-230]]** — l'extension n'a périmé aucune référence consignée, `catalogVersion` et les empreintes d'entrée n'ayant pas bougé. | non | LOT-01 |
| LOT-03 | **La règle de dérivation du plan minimal**, sous les trois conditions de `D-206`. | **oui — `D-xxx` propre** | LOT-01 |
| LOT-04 | **Le pré-remplissage au constructeur** : le praticien voit d'où vient chaque proposition et peut la refuser. | **oui — A5** | LOT-01 |
| LOT-05 | **Les 514 « à ne pas faire »** reçoivent un propriétaire. | **oui — A4** | LOT-01 |
| LOT-06 | **`adviceSheetRef` reçoit enfin un référent** : les douze fiches d'assiette appariées du corpus. | non | LOT-02 |
| LOT-07 | Bilan d'usage, sur le patron du LOT-07 de la campagne close. | non | tous |

## Contraintes non négociables

- **Aucun texte clinique du corpus n'entre au dépôt** tant que G6 n'est pas
  ouvert : les 507 notices sont `rightsStatus: to_verify` et
  `clinicalReviewStatus: not_reviewed`. Une ligne de catalogue **désigne**, elle
  ne recopie pas.
- **`D-003` tient** : aucune règle de sélection ne se délègue au modèle. Le
  catalogue est déterministe et testable, ou il n'existe pas.
- **Le praticien reste l'auteur.** Une proposition se refuse en un geste, et le
  refus ne coûte rien. `DC-24` interdit de poser par défaut la valeur la plus
  engageante.
- **Aucune signature clinique ne se pose par l'outil.** La surface de relecture
  se produit AVANT la demande d'attestation, jamais l'inverse.

## Hors périmètre, nommé

- **La Boussole alimentaire** — cadrée à part
  (`CADRAGE_BOUSSOLE_ASSIETTE_2026-09-16.md`).
- **La curation des axes** — c'est « Curation signée », cadrée le même jour. Ce
  cadrage la **consomme**, il ne la refait pas.
- **L'ouverture du gate G6** sur les droits du corpus.
- **Les cinq dettes de `D-200`** et les trois défauts vivants du moteur : ils ont
  leur propre ligne en file.

## Ce que ce cadrage n'affirme pas

Il ne dit pas que trois actions est la bonne taille d'une conduite : la mesure
qui semblait le dire est **circulaire**, et elle est réfutée dans l'annexe. Il ne
dit pas non plus combien de tableaux cliniques distincts porte le corpus : le
champ est de la prose libre, et le compter reviendrait à compter des rédactions.
