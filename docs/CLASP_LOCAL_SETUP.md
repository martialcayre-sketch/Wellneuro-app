# Configuration Clasp Local — PC de Bureau

Guide pour déployer Wellneuro GAS depuis ton VS Studio local au lieu de Codespace.

## ⚠️ Sécurité

**NE JAMAIS COMMITTER** les fichiers `.clasprc.json` ou `.clasp.json` avec des credentials réels.
Les credentials sont personnels et doivent rester locaux.

## Étapes

### 1. Authenticate clasp sur ton PC (une seule fois)

**Sur ton PC local, terminal:**

```bash
# Si clasp n'est pas installé
npm install -g @google/clasp

# Connexion
clasp login
```

Cela ouvre un navigateur → connecte-toi avec `martialcayre@wellneuro.fr` → copie-colle le code retour → ton PC obtient les credentials dans `~/.clasprc.json`.

### 2. Clone le repo et configure .clasp.json

**Sur ton PC local:**

```bash
git clone https://github.com/martialcayre-sketch/Wellneuro.git Wellneuro-app
cd Wellneuro-app
```

Vérifie que `.clasp.json` contient:

```json
{
  "scriptId": "1ayljcnN4H0n-S7CMTRa97Yf_1fdVHFXwmW_uyS3bZJF1ArYx9HkbFYnT",
  "rootDir": "src/gas",
  "scriptExtensions": [".js", ".gs"],
  "htmlExtensions": [".html"],
  "jsonExtensions": [".json"]
}
```

Ce fichier est **safe à committer** (pas de secrets).

### 3. Déploie depuis ton PC

**Option A: Script de déploiement unifié**

```bash
bash scripts/deploy.sh "feat: mon changement"
```

Ce script:
- Vérifie aucun secret n'est commité
- Push le code vers GAS via clasp
- Crée un déploiement
- Commit+push vers GitHub

**Option B: Clasp direct (si deploy.sh pose problème)**

```bash
# Push le code vers GAS (sans créer de déploiement web)
clasp push

# Créer/mettre à jour le déploiement
clasp deploy -i AKfycbwMmpR3vx6ncmxJbS7gFCgxpVdpuEPrVdWnB5OcvHFQle1YvNpknNqjAU4a9Env6mCQ -d "feat: mon changement"
```

### 4. Configuration VS Studio (optionnel)

Si tu utilises VS Studio extensions:

**Recommandé:**
- Install: **Google Apps Script** (gsuitedevs.google-apps-script)
- Optionnel: **Clasp** ou **Apps Script IDE**

Ces extensions te permettent de:
- Voir les logs GAS directement
- Exécuter des fonctions depuis VS
- Auto-complete GAS APIs

## Troubleshooting

### ❌ "Credentials not found" après clasp login

```bash
# Vérifie que le fichier existe
ls ~/.clasprc.json

# Réinitialise clasp
clasp logout
clasp login
```

### ❌ "Project ID mismatch"

Le `.clasp.json` doit match le scriptId du projet GAS.
Vérifie que le scriptId (ligne 2) correspond au projet dans Google Apps Script.

### ❌ Deploy échoue, changes pas poussées

```bash
# Pousse d'abord vers GAS
clasp push

# Puis crée le déploiement
clasp deploy -i AKfycbwMmpR3vx6ncmxJbS7gFCgxpVdpuEPrVdWnB5OcvHFQle1YvNpknNqjAU4a9Env6mCQ
```

## Workflow recommandé

1. **Code + test** sur ton PC (VS Studio local)
2. **Commit + push** vers GitHub (`git push`)
3. **Deploy** vers GAS (`bash scripts/deploy.sh "message"`)
4. **Test** sur la web app déployée

## Notes

- `.clasprc.json` (credentials) → **NE PAS COMMITTER** (dans .gitignore)
- `.clasp.json` (config projet) → **À COMMITTER** (safe, pas de secrets)
- `.deploy-id` (ID déploiement) → **À COMMITTER** (safe, permet de mettre à jour le même déploiement)
- Tous les scripts dans `scripts/deploy.sh` incluent les vérifications de sécurité

## FAQ

**Q: Je dois utiliser clasp sur deux PCs, c'est safe?**
A: Oui, chaque PC a son `.clasprc.json` local. Évite de les synchroniser.

**Q: Puis-je révoquer les credentials clasp?**
A: Oui → Google Account → Security → Apps connectées → Clasp → Révoquer.

**Q: Comment faire un déploiement depuis le Codespace?**
A: Même process, mais `clasp login --no-localhost` pour Codespace (plus compliqué).

---

**Besoin d'aide?** Contacte Martial ou consulte:
- [Clasp docs](https://github.com/google/clasp)
- [Google Apps Script](https://script.google.com)
