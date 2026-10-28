### Outillage : revue automatique des PR par PR-Agent, sur l'API Anthropic (2026-10-28)

- Nouveau workflow `.github/workflows/pr_agent.yml` : PR-Agent (Qodo, open
  source) revoit et décrit chaque PR à l'ouverture, puis la revoit en
  entier à chaque push (`/review`). Il répond aussi aux
  commandes en commentaire (`/review`, `/describe`, `/ask`…), mais seulement
  quand elles viennent d'un membre du dépôt : le dépôt est public. Rapports
  en français.
- Image épinglée par empreinte (`pragent/pr-agent:0.49.0-github_action`) :
  l'action reçoit la clé Anthropic et un jeton d'écriture sur les PR. Une
  montée de version passe donc par une PR relue.
- Modèles : Claude Sonnet 5.5 pour la revue, et en repli ; Haiku 5.5 pour
  la description. Aucune clé OpenAI. Secret requis : `ANTHROPIC_API_KEY`.
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
- `.coderabbit.yaml` inchangé. Condition de merge (D-393, qui amende
  D-290 §1 et §3) : CodeRabbit sur la tête ; s'il la saute ou bute sur son
  quota, la revue de PR-Agent sur la tête le remplace. Le workflow est gardé
  par sa file, comme `.coderabbit.yaml`.
- Premier run constaté sur la PR elle-même : la revue est publiée et son bloc
  d'état caché nomme le sha revu. Trois correctifs suivent :
  - Haiku 5.5 refuse `temperature`, ce qui faisait échouer la description et
    tomber le job ; il est déclaré dans `no_temperature_models` ;
  - un commentaire ne peut plus annuler une revue en cours : chaque run sur
    commentaire a son propre groupe de concurrence ;
  - à l'ouverture ou au push, une PR venue d'un fork ne lance plus le job,
    qui n'y aurait ni clé ni jeton d'écriture ;
  - au push, la revue est complète et non plus incrémentale. `/review -i`,
    constaté au premier push, ne nommait pas la tête et, après une fusion
    de `main`, relisait le code de `main` comme s'il venait de la PR ;
  - le repli passe de Haiku à Sonnet : une revue de Haiku comptait sans
    trace.
