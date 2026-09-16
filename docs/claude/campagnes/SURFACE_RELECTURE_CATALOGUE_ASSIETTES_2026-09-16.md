# Surface de relecture — l'extension du catalogue d'assiettes

*Écrite le 2026-09-16, en exécution de `D-213` §10. **Ce document ne signe
rien.** Il présente au praticien ce qu'il aurait à attester, ce qui a été écarté,
et **ce que la lecture du corpus a révélé de contraire à l'attente**.*

`D-213` §10 a tranché : le catalogue d'assiettes s'étend aux douze du corpus
(`WN-SRC-0296` → `WN-SRC-0307`), organisées **par indication**, « seul axe
capable de porter une action ». L'arbitrage n'est pas rouvert. Ce document
prépare sa mise en œuvre — et il doit commencer par ce qui ne colle pas.

## CE QUE LA LECTURE DU CORPUS A ÉTABLI, ET QUI N'ÉTAIT PAS SU LE MATIN

Les quatre-vingt-un claims des douze fiches ont été lus en production le
2026-09-16, ainsi que les vingt-sept des deux protocoles voisins. Trois faits en
sortent, et chacun déplace la question.

**1. Les douze sont des SUPPORTS PATIENT, pas des documents prescriptifs.** Au
registre des sources, les douze portent `documentType: "Support patient"`,
`prescriptive: false`, `importance: secondary`, vigilance **faible**, et
l'action requise « Harmoniser charte patient ». **Aucune des douze n'est au
registre des interventions** — dont le critère de sélection est précisément :
les sources qui portent une **conduite**.

**2. Deux sources prescriptives existent, et elles ne sont pas dans les douze.**
`WN-SRC-0287` (protocole assiette détoxication, 13 claims) et `WN-SRC-0295`
(protocole assiette chronobiologique, 14 claims) sont des
`Protocole / outil décisionnel`, `prescriptive: true`, vigilance **élevée**, et
les seules deux sources d'assiette **curées en interventions**. Elles doublonnent
deux des douze fiches — `WN-SRC-0299` (détoxication) et `WN-SRC-0307`
(chronobiologique). Le corpus des assiettes n'est donc pas douze objets
indépendants : c'est **douze fiches patient, dont deux ont un protocole jumeau**.

**3. Les claims des douze décrivent le CONTENU de l'assiette, pas son
INDICATION.** C'est le fait central. Sur les quatre-vingt-un, la très grande
majorité énonce ce que l'assiette contient — telle famille d'aliments, telle
fréquence hebdomadaire — ou le mécanisme qu'elle vise. **Presque aucun ne dit
quand la proposer.** Or c'est l'indication, et elle seule, qui permet à une
assiette de porter une action.

**Le blocage n'est donc pas la validité des claims** : les quatre-vingt-un sont
`VALIDE`, `active`, compartiment `ACTIF`, tous adossés à une source. Le blocage
est que **dix des douze assiettes n'ont pas d'indication fondée**.

## LES DOUZE, UNE PAR UNE

| Assiette | Source | Claims | Claim d'indication | Déclencheur disponible | Verdict |
| --- | --- | ---: | --- | --- | --- |
| Épargne digestive | `WN-SRC-0297` | 6 | **`WN-CL-0297-004`** — condition d'entrée explicite (intolérance alimentaire) **et durée bornée** | **`intolerances_alimentaires`**, énuméré | **proposable** |
| Détoxication | `WN-SRC-0299` + protocole `WN-SRC-0287` | 8 + 13 | **`WN-CL-0287-007`, `-008`, `-009`** — trois portes d'entrée distinctes | `Q_GAS_01` et l'enquête alimentaire, déjà lus par `R2-GAS-01`/`R2-GAS-02` | **proposable** |
| Protéinée | `WN-SRC-0300` | 6 | `WN-CL-0300-001` — population seulement (personne âgée) | **aucun** | refusée |
| Oméga 3 | `WN-SRC-0306` | 8 | `WN-CL-0306-002` — « en cas de déficit d'apport » | **aucun**, et l'énoncé est circulaire | refusée |
| Chronobiologique | `WN-SRC-0307` + protocole `WN-SRC-0295` | 7 + 14 | aucun pour l'assiette ; `WN-CL-0295-010` indique **la collation**, pas l'assiette | — | refusée |
| Végétale | `WN-SRC-0296` | 8 | aucun | — | refusée |
| Méthylation optimale | `WN-SRC-0298` | 7 | aucun | — | refusée |
| Dopaminergique | `WN-SRC-0301` | 5 | aucun | — | refusée |
| Sérotoninergique | `WN-SRC-0302` | 5 | aucun | — | refusée |
| Psychobiotique | `WN-SRC-0303` | 8 | aucun | — | refusée |
| Antioxydante | `WN-SRC-0304` | 8 | aucun | — | refusée |
| Anti-inflammatoire | `WN-SRC-0305` | 5 | aucun | — | refusée |

**Deux sur douze.** Ce ne sont pas des oublis de lecture : les écarter est le
travail, exactement comme pour les huit tableaux du catalogue de conduites.

### Pourquoi « personne âgée » ne suffit pas, et c'est déjà tranché au dépôt

L'assiette protéinée a une indication de population, et le dépôt a **déjà**
refusé cette porte, avec son motif écrit dans `anamnese.ts` : *aucune borne
d'âge n'a de provenance au dépôt ; poser un pivot serait inventer un seuil
clinique* (`DC-19`). `Patient.dateNaissance` reste un fait administratif, lu par
le praticien, jamais par une gate. Ce qui manque n'est pas la donnée — c'est le
seuil.

### Pourquoi l'épargne digestive est la mieux placée des douze

C'est la seule dont l'indication soit à la fois **fondée par un claim** et
**lisible par un champ structuré déjà en service** : `intolerances_alimentaires`
est un `checkbox-multi` de l'anamnèse, écrit — son commentaire le dit — pour
qu'un moteur déterministe puisse le lire, là où le texte libre voisin ne remonte
qu'en contexte praticien.

**Une réserve à porter avant de signer** : le champ énumère trois valeurs, et
les claims de `WN-SRC-0297` n'en traitent nommément qu'une. Signer l'indication
sur les trois valeurs indistinctement, ce serait signer au-delà de ce que le
claim fonde — ou bien c'est un **raccourci assumé**, et il se déclare.

## LE FAIT TECHNIQUE QUI COMMANDE LA FORME

**Le catalogue actuel ne porte aucun contenu d'assiette.** `C5B_RECOMMENDED_PLATES`
tient trois entrées — un `plateCode`, un `label`, un `substitutionFamily` à
`null`, et des empreintes. Rien d'autre. Son propre commentaire le dit : le
contenu précis reste une décision manuelle du praticien, aucune composition n'est
inventée. Les trois assiettes existantes sont organisées par **moment du repas**
et n'ont **aucune source** : ce sont des repères repris de `JA5-03`.

Étendre « par indication » demande donc **un champ qui n'existe pas** — une
indication, et les claims qui la fondent. C'est un changement de contrat : le
`catalogVersion`, le `contentHash` de chaque assiette et le
`C5B_PLATE_CATALOG_HASH` se périment tous, et `assertCurrentRecommendedPlateRef`
refuse toute référence devenue caduque.

**Ce changement est gratuit aujourd'hui, et il ne le restera pas.** Lecture de la
production du 2026-09-16 : **zéro** brouillon porte une référence d'assiette,
zéro check-in, zéro approbation de diffusion. Aucune référence enregistrée ne
serait invalidée. La première assiette réellement prescrite ferme cette fenêtre.

## CE QUI EST PROPOSÉ

**Deux lignes publiées, dix en brouillon.** Le catalogue s'étend bien aux douze —
`D-213` §10 le veut ainsi, et les avoir toutes présentes évite qu'une assiette
absente se lise comme une assiette inexistante. Mais seules les deux dont
l'indication est fondée portent `statut: 'publiee'` ; les dix autres entrent en
`'brouillon'` : **présentes, jamais servies**, sur le patron exact du catalogue
de conduites.

**Les trois assiettes historiques sont conservées telles quelles**, sans
indication et sans claim. Elles sont en service, elles ne prétendent rien, et les
supprimer casserait des références sans bénéfice. **Écarté : les fondre dans les
douze** — elles se départagent par le moment du repas, les douze par
l'indication ; les mélanger sur un seul axe rendrait le catalogue illisible et
ferait croire à une provenance qu'elles n'ont pas.

## CE QUE L'ATTESTATION DEMANDERA, exactement

1. **Confirmer les deux indications** — pour l'épargne digestive et pour la
   détoxication — claim par claim : ce que **chacun fonde**, et non qu'il
   existe. Les identifiants et leur version (`v1.0`) ont été lus en production le
   2026-09-16 ; leur validité est établie, leur **rôle** est ce que vous attestez.
2. **Trancher la réserve du champ d'intolérances** : l'indication vaut-elle pour
   les trois valeurs énumérées, ou seulement pour celle que le claim nomme ? Si
   elle vaut pour les trois, c'est un **raccourci assumé** et il s'écrit.
3. **Confirmer les dix refus**, ou en relever un : une assiette refusée ici l'est
   faute d'indication fondée, pas faute d'intérêt clinique.
4. **Trancher la détoxication** : son indication vient du **protocole**
   `WN-SRC-0287`, pas de la fiche `WN-SRC-0299`. La ligne cite-t-elle les claims
   du protocole, ceux de la fiche, ou les deux ?
5. `validationExterne`, `dateValidation` en ISO canonique, et le `shaPerimetre`
   **recopié à la main** — jamais la constante recalculée (`D-063`).
6. La déclaration de conformité se rend **en séance, après lecture** ; la recopie
   du SHA est mécanique et ne vaut que portée par elle (`D-195` §1).

## CE QUE CE LOT NE PRÉTEND PAS

- **Le CI ne peut pas vérifier qu'un claim cité fonde l'indication.** Il
  n'atteint que le format. Le registre des sources est dense de `WN-SRC-0001` à
  `WN-SRC-0507` sans aucun trou : une vérification d'existence n'attraperait
  qu'une faute de frappe hors bornes.
- **Aucun contenu d'assiette n'entre au dépôt.** Les douze fiches sont
  `rightsStatus: to_verify` et `clinicalReviewStatus: not_reviewed`, comme les
  507 notices. Une ligne **désigne** son claim, elle ne le recopie pas — et le
  contenu de l'assiette reste, comme aujourd'hui, écrit par le praticien.
- **Rien ici ne concerne les familles d'équivalence.** Déclarer qu'une assiette
  peut en remplacer une autre est une affirmation d'une tout autre portée, et
  elle a sa propre surface.
