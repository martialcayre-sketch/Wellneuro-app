### `release-db` vise enfin la base qui rend le service — one-off Scalingo, porte d'approbation restaurée (2026-08-22)

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
- **Trois gardes neuves** : le commit approuvé doit être **déployé** avant
  le one-off (sinon l'image ne contiendrait pas les migrations approuvées) ;
  la sortie passe par sentinelles (`WN_RELEASE_DB_OK`/`ECHEC`, toute fin
  muette = échec) ; contre-épreuve `migrate status` par un second one-off.
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
