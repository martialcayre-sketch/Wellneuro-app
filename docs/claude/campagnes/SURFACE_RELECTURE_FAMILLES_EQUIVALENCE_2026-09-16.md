# Surface de relecture — les familles d'équivalence entre assiettes

*Écrite le 2026-09-16 en exécution de `D-213` §11, **corrigée le même jour**.
**Ce document ne signe rien.** Il présente au praticien ce qu'il aurait à
attester.*

> **CE QUI A CHANGÉ DANS CETTE VERSION.** La première rédaction concluait qu'il
> n'y avait « rien à signer » en s'appuyant sur deux arguments dont l'un était
> faux et l'autre trop fort. Le premier — « deux assiettes seulement ont une
> indication » — tombe : la surface du catalogue en compte **huit publiées**
> après lecture des douze protocoles prescriptifs qui avaient été manqués. Le
> second — « leurs indications sont disjointes » — était inexact : un patient
> peut très bien réunir un trouble fonctionnel intestinal **et** un score
> dopaminergique bas ; ce sont des indications **distinctes**, pas des ensembles
> disjoints. La conclusion tient toujours, mais pour une **autre raison**, et
> celle-là est solide.

## CE QUE LE CORPUS FONDE — et il ne fonde pas la substitution

Les 212 claims des vingt-quatre sources d'assiette ont été lus en production le
2026-09-16. **Aucun ne dit qu'une assiette peut en remplacer une autre.**

Ce que le corpus porte est de trois natures, et **les trois sont l'inverse
logique de la substitution** :

**1. L'INCLUSION, et elle est explicite.** `WN-CL-0290-004` pose que l'assiette
sérotoninergique **associe** une assiette anti-inflammatoire et une assiette
microbiotique ; `WN-CL-0289-002`, côté dopaminergique, décrit la même
composition. Ces assiettes ne sont pas des alternatives les unes des autres :
**l'une en contient d'autres**. Les déclarer équivalentes reviendrait à dire
qu'une partie remplace le tout.

**2. L'ASSOCIATION.** Plusieurs claims recommandent de **cumuler** deux
assiettes. Si A doit s'accompagner de B, A ne remplace pas B.

**3. LA PARENTÉ DE MODÈLE.** Quatre assiettes se rattachent au même modèle
méditerranéen de référence. C'est le seul appui de proximité que le corpus
offre — et une parenté de modèle **n'est pas une équivalence** : deux assiettes
peuvent partager leur base végétale et viser deux objectifs qui ne se remplacent
pas.

Un quatrième appui existe, objectif et tout aussi insuffisant : le
**recouvrement de contenu**. Plusieurs recommandations reviennent à l'identique
dans cinq ou six sources — même famille d'aliments, même fréquence
hebdomadaire. Deux assiettes peuvent partager l'essentiel de leurs
recommandations et diverger sur ce qui fait leur indication.

**Conséquence** : toute famille déclarée aujourd'hui serait un **raccourci assumé
de bout en bout** — pas une lecture de claim, mais une affirmation clinique
nouvelle, prise ici.

## LA VRAIE DIFFICULTÉ N'EST PAS LE MANQUE DE CANDIDATS, C'EST LEUR NATURE

Des assiettes partagent bel et bien une porte d'entrée. Trois se présentent sur
le versant intestinal — épargne digestive, psychobiotique, détoxication — et
trois sur le versant des neurotransmetteurs — dopaminergique, sérotoninergique,
anti-inflammatoire. **Le groupe existe donc ; ce qui manque, c'est la relation.**

Or la relation que le corpus décrit entre ces assiettes-là est justement la
**composition** : sur le versant des neurotransmetteurs, la sérotoninergique
*contient* l'anti-inflammatoire. Trois assiettes qui répondent à la même plainte
peuvent être cumulatives, emboîtées ou hiérarchisées — **et aucune de ces trois
relations n'est une substitution.**

## LE FAIT STRUCTUREL QUI DOIT ÊTRE SU AVANT DE DÉCLARER QUOI QUE CE SOIT

`decidePlateSubstitution` ne teste **qu'une chose** : que l'assiette source et
l'assiette cible portent la **même valeur** de `substitutionFamily`, non nulle.

Une famille est donc, mécaniquement, une **clique complète** : toute assiette de
la famille peut remplacer **toute** autre, dans **les deux sens**, et par
transitivité. Le mécanisme **ne sait pas exprimer** :

- une substitution **asymétrique** — « B est un repli acceptable de A, mais A
  n'est pas un substitut de B » ;
- une substitution **conditionnelle** — valable pour telle indication seulement ;
- une substitution **graduée** — proche, acceptable, en dernier recours ;
- une relation d'**inclusion**, qui est pourtant celle que le corpus décrit.

**Déclarer une famille de trois assiettes, c'est attester six substitutions**,
pas trois. Pour un repli, l'intention est presque toujours asymétrique — **le
mécanisme la trahirait en l'élargissant en silence**. C'est la classe de défaut
que `D-208` a fermée sur le catalogue de conduites : une frontière signée qui
change de portée sans changer de texte.

**Et la fonction ne vérifie pas qu'une assiette est prescrite.** Elle ne reçoit
que des références de catalogue. Une famille posée entre deux assiettes qu'aucune
indication ne convoque serait donc **acceptée** par elle. La restriction
« la substitution ne s'atteint que depuis une assiette prescrite » est une garde
**à écrire dans le chemin d'intégration**, pas une propriété acquise.

## NE RIEN DÉCLARER EST LE COMPORTEMENT NOMINAL — mais il n'est pas encore servi

Le mécanisme est **fail-closed** là où il est appelé :

- `substitutionFamily` vaut `null` sur les trois assiettes existantes, et son
  commentaire dit pourquoi : *null tant qu'aucune famille d'équivalence clinique
  n'a été validée* ;
- une source sans famille, ou deux familles différentes, **lèvent** ;
- le chemin par défaut est `status: 'none'` avec
  `reason: 'no_validated_alternative'` — une **absence déclarée** ;
- et même dans une famille validée, une justification praticien d'au moins dix
  caractères reste exigée à **chaque** substitution.

**Mais rien de tout cela n'atteint le patient aujourd'hui, et il faut le dire
plutôt que le laisser supposer** : `decidePlateSubstitution` n'est appelée que
par son propre banc, et la route Boussole du praticien renvoie
`alternatives: []` **en dur**. L'absence d'alternative n'est donc pas
« déclarée » au parcours — elle est **absente du parcours**. C'est la
distinction entre ce qu'une fonction ferait si on l'appelait et ce qui est
effectivement exposé.

## L'ARBITRAGE RENDU LE 2026-09-16 : LES FAMILLES SE FERONT, LE MÉCANISME CHANGE D'ABORD

La question posée était : l'assiette qu'un patient ne peut pas suivre relève-t-elle
d'une **substitution catalogue**, attestée une fois pour toutes, ou du **plan
minimal** déjà obligatoire sur chaque action et écrit pour ce patient-là ?

**Réponse : la substitution catalogue — mais pas sur le mécanisme actuel.**
`D-213` §11 est confirmé, et sa mise en œuvre reçoit une condition préalable qui
n'est pas négociable : **aucune famille ne se déclare tant que le mécanisme ne
sait pas porter la relation réellement voulue.** Déclarer aujourd'hui, ce serait
faire dire à une clique complète une intention orientée — et le dépôt a déjà payé
cette classe de défaut.

**Le programme, dans cet ordre, et chaque étape précède la suivante :**

1. **Un mécanisme orienté.** `substitutionFamily` ne peut pas exprimer
   « B remplace A sans que A remplace B ». Ce qu'il faut est une relation
   dirigée — une source, une cible, et la direction qui les sépare —, pas une
   étiquette d'appartenance partagée.
2. **Une garde sur la prescription.** `decidePlateSubstitution` ne reçoit que des
   références de catalogue et accepterait une famille entre deux assiettes
   qu'aucune indication ne convoque. La substitution ne doit s'atteindre que
   depuis une assiette **prescrite**.
3. **Un chemin qui expose la décision.** La route Boussole renvoie
   `alternatives: []` en dur : une famille validée resterait aujourd'hui aussi
   invisible que l'absence actuelle.
4. **Alors seulement, l'affirmation clinique** — vôtre, pas du corpus — que telle
   assiette est un repli acceptable de telle autre, pour une indication nommée.

**Ce que cet ordre protège.** Le plan minimal et le plan de secours restent le
repli de droit commun, écrit au cas par cas. La famille ne les remplace pas :
elle ajoutera une alternative **attestée** là où le praticien veut proposer une
autre assiette plutôt qu'un allègement de la même.

## CE QUE L'ATTESTATION DEMANDERA, UNE FOIS LE MÉCANISME EN PLACE

1. **Nommer la famille et ses membres**, en sachant que le mécanisme la lira
   comme une clique complète : chaque paire, dans les deux sens.
2. **Déclarer, pour chaque paire, que la substitution est cliniquement
   acceptable** — et non que les deux assiettes se ressemblent, ni que l'une
   contient l'autre.
3. **Écrire ce que la famille ajoute au-delà des claims**, puisque aucun claim ne
   fonde une substitution : ce sera un raccourci assumé, intégral.
4. Si l'intention est **asymétrique, conditionnelle ou graduée**, le dire
   **avant** : le mécanisme actuel ne sait pas la porter.
5. `validationExterne`, `dateValidation`, `shaPerimetre` recopié à la main — le
   catalogue d'assiettes n'a pas encore ces champs ; les familles les rendront
   nécessaires.

## CE QUE CE LOT NE PRÉTEND PAS

- **L'absence de famille n'est pas un défaut à réparer.** C'est un état déclaré
  et gardé — mais non encore exposé au parcours, et les deux ne sont pas la même
  chose.
- **Le CI ne peut rien vérifier d'une équivalence clinique.** Il atteint
  l'appartenance à une famille et la présence d'une justification.
- **Aucun contenu d'assiette n'entre au dépôt.** Une famille **désigne** des
  assiettes, elle ne recopie pas ce qu'elles contiennent.
