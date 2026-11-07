### Signalement d'un effet indésirable : la remise à zéro n'oublie plus trois champs (2026-11-07)

Audit d'interface du 2026-11-07 (constat n° 2). Dans `SignalerProbleme`, `reinitialiser` laissait en place le rattachement au programme déclaré et les deux dates (« Depuis quand le prenez-vous ? », « Depuis quand ressentez-vous ces symptômes ? »). Après « Faire un autre signalement », ou « Annuler » puis réouverture, le nouveau signalement repartait avec les réponses du précédent, envoyées comme si le patient les avait données. C'est le défaut que le choix « je ne sais pas » par défaut ([[D-101]], `DC-24`) devait justement éviter.

Correctif : les trois champs reviennent à leur valeur initiale (`ne_sait_pas`, vide, vide). Deux tests couvrent les deux chemins. Rouges sans le correctif, ils sont verts avec.

Démontré dans le code, sans occurrence observée en production (`D-125`).
