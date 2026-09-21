# Cadrage — La Boussole alimentaire : l'assiette, l'aliment, et lequel devient une action

*Rédigé le 2026-09-16. Cadrage, pas ouverture.*

Ce document cadre une réflexion posée en session le 2026-09-16, sans véhicule
jusqu'ici :

> *« Choisir un aliment dans la Boussole comme action me paraît incongru voire
> inutile à ce stade. La Boussole devrait plutôt s'appuyer sur les modèles
> d'assiette. »*

La proposition a été **challengée**, et ce cadrage retient une position
différente de la substitution : **séparer les rôles plutôt que remplacer l'un par
l'autre.** Ce qui suit dit pourquoi, et ce que cela coûte.

## L'ÉTAT RÉEL, ET IL DÉSAMORCE LA MOITIÉ DE LA QUESTION

**Le mécanisme visé n'est branché à rien.** `attachFoodCompassRef`
(`food-compass/protocol.ts`) attache une référence d'**aliment** à une action de
protocole. Il est écrit, gardé par cinq assertions et couvert par son banc —
et **aucune route, aucun composant ne l'appelle**. Seul son propre test le
lance. Le drapeau `WN_C5_ENABLED` commande par ailleurs son refus d'entrée.

**L'assiette, elle, a déjà son catalogue.** `C5B_RECOMMENDED_PLATES`
(`food-compass/plates.ts`) portait **au cadrage** trois assiettes —
petit-déjeuner simple, déjeuner extérieur, soir léger — avec version de
catalogue, `contentHash` par entrée, hachage de catalogue et contrat de référence
(`c5-recommended-plate-ref-v1`). **Il en porte QUINZE depuis [[D-230]]**, sur un
second axe : les douze assiettes du corpus, adossées à leurs protocoles. Le reste
du paragraphe vaut inchangé, et la doctrine citée ci-dessous n'a pas bougé. Son commentaire pose déjà la doctrine :
*« Le contenu précis de l'assiette reste une décision manuelle du praticien ;
aucune composition n'est inventée ici. »*

**Mais ce catalogue ne sert pas le protocole.** Son unique consommateur est
`PractitionerFoodObservationPanel` — l'**observation** alimentaire.

Autrement dit : l'aliment pointe vers l'action et n'y arrive pas ; l'assiette a
un catalogue propre et ne va pas vers l'action. **Rien n'est à défaire en
production. Le geste est un recâblage, pas une reconstruction.**

## Ce que le corpus mesure, et il tranche dans le même sens

Sur les 123 documents portant une conduite (`MESURES_AUDIT_CORPUS_2026-09-16.md`) :

| | |
| --- | --- |
| Documents de famille « aliment vedette » | **3** sur 123 |
| Actions de domaine « assiette » | **119** sur 575 |
| Actions de domaine « assiette / aliment vedette » | **4** sur 575 |

Et le seul chemin corpus → table signée → runtime qui existe au dépôt,
`WN-CL-0287-009` (`orientationRulesV1.ts:1127`), **fonde l'indication d'une
assiette**, pas celle d'un aliment.

Le corpus construit donc ses conduites alimentaires **en assiettes**. L'aliment
vedette y est un objet d'enseignement, pas une unité de prescription.

## POURQUOI « REMPLACER » SERAIT UNE ERREUR — et c'est le désaccord

L'aliment n'est pas une mauvaise unité : il est une unité **du mauvais étage**.

- Une **assiette** répond à « que fais-je à ce repas ». Elle a une composition,
  une indication, une place dans la journée. Elle peut porter un plan minimal
  — *« au restaurant, gardez seulement ceci »* — donc **elle peut devenir une
  action**.
- Un **aliment** répond à « pourquoi celui-là ». C'est une lecture, pas une
  consigne : un profil nutritionnel sur CIQUAL 2025, un percentile, un PRAL.
  Il n'a ni plan minimal ni plan de secours. **Il ne peut pas devenir une
  action sans qu'on lui invente ce qu'il n'a pas.**

Trois rôles distincts, donc, et aucun ne disparaît :

| Objet | Rôle proposé |
| --- | --- |
| **Modèle d'assiette** | devient l'unité qui peut porter une **action** de protocole |
| **Aliment vedette** | devient le **contenu d'un plan** et la matière de la fiche patient — le « quoi mettre dedans » d'une assiette déjà choisie |
| **Boussole (lecture d'un aliment)** | reste une surface de **compréhension et d'observation**, côté patient — elle explique, elle ne prescrit pas |

**Supprimer l'aliment vedette coûterait le seul endroit où le patient apprend
pourquoi.** C'est la part de la proposition initiale que ce cadrage refuse.

## Les arbitrages

> **LES QUATRE SONT TRANCHÉS, ET CE TABLEAU A LAISSÉ CROIRE LE CONTRAIRE PENDANT CINQ JOURS.**
> [[D-213]], écrite le même jour que ce cadrage, ferme explicitement « les quatre arbitrages
> B1→B4 ». B1 et B2 ont reçu ensuite leur décision de mise en œuvre ([[D-239]], [[D-230]]) et
> ont été barrés ici ; B3 et B4 ne l'ont pas été, faute de lot pour les porter — si bien que
> deux lignes non barrées se lisaient « à décider » quand elles disaient « à faire ».
> Corrigé le 2026-09-21 ([[D-240]]) : une décision rendue ne se relit jamais dans le document
> qui posait la question.


| # | Arbitrage | Bloque |
| --- | --- | --- |
| B1 | ~~**`attachFoodCompassRef` : retiré, ou conservé éteint ?** Il est mort de bout en bout.~~ **TRANCHÉ le 2026-09-21 ([[D-239]]) : RETIRÉ** — et la prémisse était inexacte. La FONCTION était morte ; le CHAMP qu'elle posait (`foodCompassRef`) est vivant, écrit par `ProtocolMiniBuilder` et lu par la voie patient. Ce qui la rendait supprimable n'est donc pas l'abandon de la référence d'aliment, mais le fait qu'`api/praticien/protocoles/versions` **re-dérive** la référence au lieu de la valider : la fonction retirée était la copie FAIBLE d'un invariant tenu deux fois. | LOT-01 |
| B2 | ~~**Les trois assiettes du catalogue C5B suffisent-elles**, ou le catalogue s'étend-il aux douze fiches d'assiette du corpus (`WN-SRC-0296` → `WN-SRC-0307`) ?~~ **TRANCHÉ le 2026-09-18 ([[D-230]])** : le catalogue s'étend aux douze — mais aux **PROTOCOLES** (`WN-SRC-0284` → `0295`), jamais aux fiches, que `D-216` déclare irrecevables comme source de règle. Quinze entrées sur deux axes, et `C5B_PLATE_CATALOG_HASH` a changé sans qu'aucune référence déjà consignée ne devienne caduque. | LOT-02 |
| B3 | ~~**La `substitutionFamily` reste-t-elle `null` ?**~~ **DÉJÀ TRANCHÉ le 2026-09-16 — et ce tableau était périmé dès sa publication.** [[D-213]] déclare en en-tête fermer « les quatre arbitrages B1→B4 » et rend B3 au §11 : « les douze reçoivent leurs familles d'équivalence ». [[D-216]] §4 l'a précisé le même jour : **les familles se feront, le mécanisme change d'abord** — trois préalables, dont un que [[D-240]] vient de fournir (« assiette prescrite » a désormais un sens), et un quatrième qu'il révèle : `decidePlateSubstitution` ne regarde pas l'`axe`. Ce n'est pas un arbitrage à rendre, c'est un chantier à ouvrir. | LOT-03 |
| B4 | ~~**La Boussole patient reste-t-elle atteignable** depuis le protocole ?~~ **DÉJÀ TRANCHÉ le 2026-09-16 ([[D-213]] §12) : elle le RESTE** — « l'assiette prescrit, la Boussole explique pourquoi ». Ce qui manquait n'était pas la décision mais le point de départ : le chemin ALIMENT → Boussole sert en production, le chemin ASSIETTE PRESCRITE → aliment n'avait aucune origine. [[D-240]] la crée. Reste le vrai verrou de LOT-04, nommé là : **les contrats V2 et V4 sont mutuellement exclusifs**, et `resolvePatientFoodCompassView` exige V2. | LOT-04 |

## Les lots

| Lot | Objet | Décision requise | Dépend de |
| --- | --- | --- | --- |
| LOT-01 | Trancher le sort de la référence d'aliment sur l'action. | **oui — B1** | — |
| LOT-02 | ~~L'assiette devient une unité d'action : `advice_sheet` ou `food` reçoit une `RecommendedPlateRef`.~~ **LIVRÉ le 2026-09-21 ([[D-240]])** — `food` SEULE : `adviceSheetRef` est fermé à l'écriture depuis [[D-200]] §2. Contrat V4, axe d'indication seul, référence re-dérivée du catalogue. | **oui — B2** | LOT-01 |
| LOT-03 | ~~Les familles d'équivalence, donc le secours d'une assiette.~~ **MÉCANISME LIVRÉ le 2026-09-21 ([[D-241]]), FAMILLES NON DÉCLARÉES.** Les trois premiers points du programme de [[D-216]] §4 sont faits : relation orientée hors du catalogue, garde d'axe aux deux bouts, chemin ouvert. Le quatrième — l'affirmation clinique qu'aucun claim ne fonde — appartient au praticien. | **oui — B3** | LOT-02 |
| LOT-04 | Le chemin patient : de l'assiette prescrite à la lecture de l'aliment. | **oui — B4** | LOT-02 |

## Contraintes non négociables

- **Aucune composition d'assiette n'est inventée par l'outil** — la mention
  existe déjà dans `plates.ts`, elle ne se dilue pas.
- **Le contenu clinique du corpus n'entre pas au dépôt** : les douze fiches
  d'assiette se **désignent** par leur identifiant de source, elles ne se
  recopient pas. G6 n'est pas ouvert.
- **Un catalogue signé se hache en entier** : chaque assiette ajoutée redemande
  l'attestation du praticien sur la table complète.

## Hors périmètre, nommé

- Le catalogue de conduites tiré du corpus — cadré à part
  (`CADRAGE_PROTOCOLE_DEPUIS_LE_CORPUS_2026-09-16.md`). Les deux se rejoignent
  au `adviceSheetRef`, et seulement là.
- Le jeu de données CIQUAL, le score, le PRAL et les percentiles : rien de ce
  cadrage ne les touche.
- L'agenda alimentaire et l'observation, qui gardent leur consommateur actuel.
