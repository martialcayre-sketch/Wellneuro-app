---
id: "LOT-03"
titre: "Validation et handoff"
statut: "terminé"
dépend_de: "LOT-02"
---

# LOT-03 — Validation et handoff

## But

Clore la campagne avec un état vérifié et une proposition de nettoyage
réversible.

## Périmètre

- matrice finale des 36 branches ;
- validations exécutées ;
- documentation canonique et journal de session ;
- liste des branches candidates à suppression.

## Interdits

- ne supprimer aucune branche dans ce lot ;
- ne déclarer aucun test réussi sans exécution ;
- ne modifier ni scoring ni logique clinique.

## Étapes

- exécuter T1 ;
- vérifier les liens et le diff ;
- obtenir une revue indépendante ;
- produire le handoff et demander séparément la confirmation de nettoyage.

## Critères de done

- verdict GO/NO-GO explicite ;
- état 62/64 traçable ;
- aucune branche supprimée sans accord.

## Résultats

- T1 exécuté et vert : `cd web && npm run check`.
- Revue indépendante exécutée sur les changements documentaires des lots 01 à
  03.
- Matrice finale consolidée : 36 branches recensées ; 35 classées
  intégrées/obsolescentes, 1 branche restante en arbitrage
  (`feat/mini-synthese-par-rubrique`).
- Proposition de nettoyage immédiat bornée à 20 branches ; les 15 autres
  restent hors périmètre de nettoyage tant que l'arbitrage final n'est pas
  rendu.
- Aucune branche supprimée ; nettoyage uniquement proposé.

## Verdict

- **GO** pour la consolidation documentaire et la traçabilité 62/64.
- **NO-GO** pour la clôture complète de campagne tant que l'arbitrage sur
  `feat/mini-synthese-par-rubrique` n'est pas tranché.

## Handoff court

1. Trancher le sort de `feat/mini-synthese-par-rubrique` (merge amendé ou
   clôture sans merge).
2. Après arbitrage, confirmer séparément la suppression des 20 branches
   candidates.
3. Mettre à jour la checklist finale de campagne et clôturer CERT-Q.
