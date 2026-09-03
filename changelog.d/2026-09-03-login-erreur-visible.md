### Un échec de connexion praticien cesse d'être muet (2026-09-03)

`authOptions.pages.error` route toutes les erreurs d'authentification vers
`/login`, qui ignorait le paramètre `?error=` : un refus de domaine, une
adresse non vérifiée ou une panne côté Google renvoyaient le praticien sur un
écran strictement identique à celui qu'il venait de quitter. La page affiche
désormais un bandeau `role="alert"` qui distingue deux registres — le **refus**
(la décision est prise, le message dit quel compte utiliser à la place) et la
**panne** (l'échange n'a pas abouti, réessayer a du sens) — et donne le code
technique en petit, pour qu'un appel au support parte d'un fait. Un code
inconnu retombe sur le message générique : le bandeau ne peut pas disparaître,
c'est justement le silence qu'on corrige. Réserve levée : elle avait été posée
par la revue adversariale du lot d'épinglage des endpoints Google
(2026-09-01), qui notait que son coût montait — une évolution côté Google se
manifesterait ici, par un échec répété.
