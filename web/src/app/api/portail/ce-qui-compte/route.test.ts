import { beforeEach, describe, expect, it, vi } from 'vitest';

// Bancs en style « SIGNATURE RÉELLE » : on ne mocke QUE Prisma, et on forge un
// vrai cookie avec `signPatientSession` (patron
// `api/portail/protocole/checkin/route.test.ts`). Le style
// `vi.mock('@/lib/patient-session')` d'`api/portail/ja/observations` est
// délibérément écarté : il neutralise l'authentification, or c'est justement
// l'authentification que ce lot doit prouver.

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    entreeCeQuiCompte: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' };
const TEXTE = 'Ce qui compte pour moi, c’est de tenir debout jusqu’au soir.';

function cookieProprio(): string {
  return signPatientSession({ idPatient: PATIENT.idPatient, email: PATIENT.email });
}

function mockCompteActif(surcharges: Record<string, unknown> = {}): void {
  prisma.patient.findUnique.mockResolvedValue({
    idPatient: PATIENT.idPatient,
    actif: true,
    accessTokenRevoked: false,
    email: PATIENT.email,
    sessionsInvalidesAvant: null,
    ...surcharges,
  });
}

function postRequest(
  cookie: string | undefined,
  corps: unknown,
  brut?: string,
  entetes: Record<string, string> = {},
): Request {
  return new Request('http://localhost/api/portail/ce-qui-compte', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
      ...entetes,
    },
    body: brut ?? JSON.stringify(corps),
  });
}

/**
 * Cookie dont la SIGNATURE ne correspond plus à la charge — forgé, altéré en
 * transit, ou signé avec un autre secret. `timingSafeEqual` exige des
 * longueurs égales : on substitue un caractère plutôt que d'en retirer un,
 * sinon le refus viendrait de la longueur et non de la signature.
 */
function cookieSignatureAlteree(): string {
  const valide = cookieProprio();
  const point = valide.indexOf('.');
  const signature = valide.slice(point + 1);
  const dernier = signature.slice(-1);
  return `${valide.slice(0, point)}.${signature.slice(0, -1)}${dernier === 'A' ? 'B' : 'A'}`;
}

/**
 * Charge réécrite (le patient s'y déclare PAT_AUTRE), signature d'origine
 * conservée : le cas du forgeage naïf.
 */
function cookieChargeForgee(): string {
  const valide = cookieProprio();
  const point = valide.indexOf('.');
  const charge = JSON.parse(Buffer.from(valide.slice(0, point), 'base64url').toString('utf8')) as {
    idPatient: string;
  };
  charge.idPatient = 'PAT_AUTRE';
  const reforgee = Buffer.from(JSON.stringify(charge)).toString('base64url');
  return `${reforgee}.${valide.slice(point + 1)}`;
}

function getRequest(cookie?: string): Request {
  return new Request('http://localhost/api/portail/ce-qui-compte', {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

/** Aucune écriture, quel que soit le verbe. */
function aucuneEcriture(): void {
  expect(prisma.entreeCeQuiCompte.create).not.toHaveBeenCalled();
  expect(prisma.entreeCeQuiCompte.update).not.toHaveBeenCalled();
  expect(prisma.entreeCeQuiCompte.upsert).not.toHaveBeenCalled();
  expect(prisma.entreeCeQuiCompte.delete).not.toHaveBeenCalled();
  expect(prisma.entreeCeQuiCompte.deleteMany).not.toHaveBeenCalled();
}

type AppelCreate = { data: Record<string, unknown> };
const dernierCreate = (index = 0): AppelCreate =>
  prisma.entreeCeQuiCompte.create.mock.calls[index][0] as AppelCreate;

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  process.env.WN_CE_QUI_COMPTE = 'true';
  mockCompteActif();
  prisma.entreeCeQuiCompte.create.mockImplementation(
    async ({ data }: { data: { saisiLe: Date | null } }) => ({
      id: 'ENT_1',
      creeLe: new Date('2026-08-22T09:00:00.000Z'),
      saisiLe: data.saisiLe,
    }),
  );
});

describe('POST /api/portail/ce-qui-compte — contrat d’accès', () => {
  it('drapeau éteint : 503 AVANT toute autre chose (ni auth, ni base)', async () => {
    delete process.env.WN_CE_QUI_COMPTE;
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    expect(res.status).toBe(503);
    expect(((await res.json()) as { reason: string }).reason).toBe('feature_disabled');
    // La preuve que le drapeau passe DEVANT l'authentification : le compte
    // n'a même pas été résolu.
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('fail-closed : seule la chaîne exacte « true » ouvre la route', async () => {
    for (const valeur of ['', '1', 'TRUE', 'True', 'yes', 'oui', ' true', 'true ']) {
      process.env.WN_CE_QUI_COMPTE = valeur;
      const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
      expect(res.status, `« ${valeur} » ne doit pas ouvrir la route`).toBe(503);
    }
    aucuneEcriture();
  });

  it('hors session : 401, sans écriture', async () => {
    const res = await POST(postRequest(undefined, { texte: TEXTE }));
    expect(res.status).toBe(401);
    aucuneEcriture();
  });

  it('SIGNATURE ALTÉRÉE : 401, sans même résoudre le compte', async () => {
    // Cinquième état d'authentification, le seul qui n'était pas couvert
    // (absent, expiré, révoqué, compte désactivé le sont). Un cookie dont la
    // signature ne vérifie plus n'est pas une session : il ne doit ni ouvrir
    // la route, ni faire toucher la base.
    const res = await POST(postRequest(cookieSignatureAlteree(), { texte: TEXTE }));
    expect(res.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('CHARGE FORGÉE (idPatient réécrit, signature d’origine) : 401', async () => {
    // Le forgeage naïf : on change l'identité dans la charge en gardant la
    // signature. Elle ne couvre plus la charge ⇒ 401 AVANT toute question
    // d'appartenance — c'est bien la signature qui garde la route, pas un
    // recoupement en base.
    const res = await POST(postRequest(cookieChargeForgee(), { texte: TEXTE }));
    expect(res.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('SESSIONS INVALIDÉES après l’émission du cookie : 403', async () => {
    // Troisième bras d'`isSessionValideForPatient`, jamais couvert : le compte
    // est actif et le jeton non révoqué, mais toutes les sessions émises
    // AVANT cette date sont coupées.
    mockCompteActif({ sessionsInvalidesAvant: new Date(Date.now() + 60_000) });
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    expect(res.status).toBe(403);
    aucuneEcriture();
  });

  it('SESSIONS INVALIDÉES avant l’émission du cookie : le dépôt passe', async () => {
    // Le bras discrimine vraiment : une invalidation ANTÉRIEURE ne coupe pas
    // une session émise après elle. Sans ce miroir, une garde qui refuserait
    // tout resterait verte au banc précédent.
    mockCompteActif({ sessionsInvalidesAvant: new Date(Date.now() - 60 * 60 * 1000) });
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    expect(res.status).toBe(201);
  });

  it('cookie d’un autre patient : refusé, sans écriture', async () => {
    // Cookie signé pour PAT_AUTRE : `resolvePortailPatientFromSession` ne
    // trouve pas de compte concordant → 403, et rien n'est écrit.
    prisma.patient.findUnique.mockResolvedValue(null);
    const cookie = signPatientSession({ idPatient: 'PAT_AUTRE', email: PATIENT.email });
    const res = await POST(postRequest(cookie, { texte: TEXTE }));
    expect(res.status).toBe(403);
    aucuneEcriture();
  });

  it('jeton révoqué : 403, sans écriture', async () => {
    mockCompteActif({ accessTokenRevoked: true });
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    expect(res.status).toBe(403);
    aucuneEcriture();
  });

  it('compte désactivé : 403, sans écriture', async () => {
    mockCompteActif({ actif: false });
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    expect(res.status).toBe(403);
    aucuneEcriture();
  });

  it('DOSSIER CLOS : le dépôt reste AUTORISÉ (arbitrage, pas un oubli)', async () => {
    // La clôture est un état du suivi praticien, pas un ordre de silence fait
    // au patient. Ce banc épingle l'absence DÉLIBÉRÉE de garde : quiconque
    // ajouterait un refus sur `suiviClotureLe` le fera rougir.
    mockCompteActif({ suiviClotureLe: new Date('2026-01-01T00:00:00.000Z') });
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    expect(res.status).toBe(201);
    expect(prisma.entreeCeQuiCompte.create).toHaveBeenCalledTimes(1);
  });
});

describe('POST /api/portail/ce-qui-compte — validation', () => {
  it('JSON illisible : 400, sans écriture', async () => {
    const res = await POST(postRequest(cookieProprio(), null, '{ pas du json'));
    expect(res.status).toBe(400);
    aucuneEcriture();
  });

  it('texte tout en espaces : 400, sans écriture', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: '   \n  ' }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { reason: string }).reason).toBe('texte_absent');
    aucuneEcriture();
  });

  it('texte non-string : 400 et NON 500', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: 123 }));
    expect(res.status).toBe(400);
    aucuneEcriture();
  });

  it('texte trop long : 400, jamais tronqué', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: 'a'.repeat(4001) }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { reason: string }).reason).toBe('texte_trop_long');
    aucuneEcriture();
  });

  it('saisiLe future : 400, sans écriture', async () => {
    const futur = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE, saisiLe: futur }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { reason: string }).reason).toBe('date_future');
    aucuneEcriture();
  });

  it('saisiLe illisible : 400, sans écriture', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE, saisiLe: 'hier' }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { reason: string }).reason).toBe('date_invalide');
    aucuneEcriture();
  });
});

describe('POST /api/portail/ce-qui-compte — borne technique de transport', () => {
  const PLAFOND = 64 * 1024;

  it('content-length au-delà du plafond : 400, sans écriture, et LE CORPS N’EST JAMAIS LU', async () => {
    // La borne de 4 000 caractères n'arrive qu'APRÈS le parse : sans ce
    // pré-contrôle, `req.json()` bufférise en mémoire un corps arbitrairement
    // gros sur une route d'écriture qui n'a aucune cadence. Le banc prouve la
    // seule chose qui compte ici : rien n'est lu.
    const requete = postRequest(cookieProprio(), { texte: TEXTE }, undefined, {
      'content-length': String(PLAFOND + 1),
    });
    const lireTexte = vi.spyOn(requete, 'text');
    const lireJson = vi.spyOn(requete, 'json');

    const res = await POST(requete);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { reason: string }).reason).toBe('corps_trop_gros');
    expect(lireTexte).not.toHaveBeenCalled();
    expect(lireJson).not.toHaveBeenCalled();
    aucuneEcriture();
  });

  it('content-length ABSENT : pas de laissez-passer, la borne s’applique quand même', async () => {
    // Transfert `chunked` : aucun en-tête à croire. Le corps est lu, mais la
    // même borne le refuse AVANT `JSON.parse`.
    const enorme = JSON.stringify({ texte: 'a'.repeat(PLAFOND + 1000) });
    const requete = new Request('http://localhost/api/portail/ce-qui-compte', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: `wn_portail=${encodeURIComponent(cookieProprio())}`,
      },
      body: enorme,
    });
    expect(requete.headers.get('content-length'), 'le banc doit bien viser le cas SANS en-tête').toBeNull();

    const res = await POST(requete);
    expect(res.status).toBe(400);
    expect(((await res.json()) as { reason: string }).reason).toBe('corps_trop_gros');
    aucuneEcriture();
  });

  it('un dépôt conforme tient très largement sous le plafond', () => {
    // La borne est TECHNIQUE, pas un seuil : elle ne doit jamais refuser ce
    // que la validation accepte. Un texte à la borne applicative, en
    // caractères multi-octets, reste d'un ordre de grandeur en dessous.
    const auMaximum = JSON.stringify({ texte: 'é'.repeat(4000), saisiLe: '2026-08-20' });
    expect(Buffer.byteLength(auMaximum, 'utf8')).toBeLessThan(PLAFOND);
  });
});

describe('POST /api/portail/ce-qui-compte — chemin 500', () => {
  it('le create rejette : 500 « exception », et le log ne porte NI le texte NI l’e-mail', async () => {
    // Cas nommé : `PrismaClientValidationError` recopie les ARGUMENTS de la
    // requête dans son message — donc la parole déposée. Il est aujourd'hui
    // inatteignable (`preparerEntree` garantit les types), et c'est justement
    // pour cela qu'il faut l'épingler : rien d'autre ne le tient.
    const fuite = Object.assign(new Error(`Invalid \`create()\`: texte: "${TEXTE}", email: ${PATIENT.email}`), {
      name: 'PrismaClientValidationError',
    });
    prisma.entreeCeQuiCompte.create.mockRejectedValueOnce(fuite);
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
      expect(res.status).toBe(500);
      const charge = (await res.json()) as { reason: string };
      expect(charge.reason).toBe('exception');
      // La réponse rendue au patient ne recopie rien de l'exception non plus.
      expect(JSON.stringify(charge)).not.toContain(TEXTE);

      const journal = espion.mock.calls.map((appel) => appel.join(' ')).join('\n');
      expect(journal).toContain('PrismaClientValidationError');
      expect(journal, 'le texte déposé ne doit jamais atteindre le journal').not.toContain(TEXTE);
      expect(journal, 'l’e-mail du patient ne doit jamais atteindre le journal').not.toContain(
        PATIENT.email,
      );
    } finally {
      espion.mockRestore();
    }
  });

  it('une erreur technique non-Prisma garde son message : le diagnostic reste possible', async () => {
    // Contrepartie assumée de la restriction : on ne perd pas la seule chose
    // qui permet de comprendre un 500 inattendu. Ces erreurs-là ne voient pas
    // le corps de la requête.
    prisma.entreeCeQuiCompte.create.mockRejectedValueOnce(new Error('ECONNREFUSED 127.0.0.1:5432'));
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
      expect(res.status).toBe(500);
      expect(espion.mock.calls.map((appel) => appel.join(' ')).join('\n')).toContain('ECONNREFUSED');
    } finally {
      espion.mockRestore();
    }
  });
});

describe('POST /api/portail/ce-qui-compte — gardes structurelles', () => {
  it('G3 conservation : deux dépôts ⇒ deux create, jamais update/upsert/delete', async () => {
    expect((await POST(postRequest(cookieProprio(), { texte: 'Premier dépôt.' }))).status).toBe(201);
    expect((await POST(postRequest(cookieProprio(), { texte: 'Second dépôt.' }))).status).toBe(201);
    expect(prisma.entreeCeQuiCompte.create).toHaveBeenCalledTimes(2);
    expect(prisma.entreeCeQuiCompte.update).not.toHaveBeenCalled();
    expect(prisma.entreeCeQuiCompte.upsert).not.toHaveBeenCalled();
    expect(prisma.entreeCeQuiCompte.delete).not.toHaveBeenCalled();
    expect(prisma.entreeCeQuiCompte.deleteMany).not.toHaveBeenCalled();
    // Rien ne s'écrase : les deux paroles partent telles quelles.
    expect(dernierCreate(0).data.texte).toBe('Premier dépôt.');
    expect(dernierCreate(1).data.texte).toBe('Second dépôt.');
  });

  it('G4 portée session : un idPatient dans le corps est IGNORÉ', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE, idPatient: 'PAT_AUTRE' }));
    expect(res.status).toBe(201);
    // C'est CE banc qui attrape `body.idPatient ?? session.idPatient` — pas
    // les 401/403, qui restent verts avec cette faute.
    expect(dernierCreate().data.idPatient).toBe(PATIENT.idPatient);
  });

  it('G5 deux dates : creeLe absent du data ; saisiLe absente ⇒ null conservé', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    expect(res.status).toBe(201);
    const data = dernierCreate().data;
    // `creeLe` est posé par la base (@default(now())) : le transmettre
    // rendrait un dépôt antidatable.
    expect('creeLe' in data).toBe(false);
    // Une saisie non déclarée reste un silence — jamais comblée par creeLe.
    expect(data.saisiLe).toBeNull();
    expect(((await res.json()) as { entree: { saisiLe: string | null } }).entree.saisiLe).toBeNull();
  });

  it('G5 deux dates : une saisie déclarée est conservée, distincte de creeLe', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE, saisiLe: '2026-08-20' }));
    expect(res.status).toBe(201);
    expect((dernierCreate().data.saisiLe as Date).toISOString()).toBe('2026-08-20T00:00:00.000Z');
    const json = (await res.json()) as { entree: { saisiLe: string; creeLe: string } };
    expect(json.entree.saisiLe).toBe('2026-08-20T00:00:00.000Z');
    expect(json.entree.creeLe).toBe('2026-08-22T09:00:00.000Z');
    expect(json.entree.saisiLe).not.toBe(json.entree.creeLe);
  });

  it('G2 la réponse ne porte aucun agrégat — ni décompte, ni total', async () => {
    const res = await POST(postRequest(cookieProprio(), { texte: TEXTE }));
    const json = (await res.json()) as Record<string, Record<string, unknown>>;
    expect(Object.keys(json).sort()).toEqual(['entree', 'ok']);
    expect(Object.keys(json.entree).sort()).toEqual(['creeLe', 'id', 'saisiLe']);
  });
});

describe('GET /api/portail/ce-qui-compte — interrupteur d’écran seul', () => {
  it('drapeau éteint : 503', async () => {
    delete process.env.WN_CE_QUI_COMPTE;
    expect((await GET(getRequest(cookieProprio()))).status).toBe(503);
  });

  it('pas de sonde anonyme : hors session, 401 comme le POST', async () => {
    expect((await GET(getRequest(undefined))).status).toBe(401);
  });

  it('SIGNATURE ALTÉRÉE : 401 ici aussi, sans toucher la base', async () => {
    // L'interrupteur d'écran passe la MÊME authentification que le dépôt : un
    // cookie forgé ne doit pas pouvoir servir de sonde du drapeau.
    const res = await GET(getRequest(cookieSignatureAlteree()));
    expect(res.status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('CHARGE FORGÉE : 401 ici aussi', async () => {
    expect((await GET(getRequest(cookieChargeForgee()))).status).toBe(401);
    expect(prisma.patient.findUnique).not.toHaveBeenCalled();
  });

  it('SESSIONS INVALIDÉES après l’émission : 403', async () => {
    mockCompteActif({ sessionsInvalidesAvant: new Date(Date.now() + 60_000) });
    expect((await GET(getRequest(cookieProprio()))).status).toBe(403);
  });

  it('session valide : rend « ouvert », et NE LIT AUCUNE ENTRÉE', async () => {
    const res = await GET(getRequest(cookieProprio()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, ouvert: true });
    // L'interrupteur est un interrupteur : aucune donnée patient ne transite.
    expect(prisma.entreeCeQuiCompte.findMany).not.toHaveBeenCalled();
    aucuneEcriture();
  });
});
