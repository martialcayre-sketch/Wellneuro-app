---
id: "LOT-08"
titre: "Signature de la table d'orientation, et le dernier trou de recueil partiel"
statut: "livré"
dépend_de: "LOT-05"
palier: "T3"
---

# LOT-08 — Signature de la table d'orientation

## But

Poser la signature clinique que le LOT-05 avait laissée ouverte, et fermer avant
elle le seul défaut nommé qui pouvait la rendre dangereuse.

## Ce qui a été demandé

Le praticien a répondu « signature » à un arbitrage à deux branches : signer les
vingt règles maintenant, ou clore la campagne avec le critère de signature
explicitement non coché. Deux points étaient annoncés comme à trancher d'abord —
une citation suspectée mal appariée, et le PSQI partiel non gardé.

## Ce que le lot a trouvé

**Le premier point n'existait pas.** Une note portée sur `R-STR-02` le 2026-08-04
affirmait que `WN-CL-0105-001` « porte sur l'éducation à un modèle alimentaire
méditerranéen », et proposait de le remplacer. Relecture directe de
`texte_normalise` en base : le claim dit « la prise en charge globale du stress
comprend un bilan personnalisé, suivi d'un rééquilibrage sur 21 jours, puis d'un
rendez-vous de contrôle et d'un suivi dans le temps » — mot pour mot l'objectif
servi par la règle. L'appariement était exact ; c'était l'alerte qui était fausse.

Le claim est **conservé**, et le partage du travail entre les deux citations est
écrit : `WN-CL-0314-008` fonde le déclencheur, `WN-CL-0105-001` fonde ce que le
pack propose une fois engagé.

**Le second était réel, et plus étroit qu'annoncé.** Le repli
`totalGlobalDepuisSousScores` rend déjà `null` dès qu'une composante entière du
PSQI est vide : une passation à qui il manque un pan complet ne produisait ni
total ni bande. Le cas ouvert était celui où les **sept** composantes ont chacune
au moins un item, sans les avoir tous — les items manquants de `C2`, `C5` et `C7`
étant comptés à un défaut, le plus souvent le plus **favorable** de leur échelle
(`?? 0`). `Q2` fait exception : son défaut de 30 min peut relever le total.

Mesuré : `Q1 Q2 Q3 Q4 Q5b Q6 Q7 Q8`, soit huit items sur dix-huit, avec `Q5b` à
sa **pire** valeur, sortaient un total de 1 sur 21 — « Pas de trouble du
sommeil ». `R-SOM-01` lisait cette bande.

## Ce que le lot fait

| | |
|---|---|
| Moteur `psqi` | publie `missing`/`repondus` sur ses **18 items cotés**, et retire sa bande sur recueil partiel. Le total reste servi, à côté de ses comptes — même arbitrage que `sum` depuis #561 |
| `orientationEngine` | la garde `recueilIncomplet` attrape désormais le PSQI par sa branche `missing`, sans rien de spécifique à cet instrument |
| `equilibre/score.ts` | un PSQI partiel cesse de contribuer à la couverture d'un besoin — même chemin, `extraireValeurBrute` lisant `missing` |
| `ORIENTATION_METADATA` | `validationExterne: true`, `dateValidation: '2026-08-04'`, **23 claims** |
| Banc | égalité **exacte** entre `claimsSource` et les claims réellement cités par les règles, dans les deux sens |

Le volet conjoint (`Q10`, `Q11a-e`) n'entre pas dans le compte : il est
`horsBareme`, et le compter sortirait du barème toute passation sans conjoint.

## Ce que le banc de signature a attrapé, sur celui qui l'écrivait

La liste `claimsSource` a d'abord été posée à **24** claims, extraite au `grep`.
Le banc d'égalité exacte, écrit dans le même lot, a rougi à sa première
exécution : `WN-CL-0178-016` n'apparaît dans le fichier que dans un
**commentaire**, aucune règle ne le cite. Liste ramenée à 23.

C'est exactement la classe de défaut que ce banc vise — une signature qui couvre
un périmètre différent de celui qu'elle prétend couvrir — et elle s'est produite
à l'écriture, pas dans un futur hypothétique.

## Ce que la revue adversariale a renvoyé — NO-GO, et elle avait raison

**Deux bloquants, tous deux de la classe « ce que le lot ne fait pas ».** Le code
écrit était juste ; ce sont ses **affirmations de clôture** et son **périmètre
d'effet** qui ne tenaient pas.

**B1 — la garde ne s'appliquait qu'à l'avenir.** Le score est calculé **une fois**
à la soumission et persisté ; le moteur d'orientation relisait cet instantané.
Une passation `Q_SOM_01` déjà en base ne portait donc ni `missing` ni `repondus`,
gardait sa bande d'origine, et `R-SOM-01` se serait allumée dessus le jour où le
drapeau serait posé. Trois documents affirmaient pourtant le trou fermé. C'est la
classe de la PR #202 : aucune ligne fautive, un rattrapage absent.

Fermé à la racine plutôt qu'au cas : `orientationService` **recalcule** depuis
`rawAnswers` et **écarte** ce qui n'est pas recalculable. Toute garde de scoring
future s'applique d'office au passé, sans backfill ni migration. Décision `D-019`.
Mesuré avant de décider : 15 lignes sur 99 sans `rawAnswers`, toutes d'une forme
antérieure au moteur actuel, donc **déjà inertes** — le servi ne change pas, il
devient voulu.

**B2 — « Mon équilibre » changeait sans bump de version.** `Q_SOM_01` est source
du besoin 5, `inverser: true` : y retirer une mesure basse est **rassurant**, pas
protecteur. Un PSQI complet à 16/21 donne une couverture de 0,238, sous le seuil
d'effondrement 0,34 — donc fondation critique, donc score
global plafonné à 50. La garde le rend « non mesuré », et le plafond tombe : le
score **remonte**. `VERSION_SCORE_EQUILIBRE` passe de v8/v9 à **v10/v11**, comme
le fichier l'exige, avec le banc qui manquait.

**Corrigé aussi** : le `sha256` de la table était épinglé par un banc
**tautologique** (il recalculait ce qu'il comparait) — trois mutations de règles
restaient vertes ; il porte désormais un littéral. `docs/FEATURE_FLAGS.md`
annonçait encore « 6 règles, `validationExterne: false` → fermé ». La note de
recueil affirmait « valeur la plus favorable », faux de `Q2`. Et le total du
scénario fondateur valait **1**, pas 2 — le banc l'épingle maintenant à l'unité.

**Question ouverte, la seule qui reste** : la valeur de
`WN_ENABLE_ORIENTATION_NNPP2` dans les trois scopes Vercel et sur les postes.
Jusqu'ici elle était sans effet, `tableSignee()` étant faux ; depuis la signature,
elle suffit à ouvrir la route. Rien ne la pose côté dépôt — le risque est
entièrement côté Vercel.

## Ce que le lot ne fait pas

**Il n'allume rien.** `orientationActive()` est un ET :
`WN_ENABLE_ORIENTATION_NNPP2 === '1'` **et** `tableSignee()`. Le drapeau n'est pas
posé en production, la route reste fail-closed, et aucun praticien ne voit encore
de recommandation. Signer est un acte clinique, déployer un acte d'exploitation —
et l'un ne vaut pas l'autre.

**`tfd` (`Q_GAS_01`) reste non gardé** contre le recueil partiel : il ne publie
aucun compte à la racine. Il est cible de `R-GAS-01`, au second tour. C'est la
réserve connue de cette signature, écrite pour qu'elle ne se redécouvre pas.
Restent aussi hors de cette garde `sum_decimal` (`Q_GEO_05`), `count_threshold`
(`Q_INF_05`) et `ecab` (`Q_NEU_08`), aucun n'étant cible d'une règle publiée.

## Validation

- `npm run check` — **RC 0**
- `npm run test:worktree` (T3 complet, E2E inclus) — **RC 0**, **3 608 tests
  unitaires sur les deux positions du drapeau `WN_ALI_01_SIIN57`**, 108 E2E
- Revue adversariale `wn-reviewer` — **NO-GO au premier passage** (deux
  bloquants), **GO sous conditions au second** (une affirmation fausse de la même
  classe, deux chiffres périmés, trois bancs manquants). Toutes les conditions
  appliquées ; la seconde passe est ce qui a trouvé la régression du badge
  « déjà renseigné » et le fait que `calculateScore` ne rend jamais `null`.
- **Mutations vues rougir sur les gardes du service** : registre des passations
  non interprétables, administrabilité, écartement de la ligne entière, et retour
  au score gelé. La garde `scores.error` reste **défensive et non prouvée** — la
  retirer laisse le banc vert, et c'est écrit dans le code plutôt que supposé.
- Les 23 claims relus en base le 2026-08-04, en une requête :
  `statut = 'VALIDE'`, `prescriptif = true`, `active = true`,
  `version_claim = 'v1.0'` sur les 23
- **Mutation vérifiée sur le correctif de fond** : rétablir la lecture du score
  gelé fait rougir deux des trois bancs neufs du service, dans les deux sens —
  le cas rétroactif ET la contre-épreuve

Les bancs neufs, et ce que chacun tient :

| Banc | Ce qu'il empêche |
|---|---|
| `psqiRecueilPartiel.guard.test.ts` (5 cas) | une bande sur recueil partiel ; la contre-épreuve sur passation complète ; la frontière à **un seul** item manquant ; le volet conjoint compté à tort |
| `orientationService.test.ts` (3 cas) | une bande **périmée** stockée en base qui déclenche ; une passation sans `rawAnswers` servie telle quelle ; et la contre-épreuve, une passation complète et dégradée qui doit déclencher |
| `equilibre/score.test.ts` (3 cas) | le besoin 5 renseigné par un PSQI partiel — dont le cas *dégradé*, qui se lirait « 0,95 » |
| `orientationRulesV1.test.ts` (2 cas) | un périmètre signé qui diverge des claims cités ; **une règle éditée après signature**, que le banc de sha préexistant ne pouvait pas voir |

## Décision au registre

`D-018` — une signature porte sur un périmètre relu, pas sur un fichier.

`D-019` — une garde de scoring ne protège que l'avenir, tant que son consommateur
relit un score gelé.

Au passage, une **collision de numéros** a été réparée : deux `D-015` coexistaient
dans le registre depuis le 2026-08-04, l'un du lot agenda alimentaire (#562),
l'autre du lot orientation V2 (#565). Le second devient `D-016`. Un pointeur faux
de `HANDOFF_CURRENT.md` — qui attribuait à #561 la décision `D-015` au lieu de
`D-014` — est corrigé dans le même geste.
