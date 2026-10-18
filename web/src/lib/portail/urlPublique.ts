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


/**
 * Base des liens ABSOLUS écrits dans un courriel (lien magique, page de
 * connexion, Fil du jour). Un courriel n'a pas de requête dont emprunter
 * l'hôte : sans `NEXTAUTH_URL`, le repli de développement `localhost`.
 *
 * CE REPLI NE PEUT PAS SERVIR EN PRODUCTION (dette « repli localhost », H43) :
 * `instrumentation.ts` refuse de démarrer le serveur de production sans
 * `NEXTAUTH_URL` (`baseLiensAbsenteEnProduction`). Le refus est au démarrage,
 * pas ici : levé à la fabrication du lien, il tombait APRÈS des écritures déjà
 * validées (assignations créées, route en échec, trace d'envoi perdue — revue
 * `wn-reviewer` du 2026-10-18).
 */
export function baseLiensCourriel(): string {
  return baseNettoyee(process.env.NEXTAUTH_URL) || 'http://localhost:3000';
}

/**
 * UNE normalisation pour la base et pour sa garde (revues CodeRabbit de
 * #1557) : seule une URL http(s) ABSOLUE est une base. Des espaces, `'/'`,
 * `'//'` ou un hôte sans schéma valent une base vide — sinon un lien comme
 * `//portail/lien/<jeton>` viserait l'hôte « portail ».
 */
function baseNettoyee(valeur: string | undefined): string {
  const base = (valeur ?? '').trim().replace(/\/+$/, '');
  try {
    const { protocol } = new URL(base);
    return protocol === 'https:' || protocol === 'http:' ? base : '';
  } catch {
    return '';
  }
}

/**
 * Production RÉELLE (`WN_DEPLOY_ENV`, posée sur Scalingo — constaté le
 * 2026-10-18 avec `NEXTAUTH_URL`) sans base publique. Pas l'inférence par
 * `NODE_ENV` de `deploymentEnv()` : les E2E tournent sur un build de
 * production, et un lancement manuel sans la variable ne doit pas s'arrêter.
 */
export function baseLiensAbsenteEnProduction(env: Record<string, string | undefined> = process.env): boolean {
  return env.WN_DEPLOY_ENV === 'production' && !baseNettoyee(env.NEXTAUTH_URL);
}
