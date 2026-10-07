### Agenda du sommeil — une nuit qu'on peut noter jusqu'au bout (2026-10-07)

Retours patients : il était souvent impossible de valider sa nuit en fin de
formulaire. La cause était dans le formulaire : les horaires proposés en
pointillé ne valent rien tant qu'on ne les a pas touchés, la consigne disait
« faites glisser » alors qu'un appui suffit, et le bouton « C'est noté »
restait **grisé sans explication** — le message « Il manque un geste » vivait
dans le gestionnaire de clic, qu'un bouton désactivé ne déclenche jamais.
Campagne `2026-10-07-agenda-sommeil-adhesion`, LOT-01 ; synthèse de la revue
adverse versée au dossier de campagne.

- **Le bouton reste actif.** Un envoi incomplet nomme ce qui manque, entoure
  les questions concernées et ramène le focus sur la première ; la liste se
  raccourcit à chaque geste. Rien ne part tant qu'une réponse obligatoire
  manque : la règle de la v2 est intacte, seul son retour au patient change.
- **« Confirmer ces horaires »** confirme en un geste les deux seules ancres
  suggérées (extinction et lever), heures écrites sur le bouton, et seulement
  quand elles viennent des nuits du patient. Le garde-fou anti-recopie garde sa
  lettre : un geste explicite par nuit, aucune autre réponse reprise.
- **L'ordre des repères est vérifié avant l'envoi**, par la fonction de
  validation du serveur elle-même ; le refus s'affiche sous le cadran, qui est
  entouré et reçoit le focus. Le refus du serveur s'affiche sous le bouton et
  non plus en tête de page, hors champ sur téléphone.
- **Libellés** : « Vite » devient « En moins de 15 min » (même classe) ; le
  coucher et le lever se posent « par rapport à votre coucher / réveil » avec
  « Au même moment / Plus tard », sans seuil ajouté ; les ancres de l'échelle de
  qualité et de forme sont écrites (mots inchangés) ; la portée de l'aide pour
  dormir est affichée ; « Noter la nuit d'hier » remplace « Corriger » pour une
  nuit encore absente.
- **Les refus de la route portail du sommeil sont journalisés**, comme ceux de
  l'agenda alimentaire, sans aucune réponse de santé : ils deviennent
  comptables.

Aucun changement de contrat (`agenda-sommeil-v3`), de classe, de seuil, de
fenêtre ni de barème ; aucune migration. **Comparabilité** : trois stimulus
changent sans changer les valeurs enregistrées — les questions de coucher et
de lever (« au même moment / plus tard »), la tuile de latence la plus courte
(« En moins de 15 min », classe `lt15` inchangée) et les ancres écrites de
l'échelle de qualité. Une dérive de leurs distributions après ce lot se lira
d'abord comme un effet de libellé, pas comme un changement de sommeil.
