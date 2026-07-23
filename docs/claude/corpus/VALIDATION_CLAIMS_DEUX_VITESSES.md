# Validation des claims à deux vitesses — procédure **ACTÉE**

> **Statut : actée par arbitrage praticien du 2026-07-23** (5 décisions
> tranchées en session, consignées en fin de document). Rédigée en réponse à
> la question : « la validation peut-elle se faire par un test de lecture
> global avec questionnaire, comme l'ancienne procédure NotebookLM ? »
> L'Atelier v1 (revue individuelle) reste le comportement en production tant
> que l'Atelier v2 n'est pas livré.

## Constat

Le lot pilote LOT_001 porte 136 claims pour 6 sources (~23/source). Projeté
sur 88 sources : **~2 000 claims**. En revue individuelle avec confrontation
au verbatim (~1 à 2 min/claim), c'est ~50 h de travail praticien — intenable.
La revue pièce à pièce ne passe pas l'échelle ; la porte D-003, elle, doit
tenir.

Distribution mesurée du pilote (base prod, 2026-07-23) :

| | déclaré | observé | interprété | total |
|---|---|---|---|---|
| **prescriptif** | 24 | — | 14 | **38 (28 %)** |
| non prescriptif | 63 | 24 | 11 | **98 (72 %)** |

## Ce qui ne se négocie pas (D-003 inchangé)

1. **Aucun claim ne remonte sans signature praticien.** La barrière
   `match_wellneuro_rag_claims` reste l'arbitre.
2. La signature reste un **acte explicite** : `validateur + valide_at` posés
   sur chaque claim (une signature de lot estampille chaque claim du lot —
   schéma inchangé).
3. La **modalité** de validation est tracée : « échantillonnage + questionnaire,
   lot X » est distinguable de « revue individuelle » dans l'audit.

Ce qui change n'est pas la porte, c'est la **procédure de revue** en amont de
la signature — sa granularité, comme `NOTEBOOK_VALIDATIONS` posait déjà un
verdict CONFORME **par notebook** (preuve + validateur + date), jamais par
paragraphe.

## Ce que la machine garantit déjà

- **Banc A/B/C** : chaque dosage nombre+unité de la lecture brute survit dans
  les deux lectures IA (100 % sur 85 pages) — le risque clinique n°1 est
  contrôlé en amont.
- **Drafting 2 IA** : GPT-5.4 contre-vérifie la fidélité de chaque claim de
  Sonnet 5 au verbatim ; désaccord → exclu (53/189 exclus au pilote, 28 % —
  le filtre travaille).
- **Provenance sha-épinglée** : gardes `sources_absentes` / `source_derivee`
  à la signature ; version de claim immuable.

Risque résiduel couvert par l'humain : la **nuance clinique** — claim fidèle
au texte mais trompeur hors contexte, emphase déplacée, sur-généralisation.

## Proposition

### Voie rapide — claims déclarés/observés non prescriptifs (64 % du pilote)

Par source :

1. **Questionnaire de restitution généré depuis les claims**, joué **sur le
   RAG lui-même** (les réponses citent les claims — teste en prime la chaîne
   de récupération) : restitution factuelle sur les claims à enjeu, questions
   pièges sur ce que la source **ne dit pas** (anti-sur-généralisation),
   nuances ; **couverture garantie** — chaque chunk touché par au moins une
   question. Structure d'audit héritée de `NOTEBOOK_VALIDATIONS` : verdict +
   preuve + validateur + date. Questions libres toujours possibles en plus.
2. **Échantillon aléatoire tiré par le serveur** (jamais choisi par le
   praticien — anti-biais) : **30 % (min. 5) sur les 10 premières sources**,
   puis 20 % (min. 5) si zéro défaut constaté — taux dégressif.
3. **Zéro défaut → signature du lot entier** de la source. **Un défaut → la
   source entière bascule en revue individuelle** (pas de tri sélectif : un
   défaut échantillonné est un signal sur le lot).

### Voie lente — prescriptifs **et** interprétés (36 % du pilote)

**Revue individuelle obligatoire, sans exception**, pour tout claim
`prescriptif = true` (dosages, recommandations, conduites) **et** tout claim
`typologie_lecture = 'interprété'`, même non prescriptif — l'interprétation
est le terrain naturel de la sur-généralisation. Aucun claim de ces deux
familles ne peut être signé par lot.

### Troisième levier — validation à la demande

Rien n'oblige à valider tout le corpus d'avance : l'attente est **sûre par
construction** (barrière vide). Valider en priorité les sources utiles aux
consultations en cours ; le reste attend sans risque.

### Chiffrage à l'échelle 88 sources

~720 claims en voie lente (prescriptifs + interprétés, ~36 %, ~18 h étalables)
auxquels s'ajoutent 88 questionnaires générés et échantillons (~8 h), soit
**~26 h étalées et priorisables**, contre ~50 h de tout-individuel d'un bloc. La **validation à
la demande** (actée) étale ce coût sur les mois d'usage réel : on valide
d'abord les sources utiles aux consultations en cours.

## Esquisse d'implémentation (Atelier v2)

- `web/src/lib/rag/claims/revue.ts` : transition `valider_lot` (par source,
  claims non prescriptifs seuls, garde `statutAttendu` conservée) ; le
  prescriptif reste sur la transition individuelle existante.
- Tirage de l'échantillon **côté serveur**, seedé et journalisé.
- **Journal des décisions** (dette v1 comblée) : table dédiée — modalité,
  échantillon tiré, verdicts, questionnaire joint, signature. C'est une
  **migration** → processus d'exception complet (revue adversariale
  `wn-reviewer` avant merge, vérification base après).
- Écran Atelier : vue par source, questionnaire + réponses RAG citées,
  échantillon à confronter, signature de lot ; motif de rejet (dette v1).

## Décisions actées (arbitrage praticien, 2026-07-23)

1. **Taux d'échantillon : 30 % dégressif** — 30 % (min. 5) sur les 10
   premières sources, puis 20 % (min. 5) si zéro défaut constaté.
2. **Interprétés non prescriptifs : revue individuelle** — ils rejoignent la
   voie lente avec les prescriptifs.
3. **Questionnaire : généré depuis les claims** — restitution factuelle,
   questions pièges, nuances, couverture de chaque chunk garantie ; structure
   d'audit `NOTEBOOK_VALIDATIONS` conservée (verdict + preuve + validateur +
   date) ; questions libres possibles en plus.
4. **Validation à la demande actée** — les sources utiles aux consultations
   d'abord, le reste attend derrière la barrière.
5. **Le pilote passe en deux vitesses** — 49 claims en individuel
   (38 prescriptifs + 11 interprétés), 87 en voie rapide (échantillon 30 %) :
   première application réelle de la procédure, ~1 h 30 estimée.
