## 2026-08-25 — fix(portail): les atterrissages patient visent l'hôte public, plus `req.url`

Depuis le cutover Scalingo (2026-08-22), `req.url` porte l'hôte interne du
conteneur (`https://localhost:<port>`) : les redirections des chemins d'entrée
patient — retour Google, lien magique, et leurs refus — envoyaient le
navigateur vers une adresse injoignable. L'e-mail partait, Google
authentifiait, le cookie se posait, puis l'atterrissage échouait. Les cinq
redirections passent par `urlPubliquePortail()` (`lib/portail/urlPublique.ts`),
qui vise `NEXTAUTH_URL` — la base qui fonde déjà le `redirect_uri` OAuth et
les liens des e-mails — avec repli sur `req.url` quand elle est absente (dev,
banc E2E). Constaté en production : `Location: https://localhost:<port>/…`.

Gain de sécurité au passage : l'hôte de ces Location cessant d'être dérivé de
l'en-tête `Host` (falsifiable par requête forgée), une redirection absolue
vers un hôte attaquant n'est plus constructible sur des routes qui posent un
cookie de session.
