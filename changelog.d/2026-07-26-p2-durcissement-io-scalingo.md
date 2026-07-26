### Durcissement I/O pour l'hébergement conteneurisé — timeouts SMTP et embeddings (2026-07-26)

Préparation à l'hébergement Scalingo (série HDS, après #347/#356). Sur un
conteneur persistant, il n'y a plus le `maxDuration` serverless de Vercel qui
coupait un traitement bloqué : un service externe qui pend retiendrait la
requête indéfiniment. Deux appels I/O du chemin de requête sont donc bornés.

- **SMTP** : les huit envois `nodemailer` passent désormais par un transport
  partagé `creerTransportSmtp` (`web/src/lib/email/transportSmtp.ts`) qui borne
  connexion, accueil et socket (10/10/20 s) via les query params de l'URL de
  connexion. La sémantique ne change pas : un envoi qui pendait à l'infini
  échoue maintenant comme n'importe quel échec SMTP, et la gestion d'erreur
  existante de chaque appelant (best-effort ou remontée) s'applique telle quelle.
- **Embeddings** : `createEmbeddings` borne son appel OpenAI à 30 s
  (`AbortSignal.timeout`), et surface un message clair à l'expiration.

Aucun changement de comportement sur Vercel : ces bornes sont largement au-dessus
du temps d'un service sain, et sous le seuil « premier octet » de 30 s du routeur
Scalingo. Rien n'est mis derrière un drapeau — un timeout est une amélioration de
robustesse valable sur les deux hébergeurs.
