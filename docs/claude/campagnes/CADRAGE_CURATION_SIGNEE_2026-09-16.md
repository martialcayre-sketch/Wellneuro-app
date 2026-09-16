# Cadrage — Curation signée : signer les claims en attente

*Rédigé le 2026-09-16. Cadrage, pas ouverture : l'attribution du créneau reste un geste du responsable.*

Ce document cadre l'entrée **rang 4 « Curation signée »** de `FILE_ATTENTE.md`, dont le
dossier `2026-08-18-curation-signee/` existe depuis le 2026-08-18 avec un
`CAMPAIGN_DRAFT.md` resté au gabarit — aucune section remplie. La file la décrit
« toujours à l'arrêt ».

## Ce qui a causé ce cadrage

L'audit du corpus du 2026-09-16 (123 documents lus en entier, 1 258 ancres verbatim
vérifiées sur 1 258) a mesuré la couverture réelle des axes de neuro-nutrition dans
le registre des interventions. Le résultat a renversé une affirmation que la session
précédente tenait pour acquise.

| axe | sources | claims validés | **en attente** | prescriptifs |
|---|---|---|---|---|
| nutrition-aliments | 20 | 291 | 0 | 168 |
| humeur | 14 | 283 | 0 | 132 |
| **cas-complexes** | 14 | **0** | **242** | 134 |
| sommeil-chronobiologie | 11 | 297 | 0 | 191 |
| **cognition-mémoire** | 11 | **60** | **235** | 155 |
| biologie-fonctionnelle | 6 | 131 | 0 | 37 |
| stress-burnout | 5 | 115 | 0 | 49 |
| **douleurs-chroniques** | 5 | **0** | **168** | 56 |
| audit-contradictions | 3 | 0 | 60 | 23 |
| micronutrition-compléments | 2 | 50 | 0 | 34 |
| **intestin-cerveau** | 2 | **0** | **50** | 25 |
| fondements-12-besoins | 1 | 20 | 0 | 0 |
| instruments-cabinet | 1 | 0 | 0 | 0 |
| **TOTAL** | **95** | **1 247** | **755** | **1 004** |

**Cinq axes cliniques entiers n'ont aucun claim validé** — mémoire et troubles
cognitifs, TDAH et scolarité, autisme, douleurs chroniques, intestin-cerveau, cas
complexes. Leurs claims sont rédigés. Ils attendent une signature.

Ce n'est pas un défaut de corpus : c'est un goulot de validation, et il tombe
exactement sur les axes que l'audit a trouvés les plus riches en actions
extractibles — cas complexes 106 actions, mémoire/cognition 76, douleurs 27,
intestin 17.

## LE CHIFFRE DE 755 EST UN INSTANTANÉ, PAS UN ÉTAT

C'est le premier fait du cadrage, et il commande le premier lot.

`nnpp2_interventions_registry.json` porte ses compteurs avec leur date :
`claims.mesureLe = 2026-08-03`. Le registre le dit lui-même — « les compteurs de
claims sont un instantané daté, lu en production ; le garde ne les confronte pas à
la base ». Depuis, une seule mesure de production figure au registre des décisions :
**8 224 claims `VALIDE`** (one-off-1163, 2026-09-07). Elle ne dit **rien** du nombre
d'`EN_ATTENTE_VALIDATION`.

Les deux chiffres ne se contredisent pas — l'un compte le corpus entier, l'autre le
sous-ensemble des 95 sources de conduite à une date antérieure — mais **aucun des
deux ne donne l'état courant**. Cadrer une cadence de signature sur 755 sans l'avoir
recompté serait cadrer sur un nombre de six semaines.

## Ce qui n'est PAS à construire

La mécanique est **complète et en service**. Ce cadrage n'ouvre aucun chantier
d'ingénierie, et c'est sa propriété la plus importante.

| pièce | état |
|---|---|
| Machine à états fermée à trois statuts | `revue.ts` — `EN_ATTENTE_VALIDATION`, `VALIDE`, `REJETE`, transitions gardées |
| Comptage par statut | `compterClaimsRevue()` |
| Liste de revue filtrable | `listerClaimsRevue()` |
| Journal append-only des décisions | `rag_corpus_claim_decisions`, triggers en base, cinq types d'acte |
| **Voie rapide — tirage d'échantillon serveur** | `POST /api/praticien/corpus/claims/lot/tirage` |
| **Signature de lot** | `POST /api/praticien/corpus/claims/lot/decision` |
| Questionnaire de restitution joué sur le RAG | `/api/praticien/corpus/claims/questionnaire` |
| Éligibles voie rapide, clôture neutre | `eligiblesVoieRapide()`, `tirageCaduc()`, `tirageOuvertDeSource()` |
| Détecteur de borne de décision | `rag_claim_porte_seuil(texte)` — rappel 55/55 mesuré |
| Barrière de service | `match_wellneuro_rag_claims`, inchangée |

La procédure à deux vitesses est **actée par arbitrage praticien du 2026-07-23** et
ses routes sont livrées. Ce cadrage ne la rouvre pas.

## Objectif

Faire passer les axes mémoire, scolarité/TDAH, autisme, douleurs, intestin et cas
complexes de **zéro claim validé** à une couverture qui rende leurs conduites
lisibles au praticien — sans toucher à la porte `D-003`, sans changer la procédure,
sans écrire une ligne de moteur.

## Les lots

| Lot | Titre | Décision requise | Ce qu'il produit |
|---|---|---|---|
| LOT-00 | **Mesurer** | non | Le compte réel par statut et par source, lu en production. Rejoue la requête du registre à l'identique. |
| LOT-01 | **Une source, de bout en bout** | non | Une source d'un axe à zéro claim validé, traitée en voie rapide jusqu'à la signature — pour mesurer le temps réel d'une source, pas pour l'estimer. |
| LOT-02 | **La cadence** | non | Les sources restantes de l'axe le plus riche, par séances. Compte rendu par séance : sources signées, défauts constatés, bascules en revue individuelle. |
| LOT-03 | **Le compteur qui ne ment pas** | non | Rafraîchir `claims.mesureLe` et les compteurs du registre après chaque séance, ou déclarer explicitement qu'ils sont périmés. |
| LOT-04 | **Bilan** | non | Ce que la couverture obtenue change réellement à ce que le praticien voit, mesuré sur un dossier réel. |

**Aucun lot n'exige de décision `D-xxx`** — la procédure est déjà arbitrée. C'est ce
qui distingue ce cadrage d'une campagne d'ingénierie.

## Ce qui se mesure, et comment

Le seul indicateur qui compte est **le nombre de claims signés par séance**, pas le
nombre de lots livrés. `D-112` est mesuré trois fois : « le goulot n'est pas
l'ingénierie, c'est le temps praticien ». Une campagne de curation qui se mesurerait
en code livré mentirait sur son propre objet.

Ordre de grandeur à vérifier au LOT-01, jamais à supposer : la revue individuelle
coûte 1 à 2 minutes par claim (chiffre du document de procédure, pilote LOT_001).
La voie rapide tire 30 % (minimum 5) sur les dix premières sources, puis 20 % si
zéro défaut — taux dégressif. **Zéro défaut échantillonné ⇒ signature du lot
entier ; un défaut ⇒ la source entière bascule en revue individuelle**, sans tri
sélectif.

## Contraintes non négociables

- **La porte `D-003` ne bouge pas.** `match_wellneuro_rag_claims` reste l'arbitre,
  et la signature reste un acte explicite portant `validateur` et `valide_at`.
- **Signer plus vite n'est pas signer moins.** La modalité est tracée : un lot signé
  par échantillonnage est distinguable d'une revue individuelle dans l'audit.
- **Un tirage caduc ne se signe pas** et bloque un nouveau tirage tant qu'il n'a pas
  d'issue. La clôture neutre `tirage_caduc` existe pour cela.
- Aucune migration, aucun changement de schéma, aucune écriture de contenu clinique
  par l'outil.
- Le classifieur du mode auto refuse la forme des commandes de lecture production
  (`run -d` + `psql`) : le LOT-00 se joue depuis une session hors mode auto.

## Hors périmètre, nommé

- **La matrice claim par claim** des trois axes doctrinaux (catégorie `A-E` `DC-07`,
  niveau d'exécution `DC-13`, nature du seuil `DC-20`), transférée ici par `D-096` :
  elle appelle une migration de colonnes que ce cadrage n'ouvre pas.
- **L'appariement NABM et les liens biomarqueur↔besoin**, à zéro ligne, portés par la
  même entrée de file mais d'une autre nature.
- **Les contradictions frontales du corpus** entre claims tous deux `VALIDE`. `DC-30`
  dit qu'un conflit se déclare et ne se départage pas tout seul : les signer n'y
  change rien, et les résoudre est un autre travail.
