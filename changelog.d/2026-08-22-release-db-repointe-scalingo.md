### `release-db` vise enfin la base qui rend le service — one-off Scalingo, porte d'approbation restaurée (D-087, 2026-08-22)

> Arbitrage du responsable, même jour : ce modèle **supplante les §1-2 de
> `D-086`** (née en session parallèle du même incident) — le gate humain
> redevient l'approbation `release-db` à la pose du drapeau, le repointage
> d'URL envisagé par `D-086` §2 étant matériellement impossible (base HDS
> non exposée à Internet). Son §3 (vérification par one-off) demeure.

Constat déclencheur, fait le jour même sur la purge #746 : le workflow
appliquait encore ses migrations **sur Supabase** (`MIGRATE_DATABASE_URL`
jamais repointé au cutover) — la porte d'approbation protégeait la mauvaise
base, pendant que Scalingo migrait au `postdeploy`, sans porte. Effet
collatéral assumé de ce constat : la purge est appliquée **des deux côtés**
(les jetons en clair ont aussi quitté la copie), et le filet de rollback
Vercel+Supabase ne tient plus que par restauration de sauvegarde.

- **Le job `release` ne touche plus jamais une URL de base** : il exécute
  `web/scripts/release-db-scalingo.sh` (quatre préflights lecture seule +
  `migrate deploy`, inchangés sur le fond) **en one-off dans l'image de
  production** via le CLI Scalingo — la base HDS reste inaccessible depuis
  Internet. Secret requis : `SCALINGO_API_TOKEN` (jeton d'API, posé par le
  responsable), garde fail-closed s'il manque.
- **Des gardes durcies par revue adversariale le jour même** (verdict NO-GO
  initial, quatre bloquants corrigés) : le commit approuvé doit être **le
  dernier déploiement réussi**, et l'**empreinte des migrations** approuvées
  est re-vérifiée **dans le conteneur** au moment d'écrire — un déploiement
  plus récent ne fait pas partir de migrations que personne n'a approuvées ;
  sentinelles **liées au run** (`id=`, un one-off antérieur ne peut plus
  passer pour le run courant ; toute fin muette = échec) ; contre-épreuve
  `migrate status` par un second one-off, elle aussi liée au run ; **seule
  l'URL de l'add-on est acceptée** dans le one-off (`MIGRATE_DATABASE_URL` y
  est ignorée à dessein, l'hôte migré est nommé dans les logs) ; drapeau de
  gouvernance **constaté** à chaque release (`env-get`) ; jeton borné aux
  étapes qui parlent à Scalingo ; CLI épinglé par version et empreinte. Deux
  bancs verrouillent le protocole des deux côtés (invariants du workflow,
  comportement réel des scripts en bash).
- **Le `postdeploy` ne migre plus** quand `WN_MIGRATIONS_PAR_RELEASE_DB=1`
  est posé (production seule, staging garde l'auto-migration) :
  l'approbation humaine redevient l'unique porte d'écriture du schéma —
  « écriture uniquement par migration relue via release-db » redevient vrai.
- **`import-cb` : hors service explicite** (fail-closed) — il visait
  Supabase ; réécriture avec la Phase C, pas d'écriture silencieuse sur une
  base décommissionnée entre-temps.
- Ordre assumé et documenté (résumé d'approbation réécrit) : code d'abord,
  migration après approbation — un ADD se protège par drapeau éteint, un
  DROP rend le retour arrière dépendant d'une restauration de base.
