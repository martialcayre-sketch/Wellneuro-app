### Agenda du sommeil : les boutons de réponse sont reliés à leur question (2026-11-09)

Audit d'interface du 2026-11-07 (constat n° 12, WCAG 1.3.1). Dans `SaisieNuitForm`, le texte de la question était un simple paragraphe posé au-dessus des boutons : un lecteur d'écran qui arrivait sur « Très bonne » ou « Stress » pouvait les annoncer sans la question.

Correctif : chaque ensemble de boutons devient un groupe nommé par sa question (`role="group"` et `aria-labelledby`), sur le modèle de `SaisieJourneeForm`. Sont couverts les tuiles, les échelles à emoji, le compteur de réveils et « La veille au soir ». Rien ne change à l'écran ni dans les réponses envoyées.

Démontré dans le code, sans occurrence observée (`D-125`).
