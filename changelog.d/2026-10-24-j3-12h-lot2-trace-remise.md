### J3-12h, lot 2 : la trace de remise du courrier complément, migration seule (D-345) (2026-10-24)

- Une table neuve, `courriers_complement_remises`, garde la trace qu'un
  courrier au médecin a été remis au patient, dans son portail, par un clic
  « Valider pour diffusion ». Elle est en ajout seul : texte du courrier
  recopié avec son empreinte, liste des compléments ciblés couverts et son
  empreinte, date posée par la base.
- La base recalcule elle-même la liste des compléments ciblés depuis le
  protocole approuvé, et refuse toute autre liste. Un complément est désigné
  par son action, l'empreinte de son intitulé et celle de son ingrédient
  catalogue (arbitrage du responsable du 2026-10-23) : le renommer ou changer
  d'ingrédient demande un courrier neuf ; retoucher une dose ou une durée, non.
- Un courrier ne couvre qu'une liste. Un clic rejoué ne remet rien. Seul un
  courrier sortant de ce dossier, préparé par le futur générateur du courrier
  complément, peut être remis.
- L'espèce de lecture `courrier_complement` est admise au portail, pour que le
  lot 3 n'exige pas de migration. L'effacement nommé du dossier supprime ces
  remises. La catégorie est déclarée au registre RGPD (rubrique 5) avant toute
  écriture.
- Rien ne change à l'écran : aucun code n'écrit ni ne lit cette table avant le
  lot 3 (courrier, remise au clic et refus, sous drapeau éteint), qui ne partira
  qu'après l'application constatée en production.
