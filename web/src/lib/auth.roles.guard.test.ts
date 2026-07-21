import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
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
const RACINES_PATIENT = [
  'app/portail',
  'app/patient',
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
