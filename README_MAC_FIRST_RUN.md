# Mac First Run

But : mettre en route un Mac neuf pour Wellneuro avec le moins d'étapes possible.

## Commandes

```bash
xcode-select --install
git clone https://github.com/martialcayre-sketch/Wellneuro-app.git
cd Wellneuro-app
bash scripts/bootstrap-mac-system.sh
```

## Si le script s'arrête

Cas 1 : Vercel n'est pas encore connecté.

```bash
gh auth login
vercel login
cd web
vercel link
cd ..
bash scripts/bootstrap-mac.sh
```

Cas 2 : tu veux récupérer les variables plus tard.

```bash
bash scripts/bootstrap-mac-system.sh --skip-env-pull
```

## Démarrer l'application

```bash
cd web
npm run dev
```

## Vérifier rapidement

```bash
bash scripts/check_no_secrets.sh
cd web && npm run type-check
```

## Fichiers utiles

- `scripts/bootstrap-mac-system.sh` : prépare la machine puis le dépôt
- `scripts/bootstrap-mac.sh` : bootstrap du dépôt seul
- `docs/MIGRATION_MAC.md` : version détaillée
- `docs/TRANSFERT_ENV_MAC.md` : transfert des variables d'environnement
