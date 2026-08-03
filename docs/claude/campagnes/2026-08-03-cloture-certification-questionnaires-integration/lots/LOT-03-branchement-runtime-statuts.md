---
id: "LOT-03"
titre: "Branchement runtime des statuts de certification"
statut: "livré"
dépend_de: "LOT-01 + LOT-02"
---

# LOT-03 - Branchement runtime des statuts de certification

## Périmètre

- Introduire ou durcir la consommation des statuts de certification dans les surfaces WellNeuro pertinentes.
- Couvrir au minimum : catalogue, assignation, filtres d'affichage, suggestions déterministes et surfaces de restitution qui ne doivent pas faire croire qu'un questionnaire est administrable quand il ne l'est pas.
- Préserver la compatibilité des questionnaires déjà certifiés et actifs.

## Interdits

- Aucune ouverture implicite d'un instrument suspendu ou verrouillé.
- Aucun refactor large du catalogue ou des routes concernées.
- Aucun contournement par défaut permissif ; l'absence d'information doit rester bloquante.

## Tests et validations

- `cd web && npm run check`
- `cd web && npm run test:worktree -- --fast` si des surfaces UI ou API praticien/patient sont touchées.
- Tests ciblés sur les filtres, garde-fous d'assignation et états d'affichage.

## Réalisation

- Le rayon Bibliothèque expose désormais un statut de certification explicite
  (`certifie`, `ambigu`, `a_verifier`, `non_score`, `non_certifie`, `inconnu`)
  au lieu d'un affichage implicite « avec ou sans badge ».
- La route `GET /api/praticien/orientation` charge la composition active des
  packs et applique un filtre fail-closed :
- un questionnaire recommandé sans définition runtime, ou suspendu, est rejeté.
- un pack recommandé est rejeté si sa composition est inconnue, vide ou
  contient un questionnaire non administrable.
- Les tests de route couvrent explicitement le cas d'un pack filtré parce qu'il
  contient `Q_PED_03`.

## Résultat

- Les surfaces de suggestion déterministe ne peuvent plus promouvoir par erreur
  une cible non administrable.
- Le rayon n'induit plus de faux positif de certification par omission de badge.

## Done

- Les statuts de certification pilotent un comportement runtime observable.
- Un questionnaire bloqué n'apparaît plus comme assignable ou recommandable par erreur.
- Les cas `certifié`, `suspendu`, `contenu_verrouille` et assimilés sont couverts par tests.

## Points de vigilance

- Ce lot ne doit pas réinterpréter la clinique ; il branche un statut déjà arbitré.
