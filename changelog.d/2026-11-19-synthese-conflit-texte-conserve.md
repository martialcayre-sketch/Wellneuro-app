### Synthèse : texte gardé sur un conflit, faux conflit sur l'e-mail, succès sur une synthèse fermée (file D, 2026-11-19)

Trois défauts de l'écran des synthèses, en un seul lot (arbitrage
`20261118-2307-d`, qui fond `synthese-succes-synthese-ouverte` dans
`synthese-conflit-texte-conserve`). Relevés par `wn-reviewer` (P3-1 et P2-1
de #2235) et `ui-ux-pro-max`. Démontrés dans le code, sans occurrence
observée.

- **Le texte qu'un 409 remplace reste consultable.** Sur un 409
  `synthese_modifiee`, l'écran affiche la synthèse telle qu'elle est
  enregistrée. Le texte non enregistré, jusqu'à 12 000 caractères pour le
  texte patient, disparaissait sans recours. Il est désormais gardé sous le
  message, en copie en lecture seule et sélectionnable, champ par champ. Ne
  sont copiés que les champs que le praticien a changés et que la version
  relue ne porte pas. Un champ changé seulement par l'autre onglet n'y figure
  pas : le recopier déferait cette modification. Cela vaut pour le texte de
  l'éditeur et pour la note, quel que soit le geste refusé.
  - La copie survit au geste suivant, qui efface le message. Un second
    conflit la complète : un champ copié de nouveau prend son dernier texte.
  - Elle se retire par « Fermer la copie » ou par un changement de patient.
  - Elle ne paraît que dans le détail de sa synthèse, ou sous le choix du
    patient si celle-ci a disparu. Elle n'est jamais enregistrée.
- **Un changement d'e-mail du patient ne périme plus ses synthèses.** La
  route des patients réécrivait la copie de l'adresse dans `syntheses_ia` par
  l'`updateMany` de Prisma, qui réécrit d'office `updatedAt`. Or `updatedAt`
  est la version optimiste des synthèses : un écran ouvert prenait un faux
  409. La copie de l'adresse se réécrit désormais par une requête SQL
  paramétrée qui ne touche que `email_patient`. Elle garde le même filtre et
  la même transaction. Ni schéma, ni migration.
  - Le livret relisait seulement `updatedAt` sous son verrou, et cette
    relecture arrêtait jusqu'ici un envoi lu avant un changement d'adresse.
    Il relit désormais aussi l'adresse : un livret lu avant un changement
    d'adresse commité entre-temps répond 409 et ne part pas vers l'ancienne
    adresse (P2-1 de `wn-reviewer` sur ce lot, constaté sur base réelle).
- **Un succès ne réinstalle plus une synthèse qui n'est plus ouverte.**
  « Enregistrer » et « Vider » réinstallaient la synthèse du clic, même si
  elle avait été fermée ou remplacée par une autre entre-temps, y compris
  celle d'un autre patient. Les gestes suivants partaient alors avec son
  identifiant et sa version. « Valider », « Rejeter » et « Annoter » fermaient
  une autre synthèse ouverte entre-temps. Les trois succès ne touchent
  désormais le détail que si la synthèse du geste est encore celle qui est
  ouverte : c'est la garde de `zoneDuDetail`.
