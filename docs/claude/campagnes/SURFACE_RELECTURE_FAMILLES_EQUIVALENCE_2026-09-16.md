# Surface de relecture — les familles d'équivalence entre assiettes

*Écrite le 2026-09-16, en exécution de `D-213` §11. **Ce document ne signe
rien.** Il présente au praticien ce qu'il aurait à attester — et il conclut qu'à
ce jour, **il n'y a rien à signer**, pour des raisons de structure et non de
prudence.*

`D-213` §11 l'a qualifiée lui-même : c'est l'affirmation la plus lourde du lot.
Déclarer qu'une assiette peut en remplacer une autre est une **équivalence
clinique**, et le catalogue note qu'aucune n'a jamais été validée. L'arbitrage
n'est pas rouvert : ce document prépare sa mise en œuvre, et rapporte ce que la
lecture a trouvé.

## CE QUE LE CORPUS FONDE — et il ne fonde pas la substitution

Les cent huit claims des quatorze sources d'assiette ont été lus en production le
2026-09-16 : les quatre-vingt-un des douze fiches, les vingt-sept des deux
protocoles. **Aucun ne dit qu'une assiette peut en remplacer une autre.**

Ce que le corpus porte à la place est de trois natures, et **les trois sont
l'inverse logique de la substitution** :

**1. L'ASSOCIATION.** `WN-CL-0302-003` recommande d'associer à l'assiette
sérotoninergique une assiette anti-inflammatoire et une assiette à haute densité
micronutritionnelle. C'est un **cumul** : si A doit s'accompagner de B, A ne
remplace pas B.

**2. L'INCLUSION.** `WN-CL-0301-002` pose que l'assiette dopaminergique
**comporte** une composante anti-inflammatoire. L'une contient l'autre ; elles
ne s'échangent pas.

**3. LA PARENTÉ DE MODÈLE.** `WN-CL-0296-001`, `WN-CL-0303-003`,
`WN-CL-0304-004` et `WN-CL-0305-003` rattachent quatre assiettes au même modèle
méditerranéen de référence. C'est le seul appui de proximité que le corpus
offre — et une parenté de modèle **n'est pas une équivalence** : deux assiettes
peuvent partager leur base végétale et viser deux objectifs qui ne se
remplacent pas.

Un quatrième appui existe, purement objectif et tout aussi insuffisant : le
**recouvrement de contenu**. Plusieurs recommandations reviennent à l'identique
dans cinq ou six fiches — la même famille d'aliments, la même fréquence
hebdomadaire. Deux assiettes peuvent partager l'essentiel de leurs
recommandations et diverger sur ce qui fait leur indication ; un recouvrement
mesurable ne fonde donc rien.

**Conséquence** : toute famille déclarée aujourd'hui serait un **raccourci assumé
de bout en bout** — pas une lecture de claim, mais une affirmation clinique
nouvelle, prise ici.

## LE FAIT STRUCTUREL QUI DOIT ÊTRE SU AVANT DE DÉCLARER QUOI QUE CE SOIT

`decidePlateSubstitution` ne teste **qu'une chose** : que l'assiette source et
l'assiette cible portent la **même valeur** de `substitutionFamily`, non nulle.

Une famille est donc, mécaniquement, une **clique complète** : toute assiette de
la famille peut remplacer **toute** autre, dans **les deux sens**, et par
transitivité. Le mécanisme **ne sait pas exprimer** :

- une substitution **asymétrique** — « B est un repli acceptable de A, mais A
  n'est pas un substitut de B » ;
- une substitution **conditionnelle** — valable pour telle indication seulement ;
- une substitution **graduée** — proche, acceptable, en dernier recours.

**Déclarer une famille de trois assiettes, c'est donc attester six
substitutions**, pas trois. Si l'intention clinique est asymétrique — et pour un
repli, elle l'est presque toujours — **le mécanisme la trahirait en l'élargissant
en silence**. C'est la classe de défaut que `D-208` a eu à fermer sur le
catalogue de conduites : une frontière signée qui change de portée sans changer
de texte.

## NE RIEN DÉCLARER N'EST PAS UN TROU — c'est le comportement nominal, déjà écrit

Le mécanisme est en place et **fail-closed** :

- `substitutionFamily` vaut `null` sur les trois assiettes existantes, et son
  commentaire dit pourquoi : *null tant qu'aucune famille d'équivalence clinique
  n'a été validée* ;
- une source sans famille, ou deux familles différentes, **lèvent** ;
- le chemin par défaut est `status: 'none'` avec
  `reason: 'no_validated_alternative'` — une **absence déclarée**, pas un
  silence ;
- et même dans une famille validée, une justification praticien d'au moins dix
  caractères reste exigée à **chaque** substitution.

Rien n'est donc cassé ni bloqué aujourd'hui. Le patient qui ne peut pas suivre
son assiette reçoit une absence d'alternative **explicite**, ce qui est
exactement ce que le dépôt exige d'un mécanisme non validé.

## POURQUOI AUCUNE FAMILLE N'EST PROPOSABLE AUJOURD'HUI

La raison n'est pas la prudence, elle est arithmétique.

Une famille suppose **au moins deux assiettes servables partageant une
indication**. Or la surface du catalogue établit que **deux assiettes seulement**
ont une indication fondée — l'épargne digestive et la détoxication — et que leurs
indications sont **disjointes**. Une famille qui les réunirait déclarerait que
l'une remplace l'autre : ce serait faux, et aucun claim ne le suggère.

Les dix autres entrent en brouillon, sans indication. **Une famille entre deux
assiettes qu'aucune indication ne convoque n'aurait aucun effet** : le mécanisme
de substitution ne s'atteint que depuis une assiette prescrite.

**La condition de signabilité est donc nommable, et elle ne dépend pas de ce
document** : il faut au moins deux assiettes **publiées** sur une **même**
indication. Le jour où le catalogue en portera deux, la famille devient une
question ; avant, elle n'en est pas une.

## LE GROUPE CANDIDAT, POUR LE JOUR OÙ — et sa réserve

Si une famille devait un jour se former, le groupe le plus dense qu'offre le
corpus est celui des quatre assiettes rattachées au **même modèle de
référence** : végétale (`WN-SRC-0296`), psychobiotique (`WN-SRC-0303`),
antioxydante (`WN-SRC-0304`), anti-inflammatoire (`WN-SRC-0305`).

**Ce n'est pas une proposition.** C'est le constat qu'aucun autre regroupement
n'a d'appui corpus, et il vient avec sa réserve : la parenté de modèle n'est pas
l'équivalence, et les quatre n'ont **aucune indication fondée** — donc aucune
n'est servable, donc la famille serait inatteignable. Elle attendrait deux fois :
que les indications existent, et que l'équivalence soit attestée pour
elle-même.

## UNE QUESTION QUI PRÉCÈDE LA FAMILLE, ET QUI PEUT LA RENDRE INUTILE

`D-213` §11 justifie la famille par le patient qui ne peut pas suivre son
assiette. Or le dépôt porte **déjà** un mécanisme pour cela, et sur chaque
action : le **plan minimal** et le **plan de secours**, obligatoires tous les
deux, écrits par le praticien pour ce patient-là.

La question à trancher est donc antérieure : l'assiette qu'un patient ne peut pas
suivre relève-t-elle d'une **substitution d'assiette** — une alternative
catalogue, attestée une fois pour tous — ou d'un **repli sur l'action**, écrit
au cas par cas dans le protocole ? Les deux réponses sont défendables ; elles
n'engagent pas le même travail, et l'une rend l'autre superflue.

Cette question n'est pas un retour sur `D-213` §11, qui a décidé que les familles
seraient écrites. Elle porte sur **ce qui les rendrait nécessaires**, et elle se
pose avant la première déclaration, pas après.

## CE QUE L'ATTESTATION DEMANDERA, LE JOUR VENU

1. **Nommer la famille et ses membres**, en sachant que le mécanisme la lira
   comme une clique complète : chaque paire, dans les deux sens.
2. **Déclarer, pour chaque paire, que la substitution est cliniquement
   acceptable** — et non que les deux assiettes se ressemblent.
3. **Écrire ce que la famille ajoute au-delà des claims**, puisque aucun claim
   ne fonde une substitution : ce sera un raccourci assumé, intégral, et il se
   déclare comme tel.
4. Si l'intention est **asymétrique**, le dire **avant** : le mécanisme actuel ne
   sait pas la porter, et il faudra le changer plutôt que l'arrondir.
5. `validationExterne`, `dateValidation`, `shaPerimetre` recopié à la main — le
   catalogue d'assiettes n'a pas encore ces champs ; les familles les rendront
   nécessaires.

## CE QUE CE LOT NE PRÉTEND PAS

- **L'absence de famille n'est pas un défaut à réparer.** C'est un état déclaré,
  gardé par cinq assertions, et visible du praticien.
- **Le CI ne peut rien vérifier d'une équivalence clinique.** Il atteint
  l'appartenance à une famille et la présence d'une justification. Que deux
  assiettes soient interchangeables pour un patient donné ne se vérifie nulle
  part ailleurs que dans la relecture.
- **Aucun contenu d'assiette n'entre au dépôt** — les douze fiches restent
  `rightsStatus: to_verify` et `clinicalReviewStatus: not_reviewed`. Une famille
  **désigne** des assiettes, elle ne recopie pas ce qu'elles contiennent.
