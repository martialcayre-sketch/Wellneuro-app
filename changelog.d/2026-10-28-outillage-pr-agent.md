### Outillage : revue automatique des PR par PR-Agent, sur l'API Anthropic (2026-10-28)

- Nouveau workflow `.github/workflows/pr_agent.yml` : PR-Agent (Qodo, open
  source) revoit et décrit chaque PR à l'ouverture, puis revoit les seuls
  nouveaux commits à chaque push (`/review -i`). Il répond aussi aux
  commandes en commentaire (`/review`, `/describe`, `/ask`…), mais seulement
  quand elles viennent d'un membre du dépôt : le dépôt est public. Rapports
  en français.
- Image épinglée par empreinte (`pragent/pr-agent:0.49.0-github_action`) :
  l'action reçoit la clé Anthropic et un jeton d'écriture sur les PR. Une
  montée de version passe donc par une PR relue.
- Modèles : Claude Sonnet 5.5 pour la revue, Haiku 5.5 pour les tâches
  simples et en repli. Aucune clé OpenAI. Secret requis : `ANTHROPIC_API_KEY`.
- La description générée est publiée en commentaire : le corps de la PR,
  rédigé par `--body-file`, n'est jamais écrasé. Aucune étiquette.
- Économie : fichiers de clôture (changelog, handoffs, journal du plan,
  SESSION_LOG), `package-lock.json`, images et instantanés jamais envoyés au
  modèle ; une PR qui ne touche que la clôture ne déclenche rien ; contexte
  plafonné à 32 000 jetons par appel.
- Consignes de revue en français, reprises des règles non négociables du
  dépôt : textes de l'interface en français, ni secret ni donnée patient,
  aucun seuil clinique sans D-xxx, contrôle d'accès des routes API,
  migrations et RLS, drapeaux `WN_*`, rien hors du périmètre.
- `.coderabbit.yaml` inchangé. D-290 n'est pas amendé : la revue de
  `coderabbitai[bot]` sur la tête reste la condition du merge. PR-Agent
  s'ajoute, il ne remplace rien.
