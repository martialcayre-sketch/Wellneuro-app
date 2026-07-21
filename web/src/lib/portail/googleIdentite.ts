import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

// Entrée patient par Google — gate G5 (IDP2 LOT-03c).
//
// CE MODULE N'EST PAS NEXTAUTH, ET C'EST TOUT SON OBJET.
//
// L'option A du LOT-03 (tranchée le 2026-07-21, voir la spécification 03a) veut
// que le patient n'obtienne JAMAIS de session NextAuth. NextAuth reste réservé
// aux praticiens : le seul contrôle de domaine `@wellneuro.fr` du dépôt est son
// callback `signIn`, et la garde praticien n'est pas centralisée — c'est un
// `if (!session)` recopié dans une soixantaine de fichiers. Un cookie NextAuth
// délivré à un patient ouvrirait ces routes d'un coup, sans point unique où le
// rattraper. `lib/auth.roles.guard.test.ts` (03b) fait échouer la suite si cette
// séparation se défait.
//
// Google est donc consommé ici en OIDC direct, avec le flux de code
// d'autorisation d'un client confidentiel. Le résultat n'est pas une session
// Google : c'est une adresse e-mail vérifiée, que la route rapproche de
// `patients.email` avant de poser le cookie maison `wn_portail` — exactement
// comme le fait le lien magique.
//
// Tout ce qui DÉCIDE est ici, en fonctions pures avec l'instant injecté ; les
// routes ne font que lire, appeler et appliquer.

/** Le drapeau et les deux secrets vivent en variables d'environnement, jamais en dur. */
export type ConfigurationGoogle = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
};

export const ENDPOINT_AUTORISATION = 'https://accounts.google.com/o/oauth2/v2/auth';
export const ENDPOINT_JETON = 'https://oauth2.googleapis.com/token';

/** Chemin de retour, fixe : il est déclaré à l'identique dans la console Google. */
export const CHEMIN_RETOUR = '/portail/google/retour';

/** Page d'entrée sans jeton — le seul endroit d'où part le chemin Google. */
export const CHEMIN_CONNEXION = '/portail/connexion';

/**
 * L'unique atterrissage de refus du chemin Google, tous motifs confondus :
 * configuration absente, état invalide, échange refusé, adresse non vérifiée,
 * adresse inconnue, patient inactif, portail révoqué, panne.
 *
 * Le paramètre ne prend jamais qu'une valeur. C'est l'équivalent, pour ce
 * chemin, de `/portail/lien/indisponible` — et il en est distinct pour une
 * raison d'usage, pas de sécurité : « votre lien n'est plus valable » ne veut
 * rien dire pour quelqu'un qui n'a jamais reçu de lien. La propriété de
 * non-oracle porte sur l'uniformité DANS un chemin, et elle est tenue ici :
 * la personne qui sonde des adresses lit toujours le même écran.
 */
export const DESTINATION_REFUS = `${CHEMIN_CONNEXION}?etat=refus`;

/**
 * Le message unique du refus. Exporté d'un seul endroit pour qu'aucune surface
 * ne puisse en dire un autre — même principe que `MESSAGE_LIEN_INDISPONIBLE`.
 *
 * Il ne nomme aucun motif. « Adresse inconnue » dirait à qui sonde que
 * l'adresse d'à côté, elle, est connue ; « portail révoqué » dirait qu'il a
 * existé. Il indique en revanche quoi faire, sans quoi le refus serait
 * simplement incompréhensible pour le patient légitime qui s'est trompé de
 * compte Google.
 */
export const MESSAGE_ACCES_GOOGLE_REFUSE =
  'Nous n’avons pas pu ouvrir votre espace avec ce compte. Vérifiez que vous utilisez l’adresse e-mail communiquée à votre praticien, ou demandez-lui un lien d’accès.';

/** Cookie de corrélation entre l'aller et le retour. Éphémère, supprimé au retour. */
export const COOKIE_ETAT = 'wn_portail_google';

/** 10 min : le temps d'un écran de consentement Google, pas davantage. */
export const DUREE_ETAT_MS = 10 * 60 * 1000;

/**
 * Le client OAuth patient est **distinct** de celui du praticien : écran de
 * consentement, audience et journalisation séparés. Partager le client
 * reviendrait à confondre les deux publics chez Google, là même où l'option A
 * s'applique à les séparer chez nous.
 *
 * Renvoie `null` si la configuration est incomplète — l'état exact de la
 * production entre le merge de 03c et l'activation de 03d. La route refuse
 * alors proprement au lieu de lever.
 */
export function configurationGoogle(
  env: Record<string, string | undefined> = process.env,
): ConfigurationGoogle | null {
  const clientId = env.WN_GOOGLE_PATIENT_CLIENT_ID ?? '';
  const clientSecret = env.WN_GOOGLE_PATIENT_CLIENT_SECRET ?? '';
  const base = (env.NEXTAUTH_URL ?? '').replace(/\/$/, '');
  if (!clientId || !clientSecret || !base) return null;
  return { clientId, clientSecret, redirectUri: `${base}${CHEMIN_RETOUR}` };
}

function secret(): string {
  const valeur = process.env.NEXTAUTH_SECRET;
  if (!valeur) {
    // Même exigence que la session portail et le lien magique : échouer
    // explicitement plutôt que signer avec un secret vide.
    throw new Error('NEXTAUTH_SECRET manquant : impossible de signer l’état Google.');
  }
  return valeur;
}

function signer(charge: string): string {
  // Préfixe de domaine, comme `empreinteJeton` : une signature valable ici ne
  // vaut pas pour un cookie de session ni pour une empreinte de lien.
  return createHmac('sha256', secret()).update(`portail-google-etat:${charge}`).digest('base64url');
}

export type EtatGoogle = {
  /** Paramètre `state` — anti-CSRF, comparé au retour. */
  etat: string;
  /** Paramètre `nonce` — lié au jeton d'identité, il interdit d'en rejouer un. */
  nonce: string;
};

type ChargeEtat = EtatGoogle & { exp: number };

/**
 * Ouvre un aller : deux valeurs aléatoires et le cookie signé qui les porte.
 *
 * `state` et `nonce` sont distincts et tirés séparément. Le premier prouve au
 * retour que la requête vient bien de l'aller qu'on a émis ; le second, porté
 * par le jeton d'identité lui-même, prouve que ce jeton répond à CET aller.
 */
export function creerEtatGoogle(maintenant: Date): { etat: EtatGoogle; cookie: string } {
  const etat: EtatGoogle = {
    etat: randomBytes(32).toString('base64url'),
    nonce: randomBytes(32).toString('base64url'),
  };
  const charge: ChargeEtat = { ...etat, exp: maintenant.getTime() + DUREE_ETAT_MS };
  const chargeB64 = Buffer.from(JSON.stringify(charge)).toString('base64url');
  return { etat, cookie: `${chargeB64}.${signer(chargeB64)}` };
}

/**
 * Relit le cookie d'aller et vérifie qu'il correspond au `state` reçu.
 *
 * Renvoie le `nonce` attendu, ou `null` — cookie absent, signature fausse,
 * expiré, `state` différent. La comparaison du `state` est à temps constant :
 * c'est une valeur secrète, la comparer avec `===` laisserait fuir sa longueur
 * commune préfixée.
 */
export function verifierEtatGoogle(
  cookieBrut: string | null | undefined,
  etatRecu: string | null | undefined,
  maintenant: Date,
): { nonce: string } | null {
  if (!cookieBrut || !etatRecu) return null;
  const point = cookieBrut.indexOf('.');
  if (point <= 0) return null;

  const chargeB64 = cookieBrut.slice(0, point);
  const signatureRecue = Buffer.from(cookieBrut.slice(point + 1));
  let signatureAttendue: Buffer;
  try {
    signatureAttendue = Buffer.from(signer(chargeB64));
  } catch {
    return null;
  }
  if (signatureRecue.length !== signatureAttendue.length) return null;
  if (!timingSafeEqual(signatureRecue, signatureAttendue)) return null;

  try {
    const charge = JSON.parse(Buffer.from(chargeB64, 'base64url').toString('utf8')) as Partial<ChargeEtat>;
    if (typeof charge.etat !== 'string' || typeof charge.nonce !== 'string') return null;
    if (typeof charge.exp !== 'number' || charge.exp <= maintenant.getTime()) return null;

    const attendu = Buffer.from(charge.etat);
    const recu = Buffer.from(etatRecu);
    if (attendu.length !== recu.length || !timingSafeEqual(attendu, recu)) return null;

    return { nonce: charge.nonce };
  } catch {
    return null;
  }
}

/**
 * L'URL d'envoi chez Google.
 *
 * `scope` se limite à `openid email` : le portail n'a besoin que de l'adresse
 * vérifiée. Demander `profile` collecterait un nom et une photo dont aucune
 * ligne de ce dépôt ne fait usage — donnée patient transmise à un sous-traitant
 * pour rien.
 *
 * `prompt=select_account` évite qu'un navigateur déjà connecté à un compte
 * Google enchaîne en silence sur celui-là : la personne choisit l'adresse
 * qu'elle veut présenter.
 */
export function construireUrlAutorisation(config: ConfigurationGoogle, etat: EtatGoogle): string {
  const url = new URL(ENDPOINT_AUTORISATION);
  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email');
  url.searchParams.set('state', etat.etat);
  url.searchParams.set('nonce', etat.nonce);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

/** Au-delà, on renonce : une fonction serverless qui attend indéfiniment occupe son quota. */
const DELAI_ECHANGE_MS = 10_000;

/**
 * Échange le code d'autorisation contre un jeton d'identité, en appel
 * serveur-à-serveur authentifié par le secret client.
 *
 * **Non exportée, délibérément** — voir `identiteDepuisCode`.
 */
async function echangerCodeContreJetonIdentite(
  config: ConfigurationGoogle,
  code: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const reponse = await fetchImpl(ENDPOINT_JETON, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
    signal: AbortSignal.timeout(DELAI_ECHANGE_MS),
  });
  if (!reponse.ok) return null;
  const corps = (await reponse.json()) as { id_token?: unknown };
  return typeof corps.id_token === 'string' && corps.id_token ? corps.id_token : null;
}

/** Émetteurs acceptés — Google publie les deux formes, historiquement. */
const EMETTEURS = ['accounts.google.com', 'https://accounts.google.com'];

type ChargeIdentite = {
  iss?: unknown;
  aud?: unknown;
  exp?: unknown;
  nonce?: unknown;
  email?: unknown;
  email_verified?: unknown;
};

/**
 * L'adresse e-mail vérifiée portée par un jeton d'identité, ou `null`.
 *
 * **Pourquoi la signature n'est pas vérifiée ici.** Le jeton n'arrive pas du
 * navigateur : il vient d'être obtenu par `echangerCodeContreJetonIdentite`,
 * dans un appel HTTPS direct de notre serveur au point de terminaison de
 * Google, authentifié par le secret client. C'est le cas que la documentation
 * OIDC de Google dispense explicitement de validation cryptographique — il n'y
 * a pas d'intermédiaire à qui la signature protégerait de quoi que ce soit.
 *
 * **Cette fonction n'est donc pas exportée, et ce n'est pas un détail de
 * portée.** Tant qu'elle reste privée, la provenance du jeton est une propriété
 * du module, vérifiable en le lisant. Exportée, elle deviendrait une invitation :
 * son nom se lit comme une validation, sa signature accepte un `string`
 * quelconque, et le premier appelant qui lui passerait un jeton venu du
 * navigateur — Google One Tap, par exemple — offrirait l'usurpation d'identité
 * pour le prix d'une charge base64 forgée. Le seul point d'entrée public est
 * `identiteDepuisCode`, où le jeton n'existe jamais comme paramètre.
 * Relevé en revue adversariale le 2026-07-21.
 *
 * Les revendications sont contrôlées quand même, et ce ne sont pas des
 * formalités : `aud` interdit qu'un jeton émis pour une autre application (le
 * client praticien, par exemple) soit accepté ici, `nonce` interdit le rejeu
 * d'un jeton par un autre aller, `exp` borne sa durée.
 *
 * `email_verified === true` est exigé strictement : sans lui, une adresse
 * simplement déclarée chez Google suffirait à ouvrir l'espace d'un patient.
 * L'adresse est normalisée en minuscules, comme partout ailleurs
 * (`signPatientSession`, la recherche par `patients.email`).
 */
function identiteDepuisJetonGoogle(
  jetonIdentite: string,
  attendu: { clientId: string; nonce: string; maintenant: Date },
): { email: string } | null {
  const parties = jetonIdentite.split('.');
  if (parties.length !== 3) return null;

  let charge: ChargeIdentite;
  try {
    charge = JSON.parse(Buffer.from(parties[1], 'base64url').toString('utf8')) as ChargeIdentite;
  } catch {
    return null;
  }

  if (typeof charge.iss !== 'string' || !EMETTEURS.includes(charge.iss)) return null;
  if (charge.aud !== attendu.clientId) return null;
  if (typeof charge.exp !== 'number' || charge.exp * 1000 <= attendu.maintenant.getTime()) return null;
  if (charge.nonce !== attendu.nonce) return null;
  if (charge.email_verified !== true) return null;
  if (typeof charge.email !== 'string' || !charge.email.includes('@')) return null;

  return { email: charge.email.trim().toLowerCase() };
}

/**
 * L'unique point d'entrée public de ce module côté retour : d'un code
 * d'autorisation à une adresse e-mail vérifiée, ou `null`.
 *
 * Il compose l'échange serveur-à-serveur et la lecture du jeton d'identité, et
 * c'est tout son intérêt — le jeton n'apparaît dans aucune signature publique,
 * donc aucun appelant ne peut en fournir un. La propriété qui autorise à ne pas
 * vérifier la signature (« il vient d'être obtenu de Google, par nous ») cesse
 * d'être une promesse de commentaire pour devenir une contrainte de typage.
 *
 * `fetchImpl` est injectable pour les tests : ce module ne doit pas exiger un
 * réseau pour être vérifié.
 */
export async function identiteDepuisCode(
  config: ConfigurationGoogle,
  code: string,
  attendu: { nonce: string; maintenant: Date },
  fetchImpl: typeof fetch = fetch,
): Promise<{ email: string } | null> {
  const jetonIdentite = await echangerCodeContreJetonIdentite(config, code, fetchImpl);
  if (!jetonIdentite) return null;
  return identiteDepuisJetonGoogle(jetonIdentite, { clientId: config.clientId, ...attendu });
}
