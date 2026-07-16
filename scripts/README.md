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

Gates de sûreté alignés sur la chaîne de déploiement
(`web/scripts/vercel-build.sh` applique `migrate deploy` en production au
build Vercel) :

- **dérive schéma↔migrations** : `prisma migrate diff` compare la base
  éphémère (construite uniquement par `migrate deploy`) à `schema.prisma` et
  échoue si le schéma a évolué sans migration committée ;
- **certification scoring** : les 63 questionnaires restent conformes à leurs
  fixtures certifiées ;
- **e2e sur build de production** (`next start`) : le même artefact que Vercel
  déploie, sans compilation à la demande pendant les tests.

Usage (depuis `web/`, de n'importe quel worktree) :

```bash
npm run test:worktree               # séquence CI complète
npm run test:worktree -- --fast     # saute anti-secrets, audit, scoring, lint, build
npm run test:worktree -- --keep-db  # conserve la base après le run
```

Overrides : `WN_PG_PORT`, `WN_APP_PORT`, `WN_PG_BIN`. Détails complets dans
l'en-tête du script.

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
