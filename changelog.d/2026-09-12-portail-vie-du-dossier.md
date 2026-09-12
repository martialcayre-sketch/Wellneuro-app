### La vie du portail patient cesse d'être devinée en local (2026-09-12)

Le portail disait « Depuis votre dernière visite » — et il le devinait. Un
instantané `localStorage` comparé au suivant puis écrasé : il ne voyait **que les
assignations**, ne suivait pas la personne d'un appareil à l'autre, et était vide
à la première visite par construction. Changer de navigateur, c'était tout revoir
en neuf ou ne rien voir.

**« Ce qui s'est passé dans votre dossier » le remplace, et vient du serveur.**
Ce que le patient a transmis, ce qui lui a été remis, ce qu'il a dit sur son
objectif — daté, dans l'ordre, identique sur son téléphone et sur son ordinateur.

**Le journal se DÉRIVE, il ne se stocke pas.** La vie du dossier est déjà en
base ; un journal recopié divergerait de ce qu'il prétend refléter, et personne
ne saurait lequel des deux croire.

**Y entrent les gestes du praticien QUI REMETTENT quelque chose** — synthèse
publiée, bilan transmis, questionnaire proposé, objectif reformulé. Pas les
gestes internes : la ligne de partage est le **destinataire** du geste, pas sa
nature. Le patient voit ce qui lui arrive, jamais ce qu'on fait de lui.

**L'entrée dans l'accompagnement est la première ligne**, si bien que le journal
n'est jamais vide — et qu'il n'y a eu aucun état vide à écrire, aucune phrase
d'accueil à inventer.

**Replié par défaut, déplié s'il y a du neuf.** Replié, il ne concurrence pas
« votre étape du moment » : le principe A6-R1 tient, et l'écart E11 de l'audit
5.0 ne se rouvre pas. C'est le seul point de la campagne qui demande une
écriture — un repère de fraîcheur dont la **clé primaire rend le décompte
d'assiduité impossible**, et non seulement interdit. Ce qui n'est pas conservé ne
se compte pas.

**Le journal ne lève aucun drapeau de surface** : une surface fermée par son
propre drapeau ne produit aucune ligne, même le journal allumé. Il ne peut pas
devenir la porte dérobée par laquelle une synthèse de compréhension atteint un
patient dont l'écran est clos.

**Deux écrans qui existaient ont enfin une porte** : « Ce qui compte pour moi »
et « Ce que j'ai compris de vous » se voient depuis l'accueil, sans dépliage
préalable.

**Le rappel de l'agenda alimentaire, lui, existait déjà** — le cadrage l'avait
annoncé manquant sans l'avoir cherché. Une absence se constate, elle ne se
suppose pas.

Doctrine [[D-172]]. Drapeau `WN_PORTAIL_JOURNAL`, **éteint** : le code est livré,
son activation se demande.
