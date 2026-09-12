### Quatre décisions cliniques confirmées redeviennent lisibles (2026-09-12)

La fiche affichait **« Décision clinique non préparée »** sur des dossiers dont
le `T0` était confirmé, signé et intact en base. Lecture par conteneur du
2026-09-12 : **quatre des sept épisodes confirmés en production** n'étaient plus
servis. Les trois qui l'étaient encore avaient été confirmés le jour même.

**La carte de décision n'est pas stockée : elle est rejouée** depuis l'épisode
signé. Et le rejeu exigeait que le dossier n'ait pas bougé d'un octet — il
comparait les réponses candidates, la fenêtre et son découpage, tous recalculés
sur l'état du jour.

**Deux causes, aucune n'étant une erreur d'écriture.** Une passation de plus, et
le dossier ne coïncidait plus avec lui-même : un patient qui répondait à un
questionnaire éteignait le `T0` de son propre dossier. Et le 2026-09-08, la
borne haute de l'ancre initiale est tombée ([[D-156]]) : les épisodes signés
avant ne pouvaient plus coïncider avec une proposition qui compose autrement.
Le déploiement d'une règle de composition avait éteint rétroactivement les actes
antérieurs.

**Un acte se rejoue désormais sur son identité** — même épisode, même patient,
même jalon, même date de référence, même fenêtre nominale — et non sur l'état
courant du dossier. Ce qui fait toujours tomber le rejeu : un blob qui ne se
recoupe pas avec son empreinte, et une réponse CITÉE par l'épisode devenue
illisible. Ce qui ne le fait plus tomber : une réponse de plus.

**Le décalage se dit sous la carte** — « 6 réponses sont arrivées depuis la
confirmation de l'épisode : elles n'entrent pas dans cette décision. » Un instant
confirmé est muet sur ce qui le suit ; c'était le silence qu'il fallait corriger,
pas l'instant.

**L'identité d'une carte ne dérive plus de son contenu.** Elle valait
`<jalon>-<empreinte des réponses>` — elle se déplaçait donc à chaque passation,
alors que sélection de priorité, brouillons de protocole et check-ins retrouvent
leur carte par elle. Elle dérive maintenant de l'identifiant de l'épisode, stable
par construction. Aucune reprise de données : rien en production n'était accroché
à un identifiant de carte runtime.

**Le banc anti-régression porte un payload signé sous l'ancienne règle
d'inclusion** : la prochaine décision de composition fera rougir le CI au lieu
d'éteindre la production.

Doctrine [[D-173]]. Aucune précondition de confirmation n'est touchée.
