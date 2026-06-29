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

- ❌ Ne committe JAMAIS `.clasprc.json` (credentials personnels)
- ❌ Ne partage JAMAIS le BASE64 des credentials
- ✓ `.clasp.json` est safe (pas de secrets)
- ✓ `.deploy-id` est safe (ID public du déploiement)

## Files

| File | Purpose | Status | Commit? |
|------|---------|--------|---------|
| `.clasprc.json` | Credentials clasp | ❌ Secret | **NO** |
| `.clasp.json` | Config projet GAS | ✓ Safe | **YES** |
| `.deploy-id` | ID déploiement | ✓ Safe | **YES** |
| `src/gas/` | Code GAS | ✓ Safe | **YES** |

---

Pour plus d'infos → `docs/CLASP_LOCAL_SETUP.md`
