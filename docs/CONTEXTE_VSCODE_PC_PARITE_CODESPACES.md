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
node -v          # doit afficher v22.x
npm -v
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```

## Option B — environnement natif (si Docker indisponible)

Prérequis :

- Node.js 22.x
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
- `openai.chatgpt`
- `anthropic.claude-code`

## Settings VS Code — source de vérité

`.vscode/settings.json` est la source de vérité appliquée dans **les deux environnements** (Codespaces ouvre le dossier directement, pas le fichier `.code-workspace`).

`Wellneuro-app.code-workspace` reprend les mêmes settings + ajoute les tâches de raccourci. Utiliser ce fichier en local pour accéder aux tâches depuis la palette.

## Gouvernance de configuration (contrat d'équipe)

Pour éviter les divergences locales/remote, chaque type de configuration a une source de vérité unique :

| Type | Source de vérité | Rôle |
| --- | --- | --- |
| Runtime remote (image, volumes, bootstrap, extensions installées en conteneur) | `.devcontainer/devcontainer.json` | Reproductibilité Dev Container/Codespaces |
| Réglages éditeur partagés du dépôt | `.vscode/settings.json` | Comportement commun local + remote |
| Raccourcis de tâches et confort local (optionnel) | `Wellneuro-app.code-workspace` | Ouvrir vite les tâches sans redéfinir le runtime |
| Extensions recommandées du dépôt | `.vscode/extensions.json` | Socle minimum proposé au développeur |

Règle pratique :

- ne pas dupliquer des réglages IA dans plusieurs fichiers ;
- ne pas mettre dans le workspace des paramètres qui changent le runtime ;
- toute exception doit être documentée dans ce fichier.

## Baseline extensions IA (local + remote)

Baseline cible :

- Copilot / Copilot Chat (fournis nativement par VS Code dans cet environnement) ;
- Codex via `openai.chatgpt` ;
- Claude Code via `anthropic.claude-code`.

Décision pour les extensions "usage-only" :

- `growthjack.claude-code-usage` n'est pas un runtime Claude Code ;
- elle est classée "non baseline" (télémétrie/usage), donc non recommandée dans le dépôt ;
- bénéfice : métriques d'usage ;
- inconvénients : confusion fonctionnelle et bruit de diagnostic.

## Standard cross-repo (profil VS Code)

Objectif : mêmes extensions quel que soit le dépôt, sans dupliquer la politique dans chaque repo.

Procédure recommandée :

1. Créer un profil VS Code `Wellneuro Dev` (Extensions + Settings non sensibles).
1. Y inclure le socle : Prettier, ESLint, Tailwind, Copilot, Copilot Chat, OpenAI ChatGPT, Claude Code, Remote Containers.
1. Activer la synchronisation de profil sur les machines de travail.
1. Garder ce dépôt comme source de vérité runtime (`.devcontainer`) et settings partagés (`.vscode/settings.json`).

## Persistance des sessions IA

Le Dev Container persiste les emplacements suivants via volumes Docker :

- `/home/node/.vscode-server`
- `/home/node/.codex`
- `/home/node/.claude`

Matrice de persistance :

| Donnée | Reopen container | Rebuild container | Nouveau poste |
| --- | --- | --- | --- |
| Historique VS Code Server | Conservé | Conservé (volume) | Non (sauf sync cloud) |
| Données locales Codex (`~/.codex`) | Conservé | Conservé (volume) | Non |
| Données locales Claude (`~/.claude`) | Conservé | Conservé (volume) | Non |
| Session cloud Copilot/Claude/OpenAI | Conservée selon fournisseur | Conservée selon fournisseur | Conservée après reconnexion |

## Diagnostic rapide (runbook)

1. Vérifier les extensions actives :

```bash
code --list-extensions --show-versions | grep -Ei 'copilot|chatgpt|claude|anthropic|openai|github'
```

1. Vérifier les chemins de persistance :

```bash
ls -ld /home/node/.vscode-server /home/node/.codex /home/node/.claude
```

1. Vérifier les variables runtime remote :

```bash
env | grep -E 'CODEX_HOME|CLAUDE_HOME|NODE_ENV'
```

1. Vérifier les erreurs d'extensions récentes :

```bash
find /home/node/.vscode-server/data/logs -maxdepth 2 -type d | tail -n 1
# puis inspecter exthost1/* selon l'extension concernée
```

## Tâches disponibles (palette VS Code > Run Task)

| Tâche | Commande |
| --- | --- |
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

- Même image Node 22 (via Dev Container)
- Mêmes dépendances (`web/node_modules` installé au bootstrap)
- Même port 3000 forwardé
- Mêmes extensions VS Code (Prettier, ESLint, Tailwind)
- Mêmes settings éditeur (EOL, tabulations, formatage, ESLint TS)
- Mêmes scripts de sécurité
