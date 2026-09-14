### Protocole 21 jours — la décision revient sous les yeux, et plus rien ne se pose en silence (2026-09-15)

Le constructeur recevait la carte de décision et n'en lisait que **deux booléens** :
« une priorité est-elle retenue ? », « la décision est-elle bloquée ? ». Ni le
libellé de l'axe retenu, ni son statut, ni ses limitations n'apparaissaient — le
praticien composait trois plans **en aveugle sur la priorité qu'il venait de
choisir**, dont le résumé vit dans la phase précédente. La carte se monte désormais
une seconde fois à côté du formulaire, sous un titre distinct.

**Deux champs se posaient tout seuls.** Le **type** d'une action valait `'food'` en
dur : une orientation vers le médecin traitant ou une exploration biologique
enregistrée sans toucher au sélecteur était persistée, hachée et servie au patient
comme « **Alimentation** ». La **charge** valait « Léger » sans que personne l'ait
déclarée, sur un champ dont la ligne de rappel dit pourtant « saisie manuelle, aucun
calcul automatique ». Les deux s'ouvrent maintenant sans valeur, l'écran le montre,
et l'enregistrement refuse en **nommant l'action** qui attend son type (`DC-24` :
aucun statut favorable par défaut).

**Le refus se voyait mal et disparaissait trop tôt.** Il partageait son état avec les
accusés de relecture, que la moindre frappe efface : le motif s'évanouissait au
premier caractère tapé, avant toute correction, sans qu'aucun champ soit marqué. Il a
désormais son propre état, `role="alert"`, la couleur de danger, et pose
`aria-invalid` sur les champs fautifs.

**Et le parcours nominal a enfin un banc.** Aucun spec ne contenait « Ajouter une
action » ni « Enregistrer la version » : tout ce qui écrivait un protocole postait
directement à la route. Le nouveau parcours joue la chaîne à l'écran — confirmation
T0, sélection de priorité, refus d'un type manquant, puis enregistrement.
