### Bibliothèque — suppression de 27 copies module mortes et divergentes (2026-07-24)

Vingt-sept questionnaires du catalogue (`Q_STR_01`, `Q_SOM_02`, `Q_STR_04`,
`Q_GAS_02`…) existaient en **double définition** : celle servie, inline dans
`questions.ts`, et une copie homonyme sous `src/lib/questionnaires/*.ts` jamais
utilisée (masquée par la clé inline du catalogue). Les copies module avaient
**divergé sémantiquement** de la version servie — échelle de réponse Epworth
erronée (`Q_SOM_02`), seuils d'interprétation différents (`Q_STR_01`), structure
DASS-21 différente (`Q_STR_04`), statut `certifie` absent sur ~11 d'entre elles.
Corriger une copie module ne changeait rien en production : piège de maintenance.

Les 27 copies mortes ont été supprimées (dont les fichiers `fibromyalgie.ts`,
`urologie.ts` et `pneumologie.ts`, entièrement vidés) et retirées de la ligne
d'import de `questions.ts`. **Le contenu servi au patient et au scoring est
strictement inchangé** : le catalogue sérialisé est identique octet pour octet
avant/après (vérifié par hash). Un test-garde
(`questionnaires-source-unique.test.ts`) impose désormais qu'un questionnaire
exporté par un module soit exactement la valeur servie, interdisant la
réapparition d'un doublon divergent.

Écarté : « finir la migration inline → module » en adoptant les définitions
modulaires — ce serait une régression clinique (les modules étaient périmés).
Rebâtir l'architecture modulaire à partir de l'inline servi reste possible plus
tard, comme tâche clinique dédiée.
