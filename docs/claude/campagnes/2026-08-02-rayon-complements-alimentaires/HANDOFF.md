---
id: "HANDOFF-2026-08-02"
titre: "Handoff — campagne rayon compléments alimentaires"
created_at: "2026-08-02"
---

# Handoff — campagne rayon compléments alimentaires

## État courant

Le socle du rayon compléments alimentaires est désormais visible dans le dépôt courant et consolidé autour d’une branche de campagne unique. Les surfaces principales suivantes sont déjà présentes :

- bibliothèque de logique métier sous `web/src/lib/supplement-library/` ;
- UI praticien sous `web/src/components/complements/` ;
- API praticien sous `web/src/app/api/praticien/complements/` ;
- routes internes d’ingestion et de référentiel sous `web/src/app/api/internal/supplements/`.

## Ce qui a été stabilisé

- l’UI praticien du panneau de rayon affiche désormais un état explicite lorsque le rayon est désactivé ;
- le contrat d’activation du rayon est maintenant centralisé et partagé entre l’API praticien, la page bibliothèque et le panneau de consultation, avec un message métier unique quand le flag `WN_C4_ENABLED` reste fermé ;
- les routes internes d’ingestion et de référentiel répondent avec un payload d’erreur cohérent (`ok: false`) en cas de garde fail-closed ;
- la campagne documente désormais l’état de validation, les limites connues et les prochaines pistes de consolidation.

## Limites connues

- l’activation runtime du rayon reste pilotée par des garde-fous métier et ne doit pas être considérée comme une activation par défaut ;
- la validation E2E de travail a mis en évidence un échec non lié sur le parcours `portail-lien-magique`, à garder en mémoire pour les prochaines passes de validation.

## Prochaines pistes

- valider l’activation métier du rayon avec le produit et les équipes de gouvernance ;
- poursuivre le remplissage du référentiel et de la gouvernance des données externes ;
- conserver la stratégie fail-closed pour les routes internes tant que l’activation n’est pas décidée.
