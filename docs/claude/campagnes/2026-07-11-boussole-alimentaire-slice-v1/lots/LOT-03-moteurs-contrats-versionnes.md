---
id: "LOT-03"
titre: "Moteurs et contrats versionnés"
statut: "à_faire"
dépend_de: "LOT-01 validé + LOT-02 intègre"
---

# LOT-03 — Moteurs et contrats versionnés

## But

Implémenter des contrats purs et déterministes reliant le profil intrinsèque à
une lecture contextuelle sans laisser C5 décider ou diffuser.

## Résultat observable

Les contrats IntrinsicFoodProfile, ContextualFoodReading,
FoodCompassActionRef, PatientFoodCompassView et RecommendedPlateRef sont
versionnés, testés et raccordables au protocole.

## Périmètre

- Calcul p5/p95 depuis la distribution complète de la version.
- insufficient_data dès qu'une donnée obligatoire manque.
- Référence C5 versionnée et hashée dans une nouvelle action protocole V2.
- Lecture des payloads protocole V1 existants.
- C5B limité à une priorité C1 sélectionnée et un protocole C2 actif.
- Invalidation de diffusion à tout changement de version ou de hash.

## Hors périmètre

IA générative, calcul depuis JA, sélection automatique d'une priorité, décision
clinique, diffusion automatique et refonte du moteur protocole.

## Fichiers probables

Types et services C5, contrats de protocole, adaptateur V1/V2, tests unitaires
et fixtures validées en LOT-01.

## Interdits

- Aucune valeur de remplacement inventée.
- Aucun calcul contextuel sans les deux préconditions C1/C2.
- Aucun écrasement d'un payload V1.
- Aucun changement clinique non versionné et non documenté.

## Étapes

- [ ] Écrire les contrats et validateurs de version.
- [ ] Implémenter le calcul intrinsèque pur.
- [ ] Implémenter la projection contextuelle pure.
- [ ] Ajouter l'adaptateur protocole V1/V2 et l'invalidation.
- [ ] Couvrir les cas limites et publier les contrats.

## Tests

Fixtures cliniques, déterminisme, ordre indépendant, valeurs limites, données
manquantes, versions incompatibles, hash caduc, protocole V1 et absence d'IA.

## Critères de done

- Deux exécutions identiques produisent le même résultat et le même hash.
- Une entrée incomplète retourne insufficient_data.
- Un protocole V1 reste lisible sans référence C5.
- Une nouvelle action C5 est V2, versionnée et rendue caduque après changement.

## Risques / points de vigilance

La compatibilité V1 doit rester un adaptateur de lecture ; elle ne doit pas
fabriquer silencieusement des versions ou des références absentes.

## Résultats

À renseigner lors de la clôture du lot.
