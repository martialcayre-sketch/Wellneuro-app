# Migration de l'environnement Wellneuro-app vers un MacBook

> Rédigé le 2026-07-19. Contexte : le dev container actuel (`wellneuro-app — Dev`)
> tourne en **x86_64 (amd64)** sous **WSL2/Windows**. Cible : MacBook (souvent
> **Apple Silicon / arm64**).

## TL;DR

- **Ne PAS copier l'image Docker du conteneur** : ton code n'y est pas, et
  l'image amd64 ne tourne qu'en émulation sur Apple Silicon.
- Le conteneur `wellneuro-app — Dev` est **reproductible** depuis
  `.devcontainer/devcontainer.json` → on le **reconstruit** sur le Mac.
- Ce qui compte à migrer, ce sont **3 zones de stockage distinctes** (voir plus bas).

## Les 3 zones de stockage (crucial)

| Zone | Contenu | Récupéré par `git clone` ? | Récupéré par copie du dossier ? |
|---|---|---|---|
| **1. Dossier hôte Windows** `C:\…\Wellneuro-app` (bind-mount 9p → `/workspaces/Wellneuro-app`) | code, `.git`, branches, stashes, WIP, `.env.local` | seulement `main` (le poussé) | ✅ tout |
| **2. Volumes Docker nommés** `…-claude-home` (`/home/node/.claude`) et `…-codex-home` (`/home/node/.codex`) | état Claude Code (dont mémoire projet), config Codex | ❌ non | ❌ non (hors dossier) |
| **3. Couche éphémère du conteneur** | outils installés, token `gh` (`/home/node/.config/gh`), credentials git | ❌ non | ❌ non |

## Ce qu'un simple `git clone` PERD (local-seulement, non poussé)

- Branche **`feat/ux-vague1-patient`** (0 commit au-delà de main — travail 100 % non commité).
- Branche `worktree-bridge-cse_…` (infra harnais, pas du vrai code).
- **WIP `vague-1-ux`** : 6 fichiers modifiés + `PlaintesForm.test.tsx` (non suivi).
- **5 stashes** (SP-RUN, observability/Sentry, audit… datés 07-14→07-17, probablement périmés).
- `web/.env.local`, `web/.env.vercel.tmp` (gitignorés — secrets).
- Token `gh` (`~/.config/gh`), credentials git.
- Mémoire/état Claude (`/home/node/.claude`, volume Docker).

Le `.git` ne pèse que ~7 Mo ; le reste (~1,3 Go dont `node_modules` ~1,1 Go) est
**reconstructible** et ne doit pas être copié.

---

## Option A — Clone + push (recommandée : propre, arm64 natif)

**Sur le conteneur actuel — sauver le local-only vers origin :**

```bash
# 1. WIP vague1 (travail de l'autre instance — le faire committer/pousser PAR elle) :
git add -A && git commit -m "wip(ux-vague1): sauvegarde avant migration"
git push -u origin feat/ux-vague1-patient

# 2. Stashes à garder → exporter en patchs (un clone ne les emporte pas) :
git stash show -p 'stash@{0}' > ~/stash-0.patch   # répéter {1}..{4} si utiles
```

**Sur le MacBook :**

```bash
# 3. Cloner (récupère main + feat/ux-vague1-patient une fois poussée)
git clone https://github.com/martialcayre-sketch/Wellneuro-app.git
cd Wellneuro-app

# 4. Reconstruire l'env — VS Code → "Dev Containers: Reopen in Container"
#    (build NATIF arm64 depuis .devcontainer/ ; ne pas copier l'image amd64)

# 5. Dépendances fraîches + client Prisma
cd web && npm install && npx prisma generate

# 6. Recréer les secrets (ne PAS copier) :
#    - web/.env.local  → valeurs depuis Vercel / gestionnaire de secrets
#    - gh auth login    → régénérer le token
```

Perdu volontairement : node_modules (réinstallé), worktrees (recréés au besoin),
stashes non exportés, état Claude. Rien de précieux si le WIP vague1 est poussé (étape 1).

---

## Option B — Copier le dossier hôte Windows en entier

On copie **`C:\…\Wellneuro-app`** (le dossier 9p), **pas** l'image Docker.

```bash
# Windows → Mac, en EXCLUANT node_modules, .next, dist (réinstallables)
```

**Après copie, sur le Mac :**

```bash
git worktree repair    # worktrees en chemins absolus /workspaces/… → cassés
cd web && npm install  # node_modules amd64 inutilisables sur arm64
```

Suit : ✅ branches, ✅ stashes, ✅ WIP, ✅ secrets `.env.local`.
Caveats : ⚠️ tu copies les **secrets** (canal sécurisé obligatoire) ; ⚠️ `git worktree repair` ;
⚠️ lock du bridge périmé ; ⚠️ tu bouges le WIP **actif** de l'autre instance (coordination).

Ne capture toujours PAS les **volumes Docker** (`.claude`, `.codex`). Pour eux, si vraiment utiles :

```bash
# Exporter un volume nommé côté source :
docker run --rm -v <basename>-claude-home:/data -v "$PWD":/backup alpine \
  tar czf /backup/claude-home.tgz -C /data .
# …puis réimporter dans le volume équivalent côté Mac.
```

---

## Décision rapide

| Situation | Choix |
|---|---|
| Environnement **propre**, sans traîner secrets/node_modules amd64 | **Option A** |
| **Exactement** l'état actuel, stashes inclus, tout de suite | **Option B** |
| MacBook **Apple Silicon** | dans tous les cas, **reconstruire** le devcontainer (jamais copier l'image amd64) |

**Non négociable** : copier le conteneur Docker `wellneuro-app — Dev` lui-même ne
sert à rien (le code n'y est pas + mauvaise architecture).
