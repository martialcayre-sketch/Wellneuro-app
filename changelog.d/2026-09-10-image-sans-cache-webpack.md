### Déploiement — le cache webpack ne part plus dans l'image

`next build` écrit `.next/cache/webpack` (812 Mo mesurés en production) et le
buildpack empaquette `.next` en entier. Le runtime n'en lit rien : `next start`
sert `.next/server`, `.next/static` et `.next/types`, 37 Mo à eux trois. Le
build le supprime désormais avant l'empaquetage.

**C'est ce qui rend l'application déployable**, pas une optimisation. Scalingo
refuse une image au-delà de 2048 Mo ; les déploiements du 2026-09-10 à 19:36 et
20:07 ont échoué sur `image exceeds the limit of 2048MB - (2049MB)`. Un
mégaoctet. Tous les déploiements réussis d'avant affichaient déjà « 2.0 GiB » :
la marge était nulle depuis longtemps et le premier commit venu devait franchir
la ligne — ce fut une PR documentaire.

**Aucune seconde de build perdue** : ce cache ne survivait pas d'un build à
l'autre. Le buildpack ne restaure et ne conserve que le cache npm
(« Restoring cache — npm cache ») ; le cache webpack était reconstruit à chaque
fois, puis expédié pour rien.

Conséquence sur la chaîne d'écriture : `release-db` exige que le commit approuvé
soit le dernier déploiement **réussi**. Une image refusée bloquait donc aussi
toute migration.
