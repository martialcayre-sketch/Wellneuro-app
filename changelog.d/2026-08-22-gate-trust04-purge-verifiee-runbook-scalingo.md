### G-TRUST-04 : la purge est vérifiée des deux côtés, le runbook parle enfin Scalingo (2026-08-22)

Exécution de la fin du cap [[D-085]] (« il ne doit rester que l'exigence 1 ») :

- **Lignes 2/4 — purge vérifiée.** Sonde §C en one-off sur la production
  Scalingo, après le déploiement du commit de purge : colonnes `access_token`
  et `access_token_created_at` **absentes**, index unique emporté,
  `access_token_revoked` (drapeau vivant) conservé, migration appliquée en
  une tentative, aucune orpheline. Le résidu restant des lignes 2/4 fusionne
  avec la ligne 1 : l'effacement de la copie Supabase au 2026-09-01
  ([[D-080]]).
- **Ligne 6 — réglée.** `docs/RUNBOOK.md` réécrit pour l'ère Scalingo, le
  dernier livrable que [[D-085]] §3 commandait : chapitre one-off (motif
  éprouvé le jour même — `run --detached`, `logs --filter`, `one-off-stop`),
  `env-get` seul (jamais `env`), piège `env-set`-sans-restart, tunnel,
  déploiement et rollback recadrés ([[D-087]] : un slug antérieur ré-active
  l'auto-migration ; un DROP ne se défait que par restauration de base),
  incidents plateforme/OAuth/base, révocation patient recalée post-purge
  (`accessTokenRevoked` est un drapeau de compte, le jeton n'existe plus).
- Restent ouvertes au gate : **l'exigence 1** (annexe HDS +
  décommissionnement, datée) et **l'exigence 7** (revue Codex, lancement par
  le responsable).
