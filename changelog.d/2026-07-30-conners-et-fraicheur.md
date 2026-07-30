### Le Conners enseignant passe le banc ; le Conners parent y échoue

Ces deux instruments étaient **les deux seuls du catalogue à n'avoir jamais été
comparés à leur source** : leur passage coûte des appels de modèle, et il attendait
un go explicite. Il a eu lieu le 2026-07-30, et il les sépare.

**`Q_PED_02` (Conners enseignant) est propre** : 28 items lus des deux côtés, zéro
divergence critique, zéro majeure, 27 écarts mineurs de libellé. Il monte à
`scoring_verifie` et redevient assignable — **54 sur 64**.

Sa fermeture posait deux conditions de réouverture, et l'une n'est pas remplie :
« licence obtenue » ne l'est pas. Le praticien-propriétaire a **déclaré** l'usage
couvert, la réserve « © MHS » restant au dossier. C'est ici que l'écart entre
déclarer et obtenir est le plus large de toute la campagne — MHS vend cet
instrument — et il est assumé, pas effacé. La réserve **scientifique**, elle, est
traitée : le seuil de 15 désavoué en 1985 par le laboratoire de l'auteur porte sur
un usage que WellNeuro ne fait pas, puisque le servi ne rend aucun seuil de ce type
mais quatre sous-scores.

**`Q_PED_03` (Conners parent) reste fermé**, pour un motif de contenu et non de
droits : la lecture de sa source y trouve **110 items là où l'application en sert
108**. Deux items manquants ne sont pas un défaut de scoring, c'est un autre
instrument — précédent du MFI-20 et de la méthode Monnier. S'y ajoute que la lecture
croisée a **échoué deux fois** (sortie tronquée sur le plus gros questionnaire du
catalogue) : rien n'y est confirmé par deux lectures indépendantes. Les relances
payantes ont été arrêtées à deux essais, conformément à la règle du dépôt.

### La fraîcheur d'un verdict est désormais vérifiée

Un verdict de banc certifie un scoring **à un instant donné**, et rien ne le reliait
au code qu'il certifie. Le 2026-07-30, deux instruments étaient certifiés sur un
verdict antérieur à la réécriture de leur propre grille — le QDRS a vu ses cinq
bandes réalignées le matin et portait encore le verdict de la veille. Un verdict
périmé se lit exactement comme un verdict frais.

`verifierRegistreInstruments` refuse maintenant un `verdictScoring.date` antérieur à
la dernière `revision.date` de la même entrée. Les 54 verdicts du registre sont
re-datés du 2026-07-30 : le banc y est réellement repassé ce jour-là, **hors ligne**
et sur les 64 instruments. Preuve par mutation : reculer la date d'un verdict d'un
jour fait rougir le CI avec le nom de l'instrument et le geste à faire.
