### Le cockpit s'ouvre au début de sa séquence, et dit la prochaine étape (2026-09-02)

Trois défauts d'orientation relevés par l'audit du cockpit (constat n° 2) :
la fiche s'initialisait sur « Décision 21 j » — la 4ᵉ des 7 étapes qu'elle
annonce ; la règle D5 de placement automatique ignorait le statut « à
ouvrir », si bien qu'un dossier avancé où seule la réévaluation restait due
atterrissait sur « Décision — renseignée » ; et aucun fil générique ne disait
la prochaine action hors de deux cas particuliers. Corrigé : l'état initial
est « Patient » (première étape), la recherche de phase due couvre
« en attente » puis « à ouvrir » (`phaseDue`, partagée avec D5, due-ness
au-dessus de la mémoire locale), et un bandeau « Prochaine étape : … »
apparaît dès qu'une phase est due et non affichée — muet quand rien n'est dû
(`DC-24` transposé) et quand un bandeau spécifique (corrections, protocole
bloqué) couvre déjà le cas. Le rail numérote ses sept étapes (« 1. Patient »
… « 7. Réévaluation »), distingue les quatre statuts par quatre icônes (« à
ouvrir » et « indéterminée » partageaient la même puce), et « en attente »
se dit désormais « en attente du patient » (Données fiables, Compréhension)
ou « à traiter » (les phases où c'est au praticien d'agir).
