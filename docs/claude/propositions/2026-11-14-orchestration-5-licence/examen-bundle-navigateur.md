# Mentions de licence dans le bundle livré au navigateur — examen (lot `licence-mention-droits`)

Réserve de l'avis Codex sur `20261114-1825-d` : le dépôt ne redistribue aucune dépendance, mais l'application déployée en livre une partie au navigateur. Cet examen dit ce que ce bundle garde des mentions de licence. **Il constate, et ne corrige rien.**

## Constat (2026-11-15, build de production local de Next.js 15.5.25)

- Le minificateur de Next.js (`node_modules/next/dist/build/webpack/plugins/minify-webpack-plugin/src/index.js`, option `output.comments: false`) retire **tous** les commentaires, y compris `/*! … */` et `@license`. Je n'ai trouvé aucune option documentée de `next.config` qui la change.
- Sur les 314 fichiers JavaScript de `web/.next/static` :
  - aucun fichier `*.LICENSE.txt` n'est produit ;
  - aucun commentaire `@license` ne subsiste ;
  - une seule mention survit, une chaîne de données des polyfills (core-js), pas un commentaire.
- Les dépendances livrées au navigateur (React, Next.js, Recharts, lucide-react…) sont sous MIT, ISC ou Apache-2.0. Ces licences exigent que la mention de droits et le texte de la licence accompagnent les copies redistribuées. Apache-2.0 exige en plus de reproduire le fichier `NOTICE`, s'il existe.

## Lecture

Le bundle servi ne porte pas ces mentions. Le défaut ne vient pas de ce lot : il existe depuis la mise en production, et la mention « Tous droits réservés » ne le crée ni ne le règle. Il porte sur des licences permissives, qui n'imposent rien d'autre que la mention ; il ne remet donc pas en cause le choix de ne concéder aucune licence.

## Suite proposée (lot à part, au carnet)

Le remède usuel est un **fichier de mentions tierces**, généré au build à partir des dépendances de production réellement livrées, puis servi en fichier statique (par exemple `/licences-tierces.txt`). Ce fichier n'est pas un écran. Deux autres voies sont écartées :

- garder les commentaires au minificateur : aucune option documentée ne le permet, et un bundle plus lourd ne remplace pas une liste complète ;
- ne rien faire : la condition des licences reste non tenue.

Ce lot technique et réversible est inscrit au carnet de la file D (`licences-tierces-bundle`).
