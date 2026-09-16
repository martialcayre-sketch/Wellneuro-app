# Surface de relecture — la table de l'écart de plan

*Écrite le 2026-09-16, en exécution de `D-213` §4. **Ce document ne signe rien.**
Il présente au praticien ce qu'il aurait à attester, ce qui a été écarté, et
**un fait mesuré qui change la question posée**.*

`D-213` §4 a tranché : l'écart entre plan idéal et plan minimal reçoit sa propre
table signée, sur le patron du barème, et le barème garde son terme unique.
L'arbitrage n'est pas rouvert ici. Ce document prépare sa **mise en œuvre**, et
il commence par ce qu'il a fallu mesurer pour l'écrire.

## LE FAIT QUI DOIT ÊTRE SU AVANT DE SIGNER

`mesurerProtocole` compte, sous le nom `actionsAvecEcartDePlan`, les actions
engagées dont le plan idéal est non vide **et** diffère du plan minimal.

Or le constructeur **refuse d'enregistrer** un brouillon dont l'un des trois
plans est vide (`ProtocolMiniBuilder.tsx:277` — intitulé, plan idéal, plan
minimal et plan de secours sont tous obligatoires). Le plan idéal est donc
toujours rempli, et les deux textes ne coïncident que si le praticien recopie le
même mot à mot.

**Conséquence** : `actionsAvecEcartDePlan` est **inférieur ou égal** au nombre
d'actions engagées, et il ne s'en écarte que lorsque le praticien recopie le même
texte dans les deux plans. Il **sature** donc vers `nombreActionsFermes` — ce que
les trois lignes du barème lisent déjà. Une table signée sur ce terme redirait le
barème sous un autre nom, et le praticien lirait deux fois la même mesure
présentée comme deux informations.

Ce n'est pas un argument contre la table. C'est un argument contre **ce
terme-là**.

**CE QUE LA MESURE ÉTABLIT, ET CE QU'ELLE N'ÉTABLIT PAS.** Elle compare deux
chaînes après `trim()`. Elle constate donc une **différence de texte**, jamais
une différence d'**exigence** : deux formulations du même niveau passeraient pour
un repli, et un plan minimal réellement plus accessible ne se distingue pas d'une
reformulation. Ce raccourci se déclare dans le module et dans les constats —
aucun texte affiché ne doit affirmer que le patient « garde une marche plus
basse », ce que la mesure ne sait pas.

## LE TERME QUI DISCRIMINE EST LE COMPLÉMENT

Ce que `D-213` §4 visait — écrit dans son propre texte — ce sont « les protocoles
**sans repli** ». Ce n'est pas la présence d'un écart qui informe, c'est son
**absence** : une action dont le plan minimal égale le plan idéal ne laisse au
patient aucune marche plus basse le jour où il décroche.

Cette mesure ne demande **aucune donnée nouvelle** : elle se dérive des deux
termes déjà mesurés.

Elle se mesure **directement**, et surtout pas par soustraction :

```ts
actionsSansRepli = fermes.filter(a =>
  a.idealPlan.trim() !== '' && a.idealPlan.trim() === a.minimalPlan.trim()).length
```

**La soustraction `nombreActionsFermes − actionsAvecEcartDePlan` serait fausse
là où la mesure sert.** Le contrat serveur exige un plan idéal non vide
(`protocolDraft.ts:152`), mais `mesurerProtocole` tourne aussi dans le navigateur
**pendant la composition**, avant toute validation : une action dont le plan
idéal n'est pas encore tapé serait alors comptée comme une action sans repli, et
l'écran l'afficherait au praticien pendant qu'il écrit.

Elle est rare quand le protocole est bien composé, fréquente quand il ne l'est
pas — donc elle discrimine, là où `actionsAvecEcartDePlan` sature.

**Ce que cela demande** : un cinquième terme dans `MesureProtocole`. C'est une
modification de **ce que le protocole mesure**, et les quatre termes actuels
relèvent d'un arbitrage (`DC-19`/`DC-20`). Le terme est dérivé, non saisi, donc
il ne se périme pas en silence — mais **l'ajouter est une décision, et elle est
posée ici plutôt que prise**.

## L'ÉTAT DE LA PRODUCTION, LU LE 2026-09-16

| Ce qui a été compté | Valeur |
| --- | ---: |
| `protocol_drafts` en production | **1** |
| …portant la clé `actions` | **0** |
| Actions de protocole, tous brouillons confondus | **0** |
| `protocol_checkins` | **0** |
| `protocol_diffusion_approvals` | **0** |
| Brouillons portant une référence d'assiette (`plateCode`) | **0** |

Le seul brouillon existant est une observation alimentaire
(`contract_version: ja-food-observation-v1`, statut `draft`) : il ne porte aucune
action.

**Ce que cela implique pour la signature** : les bornes **ne peuvent pas être
calibrées sur l'observé**, parce qu'il n'y a pas d'observé. Elles seront donc,
exactement comme celles de `BAREME_CHARGE_V1`, une **convention
d'organisation ratifiée après relecture** — et c'est cette ratification qui fait
leur provenance, rien d'autre. Un lecteur qui les prendrait pour une règle
sourcée se tromperait, et le module doit le dire en clair comme le barème le dit.

## CE QUI EST PROPOSÉ — trois lignes, un terme, aucun niveau de charge

Bornes **inclusives**, `null` valant « pas de borne de ce côté ».
`MAX_ACTIONS_PROTOCOLE_21J` vaut 3 : le terme n'a que quatre valeurs possibles.

| id | terme | min | max | ce que le praticien lirait |
| --- | --- | ---: | ---: | --- |
| `REPLI-01` | `actionsSansRepli` | `null` | 0 | Chaque action engagée distingue son plan minimal de son plan idéal. |
| `REPLI-02` | `actionsSansRepli` | 1 | 2 | Au moins une action engagée répète le même plan en idéal et en minimal : rien n'y est écrit comme allègement. |
| `REPLI-03` | `actionsSansRepli` | 3 | 3 | Aucune des actions engagées ne distingue ses deux plans : le protocole ne propose aucun repli écrit. |

**Aucun de ces trois textes n'affirme que le patient dispose d'une marche plus
basse** — seulement que les deux plans diffèrent par leur texte. C'est tout ce
que la mesure établit, et le module le déclare.

**`REPLI-01` couvre zéro ET les protocoles sans action engagée**, et son texte est
écrit pour être vrai dans les deux cas. C'est la correction exacte que la
relecture du 2026-09-15 avait imposée à `CHARGE-01`, dont le texte proposé
affirmait faux à zéro action.

L'échelle est **contiguë et sans recouvrement** — `chevauchementsBareme` refuse
une table qui se mord, et le refus porte sur la table entière.

## CE QUE LA TABLE REND, ET POURQUOI PAS UN NIVEAU

Le barème rend un `NiveauCharge` (`light` / `moderate` / `loaded` /
`excessive`). **Cette table ne doit pas en rendre un.** Deux tables qui
rendraient le même type finiraient affichées côte à côte, et le praticien lirait
**deux charges** pour un même protocole — dont l'une ne parle pas de charge.

Ce que cette table rend est un **constat**, affiché quand il s'applique :
une phrase, et rien d'autre. `suggererDepuisLignes` détectera alors le désaccord
sur le **constat** plutôt que sur le niveau — la table reste refusée quand deux
lignes publiées se contredisent, ce qui est le point de `D-213` §5.

**Écarté : réutiliser `NiveauCharge`.** Plus court à écrire, et c'est exactement
le piège décrit ci-dessus.

**Écarté : ajouter un quatrième niveau au barème.** `D-213` §4 l'a déjà refusé,
et pour une raison mécanique : deux lignes matcheraient tout protocole, et au
premier désaccord de niveau `suggererDepuisLignes` rendrait `null` — le praticien
ne lirait plus rien du tout, ni charge ni alerte.

## CE QUE L'ATTESTATION DEMANDERA, exactement

1. **Trancher le terme** : `actionsSansRepli` (proposé, dérivé, à ajouter aux
   mesures) ou `actionsAvecEcartDePlan` (existant, mais saturé — il vaudra le
   nombre d'actions engagées dans la quasi-totalité des cas).
2. **Relire les trois bornes et les trois constats**, et les corriger : le texte
   ci-dessus est une proposition de l'outil, pas une lecture de source.
   Vérifier notamment que chaque phrase reste vraie **à toutes les valeurs que
   sa ligne couvre**.
3. **Déclarer en séance** que cette échelle a été relue et qu'elle est conforme.
   C'est ce geste qui atteste ; la recopie du SHA est mécanique et ne vaut que
   portée par lui (`D-195` §1).
4. `validationExterne: true`, `dateValidation` en ISO canonique, et le
   `shaPerimetre` **recopié à la main** — jamais la constante recalculée, qui
   rendrait la comparaison tautologique et ferait entrer toute ligne ajoutée
   plus tard sous une signature acquise (`D-063`).
5. Le périmètre proposé mais non retenu, s'il y en a un, se **range** dans le
   module plutôt que de s'effacer (`D-195` §4) — le barème en porte un.

## CE QUE CE LOT NE PRÉTEND PAS

- **Aucune source clinique ne porte ces bornes.** Rien au dépôt ne traite du
  repli thérapeutique, aucun claim ne le fonde, aucune littérature n'est
  invoquée. Le module n'aura pas de champ `claimsSource` : il n'aurait rien à y
  mettre, et un champ vide se lirait comme un oubli.
- **La table ne dira rien tant qu'aucun protocole d'actions n'existera.** C'est
  vrai aujourd'hui de la production entière. Elle n'est pas pour autant un
  mécanisme mort-né : le constructeur est en service et impose les trois plans —
  le premier protocole composé la fera parler.
- **Le CI ne peut pas vérifier qu'un constat est juste.** Il atteint la forme,
  la contiguïté et l'absence de recouvrement ; ce que la phrase affirme au
  praticien relève de la relecture, et d'elle seule.
