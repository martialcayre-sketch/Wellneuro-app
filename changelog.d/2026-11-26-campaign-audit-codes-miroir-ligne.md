### Audit des campagnes : la ligne bloquante n'arme plus trois codes qui ne pouvaient pas sonner (2026-11-26)

`campaign-audit-check` (`web/package.json`), l'étape « Campaign rules audit
(blocking) » de `.github/workflows/ci.yml` et l'audit de campagne de
`scripts/wn-test-worktree.sh` armaient `missing_in_mirror`, `extra_in_mirror`
et `status_drift_between_roots` dans `--fail-on-warning-codes` sans passer
`--root`. `scripts/wn-campaign-audit.mjs` n'audite alors que sa racine par
défaut, `docs/claude/campagnes`, et `compareRoots` ne joue qu'avec une
seconde racine : ces trois codes ne pouvaient pas sonner.

- Constat : il n'existe pas de miroir vivant. `.wn/campaigns/active` est
  vide ; `.wn/campaigns/archive` ne tient qu'une campagne close et figée
  (`wn-doc-assainissement`, archivée le 2026-07-14) ; l'ancien miroir
  `wellneuro_wn_campaigns/` a été supprimé. Câbler `--root` vers l'archive ne
  garderait rien.
- Les trois codes quittent les trois lignes, qui gardent la même liste de
  quatre codes : `missing_audit_root`, `closed_campaign_with_open_lots`,
  `inflight_without_active_lot`, `idle_with_active_fields`.
- `scripts/wn-campaign-audit.test.mjs` : la ligne porte les quatre codes ; un
  test rougit si un code de miroir y revient sans `--root`. Les cas de
  mécanisme de `compareRoots` restent, joués avec leurs propres codes et
  `--root`, et chacun vérifie aussi qu'il ne rougit pas la ligne.
- Aucune détection effective n'est retirée : ce qui sonnait sonne encore.
  `wn-campaign-audit.mjs` et les fichiers de campagne sont inchangés.
