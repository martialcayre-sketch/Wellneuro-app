### Les baselines attendent un état posé, et cadrent au plus juste (2026-09-04)

Deux défauts trouvés **en regardant les images produites**, pas en relisant le
code — la relecture des trois campagnes précédentes ne les avait pas vus.

**Le tiroir des 12 besoins photographiait un rail non résolu.** Son test cliquait
aussitôt après le `goto` : derrière le tiroir, le rail affichait encore
« indéterminée » en phase 7, quand la baseline du cockpit — qui, elle, attend —
affiche « à ouvrir ». `FichePatientPanel` rend ce statut tant que `etatRuntime`
n'est pas posé, jamais comme affirmation par défaut. La baseline était donc
reproductible par chance, pas par construction.

Les deux tests partagent maintenant `attendreRailPose`, qui attend la
disparition de « indéterminée » dans le rail. **C'est une attente qui attend
vraiment** : le marqueur est présent au premier rendu et disparaît à la
résolution. La lecture négative précédente — `toHaveCount(0)` sur « Chargement
de la proposition… » — passait aussitôt, ce texte n'existant pas encore au
moment du clic.

Au passage, le commentaire du spec affirmait qu'« indéterminée » était un état
stable. Les deux images le démentent ; il est corrigé.

**La fenêtre du cockpit passe de 2200 à 1700 px.** À 2200, l'image portait
~850 px de vide. Ce n'est pas qu'inélégant : `maxDiffPixelRatio: 0.02` est un
ratio, et des pixels vides qui ne diffèrent jamais gonflent le dénominateur —
ils achètent de la tolérance à un changement réel ailleurs. 1700 garde tout le
contenu (mesuré à ~1460 px) avec la marge nécessaire pour qu'il grandisse sans
être coupé, une baseline tronquée étant pire qu'absente.
