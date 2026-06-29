# Contexte VS Code local (PC) — parité Codespaces Wellneuro-app

Objectif: reproduire le plus fidèlement possible le workspace et l'environnement de développement Codespaces sur ton PC.

Nom de workspace local recommandé: `Wellneuro-app.code-workspace`.

## Niveau de parité recommandé

La parité la plus fiable se fait avec Dev Containers en local (même image, mêmes commandes de bootstrap, mêmes extensions).

## Option A (recommandée): parité quasi parfaite via Dev Container local

## Pré-requis

- VS Code (stable)
- Docker Desktop (ou Docker Engine)
- Extension VS Code `ms-vscode-remote.remote-containers`
- Git

## Procédure

1. Cloner le dépôt:

```bash
git clone https://github.com/martialcayre-sketch/Wellneuro.git Wellneuro-app
cd Wellneuro-app
```

1. Ouvrir le dossier dans VS Code.

1. Lancer la commande VS Code:

- `Dev Containers: Reopen in Container`

1. Laisser finir l'initialisation.

Le conteneur applique automatiquement `.devcontainer/devcontainer.json`:

- Image: `mcr.microsoft.com/devcontainers/javascript-node:20`
- `postCreateCommand`: `npm install -g @google/clasp && npm install`
- Extensions installées dans le conteneur:
  - `esbenp.prettier-vscode`
  - `dbaeumer.vscode-eslint`
- `NODE_ENV=development`

1. Vérifier la parité:

```bash
node -v
npm -v
clasp -v
bash scripts/check_no_secrets.sh
```

## Option B: environnement natif local (si Docker indisponible)

Cette option est proche, mais moins parfaite que l'Option A.

## Pré-requis techniques

- Node.js 20.x
- npm
- GitHub CLI (`gh`)
- `@google/clasp`

## Setup

```bash
npm install -g @google/clasp
npm install
```

Authentification clasp (locale):

```bash
clasp login
```

Configuration Apps Script locale:

1. Copier `.clasp.example.json` vers `.clasp.json`.
2. Mettre le `scriptId` local.
3. Vérifier `rootDir: "src/gas"`.

## Cohérence VS Code (recommandé)

Installer au minimum les extensions:

- `esbenp.prettier-vscode`
- `dbaeumer.vscode-eslint`
- `github.copilot`
- `github.copilot-chat`

## Routine de travail (identique Codespaces)

Avant toute mise en prod:

```bash
bash scripts/check_no_secrets.sh
git diff
clasp status
```

Déploiement standard:

```bash
bash scripts/deploy.sh "feat: description"
```

## Contrôles d'alignement

Pour garder une cohérence de développement stricte entre PC et Codespaces:

- Utiliser le même Node major (`20.x`).
- Développer depuis la racine du dépôt.
- Garder `src/gas` comme seule source Apps Script.
- Ne jamais committer de secrets (`.clasp.json`, `.clasprc.json`, `.env*` réels).
- Exécuter `bash scripts/check_no_secrets.sh` avant chaque commit important.

## Définition de "parité parfaite"

Dans ce projet, la parité parfaite signifie:

- même image d'exécution Node (via Dev Container),
- mêmes dépendances npm,
- même outillage (`clasp`, scripts repo),
- mêmes extensions VS Code,
- mêmes contrôles sécurité et même workflow de déploiement.

Si tu veux le strict 1:1 avec Codespaces, utilise systématiquement l'Option A (Dev Container local).
