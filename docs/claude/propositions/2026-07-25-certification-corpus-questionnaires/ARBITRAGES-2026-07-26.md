# Lot 4 — dossier d'arbitrage praticien

Établi le 2026-07-26, après **correction de trois défauts du comparateur** (voir
`BILAN-BANC-2026-07-25.md`, bloc de correction en tête) et rejeu du banc sur les
59 instruments depuis les spécifications en cache.

> **Ce document ne corrige rien.** Il pose les décisions à prendre, une par une,
> avec ce qui a été vérifié et comment. Chaque arbitrage retenu sera daté au
> CHANGELOG avant toute modification du catalogue.

## Comment lire les verdicts

| Verdict | Ce qu'il veut dire |
|---|---|
| **vérifié par exécution** | `calculateScore` a été exécuté sur un jeu de réponses construit ; le fait est reproductible. |
| **vérifié sur pièces** | La spécification extraite de la source et le catalogue ont été relus item par item. |
| **à confirmer** | Une seule lecture, ou une inférence qui demande votre connaissance de l'instrument. |

## Ce qui a changé depuis le bilan du 2026-07-25

Le banc s'était trompé sur cinq points, tous dans le sens de l'accusation à tort.
Deux instruments sortent entièrement de la liste.

| | 2026-07-25 | 2026-07-26 | Cause |
|---|---|---|---|
| Instruments à divergence critique | 11 | **9** | UPPS et QIF blanchis |
| Divergences critiques | 16 | **13** | |
| dont `inversion_absente` | 2 | **1** | l'UPPS applique bien ses 25 inversions |
| dont bornes de score | 3 | **1** | PSQI et QIF atteignent leur plafond publié |
| `sous_echelles` (majeur) | 7 | **3** | le banc comptait les sections d'écran |

Et parmi les 13 critiques restantes, **deux sont des artefacts de comptage** que
le comparateur ne peut pas voir seul (détail en §3) : le banc réel se réduit à
**11 divergences critiques sur 8 instruments**.

---

## 1. MFI-20 (`Q_SOM_07`) — le seul cas où je recommande la suspension

Quatre divergences, dont trois critiques. Prises ensemble, elles ne décrivent pas
un instrument à retoucher.

| Constat | Source | Servi | Verdict |
|---|---|---|---|
| Échelle de cotation | 1–5 | 0–4 | vérifié sur pièces |
| Items inversés | 10 (n° 1, 3, 4, 6, 7, 8, 11, 12, 15, 20) | aucun (`type: 'sum'`, aucun `reversed`) | vérifié par exécution |
| Barème global | la source déclare qu'il n'en existe pas | 3 bandes affichées (0–40 / 41–59 / 60–80) | vérifié sur pièces |
| Dimensions | 5 (générale, physique, mentale, activité, motivation) | aucune (score global seul) | vérifié par exécution |

**Un constat supplémentaire, hors banc.** J'ai tenté de réaligner les libellés
servis sur ceux de la source par similarité plutôt que par position, avec deux
mesures successives (recouvrement de mots, puis trigrammes de caractères) :
**7 items sur 20 seulement** trouvent un correspondant proche. Ce n'est pas un
réordonnancement — c'est une autre traduction française, dont les items ne se
recouvrent que partiellement avec ceux de la source du cabinet.

**Ce que cela change pour un patient.** Sans inversion, les items positifs
comptent dans le même sens que les items de fatigue : un patient en forme et un
patient épuisé se rapprochent au lieu de s'opposer. Le score global perd sa
direction, et les trois bandes affichées — qui ne viennent d'aucune source —
posent un verdict sur ce score-là.

**Options.**

| | |
|---|---|
| **a. Suspendre l'instrument** *(recommandé)* | `statutCertification: 'suspendu'`, retrait de la bibliothèque assignable. Le MFI-20 ne mesure pas ce que son nom annonce. |
| b. Reconstruire depuis la source | 20 items de la source, cotation 1–5, 10 inversions, 5 dimensions, aucun barème global. C'est un instrument neuf, pas un correctif — et le score n'est plus comparable aux passations antérieures. |
| c. Le renommer | Assumer une échelle de fatigue interne au cabinet, sans revendiquer le MFI-20. Le barème maison devient alors légitime, à condition d'être documenté comme tel. |

Ce qui n'est **pas** une option : corriger l'inversion seule. Un score
partiellement inversé, interprété par un barème inventé, serait plus trompeur
que l'état actuel.

---

## 2. IPSS (`Q_URO_01`) — deux défauts nets, sans ambiguïté clinique

Le seul cas où le moteur produit un score **au-dessus** du maximum publié : la
preuve est directe, ce jeu de réponses est atteignable par un patient.

**Vérifié par exécution** (`U1..U7` au maximum, `U8` au maximum) :

- `total` = **42** = score symptômes (36) + qualité de vie (6). L'IPSS rapporte
  la question de qualité de vie **séparément** ; elle n'entre pas dans le score
  de symptômes.
- Le score de symptômes atteint **36** et non 35, parce que l'item `U2` est coté
  `0 / 2 / 3 / 4 / 5 / 6` — la valeur 1 est absente et le plafond est 6 — quand
  les six autres items vont de 0 à 5. Avec `U2` ramené à 0–5, le total tombe
  exactement sur **35**, le maximum publié.
- La bande d'interprétation la plus haute s'arrête à 35 : le score 36 sort du
  barème.

**Recommandation** : deux correctifs indépendants, l'un et l'autre sans choix
clinique à faire — ne plus sommer la qualité de vie dans le total, et rétablir
la cotation 0–5 sur `U2`. Ils touchent la logique de scoring : ils demandent
votre accord explicite et une entrée au CHANGELOG.

---

## 3. Nombre d'items — six constats, dont deux à écarter

| Instrument | Source | Servi | Lecture |
|---|---|---|---|
| `Q_GEO_06` Test des 5 mots | 5 | 10 | **artefact.** La source liste 5 mots ; nous servons 5 mots × 2 phases (apprentissage, rappel différé) — les deux sous-scores que la source nomme elle-même. Conforme. |
| `Q_SOM_01` PSQI | 24 | 18 | **artefact.** Les 6 items manquants sont l'item 10 et les items 11a–11e, renseignés par le conjoint et **non cotés** dans le PSQI. 24 − 6 = 18. Le scoring est complet ; seule la section d'observation par un tiers n'est pas administrée. |
| `Q_GEO_01` Grille de Tinetti | 16 | 20 | **granularité.** Les deux découpages produisent le même total /28 (équilibre /16 + marche /12). Nous détaillons en 20 lignes ce que la source pose en 16. À arbitrer : conserver, ou revenir au découpage source pour que les scores restent comparables à la littérature. |
| `Q_ALI_01` Questionnaire alimentaire SIIN | 57 | 14 | **adaptation assumée ?** Référentiel interne, couvert par votre déclaration du 2026-07-25. À confirmer que la forme 14 items est bien la forme voulue, et non une saisie partielle. |
| `Q_FIB_03` ELFE | 7 | 12 | à arbitrer — s'ajoute une section « symptômes associés » absente de la source. |
| `Q_NEU_12` IDTAS-AE | 36 | 48 | à arbitrer — les parties 3A et 3B (comptages mensuels) doublent une liste que la source ne pose qu'une fois. |

Les deux artefacts appellent une note au registre, pas une correction. Le
comparateur ne peut pas les distinguer seul : savoir qu'un item source n'est pas
coté demande de lire l'instrument, pas de le compter.

---

## 4. Anxiété SIIN (`Q_INF_05`) — un champ, pas une clinique

**Vérifié par exécution** : le moteur rend `count` (0 à 11) et aucun `total`. La
source définit bien un score 0–11 ; il est calculé, correctement, sous un autre
nom.

**Conséquence réelle** : tout affichage générique qui lit `total` ne trouve rien.
C'est la même famille que les six questionnaires muets corrigés dans la PR #372,
dont le module `rubriques.ts` normalise déjà cinq clés différentes.

**Recommandation** : correctif d'affichage, aucune décision clinique. À traiter
avec la PR #372 plutôt qu'en arbitrage.

---

## 5. Dimensions non calculées (`sous_echelles`, majeur)

Trois instruments, après correction du comparateur : `Q_CAR_01`, `Q_GEO_04` et
le MFI-20 (traité en §1). Dans les trois cas le moteur rend un score global seul
là où la source distingue des dimensions — pour le `Q_GEO_04`, six.

Un score global masque un profil : deux patients de même total peuvent avoir des
dimensions opposées. C'est exactement ce que la restitution par rubrique (PR
#372) sait afficher **quand les dimensions existent**. Ici elles n'existent pas.

**À arbitrer** : déclarer les dimensions dans le scoring (travail mécanique, sans
changement de total), ou assumer le score global.

---

## 6. Conduites cliniques logées dans l'interprétation (11 instruments)

`Q_ALI_01`, `Q_ALI_02`, `Q_CAR_01`, `Q_GEO_01`, `Q_GEO_02`, `Q_GEO_03`,
`Q_GEO_04`, `Q_NEU_02`, `Q_SOM_04`, `Q_STR_01`, `Q_TAB_04`.

Le champ `protocol` des bandes d'interprétation porte des conduites — elles ne
viennent pas de l'instrument et voyagent avec lui. C'est la source des mots
« urgence » et « danger » que vous avez relevés dans les comptes rendus IA : le
modèle ne les invente pas, il recopie ces champs.

**Décision de cadrage plutôt qu'instrument par instrument** : sortir `protocol`
des bandes de scoring vers un champ distinct, non transmis au prompt patient. Le
travail est mécanique une fois la décision prise.

---

## 7. Ce que le banc ne sait toujours pas dire

- **Les 274 écarts de libellé restent non triés.** J'ai tenté de les classer
  automatiquement (réordonnancement contre reformulation) et j'ai échoué : deux
  métriques de chaîne successives donnent des résultats incompatibles, parce que
  les instruments concernés sont souvent d'autres traductions. Un tri fiable
  demande une lecture sémantique, pas une mesure de similarité. Rien n'est livré
  sur ce point plutôt qu'un chiffre faux.
- **`Q_ALI_03` et `Q_STR_06` (Karasek) n'ont toujours qu'une lecture.** Leurs
  écarts, dont les cinq items non inversés du Karasek, restent « à confirmer ».
- **La hiérarchie source du cabinet ↔ publication d'origine n'est pas tranchée**
  (question (c) du cadrage). Elle conditionne les §1 et §3.

---

## Récapitulatif des décisions attendues

| # | Décision | Portée |
|---|---|---|
| 1 | MFI-20 : suspendre, reconstruire ou renommer | clinique, forte |
| 2 | IPSS : ne plus sommer la qualité de vie ; `U2` en 0–5 | scoring, faible ambiguïté |
| 3 | Tinetti : découpage 20 lignes ou 16 | comparabilité |
| 4 | `Q_ALI_01`, `Q_FIB_03`, `Q_NEU_12` : adaptations assumées ou à réaligner | clinique |
| 5 | Dimensions à déclarer sur `Q_CAR_01` et `Q_GEO_04` | affichage |
| 6 | `protocol` sorti des bandes d'interprétation | cadrage, transverse |
| 7 | Hiérarchie source cabinet ↔ publication | doctrine |

Les points 2 et 5 sont les moins coûteux et les plus sûrs ; le point 6 est celui
qui touche le plus de surfaces à la fois, y compris ce que lit un patient.
