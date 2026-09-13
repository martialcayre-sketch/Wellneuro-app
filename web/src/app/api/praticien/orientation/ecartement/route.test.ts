import { beforeEach, describe, expect, it, vi } from 'vitest';

// Le banc de la route d'écartement — [[D-178]].
//
// CE QU'IL DOIT PROUVER AVANT TOUT : les règles figées dans la ligne viennent du
// SERVEUR, jamais du corps de la requête. C'est de là que le réveil tire sa
// fiabilité — une liste fournie par le client pourrait couvrir tous les axes, et
// la proposition ne reviendrait jamais : un axe clinique tu en silence (`DC-30`).
//
// Le reste éprouve l'alternance des espèces, le refus d'écrire dans un fil
// illisible, et le fait que la base a le dernier mot sur une course.

const { getServerSession, prisma, evaluerOrientationPourPatient } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    ecartementProposition: {
      findMany: vi.fn(),
      create: vi.fn(),
      // Moqués EXPRÈS alors que la route ne les appelle jamais : sans eux,
      // l'assertion « append-only » ne pourrait pas s'écrire — un mock absent
      // lèverait au lieu de compter zéro.
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
  },
  evaluerOrientationPourPatient: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/clinical/orientationService', () => ({ evaluerOrientationPourPatient }));

import { POST, type EcartementPropositionResponse } from './route';

const URL_BASE = 'http://localhost/api/praticien/orientation/ecartement';
const PRATICIEN = 'praticien@wellneuro.fr';
const CIBLE = 'questionnaire:Q_STR_03';

function requete(corps: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

const corpsEcarter = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  cibleId: CIBLE,
  action: 'ecarter',
  motif: 'Le stress est déjà exploré par ailleurs.',
  ...partiel,
});

/** Une ligne telle que Prisma la rend : `faitLe` est une `Date`, pas une chaîne. */
function ligne(surcharges: Record<string, unknown> = {}) {
  return {
    id: 'ec_1',
    cibleId: CIBLE,
    espece: 'ecartement',
    reglesAuGeste: ['R2-STR-02'],
    motif: 'Écarté une première fois.',
    parEmail: PRATICIEN,
    faitLe: new Date('2026-09-13T10:00:00.000Z'),
    supersedesEcartementId: null,
    ...surcharges,
  };
}

/** L'orientation active servant la cible, motivée par les règles nommées. */
function orientationServant(regles: string[] = ['R2-STR-02']) {
  return {
    actif: true as const,
    version: 'v1',
    sha256: 'peu-importe',
    recommandations: [
      {
        cible: { type: 'questionnaire' as const, questionnaireId: 'Q_STR_03' },
        motifs: regles.map(regleId => ({ regleId })),
      },
    ],
    ecartees: [],
    arret: null,
  };
}

async function corpsReponse(reponse: Response): Promise<{ reason?: string; error?: string; ok: boolean }> {
  return (await reponse.json()) as EcartementPropositionResponse & { reason?: string; error?: string };
}

function donneesCreees(): Record<string, unknown> {
  return prisma.ecartementProposition.create.mock.calls[0][0].data as Record<string, unknown>;
}

beforeEach(() => {
  vi.clearAllMocks();
  getServerSession.mockResolvedValue({ user: { email: PRATICIEN } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_TEST' });
  prisma.ecartementProposition.findMany.mockResolvedValue([]);
  prisma.ecartementProposition.create.mockResolvedValue({ id: 'ec_neuf' });
  evaluerOrientationPourPatient.mockResolvedValue(orientationServant());
});

describe('les portes avant toute lecture clinique', () => {
  it('sans session : 401, et aucune lecture de dossier', async () => {
    getServerSession.mockResolvedValue(null);
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(401);
    expect(prisma.patient.findFirst).not.toHaveBeenCalled();
  });

  it('session sans e-mail : 401 — l’auteur du geste doit être nommable', async () => {
    // Le motif et l'auteur SONT la décision ([[D-127]]) : une ligne sans auteur
    // serait un écartement que personne n'a signé.
    getServerSession.mockResolvedValue({ user: {} });
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(401);
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('le dossier d’un autre praticien est INTROUVABLE, pas interdit', async () => {
    prisma.patient.findFirst.mockResolvedValue(null);
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(404);
    expect((await corpsReponse(reponse)).reason).toBe('not_found');
    expect(prisma.ecartementProposition.findMany).not.toHaveBeenCalled();
  });

  it('LE `where` PORTE LE FILTRE D’APPARTENANCE — sinon ce banc ne prouve rien', async () => {
    // CE CAS EXISTE PARCE QUE LE PRÉCÉDENT NE TENAIT RIEN. Moquer `findFirst` à
    // `null` prouve seulement que la route croit ce que le mock lui répond :
    // retirer `filtrePatientsDuPraticien` du `where` laissait les 26 tests du
    // fichier VERTS, et la route écrivait alors sur le dossier d'un autre
    // praticien. Vérifié par mutation le 2026-09-13. L'autorisation se tient
    // désormais par l'assertion ci-dessous, pas par la lecture du code.
    await POST(requete(corpsEcarter()));
    const where = prisma.patient.findFirst.mock.calls[0][0].where;
    expect(where.idPatient).toBe('PAT_TEST');
    expect(where.praticienEmail).toEqual({ equals: PRATICIEN, mode: 'insensitive' });
  });

  it('le fil est lu SCOPÉ au dossier ET à la cible', async () => {
    // Même vacuité sans cette assertion : sans `idPatient` dans le `where`, les
    // écartements d'un dossier masqueraient des propositions dans un autre — en y
    // affichant son motif, donc du contenu clinique d'un tiers.
    await POST(requete(corpsEcarter()));
    expect(prisma.ecartementProposition.findMany.mock.calls[0][0].where)
      .toEqual({ idPatient: 'PAT_TEST', cibleId: CIBLE });
  });

  it('un corps illisible tombe en `invalid`, pas en 500', async () => {
    const reponse = await POST(new Request(URL_BASE, { method: 'POST', body: 'pas du json' }));
    expect(reponse.status).toBe(400);
    expect((await corpsReponse(reponse)).reason).toBe('invalid');
  });
});

describe('la forme de la cible est celle de la base, refusée AVANT d’écrire', () => {
  it('la clé INTERNE du moteur est refusée — `q:` n’est pas `questionnaire:`', async () => {
    // Sans ce refus, la base rendrait un `23514` opaque au praticien. C'est le
    // piège exact que `lib/orientation/ecartements.ts` existe pour fermer.
    const reponse = await POST(requete(corpsEcarter({ cibleId: 'q:Q_STR_03' })));
    expect(reponse.status).toBe(400);
    expect((await corpsReponse(reponse)).reason).toBe('invalid');
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('une cible sans préfixe, ou d’un préfixe inconnu, est refusée', async () => {
    for (const cibleId of ['Q_STR_03', 'instrument:Q_STR_03', 'questionnaire:', '']) {
      const reponse = await POST(requete(corpsEcarter({ cibleId })));
      expect(reponse.status, cibleId).toBe(400);
    }
  });

  it('un geste inconnu est refusé — il n’y a que deux gestes', async () => {
    for (const action of ['supprimer', 'ecarter ', '', undefined]) {
      const reponse = await POST(requete(corpsEcarter({ action })));
      expect(reponse.status, String(action)).toBe(400);
    }
  });
});

describe('le motif écrit est obligatoire, sur les DEUX gestes', () => {
  it('un motif fait de tabulations est refusé — comme en base', async () => {
    // `btrim/1` ne retire que l'espace ASCII : c'est le défaut que la revue a
    // trouvé dans la migration. Ici comme là-bas, les tabulations tombent.
    for (const motif of ['', '   ', '\t\n\r ']) {
      const reponse = await POST(requete(corpsEcarter({ motif })));
      expect(reponse.status, JSON.stringify(motif)).toBe(400);
    }
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('un motif non-chaîne est refusé', async () => {
    for (const motif of [undefined, null, 42, { texte: 'oui' }]) {
      const reponse = await POST(requete(corpsEcarter({ motif })));
      expect(reponse.status, String(motif)).toBe(400);
    }
  });

  it('la borne haute mord', async () => {
    const reponse = await POST(requete(corpsEcarter({ motif: 'x'.repeat(2001) })));
    expect(reponse.status).toBe(400);
  });

  it('une REPRISE sans motif est refusée aussi', async () => {
    // Rouvrir une exploration qu'on avait refusée se justifie autant que l'avoir
    // refusée : le motif n'est pas une note facultative.
    prisma.ecartementProposition.findMany.mockResolvedValue([ligne()]);
    const reponse = await POST(requete(corpsEcarter({ action: 'reprendre', motif: '  ' })));
    expect(reponse.status).toBe(400);
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });
});

describe('écarter — LES RÈGLES VIENNENT DU SERVEUR', () => {
  it('les règles écrites sont celles du moteur, JAMAIS celles du corps', async () => {
    // LE BANC CENTRAL DE CE FICHIER. Un client qui figerait une liste couvrant
    // tous les axes empêcherait tout réveil ; le corps porte donc ici une liste
    // hostile — et un `supersedes`, une espèce et un auteur inventés avec elle.
    evaluerOrientationPourPatient.mockResolvedValue(orientationServant(['R2-STR-02', 'R-SOM-01']));
    const reponse = await POST(requete(corpsEcarter({
      reglesAuGeste: ['R-TOUT', 'R-AUSSI'],
      regles: ['R-TOUT'],
      parEmail: 'quelquun@ailleurs.fr',
      supersedesEcartementId: 'ec_invente',
      espece: 'reprise',
    })));
    expect(reponse.status).toBe(200);
    const data = donneesCreees();
    expect(data.reglesAuGeste).toEqual(['R-SOM-01', 'R2-STR-02']);
    expect(data.espece).toBe('ecartement');
    expect(data.parEmail).toBe(PRATICIEN);
    expect(data.supersedesEcartementId).toBeNull();
    expect(data.idPatient).toBe('PAT_TEST');
  });

  it('les règles sont dédupliquées et triées — l’ordre du moteur ne fuit pas', async () => {
    // Une même cible peut être motivée deux fois par la même règle. Un doublon
    // passerait le CHECK, mais rendrait la comparaison du réveil bruyante.
    evaluerOrientationPourPatient.mockResolvedValue(orientationServant(['R-SOM-01', 'R2-STR-02', 'R-SOM-01']));
    await POST(requete(corpsEcarter()));
    expect(donneesCreees().reglesAuGeste).toEqual(['R-SOM-01', 'R2-STR-02']);
  });

  it('une cible qui n’est PLUS proposée ne s’écarte pas', async () => {
    // L'écartement figerait une liste de règles VIDE, que le CHECK refuse — et à
    // raison : un tel écartement ne se réveillerait jamais.
    evaluerOrientationPourPatient.mockResolvedValue({ ...orientationServant(), recommandations: [] });
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(409);
    expect((await corpsReponse(reponse)).reason).toBe('not_proposed');
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('orientation inactive : rien ne s’écarte', async () => {
    evaluerOrientationPourPatient.mockResolvedValue({ actif: false, version: 'v1', message: 'inactif' });
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(409);
    expect((await corpsReponse(reponse)).reason).toBe('not_proposed');
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('déjà écartée SANS règle neuve : 409', async () => {
    prisma.ecartementProposition.findMany.mockResolvedValue([ligne()]);
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(409);
    expect((await corpsReponse(reponse)).reason).toBe('conflict');
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('une proposition RÉVEILLÉE se ré-écarte, et le geste fige la règle NEUVE', async () => {
    // LE DÉFAUT BLOQUANT DE LA PREMIÈRE RÉDACTION (revue du 2026-09-13). L'alternance
    // était jugée sur le FIL SEUL : tête = écartement ⇒ refus. Pendant un réveil, le
    // fil a bien un écartement pour tête alors que l'écran montre la ligne comme à
    // examiner — le praticien se voyait refuser l'écartement d'une ligne visible,
    // sans autre sortie (« Reprendre » ne vit que dans le repli des écartées, où une
    // ligne réveillée n'est pas). La cible restait GELÉE, sur le cas même que
    // [[D-178]] existe pour couvrir.
    prisma.ecartementProposition.findMany.mockResolvedValue([
      ligne({ id: 'tete', reglesAuGeste: ['R2-STR-02'] }),
    ]);
    // L'axe sommeil allume désormais la même cible.
    evaluerOrientationPourPatient.mockResolvedValue(orientationServant(['R2-STR-02', 'R-SOM-01']));

    const reponse = await POST(requete(corpsEcarter({ motif: 'Je l’écarte aussi pour le sommeil.' })));

    expect(reponse.status).toBe(200);
    const data = donneesCreees();
    expect(data.espece).toBe('ecartement');
    // CHAÎNÉ sur la tête réveillée — pas une seconde racine, que l'index partiel
    // refuserait.
    expect(data.supersedesEcartementId).toBe('tete');
    // ET LA RÈGLE NEUVE EST FIGÉE : sans elle, la ligne se réveillerait aussitôt
    // sur le motif qui vient de la ramener.
    expect(data.reglesAuGeste).toEqual(['R-SOM-01', 'R2-STR-02']);
  });

  it('après une reprise, le nouvel écartement CHAÎNE sur la reprise', async () => {
    // L'état courant est la TÊTE, et la tête est ici la reprise : le fil
    // s'allonge, il ne redémarre pas — une seconde racine casserait l'index
    // partiel, et la cible n'aurait plus d'état lisible.
    prisma.ecartementProposition.findMany.mockResolvedValue([
      ligne({ id: 'a', supersedesEcartementId: null }),
      ligne({ id: 'b', espece: 'reprise', reglesAuGeste: [], supersedesEcartementId: 'a' }),
    ]);
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(200);
    expect(donneesCreees().supersedesEcartementId).toBe('b');
  });
});

describe('reprendre', () => {
  it('chaîne sur la tête, sans règles, et ne rejoue PAS le moteur', async () => {
    // Une reprise doit rester possible sur une cible qui n'est plus proposée :
    // sinon un écartement resterait gravé faute de pouvoir être défait.
    prisma.ecartementProposition.findMany.mockResolvedValue([ligne({ id: 'tete' })]);
    const reponse = await POST(requete(corpsEcarter({
      action: 'reprendre',
      motif: 'Je rouvre : le sommeil s’est dégradé depuis.',
    })));
    expect(reponse.status).toBe(200);
    const data = donneesCreees();
    expect(data.espece).toBe('reprise');
    expect(data.reglesAuGeste).toEqual([]);
    expect(data.supersedesEcartementId).toBe('tete');
    expect(evaluerOrientationPourPatient).not.toHaveBeenCalled();
  });

  it('rien à reprendre sur une proposition jamais écartée', async () => {
    const reponse = await POST(requete(corpsEcarter({ action: 'reprendre' })));
    expect(reponse.status).toBe(409);
    expect((await corpsReponse(reponse)).reason).toBe('conflict');
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('rien à reprendre quand la tête est DÉJÀ une reprise', async () => {
    prisma.ecartementProposition.findMany.mockResolvedValue([
      ligne({ id: 'a' }),
      ligne({ id: 'b', espece: 'reprise', reglesAuGeste: [], supersedesEcartementId: 'a' }),
    ]);
    const reponse = await POST(requete(corpsEcarter({ action: 'reprendre' })));
    expect(reponse.status).toBe(409);
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });

  it('une reprise reste possible sur une cible QUI N’EST PLUS PROPOSÉE', async () => {
    // DÉFAIRE DOIT RESTER POSSIBLE QUAND FAIRE NE L'EST PLUS. Subordonner la
    // reprise à ce que la table propose aujourd'hui rendrait l'écartement
    // indéfectible dès que la cible cesse d'être motivée.
    prisma.ecartementProposition.findMany.mockResolvedValue([ligne({ id: 'tete' })]);
    evaluerOrientationPourPatient.mockResolvedValue({ ...orientationServant(), recommandations: [] });
    const reponse = await POST(requete(corpsEcarter({ action: 'reprendre' })));
    expect(reponse.status).toBe(200);
    expect(evaluerOrientationPourPatient).not.toHaveBeenCalled();
  });

  it('un `P2002` sur la reprise devient aussi une phrase française', async () => {
    // Deux reprises concurrentes chaînent sur la MÊME tête : l'unicité de
    // `supersedes` refuse la seconde. Cette branche a sa propre traduction.
    prisma.ecartementProposition.findMany.mockResolvedValue([ligne({ id: 'tete' })]);
    prisma.ecartementProposition.create.mockRejectedValue(
      Object.assign(new Error('unique constraint'), { code: 'P2002' }),
    );
    const reponse = await POST(requete(corpsEcarter({ action: 'reprendre' })));
    expect(reponse.status).toBe(409);
    const corps = await corpsReponse(reponse);
    expect(corps.reason).toBe('conflict');
    expect(corps.error).toMatch(/Rechargez la fiche/);
    expect(corps.error).not.toMatch(/P2002|constraint/);
  });
});

describe('le motif tel qu’il est STOCKÉ', () => {
  it('les bords blancs sont retirés, le milieu est intact', async () => {
    await POST(requete(corpsEcarter({ motif: '\n\n  Deux raisons.\n\nLa seconde.\n ' })));
    expect(donneesCreees().motif).toBe('Deux raisons.\n\nLa seconde.');
  });

  it('un motif fait d’un seul blanc UNICODE est refusé — la base l’accepterait', async () => {
    // `btrim(motif, E' \t\r\n')` ne connaît que quatre caractères : une espace
    // INSÉCABLE passe son CHECK. L'écartement aurait alors un motif qui s'affiche
    // vide, soit l'écartement sans motif que [[D-178]] interdit.
    for (const point of [0x00a0, 0x200b, 0x3000, 0xfeff, 0x2060]) {
      const reponse = await POST(requete(corpsEcarter({ motif: String.fromCodePoint(point) })));
      expect(reponse.status, `U+${point.toString(16)}`).toBe(400);
    }
    expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
  });
});

describe('un fil illisible ne s’écrit pas', () => {
  const fils: Array<[string, ReturnType<typeof ligne>[]]> = [
    ['`supersedes` pendouillant', [ligne({ id: 'a', supersedesEcartementId: 'jamais_ecrit' })]],
    ['cycle de longueur 2', [
      ligne({ id: 'a', supersedesEcartementId: 'b' }),
      ligne({ id: 'b', supersedesEcartementId: 'a' }),
    ]],
    ['deux racines concurrentes', [
      ligne({ id: 'r1', supersedesEcartementId: null }),
      ligne({ id: 'r2', supersedesEcartementId: null }),
    ]],
  ];

  for (const [nom, fil] of fils) {
    it(`refuse d’écrire — ${nom}`, async () => {
      // Ajouter une ligne à un fil qu'on ne sait pas lire, c'est ajouter au
      // désordre. La LECTURE, elle, retombe sur « visible » : montrer est le
      // défaut réparable, cacher ne l'est pas (`DC-24`, `DC-30`).
      prisma.ecartementProposition.findMany.mockResolvedValue(fil);
      for (const action of ['ecarter', 'reprendre']) {
        const reponse = await POST(requete(corpsEcarter({ action })));
        expect(reponse.status, action).toBe(409);
        expect((await corpsReponse(reponse)).reason, action).toBe('broken_thread');
      }
      expect(prisma.ecartementProposition.create).not.toHaveBeenCalled();
    });
  }
});

describe('la base a le dernier mot sur une course', () => {
  it('un `P2002` devient une phrase française, pas un code Postgres', async () => {
    // Deux écartements concurrents lisent tous deux « aucune tête » : l'index
    // PARTIEL de racine refuse le second. Deux reprises chaînent sur la même
    // tête : l'unicité de `supersedes` refuse la seconde.
    prisma.ecartementProposition.create.mockRejectedValue(
      Object.assign(new Error('unique constraint'), { code: 'P2002' }),
    );
    const reponse = await POST(requete(corpsEcarter()));
    expect(reponse.status).toBe(409);
    const corps = await corpsReponse(reponse);
    expect(corps.reason).toBe('conflict');
    expect(corps.error).toMatch(/Rechargez la fiche/);
    expect(corps.error).not.toMatch(/P2002|constraint/);
  });

  it('une erreur technique ne laisse RIEN fuiter du motif', async () => {
    // Un message d'erreur de base porte la ligne refusée, donc le motif écrit
    // par le praticien — contenu clinique qui n'a rien à faire dans une réponse
    // HTTP ni dans un log.
    const motif = 'Contenu clinique qui ne doit pas ressortir.';
    prisma.ecartementProposition.create.mockRejectedValue(
      new Error(`insert failed for value "${motif}"`),
    );
    const reponse = await POST(requete(corpsEcarter({ motif })));
    expect(reponse.status).toBe(500);
    const corps = await corpsReponse(reponse);
    expect(corps.reason).toBe('exception');
    expect(corps.error).toBe('Erreur technique.');
    expect(JSON.stringify(corps)).not.toContain('clinique');
  });
});

describe('append-only', () => {
  it('aucun geste ne met à jour ni ne supprime une ligne', async () => {
    prisma.ecartementProposition.findMany.mockResolvedValue([ligne({ id: 'tete' })]);
    await POST(requete(corpsEcarter({ action: 'reprendre' })));
    prisma.ecartementProposition.findMany.mockResolvedValue([]);
    await POST(requete(corpsEcarter()));
    for (const nom of ['update', 'updateMany', 'delete', 'deleteMany'] as const) {
      expect(prisma.ecartementProposition[nom], nom).not.toHaveBeenCalled();
    }
  });
});
