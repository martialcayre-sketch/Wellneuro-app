---
id: "LOT-02"
statut: "transféré (2026-08-23, D-096) — le périmètre part à la campagne « Curation signée »"
dépend_de: "— (sans objet)"
---

# LOT-02 — V2 : la migration du schéma de claim — **TRANSFÉRÉ**

> **Ce lot ne s'exécute pas dans cette campagne.** Son périmètre a été
> transféré le 2026-08-23 ([[D-096]]) à la campagne **Curation signée**
> (`docs/claude/campagnes/2026-08-18-curation-signee/`), où il vit désormais
> comme source de cadrage :
> `sources/2026-08-23-transfert-migration-axes-claim.md`.
>
> Le numéro n'est **pas réattribué** : renuméroter six fiches pour combler un
> trou coûterait plus que le trou, et l'historique des dépendances resterait
> illisible. « Doctrine exécutable » compte donc **sept lots exécutables sur
> neuf numéros** (LOT-01 livré, LOT-02 transféré, LOT-03 à LOT-09 à faire).

## Pourquoi le transfert

Le lot livrait trois axes doctrinaux sur `rag_corpus_claims` — catégorie
`A-E` (`DC-07`), niveau d'exécution (`DC-13`), nature du seuil (`DC-20`).

Après l'arbitrage du 2026-08-23 qui a sorti la **population** du claim
([[D-095]]), il ne restait **aucun consommateur** de ces colonnes dans la
campagne : les LOT-05 et LOT-06 avaient perdu leur dépendance, et le LOT-01 a
mesuré que rien d'autre ne les lit. Le seul bénéficiaire réel est **Curation
signée**, qui n'a aujourd'hui nulle part où écrire ces axes — et qui est à
l'arrêt (appariement NABM et liens biomarqueur↔besoin toujours à 0 ligne).

L'argument d'origine de l'audit — « si la migration n'est pas posée tôt,
chaque lot invente son équivalent local » — visait les LOT-04, LOT-05 et
LOT-06 de la **chaîne T0**. Ces lots sont livrés depuis le 2026-08-18 : le
risque de fragmentation a expiré avec eux.

Une migration en production posée par une campagne qui ne s'en sert pas aurait
été une colonne orpheline de plus — exactement ce que le LOT-01 vient de
recenser douze fois.

## Conséquence sur la campagne

- « Doctrine exécutable » **n'a plus de migration**, donc plus aucune étape
  sous confirmation obligatoire. Le gate correspondant tombe.
- Les porteurs de `DC-07`, `DC-13` et `DC-20` dans
  `CONSTITUTION_CLINIQUE.md` désignent désormais **Curation signée**.
- Aucun lot restant n'attend quoi que ce soit de ce numéro.
