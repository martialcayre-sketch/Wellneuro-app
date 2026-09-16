# Surface de relecture — l'extension du catalogue d'assiettes

*Écrite le 2026-09-16 en exécution de `D-213` §10, **réécrite le même jour**.
**Ce document ne signe rien.** Il présente au praticien ce qu'il aurait à
attester, et ce qui a été écarté.*

> **CE DOCUMENT CORRIGE UNE VERSION FAUTIVE, ET IL FAUT LE DIRE.** La première
> rédaction concluait que **dix des douze assiettes n'avaient pas d'indication
> fondée**. C'était faux. Elle n'avait lu que les **fiches patient**
> `WN-SRC-0296` → `WN-SRC-0307`, l'intervalle que `D-213` §10 cite — sans
> chercher si d'autres sources parlaient d'assiettes. Il en existe **douze
> autres**, prescriptives, et c'est là que vivent les indications. Le défaut a
> été trouvé par la revue automatique de la PR #1160, après merge. Un intervalle
> cité dans une décision est un exemple, jamais un inventaire.

## LE FAIT CENTRAL : CHAQUE ASSIETTE A DEUX SOURCES, ET UNE SEULE FAIT RÈGLE

| Série | Identifiants | Type | `prescriptive` | Vigilance | Au registre des interventions | Claims validés |
| --- | --- | --- | --- | --- | --- | ---: |
| **Protocoles** | `WN-SRC-0284` → `0295` | `Protocole / outil décisionnel` | **`true`** | **Élevée** | **Oui, tous, `complet`** | **131** |
| **Fiches patient** | `WN-SRC-0296` → `0307` | `Support patient` | `false` | Faible | **Non, aucune** | 81 |

Les deux séries se correspondent **une à une**, dans le même ordre : `0284`
végétale ↔ `0296`, `0285` épargne digestive ↔ `0297`, et ainsi jusqu'à `0295`
chronobiologique ↔ `0307`. Une treizième fiche existe sans protocole —
`WN-SRC-0354`, anti-douleur — et reste donc hors de ce lot.

**Le registre interdit lui-même de fonder une règle sur une fiche.** Le champ
`comment` de `WN-SRC-0297` le dit mot pour mot : *utiliser comme couche
d'éducation thérapeutique, **pas comme source de règle clinique***. Un claim de
fiche peut être `VALIDE` et rester **irrecevable** comme fondement d'indication.
C'est exactement l'erreur que la première rédaction a commise.

Les 212 claims des deux séries sont `VALIDE`, `active`, compartiment `ACTIF`
(lus en production le 2026-09-16) : **la validité n'a jamais été le blocage.**

## LES DOUZE, UNE PAR UNE

Deux colonnes décident : l'indication est-elle **fondée** par un claim
prescriptif du protocole, et est-elle **lisible** par un champ ou un score que le
dépôt sait déjà lire (`D-003` — pas de champ, pas de règle) ?

| Assiette | Protocole | Claims d'indication | Déclencheur disponible | Verdict |
| --- | --- | --- | --- | --- |
| **Dopaminergique** | `0289` | `-004` (score bas à l'échelle fonctionnelle dopaminergique), `-003` (syndromes d'insuffisance dopaminergique) | **`Q_INF_03`, sous-score `DA`** — pack de base, bandes publiées, déjà lu par la table d'orientation | **publiée — la mieux placée** |
| **Sérotoninergique** | `0290` | `-005` (états inflammatoires d'origine intestinale, troubles du transit), `-006` (niveau de preuve élevé), `-007` (marqueurs biologiques) | **`Q_INF_03`, sous-score `SE`** — idem | **publiée** |
| **Épargne digestive** | `0285` | `-005` (tout patient ayant un trouble fonctionnel intestinal), `-006`, `-001` (intolérances, durée bornée) | `Q_GAS_01` (second tour) **et** `intolerances_alimentaires`, énuméré à l'anamnèse | **publiée** |
| **Détoxication** | `0287` | `-009` (score TFI élevé), `-008` (populations exposées), `-007` (cure préventive) | `Q_GAS_01` — **déjà lu** par `R2-GAS-01`/`R2-GAS-02` | **publiée** |
| **Psychobiotique** | `0291` | `-011` (tout patient ayant un trouble fonctionnel ou une maladie intestinale) | `Q_GAS_01` | **publiée** sur la porte étroite ; `-009`/`-010` en **brouillon** |
| **Anti-inflammatoire** | `0293` | `-011` (troubles des neurotransmetteurs sérotoninergiques et/ou dopaminergiques), `-009` (dès 50 ans, plus fréquemment au-delà de 70) | `Q_INF_03` (`DA`, `SE`) ; **âge** | **publiée** |
| **Méthylation** | `0286` | `-006` (végétaliens, végans, végétariens ; plus de 50 ans), `-005` (niveau de preuve élevé) | régime **végétalien/végan**, énuméré à l'anamnèse ; **âge** | **publiée** |
| **Protéinée** | `0288` | `-013` (pathologies où la synthèse dopaminergique est impliquée), `-011` et `-001` (au-delà de 60 ans) | `Q_INF_03` `DA` ; **âge** | **publiée** |
| **Antioxydante** | `0292` | `-004` (maladie évolutive chronique ou inflammatoire de bas grade), `-003` (neurodégénératif) | `antecedentsDomaines` — couvre partiellement | réserve |
| **Oméga 3** | `0294` | `-002`, `-003` — **déclarés NON prescriptifs** | — | refusée |
| **Végétale** | `0284` | aucune ; `-006` nuance l'assiette chez le côlon irritable | — | refusée |
| **Chronobiologique** | `0295` | aucune — quatorze claims de contenu | — | refusée |

**Huit publiées, une en réserve, trois refusées.** Les écarter est le travail ;
chacune l'est pour un motif nommé.

## LES QUATRE ARBITRAGES QUI ONT FIXÉ CE TABLEAU — 2026-09-16

**1. L'ÂGE DEVIENT UN DÉCLENCHEUR, et c'est une décision de doctrine.** Le dépôt
refusait l'âge pour un motif écrit : *aucune borne d'âge n'a de provenance au
dépôt ; poser un pivot ici serait inventer un seuil clinique* (`DC-19`, et
`DC-43` qui écarte l'âge comme critère de population). **Ce motif ne tient
plus** : `WN-CL-0286-006`, `WN-CL-0288-011` et `WN-CL-0293-009` portent des
bornes — 50, 60, 70 ans — dans des claims prescriptifs validés. Le pivot ne
serait plus inventé, il serait **cité**.

Trois assiettes sortent de réserve. **Ce que cela coûte, et qui n'est pas
gratuit** : un type de déclencheur neuf, `Patient.dateNaissance` cesse d'être un
fait purement administratif, et `DC-43` se revisite. Ce n'est pas un correctif
au fil du lot — c'est une décision, elle s'écrit au registre, et le commentaire
d'`anamnese.ts` qui porte l'ancien motif doit être corrigé dans le même geste,
sans quoi le dépôt se contredirait lui-même.

**2. L'ENQUÊTE ALIMENTAIRE NE DÉCLENCHE JAMAIS SEULE.** Le dépôt déclare
`Q_ALI_01` *« non validé comme instrument de mesure — les résultats orientent
l'entretien, ils ne concluent pas »*. Elle reste admise, mais **en seconde
condition uniquement** : une ligne qui la cite exige aussi une porte propre
(trouble fonctionnel avéré, score d'échelle fonctionnelle). C'est le patron exact
de `R2-GAS-02`, où un second déclencheur **paie** l'abaissement d'un seuil et où
« l'un ne vaut jamais sans l'autre ».

**Conséquence sur le tableau** : `WN-CL-0285-007`, `WN-CL-0287-009` (sa branche
enquête), `WN-CL-0291-014` et `WN-CL-0293-012` ne fondent aucune ligne
**d'assiette** à eux seuls. Ils restent cités là où une porte propre existe
déjà — jamais ailleurs.

**LA PORTÉE EST CELLE DES LIGNES D'ASSIETTE.** `R2-ALI-01` est une règle
**publiée** dont `Q_ALI_01` est l'unique déclencheur, et elle cite
`WN-CL-0287-009`. Elle n'est **pas** réarbitrée, et elle ne contredit pas cet
arbitrage : ce qu'elle propose sont **deux questionnaires**, pas une assiette —
son commentaire l'écrit depuis `D-030`, l'assiette de détoxication « relève de la
prise en charge, et l'objectif ne la promet donc plus ». Proposer un
questionnaire et prescrire une assiette n'engagent pas la même chose.

**3. LA PSYCHOBIOTIQUE PUBLIE SA PORTE ÉTROITE ET GARDE LA LARGE EN BROUILLON.**
`-011` — le trouble fonctionnel ou la maladie intestinale avérée — est servi.
`-009` et `-010`, qui proposent l'assiette très régulièrement et pour toute la
population en prévention, sont **écrits en brouillon** : les deux lectures sont
consignées, une seule sert.

> **RÉSERVE À CONNAÎTRE AVANT DE SIGNER, et elle n'est pas de forme.** Une ligne
> `brouillon` **reste dans le périmètre haché**. Vous attestez donc aussi son
> texte : le hachage porte sur la table entière, jamais sur les seules lignes
> publiées. Une ligne brouillon n'est pas hors du périmètre — elle est hors du
> **service**. Reformuler la ligne large plus tard périmera l'attestation
> acquise sur les huit lignes publiées, et c'est voulu.

**4. La ligne cite les claims du PROTOCOLE, jamais ceux de la fiche.** Ce n'est
pas un arbitrage : le registre l'impose. La fiche garde son rôle propre — le
support remis au patient — et n'entre dans aucune ligne.

### Ce qui tient encore l'antioxydante en réserve

`antecedentsDomaines` porte douze domaines larges (« Neurologique (migraine,
TDAH…) », « Auto-immun / rhumatologique »…) là où `WN-CL-0292-003` nomme des
tableaux précis — maladies neurodégénératives, maladie de Parkinson, troubles
démentiels. Adosser l'indication au domaine élargirait franchement ce que le
claim fonde. Il n'y manque pas une donnée mais une **granularité**.

## LE FAIT TECHNIQUE QUI COMMANDE LA FORME

**Le catalogue actuel ne porte aucun contenu d'assiette et aucun statut.**
`C5B_RECOMMENDED_PLATES` tient trois entrées — `plateCode`, `label`,
`substitutionFamily` à `null`, des empreintes. Rien d'autre. Les trois sont
organisées par **moment du repas** et n'ont **aucune source** : ce sont des
repères repris de `JA5-03`.

**Et il n'existe aucun filtre de service.** `PractitionerFoodObservationPanel`
rend **toutes** les entrées de `C5B_RECOMMENDED_PLATES` dans sa liste
déroulante, sans condition. Ajouter des assiettes « en brouillon » les
**exposerait au praticien exactement comme les publiées** : la promesse
« présentes, jamais servies » n'est portée par rien aujourd'hui. Elle exige
**deux** ajouts, pas un — un champ `statut` sur l'entrée, **et** un filtre au
point de service, sur le patron de `lignesConduitesServables`.

Étendre par indication demande en outre un champ d'indication et ses claims :
changement de contrat, donc `catalogVersion`, `contentHash` de chaque assiette
et `C5B_PLATE_CATALOG_HASH` se périment tous, et
`assertCurrentRecommendedPlateRef` refuse toute référence devenue caduque.

**Ce changement est gratuit aujourd'hui, et il ne le restera pas.** Production
du 2026-09-16 : **zéro** brouillon portant une référence d'assiette, zéro
check-in, zéro approbation de diffusion. La première assiette prescrite ferme
cette fenêtre.

## CE QUI EST PROPOSÉ

**Huit lignes d'indication publiées, cinq en brouillon** — les quatre assiettes
sans indication retenue, plus la porte large de la psychobiotique. Le brouillon
n'a de sens qu'avec le filtre de service décrit ci-dessus : sans lui, les treize
s'affichent et le statut ne protège rien.

**LE STATUT VIT SUR LA LIGNE D'INDICATION, PAS SUR L'ASSIETTE**, et c'est la
psychobiotique qui l'impose : elle porte une porte publiée **et** une porte en
brouillon. Avec un seul `statut` par entrée de catalogue, le filtre exposerait
les deux ou les masquerait toutes deux. Le catalogue porte donc des **lignes** —
une assiette, une indication, ses claims, son statut — et une assiette en
regroupe une ou plusieurs, exactement comme `CATALOGUE_CONDUITES_V1` fait de la
ligne son unité signée. L'entrée d'assiette garde `plateCode`, `label` et ses
empreintes, et **cesse d'être l'unité de publication**.

**Les trois assiettes historiques sont conservées telles quelles**, sans
indication et sans claim. Elles sont en service et ne prétendent rien.
**Écarté : les fondre dans les douze** — elles se départagent par le moment du
repas, les douze par l'indication ; les mélanger sur un seul axe ferait croire à
une provenance qu'elles n'ont pas.

## CE QUE L'ATTESTATION DEMANDERA, exactement

Les quatre arbitrages ci-dessus sont rendus. Ce qui reste est le geste
attestant lui-même :

1. **Confirmer les huit indications**, claim par claim : ce que **chacun fonde**,
   et non qu'il existe. Les identifiants et leur version ont été lus en
   production le 2026-09-16 ; leur validité est établie, leur **rôle** est ce que
   vous attestez.
2. **Relire les cinq lignes en brouillon**, dont la porte large de la
   psychobiotique — elles sont **dans le périmètre haché**, donc dans ce que la
   signature couvre.
3. **Confirmer la réserve de l'antioxydante et les trois refus**, ou en relever
   un.
4. **Relire chaque ligne citant l'enquête alimentaire** et vérifier qu'aucune ne
   l'emploie seule.
5. `validationExterne`, `dateValidation` en ISO canonique, et le `shaPerimetre`
   **recopié à la main** — jamais la constante recalculée (`D-063`).
6. La déclaration de conformité se rend **en séance, après lecture** ; la recopie
   du SHA est mécanique et ne vaut que portée par elle (`D-195` §1).

**Ce qui doit être livré AVANT que cette signature ait un sens** : le champ
`statut`, le filtre de service, le champ d'indication et ses claims, et — pour
les trois assiettes qui en dépendent — le déclencheur d'âge et la revisite de
`DC-43`. Signer une table que rien ne filtre exposerait les cinq brouillons
comme les huit publiées.

## CE QUE CE LOT NE PRÉTEND PAS

- **Le CI ne peut pas vérifier qu'un claim cité fonde l'indication.** Il
  n'atteint que le format. Le registre est dense de `WN-SRC-0001` à
  `WN-SRC-0507` sans trou : une vérification d'existence n'attraperait qu'une
  faute de frappe hors bornes.
- **Aucun contenu d'assiette n'entre au dépôt.** Les deux séries sont
  `rightsStatus: to_verify` et `clinicalReviewStatus: not_reviewed`. Une ligne
  **désigne** son claim, elle ne le recopie pas — et le contenu de l'assiette
  reste écrit par le praticien.
- **Les déclencheurs nommés ici sont disponibles, pas câblés.** Aucune règle
  d'assiette n'existe aujourd'hui : dire qu'un score est lisible n'est pas dire
  qu'une ligne le lit.
- **Rien ici ne concerne les familles d'équivalence** — elles ont leur propre
  surface, et le renversement de ce document en change les prémisses.
