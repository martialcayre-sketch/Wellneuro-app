# Cadrage — Curation des exclusions d'intervention (`neCouvrePas`)

*Rédigé le 2026-09-16. Cadrage, pas ouverture.*

Ce document cadre l'entrée **« à cadrer » de `FILE_ATTENTE.md`** routée le
2026-08-24 par `D-107`, restée sans dossier depuis : *« les 95 interventions portent
`neCouvrePas` null sur les 95, et tant qu'elles le restent, `gatePopulationV1` ne
mord sur aucun dossier et `DC-43` ne peut pas franchir son gate faute de sujet, non
faute de mécanisme. »*

## Ce qui n'est PAS à construire

Le mécanisme est **complet, relu et gardé** (`D-101`). `gatePopulationV1.ts` porte
déjà tout ce qu'il faut :

- une fonction **pure**, dont la table de curation est un **paramètre** — de sorte
  qu'un banc puisse exercer les quatre branches sans qu'aucune exclusion non relue
  n'existe hors du test ;
- quatre verdicts, **avec motif obligatoire sur chacun**, y compris quand le candidat
  passe — « un champ optionnel aurait laissé le silence redevenir possible » ;
- la distinction `null` (**non curé**) contre `[]` (**curé, aucune exclusion**), qui
  est tout le module : une clé absente se lit comme `null`, jamais comme une
  curation ;
- `CURATION_EXCLUSIONS_METADATA`, avec ses champs de verrou **déjà posés, éteints** ;
- un banc de garde qui **rougit si une entrée apparaît sans que la métadonnée soit
  signée** — curer sans signer est le chemin par lequel une exclusion non relue
  atteindrait la production ;
- le motif servi au praticien tant que rien n'est curé : *« Proposé — les exclusions
  de population de cet axe ne sont pas curées : aucune source ne dit qui il ne
  couvre pas. L'absence d'exclusion déclarée ne vaut pas absence d'exclusion. »*

Le module ne compare aucun nombre : il compare des **états déclarés** à des
**exclusions déclarées**. Ce cadrage n'ouvre aucun chantier de moteur.

## LES TROIS NIVEAUX D'EXCLUSION, ET LES CONFONDRE EST L'ERREUR À NE PAS FAIRE

C'est le cœur de ce cadrage, et c'est ce qui manquait au routage de `D-107`.

| niveau | objet | clé | consommateur | état |
|---|---|---|---|---|
| **1. Axe** | `EXCLUSIONS_INTERVENTIONS_V1` | `ruleId` de `PRIORITY_RULES_V1` — **4 axes publiés** | `evaluerGatePopulation()`, **en service** | `{}` vide |
| **2. Source d'intervention** | `neCouvrePas` | `sourceId` — **95 sources** | **aucun** | `null` × 95 |
| **3. Document** | prose d'exclusion | 107 documents porteurs | aucun | inventorié par l'audit du 2026-09-16 |

**Seul le niveau 1 a un consommateur d'exécution.** Remplir `neCouvrePas` sur les 95
sources n'arme la gate sur aucun dossier — c'est précisément le constat pour lequel
le LOT-05 de « Doctrine exécutable » avait *abandonné* cette curation, et que
`D-107` a rouvert. Le rouvrir sans nommer les trois niveaux referait le même
chemin.

Le niveau 1 est aussi le plus étroit : il croise **six critères binaires** déclarés
par le patient à l'anamnèse — grossesse, allaitement, pathologie rénale, pathologie
hépatique, chirurgie digestive, maladie cœliaque — plus l'exclusion alimentaire
déclarée. Une exclusion clinique qui ne se réduit pas à l'un de ces sept faits n'a
pas de place au niveau 1, quelle que soit sa pertinence.

## Ce que l'audit du corpus apporte, et qui manquait

L'audit du 2026-09-16 a lu les 123 documents en entier et relevé leur champ
d'exclusion, chaque relevé portant une **ancre verbatim vérifiée** (1 258 ancres sur
1 258).

- **61 des 95 sources d'intervention déclarent des exclusions** dans leur texte.
  34 n'en déclarent aucune — et c'est un constat lourd, pas un vide de collecte.
- Sur les 69 documents porteurs à exclusions déclarées, **55 mentionnent au moins
  un des six critères binaires de la gate** : grossesse 51, pathologie rénale 13,
  maladie cœliaque 11, allaitement 11, pathologie hépatique 8, **chirurgie digestive
  0**.
- **19 documents déclarent des exclusions qui ne se réduisent à aucun des six** —
  elles portent sur la validité des sources, l'absence de traitement standardisé, ou
  des précautions d'usage. Elles appartiennent au niveau 2 ou 3, jamais au niveau 1.

Répartition des 61 sources curables, par axe : nutrition-aliments 12/20 ·
cas-complexes 10/14 · sommeil-chronobiologie 9/11 · humeur 8/14 · cognition-mémoire
7/11 · stress-burnout 4/5 · biologie-fonctionnelle 3/6 · douleurs-chroniques 3/5 ·
audit-contradictions 2/3 · micronutrition 1/2 · intestin-cerveau 1/2.

**« Mentionner » n'est pas « exclure ».** Un document qui parle de grossesse peut
dire « adapter » et non « ne couvre pas ». L'audit ne produit donc pas une curation :
il produit une **file de curation pré-filtrée et ancrée**, où chaque candidat arrive
avec le verbatim qui le fonde. C'est ce qui sépare ce cadrage d'une curation par
déduction, que `DC-19` interdit.

## Objectif

Donner un **sujet** à `DC-43` : faire passer au moins un axe de `PRIORITY_RULES_V1`
de « exclusions non curées » à « exclusions curées et signées », pour que la gate
morde sur un dossier réel — et que le motif servi au praticien cesse d'être un aveu
d'ignorance.

## Les lots

| Lot | Titre | Décision requise | Ce qu'il produit |
|---|---|---|---|
| LOT-00 | **La file de curation** | non | Les 55 candidats ancrés, groupés par critère et par axe, hors dépôt. Aucune interprétation : le verbatim et sa source. |
| LOT-01 | **L'arbitrage des trois niveaux** | **oui** | Décide où la curation s'écrit — niveau 1 seul, niveau 1 + 2, ou les trois — et ce que `neCouvrePas` devient s'il reste sans consommateur. |
| LOT-02 | **Un axe curé et signé** | **oui** (signature) | Un axe de `PRIORITY_RULES_V1` reçoit ses exclusions déclarées, relues sur verbatim, et `CURATION_EXCLUSIONS_METADATA` est signée à cinq termes. La surface de relecture est produite AVANT la demande d'attestation. |
| LOT-03 | **L'arbitrage de l'état inconnu** | **oui** | `D-101` l'a laissé ouvert : un état inconnu sur un critère exclu PARLE, il n'écarte pas. La branche est inatteignable tant que la table est vide ; elle devient atteignable au LOT-02. |
| LOT-04 | **Les trois axes restants** | non | Même geste, à la cadence du praticien. |
| LOT-05 | **Bilan** | non | Combien de candidats la gate écarte réellement, sur combien de dossiers, et ce que le praticien lit à la place. |

## Ce que ce cadrage fait tomber, et qu'il faut nommer

**Chirurgie digestive : zéro mention sur 123 documents.** Le critère existe à
l'anamnèse et dans le type `EtatPopulation` ; aucune source du corpus ne s'en
réclame. Après curation, ce critère restera sans exclusion déclarée — et ce sera un
fait établi, non un oubli.

**34 sources sur 95 ne déclarent aucune exclusion.** Leur `neCouvrePas` restera
`null` après le travail. `null` se dit au praticien ; `[]` dirait « curé, et cette
source ne connaît aucune exclusion », ce qu'aucune source n'établit. La curation
partielle est un **état déclaré, jamais un silence** — c'est le garde-fou non
négociable de `D-107`.

## Contraintes non négociables

- **Une exclusion s'écrit avec sa provenance ou ne s'écrit pas** (`DC-19`). Le type
  `ExclusionDeclaree` l'exige : `source` n'est pas optionnelle.
- **Curer sans signer est interdit par un banc.** `gatePopulationV1.guard.test.ts`
  rougit sur une entrée posée sous une métadonnée non signée.
- **La signature est un acte praticien rendu en séance** (`D-195`) : la surface de
  relecture se produit AVANT la demande, et l'outil qui a préparé la file ne peut
  pas l'attester.
- **Ne pas faire entrer cette table dans le périmètre signé de `priorityRulesV1`** :
  elle déclare une ignorance, pas un contenu clinique, et l'y faire entrer
  changerait `PRIORITY_RULES_SHA256` — donc fermerait `tablePrioritesSignee()`, donc
  retirerait tous les candidats de la production.
- L'extraction de l'audit vit **hors dépôt** : les 507 notices sont
  `rightsStatus: to_verify` et `clinicalReviewStatus: not_reviewed`, le gate G6 n'est
  pas ouvert. Le dépôt ne reçoit que des exclusions **curées et signées**, jamais du
  verbatim de corpus.

## Hors périmètre, nommé

- La curation des exclusions des **conduites** (niveau 2 et 3) tant que le LOT-01 ne
  leur a pas donné un consommateur.
- Les exclusions qui ne se réduisent pas aux sept faits déclarés — elles appellent
  un vocabulaire d'état que l'anamnèse ne porte pas.
- Le seuil de significativité du momentum et la signature `SAFETY_EI_METADATA`, qui
  restent au responsable par d'autres routages.
