### J3-12h, lot 2 : la liste de chaque courrier complément et la trace de sa remise, migration seule (D-345) (2026-10-24)

- Deux tables neuves, en ajout seul. `courriers_complement_listes` retient,
  à la consignation d'un courrier au médecin, la liste des compléments ciblés
  pour laquelle il est écrit. `courriers_complement_remises` garde la trace
  qu'il a été remis au patient, dans son portail, par un clic « Valider pour
  diffusion » : texte recopié avec son empreinte, liste couverte et son
  empreinte, date posée par la base.
- La base recalcule la liste des compléments ciblés depuis le protocole
  approuvé (contrat V4 seul), et n'accepte une remise que si cette liste est
  aussi celle du courrier : un courrier écrit pour le magnésium ne couvre pas
  un fer ajouté ensuite (contre-revue du 2026-10-24, table retenue par le
  responsable). Un complément est désigné par son action, l'empreinte de son
  intitulé et celle de son ingrédient catalogue (arbitrage du 2026-10-23) :
  le renommer ou changer d'ingrédient demande un courrier neuf ; retoucher une
  dose ou une durée, non.
- Un courrier se remet une fois ; un clic rejoué ne remet rien. Seul un
  courrier sortant de ce dossier, préparé par le futur générateur du courrier
  complément, peut porter une liste et être remis.
- L'espèce de lecture `courrier_complement` est admise au portail, pour que le
  lot 3 n'exige pas de migration. L'effacement nommé du dossier supprime
  remises et listes. La catégorie est déclarée au registre RGPD (rubrique 5)
  avant toute écriture.
- Rien ne change à l'écran : aucun code n'écrit ni ne lit ces tables avant le
  lot 3 (courrier, remise au clic et refus, sous drapeau éteint), qui ne partira
  qu'après l'application constatée en production.
