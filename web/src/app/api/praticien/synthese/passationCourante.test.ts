import { beforeEach, describe, expect, it, vi } from 'vitest';

// Marquage de la passation courante par instrument (LOT-01 étape 6, renvoi du
// LOT-00 point 3).
//
// CE QUE LE LOT EXIGE, mot pour mot : « les passations antérieures RESTENT
// transmises — l'évolution entre deux enquêtes d'un même instrument est un
// signal clinique — mais la plus récente VALID est nommée comme telle. L'écart
// à corriger est l'absence de repère, pas le nombre de lignes : aucun
// `distinct`, aucune suppression. »
//
// Ce banc garde donc DEUX choses en même temps, et c'est le point : le nombre
// de lignes transmises ET la présence d'un repère unique. Un banc qui ne
// garderait que la seconde laisserait passer un `distinct` « de propreté ».

const { getServerSession, prisma, anthropicCreate } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    patient: { findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    consultation: { findFirst: vi.fn() },
    syntheseIA: { create: vi.fn() },
    auditSynthese: { create: vi.fn() },
  },
  anthropicCreate: vi.fn(),
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/generated/prisma', () => ({ Prisma: { DbNull: Symbol('DbNull') } }));
vi.mock('@/lib/praticien/appartenance', () => ({
  emailPraticien: (s: { user?: { email?: string } } | null) => s?.user?.email?.toLowerCase() ?? null,
  filtrePatientsDuPraticien: (email: string) => ({ praticienEmail: { equals: email, mode: 'insensitive' } }),
}));
vi.mock('@/lib/praticien/journalAcces', () => ({ journaliserAccesDossier: vi.fn() }));
// Module réel sauf le client HTTP : le schéma strict et la sélection de
// passation courante sont ceux de production.
vi.mock('@/lib/anthropic', async (importOriginal) => {
  const reel = await importOriginal<typeof import('@/lib/anthropic')>();
  return { ...reel, anthropic: { messages: { create: anthropicCreate } } };
});
vi.mock('@/lib/consultation/contexteClinique', () => ({
  buildContexteClinique: () => '',
  extraireVigilanceDeterministe: () => [] as string[],
}));
vi.mock('@/lib/observability/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), security: vi.fn() },
}));
vi.mock('@/lib/observability/eventCodes', () => ({ EVENT_CODES: {} }));
vi.mock('@/lib/observability/requestContext', () => ({
  createRequestContext: () => ({}),
  finalizeLogContext: (_c: unknown, x: unknown) => x,
  withCorrelationHeader: (res: unknown) => res,
}));

import { POST } from './route';

const CONFORME = JSON.stringify({
  resume_praticien: 'Synthèse concise pour le praticien.',
  axes_prioritaires: [],
  points_de_vigilance: ['Un point'],
  questions_entretien: ['Une question ?'],
  narratif_patient: 'Un texte accessible.',
  limites: 'À valider par le praticien.',
});

function req(): Request {
  return new Request('http://x/api/praticien/synthese', {
    method: 'POST',
    body: JSON.stringify({ idPatient: 'PAT_SEED_01' }),
  });
}

function passation(idReponse: string, idQuestionnaire: string, jour: string) {
  return {
    idReponse,
    idQuestionnaire,
    titre: `Instrument ${idQuestionnaire}`,
    dateReponse: new Date(`${jour}T10:00:00Z`),
    scoresJson: {},
    scorePrincipal: 10,
    interpretation: null,
    statutValidite: 'VALID',
  };
}

/** Le message utilisateur réellement envoyé au modèle, reparsé. */
function passationsTransmises(): Array<{
  idQuestionnaire: string;
  date: string;
  passationCourante: boolean;
  ecarteeDuRaisonnement?: string;
  formeInstrumentAmbigue?: string;
  scores?: unknown;
}> {
  const message = anthropicCreate.mock.calls[0][0].messages[0].content as string;
  const json = message.slice(message.indexOf('['), message.lastIndexOf(']') + 1);
  return JSON.parse(json);
}

/** Les doublures par défaut, réutilisables au milieu d'un cas qui les réinitialise. */
function poserMocksParDefaut(): void {
  process.env.ANTHROPIC_API_KEY = 'test-key';
  delete process.env.WN_SYNTHESE_STREAM;
  getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
  prisma.patient.findFirst.mockResolvedValue({ idPatient: 'PAT_SEED_01', email: 'pat@example.com' });
  prisma.consultation.findFirst.mockResolvedValue(null);
  anthropicCreate.mockResolvedValue({
    content: [{ type: 'text', text: CONFORME }],
    stop_reason: 'end_turn',
    usage: {},
  });
  prisma.syntheseIA.create.mockResolvedValue({
    idSynthese: 'SYN_1',
    dateGeneration: new Date('2026-08-11T00:00:00Z'),
  });
  prisma.auditSynthese.create.mockResolvedValue({});
}

beforeEach(() => {
  vi.clearAllMocks();
  poserMocksParDefaut();
});

describe('deux passations VALID du même instrument', () => {
  it('les DEUX partent au prompt, une SEULE est marquée courante', async () => {
    // L'ordre de la requête est `dateReponse desc` : la plus récente d'abord.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R2', 'Q_ALI_02', '2026-08-10'),
      passation('R1', 'Q_ALI_02', '2026-07-01'),
    ]);

    const res = await POST(req());
    expect(res.status).toBe(200);

    const transmises = passationsTransmises();
    // LE NOMBRE DE LIGNES : aucun `distinct`, aucune suppression.
    expect(transmises).toHaveLength(2);
    expect(transmises.map(p => p.date).sort()).toEqual(['2026-07-01', '2026-08-10']);
    // LE REPÈRE : un seul, et sur la plus récente.
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-08-10');
  });

  it('marque `false` explicitement sur l’antérieure, plutôt que d’omettre la clé', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R2', 'Q_ALI_02', '2026-08-10'),
      passation('R1', 'Q_ALI_02', '2026-07-01'),
    ]);
    await POST(req());

    const anterieure = passationsTransmises().find(p => p.date === '2026-07-01');
    // Une clé qui n'apparaîtrait que sur la courante se lirait, sur les autres,
    // comme une information manquante plutôt que comme un « non ».
    expect(anterieure).toHaveProperty('passationCourante');
    expect(anterieure?.passationCourante).toBe(false);
  });

  it('l’ordre de la requête ne décide pas : la date décide', async () => {
    // Ordre inversé volontairement — un code qui prendrait `[0]` marquerait la
    // mauvaise ligne, et le test précédent ne l'aurait pas vu.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R1', 'Q_ALI_02', '2026-07-01'),
      passation('R2', 'Q_ALI_02', '2026-08-10'),
    ]);
    await POST(req());

    const courantes = passationsTransmises().filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-08-10');
  });
});

describe('plusieurs instruments', () => {
  it('marque UNE courante PAR instrument, pas une seule pour tout le dossier', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R4', 'Q_STR_04', '2026-08-09'),
      passation('R3', 'Q_STR_04', '2026-06-01'),
      passation('R2', 'Q_ALI_02', '2026-08-10'),
      passation('R1', 'Q_ALI_02', '2026-07-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(4);
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(2);
    expect(courantes.map(p => `${p.idQuestionnaire}@${p.date}`).sort()).toEqual([
      'Q_ALI_02@2026-08-10',
      'Q_STR_04@2026-08-09',
    ]);
    // Sans le découpage par instrument, seule la plus récente du dossier
    // (Q_ALI_02) porterait le repère, et Q_STR_04 n'en aurait aucun.
  });

  it('un instrument à passation unique porte le repère', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([passation('R1', 'Q_ALI_02', '2026-08-10')]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(1);
    expect(transmises[0].passationCourante).toBe(true);
    // Témoin positif : sans lui, un marqueur toujours `false` passerait les
    // assertions « une seule courante » des cas à deux passations.
  });
});

// LE TROU QUE LA REVUE A TROUVÉ, ET QUE CE BLOC FERME.
//
// Toutes les fixtures ci-dessus sont `VALID`. Le repère se posait donc toujours
// sur une passation saine, et rien ne disait ce qu'il faisait d'une passation
// écartée. Or `filtrerPassationsExploitables` ne retire RIEN tant que
// `WN_ENABLE_VALIDITE_PASSATIONS` est éteint — l'état de production : une
// passation marquée INVALID par le praticien, plus récente qu'une saine,
// partait au modèle avec `passationCourante: true` pendant que la saine portait
// `false`. La consigne lui fait alors rapporter l'état actuel d'après la mesure
// invalidée. Le repère ne RETIRE rien, il PROMEUT — et c'est promouvoir qui est
// faux, drapeau ou pas.
describe('passation écartée du raisonnement, drapeau de validité ÉTEINT', () => {
  it('une INVALID plus récente ne prend pas le repère : la VALID antérieure le porte', async () => {
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: 'INVALID' },
      passation('R1', 'Q_STR_04', '2026-07-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    // Les DEUX partent toujours : le LOT-00 s'est engagé à ne rien retirer tant
    // que le drapeau est éteint.
    expect(transmises).toHaveLength(2);
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-07-01');
  });

  it('SUPERSEDED et HISTORICAL_ONLY sont écartés du repère de la même façon', async () => {
    for (const statut of ['SUPERSEDED', 'HISTORICAL_ONLY']) {
      vi.clearAllMocks();
      poserMocksParDefaut();
      prisma.questionnaireReponse.findMany.mockResolvedValue([
        { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: statut },
        passation('R1', 'Q_STR_04', '2026-07-01'),
      ]);
      await POST(req());
      const courantes = passationsTransmises().filter(p => p.passationCourante);
      expect(courantes).toHaveLength(1);
      expect(courantes[0].date).toBe('2026-07-01');
    }
  });

  it('la ligne écartée est MARQUÉE : le statut arrive comme donnée, pas comme silence', async () => {
    // Sans ce champ, la seule trace de l'écartement était l'ABSENCE d'un `true`
    // ailleurs dans la liste — une inférence négative sur des chiffres livrés
    // entiers, c'est-à-dire le patron que `buildUserMessage` déclare lui-même
    // insuffisant (« consigne seule, données livrées »).
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: 'INVALID' },
      passation('R1', 'Q_STR_04', '2026-07-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    const ecartee = transmises.find(p => p.date === '2026-08-10');
    expect(ecartee?.ecarteeDuRaisonnement).toBe('INVALID');
    // MARQUER, PAS RETIRER : les chiffres partent quand même (engagement LOT-00).
    expect(ecartee).toHaveProperty('scores');
    // Et la ligne saine ne porte pas la clé : une clé toujours présente se
    // lirait « statut non renseigné » partout ailleurs.
    expect(transmises.find(p => p.date === '2026-07-01')).not.toHaveProperty('ecarteeDuRaisonnement');
  });

  it('une passation UNIQUE et écartée : aucune courante, et la ligne est marquée', async () => {
    // Le cas que la contre-revue a nommé : un seul exemplaire, invalidé. La
    // consigne v21 disait « un seul exemplaire porte true » — faux ici, et le
    // modèle lisait trois consignes incompatibles.
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R1', 'Q_STR_04', '2026-08-10'), statutValidite: 'INVALID' },
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(1);
    expect(transmises[0].passationCourante).toBe(false);
    expect(transmises[0].ecarteeDuRaisonnement).toBe('INVALID');
  });

  it('AMBIGUOUS reste éligible au repère : ce n’est pas un statut écarté', async () => {
    // Garde d'anti-dérive : un ajout accidentel d'`AMBIGUOUS` aux statuts
    // exclus ne ferait rougir aucun autre banc du repère.
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: 'AMBIGUOUS' },
      passation('R1', 'Q_STR_04', '2026-07-01'),
    ]);
    await POST(req());

    const courantes = passationsTransmises().filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-08-10');
  });

  it('toutes écartées ⇒ AUCUN repère, et surtout pas un repli sur la plus récente', async () => {
    // C'est le cas que la consigne v21 décrit : l'instrument n'a pas de mesure
    // qui fasse foi. Se rabattre sur la plus récente désignerait précisément
    // celle que le praticien a écartée.
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R2', 'Q_STR_04', '2026-08-10'), statutValidite: 'INVALID' },
      { ...passation('R1', 'Q_STR_04', '2026-07-01'), statutValidite: 'INVALID' },
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(2);
    expect(transmises.filter(p => p.passationCourante)).toHaveLength(0);
  });
});

// UN IDENTIFIANT, DEUX INSTRUMENTS — [[D-051]].
//
// `Q_ALI_01` résout vers le dépistage court à 14 items (total /42) ou l'Enquête
// alimentaire SIIN à 57 items (total /90) selon `WN_ALI_01_SIIN57`. Ce ne sont
// pas deux versions d'un même questionnaire : le banc de certification a comparé
// les libellés position par position et trouve des similarités de 0,00 à 0,33.
//
// Le repère répond « laquelle fait foi », question sans objet entre deux
// instruments : à l'allumage du drapeau, la passation sur 90 aurait été donnée
// pour l'état actuel à la place de la passation sur 42, et l'écart de total se
// serait lu comme une évolution clinique. Le défaut est ANTÉRIEUR à ce lot ;
// c'est le repère qui l'aurait rendu visible et actif.
describe('identifiant qui a désigné plusieurs instruments', () => {
  it('deux passations Q_ALI_01 ⇒ AUCUN repère, et les deux lignes disent pourquoi', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R2', 'Q_ALI_01', '2026-08-10'),
      passation('R1', 'Q_ALI_01', '2026-07-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    // Rien n'est retiré : les deux mesures restent exploitables, chacune pour
    // sa date. Ce qui est refusé est de les mettre en relation.
    expect(transmises).toHaveLength(2);
    expect(transmises.filter(p => p.passationCourante)).toHaveLength(0);
    // MARQUER, PAS TAIRE — sans ce champ, l'absence de repère se lirait comme
    // le cas « aucune passation exploitable », un motif faux à la place d'un
    // motif vrai. C'est la leçon de la v22, appliquée avant d'être répétée.
    for (const ligne of transmises) {
      expect(ligne.formeInstrumentAmbigue).toMatch(/plusieurs questionnaires différents/i);
    }
  });

  it('une passation Q_ALI_01 UNIQUE garde son repère : il n’y a rien à départager', async () => {
    // Contre-mesure au « refus global » : abstenir le repère sur une passation
    // unique ne protégerait de rien et coûterait un repère vrai — la dimension
    // se lirait comme non mesurée. Le seuil est DEUX passations.
    prisma.questionnaireReponse.findMany.mockResolvedValue([passation('R1', 'Q_ALI_01', '2026-08-10')]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(1);
    expect(transmises[0].passationCourante).toBe(true);
    expect(transmises[0]).not.toHaveProperty('formeInstrumentAmbigue');
  });

  it('l’abstention est LOCALE : les autres instruments gardent leur repère', async () => {
    // Sans ce cas, une abstention qui éteindrait le repère du dossier ENTIER
    // passerait les deux tests précédents.
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R4', 'Q_ALI_01', '2026-08-10'),
      passation('R3', 'Q_ALI_01', '2026-07-01'),
      passation('R2', 'Q_STR_04', '2026-08-09'),
      passation('R1', 'Q_STR_04', '2026-06-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(4);
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(`${courantes[0].idQuestionnaire}@${courantes[0].date}`).toBe('Q_STR_04@2026-08-09');
    // Et la clé ne déborde pas sur l'instrument voisin.
    expect(transmises.filter(p => p.formeInstrumentAmbigue)).toHaveLength(2);
  });

  it('une paire dont UNE est écartée garde son repère sur la saine', async () => {
    // Corrigé après revue. Le seuil se comptait sur toutes les passations
    // transmises : une paire dont l'une est invalidée franchissait « deux » et
    // déclenchait l'abstention, alors qu'une seule mesure est exploitable — il
    // n'y avait rien à départager. Coût du défaut : un repère juste perdu, et
    // sur la ligne écartée un `formeInstrumentAmbigue` dont la consigne affirme
    // que « ces passations restent exploitables », ce qui est faux d'elle.
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R2', 'Q_ALI_01', '2026-08-10'), statutValidite: 'INVALID' },
      passation('R1', 'Q_ALI_01', '2026-07-01'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    const courantes = transmises.filter(p => p.passationCourante);
    expect(courantes).toHaveLength(1);
    expect(courantes[0].date).toBe('2026-07-01');
    // Aucune ligne ne porte les DEUX marqueurs.
    expect(transmises.filter(p => p.formeInstrumentAmbigue)).toHaveLength(0);
    expect(transmises.find(p => p.date === '2026-08-10')?.ecarteeDuRaisonnement).toBe('INVALID');
  });

  it('deux exploitables ET une écartée : chaque ligne porte SON marqueur, aucun repère', async () => {
    // Le cas qui distingue « deux passations » de « deux passations
    // EXPLOITABLES » — c'est-à-dire la formulation que le registre a dû
    // corriger. Sans lui, les deux lectures du seuil passaient les mêmes bancs.
    delete process.env.WN_ENABLE_VALIDITE_PASSATIONS;
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      { ...passation('R3', 'Q_ALI_01', '2026-08-10'), statutValidite: 'INVALID' },
      passation('R2', 'Q_ALI_01', '2026-07-01'),
      passation('R1', 'Q_ALI_01', '2026-05-02'),
    ]);
    await POST(req());

    const transmises = passationsTransmises();
    expect(transmises).toHaveLength(3);
    // Deux exploitables sous un identifiant ambigu ⇒ personne ne fait foi.
    expect(transmises.filter(p => p.passationCourante)).toHaveLength(0);
    // Chaque ligne dit ce qui la concerne, et rien d'autre : les deux
    // exploitables sont incomparables entre elles, la troisième est écartée.
    const parDate = new Map(transmises.map(p => [p.date, p]));
    expect(parDate.get('2026-07-01')?.formeInstrumentAmbigue).toMatch(/plusieurs questionnaires/i);
    expect(parDate.get('2026-05-02')?.formeInstrumentAmbigue).toMatch(/plusieurs questionnaires/i);
    expect(parDate.get('2026-08-10')).not.toHaveProperty('formeInstrumentAmbigue');
    expect(parDate.get('2026-08-10')?.ecarteeDuRaisonnement).toBe('INVALID');
  });

  it('l’abstention vient d’une constante, jamais de la forme servie', async () => {
    // Corrigé après revue : une première rédaction posait `WN_ALI_01_SIIN57`
    // puis rejouait la route, en croyant éprouver les deux positions. La forme
    // est résolue AU CHARGEMENT du module (`alimentaire.ts`) — poser la variable
    // après l'import ne bascule rien, et les deux itérations étaient
    // identiques. Un banc qui croit tester deux positions et n'en teste qu'une
    // est pire qu'absent : il donne la couverture pour acquise.
    //
    // Ce qui est réellement épinglé, et qui est le vrai motif de la décision :
    // le prédicat est une CONSTANTE, sans aucune lecture d'environnement. Le
    // risque naît de la coexistence de passations des deux époques dans un
    // dossier — un état que le drapeau éteint n'exclut plus une fois qu'il a
    // été allumé une fois.
    const source = await import('@/lib/questionnaires/alimentaire');
    expect(source.instrumentAFormeVariable('Q_ALI_01')).toBe(true);
    expect(source.instrumentAFormeVariable('Q_ALI_02')).toBe(false);
    expect(source.instrumentAFormeVariable.toString()).not.toMatch(/process\.env/);
  });
});

describe('départage à horodatage égal', () => {
  it('ne marque qu’une seule courante, de façon reproductible', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      passation('R1', 'Q_ALI_02', '2026-08-10'),
      passation('R2', 'Q_ALI_02', '2026-08-10'),
    ]);
    await POST(req());

    const courantes = passationsTransmises().filter(p => p.passationCourante);
    // L'ordre SQL n'est pas stable à horodatage égal. `derniereReponseParQuestionnaire`
    // départage sur `idReponse` — le repère ne peut donc pas osciller d'un run
    // à l'autre, et il ne peut pas non plus se poser deux fois.
    expect(courantes).toHaveLength(1);
  });
});
