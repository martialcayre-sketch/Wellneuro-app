# Arbitrage Q_GEO_04 — maintien du verrou `contenu_verrouille`

Date d'arbitrage : 2026-08-03.

## Décision

`Q_GEO_04` reste en `contenu_verrouille`.

Le lot ne lève ni les bandes d'interprétation, ni le plafond de certification,
ni la fermeture d'assignation. Il formalise seulement que le contrat runtime
actuel est volontaire et déjà cohérent avec l'état du registre.

## Ce qui est établi

- Les **30 items** et les **6 dimensions** du MMSE servi sont documentés et
  couverts par le banc ; le registre porte `divergencesCritiques: 0` sur ce
  périmètre.
- La **surface praticien** est ouverte : `Q_GEO_04` est présent dans
  `PASSATION_PRATICIEN`, et l'aperçu vierge continue de servir la grille au
  praticien pour l'administration en consultation.
- La **route d'assignation** reste fermée : l'entrée catalogue est `actif: false`.

## Ce qui n'est pas établi

- Les quatre bandes `27-30`, `21-26`, `10-20`, `0-9` n'ont pas été comparées à
  une source probante dans ce dépôt.
- L'attribution « HAS 2011 » n'a pas été vérifiée sur pièce.
- Le banc ne peut pas transformer une liste de seuils vide en validation de ces
  bandes : son silence serait ici une vacuité, pas une preuve.

## Conséquence

- Le scoring global `/30` et les dimensions restent servis tels quels.
- Les bandes d'interprétation restent **non promues** : elles demeurent un
  apport externe non vérifié, suffisant pour maintenir le barreau
  `contenu_verrouille`.
- L'ouverture en consultation ne vaut pas réouverture clinique complète : elle
  maintient un usage praticien borné, sans auto-administration patient.

## Contrat runtime retenu

- **Registre** : `contenu_verrouille`
- **Catalogue** : `actif: false`
- **Bibliothèque praticien** : `PASSATION_PRATICIEN`
- **Aperçu praticien** : autorisé
- **Assignation patient** : refusée

## Ce que le lot ne fait pas

- Il n'invente aucune source manquante.
- Il ne remplace pas les bandes actuelles par d'autres bandes.
- Il ne rouvre pas l'instrument à l'assignation.
- Il ne modifie aucun autre questionnaire.

## Condition de sortie future

La sortie de `contenu_verrouille` exigera une pièce source vérifiable pour les
bandes, ou une décision explicite de les retirer/remplacer avec trace clinique
et validations adaptées.
