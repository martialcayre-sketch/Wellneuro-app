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

Le bootstrap ne touche jamais à `web/.env.local` : s'il est absent, le script
dit quoi y mettre (une `DATABASE_URL` vers une base Postgres locale de
développement ; le reste : `docs/claude/REGLES_CRITIQUES.md`). Crée-le à la
main — jamais committé — puis relance :

```bash
bash scripts/bootstrap-mac.sh
```

Pour préparer seulement la machine, sans le bootstrap du dépôt :

```bash
bash scripts/bootstrap-mac-system.sh --skip-repo-bootstrap
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
