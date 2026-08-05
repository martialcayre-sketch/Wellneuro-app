# Les 29 instruments divergents — dossier d'arbitrage du scoring

Dossier d'aide à la décision. Il ne change aucune ligne de code et ne décide de
rien : il rend vérifiable ce sur quoi vous déciderez.

**Le contexte** : 10 instruments sur 64 portent `scoring_verifie`. Ce dossier porte
sur les **29 qui restent bloqués par une divergence** entre ce que leur source dit
et ce que l'application sert — 17 avec au moins une divergence *critique*, 12 avec
des *majeures* seulement. Les autres blocages (droits, contenu à verrouiller,
instruments suspendus) sont traités ailleurs.

**43 divergences hors libellés d'items.** Les divergences de libellé (78 relevées)
sont exclues : elles exigeraient de reproduire le verbatim des sources, ce que ce
dépôt s'interdit, et aucune ne bloque un barreau.

## Le fait le plus important : sept « critiques » sur dix-sept ne sont pas dans l'application

Avant de trancher quoi que ce soit, il faut retirer du lot ce qui n'y appartient
pas. **Le banc de certification a des angles morts, et ils ont produit sept
divergences critiques qui ne décrivent aucun défaut du scoring servi.**

### Six échelles de cotation que le banc n'a pas lues (`echelle_de_cotation`)

| Instrument | Ce que le banc dit de la source | Ce qui est servi |
|---|---|---|
| `Q_FIB_01` FiRST | `null–null` | 0–1 |
| `Q_GEO_03` AQ Sabbagh | `null–null` | 0–1 |
| `Q_NEU_04` SCOFF | `null–null` | 0–1 |
| `Q_STR_03` Cungi | `null–null` | 0–5 |
| `Q_TAB_05` HONC Di Franza | `null–null` | 0–1 |
| `Q_NEU_08` ECAB | `null–1` | 0–1 |

`null–null` n'est pas une échelle : c'est **l'absence de lecture**. Le banc conclut
« l'échelle servie ne couvre pas celle de la source » en comparant une valeur lue à
une valeur qu'il n'a pas. Cinq de ces six instruments sont des questionnaires
oui/non — leur échelle servie 0–1 est celle que l'on attend. `Q_NEU_08` sert bien
0–1, et le banc ne lit que la borne haute de la source.

**Sort proposé** : requalifier ces six divergences en **défaut de lecture du banc**,
et non de l'instrument. Le geste n'est pas de modifier le scoring, c'est de corriger
l'extraction ou de déclarer la borne au dossier.

### Un barème que le banc a cherché là où il n'est pas (`bareme_sans_source`)

`Q_NEU_11` (HAD). Le banc rapporte « source : aucun barème global / servi : 2 bandes
undefined–undefined ». **Vérifié dans le catalogue servi** : les bandes existent et
sont correctes — 0–7 « absence de symptomatologie », 8–10 « douteuse », 11–21
« certaine », **par sous-échelle A et D**. Ce sont les bandes publiées.

Le HAD n'a effectivement **pas** de barème global : le banc a cherché un total là où
l'instrument n'en produit pas, et a mal lu la structure par sous-échelle.

**Sort proposé** : divergence à annuler. C'est un troisième point sur lequel
l'application a raison et le corpus a tort.

---

## Ce qui reste, et qui demande votre arbitrage

**36 divergences sur 22 instruments**, en cinq familles. Chaque famille pose une
question différente ; les valeurs sont données instrument par instrument, pour que
la décision porte sur le contenu et non sur l'étiquette.

### 1. Un seuil de la source n'a pas de contrepartie servie (11 cas)

C'est la famille la plus nombreuse, et la plus simple à instruire : la source publie
un seuil, le scoring servi ne le représente pas.

| Instrument | Seuil de la source | Critiques |
|---|---|---|
| `Q_URO_01` IPSS | `<= 7` | 2 |
| `Q_FIB_02` QIF | `== 0` | 1 |
| `Q_NEU_06` MMT SIIN | `>= 1` | 1 |
| `Q_NEU_11` HAD | `<= 7` | 1 |
| `Q_NEU_12` IDTAS-AE | `> 5` | 1 |
| `Q_GEO_05` QDRS | `<= 1` | — |
| `Q_SOM_02` Epworth | `< 6` | — (confirmée par les deux lectures) |
| `Q_SOM_03` Berlin | `>= 2` | — |
| `Q_SOM_05` MEQ Horne | `> 70` | — |
| `Q_STR_04` DASS-21 | `>= 0` | — |
| `Q_STR_06` Karasek | `> 21` | — |

**Deux sorts possibles, et ils ne se valent pas.** Ajouter le seuil manquant aligne
l'application sur sa source — mais **change des valeurs servies aux patients**, et
tout ajout de bande crée une frontière qu'il faut assumer. Le documenter comme
écart assumé laisse l'instrument utilisable sans le faire mentir sur sa conformité.

Deux cas sont des artefacts, **vérifiés dans le catalogue servi**, et méritent
d'être écartés d'abord : `Q_STR_04` (`>= 0` n'est pas un seuil mais une borne, et
son moteur `subscore` sert bien ses trois sous-échelles D/A/S) et `Q_STR_06`, dont
le seuil de demande psychologique est servi à `21` avec `seuilDir: 'gt'` — soit
exactement le `> 21` que le banc dit non représenté.

### 2. L'application ajoute une conduite là où la source n'en donne pas (6 cas)

`Q_GEO_01` Tinetti (3 bandes), `Q_GEO_02` SARC-F (2), `Q_GEO_03` AQ (3),
`Q_NEU_02` MADRS (4), `Q_NEU_06` MMT SIIN (4), `Q_SOM_04` IRLS (4).

Les six sont **confirmés par les deux lectures**, et le constat est le même partout :
la source publie des bandes d'interprétation **seules**, l'application y attache une
**conduite** — « consultation pneumologue », « prise en charge spécialisée », etc.

**Ce n'est pas une erreur de scoring, c'est une valeur ajoutée WellNeuro** — et c'est
sans doute la contribution clinique la plus utile du produit. Mais elle est
aujourd'hui servie **au même rang** que la bande publiée, sans distinction d'origine.

**Sort proposé** : la déclarer, ne pas la retirer. `statutContenu: adapte` et une
description qui dit que la bande vient de la source et la conduite du cabinet. Le
filtre `scoresPourPrompt` retire déjà les conduites du prompt de synthèse ; ce qui
manque est la mention à l'écran et au dossier.

### 3. Le découpage en sous-échelles diffère (6 cas)

| Instrument | Source | Servi |
|---|---|---|
| `Q_STR_06` Karasek | 7 dimensions | 4 sous-scores |
| `Q_TAB_03` QCT2 | 5 dimensions | 4 sous-scores |
| `Q_GEO_02` SARC-F | 5 dimensions | score global seul |
| `Q_GAS_03` Bristol | 3 catégories | score global seul |
| `Q_NEU_03` SIGH-SAD-SA | 2 groupes | 3 sous-scores |
| `Q_URO_01` IPSS | 1 dimension | 2 sous-scores |

Trois sens différents, et ils n'appellent pas la même décision : **agréger** (Karasek,
QCT2, SARC-F, Bristol servent moins de dimensions que la source), **détailler**
(SIGH-SAD-SA, IPSS en servent plus). Agréger perd de l'information clinique ;
détailler en fabrique — et pour l'IPSS, le second sous-score est la question de
qualité de vie, que la source rapporte effectivement à part.

### 4. Le nombre d'items diffère (6 cas)

C'est la famille la plus lourde, parce qu'un écart d'items n'est pas un réglage :
c'est un autre instrument.

| Instrument | Source | Servi | Écart |
|---|---|---|---|
| `Q_ALI_03` méthode Monnier | 39 | 10 | **−29** |
| `Q_SOM_01` PSQI | 24 | 18 | −6 |
| `Q_GEO_06` 5 mots de Dubois | 5 | 10 | +5 |
| `Q_NEU_12` IDTAS-AE | 36 | 48 | +12 |
| `Q_GEO_01` Tinetti | 16 | 20 | +4 |
| `Q_URO_01` IPSS | 7 | 8 | +1 |

Deux de ces écarts s'expliquent par la structure, et je les ai vérifiés dans le
catalogue servi :

- `Q_GEO_06` déclare `phase1: 5 items` et `phase2: 5 items` — les 5 mots de Dubois
  passés **en deux temps**, rappel immédiat puis différé. Dix items pour cinq mots :
  c'est le protocole, pas un ajout.
- `Q_URO_01` sert `IPSS: 7 items` **plus** `QdV: 1 item` marqué `horsTotal`. La
  source rapporte précisément la question de qualité de vie **à part** du score de
  symptômes : l'application est donc plus fidèle que le banc ne le crédite — elle
  sert les 7 items exacts et exclut le huitième du total.

Les quatre autres sont des écarts réels de contenu — et `Q_ALI_03`, qui sert 10
items sur 39, est le plus grave du catalogue.

### 5. Bornes atteignables — ni le banc ni moi ne pouvons conclure (3 cas)

| Instrument | Bornes de la source | Ce que le balayage atteint |
|---|---|---|
| `Q_SOM_01` PSQI | 0–21 | 6 → 15 |
| `Q_FIB_02` QIF | 0–100 | 10 → 89,9 |
| `Q_NEU_08` ECAB | 0–10 | 1 → 9 |

**J'ai refait la mesure et je ne peux pas la conclure.** Saturer tous les items au
maximum donne 15 sur 21 pour le PSQI — mais le PSQI n'est pas monotone en ses
réponses : sa composante « efficacité » vaut 0 quand l'efficacité est *bonne*, et
saturer les horaires ne la maximise donc pas. Le balayage du banc a exactement la
même faiblesse que le mien.

Autrement dit : **on ne sait pas si ces bornes sont inatteignables**, et la question
n'est pas rhétorique — si le maximum réel du PSQI servi était 15, la bande
« troubles sévères » (17–21) serait inatteignable et le patient le plus atteint ne
la recevrait jamais. Le trancher demande une recherche ciblée par composante, pas un
balayage. C'est un lot à part, et le seul de ce dossier qui soit un travail de code
plutôt qu'un arbitrage.

`Q_NEU_08` est le plus lisible : son minimum est 1 et non 0 parce que l'item 10 est
inversé (« Faux » vaut 1 point). Le plancher 0 de la source est donc bien
inatteignable, et c'est établi sans balayage.

### 6. Un total numérique absent (1 cas)

`Q_INF_05` (auto-évaluation de l'anxiété SIIN) : la source annonce 0–11,
l'application ne sert **aucun total numérique** — son moteur `count_threshold`
compte les items au-dessus d'un seuil au lieu de sommer. Confirmé par les deux
lectures.

C'est probablement voulu — le comptage est la méthode décrite par le support — mais
alors la source annonce une échelle que l'instrument n'utilise pas, et l'écart doit
être déclaré.

---

## Ce que ce dossier ne fait pas

- Il ne modifie aucun barème, aucun seuil, aucune bande. Toute modification change
  des valeurs servies à des patients et relève d'une décision documentée au
  `CHANGELOG`.
- Il ne reproduit aucun verbatim de source : les 78 divergences de libellé sont
  écartées, et les valeurs citées ici sont des bornes, des comptes et des seuils.
- Il n'affirme pas que les 43 divergences sont des défauts. Sept sont des défauts de
  lecture du banc, deux ou trois autres sont probablement des artefacts, et trois ne
  sont pas décidables par la méthode qui les a produites.

## Ce que je propose comme ordre

1. **Annuler les sept fausses critiques** — six `null–null` et le barème du HAD.
   C'est un geste de dossier, pas de code, et il débloque sept instruments d'un
   coup. Aucune valeur servie ne change.
2. **Déclarer les six conduites ajoutées** (`adapte` + description). Même remarque :
   rien ne change pour le patient, l'instrument cesse de se présenter comme conforme
   à une source qu'il enrichit.
3. **Écarter les artefacts nommés** : `Q_STR_04` et `Q_STR_06` sur les seuils,
   `Q_GEO_06` et `Q_URO_01` sur le nombre d'items.
4. **Vous soumettre les écarts réels** : 9 seuils non représentés, 6 découpages, 4
   écarts d'items, 1 total absent. Vingt décisions, chacune sur une valeur servie.
5. **Ouvrir un lot de code séparé** pour les bornes atteignables : une recherche
   ciblée par composante, sur trois instruments.

Les étapes 1 à 3 ne demandent rien de vous et portent le compte de
`scoring_verifie` de 10 à un chiffre que je mesurerai avant de l'annoncer. L'étape 4
est la seule qui mène à 64, et elle passe par vous.
