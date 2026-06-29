# Configuration clasp en local

## ✓ État actuel
- clasp est installé (`v3.3.0`)
- `.clasp.json` est configuré avec le script ID Wellneuro NNPP2
- Authentification: **À reconfigurer**

## Configuration de clasp (authentification)

### Étape 1 : Se connecter à Google
```bash
clasp login
```

**En Codespace:**
- clasp ouvrira une URL → copie-colle le lien dans ton navigateur
- Autorise l'accès → clasp récupère le token OAuth
- Le token est stocké dans `~/.clasprc.json` (local, ne pas committer)

### Étape 2 : Vérifier la connexion
```bash
clasp projects
```
Doit afficher les projets accessibles (dont le script Wellneuro NNPP2).

### Étape 3 : Tester un push
```bash
clasp push
```
Doit synchroniser `src/gas/` vers le projet Google Apps Script.

## Script de déploiement complet

Une fois clasp authentifié, utilise:
```bash
bash scripts/deploy.sh
```

Cela:
1. Vérifie l'absence de secrets
2. Push le code vers GAS via clasp
3. Crée ou met à jour un déploiement
4. Commit et push vers Git

## Dépannage

**Erreur: "Invalid credentials"**
→ Refaire `clasp login`

**Erreur: "Script not found"**
→ Vérifier que `scriptId` dans `.clasp.json` est correct

**Erreur: "No file found to push"**
→ Vérifier que les fichiers existent dans `src/gas/`

## ⚠ Sécurité

- `~/.clasprc.json` ne doit JAMAIS être commité
- `.clasp.json` peut être versionné (contient juste le scriptId, pas les secrets)
- Avant chaque push, `scripts/deploy.sh` lance `scripts/check_no_secrets.sh`
