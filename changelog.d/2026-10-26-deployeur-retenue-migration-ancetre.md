### Déployeur : la tête est retenue tant que la migration d'un ancêtre n'est pas attestée appliquée (D-374 §1, 2026-10-26)

- `scripts/wn-deploiement-deployer.mjs` : `retenue()` ne lisait que les runs
  release-db du commit cible ; un commit sans migration mergé au-dessus d'une
  migration en attente d'approbation partait en production avec le code de
  cette migration, contre une base sans ses colonnes — comportement décrit et
  gardé par [[D-248]] (arbitrage n° 2), retiré par [[D-374]] §1. La retenue
  part désormais du dernier commit de la ligne qui touche un chemin de
  release-db (`git log -1 --first-parent`), lit les runs release-db créés
  depuis lui (API Actions, lecture seule, toutes pages) sur sa ligne jusqu'à
  la cible, et distingue quatre états : appliquée (run vert, ou run rouge dont
  les étapes « Release en one-off » et « Vérification — migrate status » sont
  vertes — la garde anti-recul, échec volontaire après application), en
  attente, inconnu (le one-off a tourné sans attestation complète : lire la
  base par conteneur avant tout geste), échec avant application (relancer).
  Un seul run appliqué libère la tête : une fin rouge volontaire ne devient
  jamais un verrou permanent. Le même contrôle s'applique au commit plus neuf
  livré par la branche (`livre-non-verifie`).
- Banc : le cas « migration portée par un ancêtre, tête de code verte »
  (rouge sur l'ancienne lecture), les quatre états, le run relancé sur un
  descendant, la borne basse (un run antérieur au commit porteur n'atteste
  rien), la priorité des états, la lecture en échec sans écriture, la parité
  des noms d'étapes avec `release-db.yml` ; cinq mutations attrapées. La forme
  « one-off et contre-épreuve verts, garde anti-recul rouge » a été vérifiée
  sur le run de l'incident du 2026-10-19 par l'API.
- Hors périmètre : la sonde par phases de `wn-merge` ([[D-374]] §4) ; le gel
  reste intégral jusqu'à sa livraison ([[D-374]] §5). Aucune migration, aucun
  chemin clinique, aucune permission nouvelle (`actions: read` inchangé),
  aucune écriture Scalingo nouvelle ; commentaires du workflow de déploiement
  mis à jour, sans changement de comportement.
