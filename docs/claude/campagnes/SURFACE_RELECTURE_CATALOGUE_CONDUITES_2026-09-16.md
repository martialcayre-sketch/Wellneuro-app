# Surface de relecture — les trois premières lignes du catalogue de conduites

*Écrite le 2026-09-16, LOT-01 de `D-206`. **Ce document ne signe rien.** Il
présente au praticien ce qu'il aurait à attester, et ce qui a été écarté.*

> ## ÉTAT AU 2026-09-17 — une ligne attestée, une désignation réfutée
>
> **`insomnie_jambes_sans_repos` est SIGNÉE** (`D-224`). Les deux autres lignes
> restent proposées : le périmètre se hache en entier, donc elles arriveront par
> une **nouvelle** attestation sur un périmètre élargi.
>
> **La désignation `claimsInstrument = WN-CL-0320-002` était FAUSSE pour la
> ligne 3, et elle reste JUSTE pour les lignes 1 et 2.** Lu en production le
> 2026-09-17, ce claim fonde l'emploi du **HAD** dans le bilan d'une insomnie
> sans cause identifiée — et il est `prescriptif = false`. Il fonde donc bien
> l'instrument des deux premières lignes, qui se déclenchent sur les sous-scores
> `D` et `A` du HAD. Il ne fonde rien pour la troisième, qui se déclenche sur
> l'**IRLS** (`Q_SOM_04`). La ligne signée porte `claimsInstrument: []`, et ce
> vide est une déclaration.
>
> **Ce que la vérification a fait apparaître en plus.** `WN-CL-0318-020` — le
> « troisième document » que ce texte citait sans le désigner — est un claim
> **prescriptif** qui fonde indépendamment la même indication et la même
> conduite. Il est entré au périmètre signé.
>
> **La leçon opposable** : une désignation de claim se vérifie sur le **texte du
> claim**, jamais sur la mémoire de qui l'a proposée. Ni le sha, ni le registre
> des sources, ni le CI n'atteignent cette classe d'erreur — le sha atteste le
> contenu relu, pas sa pertinence.
>
> **Les deux lignes restantes doivent donc être revérifiées de la même façon**
> avant toute attestation : leurs six claims d'indication et de sécurité n'ont
> pas encore été lus sur pièce.

La table `CATALOGUE_CONDUITES_V1` est livrée **vide**, ses verrous éteints, son
service fail-closed. Elle le restera jusqu'à ce que les lignes ci-dessous soient
relues, que leurs claims soient **désignés**, et que la métadonnée soit éditée.

## CE QUE LE DÉPÔT NE PEUT PAS FAIRE, ET C'EST LA RAISON DE CE DOCUMENT

> **Mis à jour le 2026-09-16 après lecture autorisée de la production.** Les
> identifiants sont désormais connus et désignés ci-dessous ; les comptes du
> registre se sont révélés **exacts à l'unité** (20, 29 et 7). Ce qui reste à
> vous n'est plus de trouver les claims, mais d'attester **ce que chacun fonde**.

Le dépôt sait **combien** de claims sont validés par source — le registre
d'interventions le porte, à l'instantané du **2026-08-03** :

| Source | Claims validés | En attente | Prescriptifs | Statut de curation |
| --- | ---: | ---: | ---: | --- |
| `WN-SRC-0315` | 20 | 0 | 16 | complet |
| `WN-SRC-0316` | 29 | 0 | 23 | complet |
| `WN-SRC-0318` | 29 | 0 | 20 | complet |
| `WN-SRC-0320` | 7 | 0 | 3 | complet |
| `WN-SRC-0295` | 14 | 0 | 13 | complet |

Il ne sait pas **lesquels**. Les identifiants et leur statut courant vivent dans
`rag_corpus_claims`, hors dépôt. **Le blocage n'est donc pas « aucun claim n'est
validé » — la curation de ces sources est complète.** Le blocage est que
désigner le claim qui fonde une indication est un acte clinique, et qu'il
revient au praticien.

## Les trois lignes proposées

Chacune est assise sur **son propre axe d'instrument**. C'est le critère qui les
rend stables et non simplement petites : aucune des lignes des lots suivants ne
viendra découper leur territoire, parce que le trio stress s'assoira sur un axe
distinct. La frontière signée ne bougera pas au lot suivant — et c'est ce qu'exige
le fait qu'un périmètre signé se hache en entier.

### 1. `insomnie_depression` — `WN-SRC-0315`

- **Ce qui la départage** : axe thymique. La forme horaire ne suffit pas à la
  distinguer de l'insomnie sur stress chronique — seule la comorbidité le fait.
- **Déclencheur disponible** : sous-score `D` de `Q_NEU_11`, dont les bandes sont
  publiées.
- **Pourquoi celle-ci en premier** : elle porte une **exclusion de sécurité
  écrite** — traiter le sommeil isolément y est déconseillé. C'est la ligne qu'on
  veut signée avant les autres.
- **Désignée deux fois indépendamment** dans le corpus (`WN-SRC-0315` et une
  branche de `WN-SRC-0318`).
- **Claims désignés — lus en production le 2026-09-16, à confirmer par vous** :
  - `claimsIndication` : **`WN-CL-0315-001`** (le trouble du sommeil parmi les
    critères de la dépression majeure — la porte d'entrée) et
    **`WN-CL-0315-002`** (la forme : réveil précoce, insomnie de fin de nuit).
  - `claimsInstrument` : **`WN-CL-0320-002`** (le HAD dans le bilan d'une
    insomnie sans cause identifiée) — c'est lui qui fonde le déclencheur.
  - `claimsSecurite` : **`WN-CL-0315-006`** — la règle qui fait de cette ligne la
    première à signer. Elle s'affichera au praticien avec la proposition.

### 2. `insomnie_anxiete` — `WN-SRC-0316`

- **Ce qui la départage** : axe anxieux, sous-type où l'anticipation du coucher
  s'auto-entretient.
- **Déclencheur disponible** : sous-score `A` du même instrument — autre échelle,
  donc pas de recouvrement avec la ligne 1.
- **Désignée deux fois** (`WN-SRC-0316` et une branche de `WN-SRC-0318`).
- **Claims désignés — à confirmer** :
  - `claimsIndication` : **`WN-CL-0316-001`** (insomnie d'endormissement avec
    anxiété anticipative au coucher) et **`WN-CL-0316-002`** (latence élevée,
    boucle auto-entretenue).
  - `claimsInstrument` : **`WN-CL-0320-002`**, le même appui que la ligne 1.
  - `claimsSecurite` : **`WN-CL-0316-006`** — une contre-indication explicite
    dans l'insomnie psychophysiologique.
- **Le premier `raccourciAssume` du catalogue s'écrit ici.**
  `WN-CL-0316-002` fonde l'indication sur une **latence d'endormissement**, or
  la latence n'est exposée par aucun indicateur lisible : l'agenda 21 nuits
  l'exclut explicitement. Le déclencheur retenu est le sous-score anxieux du
  HAD, qui n'est pas ce que le claim dit. **C'est un raccourci, il se déclare.**

### 3. `insomnie_jambes_sans_repos` — `WN-SRC-0320`

- **Ce qui la départage** : étiologie **motrice**, pas psychique.
- **Déclencheur disponible** : `Q_SOM_04`, dont une bande publiée nomme déjà la
  ferritine.
- **La mieux fondée du lot** : trois documents indépendants la désignent
  (`WN-SRC-0318`, `WN-SRC-0320`, bornée par `WN-SRC-0295`), et sa conduite tient
  en une action.
- **Claims désignés — à confirmer** :
  - `claimsIndication` : **`WN-CL-0320-003`**, seul. Il fonde **l'indication et
    la conduite à la fois** — le syndrome comme cause d'insomnie secondaire, et
    le dosage de ferritine qui en découle. La ligne la plus propre du lot.
  - `claimsInstrument` : **`WN-CL-0320-002`**.
  - `claimsSecurite` : aucune — le champ reste vide, et c'est une déclaration.

## HUIT TABLEAUX ÉCARTÉS, et chacun pour un motif nommé

Ce ne sont pas des oublis. Les écarter est le travail.

| Tableau | Pourquoi il n'entre pas |
| --- | --- |
| `insomnie_stress_recent` | **Le piège du lot.** Ces trois partagent une porte |
| `insomnie_stress_chronique` | d'entrée unique et se départagent par la **durée** |
| `insomnie_epuisement` | (qui n'existe qu'en texte libre) et par une **dominance** de symptôme (une appréciation, pas un seuil). En signer une seule maintenant lui donnerait le territoire des trois ; les deux autres y découperaient plus tard. **La ligne signée changerait de sens sans changer de texte** — exactement le mode de défaillance que le hachage du périmètre existe pour attraper. Elles attendent un arbitrage sur un seuil de fatigue et sur un champ de durée. |
| `desynchronisation_travail_poste` | Tableaux nets et orthogonaux, et les deux meilleurs candidats du **deuxième lot** — mais il n'existe **aucun champ structuré** pour le travail posté ni pour le voyage transméridien. `D-003` les interdit tant que le champ n'existe pas, et ce champ est petit. |
| `desynchronisation_jet_lag` | *(idem)* |
| `sevrage_hypnotiques` | Le déclencheur disponible dit « automédication » là où la source dit « prescrit au long cours ». Signer la ligne sur ce déclencheur, ce serait signer une indication que le claim ne fonde pas. |
| `sommeil_non_reparateur_sans_plainte` | Le tableau existe, mais son document de conduite ne pose aucun critère d'entrée et un tiers de sa porte n'est pas lisible. Une entrée négative dont une condition manque n'est pas stable. |
| `insomnie_troubles_digestifs` | Déclaré par un seul document, **aucune conduite, aucune action**. Rien à signer. |

## UN FAIT TECHNIQUE QUI COMMANDE LES LOTS SUIVANTS

`extraireCible` ne lit que `scores.subScores`. Or le PSQI publie ses sept
composantes sous `components`, et l'agenda 21 nuits n'expose que quatre
indicateurs — la latence et le compte de réveils en sont explicitement sortis.
**La forme de l'insomnie — endormissement, réveils nocturnes, réveil précoce —
n'est donc lisible par aucun déclencheur aujourd'hui.** Tout tableau départagé
par la forme est inconstructible sous `D-003` sans mécanisme neuf. Les trois
lignes proposées se départagent par la **comorbidité** ou l'**étiologie**,
jamais par la forme — c'est délibéré.

## CE QUE L'ATTESTATION DEMANDERA, exactement

1. Pour chaque ligne : **confirmer les désignations ci-dessus** — ce que chaque
   claim fonde, catégorie par catégorie. Les identifiants et leur version
   (`v1.0`) ont été lus en production le 2026-09-16 ; leur validité est établie,
   leur RÔLE est ce que vous attestez.
2. Pour chaque ligne : ce qu'elle **ajoute** au-delà de ses claims, écrit dans le
   champ `raccourciAssume` — ou `null` si elle n'ajoute rien. Ce champ est dans le
   périmètre haché : le reformuler périmera l'attestation, et c'est voulu.
3. `claimsSource` = l'union exacte des claims cités, ni plus ni moins. Le verrou
   refuse toute divergence dans les deux sens.
4. `validationExterne: true`, `dateValidation` en ISO canonique, et le
   `shaPerimetre` recopié **à la main** depuis le calcul.
5. L'enrôlement de `catalogueConduitesV1.ts` dans
   `shaPerimetreLitteral.guard.test.ts` — le jour de la signature, pas avant.

## CE QUE CE LOT NE PRÉTEND PAS

- **Le CI ne peut pas vérifier qu'un claim cité FONDE l'indication.** Il n'atteint
  que le format ; un identifiant plausible passerait tout le CI. Le registre des
  sources est dense de `WN-SRC-0001` à `WN-SRC-0507` sans aucun trou : une
  vérification d'existence n'attraperait donc qu'une faute de frappe hors bornes,
  et la présenter comme une barrière serait une fausse assurance.
- **La relecture praticien n'est pas une barrière technique.** Le statut « relu
  par le praticien » est un tampon posé par le serveur à chaque enregistrement,
  sans condition. Aucun raisonnement de sûreté de ce lot ne s'y adosse — et ce
  défaut, qui dépasse ce lot, est consigné à part.
