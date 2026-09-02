### La CI ne dépend plus de la disponibilité de data.gouv.fr pour merger (2026-09-02)

Le contrat d'intégration C5 (`test-c5-ciqual-import.sh`) télécharge le jeu
CIQUAL depuis `entrepot.recherche.data.gouv.fr` avant de jouer ses
vérifications destructives sur la base éphémère. Ce soir, l'entrepôt a rendu
503 en continu : **toutes** les PR du dépôt échouaient sur `verify`, quelle
que soit leur nature — et le run de `main` du matin avait déjà trébuché une
fois au même endroit. Désormais, seul le **téléchargement** tolère la panne :
après 3 retries (`--retry-all-errors`, les 5xx n'étant pas rejoués par
`--retry` seul), une source injoignable produit un skip **visible**
(annotation `::warning::` + message « NON JOUÉ ») et le job continue — jamais
un vert silencieux qui prétendrait avoir vérifié. Tout échec du contrat
lui-même (cible partielle acceptée, import non idempotent, cible corrompue)
reste strictement bloquant. Le contrat se rejoue au premier run avec la
source rétablie.
