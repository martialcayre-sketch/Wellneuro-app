### Les valeurs du jeton permanent quittent la base — la « PR 2 » de #397 est livrée (D-085 §5, 2026-08-22)

Migration `20260822140000_purge_access_token_dormant` : `DROP COLUMN` de
`patients.access_token` (credential en clair, mort depuis #397) et
`access_token_created_at`. C'était le résidu nommé des exigences 2/4 du gate
G-TRUST-04 — des secrets morts qu'on continuait d'héberger.

- **Périmètre corrigé au cadrage : deux colonnes, pas trois.** D-085 §5
  ordonnait « les trois colonnes » sur la foi de la checklist ; le code dit
  autre chose — `access_token_revoked` est le drapeau **vivant** de
  révocation du portail (posé par la route praticien `token`, honoré aux
  trois entrées et par `isSessionValideForPatient`). Il reste, avec un
  commentaire de schéma qui assume le vestige de nom.
- Aucun fichier de production ne lisait les colonnes purgées (constat) : le
  nettoyage est un nettoyage de fixtures (~20 fichiers de tests) et du
  helper E2E de reprise, qui n'écrit plus de jeton et ne retourne plus rien
  — ses deux specs consommateurs n'utilisaient pas la valeur.
- Deux tests « survit à une réémission du jeton permanent » retirés, avec
  commentaire daté sur place : leur sujet n'existe plus structurellement.
  Tout ce qui teste la **révocation** demeure.
- La purge complète s'achève au décommissionnement (`D-080`, 2026-09-01) :
  la copie Supabase, gardée chaude pour rollback, porte encore les valeurs
  jusqu'à son effacement prouvé.
