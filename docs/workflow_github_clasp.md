# Workflow GitHub + clasp

## Préparer l'environnement

1. Copier `.clasp.example.json` vers `.clasp.json`.
2. Renseigner le `scriptId` local.
3. Conserver `rootDir: "src/gas"`.
4. Ne jamais committer `.clasp.json` ni `.clasprc.json`.

## Pousser vers Apps Script

Depuis la racine du dépôt :

```bash
clasp push
```

La configuration `rootDir` et `.claspignore` évitent d'envoyer tout le dépôt dans Apps Script.

## Cycle de développement recommandé

1. Créer une branche de travail.
2. Modifier uniquement les fichiers nécessaires.
3. Exécuter `bash scripts/check_no_secrets.sh`.
4. Tester manuellement dans l'environnement GAS de développement.
5. Ouvrir une pull request vers `main` avec risques et tests manuels restants.
