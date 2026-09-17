import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findUnique: vi.fn() },
    trustChoiceEvent: { findMany: vi.fn() },
    syntheseIA: { findUnique: vi.fn() },
    correspondanceMedecin: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    correspondancePatient: { findMany: vi.fn() },
    $transaction: vi.fn(),
    journalAccesDossier: { create: vi.fn(), deleteMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, POST } from './route';
import { SAFETY_SIGNALS_SHA256 } from '@/lib/clinical/safetySignalsV1';
// LE GÉNÉRATEUR RÉEL, jamais une copie de sa provenance : c'est lui qui écrit
// l'ancre consignée. Le banc de concordance ci-dessous épingle ainsi la
// constante de version de la route sur la source qui la produit — recopier la
// chaîne ici neutraliserait le seul garde-fou anti-dérive du lot.
import { genererCourrierBiologie } from '@/lib/biology-library/courrier';
import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_SHA256,
} from '@/lib/biology-library/indicationsBiologieV1';

const URL_BASE = 'http://localhost/api/praticien/correspondance-medecin';

function getRequest(query = 'idPatient=PAT_TEST'): Request {
  return new Request(`${URL_BASE}?${query}`);
}

function postRequest(body: unknown): Request {
  return new Request(URL_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

const corps = (partiel: Record<string, unknown> = {}) => ({
  idPatient: 'PAT_TEST',
  sens: 'sortant',
  medecinLibelle: 'Dr Martin, médecin traitant',
  texte: 'Document de suivi remis au patient pour son médecin.',
  ...partiel,
});

const PATIENT_EN_SUIVI = {
  praticienEmail: 'praticien@wellneuro.fr',
  actif: true,
  suiviClotureLe: null,
};

/** Provenance telle que le générateur la stampe — source de vérité du banc. */
function provenanceReelle(): { ancrageHash: string; version: string } {
  const genere = genererCourrierBiologie({
    patientId: 'PAT_TEST',
    lignes: [
      {
        panelCode: 'PANEL_TEST',
        libelle: 'Bilan martial',
        niveau: '1',
        objectif: null,
        statut: 'recommande',
        declencheurRempli: null,
        condition: null,
        motifs: [],
        justificationClaims: [],
        analytes: [],
        ratios: [],
      },
    ],
    tableSha256: INDICATIONS_BIOLOGIE_SHA256,
    dateCourrier: '2026-08-20T09:00:00.000Z',
  });
  if (!genere.ok) throw new Error(`générateur en refus : ${genere.raison}`);
  const provenance = genere.courrier.document.blocs[0]?.provenance;
  if (!provenance) throw new Error('courrier sans provenance');
  return { ancrageHash: provenance.ancrageHash, version: provenance.version };
}

function ligneFil(ancrage: { ancrageSha256: string | null; ancrageVersion: string | null }) {
  return {
    id: 'CORR_ANCRE',
    sens: 'sortant',
    medecinLibelle: 'Dr Martin',
    texte: 'Docteur, …',
    idSynthese: null,
    echangeLe: null,
    consigneLe: new Date('2026-08-20T09:00:00.000Z'),
    ...ancrage,
  };
}

async function ancrageServi(
  ancrage: { ancrageSha256: string | null; ancrageVersion: string | null },
): Promise<string> {
  prisma.correspondanceMedecin.findMany.mockResolvedValue([ligneFil(ancrage)]);
  const json = await (await GET(getRequest())).json();
  return json.correspondances[0].ancrage;
}

describe('/api/praticien/correspondance-medecin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue(PATIENT_EN_SUIVI);
    // ACCORDÉ PAR DÉFAUT DEPUIS LE 2026-09-17 : le silence est devenu une
    // garde fermée ([[D-219]] §3 amendé), et un défaut à `[]` ferait éprouver
    // la garde à chacun des cas ci-dessous au lieu de son propre sujet.
    prisma.trustChoiceEvent.findMany.mockResolvedValue([
      { finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: new Date('2026-08-01T10:00:00.000Z') },
    ]);
    prisma.correspondanceMedecin.findMany.mockResolvedValue([]);
    prisma.correspondancePatient.findMany.mockResolvedValue([]);
    prisma.syntheseIA.findUnique.mockResolvedValue(null);
    // LA RELECTURE DU CONSENTEMENT VIT DANS UNE TRANSACTION. Le mock la
    // traverse en passant les mêmes doublures : sans cela, chaque cas
    // éprouverait l'absence de `$transaction` au lieu de son propre sujet.
    prisma.$transaction.mockImplementation(async (op: (tx: unknown) => unknown) => op({
      trustChoiceEvent: { findMany: prisma.trustChoiceEvent.findMany },
      correspondanceMedecin: { create: prisma.correspondanceMedecin.create },
    }));
    prisma.correspondanceMedecin.create.mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: 'CORR_1',
        sens: data.sens,
        medecinLibelle: data.medecinLibelle,
        texte: data.texte,
        idSynthese: data.idSynthese ?? null,
        echangeLe: data.echangeLe ?? null,
        // La base pose le présent : le mock reflète ce contrat, pas l'appelant.
        consigneLe: new Date('2026-07-22T17:00:00.000Z'),
      }),
    );
  });

  it('exige une session', async () => {
    getServerSession.mockResolvedValue(null);
    expect((await GET(getRequest())).status).toBe(401);
    expect((await POST(postRequest(corps()))).status).toBe(401);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('refuse un patient d’un autre praticien sans révéler autre chose', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      praticienEmail: 'autre@wellneuro.fr',
    });
    expect((await GET(getRequest())).status).toBe(403);
    expect((await POST(postRequest(corps()))).status).toBe(403);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
    // Un refus ne se journalise pas : la ligne nommerait un dossier non lu.
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('le GET accessible journalise la lecture du fil, le POST jamais (G-TRUST-04)', async () => {
    expect((await GET(getRequest())).status).toBe(200);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledTimes(1);
    expect(prisma.journalAccesDossier.create).toHaveBeenCalledWith({
      data: {
        idPatient: 'PAT_TEST',
        praticienEmail: 'praticien@wellneuro.fr',
        route: '/api/praticien/correspondance-medecin',
        methode: 'GET',
      },
    });
    // Une consignation laisse déjà sa propre trace datée et attribuée (GD-1).
    prisma.journalAccesDossier.create.mockClear();
    expect((await POST(postRequest(corps()))).status).toBe(201);
    expect(prisma.journalAccesDossier.create).not.toHaveBeenCalled();
  });

  it('répond 404 sur un patient inconnu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect((await POST(postRequest(corps()))).status).toBe(404);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('valide l’identifiant patient', async () => {
    expect((await GET(getRequest('idPatient='))).status).toBe(400);
    expect((await GET(getRequest('idPatient=PAT%20TEST'))).status).toBe(400);
  });

  it('refuse un corps illisible et un sens invalide', async () => {
    const illisible = new Request(URL_BASE, { method: 'POST', body: '{pas du json' });
    expect((await POST(illisible)).status).toBe(400);
    const reponse = await POST(postRequest(corps({ sens: 'lateral' })));
    expect(reponse.status).toBe(400);
    const json = await reponse.json();
    expect(json.reason).toBe('sens_invalide');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  // [[D-219]] §2 : la correspondance est une pièce du dossier — un dossier clos n'en
  // reçoit plus, quel que soit le sens. Le chemin propre pour une réponse
  // arrivée après clôture : rouvrir, transcrire, reclôturer.
  it('refuse la consignation sur dossier clos, pour les deux sens', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      suiviClotureLe: new Date('2026-07-01T00:00:00.000Z'),
    });
    for (const sens of ['sortant', 'entrant']) {
      const reponse = await POST(postRequest(corps({ sens })));
      expect(reponse.status).toBe(409);
      const json = await reponse.json();
      expect(json.reason).toBe('dossier_cloture');
    }
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('la lecture n’est jamais refusée sur dossier clos, et l’écran est prévenu', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      ...PATIENT_EN_SUIVI,
      suiviClotureLe: new Date('2026-07-01T00:00:00.000Z'),
    });
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.accepteConsignation).toBe(false);
  });

  it('refuse une adresse e-mail dans le libellé médecin (minimisation)', async () => {
    const reponse = await POST(postRequest(corps({ medecinLibelle: 'dr@cabinet.fr' })));
    expect(reponse.status).toBe(400);
    expect((await reponse.json()).reason).toBe('medecin_libelle_email');
  });

  it('refuse une synthèse inconnue ou appartenant à un autre patient, même 404', async () => {
    prisma.syntheseIA.findUnique.mockResolvedValue(null);
    const inconnue = await POST(postRequest(corps({ idSynthese: 'SYN_X' })));
    expect(inconnue.status).toBe(404);
    expect((await inconnue.json()).reason).toBe('synthese_not_found');

    prisma.syntheseIA.findUnique.mockResolvedValue({ idPatient: 'PAT_AUTRE' });
    const autrui = await POST(postRequest(corps({ idSynthese: 'SYN_Y' })));
    expect(autrui.status).toBe(404);
    expect((await autrui.json()).reason).toBe('synthese_not_found');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  // Le cœur du lot : consigner au présent, sans jamais transmettre la date de
  // consignation.
  it('consigne un envoi puis une réponse, sans jamais transmettre consigneLe', async () => {
    for (const sens of ['sortant', 'entrant']) {
      const reponse = await POST(
        postRequest(corps({ sens, echangeLe: '2026-07-20' })),
      );
      expect(reponse.status).toBe(201);
      const json = await reponse.json();
      expect(json.ok).toBe(true);
      expect(json.correspondance.sens).toBe(sens);
    }
    for (const appel of prisma.correspondanceMedecin.create.mock.calls) {
      const data = appel[0].data as Record<string, unknown>;
      expect(Object.keys(data)).not.toContain('consigneLe');
      expect(Object.keys(data)).not.toContain('consigne_le');
      expect(data.praticienEmail).toBe('praticien@wellneuro.fr');
    }
  });

  it('expose le fil avec l’état du consentement de partage', async () => {
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      {
        id: 'CORR_1',
        sens: 'entrant',
        medecinLibelle: 'Dr Martin',
        texte: 'Réponse du médecin.',
        idSynthese: 'SYN_DISPARUE',
        echangeLe: null,
        consigneLe: new Date('2026-07-22T17:00:00.000Z'),
      },
    ]);
    prisma.trustChoiceEvent.findMany.mockResolvedValue([
      {
        finalite: 'partage_medecin_traitant',
        statut: 'accorde',
        enregistreLe: new Date('2026-07-10T00:00:00.000Z'),
      },
    ]);
    const reponse = await GET(getRequest());
    expect(reponse.status).toBe(200);
    const json = await reponse.json();
    expect(json.partageMedecinTraitant).toBe('accorde');
    // Référence souple : un id de synthèse disparu est exposé tel quel, la
    // lecture ne casse pas (AC-5 de la revue de la PR 1).
    expect(json.correspondances[0].idSynthese).toBe('SYN_DISPARUE');
  });

  it('le fil se range sur la date d’échange, et se replie sur la consignation', async () => {
    // La base rend l'ordre de consignation ; c'est la ROUTE qui range le fil.
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      {
        id: 'TRANSCRITE_AUJOURD_HUI',
        sens: 'entrant',
        medecinLibelle: 'Dr Martin',
        texte: 'Réponse reçue en juin, transcrite aujourd’hui.',
        idSynthese: null,
        echangeLe: new Date('2026-06-12T00:00:00.000Z'),
        consigneLe: new Date('2026-09-16T10:00:00.000Z'),
      },
      {
        id: 'SANS_DATE_ECHANGE',
        sens: 'sortant',
        medecinLibelle: 'Dr Martin',
        texte: 'Courrier remis en août, sans date d’échange renseignée.',
        idSynthese: null,
        echangeLe: null,
        consigneLe: new Date('2026-08-20T10:00:00.000Z'),
      },
    ]);
    const json = await (await GET(getRequest())).json();

    // La ligne saisie AUJOURD'HUI descend à sa place — juin —, et celle qui n'a
    // pas de date d'échange se range sur sa consignation, jamais au hasard.
    expect(json.correspondances.map((l: { id: string }) => l.id)).toEqual([
      'SANS_DATE_ECHANGE',
      'TRANSCRITE_AUJOURD_HUI',
    ]);
  });

  it('à date d’échange égale, la consignation départage — l’ordre ne dépend pas de la base', async () => {
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      {
        id: 'PREMIERE_CONSIGNEE',
        sens: 'sortant',
        medecinLibelle: 'Dr Martin',
        texte: 'Envoi.',
        idSynthese: null,
        echangeLe: new Date('2026-06-12T00:00:00.000Z'),
        consigneLe: new Date('2026-06-12T09:00:00.000Z'),
      },
      {
        id: 'SECONDE_CONSIGNEE',
        sens: 'entrant',
        medecinLibelle: 'Dr Martin',
        texte: 'Réponse du même jour.',
        idSynthese: null,
        echangeLe: new Date('2026-06-12T00:00:00.000Z'),
        consigneLe: new Date('2026-06-12T17:00:00.000Z'),
      },
    ]);
    const json = await (await GET(getRequest())).json();

    expect(json.correspondances.map((l: { id: string }) => l.id)).toEqual([
      'SECONDE_CONSIGNEE',
      'PREMIERE_CONSIGNEE',
    ]);
  });

  it('expose la chronologie patient sans corps de message ni adresse', async () => {
    prisma.correspondancePatient.findMany.mockResolvedValue([
      {
        id: 'CP_1',
        type: 'booklet',
        objet: 'Envoi du bilan neuronutritionnel',
        statut: 'Envoye',
        canal: 'email',
        referenceType: 'synthese',
        referenceId: 'SYN_1',
        enregistreLe: new Date('2026-07-26T12:00:00.000Z'),
      },
    ]);
    const json = await (await GET(getRequest())).json();
    expect(json.correspondancesPatient).toEqual([
      expect.objectContaining({
        objet: 'Envoi du bilan neuronutritionnel',
        statut: 'Envoye',
        enregistreLe: '2026-07-26T12:00:00.000Z',
      }),
    ]);
    expect(JSON.stringify(json.correspondancesPatient)).not.toContain('@');
    expect(JSON.stringify(json.correspondancesPatient)).not.toContain('texte');
  });

  it('une lettre dont l’ancre concorde avec la table vivante est dite concordante', async () => {
    const { ancrageHash, version } = provenanceReelle();
    expect(await ancrageServi({ ancrageSha256: ancrageHash, ancrageVersion: version })).toBe(
      'concordante',
    );
  });

  it('une version inconnue de la table n’est PAS concordante — et PAS périmée', async () => {
    // CE BANC TUE LA MUTATION « comparer le seul ancrageSha256 » : sous cette
    // mutation la lettre passerait pour concordante, et une table re-signée
    // sous une version neuve deviendrait invisible.
    //
    // ET IL DIT LE CHANGEMENT DU LOT-03 : le verdict se rendait en dur contre
    // la seule table biologique, donc TOUTE ancre étrangère sortait « périmée ».
    // Une ancre que le produit ne sait pas lire n'est pas une règle qui a
    // bougé ([[DC-24]]) : elle ne dit rien, et l'écran ne rend rien.
    const { ancrageHash } = provenanceReelle();
    const verdict = await ancrageServi({
      ancrageSha256: ancrageHash,
      ancrageVersion: 'indications-biologie-v2',
    });
    expect(verdict).toBe('reference_inconnue');
    expect(verdict).not.toBe('concordante');
    expect(verdict).not.toBe('perimee');
  });

  it('LE SECOND ÉCRIVAIN EST JUGÉ SUR SA PROPRE TABLE', async () => {
    // La lettre d'adressage ([[D-218]]) s'ancre sur les signaux de sécurité.
    // Sous le verdict en dur d'avant le LOT-03, CHACUNE de ses lignes aurait
    // porté « ancrage périmé » sans qu'aucune règle clinique n'ait bougé — une
    // fausse alerte sur toute la chaîne d'adressage, produite par la seule
    // arrivée d'un second écrivain. Elle est désormais comparée au SHA VIVANT
    // de SA table, et concorde.
    expect(
      await ancrageServi({
        ancrageSha256: SAFETY_SIGNALS_SHA256,
        ancrageVersion: 'safety-signals-nnpp2-v1',
      }),
    ).toBe('concordante');
    // Et « périmée » y garde son sens : la table est identifiée, son contenu a
    // bougé depuis que la lettre est partie.
    expect(
      await ancrageServi({
        ancrageSha256: 'b'.repeat(64),
        ancrageVersion: 'safety-signals-nnpp2-v1',
      }),
    ).toBe('perimee');
  });

  it('LE TROISIÈME ÉCRIVAIN, lui, ne rougit pas : il est inconnu, pas périmé', async () => {
    // Ce que la table protège maintenant : l'écrivain à venir, ajouté sans sa
    // ligne ici. Il ne ment pas pour autant — il dit qu'on ne sait pas le lire.
    expect(
      await ancrageServi({
        ancrageSha256: 'c'.repeat(64),
        ancrageVersion: 'table-a-venir-v1',
      }),
    ).toBe('reference_inconnue');
  });

  it('une version héritée du prototype n’est pas une version connue', async () => {
    // La clé vient de la BASE : `constructor` ou `toString` rendraient, d'un
    // objet nu, une valeur héritée — donc un verdict « périmée » fabriqué par
    // la structure de données elle-même.
    for (const version of ['constructor', 'toString', '__proto__']) {
      expect(await ancrageServi({ ancrageSha256: 'b'.repeat(64), ancrageVersion: version })).toBe(
        'reference_inconnue',
      );
    }
  });

  it('un SHA différent périme la lettre, à version CONNUE', async () => {
    // C'est ici, et seulement ici, que « périmée » garde son sens : la table
    // est identifiée, son SHA vivant a bougé — le contenu de référence a donc
    // changé depuis que la lettre est partie ([[D-079]] : le SHA fait foi).
    const { version } = provenanceReelle();
    expect(await ancrageServi({ ancrageSha256: 'f'.repeat(64), ancrageVersion: version })).toBe(
      'perimee',
    );
  });

  it('une lettre sans ancre n’est PAS périmée — elle ne dit rien (DC-24)', async () => {
    expect(await ancrageServi({ ancrageSha256: null, ancrageVersion: null })).toBe('sans_ancrage');
    // Ancre à moitié, DANS LES DEUX SENS : le CHECK SQL l'interdit en base ; si
    // elle arrivait, elle resterait une donnée absente, jamais un défaut
    // affiché. Le second sens n'est pas décoratif — sans lui, retirer le terme
    // `!sha` de la garde passe inaperçu et une ancre {null, version} sortirait
    // `perimee` (constat M1 de la revue du 2026-08-20).
    const { ancrageHash, version } = provenanceReelle();
    expect(await ancrageServi({ ancrageSha256: ancrageHash, ancrageVersion: null })).toBe(
      'sans_ancrage',
    );
    expect(await ancrageServi({ ancrageSha256: null, ancrageVersion: version })).toBe(
      'sans_ancrage',
    );
  });

  it('ni le SHA ni la version ne traversent HTTP — seul le verdict', async () => {
    const { ancrageHash, version } = provenanceReelle();
    prisma.correspondanceMedecin.findMany.mockResolvedValue([
      ligneFil({ ancrageSha256: ancrageHash, ancrageVersion: version }),
    ]);
    const charge = JSON.stringify((await (await GET(getRequest())).json()).correspondances);
    expect(charge).not.toContain(ancrageHash);
    expect(charge).not.toContain(version);
    expect(charge).toContain('concordante');
  });

  it('une correspondance consignée à la main n’a pas d’ancre, et le dit', async () => {
    prisma.correspondanceMedecin.create.mockResolvedValue(
      ligneFil({ ancrageSha256: null, ancrageVersion: null }),
    );
    const json = await (await POST(postRequest(corps()))).json();
    expect(json.correspondance.ancrage).toBe('sans_ancrage');
  });

  it('les trois porteurs de la version ne divergent pas — métadonnée, estampille, comparaison', async () => {
    // TROIS littéraux `indications-biologie-v1` coexistent : la métadonnée de
    // la table (qui fait foi), celui qu'estampille `genererCourrierBiologie`
    // (en dur, NON dérivé de la métadonnée), et celui que la route compare.
    // Aucun n'est recopié ici : la métadonnée est lue, l'estampille est
    // générée, et la comparaison est éprouvée à travers la route.
    //
    // La question que ce banc rendait visible est TRANCHÉE : [[D-079]]
    // (2026-08-20) pose que LE SHA FAIT FOI — une re-signature sans changement
    // de contenu ne périme aucune lettre. Ce banc ne garde donc plus une
    // question ouverte, il garde la cohérence des trois porteurs : un bump de
    // `INDICATIONS_BIOLOGIE_METADATA.version` le fait rougir, et c'est un
    // humain qui décidera s'il faut suivre l'estampille ou la laisser.
    const { version } = provenanceReelle();
    expect(version).toBe(INDICATIONS_BIOLOGIE_METADATA.version);
    expect(
      await ancrageServi({ ancrageSha256: INDICATIONS_BIOLOGIE_SHA256, ancrageVersion: version }),
    ).toBe('concordante');
  });

  it('sans choix exprimé, le consentement est null (jamais deviné)', async () => {
    // LE DÉFAUT DU BANC EST DÉSORMAIS « ACCORDÉ » : ce cas-ci doit donc poser
    // son propre silence, sinon il n'éprouve plus rien. Le `null` reste ce que
    // la LECTURE rend — il ne devient jamais « refusé » par commodité, même si
    // la GARDE d'écriture le traite comme un refus depuis le 2026-09-17.
    prisma.trustChoiceEvent.findMany.mockResolvedValue([]);
    const json = await (await GET(getRequest())).json();
    expect(json.partageMedecinTraitant).toBeNull();
  });
});

describe('la garde de consentement — D-219 §3 amendé (2026-09-17)', () => {
  // CINQ CAS POUR CINQ EFFETS PROMIS, et non un seul « ça bloque ». Un banc
  // unique sur le refus laisserait passer les trois autres états, dont le
  // silence — qui est la moitié de l'arbitrage.
  const choix = (statut: string) => [
    { finalite: 'partage_medecin_traitant', statut, enregistreLe: new Date('2026-08-01T10:00:00.000Z') },
  ];

  it('★ REFUS : la consignation est refusée en 409, et rien n’est écrit', async () => {
    prisma.trustChoiceEvent.findMany.mockResolvedValue(choix('refuse'));
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(409);
    const json = await reponse.json();
    expect(json.reason).toBe('consentement_partage_refuse');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('★ RETRAIT : fermé comme le refus, et le motif reste distinct à la lecture', async () => {
    prisma.trustChoiceEvent.findMany.mockResolvedValue(choix('retire'));
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(409);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('★ SILENCE : jamais exprimé ferme AUSSI, et le message donne le CHEMIN', async () => {
    // LA MOITIÉ DE L'ARBITRAGE EST ICI. « Sans un choix explicite de votre
    // part » se lit à la lettre : l'absence de choix n'est pas un accord.
    // Et le blocage doit être une porte — le message nomme où le patient
    // exprime son choix, sans quoi le praticien lit un mur.
    prisma.trustChoiceEvent.findMany.mockResolvedValue([]);
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(409);
    const json = await reponse.json();
    expect(json.reason).toBe('consentement_partage_jamais_exprime');
    expect(json.error).toContain('n’a jamais exprimé de choix');
    expect(json.error).toContain('Mes choix et autorisations');
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('★ LES DEUX SENS sont fermés — transcrire une réponse prouve qu’un envoi a eu lieu', async () => {
    prisma.trustChoiceEvent.findMany.mockResolvedValue(choix('refuse'));
    const reponse = await POST(postRequest(corps({ sens: 'entrant' })));
    expect(reponse.status).toBe(409);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });

  it('ACCORDÉ : la consignation passe — la garde ne ferme pas tout', async () => {
    // SANS CE CAS, une garde qui refuserait TOUT passerait les quatre bancs
    // ci-dessus. C'est le contre-poids, et il n'est pas décoratif.
    prisma.trustChoiceEvent.findMany.mockResolvedValue(choix('accorde'));
    expect((await POST(postRequest(corps()))).status).toBe(201);
    expect(prisma.correspondanceMedecin.create).toHaveBeenCalled();
  });
});

describe('la relecture du consentement dans la transaction', () => {
  // CE BLOC EST HORS DU `describe` PRINCIPAL, donc il n'hérite PAS de son
  // `beforeEach` : sans cette mise en place, les compteurs de mocks
  // s'accumulent depuis les cas précédents et l'assertion « deux lectures »
  // compte neuf appels. Le piège vaut d'être écrit — il ne se voit pas.
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue(PATIENT_EN_SUIVI);
    prisma.syntheseIA.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(async (op: (tx: unknown) => unknown) => op({
      trustChoiceEvent: { findMany: prisma.trustChoiceEvent.findMany },
      correspondanceMedecin: { create: prisma.correspondanceMedecin.create },
    }));
    prisma.correspondanceMedecin.create.mockResolvedValue({
      id: 'CORR_1',
      sens: 'sortant',
      medecinLibelle: 'Dr Martin',
      texte: 'Document de suivi.',
      idSynthese: null,
      echangeLe: null,
      consigneLe: new Date('2026-09-17T10:00:00.000Z'),
    });
  });

  it('★ un RETRAIT en vol est arrêté juste avant l’insertion', async () => {
    // MÊME PATRON QUE LA ROUTE DU COURRIER DE BIOLOGIE, et pour la même raison :
    // la garde d'entrée lit le consentement, puis le patient peut le retirer
    // depuis son portail avant que la ligne ne s'écrive. Protéger une des deux
    // routes seulement aurait été arbitraire.
    //
    // LA MUTATION QUI DOIT FAIRE ROUGIR CE BANC : retirer la relecture et se
    // contenter de la garde d'entrée.
    prisma.trustChoiceEvent.findMany
      .mockResolvedValueOnce([
        { finalite: 'partage_medecin_traitant', statut: 'accorde', enregistreLe: new Date('2026-08-01T10:00:00.000Z') },
      ])
      .mockResolvedValueOnce([
        { finalite: 'partage_medecin_traitant', statut: 'retire', enregistreLe: new Date('2026-09-17T10:00:00.000Z') },
      ]);
    const reponse = await POST(postRequest(corps()));
    expect(reponse.status).toBe(409);
    // DEUX lectures, pas une : la garde d'entrée puis la relecture. Une seule
    // signifierait que la relecture a sauté.
    expect(prisma.trustChoiceEvent.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.correspondanceMedecin.create).not.toHaveBeenCalled();
  });
});
