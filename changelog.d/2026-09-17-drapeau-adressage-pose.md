### La lettre d'adressage est en service : `WN_ADRESSAGE_COURRIER` posé en production (2026-09-17)

Geste du responsable, exécuté le 2026-09-17 : `env-set` puis redémarrage des
conteneurs. Le drapeau était **neuf et éteint à la livraison** de `D-218`.

**Trois vérifications, dans cet ordre.** Le code qui lit le drapeau est en ligne —
constaté par **contenance**, jamais par égalité de SHA : `6e19f494` (D-218) est
ancêtre de `903e7e32`, l'image déployée. La variable est absente avant le geste,
`true` après. Et surtout : **la variable posée ne suffit pas**, les conteneurs
tournent avec l'environnement de leur démarrage — sans redémarrage, rien n'aurait
changé.

**Constaté par sonde, pas déduit.** `POST /api/praticien/adressage/courrier` avec un
corps illisible rend `400` ; drapeau fermé, il aurait rendu `503`, la garde de
drapeau étant la **toute première instruction** de la route — avant la lecture du
corps, avant la session, avant toute trace. La sonde n'ouvre aucune session, n'écrit
rien et ne nomme aucun dossier.

**Ce que cela change.** Le geste d'adressage est offert sur les dossiers dont la
décision est suspendue par un signal d'alerte déclaré — la mesure du 2026-08-23 en
comptait **6 sur 25**. Et la mesure de `LOT-06` devient interprétable : jusqu'ici,
compter les lettres d'adressage aurait rendu un zéro qui ne mesure rien.

**Ce que cela ne change pas** : la lettre **trace** l'adressage, elle ne le vaut pas.
Aucune abstention ne se lève.
