### Objectif négocié — les trois champs arrivent remplis, et le message cesse de mentir

Devant un dossier réel portant une synthèse validée et un dépôt du matin, les
trois zones de « Poser un objectif négocié » étaient vides. Rien n'était cassé :
aucune n'avait jamais été alimentée.

**L'énoncé et la reformulation arrivent par citation**, sans qu'aucun appel n'ait
lieu — le dépôt patient verbatim, et le `narratif_patient` d'une synthèse
validée. **La priorité arrive sur un geste** : un bouton « Proposer une
priorité », puis « Une autre ».

**La marque tombe au premier caractère modifié**, pas à l'enregistrement. Tant
que le champ contient exactement le texte proposé, la mention s'affiche ; dès
qu'il est retouché, elle disparaît et le texte redevient celui du praticien.

**Le pré-remplissage n'écrase jamais une saisie.** Il ne pose un texte que dans
un champ vide — y compris quand le praticien a commencé à écrire pendant que la
lecture était en vol.

**« Aucune proposition vivante » cesse de mentir.** L'écran affichait « sans
épisode confirmé, il n'a rien de signé à citer » **dès que la liste était vide**,
y compris sur un dossier dont l'épisode ÉTAIT confirmé : il énonçait une cause
qu'il n'avait pas vérifiée. Le serveur lit désormais les deux préconditions de
l'assemblage et dit laquelle manque ; l'écran a trois phrases, et une quatrième
qui n'affirme rien quand la cause n'est pas connue.

**Un banc défendait la phrase fausse.** Il exigeait « sans épisode confirmé » sur
une réponse qui ne disait rien de l'épisode — il aurait résisté à la correction.
Réécrit sur son intention, avec trois cas qui s'excluent.

**Une mutation a montré qu'un banc neuf ne prouvait pas ce qu'il annonçait.**
« Le pré-remplissage n'écrase pas une saisie » tapait APRÈS l'arrivée de la
matière : il passait même avec un écrasement inconditionnel, l'effet ne se
rejouant pas sur une frappe. Réécrit pour taper pendant que la lecture est en
vol — la mutation mord désormais.

**`D-167` §13 est appliquée en partie, et le reste est consigné.** La clause dit
qu'une réécriture « repart des sources ». Appliquée à la lettre, elle recréerait
un défaut que le code garde déjà : reprendre les champs praticien évite que
`priorite` et « non traité » retombent à vide sur la nouvelle tête. Et « non
traité » n'a **aucune source** (§7) — « repartir des sources » ne peut pas le
remplir, seulement le perdre. La cadence de `D-166` garantit par ailleurs qu'aucune
matière nouvelle n'arrive dans un même cycle : rafraîchir remplacerait alors la
reformulation travaillée par le narratif brut, sans rien gagner.

Ce qui reste à trancher, écrit dans le code : rafraîchir les deux citations quand
les sources sont **plus récentes** que la version amendée. Les colonnes de
provenance du 2026-09-10 le rendent calculable — c'est un lot à part.
