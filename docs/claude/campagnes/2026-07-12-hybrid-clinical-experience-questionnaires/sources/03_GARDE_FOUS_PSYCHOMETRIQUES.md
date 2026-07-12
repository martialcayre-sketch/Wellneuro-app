# Garde-fous psychométriques et randomisation contrôlée

## 1. Principe

Un questionnaire clinique n'est pas seulement un ensemble de champs. Son texte, son ordre, ses ancrages, son contexte temporel et son mode d'administration peuvent participer à la validité de la mesure.

Toute refonte UX doit donc distinguer :

- la mise en forme ;
- l'ordre visuel ;
- la structure de navigation ;
- le contenu de l'instrument ;
- le codage ;
- la cotation ;
- l'interprétation.

La mise en forme peut évoluer. Les autres dimensions restent fixes sauf autorisation explicite.

## 2. Niveaux de liberté

### `strict`

Utiliser lorsque :

- l'instrument est validé, licencié ou accompagné d'un manuel précis ;
- l'ordre des items ou réponses peut être significatif ;
- la présentation officielle doit être reproduite ;
- l'impact d'un changement est inconnu.

Autorisé : responsive, contraste, taille de cible, focus, sauvegarde, messages techniques autour de l'instrument.

Interdit : modifier texte, ordre, ancrages, temporalité, groupement, nombre d'items, type de réponse, valeur, seuil ou interprétation.

### `layout_only`

Autorise :

- passage d'une colonne à des cartes ;
- pagination logique ;
- micro-lots respectant l'ordre ;
- barre de progression ;
- résumé final ;
- adaptation mobile.

Conserve : contenu, ordre, valeurs, sections et logique conditionnelle.

### `nominal_shuffle_allowed`

Autorise uniquement le mélange d'options nominales explicitement déclarées non ordonnées.

Exemples possibles : liste de sources d'information, catégories sans rang, choix de contexte indépendants.

N'autorise pas le mélange des items ni des échelles ordinales.

### `internal_flexible`

Réservé aux questionnaires ou formulaires internes WellNeuro sans validation externe imposant un protocole fixe.

Permet : timeline, tri de priorités, grille de routines, cartes conditionnelles et autres interactions, sous réserve de tests et de documentation.

## 3. Matrice de randomisation

| Élément | Politique par défaut | Exception possible |
|---|---|---|
| Items d'une échelle validée | ordre fixe | uniquement manuel/validation explicite |
| Sections | ordre fixe | questionnaire interne documenté |
| Échelle Likert | ordre fixe | aucune en V1 |
| Fréquence | ordre fixe | aucune en V1 |
| Intensité/douleur | ordre fixe | aucune en V1 |
| Accord/désaccord | ordre fixe | aucune en V1 |
| Oui/Non | ordre fixe | aucune en V1 |
| Options nominales sans ordre | fixe par défaut | mélange déclaré |
| `Autre` | épinglé en dernier | position déclarée |
| `Aucun` / `Aucune` | épinglé | logique exclusive testée |
| `Ne sait pas` | épinglé | position déclarée |
| `Non concerné` | épinglé | uniquement si instrument le prévoit |

## 4. Pourquoi l'aléatoire généralisé est interdit

Un ordre aléatoire peut :

- casser la lecture intuitive d'une échelle ;
- augmenter la charge cognitive ;
- modifier des effets de primauté ou de récence sans savoir s'ils ont été intégrés à la validation ;
- empêcher le patient de retrouver sa sélection au retour arrière ;
- créer des différences entre première saisie et correction ;
- compliquer l'audit clinique ;
- invalider des tests automatisés naïfs ;
- rendre deux administrations moins comparables.

L'aléatoire n'est donc pas une décoration. C'est une propriété d'administration.

## 5. Randomisation déterministe

Lorsqu'elle est autorisée :

- calculer une graine stable par tentative ;
- ne jamais utiliser une donnée personnelle ou clinique ;
- conserver le même ordre après rechargement, navigation arrière et reprise ;
- inclure une version de politique afin qu'une évolution future ne réordonne pas un brouillon existant.

Exemple conceptuel :

```text
seed = hash(idAssignation + questionId + "shuffle-v1")
```

Le résultat doit être une permutation pure d'options autorisées, sans changement de `v` ni de `l`.

## 6. Métadonnées cibles

Exemple documentaire :

```ts
type DisplayPolicy = {
  administration: 'strict' | 'layout_only' | 'nominal_shuffle_allowed' | 'internal_flexible';
  renderer: 'focus' | 'micro_batch' | 'guided_sections' | 'compact_repeated_scale';
  itemOrder: 'fixed';
  optionOrder: 'fixed' | 'shuffle_nominal';
  pinnedOptionValues?: number[];
  shuffleVersion?: string;
};
```

Cette structure ne doit pas être ajoutée sans audit des types, du catalogue et des tests. Elle n'implique pas automatiquement une migration de base : elle peut rester dans les définitions statiques du catalogue.

## 7. Scoring

Règles impératives :

- scorer par identifiant de question et valeur de réponse ;
- ne jamais scorer par index visuel ;
- ne jamais convertir une position affichée en valeur ;
- conserver les valeurs des options lors de toute permutation ;
- tester les items inversés ;
- tester les sous-scores ;
- comparer le JSON soumis avant/après refonte ;
- conserver les champs manquants et non applicables selon le contrat actuel.

## 8. Pagination et ordre des items

Pagination autorisée ne signifie pas réorganisation.

Pour un instrument `strict` ou `layout_only` :

- conserver l'ordre source ;
- découper uniquement entre items ;
- ne pas séparer une instruction de son groupe ;
- ne pas déplacer un item conditionnel avant son déclencheur ;
- ne pas isoler une échelle de ses ancrages ;
- documenter le découpage choisi.

## 9. Adaptation mobile

L'adaptation mobile peut :

- transformer une matrice en cartes successives ;
- répéter les ancrages ;
- rendre chaque ligne navigable au clavier ;
- augmenter les cibles ;
- ajouter un rappel de contexte.

Elle ne peut pas :

- changer l'ordre de gauche à droite d'une échelle ;
- omettre un ancrage ;
- remplacer des libellés par des icônes ;
- masquer des options dans un menu non évident ;
- convertir une échelle verbale en slider sans validation.

## 10. Tests obligatoires

### Test de mapping

Pour chaque option affichée, vérifier que sélectionner le libellé produit la valeur attendue.

### Test de permutation

Pour `shuffle_nominal` :

- l'ensemble des options est identique ;
- l'ordre peut différer entre assignations ;
- l'ordre est identique pour une même assignation ;
- les options épinglées restent à leur place ;
- la valeur soumise est indépendante de la position.

### Test de scoring

Pour un jeu de réponses de référence :

- même score principal ;
- mêmes sous-scores ;
- même interprétation ;
- mêmes indicateurs de qualité ;
- mêmes valeurs manquantes/non applicables.

### Test de correction

Après déverrouillage :

- même ordre qu'à la première tentative si un brouillon ou une politique stable existe ;
- réponse précédente visible ;
- modification précise ;
- nouvelle transmission correcte.

## 11. Inventaire clinique requis

Avant LOT-05/LOT-06, créer une matrice par questionnaire :

| ID | Titre | Source | Validé/licencié | Ordre officiel connu | Politique | Renderer pilote | Notes |
|---|---|---|---|---|---|---|---|

En cas d'incertitude : politique `strict`.

## 12. Références méthodologiques

À consulter et archiver dans le corpus de gouvernance clinique :

- FDA, *Patient-Reported Outcome Measures: Use in Medical Product Development to Support Labeling Claims*.
- Documentation officielle PROMIS / HealthMeasures sur les formes courtes et Computerized Adaptive Tests.
- W3C WCAG 2.2 et ressources WAI sur labels, instructions, erreurs et prévention des erreurs.
- Travaux de Jon Krosnick sur charge cognitive, satisficing et effets d'ordre.

Un vrai Computerized Adaptive Test sélectionne les items à partir d'une banque calibrée et d'un modèle psychométrique. WellNeuro ne doit pas appeler « adaptatif » un simple masquage conditionnel ou une réduction arbitraire d'items.

## 13. Autorité de décision

Toute exception aux règles ci-dessus doit être :

1. décrite ;
2. justifiée par le manuel ou une validation clinique ;
3. approuvée explicitement ;
4. testée ;
5. consignée dans `CHANGELOG.md` si elle modifie l'administration ou l'interprétation.
