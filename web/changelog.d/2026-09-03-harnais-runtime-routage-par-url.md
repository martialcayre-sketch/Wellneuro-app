## 2026-09-03 — test(cockpit) : le harnais du runtime clinique route ses neuf routes par URL

Le harnais de `ClinicalRuntimeSection.test.tsx` ne nommait que deux routes,
`trajectoire` et `propositions-objectif`. Les **sept autres** que le runtime
appelle — quatre du rayon biologie, trois des protocoles — tombaient dans les
files génériques `cockpitGet`/`cockpitPost` et y consommaient une réponse
destinée au cockpit.

Le symptôme n'était pas un banc rouge : c'était un banc qui teste autre chose
que ce qu'il annonce. La réponse cockpit attendue au rang N est servie à un
appel biologie, et le cockpit reçoit le 500 de fin de file. C'est le même
défaut que la revue du LOT-03 avait relevé sur `propositions-objectif`, corrigé
alors pour cette seule route.

Les neuf routes sont désormais nommées et servies par préfixe — les plus longs
d'abord, sinon `…/proposition/courrier` ne serait jamais atteint derrière
`…/proposition`. Chaque route accepte une réponse unique ou une file, le
rechargement d'une même route après un geste étant courant dans ce runtime.

**Une route non déclarée par un cas répond en échec, pas en succès vide**, et
ce choix a été fait sur mesure : servir un `{ ok: true }` minimal fait emprunter
au composant des chemins de succès qu'il ne prenait pas, avec des charges
utiles incomplètes — trois bancs sont tombés, dont un sur un DOM entièrement
démonté par un rejet non géré. L'échec est exactement ce que ces routes
recevaient déjà (file générique épuisée = 500), et chaque chargeur du runtime
l'absorbe comme une donnée indicative absente. `trajectoire` et `propositions`
font exception : le runtime les lit avant de savoir quoi demander, un échec y
changerait la séquence.

Ce routage est le prérequis commun de deux chantiers qui restent à faire : le
banc de survie de la note d'arbitrage, et la dé-duplication de la lecture de
trajectoire.
