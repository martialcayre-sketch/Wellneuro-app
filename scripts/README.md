# Scripts — Wellneuro MVP GAS

## Deploy

### `deploy.sh` — Déploiement unifié

Déploie le code GAS + crée un commit GitHub.

```bash
bash scripts/deploy.sh "feat: mon changement"
```

Étapes:
1. Vérifie aucun secret commité
2. Push vers Google Apps Script
3. Crée un déploiement (met à jour le `.deploy-id` existant)
4. Commit + push vers GitHub

## Clasp Credentials

Transférer les credentials clasp entre Codespace et PC local.

### Export (Codespace → PC)

**Sur Codespace:**

```bash
bash scripts/export-clasp-creds.sh
```

Affiche tes credentials en BASE64.
Copie le texte complet entre les traits `───`.

### Import (PC ← Credentials)

**Sur ton PC:**

```bash
bash scripts/import-clasp-creds.sh
```

Colle le BASE64 du step précédent et appuie sur **Ctrl+D**.

## Security

### `release_go_no_go.sh` - go/no-go technique production

Exécute les garde-fous de bascule en une commande:

1. `bash scripts/check_no_secrets.sh`
2. `cd web && npm run type-check`
3. `cd web && NODE_ENV=production npm run build`
4. smoke HTTP sur l'URL de prod (`/login`, `/`)

Usage:

```bash
bash scripts/release_go_no_go.sh --url https://app.wellneuro.fr
```

Option:

```bash
bash scripts/release_go_no_go.sh --skip-http
```

- ❌ Ne committe JAMAIS `.clasprc.json` (credentials personnels)
- ❌ Ne partage JAMAIS le BASE64 des credentials
- ✓ `.clasp.json` est safe (pas de secrets)
- ✓ `.deploy-id` est safe (ID public du déploiement)

## Tests avant déploiement

### `wn-test-worktree.sh` - réplique locale du job CI `verify`

Rejoue toute la séquence CI dans le worktree courant avec un PostgreSQL
éphémère isolé (ports dérivés du chemin, base recréée puis détruite à chaque
run, seed 100 % fictif) — plusieurs worktrees peuvent valider en parallèle
sans se contaminer. Ordre fail-fast : contrôles statiques (anti-secrets,
audit campagnes, scoring, type-check, Vitest, lint) avant toute base, puis
migrations, seed, build et Playwright.

Gates de sûreté alignés sur la chaîne de déploiement (le workflow GitHub Actions
`release-db` applique `migrate deploy` en production, hors du build applicatif) :

- **dérive schéma↔migrations** : `prisma migrate diff` compare la base
  éphémère (construite uniquement par `migrate deploy`) à `schema.prisma` et
  échoue si le schéma a évolué sans migration committée ;
- **certification scoring** : les 63 questionnaires restent conformes à leurs
  fixtures certifiées ;
- **e2e sur build de production** (`next start`) : le même artefact que la
  production déploie, sans compilation à la demande pendant les tests.

Usage (depuis `web/`, de n'importe quel worktree) :

```bash
npm run test:worktree               # séquence CI complète
npm run test:worktree -- --fast     # saute anti-secrets, audit, scoring, lint, build
npm run test:worktree -- --keep-db  # conserve la base après le run
```

Overrides : `WN_PG_PORT`, `WN_APP_PORT`, `WN_PG_BIN`. Détails complets dans
l'en-tête du script.

## Orchestration WN

### `wn-github-orchestrator.mjs` — archivé (2026-08-08)

Socle de triage en lecture seule jamais branché : aucun skill, hook, workflow
ni script ne l'invoquait, et il n'avait pas de banc de test. Déplacé vers
`archive/scripts/wn-github-orchestrator.mjs` (référence seule) avec sa
politique `.wn/orchestrator.json`, conservée en place tant qu'un successeur ne
la reprend pas.

### `wn-campaign-audit.mjs` - audit de conformité des campagnes

Vérifie les campagnes contre les règles WN-AUTO (frontmatter, lots, cohérence
de `lot_courant`, métadonnées Git, cohérence avec `.wn/state.json`).

Usage JSON (échec si erreur bloquante):

```bash
node scripts/wn-campaign-audit.mjs
```

Usage markdown (rapport versionnable):

```bash
node scripts/wn-campaign-audit.mjs --no-fail --format markdown --write docs/claude/campagnes/AUDIT_REGLES_CAMPAGNES.md
```

Mode CI bloquant sur les incohérences d'état et les dérives du miroir :

```bash
node scripts/wn-campaign-audit.mjs --fail-on-warning-codes missing_audit_root,missing_in_mirror,extra_in_mirror,status_drift_between_roots,closed_campaign_with_open_lots,inflight_without_active_lot,idle_with_active_fields
```

Mode CI strict (bloque sur tout warning):

```bash
node scripts/wn-campaign-audit.mjs --fail-on-warning
```

### `repo-hygiene.sh` - hygiene documentaire multi-depots

Execute un playbook standardise pour nettoyer un depot sans divergence de methode.

Modes disponibles:

- `audit-only`: lecture seule, produit l'inventaire et les fichiers de detection de doublons.
- `apply-safe`: deplace les snapshots dates vers `docs/archive/*` et met a jour les references texte.
- `report-pr`: genere un template de PR a partir des artefacts produits.

Usage:

```bash
bash scripts/repo-hygiene.sh audit-only
bash scripts/repo-hygiene.sh apply-safe --dry-run
bash scripts/repo-hygiene.sh apply-safe
bash scripts/repo-hygiene.sh report-pr
```

Options:

```bash
bash scripts/repo-hygiene.sh audit-only --root /path/to/repo --out .repo-hygiene
bash scripts/repo-hygiene.sh report-pr --write .repo-hygiene/pr-template.md
```

## Files

| File | Purpose | Status | Commit? |
|------|---------|--------|---------|
| `.clasprc.json` | Credentials clasp | ❌ Secret | **NO** |
| `.clasp.json` | Config projet GAS | ✓ Safe | **YES** |
| `.deploy-id` | ID déploiement | ✓ Safe | **YES** |
| `src/gas/` | Code GAS | ✓ Safe | **YES** |

---

Pour plus d'infos → `docs/CLASP_LOCAL_SETUP.md`
