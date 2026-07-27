# Audit des claims biologie étiquetés non prescriptifs

**Date** : 2026-07-27
**Objet** : décision 8 des arbitrages du 2026-07-27 — vérifier qu'aucune plage de
référence ni seuil clinique ne se cache parmi les claims du notebook 08 éligibles
à la voie rapide.
**Réponse courte** : il s'en cache **au moins 55** — plancher mesuré sur 43 % de
la population, pas total. Et la question posée — « le LLM sous-étiquette-t-il ? »
— n'a pas de réponse mesurable : c'est la voie rapide elle-même qui repose sur
une distinction indécidable.

---

## 1. Ce qui était demandé, et ce qui a été fait

Le cadrage CB pariait que les claims de biologie seraient prescriptifs ou
interprétés, donc automatiquement en voie lente. La mesure l'a démenti : **563
des 758 claims du notebook 08 (74 %) sont étiquetés `déclaré` ou `observé` non
prescriptifs**, donc éligibles à la signature par lot avec échantillonnage.

Deux lectures étaient ouvertes : soit ces claims ne sont réellement pas
prescriptifs, soit le rédacteur les sous-étiquette. Le praticien a demandé la
relecture d'**une trentaine** d'entre eux pour trancher.

**Un échantillon de trente n'aurait pas suffi à trancher.** À 30 tirages, un
phénomène touchant 10 % de la population est vu trois fois en espérance : de quoi
constater, pas de quoi dimensionner un garde. Le recensement complet coûtait
quatre requêtes de plus. Il a été fait.

| Strate | Effectif | Traitement |
|---|---|---|
| Population éligible voie rapide (notebook 08) | **563** | — |
| … dont capturés par motifs (unité biologique, vocabulaire de seuil, comparateur, intervalle numérique) | 88 | **lus un par un** |
| … dont résidu porteur d'au moins un chiffre | 157 | **lus un par un** |
| … dont résidu sans aucun chiffre | 318 | exclus par construction |
| **Total effectivement lu** | **245** | |

**Les 55 claims retenus proviennent tous des 88 capturés par motifs ; la lecture
des 157 autres n'en a rendu aucun.** C'est ce qui autorise les chiffres de rappel
et de précision du §6, et rien d'autre ne les soutient.

L'exclusion des 318 repose sur une hypothèse explicite : *une plage de référence
ou un seuil de décision porte un nombre*. Elle laisse passer un énoncé du type
« les valeurs normales sont celles fournies par le laboratoire » — qui ne serait
pas non plus exploitable comme seuil. **C'est la zone non lue de l'audit.**

Elle n'est pas tout à fait vierge, et il faut dire exactement ce qui s'y trouve.
Un tirage de 30 claims (`ORDER BY md5(id)` — une permutation fixe, reproductible,
pas un tirage indépendant) avait été lu avant le recensement exhaustif, sur les
508 claims non capturés par la première passe de motifs. **20 d'entre eux — compté,
pas estimé — ne portaient aucun chiffre** et relèvent donc de la strate non lue ;
aucun ne portait de seuil. C'est le seul regard jamais porté sur ces 318 — un
regard de 6 %, sans puissance statistique utile. Il ne referme pas la zone, il en
donne une idée.

---

## 2. Résultat : au moins 55 claims sur 563 portent un seuil ou une plage

**9,8 % de la population éligible à la voie rapide — un plancher, mesuré sur les
43 % lus.**

### 36 plages de référence ou seuils biologiques

Concentrés sur cinq sources, dont trois portent 34 des 36 :

| Source | Claims porteurs | Exemples |
|---|---|---|
| WN-SRC-0041 | **25** | `WN-CL-0041-066` glutamate 50-77 µmol/L ; `WN-CL-0041-067` GABA 0,40-0,85 µmol/L ; `WN-CL-0041-065` kynurénine/tryptophane 21-36 µmol/mmol ; `WN-CL-0041-069` mélatonine 6-SMLT 10-45 µg/24 h ; les plages de tolérance urinaires (`-019` à `-027`, `-041` à `-043`, `-047` à `-051`) ; liste exhaustive au §7 |
| WN-SRC-0044 | **6** | `WN-CL-0044-003` ferritine, **grille complète en cinq bandes** (carence profonde < 10, déficience < 30, suboptimal < 50, confort 50-80, élevé > 80 ng/ml) ; `-007` zinc 88-146 µg/dL, souhaité > 110 ; `-009` magnésium érythrocytaire 4,4-5,8 mg/dL, optimal > 5 ; `-013` iode, pas de toxicité sous 300 µg/L ; `-020` vitamine E/cholestérol 5,4-9,2 mg/g ; `-022` valeurs normales B1/B2/B3/B6 |
| WN-SRC-0043 | **3** | homocystéine : normale < 5-8, méthylation insuffisante > 8-10, risque vasculaire > 15 µmol/l |
| WN-SRC-0021, WN-SRC-0031 | 2 | rapport T3/rT3 > 20 ; alcoolémie, seuil 0,16 g/L |

Le cœur de la biologie fonctionnelle — homocystéine, ferritine, magnésium
érythrocytaire, GABA, glutamate, mélatonine — est intégralement dans cette liste.
Ce sont exactement les bornes qui alimenteraient les seuils d'un moteur
d'orientation biologique.

### 19 bandes d'interprétation de scores cliniques

| Source | Claims | Instrument |
|---|---|---|
| WN-SRC-0047 | 8 | HAD (`-016`, `-022` à `-025`), DASS21 (`-027` à `-029`) |
| WN-SRC-0048 | 5 | hyperexcitabilité (`-007` à `-010`), Pichot (`-014`) |
| WN-SRC-0046 | 4 | Beck (`-013`), Conners > 15 (`-026`), Bratman > 4 (`-028`), Q-MAT (`-030`) |
| WN-SRC-0049 | 2 | bandes dimensionnelles (`-007`, `-013`) |

---

## 3. La voie rapide repose sur une distinction que personne ne sait appliquer

C'est le résultat qui compte, et c'est une **troisième lecture**, absente des deux
que la décision 8 proposait.

Le prompt de rédaction (`tools/corpus/claims/draft.mjs:51-55`) définit quatre
typologies et un booléen. Extrait, les deux typologies en cause et le booléen —
`"observé"` (l. 52) et `"vécu"` (l. 53) sont élidés :

> • `"déclaré"` : l'extrait énonce un fait, une donnée, une définition ;
> […]
> • `"interprété"` : une interprétation, une conclusion, une recommandation raisonnée.
> `"prescriptif" = true` si le claim recommande une action, une dose, une conduite ; sinon false.

L'élision n'est pas neutre : `"observé"` étiquette **89 des 563** claims audités,
et l'argument de frontière développé ci-dessous vaut pour lui comme pour
`"déclaré"` — un dosage constaté rapporté avec sa plage de tolérance pose
exactement la même question.

Sur `prescriptif`, le verdict est net et sans réserve : « Les valeurs normales
d'homocystéine sont inférieures à 5 à 8 μmol/l » ne recommande **aucune** action,
aucune dose, aucune conduite. Aucun des 245 claims lus n'est prescriptif au sens
de cette définition. Demander au rédacteur d'étiqueter « prescriptif » une plage
de référence serait lui demander de contredire la consigne reçue.

**Sur `déclaré` contre `interprété`, en revanche, la frontière ne tient pas**, et
c'est là que se joue la conclusion. `WN-CL-0044-003` classe la ferritine en cinq
bandes dont les noms sont des jugements — « carence profonde », « suboptimal »,
« zone de confort », « zone élevée ». Est-ce une **donnée** que le cours énonce,
ou une **interprétation** ? Les deux lectures se défendent mot à mot dans la
définition citée. Il en va de même des 19 bandes de scores du §2, dont le titre
porte le mot « interprétation ».

Cet audit **ne tranche pas** cette question, et il ne le peut pas : elle porte sur
l'intention d'un cours, pas sur une propriété mesurable du texte. Ce qui est
mesurable, c'est que les deux branches mènent au même endroit :

- **si les étiquettes sont justes**, l'allowlist (`revue.ts:489-497`, redondée par
  le trigger de la migration `20260723120000`) filtre sur `typologie_lecture` et
  `prescriptif` — **deux champs dont aucun n'encode « ce claim porte une borne de
  décision »**. Il manque alors un troisième champ ;
- **si elles sont fausses** — si ces 55 relevaient d'`interprété` —, l'allowlist
  serait bien conçue mais alimentée par un jugement de modèle que 55 cas sur 563
  prennent en défaut. Un filtre correct sur une entrée non fiable ne filtre rien.

Dans les deux cas, **laisser cette classe de claims dépendre d'un arbitrage
typologique est le défaut**. Un garde qui repose sur une distinction qu'un lecteur
compétent ne sait pas appliquer de façon reproductible n'est pas un garde. La
recommandation du §6 est la seule qui vaille sous les deux branches : décider sur
le **contenu**, qui est vérifiable, plutôt que sur la typologie, qui est un avis.

---

## 4. Ce que la voie rapide validerait aujourd'hui, en régime nominal

Aucun lot du notebook 08 n'a été signé : les **758 claims sont tous
`EN_ATTENTE_VALIDATION`**. Le constat est préventif, pas un incident.

Le pire cas est chiffrable. Sur `WN-SRC-0041` — 74 claims, **49 éligibles**, dont
**25 porteurs d'une plage** :

- le taux applicable est **30 %** (`ECHANTILLON_TAUX_RODAGE`), et il l'est pour
  deux raisons indépendantes (`revue.ts:577-586`, comptage **global**, sans filtre
  de notebook) : sept sources portent un `decision_lot`, sous le seuil de rodage
  de dix — et une `bascule_individuelle` a déjà eu lieu, ce qui maintient le
  rodage quel que soit le nombre de sources signées ;
- `tailleEchantillon(49, 0,3)` = **15 claims** tirés ;
- **34 claims passent `VALIDE` sans avoir été lus un par un**, dont **≈ 17 plages
  de référence** en espérance.

**Le taux relâché de 20 % (`ECHANTILLON_TAUX_RELACHE`) est aujourd'hui
inatteignable**, et c'est un fait à connaître pour lui-même : `bascules` est un
`count(*)` global sur un journal en ajout seul, et il vaut déjà 1. Tant que cette
ligne existe, `bascules > 0` force le rodage quel que soit le nombre de sources
signées — la branche 20 % ne s'exécutera jamais. Elle serait pourtant plus dure :
10 claims tirés, **39 non lus**.

Ce n'est pas le chemin dégradé : c'est le chemin nominal, échantillon conforme,
zéro défaut. `deciderLot` porte d'autres contrôles — lot divergent depuis le
tirage (`revue.ts:807-810`), intégrité des sources par claim (`:811-836`),
concurrence à l'écriture (`:895-899`) —, aucun n'ayant pour objet la nature du
claim. Deux méritent d'être nommés parce qu'on pourrait les croire suffisants :

- **la disqualification du lot au premier défaut** suppose un défaut. Il n'y en a
  pas : ces claims *sont* fidèles à leur source. Un seuil correctement recopié
  d'un cours passe tout contrôle de fidélité ;
- **le questionnaire de restitution** (`revue.ts:789-791`) et son contrôle de
  couverture (`revue.ts:845-869`) exigent qu'une question touche **chaque chunk
  atteignable** de la source. C'est un contrôle réel et exhaustif par chunk —
  mais la couverture est par **chunk**, jamais par claim : un praticien peut le
  déclarer conforme sans avoir jamais vu passer les 34 claims non tirés.

Le risque n'est donc pas qu'un contrôle manque : c'est qu'aucun des contrôles
existants n'a pour objet ce qu'un seuil de décision engage.

---

## 5. Effet de bord : le corpus et le barème servi divergent

Vérifié à la ligne sur le HAD :

| Source | Bandes |
|---|---|
| Corpus, `WN-CL-0047-016` / `-022` à `-025` | 0-7 normal, 8-10 **léger**, 11-14 **modéré**, 15-21 **sévère** (quatre bandes) |
| Application, `Q_NEU_11` (`web/src/lib/questionnaires/neuropsychologie.ts:32-33`) | 0-7 absence de symptomatologie, 8-10 douteuse, 11-21 certaine (trois bandes) |

**Ce n'est pas une contradiction, et la nommer ainsi serait exagérer** : les points
de coupure 7/8 et 10/11 concordent, et la version en trois bandes est un
grossissement de celle en quatre. Aucun score n'est classé dans deux catégories
incompatibles. Ce qui diffère est la granularité et les libellés — assez pour que
deux surfaces qualifient différemment un même HAD à 15.

Deux faits de contexte, sans lesquels le constat pèserait plus lourd qu'il ne
vaut :

- `WN-SRC-0047` est **« 9 Exploration catégorielle fondamentale.pdf »**, un PDF de
  cours du cabinet — exactement la classe de source que la décision 1 subordonne à
  la publication primaire ;
- le côté application porte déjà `certification:{source:'drive',status:'certifie'}`
  (`neuropsychologie.ts:29`).

Sous la doctrine de la décision 1, **ni le corpus ni le Drive n'est primaire** :
départager ces deux barèmes demande de lire Zigmond & Snaith, pas de choisir entre
les deux versions internes.

**Aucun chemin de restitution ne sert aujourd'hui une interprétation de score**,
mais pas pour la raison qu'on croirait. Le seul appelant runtime de la barrière
`match_wellneuro_rag_claims` est `rayonCorpus.ts:140` (surface praticien,
derrière `WN_C4_ENABLED` fail-closed) — et il filtre sur `metadata.rayon`,
qu'**aucun claim ne porte** ; c'est ce filtre que la décision 7 s'apprête à
remplacer. Les routes `api/praticien/corpus/*`, elles, **ne passent pas par la
barrière** : elles lisent les tables en direct, ce que leur en-tête assume
explicitement (`api/praticien/corpus/claims/route.ts:19-20`,
`lib/rag/claims/recherche.ts:7-12`) — c'est une surface de revue, pas de
restitution clinique, et elle affiche donc **déjà** ces textes.

Le risque est donc **prospectif**, exactement comme celui du §6.3, et signalé ici
pour la même raison : il devient réel le jour où la surface s'ouvre, pas avant.

**Ce n'est pas le garde de la décision 7.** Celui-là (arbitrages, §7) échoue si un
`source_id` est absent du registre ou si son `primaryNotebook` diverge du
`notebook` du chunk : il porte sur l'**attribution** source → notebook. Il ne se
déclencherait jamais sur une divergence de **contenu** entre un claim et un
barème. Le rapprochement est tentant et il est faux — c'est un sujet neuf, qui
appelle son propre garde et son propre arbitrage.

---

## 6. Ce que l'audit recommande

1. **Ne pas ouvrir la voie rapide sur le notebook 08** tant qu'un garde de contenu
   n'existe pas. C'est la seule recommandation bloquante.
2. **Ajouter un garde par contenu** : tout claim porteur d'un nombre associé à une
   unité biologique, à un comparateur ou à un vocabulaire de seuil part en revue
   individuelle, quelles que soient sa typologie et sa valeur de `prescriptif`.
   Les motifs de cet audit sont réutilisables tels quels, et leur performance est
   mesurée **sur les 245 claims lus, soit 43 % de la population** : **rappel
   100 %** — aucun des 55 n'a échappé aux motifs —, **précision 62 %** (88
   capturés pour 55 réels). Un garde qui sur-capture d'un tiers reste tenable : il
   envoie 33 claims de plus en revue individuelle, et **n'en laisse passer aucun
   parmi ceux qui portent un chiffre**. Les 318 claims sans chiffre lui échappent
   par construction, comme ils ont échappé à cet audit.
   Deux exigences de mise en œuvre. **L'allowlist vit en six endroits**, et les
   énumérer à quatre — l'erreur de la première rédaction de ce document — ferait
   poser le garde partout sauf là où il compte :

   | Site | Rôle |
   |---|---|
   | `revue.ts:489-497` | `eligiblesVoieRapide` |
   | `revue.ts:563-573` | tirage de l'échantillon |
   | `revue.ts:797-806` | chargement du lot dans `deciderLot` |
   | **`revue.ts:882-892`** | **l'`UPDATE … SET statut = 'VALIDE'` — le chemin d'écriture** |
   | `revue.ts:1077-1081` | compteur `voie_rapide` affiché au praticien |
   | migration `20260723120000`, ligne 50 | trigger de redondance en base |

   Le quatrième est le seul qui décide vraiment : un garde absent de l'`UPDATE`
   laisse passer ce que les trois premiers refusent. Le cinquième afficherait
   sinon un lot plus large que le lot signable.

   Seconde exigence : le jeu de motifs doit être épinglé par un test sur fixture,
   faute de quoi « rappel 100 % » n'est pas rejouable depuis le dépôt.
3. **Le garde par destination reste pertinent, mais il est prospectif** :
   `orientationBiologieRulesV1.ts` n'existe pas encore dans le dépôt. Clé sur la
   destination seule, il ne protégerait rien aujourd'hui. Le garde de contenu, lui,
   mord immédiatement.
4. **Ouvrir l'arbitrage des 19 bandes de scores** avec le registre des
   instruments, HAD en tête — en allant à la publication primaire, conformément à
   la décision 1.
5. **Poser un garde de divergence corpus ↔ barème**, distinct de celui de la
   décision 7 : un test qui compare les bandes affirmées par un claim validé aux
   blocs `interpretation` de `web/src/lib/questionnaires/*`. Il n'existe pas, et
   aucun lot cadré ne le porte.

   **Attention à la forme — elle n'est pas unique, et s'y tromper produirait un
   garde borgne.** Sur les **27 blocs `interpretation`** des dix fichiers de
   `web/src/lib/questionnaires/`, on trouve **trois** formes :

   | Forme | Où | Combien |
   |---|---|---|
   | plate `[{min, max, label}]` | majorité des blocs | le reste |
   | imbriquée `{subscale, ranges:[…]}` | `mode-de-vie.ts:116-122` (7 sous-échelles de `Q_MOD_01`) et `neuropsychologie.ts:32-33` (HAD, A et D) | **9 lignes** |
   | préfixée `{gss_min, gss_max, label}` | `neuropsychologie.ts:126-128` (trouble affectif saisonnier) | 3 lignes |

   La première rédaction de ce paragraphe annonçait « deux lignes imbriquées, le
   HAD seul, tout le reste plat » : faux sur les trois comptes. Un garde écrit sur
   cette base couvrirait le HAD, croirait avoir traité l'unique exception, et
   laisserait sans couverture les sept sous-échelles de `Q_MOD_01` **et** le bloc
   `gss_*`, que ni `{min,max}` ni `{subscale,ranges}` n'attrapent. Le garde a donc
   besoin d'un normaliseur de blocs, pas d'un test à deux cas — et d'un contrôle
   d'inventaire qui échoue quand une **quatrième** forme apparaît.

   Cas symétrique à ne pas confondre avec une divergence : `pediatrie.ts` ne porte
   **aucun** bloc `interpretation`. Le corpus affirme « Conners > 15 prédictif »
   (`WN-CL-0046-026`) face à un instrument servi **sans aucune bande**. Il n'y a
   rien à comparer — c'est un manque côté application, pas un désaccord, et il
   relève d'un autre fil que celui-ci.

---

## 7. Méthode — reproductible

Population : les 27 sources dont `primaryNotebook` vaut « 08 — Biologie
fonctionnelle » dans `docs/claude/corpus/source_registry.json`, filtrées sur
`typologie_lecture IN ('déclaré','observé') AND prescriptif = false`.

Lecture de la base de production par l'outil MCP Supabase `execute_sql`, en
lecture seule. Aucune écriture, aucune donnée patient : le corpus est
exclusivement documentaire.

Chiffres de contrôle, tous recoupés en base le 2026-07-27 :

| Mesure | Valeur |
|---|---|
| Claims du notebook 08 | 758 |
| … `déclaré` non prescriptif | 474 |
| … `observé` non prescriptif | 89 |
| … voie lente (`interprété`, `vécu`, ou prescriptif) | 195 |
| Population auditée | 563 |
| Claims lus individuellement | 245 |
| Claims porteurs d'un seuil ou d'une plage | **55** (plancher) |
| Statut de tous les claims du notebook | `EN_ATTENTE_VALIDATION` |

### Suite — ce que le garde ne rattrape pas : 27 claims déjà signés

Ajouté le 2026-07-27, en préparant le lot du garde. La mesure a été étendue à
tout le corpus, et le constat cesse d'être préventif.

**148 claims sont déjà `VALIDE` par signature de lot** (7 sources, notebooks 09
et 10). **43 sont capturés par les motifs, et 27 ne figuraient dans aucun
échantillon tiré** : validés sans qu'aucun œil ne les lise. Relus un par un, une
dizaine sont des tailles d'effet d'études ; le reste porte une vraie borne — mais
des **normes nutritionnelles**, pas des plages de laboratoire : besoins hydriques
EFSA (2 L, 2,5 L/j), ANC lipides « 35-40 % », ratio linoléique/α-linolénique
« inférieur à 4 », « moins de 800 kcal = extrêmement hypocalorique », cotations
DietScore. L'enjeu clinique est moindre qu'une grille ferritine ; le mécanisme
est le même.

**Le garde ne les rattrape pas** : il ferme la voie rapide en amont, il ne revient
pas sur une signature acquise. Leur sort — les repasser en attente, les marquer,
ou les laisser — est une **décision distincte**, non tranchée au 2026-07-27, parce
qu'elle modifie des données de production déjà signées par le praticien.

Les 27, pour qu'un lot ultérieur n'ait pas à refaire la mesure :

`WN-CL-0033-012`, `-013`, `-016`, `-017`, `-028`, `-029`, `-031`, `-032`, `-040`,
`-054`, `-056`, `-068`, `-072`, `-080`, `-081`, `-082`, `-084`, `-085` ;
`WN-CL-0034-034`, `-040` ; `WN-CL-0064-010`, `-012` ; `WN-CL-0076-005`, `-007`,
`-008`, `-009`, `-028`.

### Les quatre familles de motifs

Appliquées en `~*` (insensible à la casse) sur `texte_normalise`. Ce sont elles,
et non une lecture d'ensemble, qui définissent la partition 88 / 157 / 318 :

```text
1. unité biologique   [0-9][ ]?(µ|u|n|m|p)?g ?/ ?(l|dl|ml)|mmol ?/ ?l|µmol ?/ ?l
                      |nmol ?/ ?l|pmol ?/ ?l|ng ?/ ?ml|pg ?/ ?ml|u?i? ?/ ?l
                      |mui ?/ ?l|meq ?/ ?l
2. vocabulaire        (seuil|valeur[s]? de r.f.rence|plage|intervalle de
                      r.f.rence|norme[s]? biologique|fourchette)
3. comparateur        (inf.rieur|sup.rieur|au-del.|en de..| < | > |≤|≥)
                      et  optimal|carence si|d.ficit si|cible[s]?␣
4. intervalle         [0-9]+([.,][0-9]+)? ?(à|-|–|et) ?[0-9]
```

La famille 3 porte l'essentiel des faux positifs : « tissus **cibles** », « gènes
**cibles** », « **seuil** d'excitation neuronale », « **au-delà** de la
cinquantaine » — aucun n'est une borne de décision.

### Les 55 identifiants

Sans cette liste, le lot suivant refait l'audit.

**36 plages ou seuils biologiques** — `WN-CL-0021-022` ; `WN-CL-0031-037` ;
`WN-CL-0041-011`, `-012`, `-013`, `-019`, `-020`, `-021`, `-022`, `-023`, `-024`,
`-025`, `-026`, `-027`, `-030`, `-041`, `-042`, `-043`, `-047`, `-048`, `-049`,
`-050`, `-051`, `-065`, `-066`, `-067`, `-069` ; `WN-CL-0043-013`, `-014`,
`-015` ; `WN-CL-0044-003`, `-007`, `-009`, `-013`, `-020`, `-022`.

**19 bandes de scores cliniques** — `WN-CL-0046-013`, `-026`, `-028`, `-030` ;
`WN-CL-0047-016`, `-022`, `-023`, `-024`, `-025`, `-027`, `-028`, `-029` ;
`WN-CL-0048-007`, `-008`, `-009`, `-010`, `-014` ; `WN-CL-0049-007`, `-013`.

### Les cas limites écartés, et pourquoi

Ils marquent la frontière du jugement — un relecteur suivant pourra la déplacer en
connaissance de cause :

| Claim | Contenu | Écarté parce que |
|---|---|---|
| `WN-CL-0030-016` | CRP moyennes 1,2 / 1,7 / 2,4 mg/L par groupe | moyennes observées, aucune borne servie |
| `WN-CL-0044-015` | vitamine D, OR de part et d'autre de 15,5 ng/mL | seuil d'une étude, pas une plage de référence |
| `WN-CL-0025-024` | perte de poids ≥ 10 % contre < 5 % | strates d'un protocole d'étude |
| `WN-CL-0038-012` | alcool, « supérieure à 10 unités par semaine » | seuil de définition d'un excès, pas de bilan — le plus discutable des cinq |
| `WN-CL-0046-034`, `-035`, `WN-CL-0048-021`, `-022` | cotation d'items (5 minutes, 31 cigarettes, 55/65 ans) | règles de cotation, en amont d'une bande d'interprétation |
