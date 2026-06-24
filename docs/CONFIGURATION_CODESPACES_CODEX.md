# Configuration GitHub Codespaces et Codex — NutriConsult NNPP2

## Objectif

Ce guide explique comment préparer un environnement GitHub Codespaces pour travailler sur le MVP Google Apps Script de NutriConsult NNPP2 avec Codex et clasp.

L'objectif est de permettre à Martial et aux agents IA de :

- développer dans un environnement reproductible ;
- installer automatiquement Node.js 20, GitHub CLI et `@google/clasp` ;
- synchroniser le projet Google Apps Script avec `src/gas/` ;
- éviter tout commit de secrets, d'identifiants Google ou de données patients réelles ;
- stabiliser le MVP GAS sans lancer la migration Next.js.

## Structure attendue du dépôt

Structure minimale recommandée :

```text
.
├── AGENTS.md
├── README.md
├── docs/
│   └── CONFIGURATION_CODESPACES_CODEX.md
├── scripts/
│   └── check_no_secrets.sh
├── src/
│   └── gas/
│       ├── Code.gs
│       ├── Questions.gs
│       ├── index.html
│       └── appsscript.json
├── .clasp.example.json
├── .claspignore
├── .devcontainer/
│   └── devcontainer.json
├── .env.example
├── .gitignore
└── package.json
```

Les fichiers `src/gas/*` peuvent être importés depuis Google Apps Script avec `clasp pull` lorsque clasp est configuré.

## Création de `.devcontainer/devcontainer.json`

Créer le dossier `.devcontainer/`, puis ajouter `.devcontainer/devcontainer.json` :

```json
{
  "name": "NutriConsult NNPP2 GAS",
  "image": "mcr.microsoft.com/devcontainers/javascript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "postCreateCommand": "npm install -g @google/clasp && npm install",
  "customizations": {
    "vscode": {
      "extensions": [
        "github.copilot",
        "github.copilot-chat",
        "dbaeumer.vscode-eslint"
      ]
    }
  }
}
```

Cette configuration installe automatiquement Node.js 20 via l'image de base, GitHub CLI via une feature Dev Containers et `@google/clasp` via `postCreateCommand`.

## Création ou vérification de `package.json`

Si `package.json` n'existe pas, créer un fichier minimal :

```json
{
  "name": "nutriconsult-nnpp2-gas-mvp",
  "private": true,
  "scripts": {
    "check:secrets": "bash scripts/check_no_secrets.sh",
    "clasp:login": "clasp login --no-localhost",
    "clasp:pull": "clasp pull",
    "clasp:push": "clasp push",
    "clasp:status": "clasp status",
    "clasp:open": "clasp open"
  },
  "devDependencies": {
    "@google/clasp": "latest"
  }
}
```

Scripts utiles :

- `npm run check:secrets` : vérifie l'absence de fichiers ou motifs sensibles connus.
- `npm run clasp:login` : lance l'authentification Google Apps Script sans serveur local.
- `npm run clasp:pull` : importe le projet Apps Script configuré dans `.clasp.json`.
- `npm run clasp:push` : pousse les fichiers locaux vers Apps Script après relecture.
- `npm run clasp:status` : affiche les différences connues par clasp.
- `npm run clasp:open` : ouvre le projet Apps Script.

## Création de `.gitignore`

Vérifier que `.gitignore` protège au minimum :

```gitignore
.env
.env.*
.clasp.json
.clasprc.json
credentials.json
token.json
client_secret*.json
node_modules/
.next/
dist/
build/
exports/
data/private/
patients_reels/
resultats_reels/
*.csv
*.xlsx
```

Ces règles évitent de committer des secrets, des identifiants Google, des dépendances, des artefacts de build et des exports patients.

## Création de `.clasp.example.json`

Créer un exemple sans identifiant réel :

```json
{
  "scriptId": "REMPLACER_PAR_LE_SCRIPT_ID_APPS_SCRIPT",
  "rootDir": "src/gas"
}
```

Ne jamais committer le fichier `.clasp.json` réel. Il contient l'identifiant du projet Apps Script et doit rester local au Codespace ou au poste de développement.

## Création de `.claspignore`

Créer `.claspignore` pour limiter les fichiers envoyés à Apps Script :

```gitignore
**/**
!src/gas/**
```

Selon la version de clasp et l'organisation du dépôt, vérifier avec `clasp status` que seuls les fichiers GAS attendus sont pris en compte.

## Création de `.env.example`

Créer un exemple sans secret :

```dotenv
# Exemple uniquement. Ne pas mettre de valeur réelle dans ce fichier.
SHEET_ID=
```

Le vrai `SHEET_ID` ne doit pas être lu depuis un fichier `.env` dans le code GAS. Dans Apps Script, il doit être configuré dans les propriétés du script et récupéré par :

```js
PropertiesService.getScriptProperties().getProperty('SHEET_ID')
```

## Création de `scripts/check_no_secrets.sh`

Créer un script simple de contrôle :

```bash
#!/usr/bin/env bash
set -euo pipefail

blocked_files=(
  ".env"
  ".clasp.json"
  ".clasprc.json"
  "credentials.json"
  "token.json"
)

for file in "${blocked_files[@]}"; do
  if git ls-files --error-unmatch "$file" >/dev/null 2>&1; then
    echo "Erreur : fichier sensible suivi par Git : $file" >&2
    exit 1
  fi
done

echo "Contrôle anti-secrets terminé."
```

Le script peut être enrichi avec des motifs propres au projet, mais il ne doit jamais afficher de secret dans la sortie.

## Connexion à Google Apps Script avec clasp

Dans Codespaces :

```bash
npm install
npm run clasp:login
```

ou directement :

```bash
clasp login --no-localhost
```

Suivre le lien affiché, se connecter au compte Google autorisé, puis coller le code demandé dans le terminal Codespaces.

## Création locale de `.clasp.json`

Créer localement `.clasp.json` à partir de `.clasp.example.json` :

```json
{
  "scriptId": "VOTRE_SCRIPT_ID_APPS_SCRIPT",
  "rootDir": "src/gas"
}
```

Points importants :

- `rootDir` doit rester égal à `src/gas`.
- `.clasp.json` doit rester ignoré par Git.
- Ne jamais copier ce fichier dans une issue, une pull request ou une documentation publique.

## Importer le projet Apps Script

Après connexion et création de `.clasp.json` :

```bash
npm run clasp:pull
```

ou :

```bash
clasp pull
```

Vérifier ensuite que les fichiers Apps Script sont présents dans `src/gas/` et relire les différences avec :

```bash
git status
npm run clasp:status
```

## Pousser vers Apps Script

Utiliser `clasp push` uniquement après relecture complète :

```bash
npm run check:secrets
git diff
npm run clasp:status
npm run clasp:push
```

Ne jamais pousser si :

- un `SHEET_ID` est écrit en dur ;
- un scoring clinique a été modifié sans validation ;
- des données patients réelles sont présentes ;
- la logique métier a été modifiée par accident.

## Workflow Git recommandé

1. Mettre à jour la branche principale.
2. Créer une branche dédiée : `git checkout -b docs/codespaces-codex`.
3. Faire des modifications courtes et relisibles.
4. Lancer `npm run check:secrets` si `package.json` est présent, ou `bash scripts/check_no_secrets.sh` directement.
5. Vérifier `git status` et `git diff`.
6. Commiter avec un message clair.
7. Ouvrir une pull request GitHub.
8. Relire la PR en vérifiant qu'aucun secret ni aucune donnée patient réelle n'est présent.

## Checklist end-to-end après configuration

- [ ] Le Codespace démarre sans erreur.
- [ ] `node --version` affiche une version 20.x.
- [ ] `gh --version` fonctionne.
- [ ] `clasp --version` fonctionne.
- [ ] `npm run check:secrets` passe.
- [ ] `.clasp.json` existe localement mais n'est pas suivi par Git.
- [ ] `.clasp.json` contient `"rootDir": "src/gas"`.
- [ ] `clasp status` ne liste que les fichiers attendus.
- [ ] `clasp pull` importe correctement le projet GAS.
- [ ] `src/gas/Code.gs`, `src/gas/Questions.gs`, `src/gas/index.html` et `src/gas/appsscript.json` sont présents après import.
- [ ] Aucun `SHEET_ID` n'est écrit en dur.
- [ ] Aucun fichier `.env` réel, jeton, identifiant Google ou export patient n'est suivi par Git.
- [ ] `clasp push` n'est lancé qu'après relecture et validation des différences.
