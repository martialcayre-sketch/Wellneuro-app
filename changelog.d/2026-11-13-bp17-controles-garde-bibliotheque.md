### BP-17 : contrôles et garde de la bibliothèque des options (2026-11-13)

PR 4 du découpage de D-480. La structure reste vide et non signée ; aucune
option ni aucun texte clinique n'est écrit. Les claims que cite la
bibliothèque entrent au contrat de fraîcheur en deux tables selon l'usage :
`prescriptif` exigé de la seule source de dose (D-480 §5.2). Un nouveau
contrat de production vérifie, avant chaque release, que toute position
d'expert citée est la version courante et signée en dernier acte ; son test
négatif tourne en CI (§5.3). Un banc prouve que la bibliothèque ne lit aucun
dossier : la fermeture de ses imports est figée, sans base, réseau ni
environnement (§5.4). Le crochet DC-17 et la garde Codex P0 couvrent son
dossier, elle entre à la matrice de consommation (dormante jusqu'à l'atelier)
et `release-db` se déclenche sur sa structure et sur le contrat des
positions (§5.5). La garde « aucun lecteur » (§8) suit désormais les liens
symboliques, les fichiers de test ou ignorés atteints par la production, le
remplacement à chaud de webpack et l'outillage, et fige la chaîne de
lancement de production.
