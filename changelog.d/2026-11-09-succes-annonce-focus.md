### Portail : quand un envoi fait disparaître le formulaire, le succès s'annonce et le focus le suit (2026-11-09)

Audit d'interface du 2026-11-07 (constat n° 8, WCAG 4.1.3 et 2.4.3). Quatre écrans remplacent leur formulaire par un accusé : la redemande de lien, « Ce qui compte pour moi », la demande de correction des réponses et « Signaler un problème ». Le bouton qui avait le focus disparaissait, le focus retombait sur la page, et aucune région n'annonçait le message : avec un lecteur d'écran, l'envoi semblait sans suite. Pour un effet indésirable déclaré, ce message porte pourtant la réponse d'orientation.

Correctif : un composant `PatientRegionAccuse` porte une région `status` présente dès le premier rendu, sur le modèle de `DepotDocuments`, et y pose le focus quand le message paraît. Le focus ne bouge pas au chargement : la demande de correction peut déjà être transmise à l'ouverture de l'écran. `CeQuiCompteForm` et `SignalerProbleme` se scindent, parce que leurs retours anticipés ne laissaient aucune place à une région permanente. Aucun texte ne change, et l'apparence au repos non plus.

Démontré dans le code, sans occurrence observée (`D-125`).
