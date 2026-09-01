import { existsSync, readdirSync, readFileSync } from 'fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'path';
import { describe, expect, it } from 'vitest';
import { authOptions, profilPraticienAutorise } from './auth';

// Garde structurelle — séparation des rôles patient / praticien (IDP2 LOT-03b).
//
// Écrite **avant** la première ligne d'authentification patient, et c'est tout
// son intérêt : elle fixe l'invariant pendant qu'il est encore vrai sans effort.
//
// L'invariant : NextAuth est réservé aux praticiens. Le portail patient
// s'authentifie avec son propre cookie signé (`wn_portail`), jamais avec un
// cookie NextAuth. Ce n'est pas une préférence de style, c'est ce qui tient la
// sécurité du dépôt debout — la garde praticien n'est pas centralisée : elle est
// un `if (!session)` recopié dans une soixantaine de fichiers, sans middleware
// ni helper commun. Le jour où un compte patient obtient une session NextAuth
// valide, toutes ces routes s'ouvrent d'un coup, et il n'y a aucun point unique
// où le rattraper.
//
// D'où le choix de l'option A du LOT-03 : Google est consommé en OIDC direct par
// une route portail dédiée, hors de `authOptions`. Le risque devient
// structurellement impossible au lieu d'être gardé. Ce test est ce qui empêche
// l'option B de se réintroduire par inadvertance — un provider ajouté « juste
// pour le patient », un `signIn` qui cesse de filtrer le domaine.
//
// Le test lit les sources autant qu'il exécute le code : la régression qu'on
// craint arrive par un import recopié, pas par une logique fautive.

const RACINE = join(__dirname, '..');

/** Surfaces patient : rien de ce qui suit ne doit connaître NextAuth. */
// `app/patient` a disparu le 2026-08-08 avec le retrait du parcours legacy
// (dette 5). La racine n'est pas remplacée : les routes `app/api/patient`
// restent, et c'est là que la garde compte.
const RACINES_PATIENT = [
  'app/portail',
  'app/api/portail',
  'app/api/patient',
  'lib/portail',
];

const FICHIERS_PATIENT_ISOLES = ['lib/patient-session.ts', 'lib/patient-access.ts'];

function fichiersSources(dossier: string): string[] {
  const entrees = readdirSync(join(RACINE, dossier), { withFileTypes: true });
  return entrees.flatMap(entree => {
    const chemin = `${dossier}/${entree.name}`;
    if (entree.isDirectory()) return fichiersSources(chemin);
    if (!/\.(ts|tsx)$/.test(entree.name)) return [];
    // Les fichiers de test sont exclus : y importer NextAuth ne donne accès à
    // rien en production, et les inclure ferait échouer la garde sur un mock.
    if (/\.test\.tsx?$/.test(entree.name)) return [];
    return [chemin];
  });
}

const SURFACES_PATIENT = [...RACINES_PATIENT.flatMap(fichiersSources), ...FICHIERS_PATIENT_ISOLES];

describe('séparation des rôles — NextAuth est réservé aux praticiens', () => {
  it('recense bien les surfaces patient (sinon la garde ne regarde plus rien)', () => {
    // Si l'arborescence bouge et que le parcours ne trouve plus les fichiers,
    // tous les tests ci-dessous passeraient à vide. Ce plancher le signale.
    expect(SURFACES_PATIENT.length).toBeGreaterThan(25);
  });

  it('`app/patient` reste supprimé — sinon sa racine doit revenir dans la liste', () => {
    // Le parcours legacy a été retiré le 2026-08-08 (dette 5) et sa racine
    // sortie de `RACINES_PATIENT`. Le trou n'est pas le retrait, c'est le
    // RETOUR : un `git revert`, ou une vieille branche qui ressort, restaure le
    // répertoire sans restaurer l'entrée du garde — et une page patient
    // pourrait alors obtenir une session NextAuth sans qu'aucun banc ne le
    // dise. Ce test échoue à la résurrection et nomme le geste à faire.
    expect(
      existsSync(join(RACINE, 'app/patient')),
      "app/patient est réapparu : rajouter 'app/patient' à RACINES_PATIENT",
    ).toBe(false);
  });

  it.each(SURFACES_PATIENT)('%s n’importe pas NextAuth', chemin => {
    const source = readFileSync(join(RACINE, chemin), 'utf8');
    expect(source).not.toMatch(/from\s+['"]next-auth/);
    expect(source).not.toMatch(/\bgetServerSession\b/);
    expect(source).not.toMatch(/\bnext-auth\.session-token\b/);
  });

  it('aucune surface patient n’importe le module d’authentification praticien', () => {
    for (const chemin of SURFACES_PATIENT) {
      const source = readFileSync(join(RACINE, chemin), 'utf8');
      expect(source).not.toMatch(/from\s+['"][^'"]*\/auth['"]/);
      expect(source).not.toMatch(/\bauthOptions\b/);
    }
  });

  it('lib/auth.ts ignore tout du portail patient', () => {
    // La séparation vaut dans les deux sens : le module praticien ne doit pas
    // se mettre à poser ou lire un cookie patient.
    const source = readFileSync(join(RACINE, 'lib/auth.ts'), 'utf8');
    expect(source).not.toMatch(/patient/i);
    expect(source).not.toMatch(/wn_portail|signPatientSession|portail/);
  });
});

describe('authOptions — un seul provider, et il est praticien', () => {
  it('ne déclare qu’un provider Google', () => {
    // Un second provider, c'est l'option B qui rentre par la fenêtre : deux
    // surfaces d'authentification dans le même jeton, sans rôle pour les
    // départager côté routes praticien.
    const providers = authOptions.providers as Array<{ id?: string }>;
    expect(providers).toHaveLength(1);
    expect(providers[0]?.id).toBe('google');
  });

  it('le callback signIn passe par profilPraticienAutorise', () => {
    const source = readFileSync(join(RACINE, 'lib/auth.ts'), 'utf8');
    const corpsSignIn = source.match(/async signIn\([\s\S]*?\n {4}\}/)?.[0];
    expect(corpsSignIn).toBeDefined();
    expect(corpsSignIn).toMatch(/\breturn profilPraticienAutorise\(/);
  });

  it('le budget réseau du provider reste épinglé à 8 s', () => {
    // Incident du 2026-08-31 : le défaut openid-client (3 500 ms) a fermé le
    // login praticien (SIGNIN_OAUTH_ERROR ×3) pendant une dégradation des
    // conteneurs. Sans cette assertion, un revert ou une réécriture du
    // provider restaurerait le défaut sans qu'aucune suite ne le signale.
    // 8 s par appel (inactivité socket), ~16 s au pire sur le callback
    // depuis l'épinglage des endpoints — sous la fenêtre de 30 s du routeur
    // Scalingo.
    // Le factory GoogleProvider() range la config utilisateur sous `options` ;
    // la fusion sur le provider ne se fait qu'au runtime (parseProviders).
    // On regarde les deux niveaux pour survivre à un changement de forme.
    type AvecBudget = {
      httpOptions?: { timeout?: number };
      options?: { httpOptions?: { timeout?: number } };
    };
    const provider = (authOptions.providers as Array<AvecBudget>)[0];
    const timeout = provider?.options?.httpOptions?.timeout ?? provider?.httpOptions?.timeout;
    expect(timeout).toBe(8_000);
  });

  it('la découverte OIDC reste désactivée et les endpoints Google épinglés', () => {
    // L'épinglage retire l'appel de découverte des deux jambes du flux —
    // URL d'autorisation et callback (dont le pire cas passe de trois à
    // deux appels sous la fenêtre du routeur). Deux conditions le
    // tiennent, et ce test les
    // fixe toutes les deux : la clé `wellKnown` doit être PRÉSENTE et valoir
    // `undefined` — une clé simplement absente ne remplacerait pas le défaut
    // du factory lors de la fusion (utils/merge itère les clés du source,
    // `undefined` compris) — et les endpoints doivent nourrir la
    // construction locale de l'Issuer (core/lib/oauth/client.js).
    type AvecEndpoints = {
      options?: {
        wellKnown?: string;
        issuer?: string;
        token?: string;
        userinfo?: string;
        jwks_uri?: string;
        authorization?: { url?: string; params?: Record<string, string> };
      };
    };
    const options = (authOptions.providers as Array<AvecEndpoints>)[0]?.options;
    expect(options && 'wellKnown' in options).toBe(true);
    expect(options?.wellKnown).toBeUndefined();
    expect(options?.issuer).toBe('https://accounts.google.com');
    expect(options?.authorization?.url).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(options?.token).toBe('https://oauth2.googleapis.com/token');
    expect(options?.userinfo).toBe('https://openidconnect.googleapis.com/v1/userinfo');
    expect(options?.jwks_uri).toBe('https://www.googleapis.com/oauth2/v3/certs');
  });

  it('la fusion next-auth copie toujours les clés `undefined` — la prémisse de l’épinglage', () => {
    // Tout le bloc « découverte désactivée » repose sur un détail
    // d'implémentation : utils/merge itère les clés du source (`for in`) et
    // recopie aussi une valeur `undefined`. Une version de next-auth qui
    // « corrigerait » cette sémantique restaurerait la découverte en silence,
    // tous les autres tests restant verts — ils ne lisent que la
    // configuration brute, jamais le résultat de la fusion (revue
    // adversariale du 2026-09-01, constat majeur nº1). Ce test charge le
    // module réellement installé ; la carte `exports` du paquet ne l'expose
    // pas, d'où le détour par le chemin résolu.
    const chargeur = createRequire(__filename);
    const racineNextAuth = dirname(chargeur.resolve('next-auth'));
    const { merge } = chargeur(join(racineNextAuth, 'utils', 'merge.js')) as {
      merge: (cible: Record<string, unknown>, source: Record<string, unknown>) => Record<string, unknown>;
    };
    const fusion = merge({ wellKnown: 'https://exemple.invalid' }, { wellKnown: undefined });
    expect('wellKnown' in fusion).toBe(true);
    expect(fusion.wellKnown).toBeUndefined();
  });

  it('le profil vient d’un id_token signé — `idToken` reste vrai', () => {
    // Ce lot touche exactement les options qui nourrissent l'inférence
    // d'`idToken` (core/lib/providers.js). S'il basculait à faux, `hd` et
    // `email_verified` cesseraient de venir d'un JWT vérifié pour venir
    // d'une réponse userinfo — toujours Google, parole plus faible. C'est la
    // matière de la décision d'accès : épinglé (revue adversariale du
    // 2026-09-01, constat majeur nº3).
    const provider = (authOptions.providers as Array<{ idToken?: boolean }>)[0];
    expect(provider?.idToken).toBe(true);
  });

  it('PKCE et state restent les contrôles du provider', () => {
    // Défaut du factory GoogleProvider (next-auth 4.24.14), constaté dans la
    // source installée — épinglé pour qu'une mise à jour de next-auth qui
    // l'affaiblirait ne passe pas inaperçue.
    const provider = (authOptions.providers as Array<{ checks?: string[] }>)[0];
    expect(provider?.checks).toEqual(['pkce', 'state']);
  });

  it('`hd` préfiltre l’écran de choix de compte sur le domaine autorisé', () => {
    // Indication d'interface envoyée à Google, jamais un contrôle d'accès :
    // la décision reste dans profilPraticienAutorise, éprouvée plus bas par
    // les cas hors domaine.
    const provider = (authOptions.providers as Array<{
      options?: { authorization?: { params?: Record<string, string> } };
    }>)[0];
    expect(provider?.options?.authorization?.params?.hd).toBe('wellneuro.fr');
    // `hd` ne sait préfiltrer qu'UN domaine ; la décision serveur en accepte
    // une liste. Tant que la liste est un singleton, les deux coïncident. Le
    // jour où un second domaine entre dans ALLOWED_DOMAINS, ce pin force à
    // repenser l'indication d'interface — sinon : compte légitime absent de
    // l'écran de choix, panne difficile à diagnostiquer (revue adversariale
    // du 2026-09-01, constat mineur nº1).
    const source = readFileSync(join(RACINE, 'lib/auth.ts'), 'utf8');
    expect(source).toMatch(/const ALLOWED_DOMAINS = \['wellneuro\.fr'\];/);
  });
});

describe('propriété — aucun profil hors domaine n’est autorisé', () => {
  type ParamsSignIn = { profile?: unknown };
  const signIn = authOptions.callbacks?.signIn as unknown as
    | ((params: ParamsSignIn) => boolean | Promise<boolean>)
    | undefined;

  const HORS_DOMAINE = [
    { email: 'sophie.nicola@gmail.com', email_verified: true },
    { email: 'sophie.nicola@wellneuro.fr.exemple.com', email_verified: true },
    { email: 'sophie.nicola@wellneuro.fr', email_verified: false },
    { email: 'sophie.nicola@wellneuro.fr' },
    { email: 'sophie.nicola@wellneuro.fr', email_verified: true, hd: 'exemple.com' },
    { email: '' },
    {},
  ];

  it('le callback signIn est bien branché', () => {
    expect(typeof signIn).toBe('function');
  });

  it.each(HORS_DOMAINE)('signIn refuse %j', async profil => {
    await expect(signIn?.({ profile: profil })).resolves.toBe(false);
    expect(profilPraticienAutorise(profil)).toBe(false);
  });

  it('signIn accepte le praticien du domaine, vérifié', async () => {
    // Le pendant du test précédent : une garde qui refuse tout ne garde rien
    // non plus, elle ferme la production.
    const praticien = { email: 'martialcayre@wellneuro.fr', email_verified: true, hd: 'wellneuro.fr' };
    await expect(signIn?.({ profile: praticien })).resolves.toBe(true);
  });
});
