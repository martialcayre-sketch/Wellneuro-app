// URL absolue d'une redirection des chemins d'entrée patient.
//
// Derrière le routeur Scalingo, `req.url` porte l'hôte interne du conteneur
// (`https://localhost:<port>`), pas le domaine public — constaté en production
// le 2026-08-25 : les atterrissages Google et lien magique répondaient
// `Location: https://localhost:<port>/portail/...`, adresse injoignable pour
// le navigateur du patient. Sur Vercel, `req.url` portait le domaine public,
// ce qui masquait la dépendance.
//
// La base canonique est `NEXTAUTH_URL` — la même qui fonde le `redirect_uri`
// OAuth (`configurationGoogle`) et les liens des e-mails (`buildMagicLinkUrl`,
// `buildGoogleConnexionUrl`). Pas `x-forwarded-host` : un en-tête se forge par
// requête, une variable d'environnement non. L'hôte cesse ainsi d'être dérivé
// de `Host` — une requête forgée n'obtient plus de Location absolue vers
// l'hôte de son choix sur des routes qui posent un cookie de session.
// `req.url` ne reste que le repli quand la variable manque : dev et
// `npm run test:e2e` nu, où l'hôte de la requête est le bon (CI et
// `wn-test-worktree.sh` exportent la variable, alignée sur leur port).
export function urlPubliquePortail(chemin: string, reqUrl: string): URL {
  const base = (process.env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  return base ? new URL(`${base}${chemin}`) : new URL(chemin, reqUrl);
}
