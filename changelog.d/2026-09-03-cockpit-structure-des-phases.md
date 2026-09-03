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

La contre-revue `wn-reviewer` a bloqué la première écriture sur trois
points, tous corrigés avant merge : le résumé restituait la tendance du
momentum sans mention de nature ni déclaration au garde D-106 — il ne la
restitue plus du tout (l'onglet Trajectoire le fait déjà, sous garde) ; les
panneaux de biologie (note d'arbitrage, destinataire de courrier) passaient
en montage conditionnel et perdaient une saisie en cours à chaque bascule —
ils restent montés, masqués par `hidden`, et le verrou « déjà consigné » du
courrier ne se réarme plus ; la bannière de discordance d'ordre des cycles
(DC-30) disparaissait avec le panneau remplacé — elle est rendue dans le
résumé, mot pour mot. S'y ajoutent : les états vides d'Historique/Diffusion
n'affirment « aucune version » qu'après une lecture aboutie, la sous-vue
Biologie a un état vide pour l'état nominal de production, entrer dans la
phase Actions ramène à la sous-vue Protocole (les boutons « Ajuster » et
« Ouvrir la phase Actions » retrouvent ce qu'ils promettent), cibles
tactiles ≥ 44 px, focus déplacé sur l'onglet ouvert, « mesuré » sans
couleur de valence, et la fixture de trajectoire des bancs remise au
contrat réel (`ancre`/`dateAncre` — elle portait encore `dateT0`).
