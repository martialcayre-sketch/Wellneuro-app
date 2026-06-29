# AGENTS.md — Wellneuro NNPP2

## Identité du projet

Wellneuro NNPP2 est un MVP Google Apps Script destiné à accompagner un parcours de consultation en neuronutrition. Le dépôt doit rester centré sur la stabilisation du MVP GAS tant qu'une migration n'est pas explicitement demandée.

## Architecture actuelle

- `Code.gs` : logique serveur GAS
- `Questions.gs` : catalogue questionnaires et moteurs de scoring
- `index.html` : interface HTML patient/praticien
- `appsscript.json` : manifeste Apps Script
- Google Sheets sert de base de données

## Chemins importants

- Documentation Codespaces et clasp : `docs/CONFIGURATION_CODESPACES_CODEX.md`
- Scripts de contrôle : `scripts/`
- Exemple de configuration clasp : `.clasp.example.json`
- Exemple d'environnement sans secret : `.env.example`

## Règles critiques de sécurité

- Ne jamais écrire de `SHEET_ID` en dur dans le code ou les commits
- Le `SHEET_ID` doit être récupéré uniquement avec :
  `PropertiesService.getScriptProperties().getProperty('SHEET_ID')`
- Ne jamais committer de données patients réelles
- Ne jamais committer de clés API, fichiers `.env` réels, `.clasp.json`, `.clasprc.json`, identifiants Google, jetons OAuth, exports patients ou fichiers de résultats réels
- Les seuls patients fictifs autorisés sont : Sophie Nicola, Jennifer Martin et Michel Dogné

## Règles RGPD et données de santé

- Minimiser les données manipulées dans le dépôt
- Anonymiser ou fictiviser toute donnée de démonstration
- Refuser l'ajout de données patient identifiantes ou réalistes
- Ne pas inclure de secrets dans les journaux, captures, commits, issues ou pull requests

## Règles cliniques et scoring

- Ne pas modifier la logique clinique existante sans demande explicite
- Ne pas modifier les seuils de scoring sans source et documentation
- Ne pas inventer de questionnaire, score, seuil ou recommandation clinique
- Toute modification clinique doit être documentée dans `CHANGELOG.md`

## Priorités produit et techniques

- Priorité actuelle : stabiliser le MVP Google Apps Script
- Ne pas commencer la migration Next.js, PostgreSQL, Auth0 ou hébergement HDS sans demande explicite
- Ne pas modifier la logique métier sans consigne claire
- Ne pas modifier `Code.gs`, `Questions.gs` ou `index.html` pour une tâche purement documentaire

## Règles de style

- Interface et textes utilisateur en français
- Code lisible pour un praticien non-développeur
- Fonctions courtes, noms explicites, commentaires utiles
- Éviter les abstractions prématurées
- Préserver les noms et structures existants sauf demande explicite

## Commandes utiles

```bash
clasp login --no-localhost
clasp pull
clasp status
clasp push
bash scripts/check_no_secrets.sh
```

## Configuration Codespaces

Pour configurer GitHub Codespaces, clasp et l'environnement de développement GAS, consulter :
`docs/CONFIGURATION_CODESPACES_CODEX.md`

## Consignes pour Codex et agents IA

- Lire ce fichier avant toute modification
- Vérifier l'état Git avant de modifier le dépôt
- Préserver le contenu utile des fichiers existants
- Ne pas écraser une configuration locale ou un secret
- Mentionner clairement les fichiers modifiés dans les réponses et pull requests
