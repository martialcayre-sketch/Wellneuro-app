import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findMany: vi.fn(), count: vi.fn(), findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    portailMagicLink: { updateMany: vi.fn() },
    $transaction: vi.fn(),
    assignation: { findMany: vi.fn(), count: vi.fn(), updateMany: vi.fn() },
    questionnaireReponse: { findMany: vi.fn(), updateMany: vi.fn() },
    agendaAlimentaireJour: { findMany: vi.fn() },
    // Les trois autres porteuses de `email_patient`. `bookletEnvoi` n'y est
    // PAS, et son absence est une assertion : aucune ligne de ce banc ne doit
    // pouvoir l'écrire par mégarde.
    consultation: { updateMany: vi.fn() },
    syntheseIA: { updateMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET, PATCH } from './route';
import { jourCourantLocal } from '@/lib/patient-access';

function get(query = ''): Request {
  return new Request(`http://localhost/api/praticien/patients${query ? `?${query}` : ''}`);
}

function patch(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/praticien/patients', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// Régression E7 — cette route renvoyait tous les patients de la base (e-mail,
// téléphone inclus) et laissait PATCH muter n'importe lequel, sans
// vérifier l'appartenance au praticien en session. Garde ajoutée 2026-07-21.
describe('GET /api/praticien/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.assignation.count.mockResolvedValue(0);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
  });

  it('refuse sans session (401)', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET(get());
    expect(res.status).toBe(401);
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('liste non paginée : scope patients et assignations au praticien en session', async () => {
    await GET(get());
    expect(prisma.patient.findMany).toHaveBeenCalledWith({
      where: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } } } })
    );
  });

  // Sans ce champ, l'écran ne peut pas distinguer un dossier clos d'un dossier
  // désactivé : le premier conserve la lecture, le second la perd.
  it('expose l’état de clôture du suivi, en ISO ou null', async () => {
    prisma.patient.findMany.mockResolvedValue([
      {
        idPatient: 'PAT_SEED_03',
        email: 'michel.dogne@fictif.wellneuro.fr',
        prenom: 'Michel',
        nom: 'Dogné',
        telephone: null,
        actif: true,
        suiviClotureLe: new Date('2026-07-21T10:00:00.000Z'),
      },
      {
        idPatient: 'PAT_SEED_01',
        email: 'sophie.nicola@fictif.wellneuro.fr',
        prenom: 'Sophie',
        nom: 'Nicola',
        telephone: null,
        actif: true,
        suiviClotureLe: null,
      },
    ]);
    const json = (await (await GET(get())).json()) as {
      patients: { idPatient: string; suiviClotureLe: string | null }[];
    };
    expect(json.patients[0].suiviClotureLe).toBe('2026-07-21T10:00:00.000Z');
    expect(json.patients[1].suiviClotureLe).toBeNull();
  });

  it('expose l’accès révoqué, distinct de l’état du dossier', async () => {
    // TROIS ÉTATS INDÉPENDANTS, et c'est tout l'objet du champ : un dossier
    // ACTIF, en suivi OUVERT, peut avoir son accès portail révoqué. `D-126` §2
    // a tranché que désactiver ne pose PAS ce drapeau — il n'est donc dérivable
    // ni d'`actif` ni de `suiviClotureLe`, et sans lui la seule surface qui le
    // montrait était l'encart « Nouveaux patients », borné à 30 jours.
    prisma.patient.findMany.mockResolvedValue([
      {
        idPatient: 'PAT_SEED_03',
        email: 'michel.dogne@fictif.wellneuro.fr',
        prenom: 'Michel',
        nom: 'Dogné',
        telephone: null,
        actif: true,
        suiviClotureLe: null,
        accessTokenRevoked: true,
      },
      {
        idPatient: 'PAT_SEED_01',
        email: 'sophie.nicola@fictif.wellneuro.fr',
        prenom: 'Sophie',
        nom: 'Nicola',
        telephone: null,
        actif: true,
        suiviClotureLe: null,
        accessTokenRevoked: false,
      },
    ]);
    const json = (await (await GET(get())).json()) as {
      patients: { accesRevoque: boolean; actif: string; suiviClotureLe: string | null }[];
    };
    expect(json.patients[0].accesRevoque).toBe(true);
    expect(json.patients[0].actif).toBe('OUI');
    expect(json.patients[0].suiviClotureLe).toBeNull();
    expect(json.patients[1].accesRevoque).toBe(false);
  });

  it('liste paginée : scope aussi le where de recherche', async () => {
    await GET(get('page=1&search=Nicola'));
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: 'p@wellneuro.fr', mode: 'insensitive' });
    expect(where.OR).toBeDefined();
    expect(prisma.patient.count).toHaveBeenCalledWith({ where });
  });
});

// `aPassation` doit porter les DEUX branches de construction de réponse : la
// paginée (page= présent) et la non paginée (comportement historique). C'est
// l'erreur naturelle ici — n'en traiter qu'une — d'où deux tests jumeaux,
// un par branche, plutôt qu'un seul.
describe('GET /api/praticien/patients — aPassation (LOT-07)', () => {
  const ASSIGNATION_AVEC_REPONSE = {
    idAssignation: 'ASS_AVEC_REPONSE',
    idPatient: 'PAT001',
    emailPatient: 'a@wellneuro.fr',
    idQuestionnaire: 'Q_ALI_09',
    titre: 'Agenda',
    dateAssignation: new Date('2026-08-01T00:00:00.000Z'),
    statut: 'En attente',
    statutReponses: 'deverrouille',
    correctionCommentaire: null,
    correctionDemandeeDate: null,
  };
  const ASSIGNATION_SANS_REPONSE = {
    ...ASSIGNATION_AVEC_REPONSE,
    idAssignation: 'ASS_SANS_REPONSE',
    statutReponses: 'non_rempli',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([ASSIGNATION_AVEC_REPONSE, ASSIGNATION_SANS_REPONSE]);
    prisma.assignation.count.mockResolvedValue(2);
    // Une seule ligne pour ASS_AVEC_REPONSE : c'est l'EXISTENCE qui compte.
    prisma.questionnaireReponse.findMany.mockResolvedValue([{ idAssignation: 'ASS_AVEC_REPONSE' }]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
  });

  it('branche non paginée : porte aPassation correctement sur les deux lignes', async () => {
    const json = (await (await GET(get())).json()) as {
      assignations: { idAssignation: string; aPassation?: boolean }[];
    };
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledWith({
      where: { idAssignation: { in: ['ASS_AVEC_REPONSE', 'ASS_SANS_REPONSE'] } },
      select: { idAssignation: true },
      distinct: ['idAssignation'],
    });
    expect(json.assignations.find(a => a.idAssignation === 'ASS_AVEC_REPONSE')?.aPassation).toBe(true);
    expect(json.assignations.find(a => a.idAssignation === 'ASS_SANS_REPONSE')?.aPassation).toBe(false);
  });

  it('branche paginée : porte aPassation correctement sur les deux lignes', async () => {
    const json = (await (await GET(get('page=1'))).json()) as {
      assignations: { idAssignation: string; aPassation?: boolean }[];
    };
    expect(json.assignations.find(a => a.idAssignation === 'ASS_AVEC_REPONSE')?.aPassation).toBe(true);
    expect(json.assignations.find(a => a.idAssignation === 'ASS_SANS_REPONSE')?.aPassation).toBe(false);
  });

  // Contrôle négatif : sans assignation, la requête `questionnaireReponse` ne
  // part pas — `in: []` interrogerait la base pour rien.
  it('aucune assignation : n’émet pas de requête questionnaireReponse', async () => {
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.assignation.count.mockResolvedValue(0);
    await GET(get());
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
  });
});

// `nbJourneesAgenda` (LOT-08) : tri-état — `null` pour une assignation qui
// n'est pas un agenda alimentaire, `0` pour un agenda sans journée notée, un
// entier sinon. Comme `aPassation`, les DEUX branches (paginée et non
// paginée) doivent le porter — même leçon LOT-07, même fichier.
describe('GET /api/praticien/patients — nbJourneesAgenda (LOT-08)', () => {
  const ASSIGNATION_AGENDA_AVEC_JOURS = {
    idAssignation: 'ASS_AGENDA_AVEC_JOURS',
    idPatient: 'PAT001',
    emailPatient: 'a@wellneuro.fr',
    idQuestionnaire: 'Q_ALI_09',
    titre: 'Agenda alimentaire — 21 jours',
    dateAssignation: new Date('2026-08-01T00:00:00.000Z'),
    statut: 'En attente',
    statutReponses: 'deverrouille',
    correctionCommentaire: null,
    correctionDemandeeDate: null,
  };
  const ASSIGNATION_AGENDA_SANS_JOUR = {
    ...ASSIGNATION_AGENDA_AVEC_JOURS,
    idAssignation: 'ASS_AGENDA_SANS_JOUR',
  };
  const ASSIGNATION_NON_AGENDA = {
    ...ASSIGNATION_AGENDA_AVEC_JOURS,
    idAssignation: 'ASS_NON_AGENDA',
    idQuestionnaire: 'Q_NEU_03',
    titre: 'Autre questionnaire',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([
      ASSIGNATION_AGENDA_AVEC_JOURS,
      ASSIGNATION_AGENDA_SANS_JOUR,
      ASSIGNATION_NON_AGENDA,
    ]);
    prisma.assignation.count.mockResolvedValue(3);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    // Trois lignes en base pour ASS_AGENDA_AVEC_JOURS : deux dates distinctes,
    // dont une CORRIGÉE (deux lignes, une seule date — `supersedesJourId`
    // chaîne la correction). Le compte attendu est 2, pas 3 : des DATES, pas
    // des écritures.
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      { idAssignation: 'ASS_AGENDA_AVEC_JOURS', dateJour: '2026-08-01' },
      { idAssignation: 'ASS_AGENDA_AVEC_JOURS', dateJour: '2026-08-02' },
    ]);
  });

  it('branche non paginée : entier sur un agenda avec journées, 0 sans journée, null hors agenda', async () => {
    const json = (await (await GET(get())).json()) as {
      assignations: { idAssignation: string; nbJourneesAgenda?: number | null }[];
    };
    expect(json.assignations.find(a => a.idAssignation === 'ASS_AGENDA_AVEC_JOURS')?.nbJourneesAgenda).toBe(2);
    expect(json.assignations.find(a => a.idAssignation === 'ASS_AGENDA_SANS_JOUR')?.nbJourneesAgenda).toBe(0);
    expect(json.assignations.find(a => a.idAssignation === 'ASS_NON_AGENDA')?.nbJourneesAgenda).toBeNull();
  });

  it('branche paginée : porte le même tri-état', async () => {
    const json = (await (await GET(get('page=1'))).json()) as {
      assignations: { idAssignation: string; nbJourneesAgenda?: number | null }[];
    };
    expect(json.assignations.find(a => a.idAssignation === 'ASS_AGENDA_AVEC_JOURS')?.nbJourneesAgenda).toBe(2);
    expect(json.assignations.find(a => a.idAssignation === 'ASS_AGENDA_SANS_JOUR')?.nbJourneesAgenda).toBe(0);
    expect(json.assignations.find(a => a.idAssignation === 'ASS_NON_AGENDA')?.nbJourneesAgenda).toBeNull();
  });

  // Une journée corrigée porte deux lignes pour une seule date : comptée UNE
  // fois. Vérifié séparément de la lecture du DTO ci-dessus, sur la forme
  // exacte de la requête groupée.
  it('une journée corrigée (deux lignes, une date) est comptée une seule fois', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      { idAssignation: 'ASS_AGENDA_AVEC_JOURS', dateJour: '2026-08-01' },
      { idAssignation: 'ASS_AGENDA_AVEC_JOURS', dateJour: '2026-08-01' },
    ]);
    const json = (await (await GET(get())).json()) as {
      assignations: { idAssignation: string; nbJourneesAgenda?: number | null }[];
    };
    expect(json.assignations.find(a => a.idAssignation === 'ASS_AGENDA_AVEC_JOURS')?.nbJourneesAgenda).toBe(1);
  });

  // Une seule requête groupée pour toute la page, jamais un `count` par ligne
  // — même défaut que celui payé sur `aPassation` (LOT-07).
  it('une seule requête groupée pour toute la page, pas une par assignation', async () => {
    await GET(get());
    expect(prisma.agendaAlimentaireJour.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.agendaAlimentaireJour.findMany).toHaveBeenCalledWith({
      where: { idAssignation: { in: ['ASS_AGENDA_AVEC_JOURS', 'ASS_AGENDA_SANS_JOUR'] } },
      select: { idAssignation: true, dateJour: true },
      distinct: ['idAssignation', 'dateJour'],
    });
  });

  // Contrôle négatif, symétrique de celui d'`aPassation` : sans aucune
  // assignation d'agenda alimentaire dans la page, la requête ne part pas.
  it('aucune assignation d’agenda alimentaire : n’émet pas de requête agendaAlimentaireJour', async () => {
    prisma.assignation.findMany.mockResolvedValue([ASSIGNATION_NON_AGENDA]);
    prisma.assignation.count.mockResolvedValue(1);
    await GET(get());
    expect(prisma.agendaAlimentaireJour.findMany).not.toHaveBeenCalled();
  });
});

// Le filtre par statut vivait côté client, appliqué APRÈS la troncature à 40.
// Filtrer une liste déjà tronquée ne cache pas des lignes en trop : il en cache
// en moins, et sans le dire. Au 2026-07-29, 8 assignations « En attente »
// tombaient hors des 40 plus récentes — invisibles ET inannulables.
describe('GET /api/praticien/patients — filtre de statut des assignations', () => {
  const portee = { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } };

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.assignation.count.mockResolvedValue(0);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
  });

  // LE test du défaut. Sans filtre serveur, la requête ne porte que la portée
  // praticien et le plafond : une ligne au-delà du 40ᵉ rang ne peut PAS être
  // rendue, quel que soit ce que le client fera de la réponse.
  it('descend le statut jusqu’au where Prisma, et non au client', async () => {
    await GET(get('statut=En%20attente'));
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: portee, statut: 'En attente' }, take: 40 })
    );
  });

  it('applique le même where au compte qu’à la liste', async () => {
    await GET(get('statut=Complété'));
    const whereListe = prisma.assignation.findMany.mock.calls[0][0].where;
    expect(prisma.assignation.count).toHaveBeenCalledWith({ where: whereListe });
  });

  // « 40 sur 48 » ne veut rien dire si le compte porte sur un autre ensemble
  // que les lignes affichées.
  it('rend le total en base et le plafond, pour que la surface puisse dire qu’elle tronque', async () => {
    prisma.assignation.count.mockResolvedValue(48);
    const res = await GET(get('statut=Complété'));
    const json = await res.json();
    expect(json.assignationsMeta).toEqual({
      total: 48,
      plafond: 40,
      statut: 'Complété',
      statutReponses: null,
      echeanceDepassee: false,
      idPatient: null,
    });
  });

  // Un 400 sur un paramètre d'affichage priverait le praticien de sa liste
  // entière pour une faute de frappe dans une URL : on ignore, on ne rejette pas.
  it('ignore un statut hors registre au lieu de rejeter la requête', async () => {
    const res = await GET(get('statut=Brouillon'));
    expect(res.status).toBe(200);
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: portee } })
    );
  });

  it('sans paramètre, ne filtre rien — comportement historique inchangé', async () => {
    await GET(get());
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: portee } })
    );
  });

  // Le filtre s'AJOUTE à la garde de portée, il ne la remplace pas : aucun
  // statut demandé ne doit ouvrir les assignations d'un autre praticien.
  it('ne desserre jamais la portée praticien', async () => {
    await GET(get('page=1&statut=Annulée'));
    const where = prisma.assignation.findMany.mock.calls[0][0].where;
    expect(where.patient).toEqual(portee);
    expect(where.statut).toBe('Annulée');
  });

  it('filtre aussi dans la branche paginée', async () => {
    prisma.assignation.count.mockResolvedValue(12);
    const res = await GET(get('page=2&statut=En%20attente'));
    const json = await res.json();
    expect(json.assignationsMeta.total).toBe(12);
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: portee, statut: 'En attente' } })
    );
  });
});

// Même défaut, autre colonne et autre surface : `FichePatientPanel` filtrait
// `modification_demandee` ET le dossier en mémoire, après la même troncature à
// 40 — sur les assignations de TOUS les patients. Le tri étant `dateAssignation
// desc`, ce sont les dossiers anciens, ceux qu'on corrige le plus tard, qui
// tombaient hors fenêtre : la demande n'apparaissait nulle part et n'était donc
// jamais débloquée.
describe('GET /api/praticien/patients — filtre par dossier et statut de réponse', () => {
  const portee = { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } };

  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.assignation.count.mockResolvedValue(0);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
  });

  // LE test du défaut : sans ces deux clés dans le `where`, aucune ligne au-delà
  // du 40ᵉ rang ne peut être rendue, quoi que le client en fasse ensuite.
  it('descend le dossier ET le statut de réponse jusqu’au where Prisma', async () => {
    await GET(get('idPatient=PAT001&statutReponses=modification_demandee'));
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patient: portee, statutReponses: 'modification_demandee', idPatient: 'PAT001' },
        take: 40,
      })
    );
  });

  it('applique le même where au compte qu’à la liste', async () => {
    await GET(get('idPatient=PAT001&statutReponses=modification_demandee'));
    const whereListe = prisma.assignation.findMany.mock.calls[0][0].where;
    expect(prisma.assignation.count).toHaveBeenCalledWith({ where: whereListe });
  });

  // L'écho permet au client de vérifier que sa demande a été honorée avant de
  // conclure quoi que ce soit sur la troncature.
  it('écho les deux filtres appliqués dans assignationsMeta', async () => {
    prisma.assignation.count.mockResolvedValue(3);
    const res = await GET(get('idPatient=PAT001&statutReponses=modification_demandee'));
    const json = await res.json();
    expect(json.assignationsMeta).toEqual({
      total: 3,
      plafond: 40,
      statut: null,
      statutReponses: 'modification_demandee',
      echeanceDepassee: false,
      idPatient: 'PAT001',
    });
  });

  // ── ÉCHÉANCE DÉPASSÉE ──────────────────────────────────────────────────────
  //
  // Le geste de déblocage existait ; l'écran ne l'offrait qu'aux demandes de
  // correction. Un questionnaire JAMAIS REMPLI dont l'échéance est passée
  // n'entrait dans aucune liste : le portail refusait la saisie, et aucun
  // bouton nulle part ne la rouvrait. Ce filtre est ce qui le rend visible.
  it('descend l’échéance dépassée jusqu’au where Prisma, avec le jour courant', async () => {
    await GET(get('idPatient=PAT001&statutReponses=non_rempli&echeanceDepassee=1'));
    const where = prisma.assignation.findMany.mock.calls[0][0].where;
    // `not: null` n'est pas décoratif : sans lui, une assignation SANS échéance
    // dépendrait de la façon dont le moteur compare NULL, alors que la règle du
    // portail est explicite — pas d'échéance, jamais expirée.
    expect(where.dateLimite).toEqual({ not: null, lt: jourCourantLocal() });
    expect(where.statutReponses).toBe('non_rempli');
    expect(where.idPatient).toBe('PAT001');
  });

  it('le même where part au compte qu’à la liste', async () => {
    await GET(get('idPatient=PAT001&statutReponses=non_rempli&echeanceDepassee=1'));
    expect(prisma.assignation.count.mock.calls[0][0].where).toEqual(
      prisma.assignation.findMany.mock.calls[0][0].where,
    );
  });

  it('sans le paramètre, AUCUN filtre d’échéance — contrôle négatif', async () => {
    // Sans lui, poser le filtre inconditionnellement passerait au vert.
    await GET(get('idPatient=PAT001&statutReponses=non_rempli'));
    expect(prisma.assignation.findMany.mock.calls[0][0].where.dateLimite).toBeUndefined();
  });

  it('une valeur autre que « 1 » ne déclenche rien', async () => {
    await GET(get('idPatient=PAT001&statutReponses=non_rempli&echeanceDepassee=true'));
    expect(prisma.assignation.findMany.mock.calls[0][0].where.dateLimite).toBeUndefined();
  });

  it('l’écho dit au client que le filtre a bien été appliqué', async () => {
    // Sans cet écho, un client parlant à un serveur antérieur lirait une liste
    // NON filtrée comme filtrée, et offrirait « Débloquer » sur des
    // questionnaires dont l'échéance court encore.
    const res = await GET(get('idPatient=PAT001&statutReponses=non_rempli&echeanceDepassee=1'));
    const json = await res.json();
    expect(json.assignationsMeta.echeanceDepassee).toBe(true);
  });

  it('ignore un statut de réponse hors registre au lieu de rejeter la requête', async () => {
    const res = await GET(get('statutReponses=brouillon'));
    expect(res.status).toBe(200);
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: portee } })
    );
  });

  // Contrairement aux statuts, un idPatient inconnu n'est PAS ignoré : l'ignorer
  // rendrait les assignations de TOUS les patients à un appelant qui en demande
  // un seul, et la fiche afficherait les demandes de correction d'un autre
  // dossier. Une valeur qui ne correspond à rien rend une liste vide.
  it('n’ignore jamais un idPatient : une valeur inconnue filtre au lieu d’ouvrir', async () => {
    await GET(get('idPatient=PAT_INEXISTANT'));
    const where = prisma.assignation.findMany.mock.calls[0][0].where;
    expect(where.idPatient).toBe('PAT_INEXISTANT');
  });

  it('sans paramètre, ne filtre rien — comportement historique inchangé', async () => {
    await GET(get());
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { patient: portee } })
    );
  });

  // Les filtres s'AJOUTENT à la garde de portée. Demander le dossier d'un autre
  // praticien ne doit rien ouvrir : le `where` reste une conjonction.
  it('ne desserre jamais la portée praticien', async () => {
    await GET(get('idPatient=PAT_AUTRE_PRATICIEN&statutReponses=verrouille'));
    const where = prisma.assignation.findMany.mock.calls[0][0].where;
    expect(where.patient).toEqual(portee);
    expect(where.idPatient).toBe('PAT_AUTRE_PRATICIEN');
  });

  it('filtre aussi dans la branche paginée', async () => {
    await GET(get('page=1&idPatient=PAT001&statutReponses=modification_demandee'));
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { patient: portee, statutReponses: 'modification_demandee', idPatient: 'PAT001' },
      })
    );
  });

  // Les quatre valeurs qu'écrit le code : défaut du schéma, soumission patient,
  // demande de correction, déblocage praticien. Vérifié en base le 2026-07-29 :
  // aucune ligne hors de cette liste.
  it('accepte les quatre statuts de réponse que le code écrit', async () => {
    for (const valeur of ['non_rempli', 'verrouille', 'modification_demandee', 'deverrouille']) {
      vi.clearAllMocks();
      prisma.assignation.findMany.mockResolvedValue([]);
      prisma.assignation.count.mockResolvedValue(0);
      prisma.patient.findMany.mockResolvedValue([]);
      await GET(get(`statutReponses=${valeur}`));
      const where = prisma.assignation.findMany.mock.calls[0][0].where;
      expect(where.statutReponses).toBe(valeur);
    }
  });
});

describe('PATCH /api/praticien/patients', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT001', praticienEmail: 'p@wellneuro.fr' });
    prisma.patient.update.mockResolvedValue({});
    prisma.portailMagicLink.updateMany.mockResolvedValue({ count: 0 });
    // Forme TABLEAU : Prisma reçoit le résultat des constructeurs, déjà
    // évalués. Les deux écritures sont donc bien appelées pour bâtir le
    // tableau, et les compteurs d'appel des bancs existants restent justes.
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it('désactiver ferme les liens encore en vol, dans la même transaction', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    const arg = prisma.portailMagicLink.updateMany.mock.calls[0][0];
    expect(arg.where.idPatient).toBe('PAT001');
    // Les deux filtres portent le sens : on ne ferme QUE ce qui est encore
    // ouvert, et on ne rallonge jamais un lien.
    expect(arg.where.consommeLe).toBeNull();
    expect(arg.where.expireLe.gt).toBeInstanceOf(Date);
    expect(arg.data.expireLe).toEqual(arg.where.expireLe.gt);
  });

  // ★ LE BANC DÉCISIF. Il ne garde pas ce que le correctif fait, mais ce qu'il
  // s'INTERDIT : devenir un second écrivain de `sessionsInvalidesAvant` ou un
  // troisième de `consommeLe`. Recopier la transaction de révocation — le
  // réflexe naturel, et la première conception proposée — rouvrirait le défaut
  // que la PR #889 vient de fermer, puisque `nouveaux-patients` distingue un
  // tampon de fermeture d'une vraie entrée par une ÉGALITÉ STRICTE entre ces
  // deux colonnes. Ce banc rougit sur ce correctif-là, et sur lui seul.
  //
  // DEPUIS `D-128`, la révocation ne date plus `consommeLe` non plus : le banc
  // garde donc un invariant que les DEUX gestes praticien respectent, et non
  // plus une asymétrie entre eux.
  it('la désactivation n’écrit NI la révocation, NI une date de consommation', async () => {
    await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    for (const [appel] of prisma.patient.update.mock.calls) {
      expect(appel.data).not.toHaveProperty('accessTokenRevoked');
      expect(appel.data).not.toHaveProperty('sessionsInvalidesAvant');
    }
    for (const [appel] of prisma.portailMagicLink.updateMany.mock.calls) {
      expect(appel.data).not.toHaveProperty('consommeLe');
    }
  });

  it('réactiver et corriger un téléphone ne touchent aucun lien', async () => {
    await PATCH(patch({ idPatient: 'PAT001', actif: 'OUI' }));
    await PATCH(patch({ idPatient: 'PAT001', telephone: '0600000000' }));
    expect(prisma.portailMagicLink.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.patient.update).toHaveBeenCalledTimes(2);
  });

  it('patient d’un autre praticien : 403, aucune écriture', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT001', praticienEmail: 'autre@wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    expect(res.status).toBe(403);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('patient accessible : autorise la modification', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledOnce();
  });

  // La forme `/^PAT\d+$/` rejetait les identifiants à tiret bas, dont le
  // patient fictif `PAT_SEED_03` : « Modifier » était inopérant sur le dossier
  // de seed, et le menu de LOT-01b passe par cette même route pour activer et
  // désactiver un dossier.
  it('accepte un identifiant à tiret bas (PAT_SEED_03)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_SEED_03', praticienEmail: 'p@wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT_SEED_03', actif: 'OUI' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.update).toHaveBeenCalledOnce();
  });

  // L'alphabet élargi ne doit pas devenir un contournement : l'appartenance
  // reste vérifiée, y compris sur les identifiants à tiret bas.
  it('un identifiant à tiret bas d’un autre praticien reste refusé (403)', async () => {
    prisma.patient.findUnique.mockResolvedValue({ idPatient: 'PAT_SEED_03', praticienEmail: 'autre@wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT_SEED_03', actif: 'NON' }));
    expect(res.status).toBe(403);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('refuse toujours un identifiant hors alphabet (400, aucune écriture)', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001; DROP', actif: 'NON' }));
    expect(res.status).toBe(400);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });
});

// Il n'y a PAS de handler `DELETE` sur cette route, et ce test est là pour que
// son absence échoue en CI si on le réintroduit. Le verbe existait, n'écrivait
// que `actif: false`, et voisinerait aujourd'hui un effacement qui détruit
// vraiment : un lecteur pressé confondrait les deux. Désactiver passe par
// `PATCH { actif: 'NON' }`, effacer par `POST …/cycle-de-vie`. Un commentaire
// seul n'aurait pas résisté au réflexe REST — celui-ci, si.
describe('DELETE /api/praticien/patients', () => {
  it('n’existe pas : Next répond 405 en l’absence de handler', async () => {
    const handlers = await import('./route');
    expect('DELETE' in handlers).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// LOT-05 — LA FICHE ADMINISTRATIVE S'ÉCRIT
//
// Jusqu'ici `PATCH` n'acceptait que `telephone` et `actif` : une faute de
// frappe sur un nom saisi à la création était DÉFINITIVE. Ce qui suit garde les
// trois choses qui peuvent mal tourner quand on ouvre l'écriture — un NIR faux
// qui part sur un courrier, un e-mail qui rend les réponses muettes, et un
// formulaire qui efface ce qu'il ne touche pas.
// ═══════════════════════════════════════════════════════════════════════════

describe('PATCH — le dossier administratif', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: 'PAT001',
      praticienEmail: 'p@wellneuro.fr',
      email: 'ancien@fictif.wellneuro.fr',
    });
    prisma.patient.update.mockResolvedValue({});
    prisma.portailMagicLink.updateMany.mockResolvedValue({ count: 0 });
    prisma.consultation.updateMany.mockResolvedValue({ count: 0 });
    prisma.assignation.updateMany.mockResolvedValue({ count: 0 });
    prisma.questionnaireReponse.updateMany.mockResolvedValue({ count: 0 });
    prisma.syntheseIA.updateMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it('accepte les champs qui n’étaient plus modifiables après la création', async () => {
    const res = await PATCH(
      patch({
        idPatient: 'PAT001',
        prenom: 'Sophie',
        nom: 'Nicola',
        dateNaissance: '1984-01-17',
        telephone: '0600000000',
      }),
    );
    expect(res.status).toBe(200);
    expect(prisma.patient.update.mock.calls[0][0].data).toMatchObject({
      prenom: 'Sophie',
      nom: 'Nicola',
      dateNaissance: '1984-01-17',
      telephone: '0600000000',
    });
  });

  it('écrit les quatre renseignements du dossier administratif', async () => {
    await PATCH(
      patch({
        idPatient: 'PAT001',
        adresse: '12 rue des Fictifs, 75000 Paris',
        nir: '184017511600144',
        medecinTraitantNom: 'Dr Martin',
        medecinTraitantCoordonnees: '01 02 03 04 05',
      }),
    );
    expect(prisma.patient.update.mock.calls[0][0].data).toMatchObject({
      adresse: '12 rue des Fictifs, 75000 Paris',
      nir: '184017511600144',
      medecinTraitantNom: 'Dr Martin',
      medecinTraitantCoordonnees: '01 02 03 04 05',
    });
  });

  it('★ NE TOUCHE PAS À CE QUE LE PAYLOAD NE NOMME PAS', async () => {
    // LE DÉFAUT QUE CE BANC EMPÊCHE. Le formulaire de désactivation n'envoie
    // qu'`actif`. Si l'absence d'un champ était lue comme « vide », enregistrer
    // une désactivation effacerait l'adresse, le NIR et le médecin traitant —
    // sans un mot, et sans que personne ne pense à vérifier.
    await PATCH(patch({ idPatient: 'PAT001', actif: 'NON' }));
    const data = prisma.patient.update.mock.calls[0][0].data;
    for (const champ of [
      'prenom',
      'nom',
      'email',
      'dateNaissance',
      'telephone',
      'adresse',
      'nir',
      'medecinTraitantNom',
      'medecinTraitantCoordonnees',
    ]) {
      expect(data, champ).not.toHaveProperty(champ);
    }
  });

  it('une chaîne vide EFFACE le renseignement, elle ne le bloque pas', async () => {
    // Le `CHECK` de la base refuse `''` mais accepte `NULL` : sans cette
    // traduction, vider un champ deviendrait une erreur technique — et retirer
    // une adresse saisie par erreur serait impossible.
    await PATCH(patch({ idPatient: 'PAT001', adresse: '', nir: '', medecinTraitantNom: '   ' }));
    expect(prisma.patient.update.mock.calls[0][0].data).toMatchObject({
      adresse: null,
      nir: null,
      medecinTraitantNom: null,
    });
  });

  it('refuse de VIDER prénom ou nom — un dossier sans nom n’est plus un dossier', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001', prenom: '  ' }));
    expect(res.status).toBe(400);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });
});

describe('PATCH — le NIR est refusé sur sa CLÉ, pas seulement sur sa forme', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: 'PAT001',
      praticienEmail: 'p@wellneuro.fr',
      email: 'ancien@fictif.wellneuro.fr',
    });
    prisma.patient.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it('★ un numéro BIEN FORMÉ mais de clé fausse est refusé, et rien n’est écrit', async () => {
    // LA BASE NE VOIT QUE LA FORME (`patients_nir_forme`). Ce numéro-ci la
    // satisfait : quinze caractères, chiffres. Sa clé ne correspond pas aux
    // treize premiers, et il finirait sur un courrier ou une demande de prise
    // en charge si seule la base gardait.
    const res = await PATCH(patch({ idPatient: 'PAT001', nir: '184017511600145' }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toContain('clé de contrôle');
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('dit CE QUI ne va pas : la forme et la clé ne rendent pas le même message', async () => {
    const forme = await PATCH(patch({ idPatient: 'PAT001', nir: '1840175116' }));
    const messageForme = ((await forme.json()) as { error?: string }).error ?? '';
    expect(forme.status).toBe(400);
    expect(messageForme).toContain('15 caractères');
    expect(messageForme).not.toContain('clé de contrôle');
  });

  it('accepte le numéro tel qu’il est imprimé sur la carte, et le stocke normalisé', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001', nir: '1 84 01 75 116 001 44' }));
    expect(res.status).toBe(200);
    expect(prisma.patient.update.mock.calls[0][0].data.nir).toBe('184017511600144');
  });
});

describe('PATCH — changer l’e-mail sans rendre les réponses muettes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.update.mockResolvedValue({});
    prisma.consultation.updateMany.mockResolvedValue({ count: 0 });
    prisma.assignation.updateMany.mockResolvedValue({ count: 0 });
    prisma.questionnaireReponse.updateMany.mockResolvedValue({ count: 0 });
    prisma.syntheseIA.updateMany.mockResolvedValue({ count: 0 });
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  // Appartenance, puis ancienne adresse, puis contrôle d'unicité : trois
  // lectures distinctes sur le même mock, dans cet ordre.
  function lectures(occupePar: string | null = null) {
    prisma.patient.findUnique
      .mockResolvedValueOnce({ idPatient: 'PAT001', praticienEmail: 'p@wellneuro.fr' })
      .mockResolvedValueOnce({ email: 'ancien@fictif.wellneuro.fr' })
      .mockResolvedValueOnce(occupePar ? { idPatient: occupePar } : null);
  }

  it('★ LE BANC DÉCISIF — les quatre copies sont réécrites, dans LA MÊME transaction', async () => {
    // `GET /api/praticien/reponses` interroge `questionnaireReponse` PAR
    // `emailPatient`. Changer l'adresse du dossier sans réécrire les copies
    // rendrait muettes toutes les réponses déjà reçues : le praticien verrait
    // une liste vide, et rien ne lui dirait que ses données sont là mais
    // introuvables.
    lectures();
    const res = await PATCH(patch({ idPatient: 'PAT001', email: 'nouveau@fictif.wellneuro.fr' }));
    expect(res.status).toBe(200);

    for (const table of [
      prisma.consultation,
      prisma.assignation,
      prisma.questionnaireReponse,
      prisma.syntheseIA,
    ]) {
      expect(table.updateMany).toHaveBeenCalledWith({
        where: { idPatient: 'PAT001' },
        data: { emailPatient: 'nouveau@fictif.wellneuro.fr' },
      });
    }

    // ENSEMBLE, et pas l'une après l'autre : entre deux écritures séparées, une
    // lecture verrait le dossier sur la nouvelle adresse et ses réponses sur
    // l'ancienne — donc une liste vide, indiscernable d'un dossier sans réponse.
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(prisma.$transaction.mock.calls[0][0]).toHaveLength(5);
  });

  it('★ le livret envoyé N’EST PAS réécrit — il atteste un envoi réellement parti', async () => {
    // `booklet_envois.email_patient_masque` dit qu'un livret est parti à CETTE
    // adresse-là, à cette date-là. Le réécrire falsifierait une trace : le
    // livret est bien parti à l'ancienne adresse, et c'est ce qui s'est passé.
    // ET CE BANC DISCRIMINE VRAIMENT : le mock n'expose pas `bookletEnvoi`, si
    // bien qu'une écriture vers cette table tomberait sur `undefined`, serait
    // rattrapée par le `catch` de la route, et rendrait `success: false`. Sans
    // l'assertion de succès ci-dessous, ce test resterait vert quoi qu'il
    // arrive — une assertion sur la forme du mock ne prouve rien du code.
    lectures();
    const res = await PATCH(patch({ idPatient: 'PAT001', email: 'nouveau@fictif.wellneuro.fr' }));
    expect(((await res.json()) as { success: boolean }).success).toBe(true);
    expect('bookletEnvoi' in prisma).toBe(false);
  });

  it('une adresse réécrite À L’IDENTIQUE ne déclenche aucune réécriture', async () => {
    prisma.patient.findUnique
      .mockResolvedValueOnce({ idPatient: 'PAT001', praticienEmail: 'p@wellneuro.fr' })
      .mockResolvedValueOnce({ email: 'ancien@fictif.wellneuro.fr' });
    const res = await PATCH(patch({ idPatient: 'PAT001', email: 'ancien@fictif.wellneuro.fr' }));
    expect(res.status).toBe(200);
    expect(prisma.questionnaireReponse.updateMany).not.toHaveBeenCalled();
  });

  it('une adresse déjà prise par un AUTRE dossier rend 409, et n’écrit rien', async () => {
    lectures('PAT002');
    const res = await PATCH(patch({ idPatient: 'PAT001', email: 'occupe@fictif.wellneuro.fr' }));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { reason?: string }).reason).toBe('duplicate_email');
    expect(prisma.patient.update).not.toHaveBeenCalled();
    expect(prisma.questionnaireReponse.updateMany).not.toHaveBeenCalled();
  });

  it('la COURSE que le contrôle ne couvre pas rend le même 409, pas une erreur technique', async () => {
    // Deux enregistrements simultanés vers la même adresse passent tous deux le
    // contrôle explicite ; c'est la contrainte unique qui tranche.
    lectures();
    prisma.$transaction.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    const res = await PATCH(patch({ idPatient: 'PAT001', email: 'nouveau@fictif.wellneuro.fr' }));
    expect(res.status).toBe(409);
    expect(((await res.json()) as { reason?: string }).reason).toBe('duplicate_email');
  });

  it('un e-mail invalide est refusé avant toute lecture de l’ancien', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: 'PAT001',
      praticienEmail: 'p@wellneuro.fr',
    });
    const res = await PATCH(patch({ idPatient: 'PAT001', email: 'pas-une-adresse' }));
    expect(res.status).toBe(400);
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('sans e-mail au payload, aucune lecture de plus et aucune réécriture', async () => {
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: 'PAT001',
      praticienEmail: 'p@wellneuro.fr',
    });
    await PATCH(patch({ idPatient: 'PAT001', telephone: '0600000000' }));
    // Une seule lecture : celle de l'appartenance.
    expect(prisma.patient.findUnique).toHaveBeenCalledOnce();
    expect(prisma.consultation.updateMany).not.toHaveBeenCalled();
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SUITE DE LA REVUE DU 2026-09-16 (PR #1166)
// ═══════════════════════════════════════════════════════════════════════════

describe('PATCH — un payload mal typé est une requête invalide, pas une panne', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: 'PAT001',
      praticienEmail: 'p@wellneuro.fr',
      email: 'ancien@fictif.wellneuro.fr',
    });
    prisma.patient.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it('★ une valeur non textuelle rend 400, jamais 500', async () => {
    // `JSON.parse` rend ce qu'on lui donne. `{ "adresse": 42 }` produisait un
    // `42.trim is not a function` — donc une exception, donc un 500 qui dit
    // « le serveur est en panne » alors qu'il ne l'était pas.
    for (const corps of [
      { idPatient: 'PAT001', adresse: 42 },
      { idPatient: 'PAT001', nir: { valeur: '1' } },
      { idPatient: 'PAT001', prenom: ['Sophie'] },
      { idPatient: 123 },
    ]) {
      const res = await PATCH(patch(corps));
      expect(res.status, JSON.stringify(corps)).toBe(400);
      expect(((await res.json()) as { reason?: string }).reason).toBe('invalid_payload');
    }
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('`null` explicite est refusé comme le reste — il n’est pas « absent »', async () => {
    // `undefined` veut dire « ne touche pas ». `null` n'est pas `undefined` :
    // le laisser passer aurait écrit `null.trim()`.
    const res = await PATCH(patch({ idPatient: 'PAT001', adresse: null }));
    expect(res.status).toBe(400);
  });
});

describe('PATCH — une adresse trop longue est REFUSÉE, jamais tronquée', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findUnique.mockResolvedValue({
      idPatient: 'PAT001',
      praticienEmail: 'p@wellneuro.fr',
    });
    prisma.patient.update.mockResolvedValue({});
    prisma.$transaction.mockImplementation(async (ops: unknown[]) => ops);
  });

  it('★ tronquer fabriquerait une adresse fausse — et ces champs servent à écrire aux gens', async () => {
    const res = await PATCH(patch({ idPatient: 'PAT001', adresse: 'a'.repeat(501) }));
    expect(res.status).toBe(400);
    expect(((await res.json()) as { error?: string }).error).toContain('500 caractères');
    expect(prisma.patient.update).not.toHaveBeenCalled();
  });

  it('les trois champs bornés le sont chacun à sa mesure', async () => {
    const cas: [string, number][] = [
      ['adresse', 500],
      ['medecinTraitantNom', 200],
      ['medecinTraitantCoordonnees', 500],
    ];
    for (const [champ, max] of cas) {
      const trop = await PATCH(patch({ idPatient: 'PAT001', [champ]: 'x'.repeat(max + 1) }));
      expect(trop.status, `${champ} au-delà`).toBe(400);
      const pile = await PATCH(patch({ idPatient: 'PAT001', [champ]: 'x'.repeat(max) }));
      expect(pile.status, `${champ} à la borne`).toBe(200);
    }
  });
});

describe('GET — `idPatient` restreint aussi la liste des dossiers (LOT-06)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.patient.findMany.mockResolvedValue([]);
    prisma.patient.count.mockResolvedValue(0);
    prisma.assignation.findMany.mockResolvedValue([]);
    prisma.assignation.count.mockResolvedValue(0);
    prisma.questionnaireReponse.findMany.mockResolvedValue([]);
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([]);
  });

  it('★ demander UN dossier ne descend pas la fiche de toute la patientèle', async () => {
    // AVANT LE LOT-06, `idPatient` ne filtrait que les assignations. Le cockpit
    // patient — qui passe ce paramètre à chacun de ses trois appels — recevait
    // donc l'adresse postale et le NIR de TOUS les dossiers du praticien pour en
    // afficher un seul. Le LOT-05, qui a mis ces champs au DTO, a transformé une
    // sur-lecture anodine en exposition de données administratives.
    await GET(get('idPatient=PAT_SEED_03'));
    expect(prisma.patient.findMany).toHaveBeenCalledWith({
      where: {
        praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' },
        idPatient: 'PAT_SEED_03',
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
  });

  it('sans `idPatient`, la liste complète reste servie — les sélecteurs en vivent', async () => {
    await GET(get());
    expect(prisma.patient.findMany).toHaveBeenCalledWith({
      where: { praticienEmail: { equals: 'p@wellneuro.fr', mode: 'insensitive' } },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });
  });

  it('la portée praticien n’est jamais desserrée par ce filtre', async () => {
    await GET(get('idPatient=PAT_AUTRE'));
    const where = prisma.patient.findMany.mock.calls[0][0].where;
    expect(where.praticienEmail).toEqual({ equals: 'p@wellneuro.fr', mode: 'insensitive' });
  });
});
