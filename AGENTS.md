# AGENTS.md — NutriConsult NNPP2

## Identité du projet

NutriConsult NNPP2 est un MVP Google Apps Script destiné à accompagner un parcours de consultation en neuronutrition. Le dépôt doit rester centré sur la stabilisation du MVP GAS tant qu'une migration n'est pas explicitement demandée.

## Architecture actuelle

L'architecture actuelle est un projet Google Apps Script simple. Les fichiers applicatifs attendus sont :

- `src/gas/Code.gs` : logique serveur GAS.
- `src/gas/Questions.gs` : questions et contenus du questionnaire.
- `src/gas/index.html` : interface HTML servie par Apps Script.
- `src/gas/appsscript.json` : manifeste Apps Script.

Si ces fichiers ne sont pas encore présents localement, ils peuvent être importés depuis le projet Apps Script avec `clasp pull` après configuration de clasp.

## Chemins importants

- Documentation Codespaces et clasp : `docs/CONFIGURATION_CODESPACES_CODEX.md`.
- Sources GAS : `src/gas/`.
- Scripts de contrôle : `scripts/`.
- Exemple de configuration clasp : `.clasp.example.json`.
- Exemple d'environnement sans secret : `.env.example`.

## Règles critiques de sécurité

- Ne jamais écrire de `SHEET_ID` en dur dans le code, la documentation de configuration privée ou les commits.
- Le `SHEET_ID` doit être récupéré uniquement avec :

  ```js
  PropertiesService.getScriptProperties().getProperty('SHEET_ID')
  ```

- Ne jamais committer de données patients réelles.
- Ne jamais committer de clés API, fichiers `.env` réels, `.clasp.json`, `.clasprc.json`, identifiants Google, jetons OAuth, exports patients ou fichiers de résultats réels.
- Ne pas créer de données de santé réelles pour les tests, les exemples ou les captures.
- Les seuls patients fictifs autorisés dans les exemples et tests sont : Sophie Nicola, Jennifer Martin et Michel Dogné.
- Les exports et fichiers locaux contenant des données sensibles doivent rester hors Git, notamment dans `exports/`, `data/private/`, `patients_reels/` ou `resultats_reels/`.

## Règles RGPD et données de santé

- Minimiser les données manipulées dans le dépôt.
- Anonymiser ou fictiviser toute donnée de démonstration.
- Refuser l'ajout de données patient identifiantes ou réalistes.
- Ne pas inclure de secrets dans les journaux, captures, commits, issues ou pull requests.
- Préférer des exemples courts, fictifs et explicitement non réels.

## Priorités produit et techniques

- Priorité actuelle : stabiliser le MVP Google Apps Script.
- Ne pas commencer la migration Next.js, PostgreSQL, Auth0 ou hébergement HDS sans demande explicite.
- Ne pas modifier la logique métier sans consigne claire.
- Ne pas modifier les scorings cliniques sans validation métier explicite.
- Ne pas modifier `src/gas/Code.gs`, `src/gas/Questions.gs` ou `src/gas/index.html` pour une tâche purement documentaire.

## Règles de style

- Garder un code simple, lisible et facile à relire.
- Ajouter des commentaires en français lorsque la logique métier, clinique ou de sécurité est importante.
- Éviter les abstractions prématurées.
- Préserver les noms et structures existants sauf demande explicite.
- Documenter les commandes et procédures en français.

## Commandes utiles

```bash
npm run check:secrets
npm run clasp:login
npm run clasp:pull
npm run clasp:status
npm run clasp:push
npm run clasp:open
```

Commandes directes utiles :

```bash
clasp login --no-localhost
clasp pull
clasp status
clasp push
```

## Configuration Codespaces

Pour configurer GitHub Codespaces, clasp et l'environnement de développement GAS, consulter :

`docs/CONFIGURATION_CODESPACES_CODEX.md`

## Consignes pour Codex et agents IA

- Lire ce fichier avant toute modification.
- Vérifier l'état Git avant de modifier le dépôt.
- Préserver le contenu utile des fichiers existants.
- Ne pas écraser une configuration locale ou un secret.
- Lancer les contrôles disponibles après modification documentaire ou technique.
- Mentionner clairement les fichiers modifiés dans les réponses et pull requests.
