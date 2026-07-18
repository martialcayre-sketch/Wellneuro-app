# C5 — Runbook d'activation en production

> Procédure d'activation explicite de la Boussole alimentaire C5. Prérequis :
> LOT-07 mergé, CI verte, trois verdicts émis (`VALIDATION_FINALE_C5.md`),
> instruction explicite du responsable. Rollback = flag `false` (non destructif).

## Prérequis (à confirmer avant activation)

- [ ] PR LOT-07 mergée dans `main`, CI verte (Vercel, verify, devcontainer-smoke).
- [ ] `WN_C5_ENABLED` absent/`false` sur le déploiement courant (surfaces C5 en 404).
- [ ] `MIGRATE_DATABASE_URL` présente dans Vercel Production (migration au build),
      valeur non lue ni consignée.
- [ ] Référentiel Ciqual importé et intègre (`RAPPORT_IMPORT_LOT-02.md`).
- [ ] Instruction d'activation du responsable consignée (`VALIDATION_FINALE_C5.md`).

## Procédure d'activation

1. **Définir la variable** dans Vercel Production :
   `WN_C5_ENABLED=true` (Project → Settings → Environment Variables → Production).
   - Alternative CLI (si disponible et authentifié) :
     `vercel env add WN_C5_ENABLED production` puis saisir `true`.
2. **Redéployer** la production (nouveau déploiement Production pour prendre en
   compte la variable) — ex. `vercel deploy --prod` ou redeploy depuis le dashboard.
3. **Vérifier l'activation** (smoke test) une fois le déploiement `Ready` :
   - `https://app.wellneuro.fr/` répond 200 (parcours existant intact).
   - Une surface boussole ne répond **plus** 404 quand le contexte est valide
     (ex. route praticien `api/praticien/boussole/*` accessible en session valide ;
     page patient boussole d'un protocole diffusé accessible via son token).
   - Vérifier qu'aucune donnée patient réelle n'apparaît hors des trois fixtures
     autorisées lors du contrôle.

## Rollback (immédiat, non destructif)

1. Remettre `WN_C5_ENABLED=false` (ou supprimer la variable) dans Vercel Production.
2. Redéployer.
3. Vérifier que les surfaces boussole répondent de nouveau 404 / vues vides.

**Interdit absolu** : aucun `DROP`, `DELETE`, `TRUNCATE`, `supabase db push` ni
second historique de migration. Le référentiel reste en base, inerte, flag à `false`.

## Traçabilité

- Consigner la date et l'auteur de l'activation dans `docs/claude/SESSION_LOG.md`
  et `CHANGELOG.md`.
- En cas d'incident, suivre `docs/claude/CONTEXTE_SESSION_VERCEL_2026-07-01.md`
  (runbook Vercel/DNS) et le rollback ci-dessus.
