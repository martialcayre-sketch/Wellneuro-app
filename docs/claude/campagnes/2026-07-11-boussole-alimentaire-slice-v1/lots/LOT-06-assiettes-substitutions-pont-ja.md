---
id: "LOT-06"
titre: "Assiettes, substitutions et pont JA"
statut: "terminé"
dépend_de: "LOT-03 + contrat JA publié"
---

# LOT-06 — Assiettes, substitutions et pont JA

## But

Rendre C5B propriétaire d'un catalogue d'assiettes et relier JA par un contrat
de faisabilité sans modifier le profil intrinsèque ni automatiser le conseil.

## Résultat observable

Les assiettes ne sont plus possédées par le code JA ; une action d'essai peut
référencer une assiette C5B versionnée, tout en relisant les épisodes JA V1.

## Périmètre

- Catalogue C5B versionné, sans table assiette_type en V1.
- RecommendedPlateRef optionnelle dans TrialAction.
- Adaptateur de lecture des épisodes JA V1.
- Contrat JA de faisabilité publié, factuel et praticien-validé.
- Substitutions bornées aux familles validées, avec justification.
- Résultat explicite possible : aucune substitution proposée.

## Hors périmètre

Réécriture de JA, changement du score intrinsèque, prescription, menus,
génération automatique, table assiette_type et diffusion automatique.

## Fichiers probables

Catalogue C5B, contrats TrialAction, adaptateur JA V1/V2, panneau praticien
alimentaire et tests de compatibilité.

## Interdits

- JA ne peut ni noter l'aliment ni modifier IntrinsicFoodProfile.
- Une observation non publiée ou non validée ne peut pas être consommée.
- Aucune substitution hors famille clinique validée.
- Le terme prescription est interdit pour ces actions alimentaires.

## Étapes

- [ ] Extraire les assiettes existantes vers le catalogue C5B versionné.
- [ ] Ajouter RecommendedPlateRef optionnelle au contrat TrialAction.
- [ ] Préserver la lecture JA V1 et publier le contrat de faisabilité.
- [ ] Implémenter les substitutions justifiées et le cas sans proposition.
- [ ] Vérifier qu'aucune diffusion n'est automatique.

## Tests

JA V1/V2, référence d'assiette inconnue ou caduque, observation non publiée,
famille invalide, aucune substitution possible, provenance, validation
praticien et absence de diffusion automatique.

## Critères de done

- Une seule source versionnée possède chaque assiette.
- Un épisode JA V1 reste lisible sans RecommendedPlateRef.
- La faisabilité JA est informative et n'altère aucun score.
- Le praticien peut choisir explicitement de ne rien proposer.

## Risques / points de vigilance

Le déplacement de propriété ne doit pas transformer une donnée historique JA ;
l'adaptateur garantit la lecture sans migration opportuniste.

## Résultats

À renseigner lors de la clôture du lot.
