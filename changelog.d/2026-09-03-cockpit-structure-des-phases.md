### Les phases denses se structurent : sous-vues, résumé, hauteur contenue (2026-09-03)

Dernier lot de l'audit du cockpit — les deux constats bloquants de hauteur.
La phase Actions regroupe ses sept panneaux en quatre sous-vues (Protocole,
Historique, Diffusion, Biologie) : le constructeur de protocole et la
boussole alimentaire restent montés en permanence (leur état — brouillon,
aliment sélectionné — vit chez eux, la bascule est un `hidden`), les autres
se montent à la demande, pilotés par leurs props. La phase Compréhension se
scinde en deux sous-vues (Objectif négocié / Ce que j'ai compris), par
`hidden` uniquement : les deux panneaux montent une fois à l'entrée de phase
— leurs GET journalisent l'accès au dossier (G-TRUST-04), les démonter à
chaque bascule gonflerait le journal. La phase Réévaluation cesse de
remonter TrajectoirePanel en entier une deuxième fois : un résumé du dernier
cycle (ancre, jalons mesurés ou « non mesuré » — jamais zéro, DC-24,
momentum tel quel) renvoie vers l'onglet Trajectoire pour le détail. Et
l'onglet Trajectoire — la plus longue page du produit, sans plafond ni
défilement interne — adopte le patron de hauteur contenue du Poste de
pilotage (A6-R1 : on navigue, on ne défile pas la page).
