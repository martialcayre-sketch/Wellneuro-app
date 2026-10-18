### Liens de courriel : plus de repli `localhost` possible en production (J1-base, 2026-10-18)

- Le lien magique, le lien de connexion et le lien du Fil du jour (courriel
  d'alerte au praticien) se replient sur `http://localhost:3000` quand
  `NEXTAUTH_URL` manque. Ils partagent désormais une seule base.
- En production (`WN_DEPLOY_ENV=production`), le serveur refuse de démarrer
  sans `NEXTAUTH_URL`, avec une trace fatale : aucun lien vers `localhost` ne
  peut partir. C'est une panne franche, assumée plutôt qu'un service faux
  (sans la variable, les connexions Google cassent aussi). Le repli ne sert
  plus qu'en développement.
- La variable est posée en production (constat du 2026-10-18) : rien ne
  change à l'usage.
