import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';

// Bancs en style « SIGNATURE RÉELLE » : on ne mocke QUE Prisma, et on forge un
// vrai cookie avec `signPatientSession` (patron
// `api/portail/ce-qui-compte/route.test.ts`). Neutraliser l'authentification
// par un mock de `patient-session` reviendrait à ne pas la prouver.
//
// L'INVARIANT QUE CE FICHIER DÉFEND AVANT TOUS LES AUTRES : le journal ne lève
// aucun drapeau de surface. `WN_PORTAIL_JOURNAL` ouvre le journal, et rien
// d'autre. S'il ouvrait aussi, ne serait-ce que par inadvertance, la lecture
// des synthèses de compréhension, un texte du praticien atteindrait un patient
// dont l'écran est clos — sans qu'aucune décision ne l'ait ouvert.

// LES ÉCRITURES SONT MOCKÉES EXPRÈS, alors que la route ne doit en appeler
// aucune : sans elles, le banc « rien ne s'écrit » serait vide — il prouverait
// la forme du mock, pas le comportement de la route.
const { prisma, ECRITURES } = vi.hoisted(() => {
  const ECRITURES = ['create', 'createMany', 'update', 'updateMany', 'upsert', 'delete', 'deleteMany'];
  const table = (...lectures: string[]) =>
    Object.fromEntries([...lectures, ...ECRITURES].map(nom => [nom, vi.fn()]));
  return {
    ECRITURES,
    prisma: {
      patient: table('findUnique'),
      assignation: table('findMany'),
      bookletEnvoi: table('findMany'),
      syntheseComprehension: table('findMany'),
      objectifNegocie: table('findMany'),
      ratificationObjectif: table('findMany'),
      amendementObjectif: table('findMany'),
      demandeCorrectionObjectif: table('findMany'),
      reponseJalonObjectif: table('findMany'),
      entreeCeQuiCompte: table('findMany'),
      portailJournalRepere: table('findUnique', 'findMany'),
    } as Record<string, Record<string, ReturnType<typeof vi.fn>>>,
  };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { signPatientSession } from '@/lib/patient-session';
import { GET, POST } from './route';

const PATIENT = { idPatient: 'PAT_TEST', email: 'sophie.nicola@example.test' };
const ENTREE = new Date('2026-06-01T08:00:00.000Z');

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
    createdAt: ENTREE,
    ...surcharges,
  });
}

function getRequest(cookie?: string): Request {
  return new Request('http://localhost/api/portail/journal', {
    headers: cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {},
  });
}

const DRAPEAUX = ['WN_PORTAIL_JOURNAL', 'WN_COMPREHENSION', 'WN_DOSSIER_DEUX_VOIX', 'WN_CE_QUI_COMPTE'];

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXTAUTH_SECRET = 'secret-de-test-non-production';
  for (const drapeau of DRAPEAUX) process.env[drapeau] = 'true';
  mockCompteActif();
  for (const table of [
    prisma.assignation,
    prisma.bookletEnvoi,
    prisma.syntheseComprehension,
    prisma.objectifNegocie,
    prisma.ratificationObjectif,
    prisma.amendementObjectif,
    prisma.demandeCorrectionObjectif,
    prisma.reponseJalonObjectif,
    prisma.entreeCeQuiCompte,
  ]) {
    table.findMany.mockResolvedValue([]);
  }
  prisma.portailJournalRepere.findUnique.mockResolvedValue(null);
  prisma.portailJournalRepere.upsert.mockResolvedValue({ idPatient: PATIENT.idPatient });
});

afterEach(() => {
  for (const drapeau of DRAPEAUX) delete process.env[drapeau];
});

describe('GET /api/portail/journal — la porte', () => {
  it('sans cookie de session, rien n’est servi', async () => {
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(401);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('un compte désactivé ou révoqué est refusé en 403, pas en 401', async () => {
    // 401 renverrait le client au gate du portail, qui refuserait à son tour —
    // une boucle sans message.
    mockCompteActif({ actif: false });
    expect((await GET(getRequest(cookieProprio()))).status).toBe(403);

    mockCompteActif({ accessTokenRevoked: true });
    expect((await GET(getRequest(cookieProprio()))).status).toBe(403);
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('LE DRAPEAU EST RELU APRÈS L’IDENTITÉ — un visiteur inconnu n’apprend rien du déploiement', async () => {
    delete process.env.WN_PORTAIL_JOURNAL;
    // Sans cookie : le refus reste 401, jamais 503.
    expect((await GET(getRequest())).status).toBe(401);
    // Avec cookie : 503, et aucune lecture.
    const reponse = await GET(getRequest(cookieProprio()));
    expect(reponse.status).toBe(503);
    expect((await reponse.json()).reason).toBe('ferme');
    expect(prisma.assignation.findMany).not.toHaveBeenCalled();
  });

  it('le drapeau est FAIL-CLOSED — seule la chaîne exacte « true » ouvre', async () => {
    for (const valeur of ['1', 'TRUE', 'oui', '', ' true']) {
      process.env.WN_PORTAIL_JOURNAL = valeur;
      expect((await GET(getRequest(cookieProprio()))).status, valeur).toBe(503);
    }
  });
});

describe('GET /api/portail/journal — le journal ne lève aucun drapeau de surface', () => {
  it('WN_COMPREHENSION éteint : AUCUNE synthèse n’est lue, ni servie', async () => {
    delete process.env.WN_COMPREHENSION;
    const reponse = await GET(getRequest(cookieProprio()));
    expect(reponse.status).toBe(200);
    expect(prisma.syntheseComprehension.findMany).not.toHaveBeenCalled();
    expect((await reponse.json()).evenements.map((e: { espece: string }) => e.espece)).toEqual([
      'entree_accompagnement',
    ]);
  });

  it('WN_DOSSIER_DEUX_VOIX éteint : aucune des cinq tables de l’objectif n’est lue', async () => {
    delete process.env.WN_DOSSIER_DEUX_VOIX;
    await GET(getRequest(cookieProprio()));
    for (const table of [
      prisma.objectifNegocie,
      prisma.ratificationObjectif,
      prisma.amendementObjectif,
      prisma.demandeCorrectionObjectif,
      prisma.reponseJalonObjectif,
    ]) {
      expect(table.findMany).not.toHaveBeenCalled();
    }
  });

  it('WN_CE_QUI_COMPTE éteint : aucune entrée n’est lue', async () => {
    delete process.env.WN_CE_QUI_COMPTE;
    await GET(getRequest(cookieProprio()));
    expect(prisma.entreeCeQuiCompte.findMany).not.toHaveBeenCalled();
  });

  it('LE BILAN ET LES QUESTIONNAIRES NE SONT GARDÉS PAR AUCUN DRAPEAU — ils sont déjà servis', async () => {
    // Les gâter ici les retirerait d'un journal qui prétend dire tout le
    // dossier, alors que le patient les voit déjà sur son hub.
    for (const drapeau of ['WN_COMPREHENSION', 'WN_DOSSIER_DEUX_VOIX', 'WN_CE_QUI_COMPTE']) {
      delete process.env[drapeau];
    }
    await GET(getRequest(cookieProprio()));
    expect(prisma.assignation.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.bookletEnvoi.findMany).toHaveBeenCalledTimes(1);
  });
});

describe('GET /api/portail/journal — ce qui est lu, et ce qui ne l’est pas', () => {
  it('toutes les lectures sont BORNÉES AU DOSSIER du porteur du cookie', async () => {
    await GET(getRequest(cookieProprio()));
    const appels = [
      prisma.assignation,
      prisma.syntheseComprehension,
      prisma.objectifNegocie,
      prisma.ratificationObjectif,
      prisma.amendementObjectif,
      prisma.demandeCorrectionObjectif,
      prisma.reponseJalonObjectif,
      prisma.entreeCeQuiCompte,
    ];
    for (const table of appels) {
      expect(table.findMany.mock.calls[0][0].where).toMatchObject({ idPatient: PATIENT.idPatient });
    }
    // Le bilan passe par `whereEnvoiVisible`, qui porte l'identifiant DEUX fois
    // — sur l'envoi et sur la synthèse liée.
    expect(prisma.bookletEnvoi.findMany.mock.calls[0][0].where).toMatchObject({
      idPatient: PATIENT.idPatient,
      statut: 'Envoye',
    });
  });

  it('UN BROUILLON DE SYNTHÈSE N’EST PAS LU — la requête exige `publieeLe`', async () => {
    // Une synthèse non publiée n'atteint aucune surface patient. L'annoncer au
    // journal dirait au patient qu'un texte existe, qu'il ne peut pas lire.
    await GET(getRequest(cookieProprio()));
    expect(prisma.syntheseComprehension.findMany.mock.calls[0][0].where).toMatchObject({
      publieeLe: { not: null },
    });
  });

  it('sert le journal dérivé, du plus récent au plus ancien', async () => {
    prisma.entreeCeQuiCompte.findMany.mockResolvedValue([
      { id: 'E1', creeLe: new Date('2026-07-01T10:00:00.000Z') },
    ]);
    prisma.syntheseComprehension.findMany.mockResolvedValue([
      { id: 'SYN_1', publieeLe: new Date('2026-08-01T10:00:00.000Z') },
    ]);
    const reponse = await GET(getRequest(cookieProprio()));
    const { evenements } = await reponse.json();
    expect(evenements.map((e: { espece: string }) => e.espece)).toEqual([
      'synthese_publiee',
      'ce_qui_compte_depose',
      'entree_accompagnement',
    ]);
  });

  it('UN DOSSIER NEUF rend une ligne, jamais une liste vide', async () => {
    const reponse = await GET(getRequest(cookieProprio()));
    const { ok, evenements } = await reponse.json();
    expect(ok).toBe(true);
    expect(evenements).toHaveLength(1);
    expect(evenements[0].espece).toBe('entree_accompagnement');
  });

  it('RIEN NE S’ÉCRIT — le journal se DÉRIVE, il ne coche rien', async () => {
    // Sept verbes d'écriture sur dix tables, tous mockés et tous muets. Un
    // journal recopié divergerait de ce qu'il prétend refléter, et personne ne
    // saurait lequel des deux croire — c'est pourquoi ce lot n'a pas de
    // migration, et pourquoi il ne doit pas en gagner une par la bande.
    await GET(getRequest(cookieProprio()));
    for (const [nomTable, table] of Object.entries(prisma)) {
      for (const verbe of ECRITURES) {
        expect(table[verbe], `${nomTable}.${verbe}`).not.toHaveBeenCalled();
      }
    }
  });

  it('une panne de lecture rend 500 sans détail technique', async () => {
    prisma.assignation.findMany.mockRejectedValue(new Error('connexion perdue'));
    const reponse = await GET(getRequest(cookieProprio()));
    expect(reponse.status).toBe(500);
    const payload = await reponse.json();
    expect(payload.error).toBe('Erreur technique.');
    expect(JSON.stringify(payload)).not.toMatch(/connexion perdue/);
  });
});

// ── LE REPÈRE DE FRAÎCHEUR (LOT-02) ────────────────────────────────────────
//
// Deux dangers, opposés et tous deux silencieux. Un repère qui recule rouvre le
// journal sur des faits déjà vus ; un repère que le CLIENT choisit peut être
// posé loin dans le futur et fermer ce journal POUR TOUJOURS, sans que rien ne
// le dise.

function postRequest(cookie?: string, corps?: unknown): Request {
  return new Request('http://localhost/api/portail/journal', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(cookie ? { cookie: `wn_portail=${encodeURIComponent(cookie)}` } : {}),
    },
    body: JSON.stringify(corps ?? {}),
  });
}

describe('GET — ce que le repère ajoute à la réponse', () => {
  it('sans repère, tout est neuf et `vuJusqua` est nul', async () => {
    const { vuJusqua, duNeuf } = await (await GET(getRequest(cookieProprio()))).json();
    expect(vuJusqua).toBeNull();
    expect(duNeuf).toBe(true);
  });

  it('un repère postérieur au dernier fait ferme le journal', async () => {
    prisma.portailJournalRepere.findUnique.mockResolvedValue({
      vuJusqua: new Date('2026-12-31T10:00:00.000Z'),
    });
    const { vuJusqua, duNeuf } = await (await GET(getRequest(cookieProprio()))).json();
    expect(vuJusqua).toBe('2026-12-31T10:00:00.000Z');
    expect(duNeuf).toBe(false);
  });

  it('un fait postérieur au repère le rouvre', async () => {
    prisma.portailJournalRepere.findUnique.mockResolvedValue({
      vuJusqua: new Date('2026-06-01T08:00:00.000Z'),
    });
    prisma.entreeCeQuiCompte.findMany.mockResolvedValue([
      { id: 'E1', creeLe: new Date('2026-07-01T10:00:00.000Z') },
    ]);
    expect((await (await GET(getRequest(cookieProprio()))).json()).duNeuf).toBe(true);
  });

  it('le repère est lu POUR CE DOSSIER, jamais globalement', async () => {
    await GET(getRequest(cookieProprio()));
    expect(prisma.portailJournalRepere.findUnique.mock.calls[0][0].where).toEqual({
      idPatient: PATIENT.idPatient,
    });
  });
});

describe('POST — « j’ai vu mon journal »', () => {
  it('la même porte que le GET : session, compte, drapeau', async () => {
    expect((await POST(postRequest())).status).toBe(401);

    mockCompteActif({ actif: false });
    expect((await POST(postRequest(cookieProprio()))).status).toBe(403);

    mockCompteActif();
    delete process.env.WN_PORTAIL_JOURNAL;
    expect((await POST(postRequest(cookieProprio()))).status).toBe(503);
    expect(prisma.portailJournalRepere.upsert).not.toHaveBeenCalled();
  });

  it('avance le repère jusqu’au fait le plus récent, pour ce dossier', async () => {
    prisma.entreeCeQuiCompte.findMany.mockResolvedValue([
      { id: 'E1', creeLe: new Date('2026-07-01T10:00:00.000Z') },
    ]);
    const reponse = await POST(postRequest(cookieProprio()));
    expect(reponse.status).toBe(200);
    expect((await reponse.json())).toMatchObject({
      ok: true,
      vuJusqua: '2026-07-01T10:00:00.000Z',
      inchange: false,
    });
    const appel = prisma.portailJournalRepere.upsert.mock.calls[0][0];
    expect(appel.where).toEqual({ idPatient: PATIENT.idPatient });
    expect(appel.create).toEqual({
      idPatient: PATIENT.idPatient,
      vuJusqua: new Date('2026-07-01T10:00:00.000Z'),
    });
    expect(appel.update).toEqual({ vuJusqua: new Date('2026-07-01T10:00:00.000Z') });
  });

  it('LE CORPS EST IGNORÉ — un horodatage du client fermerait ce journal pour toujours', async () => {
    // Posé au 31 décembre 2030, il ferait taire le journal de ce patient sans
    // que rien ne le dise. Le serveur recalcule (`D-164`).
    const reponse = await POST(
      postRequest(cookieProprio(), { vuJusqua: '2030-12-31T10:00:00.000Z' }),
    );
    expect((await reponse.json()).vuJusqua).toBe(ENTREE.toISOString());
    expect(prisma.portailJournalRepere.upsert.mock.calls[0][0].update).toEqual({
      vuJusqua: ENTREE,
    });
  });

  it('LE REPÈRE NE RECULE JAMAIS, et rien ne s’écrit alors', async () => {
    // Deux onglets, une réponse lente, un ordre d'arrivée inversé : le plus
    // ancien ne doit pas effacer le plus récent, sinon le journal se rouvrirait
    // sur des faits déjà vus.
    prisma.portailJournalRepere.findUnique.mockResolvedValue({
      vuJusqua: new Date('2026-12-31T10:00:00.000Z'),
    });
    const reponse = await POST(postRequest(cookieProprio()));
    expect((await reponse.json())).toMatchObject({
      inchange: true,
      vuJusqua: '2026-12-31T10:00:00.000Z',
    });
    expect(prisma.portailJournalRepere.upsert).not.toHaveBeenCalled();
  });

  it('un repère DÉJÀ posé sur le dernier fait n’est pas réécrit', async () => {
    // Une écriture par chargement de page ferait de cette table un compteur de
    // visites par la bande — ce que sa clé primaire existe pour empêcher.
    prisma.portailJournalRepere.findUnique.mockResolvedValue({ vuJusqua: ENTREE });
    const reponse = await POST(postRequest(cookieProprio()));
    expect((await reponse.json()).inchange).toBe(true);
    expect(prisma.portailJournalRepere.upsert).not.toHaveBeenCalled();
  });

  it('le POST voit les MÊMES faits que le GET — drapeaux compris', async () => {
    // Si le POST assemblait le journal autrement, il marquerait « vu » un fait
    // que l'écran n'a pas montré.
    delete process.env.WN_CE_QUI_COMPTE;
    await POST(postRequest(cookieProprio()));
    expect(prisma.entreeCeQuiCompte.findMany).not.toHaveBeenCalled();
    expect(prisma.portailJournalRepere.upsert.mock.calls[0][0].update).toEqual({ vuJusqua: ENTREE });
  });

  it('une panne d’écriture rend 500 sans détail technique', async () => {
    prisma.portailJournalRepere.upsert.mockRejectedValue(new Error('connexion perdue'));
    const reponse = await POST(postRequest(cookieProprio()));
    expect(reponse.status).toBe(500);
    const payload = await reponse.json();
    expect(payload.error).toBe('Erreur technique.');
    expect(JSON.stringify(payload)).not.toMatch(/connexion perdue/);
  });
});
