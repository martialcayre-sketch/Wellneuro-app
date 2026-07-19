# Migration de l'environnement Wellneuro-app vers un MacBook

> Rédigé le 2026-07-19. Le dépôt ne fournit plus de Dev Container ; la cible est un environnement local natif sur MacBook, le plus souvent en Apple Silicon (`arm64`).

## TL;DR

- Ne copie pas `node_modules`, `.next` ni d'artefacts de build entre machines.
- Le plus propre est de cloner le dépôt sur le Mac, puis de réinstaller localement Node 22 et les dépendances.
- Ce qu'il faut préserver explicitement, ce sont les éléments locaux non poussés : branches, stashes, worktrees utiles, fichiers ignorés et éventuels réglages utilisateur.
- Si Windows n'est plus une machine de développement active, désinstaller Docker Desktop et les extensions conteneur évite une couche instable de plus.

## Ce qu'un simple `git clone` ne récupère pas

- Les branches locales non poussées
- Les stashes
- Les worktrees locaux
- Les fichiers ignorés comme `web/.env.local`
- Les authentifications locales (`gh auth`, credentials Git selon la machine)
- Les états locaux d'outils IA comme `~/.claude` et `~/.codex`

## Option A — Clone propre sur le Mac (recommandée)

Sur la machine source, sauver ce qui doit l'être :

```bash
git status
git branch
git stash list
```

Si du travail local doit être conservé, le pousser ou l'exporter avant migration.

Sur le MacBook :

```bash
git clone https://github.com/martialcayre-sketch/Wellneuro-app.git
cd Wellneuro-app
cd web && npm install
npx prisma generate
```

Puis recréer localement les secrets nécessaires à partir des sources autorisées, sans copier un fichier `.env` réel via un canal non maîtrisé.

## Option B — Copier le dossier de travail

Cette option garde branches locales, stashes et fichiers ignorés, mais elle transporte aussi des artefacts et potentiellement des secrets.

Conseils :

- exclure `node_modules`, `.next` et autres sorties reconstruites ;
- exécuter `git worktree repair` si des worktrees existent ;
- relancer `cd web && npm install` sur le Mac ;
- vérifier manuellement les fichiers ignorés avant copie.

## Checklist de remise en route sur le Mac

Première installation complète de la machine :

```bash
bash scripts/bootstrap-mac-system.sh
```

Ce script prépare Homebrew, Git, GitHub CLI, Node 22, Vercel CLI, VS Code, puis enchaîne avec le bootstrap du dépôt.

Variantes utiles :

```bash
bash scripts/bootstrap-mac-system.sh --skip-vscode
bash scripts/bootstrap-mac-system.sh --skip-repo-bootstrap
bash scripts/bootstrap-mac-system.sh --environment preview
```

Bootstrap dépôt seul :

```bash
node -v
cd web && npm install
cd web && npx prisma generate
cd web && npm run type-check
bash scripts/check_no_secrets.sh
```

Bootstrap recommandé en une commande après clonage :

```bash
bash scripts/bootstrap-mac.sh
```

Variantes utiles :

```bash
bash scripts/bootstrap-mac.sh --skip-env-pull
bash scripts/bootstrap-mac.sh --environment preview
```

Si l'application doit démarrer localement :

```bash
cd web && npm run dev
```

## Décision rapide

| Situation | Choix |
| --- | --- |
| Environnement propre, reproductible, sans historique local complexe | Option A |
| Besoin de conserver immédiatement branches locales, stashes et fichiers ignorés | Option B |

## Point d'attention

Le dépôt ne dépend plus d'un runtime conteneurisé. La référence d'exécution est désormais le setup local natif documenté dans `docs/CONTEXTE_VSCODE_PC_PARITE_CODESPACES.md`.

Le script de bootstrap ne s'exécute pas automatiquement au `git clone` : Git ne fournit pas de mécanisme standard et sûr pour auto-lancer un script de dépôt au clonage. Le mode recommandé est un lancement explicite en une commande.

Le script système suppose que les outils Apple en ligne de commande sont déjà installés. Si ce n'est pas le cas, lancer d'abord `xcode-select --install`.

## Nettoyage conseillé sur la machine Windows source

Quand le Mac devient le poste principal, tu peux simplifier la machine Windows :

- désinstaller Docker Desktop ;
- retirer les extensions VS Code conteneur et doublons IA ;
- garder uniquement le strict nécessaire pour une reprise ponctuelle.
