### Un recueil clos tenait « votre étape du moment » — sous un bouton que personne n'avait écrit

Vu en production le 2026-09-12 sur un dossier réel : un agenda alimentaire dont
la fenêtre de 21 jours s'était refermée **cinq semaines plus tôt**, une seule
journée notée, occupait encore la seule chose que le portail met en avant —
« Consulter « Agenda alimentaire — 21 jours » ». Le patient n'avait pourtant
aucune nouvelle assignation, et l'écran de l'agenda lui disait déjà : « Votre
période de recueil de 21 jours est écoulée. »

**Le libellé n'existait nulle part.** `rappelPortail` décrit cet état par
`cta: null` et `prioritaire: false`, délibérément : aucune route de clôture
alimentaire n'existe, et `D-015` interdit de nommer un geste que le patient ne
peut pas poser. Mais `affichage` classait l'agenda en `a_completer` **quel que
soit son état**, et son `action: rappel.cta ?? 'Consulter'` refabriquait le
bouton par l'autre bout de l'écran. L'item comptait alors dans « N
questionnaires à compléter », et — n'étant candidat d'aucun agenda prioritaire —
se faisait rattraper par le repli « premier à compléter » de
`calculerActionRecommandee`, qui en faisait l'étape du moment. Sans route de
clôture, **aucun geste du patient ne l'en faisait sortir** : l'écran était figé
pour toujours.

Le recueil clos quitte donc « À compléter » pour un groupe à lui, **« Recueil
terminé »**, replié comme les autres sections secondaires. Ni `transmis` —
aucune passation n'est partie chez le praticien — ni `expire`, qui dit une date
limite dépassée. « Consulter » y reste offert, en retrait : relire ses journées
est un geste POSSIBLE, c'est celui de clôture qui manque.

**La condition porte sur `cta === null`, pas sur le seul état** : le jour où la
clôture alimentaire existera, `rappelPortail` rendra un vrai CTA et l'item
reviendra de lui-même parmi les tâches, sans qu'on ait à y repenser.

Rien d'autre ne bouge, et les gardes le disent : un recueil EN COURS reste une
tâche même la journée du jour notée (demain il y en aura une autre) ; un agenda
jamais commencé aussi — il porte lui aussi `jourCourant: null`, mais sa fenêtre
n'est pas close, elle n'est pas encore ancrée, et confondre les deux est
exactement la faute que le garde attrape ; l'état praticien prime toujours ; et
l'agenda du SOMMEIL n'est pas touché, sa fin de fenêtre portant un vrai geste de
transmission.

**Une conséquence latente, nommée plutôt que tue** : `questionnairesTransmis`
est vrai dès que plus rien n'est « à compléter ». Un patient dont le SEUL reste
serait un recueil clos verrait donc désormais la frise avancer à « Vos éléments
ont été transmis », d'un recueil qui, lui, ne l'a pas été. Relevé sur la
production : cinq dossiers portent un agenda ouvert, deux ont la fenêtre close,
et **les deux ont d'autres tâches** — le cas n'existe pour personne aujourd'hui.
L'alternative serait de laisser ces patients épinglés à l'étape 4 sans terme,
ce que ce lot corrige précisément. À trancher par le lot de la clôture
alimentaire.
