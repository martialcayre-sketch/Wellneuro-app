# Lot Q5b — Brouillon d'observation alimentaire sur l'appareil

Statut : cadré par [[D-507]], non commencé. Lot séparé de PAT-4.
Textes T-49/T-50 acceptés dans [[D-488]], DOC-7 ; publication non réalisée.
Aucun numéro de lot supplémentaire ni drapeau nouveau.

## But et périmètre minimal

Rendre la reprise après fermeture de l'onglet cohérente avec les quatre
textes « sur cet appareil », tout en bornant la conservation des données.
Passer ce seul brouillon en localStorage ; aucune persistance serveur
nouvelle et aucune migration. Ne pas ajouter de brouillon aux deux agendas.

Chemins prévus : PatientFoodObservationPanel.tsx, un module local de
brouillon si nécessaire, stockageAppareil.ts et leurs bancs ; dossier RGPD ;
registre de confidentialité selon le circuit TRUST. Le contrat d'envoi,
les questions, les options, le calcul et les valeurs restent identiques.

## Conservation et reprise

- Durée : 30 jours depuis la dernière écriture ; limite technique.
  Vérifier la péremption avant toute restauration ou réécriture automatique.
  Un brouillon périmé s'efface au prochain accès ; pas de purge en arrière-plan
  promise lorsque le navigateur est fermé.
- Sans session vérifiée, aucune écriture. Séparer les patients d'un même
  navigateur ; ne pas employer un jeton de lien comme clé.
- Reprise du brouillon sessionStorage existant : lire et vérifier le format
  actuel, conserver sans perte les notes valides. Ne retirer l'ancien exemplaire
  qu'après confirmation de l'écriture locale de remplacement. L'ancien format
  ne porte pas de date : ne pas prétendre en connaître l'âge ; dater sa reprise
  selon la règle technique explicitée dans l'implémentation et son handoff.
- Écriture refusée ou quota : ne pas laisser croire que le brouillon est
  conservé. Ne pas ajouter un texte patient non accepté ; toute formulation
  nécessaire repasse au registre avant application.
- Une relecture serveur ne réécrit pas une copie de notes déjà transmises
  dans le brouillon local et ne renouvelle pas indûment sa conservation.

## Transmission et déconnexion

Après un succès confirmé, retirer les seules notes de l'instantané envoyé.
Préserver les notes non envoyées, celles d'autres périodes et toute nouvelle
note saisie pendant l'envoi. Garder les repères techniques nécessaires à la
chaîne de transmission. Une réponse perdue, illisible ou refusée ne purge rien.

Le panneau actuel écrit son état par effet (PatientFoodObservationPanel.tsx:226-236)
et relit aussi un instantané serveur (:293-315). Une simple suppression de clé
serait insuffisante : un effet pourrait immédiatement recréer ce qui vient
d'être effacé. La réalisation doit distinguer le brouillon non transmis de la
relecture, sans modifier le contrat ni le chaînage des envois.

Déconnexion selon [[D-244]] : avertissement seulement si du travail non transmis
serait perdu, annulation possible, purge après confirmation du serveur,
notes conservées si déconnexion en échec. Mettre l'inventaire à jour pour
couvrir localStorage, la métadonnée éventuelle et les restes de l'ancien
sessionStorage ; préserver le confort de lecture.

## Information à livrer avec le comportement

T-49 près du brouillon et T-50 dans « Vos données personnelles et leur
confidentialité » sont acceptés mot pour mot dans [[D-488]], DOC-7.
Ne pas les afficher avant que le comportement décrit soit effectif.
Suivre le versionnement TRUST existant, qualifier le changement et déterminer
l'accusé dû dans ce circuit ; ne pas modifier une version publiée en place.

Ajouter au dossier RGPD les catégories et le lieu de stockage, la durée et
les effacements (rubriques 5, 8 et 10), et la publication de l'information
(rubrique 11). Formulation interne préparée :

> Brouillon d'observation alimentaire, conservé dans le navigateur du patient
> en localStorage. Conservation maximale de 30 jours depuis sa dernière
> écriture ; à l'accès suivant, un brouillon périmé est supprimé avant
> restauration. Les notes dont la transmission est confirmée sont retirées
> de cette copie locale ; les notes non transmises sont préservées.
> La déconnexion confirmée purge les données locales selon D-244, après
> avertissement si du travail non transmis serait perdu. Le navigateur fermé
> n'exécute pas de purge. Les notes transmises restent soumises à la
> conservation du dossier sur le serveur, distincte du brouillon.

Cette ligne décrit la cible décidée, pas l'état actuel de production.

## Réception et vérifications nécessaires

1. Sur fixture locale, fermer puis rouvrir l'onglet : reprise du brouillon
   valide dans le même navigateur ; pas de reprise sur un autre appareil.
2. Temps injecté : brouillon avant limite restauré, brouillon au-delà non
   restauré et supprimé ; relecture seule sans prolongation indue.
3. Ancien format repris sans perte ; écriture de remplacement échouée
   sans destruction de l'ancien ; stockage bloqué sans fausse confirmation.
4. Transmission refusée ou coupée : aucune perte. Succès : seules les notes
   confirmées disparaissent du brouillon, aucune recréation par un effet,
   relecture serveur toujours possible et chaînage préservé.
5. Note ajoutée pendant l'envoi et notes hors cycle conservées.
6. Déconnexion annulée ou refusée : notes intactes ; déconnexion confirmée :
   purge des deux stockages et métadonnées, confort de lecture intact.
7. Inventaire/garde de classe et non-régression de déconnexion ; T1 et T2
   adaptés au code futur. Aucun banc neuf dans la préparation documentaire.
8. Vérifier texte publié/version, concordance du dossier RGPD et information
   effective au téléphone ; consigner la livraison dans un handoff propre.

## Interdits

Aucun code de ce lot dans PAT-4. Aucun changement clinique, de contrat serveur,
de règle d'enregistrement ou de seuil. Aucune donnée réelle, lecture de
fichier d'environnement, migration ou écriture en production.
