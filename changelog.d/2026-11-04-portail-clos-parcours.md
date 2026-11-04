### Portail patient : un dossier clos ne se voit plus proposer de questionnaire à compléter (2026-11-04)

Constat du lot L1 « rails et menus » (#1840) : le dossier de test clos, majeur, affichait
encore des questionnaires « à commencer » dans « Mon parcours » du hub. Le hub ne vidait la
liste que pour un non-majeur. Or un dossier clos est servi en « majeur », ce qui est voulu :
un mineur clos ne voit pas l'écran des mineurs. Un mineur clos voyait donc lui aussi ses
questionnaires en attente, que la route de saisie lui refuse.

Arbitrage du responsable du 2026-11-04 : un dossier clos ne recueille plus rien. Le hub
(`portail/[token]/questionnaires/page.tsx`) retire désormais, pour un dossier clos, tout ce qui
reste « à compléter » : de la liste, du compteur et du fil du jour. Ce qui a été transmis reste
consultable, puisque la clôture garde la lecture des archives. Le banc de la page couvre les
quatre cas : majeur, mineur, clos majeur et clos mineur.

Écarté ici : une garde de clôture dans `api/patient/questionnaire` et `api/patient/submit`,
qui ne gardent que l'âge. Un appel direct d'un majeur clos est donc encore accepté. C'est une
dette signalée, sans lot. Le menu « Autres espaces » et `/api/portail/session` ne sont pas
touchés. Pas de migration.
