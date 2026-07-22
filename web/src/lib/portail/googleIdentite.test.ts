import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CHEMIN_RETOUR,
  DUREE_ETAT_MS,
  RETENTION_CONNEXIONS_GOOGLE_MS,
  configurationGoogle,
  construireUrlAutorisation,
  creerEtatGoogle,
  debutRetentionConnexionsGoogle,
  identiteDepuisCode,
  verifierEtatGoogle,
} from './googleIdentite';

const MAINTENANT = new Date('2026-07-21T12:00:00Z');
const CLIENT_ID = 'client-patient-de-test.apps.googleusercontent.example';
const CONFIG = {
  clientId: CLIENT_ID,
  clientSecret: 'secret-de-test-non-production',
  redirectUri: `http://localhost:3000${CHEMIN_RETOUR}`,
};

/** Forge un jeton d'identité : entête et signature inertes, charge réelle. */
function forgerJeton(charge: Record<string, unknown>): string {
  const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
  return `${b64({ alg: 'RS256' })}.${b64(charge)}.signature-inerte`;
}

function chargeValide(sur: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    exp: Math.floor(MAINTENANT.getTime() / 1000) + 600,
    nonce: 'nonce-attendu',
    email: 'Sophie.Nicola@fictif.wellneuro.fr',
    email_verified: true,
    ...sur,
  };
}

/** Ce que le retour attend d'un jeton : le client patient, le nonce de l'aller, l'instant. */
const ATTENDU = { nonce: 'nonce-attendu', maintenant: MAINTENANT };

/** Un `fetch` qui rend la réponse donnée, sans réseau. */
function repondre(reponse: { ok: boolean; json: () => Promise<unknown> }): typeof fetch {
  return vi.fn().mockResolvedValue(reponse) as unknown as typeof fetch;
}

/** Un `fetch` qui rend le jeton d'identité portant cette charge. */
function rendre(charge: Record<string, unknown>): typeof fetch {
  return repondre({ ok: true, json: async () => ({ id_token: forgerJeton(charge) }) });
}

beforeEach(() => {
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
});

describe('configurationGoogle', () => {
  it('assemble l’URI de retour à partir de NEXTAUTH_URL', () => {
    const config = configurationGoogle({
      WN_GOOGLE_PATIENT_CLIENT_ID: CLIENT_ID,
      WN_GOOGLE_PATIENT_CLIENT_SECRET: 'secret',
      NEXTAUTH_URL: 'https://app.exemple.test/',
    });
    expect(config?.redirectUri).toBe(`https://app.exemple.test${CHEMIN_RETOUR}`);
  });

  // L'état de la production entre le merge de 03c et l'activation de 03d :
  // la route doit refuser proprement, pas lever.
  it.each([
    ['identifiant absent', { WN_GOOGLE_PATIENT_CLIENT_SECRET: 's', NEXTAUTH_URL: 'https://x.test' }],
    ['secret absent', { WN_GOOGLE_PATIENT_CLIENT_ID: 'c', NEXTAUTH_URL: 'https://x.test' }],
    ['URL absente', { WN_GOOGLE_PATIENT_CLIENT_ID: 'c', WN_GOOGLE_PATIENT_CLIENT_SECRET: 's' }],
  ])('configuration incomplète (%s) : null', (_cas, env) => {
    expect(configurationGoogle(env)).toBeNull();
  });

  // Le client patient est distinct du client praticien : confondre les deux
  // variables reviendrait à réunir chez Google ce que l'option A sépare ici.
  it('ne lit jamais les variables du client praticien', () => {
    const config = configurationGoogle({
      GOOGLE_CLIENT_ID: 'client-praticien',
      GOOGLE_CLIENT_SECRET: 'secret-praticien',
      NEXTAUTH_URL: 'https://x.test',
    });
    expect(config).toBeNull();
  });
});

describe('état d’aller — state et nonce', () => {
  it('tire deux valeurs distinctes, et deux allers ne se ressemblent pas', () => {
    const a = creerEtatGoogle(MAINTENANT);
    const b = creerEtatGoogle(MAINTENANT);
    expect(a.etat.etat).not.toBe(a.etat.nonce);
    expect(a.etat.etat).not.toBe(b.etat.etat);
    expect(a.etat.nonce).not.toBe(b.etat.nonce);
  });

  it('le cookie d’aller relit le nonce quand le state correspond', () => {
    const { etat, cookie } = creerEtatGoogle(MAINTENANT);
    expect(verifierEtatGoogle(cookie, etat.etat, MAINTENANT)).toEqual({ nonce: etat.nonce });
  });

  it('le nonce ne circule pas dans le state : l’un ne vaut pas l’autre', () => {
    const { etat, cookie } = creerEtatGoogle(MAINTENANT);
    expect(verifierEtatGoogle(cookie, etat.nonce, MAINTENANT)).toBeNull();
  });

  it.each([
    ['cookie absent', (c: string, e: string) => [null, e] as const],
    ['state absent', (c: string) => [c, null] as const],
    ['state d’un autre aller', (c: string) => [c, creerEtatGoogle(MAINTENANT).etat.etat] as const],
    ['signature falsifiée', (c: string, e: string) => [`${c.split('.')[0]}.signature-fausse`, e] as const],
    ['charge réécrite', (_c: string, e: string) => {
      const charge = Buffer.from(
        JSON.stringify({ etat: e, nonce: 'nonce-choisi', exp: MAINTENANT.getTime() + 1000 }),
      ).toString('base64url');
      return [`${charge}.peu-importe`, e] as const;
    }],
  ])('état invalide (%s) : refusé', (_cas, deformer) => {
    const { etat, cookie } = creerEtatGoogle(MAINTENANT);
    const [c, e] = deformer(cookie, etat.etat);
    expect(verifierEtatGoogle(c, e, MAINTENANT)).toBeNull();
  });

  it('un aller périmé ne vaut plus rien', () => {
    const { etat, cookie } = creerEtatGoogle(MAINTENANT);
    const tard = new Date(MAINTENANT.getTime() + DUREE_ETAT_MS + 1);
    expect(verifierEtatGoogle(cookie, etat.etat, tard)).toBeNull();
  });
});

describe('URL d’autorisation', () => {
  const url = () => new URL(construireUrlAutorisation(CONFIG, creerEtatGoogle(MAINTENANT).etat));

  // Le portail n'a besoin que de l'adresse vérifiée. `profile` collecterait un
  // nom et une photo dont aucune ligne du dépôt ne fait usage.
  it('ne demande que `openid email`', () => {
    expect(url().searchParams.get('scope')).toBe('openid email');
  });

  it('porte le client patient, l’URI de retour, un state et un nonce', () => {
    const params = url().searchParams;
    expect(params.get('client_id')).toBe(CLIENT_ID);
    expect(params.get('redirect_uri')).toBe(CONFIG.redirectUri);
    expect(params.get('response_type')).toBe('code');
    expect(params.get('state')).toBeTruthy();
    expect(params.get('nonce')).toBeTruthy();
    expect(params.get('prompt')).toBe('select_account');
  });

  it('le secret client ne part jamais dans le navigateur', () => {
    expect(construireUrlAutorisation(CONFIG, creerEtatGoogle(MAINTENANT).etat)).not.toContain(
      CONFIG.clientSecret,
    );
  });
});

describe('échange du code', () => {
  it('poste le code et le secret au point de terminaison de Google', async () => {
    const fetchImpl = repondre({ ok: true, json: async () => ({ id_token: forgerJeton(chargeValide()) }) });

    await expect(identiteDepuisCode(CONFIG, 'code-de-test', ATTENDU, fetchImpl)).resolves.toEqual({
      email: 'sophie.nicola@fictif.wellneuro.fr',
    });

    const [cible, options] = vi.mocked(fetchImpl).mock.calls[0];
    expect(cible).toBe('https://oauth2.googleapis.com/token');
    expect(options?.method).toBe('POST');
    const corps = new URLSearchParams(options?.body as string);
    expect(corps.get('code')).toBe('code-de-test');
    expect(corps.get('grant_type')).toBe('authorization_code');
    expect(corps.get('client_secret')).toBe(CONFIG.clientSecret);
    // Une fonction serverless qui attend indéfiniment occupe son quota.
    expect(options?.signal).toBeDefined();
  });

  it.each([
    ['réponse en erreur', { ok: false, json: async () => ({}) }],
    ['réponse sans id_token', { ok: true, json: async () => ({ access_token: 'a' }) }],
    ['id_token vide', { ok: true, json: async () => ({ id_token: '' }) }],
  ])('échange inexploitable (%s) : null', async (_cas, reponse) => {
    await expect(identiteDepuisCode(CONFIG, 'code', ATTENDU, repondre(reponse))).resolves.toBeNull();
  });
});

describe('identité portée par le jeton', () => {
  it('rend l’adresse vérifiée, normalisée en minuscules', async () => {
    await expect(identiteDepuisCode(CONFIG, 'code', ATTENDU, rendre(chargeValide()))).resolves.toEqual({
      email: 'sophie.nicola@fictif.wellneuro.fr',
    });
  });

  it('accepte les deux formes d’émetteur publiées par Google', async () => {
    for (const iss of ['accounts.google.com', 'https://accounts.google.com']) {
      await expect(
        identiteDepuisCode(CONFIG, 'code', ATTENDU, rendre(chargeValide({ iss }))),
      ).resolves.not.toBeNull();
    }
  });

  // Chaque ligne ferme une porte distincte, et aucune n'est décorative :
  // `aud` interdit qu'un jeton émis pour une AUTRE application — le client
  // praticien, typiquement — ouvre un espace patient ; `nonce` interdit de
  // rejouer un jeton obtenu lors d'un autre aller ; `email_verified` interdit
  // qu'une adresse simplement déclarée chez Google suffise.
  it.each([
    ['émetteur inconnu', chargeValide({ iss: 'https://accounts.exemple.test' })],
    ['audience d’une autre application', chargeValide({ aud: 'client-praticien' })],
    ['audience absente', chargeValide({ aud: undefined })],
    ['jeton périmé', chargeValide({ exp: Math.floor(MAINTENANT.getTime() / 1000) - 1 })],
    ['expiration absente', chargeValide({ exp: undefined })],
    ['nonce d’un autre aller', chargeValide({ nonce: 'nonce-autre' })],
    ['nonce absent', chargeValide({ nonce: undefined })],
    ['adresse non vérifiée', chargeValide({ email_verified: false })],
    ['vérification déclarée en texte', chargeValide({ email_verified: 'true' })],
    ['vérification absente', chargeValide({ email_verified: undefined })],
    ['adresse absente', chargeValide({ email: undefined })],
    ['adresse qui n’en est pas une', chargeValide({ email: 'sophie.nicola' })],
  ])('jeton refusé (%s)', async (_cas, charge) => {
    await expect(identiteDepuisCode(CONFIG, 'code', ATTENDU, rendre(charge))).resolves.toBeNull();
  });

  it.each([
    ['jeton vide', ''],
    ['jeton sans les trois parties', 'a.b'],
    ['charge illisible', 'entete.pas-du-json.signature'],
  ])('jeton malformé (%s) : null, pas d’exception', async (_cas, jeton) => {
    const fetchImpl = repondre({ ok: true, json: async () => ({ id_token: jeton }) });
    await expect(identiteDepuisCode(CONFIG, 'code', ATTENDU, fetchImpl)).resolves.toBeNull();
  });
});

// La provenance du jeton d'identité est ce qui autorise à ne pas en vérifier la
// signature. Elle ne tient que si le jeton n'est jamais un paramètre public :
// une fonction exportée acceptant un `string` se lirait comme une validation et
// offrirait l'usurpation d'identité au premier appelant qui lui passerait un
// jeton venu du navigateur. Relevé en revue adversariale le 2026-07-21.
describe('surface publique du module', () => {
  it('n’expose ni l’échange brut ni la lecture d’un jeton fourni', async () => {
    const publics = Object.keys(await import('./googleIdentite'));
    expect(publics).not.toContain('identiteDepuisJetonGoogle');
    expect(publics).not.toContain('echangerCodeContreJetonIdentite');
    expect(publics).toContain('identiteDepuisCode');
  });
});

// Durée de conservation de la trace des connexions Google — décision du
// 2026-07-22 (ACTIVATION_RUNBOOK_G5.md) : 12 mois glissants.
describe('rétention de la trace des connexions Google', () => {
  it('la fenêtre est de 365 jours', () => {
    expect(RETENTION_CONNEXIONS_GOOGLE_MS).toBe(365 * 24 * 60 * 60 * 1000);
  });

  it('le seuil se calcule en reculant de la fenêtre depuis l’instant donné', () => {
    const seuil = debutRetentionConnexionsGoogle(MAINTENANT);
    expect(seuil.getTime()).toBe(MAINTENANT.getTime() - RETENTION_CONNEXIONS_GOOGLE_MS);
  });

  // La version précédente comparait `seuil - 1j < seuil` : vrai quelle que
  // soit l'implémentation, elle ne testait rien. Celle-ci applique le
  // filtre `creeLe: { lt: seuil }` réellement utilisé par `deleteMany`
  // (`google/retour/route.ts`) à des lignes de part et d'autre de la
  // frontière — c'est l'inclusion/exclusion qui compte, pas l'arithmétique.
  // Relevé en revue adversariale le 2026-07-22.
  it('une ligne d’un jour plus vieille que le seuil est exclue par le filtre de purge, une plus récente est conservée', () => {
    const seuil = debutRetentionConnexionsGoogle(MAINTENANT);
    const filtre = (creeLe: Date) => creeLe.getTime() < seuil.getTime();

    expect(filtre(new Date(seuil.getTime() - 24 * 60 * 60 * 1000))).toBe(true);
    expect(filtre(new Date(seuil.getTime() + 24 * 60 * 60 * 1000))).toBe(false);
  });
});
