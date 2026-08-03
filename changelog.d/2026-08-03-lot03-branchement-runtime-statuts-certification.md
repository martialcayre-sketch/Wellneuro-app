# Branchement runtime des statuts de certification (LOT-03) (2026-08-03)

Le rayon Bibliothèque expose désormais un statut de certification explicite pour chaque instrument (`certifie`, `ambigu`, `a_verifier`, `non_score`, `non_certifie`, `inconnu`) afin d'éviter les lectures implicites basées uniquement sur la présence d'un badge.

La route `GET /api/praticien/orientation` applique désormais un filtrage fail-closed des recommandations déterministes :

- un questionnaire recommandé est rejeté s'il est suspendu ou sans définition runtime ;
- un pack recommandé est rejeté si sa composition est inconnue, vide, ou contient un questionnaire non administrable.

Ce lot ne modifie ni le scoring clinique ni les arbitrages de statut ; il branche les statuts existants dans les surfaces runtime visées.
