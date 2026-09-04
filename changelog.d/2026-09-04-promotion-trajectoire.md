### L'onglet Trajectoire entre en comparaison au pixel (2026-09-04)

Les deux baselines de `fiche-trajectoire-onglet` (1440×1058, Chromium et
WebKit) sont commises, produites par le run 33922124300 sur la base `1d2fcb0f`.
Elles activent la comparaison au pixel ouverte, inerte, par #875.

Les deux panneaux qui gelaient la capture précédente sont résolus :
« Aucun dépôt à ce jour. Ce silence n'est pas une réponse » et « Aucune
exploration complémentaire n'est proposée par la table en vigueur pour ce
patient. » `attendreFicheTrajectoirePosee` fait ce qu'on lui demande, vérifié
dans l'environnement qui comparera et non seulement en local.

Aucune date qui dérive sur l'écran : « Aucun épisode confirmé pour l'instant »,
« non mesuré à cette date », et « aujourd'hui » pour seule mention temporelle —
un mot constant.

**Contrôle de non-régression du drapeau `=all`.** Les six baselines déjà
commises sont ressorties de ce run **identiques au bit près**. C'était
l'affirmation avancée dans #872 — `--update-snapshots=all` reste conditionné à
`compareBuffersOrStrings`, donc ne réécrit pas une image inchangée — et elle est
maintenant observée, non plus seulement lue dans le source.

**Correction d'une cause fausse écrite dans #875.** Le fragment de #875 attribue
l'écart de hauteur de cet écran (988 → 1058 px) au drapeau
`WN_CB_RESULTS_ENABLED` posé sur un poste de développement. C'est faux, et
l'image de ce run le montre : le drapeau est **absent des deux workflows** — la
baseline affiche bien « Second temps — à activer » — et la hauteur passe pourtant
à 1058. Entre les deux runs CI, le drapeau n'a pas varié ; ce qui a varié est
l'attente ajoutée par #875. **Les 70 px sont ceux du contenu résolu**, plus haut
que les lignes de chargement qu'il remplace.

Ce qui reste vrai de ce paragraphe : les blocs `env` de `verify` et
`visual-baselines` sont identiques ; un poste qui pose le drapeau rend
« Mesures consignées » et son formulaire à la place ; une capture locale ne peut
donc pas servir à juger ce que verra le CI.
