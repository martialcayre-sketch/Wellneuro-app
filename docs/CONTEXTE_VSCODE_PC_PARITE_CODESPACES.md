# Environnement VS Code local — Wellneuro-app

Objectif : disposer d'un setup local natif, simple et stable, sans dépendance Docker ni Dev Container. L'environnement de référence est maintenant un poste principal en local, idéalement sur MacBook.

## Architecture du projet

Le développement actif se fait uniquement dans `web/` (Next.js 14 + TypeScript + Tailwind CSS). Le code GAS historique est archivé dans `archive/gas-legacy/` : il n'est plus une couche active du projet, seulement une référence.

## Setup local de référence

Prérequis :

- VS Code (stable)
- Node.js 22.x
- Git optionnellement accompagné de GitHub CLI (`gh`)

Poste recommandé :

- MacBook comme machine principale de développement
- Windows seulement en secours temporaire
- Chromebook réservé aux accès web ponctuels et intégrations IA distantes, pas au développement principal du dépôt

Procédure :

```bash
git clone https://github.com/martialcayre-sketch/wellneuro-app.git wellneuro-app
cd wellneuro-app
cd web && npm install
```

Si l'application requiert des variables d'environnement locales, partir de `web/.env.local.example`, renseigner les valeurs attendues, puis ne jamais committer le fichier réel.

## Extensions VS Code recommandées

- `esbenp.prettier-vscode`
- `dbaeumer.vscode-eslint`
- `bradlc.vscode-tailwindcss`
- `davidanson.vscode-markdownlint`
- `eamodio.gitlens`
- `github.copilot`
- `github.copilot-chat`
- `openai.chatgpt`
- `anthropic.claude-code`

Extensions à éviter dans ce dépôt si tu n'en as pas un besoin explicite :

- `ms-vscode-remote.remote-containers`
- `ms-azuretools.vscode-containers`
- `growthjack.claude-code-usage`
- `andrepimenta.claude-code-chat`

## Settings VS Code — source de vérité

`.vscode/settings.json` est la source de vérité des réglages partagés du dépôt.

`Wellneuro-app.code-workspace` reprend ces réglages et ajoute des tâches de confort local. Utiliser ce fichier en local si tu veux retrouver rapidement les tâches depuis la palette.

## Gouvernance de configuration

Chaque type de configuration a une source de vérité unique :

| Type | Source de vérité | Rôle |
| --- | --- | --- |
| Runtime local (version Node, dépendances applicatives) | `web/package.json` et `web/package-lock.json` | Reproductibilité de l'environnement local |
| Réglages éditeur partagés du dépôt | `.vscode/settings.json` | Comportement commun de l'éditeur |
| Raccourcis de tâches et confort local | `Wellneuro-app.code-workspace` | Accès rapide aux tâches sans changer le runtime |
| Extensions recommandées du dépôt | `.vscode/extensions.json` | Socle minimum proposé au développeur |

Règle pratique :

- ne pas dupliquer des réglages IA dans plusieurs fichiers ;
- ne pas mettre dans le workspace des paramètres qui changent le runtime applicatif ;
- toute exception doit être documentée dans ce fichier.

## Standard cross-repo (profil VS Code)

Objectif : mêmes extensions quel que soit le dépôt, sans recopier une politique différente dans chaque projet.

Procédure recommandée :

1. Créer un profil VS Code `Wellneuro Dev` (extensions + settings non sensibles).
1. Y inclure le socle : Prettier, ESLint, Tailwind, Copilot, Copilot Chat, OpenAI ChatGPT et Claude Code.
1. Activer la synchronisation de profil sur les machines de travail.

## Persistance des sessions IA

En local natif, les états et historiques d'outils IA restent dans les emplacements utilisateur habituels de la machine.

Repères utiles :

- Codex : `~/.codex`
- Claude Code : `~/.claude`
- VS Code : profil et logs utilisateur de la machine

Sur un nouveau poste, ces données ne suivent pas automatiquement le dépôt Git.

## Diagnostic rapide

1. Vérifier la version de Node et npm :

```bash
node -v
npm -v
```

1. Vérifier les extensions actives :

```bash
code --list-extensions --show-versions
```

1. Vérifier les contrôles de base du dépôt :

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```

1. Vérifier que l'environnement n'est plus pollué par Docker côté poste local :

```bash
docker --version
# attendu : commande absente si Docker a été désinstallé volontairement
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

## Routine avant tout commit

```bash
bash scripts/check_no_secrets.sh
git diff
cd web && npm run type-check
```

## Définition de la parité attendue

- Même version majeure de Node (`22.x`)
- Mêmes dépendances applicatives installées depuis `web/package-lock.json`
- Même port local de développement (`3000`)
- Mêmes extensions VS Code recommandées
- Mêmes settings éditeur partagés
- Mêmes scripts de sécurité et de validation

## Décision de setup recommandée

- Développement principal : MacBook en local natif
- Usage secondaire : accès distant léger depuis navigateur si nécessaire
- Pas de dépendance Docker pour le flux quotidien
