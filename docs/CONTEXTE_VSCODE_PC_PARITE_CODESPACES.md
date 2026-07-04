# Parité VS Code local ↔ Codespaces — Wellneuro-app

Objectif : reproduire exactement l'environnement Codespaces sur le PC local (même image, mêmes dépendances, mêmes extensions, mêmes settings, même port forwarding).

## Architecture du projet

Le développement actif se fait uniquement dans `web/` (Next.js 14 + TypeScript + Tailwind CSS). Le code GAS historique est archivé dans `archive/gas-legacy/` : il n'est plus une couche active du projet, seulement une référence.

## Option A — parité parfaite via Dev Container (recommandée)

Prérequis :
- VS Code (stable)
- Docker Desktop (ou Docker Engine)
- Extension `ms-vscode-remote.remote-containers`

Procédure :

```bash
git clone https://github.com/martialcayre-sketch/wellneuro-app.git wellneuro-app
cd wellneuro-app
code .
# Puis : Dev Containers: Reopen in Container
```

Vérification post-démarrage :

```bash
node -v          # doit afficher v20.x
npm -v
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```

## Option B — environnement natif (si Docker indisponible)

Prérequis :
- Node.js 20.x
- GitHub CLI (`gh`) optionnel

```bash
cd web && npm install
cp .env.local.example .env.local   # renseigner les valeurs, ne jamais committer
```

Extensions VS Code à installer manuellement :
- `esbenp.prettier-vscode`
- `dbaeumer.vscode-eslint`
- `bradlc.vscode-tailwindcss`
- `github.copilot` + `github.copilot-chat`

## Settings VS Code — source de vérité

`.vscode/settings.json` est la source de vérité appliquée dans **les deux environnements** (Codespaces ouvre le dossier directement, pas le fichier `.code-workspace`).

`Wellneuro-app.code-workspace` reprend les mêmes settings + ajoute les tâches de raccourci. Utiliser ce fichier en local pour accéder aux tâches depuis la palette.

## Tâches disponibles (palette VS Code > Run Task)

| Tâche | Commande |
|---|---|
| `bootstrap-local` | Installe les dépendances web (`cd web && npm install`) |
| `dev-web` | Lance Next.js en mode dev (port 3000) |
| `type-check` | Vérifie les types TypeScript du projet web |
| `check-no-secrets` | Contrôle sécurité avant commit |

## Lancer l'app web en dev

```bash
cd web && npm run dev
# Puis ouvrir http://localhost:3000
```

En Codespaces, le port 3000 est forwardé automatiquement avec une notification.

## Routine avant tout commit

```bash
bash scripts/check_no_secrets.sh
git diff
cd web && npm run type-check
```

## Définition de la parité parfaite

- Même image Node 20 (via Dev Container)
- Mêmes dépendances (`web/node_modules` installé au bootstrap)
- Même port 3000 forwardé
- Mêmes extensions VS Code (Prettier, ESLint, Tailwind)
- Mêmes settings éditeur (EOL, tabulations, formatage, ESLint TS)
- Mêmes scripts de sécurité
