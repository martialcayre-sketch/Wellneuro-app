# Surface de relecture — les trois premières lignes du catalogue de conduites

*Écrite le 2026-09-16, LOT-01 de `D-206`. **Ce document ne signe rien.** Il
présente au praticien ce qu'il aurait à attester, et ce qui a été écarté.*

La table `CATALOGUE_CONDUITES_V1` est livrée **vide**, ses verrous éteints, son
service fail-closed. Elle le restera jusqu'à ce que les lignes ci-dessous soient
relues, que leurs claims soient **désignés**, et que la métadonnée soit éditée.

## CE QUE LE DÉPÔT NE PEUT PAS FAIRE, ET C'EST LA RAISON DE CE DOCUMENT

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
- **À fournir** : le ou les `claimId` qui fondent l'indication, parmi les 20
  validés de la source.

### 2. `insomnie_anxiete` — `WN-SRC-0316`

- **Ce qui la départage** : axe anxieux, sous-type où l'anticipation du coucher
  s'auto-entretient.
- **Déclencheur disponible** : sous-score `A` du même instrument — autre échelle,
  donc pas de recouvrement avec la ligne 1.
- **Désignée deux fois** (`WN-SRC-0316` et une branche de `WN-SRC-0318`).
- **À fournir** : le ou les `claimId`, parmi les 29 validés.

### 3. `insomnie_jambes_sans_repos` — `WN-SRC-0320`

- **Ce qui la départage** : étiologie **motrice**, pas psychique.
- **Déclencheur disponible** : `Q_SOM_04`, dont une bande publiée nomme déjà la
  ferritine.
- **La mieux fondée du lot** : trois documents indépendants la désignent
  (`WN-SRC-0318`, `WN-SRC-0320`, bornée par `WN-SRC-0295`), et sa conduite tient
  en une action.
- **À fournir** : le ou les `claimId`, parmi les 7 validés.

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

1. Pour chaque ligne : le ou les `claimId` + `versionClaim` qui fondent son
   indication, et pour chacun la confirmation qu'il est `VALIDE` et actif.
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
