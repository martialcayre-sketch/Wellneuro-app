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

## Orchestration WN

### `wn-github-orchestrator.mjs` - socle d'orchestration GitHub

Produit un état local de triage à partir de `.wn/state.json`, `.wn/orchestrator.json` et, si disponible, de `gh`.
Le script ne modifie rien.

Usage:

```bash
node scripts/wn-github-orchestrator.mjs
```

Mode JSON:

```bash
node scripts/wn-github-orchestrator.mjs --json
```

Sans accès GitHub:

```bash
node scripts/wn-github-orchestrator.mjs --no-gh
```

| File | Purpose | Status | Commit? |
|------|---------|--------|---------|
| `.wn/orchestrator.json` | Politique machine-readable du socle d'orchestration | ✓ Safe | **YES** |

### `wn-campaign-audit.mjs` - audit de conformité des campagnes

Vérifie les campagnes contre les règles WN-AUTO (frontmatter, lots, cohérence
de `lot_courant`, métadonnées Git, cohérence avec `.wn/state.json`) et compare
le référentiel principal au miroir `wellneuro_wn_campaigns`.

Usage JSON (échec si erreur bloquante):

```bash
node scripts/wn-campaign-audit.mjs
```

Usage markdown (rapport versionnable):

```bash
node scripts/wn-campaign-audit.mjs --no-fail --format markdown --write docs/claude/campagnes/AUDIT_REGLES_CAMPAGNES.md
```

Mode CI bloquant sur les incohérences d'état, avant la réconciliation dédiée
du miroir :

```bash
node scripts/wn-campaign-audit.mjs --fail-on-warning-codes closed_campaign_with_open_lots,inflight_without_active_lot,idle_with_active_fields
```

Mode CI strict (bloque sur tout warning):

```bash
node scripts/wn-campaign-audit.mjs --fail-on-warning
```

## Supabase + Prisma

### `setup_supabase_prisma.sh` — Setup complet Docker + migration 5432

Automatise la preparation d'un environnement Supabase/Prisma pour migration distante:

1. installe Docker (Debian/Ubuntu) si absent,
2. verifie l'acces au daemon Docker,
3. verifie l'authentification Supabase CLI,
4. lie le projet Supabase,
5. verifie l'acces reseau `db.<project_ref>.supabase.co:5432`,
6. derive une URL directe de migration (port 5432) depuis `DATABASE_URL`,
7. lance `prisma migrate deploy`,
8. lance optionnellement `supabase db pull`.

Usage recommande:

```bash
bash scripts/setup_supabase_prisma.sh --project-ref <project_ref>
```

Mode rapide (si Docker est deja installe):

```bash
bash scripts/setup_supabase_prisma.sh --project-ref <project_ref> --skip-docker-install
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
