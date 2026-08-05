import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    bookletEnvoi: { findFirst: vi.fn() },
  },
}));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/observability/logger', () => ({
  logger: { security: vi.fn(), error: vi.fn() },
}));

// `@/lib/consultation/portail` n'est PAS moqué, délibérément : c'est lui qui
// porte l'appartenance, la révocation et `sessionsInvalidesAvant`. Le moquer
// rendrait la garde indétectable — le piège relevé en revue sur #477.
import { signPatientSession } from '@/lib/patient-session';
import { logger } from '@/lib/observability/logger';
import { GET } from './route';

const patient = {
  idPatient: 'PAT_TEST',
  prenom: 'Sophie',
  nom: 'Nicola',
  email: 'sophie.nicola@example.test',
  actif: true,
  accessToken: 'TOK',
  accessTokenRevoked: false,
};

const SYNTHESE = {
  syntheseJson: {
    resume_praticien: 'Résumé réservé au praticien',
    axes_prioritaires: [
      { axe: 'Sommeil', niveau_priorite: 'eleve', arguments: ['réveils'], points_a_confirmer: ['ferritine'] },
    ],
    points_de_vigilance: ['Idées noires ou suicidaires — avis médical à évaluer en priorité.'],
    questions_entretien: ['Depuis quand ?'],
    narratif_patient: 'Vos réponses évoquent un sommeil fragmenté.',
    limites: 'À valider.',
  },
  modele: 'claude-opus-5',
};

// Ce que la route lit réellement : l'instantané figé à l'envoi, et la synthèse
// pour le seul narratif. La note VIVANTE de la synthèse n'y figure pas.
const ENVOI = {
  dateEnvoi: new Date('2026-07-18T09:30:00.000Z'),
  noteTransmise: 'On en reparle en consultation.',
  synthese: SYNTHESE,
};

function requete(cookie?: string): Request {
  return new Request('http://localhost/api/portail/bilan', {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

function cookieValide(): string {
  return signPatientSession({ idPatient: patient.idPatient, email: patient.email });
}

type EnvoiFixture = {
  id: string;
  dateEnvoi: Date;
  noteTransmise: string | null;
  statut: string;
  idPatient: string;
  synthese: { idPatient: string; statut: string; syntheseJson: unknown; modele: string };
};

function comparer(a: EnvoiFixture, b: EnvoiFixture, orderBy: Record<string, 'asc' | 'desc'>[]): number {
  for (const critere of orderBy) {
    const [champ, sens] = Object.entries(critere)[0];
    const va = (a as unknown as Record<string, unknown>)[champ];
    const vb = (b as unknown as Record<string, unknown>)[champ];
    const brut =
      va instanceof Date && vb instanceof Date
        ? va.getTime() - vb.getTime()
        : String(va).localeCompare(String(vb));
    if (brut !== 0) return sens === 'desc' ? -brut : brut;
  }
  return 0;
}

// Les clés que ce banc sait émuler, CHEMIN PAR CHEMIN. Un contrôle limité au
// premier niveau laisserait passer en silence une condition ajoutée dans
// `synthese.is` — ou tout un `AND`/`OR`/`NOT` imbriqué —, et le banc resterait
// vert en prétendant émuler la requête. C'est pire qu'un mock naïf : il inspire
// confiance. Un chemin absent de cette table est donc un territoire inconnu, et
// toute clé qu'on y trouve fait échouer le banc.
const CLES_EMULEES: Record<string, string[]> = {
  '': ['idPatient', 'statut', 'synthese'],
  synthese: ['is'],
  'synthese.is': ['idPatient', 'statut'],
  'synthese.is.statut': ['not'],
};

function verifierWhereEmule(noeud: unknown, chemin = ''): void {
  if (noeud === null || typeof noeud !== 'object' || noeud instanceof Date) return;
  if (Array.isArray(noeud)) {
    // Un tableau ne peut venir que d'un opérateur (`AND`, `OR`, `in`…) : aucun
    // n'est émulé, et le chemin qui y mène a déjà été refusé plus haut.
    throw new Error(`Filtre non émulé par le banc : ${chemin}[]`);
  }
  const autorisees = CLES_EMULEES[chemin];
  for (const cle of Object.keys(noeud as Record<string, unknown>)) {
    const sousChemin = chemin ? `${chemin}.${cle}` : cle;
    if (autorisees === undefined || !autorisees.includes(cle)) {
      throw new Error(`Filtre non émulé par le banc : ${sousChemin}`);
    }
    verifierWhereEmule((noeud as Record<string, unknown>)[cle], sousChemin);
  }
}

// Émule ce que Prisma ferait du `where` ET de l'`orderBy` RÉELLEMENT émis, sur
// un petit jeu d'envois. Un mock qui rend toujours la même ligne ne peut pas
// dire QUEL envoi la route lit — or c'est précisément la question quand deux
// envois se suivent. Toute clé de `where` non émulée, À N'IMPORTE QUELLE
// PROFONDEUR, fait échouer le banc plutôt que d'être ignorée : un filtre sauté
// en silence rendrait le test aveugle à ce qu'il affirme.
function mockEnvois(envois: EnvoiFixture[]): void {
  prisma.bookletEnvoi.findFirst.mockImplementation(
    async (args: { where: Record<string, unknown>; orderBy: Record<string, 'asc' | 'desc'>[] }) => {
      const where = args.where as {
        idPatient?: string;
        statut?: string;
        synthese?: { is?: { idPatient?: string; statut?: { not?: string } } };
      };
      verifierWhereEmule(where);
      const retenus = envois
        .filter(
          e =>
            (where.idPatient === undefined || e.idPatient === where.idPatient) &&
            (where.statut === undefined || e.statut === where.statut) &&
            (where.synthese?.is?.idPatient === undefined ||
              e.synthese.idPatient === where.synthese.is.idPatient) &&
            (where.synthese?.is?.statut?.not === undefined ||
              e.synthese.statut !== where.synthese.is.statut.not),
        )
        .sort((a, b) => comparer(a, b, args.orderBy));
      return retenus[0] ?? null;
    },
  );
}

describe('GET /api/portail/bilan', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
    prisma.patient.findUnique.mockResolvedValue(patient);
    prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
  });

  it('sert le bilan transmis, réduit au narratif et à la note', async () => {
    prisma.bookletEnvoi.findFirst.mockResolvedValue(ENVOI);

    const corps = await (await GET(requete(cookieValide()))).json();
    expect(corps.ok).toBe(true);
    expect(corps.bilan).toEqual({
      narratif: 'Vos réponses évoquent un sommeil fragmenté.',
      notePraticien: 'On en reparle en consultation.',
      mentionPreparation: expect.stringContaining('assistance d’intelligence artificielle'),
      transmisLe: '2026-07-18T09:30:00.000Z',
    });
  });

  // Le contrat que la page rend au navigateur du patient. Assertion sur la
  // réponse SÉRIALISÉE : un champ ajouté par distraction échouerait ici.
  it('ne laisse fuir aucun bloc réservé au praticien', async () => {
    prisma.bookletEnvoi.findFirst.mockResolvedValue(ENVOI);

    const brut = JSON.stringify(await (await GET(requete(cookieValide()))).json());
    for (const réservé of [
      'Résumé réservé',
      'réveils',
      'ferritine',
      'Idées noires',
      'avis médical à évaluer en priorité',
      'Depuis quand ?',
    ]) {
      expect(brut).not.toContain(réservé);
    }
  });

  // --- La règle de visibilité, lue sur la requête réellement émise -------

  it('ne lit QUE les envois réussis du patient de la session', async () => {
    await GET(requete(cookieValide()));
    const where = prisma.bookletEnvoi.findFirst.mock.calls[0][0].where;
    expect(where.idPatient).toBe('PAT_TEST');
    expect(where.statut).toBe('Envoye');
    // Concordance exigée entre l'envoi et la synthèse : ferme « le bilan d'un
    // autre » même si `logBookletEnvoi` recopiait un mauvais idPatient.
    expect(where.synthese.is.idPatient).toBe('PAT_TEST');
  });

  // L'envoi ACCORDE la visibilité, le rejet la RETIRE. Sans cette soupape, un
  // praticien qui s'aperçoit après coup qu'il a transmis un bilan erroné n'a
  // aucun moyen de le retirer : `effacer` est refusé dès qu'un envoi existe.
  it('écarte une synthèse rejetée après son envoi', async () => {
    await GET(requete(cookieValide()));
    const where = prisma.bookletEnvoi.findFirst.mock.calls[0][0].where;
    expect(where.synthese.is.statut).toEqual({ not: 'Rejetee' });
  });

  it('prend le dernier envoi, en départageant les ex æquo', async () => {
    await GET(requete(cookieValide()));
    expect(prisma.bookletEnvoi.findFirst.mock.calls[0][0].orderBy).toEqual([
      { dateEnvoi: 'desc' },
      { id: 'desc' },
    ]);
  });

  it('ne demande jamais les données d’entrée de la synthèse', async () => {
    await GET(requete(cookieValide()));
    const select = prisma.bookletEnvoi.findFirst.mock.calls[0][0].select;
    expect(select.synthese.select).not.toHaveProperty('donneesEntree');
    expect(select.synthese.select).not.toHaveProperty('statut');
  });

  // --- L'instantané de la note ------------------------------------------
  //
  // `notes_praticien` reste modifiable après un envoi réussi : l'action
  // `annoter` n'a aucune garde de cycle de vie, contrairement à `effacer`. Le
  // lire en direct publierait au patient un texte jamais transmis — et
  // permettrait d'écrire encore APRÈS la clôture du suivi, alors que tout
  // renvoi y est refusé. C'est le défaut bloquant qu'une revue a trouvé.

  it('lit l’instantané de l’envoi, jamais la note vivante de la synthèse', async () => {
    await GET(requete(cookieValide()));
    const select = prisma.bookletEnvoi.findFirst.mock.calls[0][0].select;
    expect(select.noteTransmise).toBe(true);
    expect(select.synthese.select).not.toHaveProperty('notesPraticien');
  });

  // LA THÈSE DU LOT, jouée dans l'ordre du temps : une note part (t0), puis
  // `syntheses_ia.notes_praticien` est réécrite (t1) sans nouvel envoi. Le
  // portail doit servir t0.
  //
  // Le test ne vaut que s'il VISITE l'état où les deux valeurs divergent : une
  // fixture où elles coïncideraient passerait avec une route qui lit le champ
  // vivant, et ne prouverait rien. D'où l'assertion de précondition, avant
  // toute assertion sur la réponse.
  it('sert l’instantané, jamais la note réécrite après l’envoi', async () => {
    const NOTE_A_L_ENVOI = 'On en reparle en consultation le 12.';
    const NOTE_REECRITE_APRES = 'Reformulation faite après coup, jamais transmise.';
    expect(NOTE_REECRITE_APRES).not.toBe(NOTE_A_L_ENVOI);

    prisma.bookletEnvoi.findFirst.mockResolvedValue({
      ...ENVOI,
      // t0 — figé par `logBookletEnvoi` sur le seul chemin de succès.
      noteTransmise: NOTE_A_L_ENVOI,
      // t1 — le champ vivant, modifiable par l'action `annoter`, sans nouvel
      // envoi derrière lui.
      synthese: { ...SYNTHESE, notesPraticien: NOTE_REECRITE_APRES },
    });

    const res = await GET(requete(cookieValide()));
    const corps = await res.json();
    expect(corps.bilan.notePraticien).toBe(NOTE_A_L_ENVOI);
    // Rouge immédiat si la route se remettait à lire `synthese.notesPraticien`.
    expect(JSON.stringify(corps)).not.toContain(NOTE_REECRITE_APRES);
  });

  it('n’affiche aucune note quand l’envoi n’en portait pas', async () => {
    prisma.bookletEnvoi.findFirst.mockResolvedValue({
      ...ENVOI,
      noteTransmise: null,
      synthese: { ...SYNTHESE, notesPraticien: 'Ajoutée après l’envoi.' },
    });
    const corps = await (await GET(requete(cookieValide()))).json();
    expect(corps.bilan.notePraticien).toBeNull();
  });

  // UN RENVOI SANS NOTE EFFACE LA NOTE DU PORTAIL. Deux envois réussis se
  // suivent : le premier portait une note, le second n'en porte plus. Ce que le
  // patient lit est le SECOND — donc aucune note.
  //
  // C'est le cas qui sépare « le dernier envoi » de « le dernier envoi qui
  // porte une note ». La seconde lecture, plus accueillante en apparence,
  // republierait au patient un texte que le praticien vient précisément de
  // retirer en renvoyant sans lui.
  it('sert le dernier envoi, même lorsqu’il ne porte plus de note', async () => {
    const commun = {
      statut: 'Envoye',
      idPatient: patient.idPatient,
      synthese: { idPatient: patient.idPatient, statut: 'Validee_Praticien', ...SYNTHESE },
    };
    mockEnvois([
      {
        ...commun,
        id: 'BE_1',
        dateEnvoi: new Date('2026-07-18T09:30:00.000Z'),
        noteTransmise: 'Note du premier envoi, retirée depuis.',
      },
      {
        ...commun,
        id: 'BE_2',
        dateEnvoi: new Date('2026-07-25T08:00:00.000Z'),
        noteTransmise: null,
      },
    ]);

    const corps = await (await GET(requete(cookieValide()))).json();
    expect(corps.bilan.transmisLe).toBe('2026-07-25T08:00:00.000Z');
    expect(corps.bilan.notePraticien).toBeNull();
    expect(JSON.stringify(corps)).not.toContain('Note du premier envoi');
  });

  it('rend `bilan: null` — et non une erreur — quand rien n’a été transmis', async () => {
    const res = await GET(requete(cookieValide()));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, bilan: null });
  });

  // --- Les gardes de session, sur le vrai code d'appartenance -----------

  // Deux refus, deux verdicts. 401 = pas de session lisible, le gate a un sens.
  // 403 = session lisible mais COMPTE refusé : renvoyer au gate y reboucherait
  // sans message, d'où le verdict définitif (même contrat que
  // `api/portail/session` et `api/portail/fiche`).
  it('refuse sans cookie de session', async () => {
    const res = await GET(requete());
    expect(res.status).toBe(401);
    expect((await res.json()).reason).toBe('unauthenticated');
    expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
  });

  it('refuse un cookie émis avant une révocation de sessions', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...patient,
      sessionsInvalidesAvant: new Date(Date.now() + 60_000),
    });
    const res = await GET(requete(cookieValide()));
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe('forbidden');
    expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
  });

  it('refuse un compte dont le jeton d’accès est révoqué', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, accessTokenRevoked: true });
    const res = await GET(requete(cookieValide()));
    expect(res.status).toBe(403);
    expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
  });

  it('refuse un compte désactivé', async () => {
    prisma.patient.findUnique.mockResolvedValue({ ...patient, actif: false });
    const res = await GET(requete(cookieValide()));
    expect(res.status).toBe(403);
    expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
  });

  it('refuse un cookie signé pour un autre compte que celui trouvé', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    const res = await GET(requete(cookieValide()));
    expect(res.status).toBe(403);
    expect(prisma.bookletEnvoi.findFirst).not.toHaveBeenCalled();
  });

  // Un refus d'accès à un DOCUMENT CLINIQUE se journalise, comme sur la route
  // sœur du hub : sans trace, une révocation qui déraille est invisible.
  it('journalise chacun des deux refus', async () => {
    await GET(requete());
    expect(logger.security).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.security).mock.calls[0][0].context).toMatchObject({ statusCode: 401 });

    prisma.patient.findUnique.mockResolvedValue({ ...patient, actif: false });
    await GET(requete(cookieValide()));
    expect(logger.security).toHaveBeenCalledTimes(2);
    expect(vi.mocked(logger.security).mock.calls[1][0].context).toMatchObject({ statusCode: 403 });
  });

  // Un suivi clôturé n'est PAS une révocation : le patient garde la lecture du
  // document qui lui a été remis. La clôture interdit un NOUVEL envoi
  // (`accepteNouvelEnvoi`, côté praticien), pas la relecture.
  it('sert encore le bilan après la clôture du suivi', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...patient,
      suiviClotureLe: new Date('2026-07-20T00:00:00.000Z'),
    });
    prisma.bookletEnvoi.findFirst.mockResolvedValue(ENVOI);
    const corps = await (await GET(requete(cookieValide()))).json();
    expect(corps.bilan?.narratif).toBe('Vos réponses évoquent un sommeil fragmenté.');
  });

  // Un 500 sans trace structurée est introuvable : le patient lit « Erreur
  // technique. » et il ne reste rien pour relier sa plainte à l'incident. Le
  // `correlationId` est ce lien, et il part aussi dans l'en-tête de la réponse.
  // Un `console.error` nu n'en portait aucun, alors que les deux refus de cette
  // route se journalisent déjà.
  it('dégrade proprement si la lecture échoue, et le journalise', async () => {
    prisma.bookletEnvoi.findFirst.mockRejectedValue(new Error('boom'));
    const espion = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await GET(requete(cookieValide()));
    expect(res.status).toBe(500);
    expect((await res.json()).ok).toBe(false);

    expect(logger.error).toHaveBeenCalledTimes(1);
    const trace = vi.mocked(logger.error).mock.calls[0][0];
    expect(trace.event).toBe('PORTAIL_PATIENT.SESSION.EXCEPTION');
    expect(trace.domain).toBe('PORTAIL_PATIENT');
    expect(trace.context).toMatchObject({ statusCode: 500, retryable: true });
    expect(trace.context.correlationId).toBe(res.headers.get('X-WellNeuro-Correlation-Id'));
    // La trace est structurée, ou elle n'est pas : plus de `console.error` nu.
    expect(espion).not.toHaveBeenCalled();
    espion.mockRestore();
  });
});
