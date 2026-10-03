### Adressages sur signal d'alerte : l'écran des signaux adressés (`D-257`, LOT-04b) (2026-10-03)

Levée ouverte (`WN_LEVEE_ADRESSAGE`, toujours éteint), le cockpit affiche un bloc
« Signaux adressés au médecin » : chaque signal couvert reste lu, avec **toutes**
les lettres qui le couvrent (« Adressage engagé le … ») et, par lettre, une
révocation motivée (`POST /api/praticien/adressage/revocation`), suivie du
rechargement de la chaîne. « Ce qui suspend la décision » ne porte plus que les
signaux ouverts. La mention de la lettre d'adressage dit l'état réel : levée
ouverte, consigner « vaut adressage pour les signaux qu'elle nomme » ; fermée,
la mention d'avant reste. Drapeau éteint, l'écran est inchangé.
