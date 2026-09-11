### Objectif négocié — une réécriture SIGNALE les sources plus récentes, elle ne remplace rien

`D-167` §13 disait qu'une réécriture « repart des sources ». Appliquée à la
lettre, elle recréait un défaut que le code gardait déjà : reprendre les champs
praticien évite que `priorite` et « non traité » retombent à vide sur la nouvelle
tête. Et « non traité » n'a **aucune source** (§7) — on ne pouvait que le perdre.

La clause est désormais tenue autrement : **l'écart est signalé, la reprise est
un geste.** « Le patient a déposé un texte plus récent que celui cité par cette
version », avec un bouton pour le reprendre. Rien ne disparaît sous les doigts du
praticien, et les champs sans source ne retombent jamais à vide.

**Trois états, et le troisième décide de tout.** Une provenance nulle ne dit pas
« identique », elle dit **inconnue** — et rien n'est proposé. Les objectifs
écrits avant que la provenance ne soit constatée portent des colonnes NULL : les
déclarer à jour affirmerait un fait qu'on n'a pas, les déclarer périmés
proposerait de remplacer sans savoir par quoi (`DC-24`). Une version introuvable
ne sert aucune fraîcheur, pour le même motif.

**La comparaison vit au serveur.** L'identifiant de la version amendée voyage
avec la demande, plutôt que ses colonnes de provenance jusqu'au navigateur :
élargir la surface de l'API des objectifs pour une comparaison que le serveur
fait mieux — il a déjà les deux sources en main — aurait été le mauvais échange.

Une mutation le vérifie : supprimer le cas `inconnue` fait rougir.
