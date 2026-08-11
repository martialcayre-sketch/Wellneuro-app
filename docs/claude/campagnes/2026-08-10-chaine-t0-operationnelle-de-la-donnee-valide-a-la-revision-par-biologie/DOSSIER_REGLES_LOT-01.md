# Dossier de règles candidates — LOT-01, moteur de discordances

> **Instruction.** Ce dossier a instruit la question d'ouverture du LOT-01
> (« les trois règles de discordance, prédicat par prédicat »). Il propose ; il
> ne décide pas. Aucun code, aucune migration.
>
> **Ses propositions ont été tranchées par [[D-042]]** le 2026-08-11 : C-STR
> retenue à `≤ 8` (trou à 9 laissé ouvert), C-SOM retirée de la V1, C-ALI
> reportée, et le banc de fraîcheur des claims épinglés versé au périmètre du
> lot. Ce qui suit reste l'instruction, non la décision : en cas d'écart, le
> registre fait foi.
>
> Grille appliquée : `docs/claude/doctrine/CONSTITUTION_CLINIQUE.md`. Chaque
> prédicat est descendu jusqu'à sa provenance (`DC-19`) et jugé sur ce qu'il
> autorise à conclure (`DC-09`, `DC-28`).
>
> Établi le 2026-08-11 contre `13cdc259`.

---

## Résultat de la descente

Les trois règles de la spec (`sources/02-spec-lots-parcours-t0.md:108-111`) ne
sont pas dans le même état.

| Règle | Provenance des prédicats | Verdict |
|---|---|---|
| **C-STR** | Entièrement adossée aux bandes publiées des deux instruments. | **Recevable en l'état**, un arbitrage de bord à trancher. |
| **C-SOM** | Bandes publiées disponibles, mais l'axe mesuré **ne mesure pas ce que la règle suppose**. | **À réécrire ou à retirer** — voir §2. |
| **C-ALI** | Un prédicat sur deux n'a **aucun support en base**. | **Non instruisible** en l'état — voir §3. |

Autrement dit : la règle qu'on croyait la plus simple est la seule prête, et
celle qui portait le signal le plus intéressant est celle qui ne tient pas.

---

## 1. C-STR — adaptation effondrée malgré un DASS normal

**Énoncé spec** : `ADAPTATION_STRESS ≤ 8` ∧ DASS stress et dépression normaux.

### Prédicat 1 — `ADAPTATION_STRESS ≤ 8`

Provenance : les bandes propres de l'axe, documentées dans
`web/src/lib/clinical/orientationRulesV1.ts:676-682` — **0-8 « Adaptation
perturbée »**, 10-17 « Adaptation insuffisante », 18-24 « Adaptation
satisfaisante ». `≤ 8` est donc exactement la bande défavorable basse, pas un
chiffre choisi. `DC-19` est satisfaite.

**Le bord à trancher.** Ces bandes laissent un **trou à 9** : la valeur 9
n'appartient à aucune bande. La règle `R2-STR-01` a déjà rencontré ce trou et
l'a couvert par le haut (`≤ 17` englobe 9). C-STR à `≤ 8` le laisse dehors :
un patient à 9 n'est ni « perturbé » ni « insuffisant » pour cette règle. Deux
issues, toutes deux défendables :

- `≤ 8` — fidèle à la bande, laisse 9 sans règle ;
- `≤ 9` — ferme le trou, mais élargit la bande d'un point sans source.

C'est un arbitrage clinique, pas un banc. Il se tranche ici ou il se
reproduira à chaque règle écrite sur cet axe.

### Prédicat 2 — « DASS stress et dépression normaux »

Provenance : `web/src/lib/questions.ts:157-159`. Bande « Normal » :
dépression `D ≤ 4`, stress `S ≤ 7`. (L'anxiété `A ≤ 3` existe aussi et n'est
pas visée par la spec — volontairement, la discordance portant sur l'axe
adaptatif.) `DC-19` satisfaite.

### Recoupement avec l'orientation existante

`R2-STR-01` se déclenche déjà sur `ADAPTATION_STRESS ≤ 17` et suggère le
PSS-10. C-STR se déclenchera donc **sur un sous-ensemble** de la population de
`R2-STR-01`. Les deux ne disent pas la même chose — l'une propose une mesure,
l'autre signale une contradiction — mais le praticien verra les deux en même
temps. `DC-37` demande de justifier la seconde sortie ou de s'en abstenir :
ici la justification tient (le PSS-10 mesure l'intensité, la vigilance nomme
la contradiction), mais elle doit être **écrite dans la règle**, pas
supposée.

### Formulation candidate (neutre, `DC-09`)

> « Adaptation au stress rapportée comme perturbée alors que les échelles
> spécifiques restent dans la bande normale — signal fonctionnel non confirmé
> par les instruments spécifiques, à clarifier en entretien. »

---

## 2. C-SOM — la règle ne mesure pas ce qu'elle croit mesurer

**Énoncé spec** (`sources/02-spec-lots-parcours-t0.md:109-110`) : DNST
mélatonine perturbé ∧ PSQI ≤ 5 ∧ Epworth < 10 ∧ Berlin faible ∧ **plainte
sommeil ≤ 2**.

**Le seul chiffre sans provenance de tout ce dossier est ce `≤ 2`**, et la
première rédaction l'avait laissé tomber en tronquant l'énoncé. La plainte
sommeil est le sous-score `sommeil` de `Q_MOD_03` (`Q005`,
`mode-de-vie.ts:29`), dont la bande basse est **1-3** : `≤ 2` ne borne donc
rien — il coupe à l'intérieur d'une bande. C'est
lui qui tombe sous le coup de `DC-19`, et il faudra le trancher (bande `≤ 3`,
ou seuil déclaré `technical` au sens de `DC-20`, assumé par l'ingénierie) le
jour où C-SOM reviendra. La règle étant retirée de la V1, l'arbitrage ne
bloque rien aujourd'hui.

### Ce que la descente trouve

Les seuils existent tous. Le DNST publie ses bandes
(`web/src/lib/questions.ts`, `Q_INF_03`) : **0-9 « Peu perturbé »**, 10-19
« Perturbations probables », 20-40 « Fortement perturbé ». Le choix de la
bande qui ouvre la règle est un arbitrage du même type que celui de C-STR — et
il aurait suffi de le poser.

**Mais l'axe `ME` du DNST n'est pas un axe de sommeil.** Ses dix items :

| Item | Contenu | Nature |
|---|---|---|
| ME1 | « marginal(e), exclu(e), mal à l'aise dans un groupe » | social |
| ME2 | « plutôt discret(e) et en retrait en société » | social |
| ME3 | « sommeil fragile » | **sommeil** |
| ME4 | « du mal à aller me coucher le soir » | **rythme** |
| ME5 | « n'aime pas partager des confidences » | social |
| ME6 | « pas très conciliant(e) ni adaptable » | social |
| ME7 | « rythmes de vie souvent irréguliers ou décalés » | **rythme** |
| ME8 | « du mal à me mettre à la place des autres » | social |
| ME9 | « du mal à m'exprimer, à partager » | social |
| ME10 | « supporte mal les décalages horaires » | **rythme** |

Six items sur dix mesurent la **sociabilité**. L'axe est d'ailleurs titré
« Mélatonine — Rythme **et socialisation** ».

### La conséquence

Le sous-score `ME` plafonne à 40. Les six items sociaux pèsent à eux seuls
jusqu'à **24 points sur 40**. Un patient réservé, introverti, qui dort
parfaitement bien, peut donc dépasser 20 — la bande « Fortement perturbé » —
sans le moindre item de sommeil coché.

Or c'est exactement la population que C-SOM va sélectionner : la règle exige
que le PSQI, l'Epworth et le Berlin soient **rassurants**. Elle ne signale donc
pas « une discordance entre un signal fonctionnel de sommeil et les
instruments spécifiques » ; elle signale, avec une fiabilité inconfortable,
**un patient introverti qui dort bien**.

C'est le cas d'école que `DC-09` (« un claim associatif ne devient jamais une
preuve ») et `DC-28` (« un questionnaire isolé ne suffit pas à conclure »)
existent pour attraper. La vigilance produite serait fausse, et elle serait
fausse **systématiquement**, pas au hasard.

### Trois issues

1. **Restreindre le prédicat aux quatre items de rythme** (ME3, ME4, ME7,
   ME10, plafond 16). La règle mesurerait alors ce qu'elle prétend mesurer.
   Coût : un sous-score qui n'existe pas dans le catalogue — donc une
   modification du scoring, c'est-à-dire un `D-xxx` et un `versionScore`, hors
   du périmètre annoncé du LOT-01.
2. **Retirer C-SOM de la V1** et livrer le moteur avec C-STR seule, en
   nommant la raison. Le moteur, son patron et son injection sont le vrai
   livrable du lot ; deux règles ou une ne changent pas son architecture.
3. **Maintenir C-SOM telle quelle.** Non recommandé : la spec en fait une
   régression testée (section 57), et le banc validerait alors un
   comportement faux.

**Recommandation : issue 2 pour le LOT-01, issue 1 instruite séparément.**
Elle sépare ce qui est architecture (le moteur) de ce qui est clinique (un
sous-score nouveau), ce que la campagne fait déjà partout ailleurs.

### Réserve sur le reste du prédicat

`PSQI ≤ 5` et `Epworth < 10` sont les cut-offs publiés de ces instruments.
« Berlin faible » n'a en revanche pas de traduction directe : le Berlin
produit un risque par catégories, pas un score continu. La forme exacte du
prédicat reste à écrire, quelle que soit l'issue retenue ci-dessus.

---

## 3. C-ALI — un prédicat sans support

**Énoncé spec** : restriction déclarée (drapeau anamnèse) ∧ plainte surpoids
`≥ 7`.

### Prédicat 1 — « restriction déclarée (drapeau anamnèse) »

**Il n'existe pas.** `DrapeauxAnamnese`
(`web/src/lib/consultation/drapeauxAnamnese.ts:14-31`) porte dix clés à `367688ad` :
`signauxAlerte`, `antecedentsDomaines`, `facteursDeclenchants`, `attentes`,
`automedication`, `debut`, `evolution`, `variationPoids`. Aucune ne concerne
une restriction, une éviction ou un régime d'exclusion ; `anamnese.ts` n'offre
aucune option de ce type.

La spec suppose un drapeau que le recueil ne produit pas. Ouvrir ce drapeau
signifie modifier le questionnaire d'anamnèse — un geste clinique à part
entière, avec son `D-xxx`, et manifestement hors du périmètre d'un lot dont le
but est le garde-fou de synthèse.

À noter : `variationPoids` existe et est proche du sujet sans le couvrir — une
variation de poids déclarée n'est pas une restriction déclarée. Substituer
l'un à l'autre serait précisément l'extrapolation que `DC-14` interdit.

### Prédicat 2 — « plainte surpoids ≥ 7 »

**Sourcé.** Ce dossier avait d'abord conclu l'inverse, en cherchant le support
dans `web/src/lib/plaintes.ts` — fichier qui se déclare pourtant lui-même
« définition d'affichage uniquement » (ligne 14). La grille est ailleurs :
`surpoids` est le sous-score `Q004` de `Q_MOD_03`
(`web/src/lib/questionnaires/mode-de-vie.ts:28`), questionnaire certifié
`drive`, et sa grille d'interprétation est explicite
(`mode-de-vie.ts:33-37`) — 1-3 « Intensité faible ou absente », 4-6
« modérée », **7-8 « élevée »**, 9-10 « très élevée ».

`≥ 7` est donc exactement l'ouverture de la bande « Intensité élevée », et le
dépôt s'en sert déjà au même seuil dans la table d'orientation **signée** :
`R2-NEU-01` déclenche sur `Q_MOD_03/moral >= 7` en motivant « `>= 7` :
« Intensité élevée » et « très élevée » de `Q_MOD_03` »
(`orientationRulesV1.ts:775-786`). `DC-19` est satisfaite.

**Avec la restriction que le questionnaire pose lui-même** (`mode-de-vie.ts:23`,
`note`) : `Q_MOD_03` est « sans seuil diagnostique », ses quatre lectures sont
**descriptives**. `≥ 7` est donc la borne d'une intensité déclarée, jamais un
cut-off clinique — la distinction exacte de `DC-20`. C'est l'usage qu'en fait
`R2-NEU-01` (objectiver une plainte intense pour savoir ce qu'on écarte), et
c'est le seul usage que C-ALI pourra en faire.

**Leçon de méthode, à retenir pour les prochaines descentes** : chercher la
provenance d'un seuil de plainte dans le renderer d'affichage plutôt que dans
le questionnaire qui la cote produit un faux positif `DC-19` — exactement
l'anti-patron que `DC-26` décrit (le code qui duplique la doctrine, et la
descente qui lit le double au lieu de la source).

### Verdict

C-ALI n'est pas instruisible dans ce lot. Elle dépend d'une modification du
recueil d'anamnèse, qui est un autre geste, dans un autre lot.

---

## Ce que ce dossier propose au LOT-01

| Point | Proposition |
|---|---|
| C-STR | **Retenue, `≤ 8`** ([[D-042]]) — la bande publiée, le trou à 9 laissé ouvert. Reste à écrire la justification du recoupement avec `R2-STR-01`. |
| C-SOM | **Retirée de la V1** ([[D-042]]), motif inscrit dans la table. Le sous-score de rythme (ME3/ME4/ME7/ME10) est instruit à part, avec son `versionScore`. |
| C-ALI | **Reportée** ([[D-042]]). Dépend d'un drapeau d'anamnèse qui n'existe pas. |
| Moteur | Livré au patron `orientationRulesV1.ts` (`DC-26`) : table versionnée, claims épinglés, signature, SHA, `validationExterne` initialement `false`. **Avec la réserve §E de l'audit** : ce patron n'a pas de compilateur — `tools/corpus/orientation/` n'a jamais existé. Épingler des claims sans banc qui vérifie qu'ils existent, sont `VALIDE` et non `superseded` duplique le trou dans une table neuve. Le banc est à poser ici, pas plus tard. |
| Prompt v20 | Inchangé dans son périmètre : interdit de causalité (`DC-27`), taxonomie facteur de risque / symptôme / dépistage, restitution neutre. Ces trois-là ne dépendent d'aucune des règles ci-dessus. |
| Schéma strict | Inchangé : rejet + une relance au lieu de la coercion. Indépendant lui aussi. |

**Le lot ne rétrécit pas.** Ses quatre livrables d'architecture — moteur,
prompt v20, schéma strict, injection cockpit — sont intacts. C'est le
peuplement de la table qui passe de trois règles à une, et une table de
contradictions à une règle signée vaut mieux qu'une table à trois dont deux
produisent des vigilances fausses.

## Réserves nommées

- Aucun claim NNPP2 n'a été attribué aux trois règles : la descente s'est
  arrêtée aux **instruments**, qui suffisent à fonder C-STR. Le patron
  `orientationRulesV1.ts` exige néanmoins un `justificationClaims` — il reste
  à instruire pour C-STR avant écriture.
- La forme du prédicat « Berlin faible » n'est pas tranchée (§2).
- Le recoupement C-STR / `R2-STR-01` est signalé, pas résolu : deux sorties
  simultanées pour un même patient restent à valider côté écran.
