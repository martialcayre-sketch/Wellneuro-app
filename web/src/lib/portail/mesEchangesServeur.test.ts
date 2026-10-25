import { beforeEach, describe, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  prisma: {
    bookletEnvoi: { findFirst: vi.fn() },
    assignation: { findMany: vi.fn() },
    questionnaireReponse: { groupBy: vi.fn() },
    trustAdverseEffectReport: { findMany: vi.fn() },
    trustPrivacyIncident: { findMany: vi.fn() },
    trustRightsRequest: { findMany: vi.fn() },
  },
  lectureFichesOuverte: vi.fn(),
  fichesALire: vi.fn(),
  lettreAdressagePatientOuverte: vi.fn(),
  lettreALire: vi.fn(),
  courrierComplementOuvert: vi.fn(),
  courrierComplementALire: vi.fn(),
  resolveProtocoleDiffuse: vi.fn(),
  isBioPortailEnabled: vi.fn(),
  listerTransmissions: vi.fn(),
  depotDocumentsOuvert: vi.fn(),
  listerDepotsPatient: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({ prisma: m.prisma }));
vi.mock('@/lib/documents/bilanPatient', () => ({ whereEnvoiVisible: (idPatient: string) => ({ idPatient, visible: true }) }));
vi.mock('@/lib/fiches-assiette/drapeau', () => ({ lectureFichesOuverte: m.lectureFichesOuverte }));
vi.mock('@/lib/fiches-assiette/servicePatient', () => ({ fichesALire: m.fichesALire }));
vi.mock('@/lib/correspondance/lettreAdressageRemise', () => ({
  lettreAdressagePatientOuverte: m.lettreAdressagePatientOuverte,
}));
vi.mock('@/lib/correspondance/lettreServicePatient', () => ({ lettreALire: m.lettreALire }));
vi.mock('@/lib/correspondance/courrierComplementRemise', () => ({ courrierComplementOuvert: m.courrierComplementOuvert }));
vi.mock('@/lib/correspondance/courrierComplementServicePatient', () => ({
  courrierComplementALire: m.courrierComplementALire,
}));
vi.mock('@/lib/protocol/portailProtocol', () => ({ resolveProtocoleDiffuse: m.resolveProtocoleDiffuse }));
vi.mock('@/lib/biology-library/publie', () => ({
  isBioPortailEnabled: m.isBioPortailEnabled,
  listerTransmissions: m.listerTransmissions,
}));
vi.mock('@/lib/collecte/drapeau', () => ({ depotDocumentsOuvert: m.depotDocumentsOuvert }));
vi.mock('@/lib/collecte/documentsDeposesServeur', () => ({ listerDepotsPatient: m.listerDepotsPatient }));
vi.mock('@/lib/questionnaires-catalog', () => ({ IDS_SUSPENDUS: new Set(['Q_SUSPENDU']) }));

import { sourcesMesEchanges } from './mesEchangesServeur';

// Les sources de « Mes échanges » ([[D-293]]) : chaque espèce sous SA règle de
// visibilité, une surface fermée ne produisant aucune ligne ; jamais la réponse
// du praticien à une demande de droit (§2).

beforeEach(() => {
  vi.clearAllMocks();
  m.prisma.bookletEnvoi.findFirst.mockResolvedValue(null);
  m.prisma.assignation.findMany.mockResolvedValue([]);
  m.prisma.questionnaireReponse.groupBy.mockResolvedValue([]);
  m.prisma.trustAdverseEffectReport.findMany.mockResolvedValue([]);
  m.prisma.trustPrivacyIncident.findMany.mockResolvedValue([]);
  m.prisma.trustRightsRequest.findMany.mockResolvedValue([]);
  m.lectureFichesOuverte.mockReturnValue(true);
  m.fichesALire.mockResolvedValue([]);
  m.lettreAdressagePatientOuverte.mockReturnValue(true);
  m.lettreALire.mockResolvedValue([]);
  m.courrierComplementOuvert.mockReturnValue(true);
  m.courrierComplementALire.mockResolvedValue([]);
  m.resolveProtocoleDiffuse.mockResolvedValue(null);
  m.isBioPortailEnabled.mockReturnValue(true);
  m.listerTransmissions.mockResolvedValue([]);
  m.depotDocumentsOuvert.mockReturnValue(true);
  m.listerDepotsPatient.mockResolvedValue([]);
});

describe('sourcesMesEchanges', () => {
  it('surfaces fermées par leur drapeau : aucune lecture, aucune ligne', async () => {
    m.lectureFichesOuverte.mockReturnValue(false);
    m.lettreAdressagePatientOuverte.mockReturnValue(false);
    m.courrierComplementOuvert.mockReturnValue(false);
    m.isBioPortailEnabled.mockReturnValue(false);
    m.depotDocumentsOuvert.mockReturnValue(false);
    const s = await sourcesMesEchanges('PAT_SOPHIE');
    expect(s.fiches).toEqual([]);
    expect(s.lettre).toBeNull();
    expect(s.courrierComplement).toBeNull();
    expect(m.courrierComplementALire).not.toHaveBeenCalled();
    expect(s.comptesRendus).toEqual([]);
    expect(s.documentsDeposes).toEqual([]);
    expect(m.fichesALire).not.toHaveBeenCalled();
    expect(m.lettreALire).not.toHaveBeenCalled();
    expect(m.listerTransmissions).not.toHaveBeenCalled();
    expect(m.listerDepotsPatient).not.toHaveBeenCalled();
  });

  it('courrier à remettre au médecin ([[D-345]], J3-12h lot 4) : la remise servie, sous son drapeau', async () => {
    m.courrierComplementALire.mockResolvedValue([{ id: 'ccr_1', remiseLe: new Date('2026-10-25T08:00:00.000Z') }]);
    const s = await sourcesMesEchanges('PAT_SOPHIE');
    expect(m.courrierComplementALire).toHaveBeenCalledWith('PAT_SOPHIE');
    expect(s.courrierComplement).toEqual({ id: 'ccr_1', remiseLe: new Date('2026-10-25T08:00:00.000Z') });
  });

  it('documents déposés ([[D-330]]) : la date seule, sous le drapeau du dépôt', async () => {
    m.listerDepotsPatient.mockResolvedValue([
      { deposeLe: '2026-10-08T08:00:00.000Z', categorie: 'courrier', retireLe: null },
      // Retiré : le contenu est effacé, la transmission reste au journal (D-330 §2).
      { deposeLe: '2026-10-09T08:00:00.000Z', categorie: 'courrier', retireLe: '2026-10-10T08:00:00.000Z' },
    ]);
    const s = await sourcesMesEchanges('PAT_SOPHIE');
    expect(m.listerDepotsPatient).toHaveBeenCalledWith('PAT_SOPHIE');
    expect(s.documentsDeposes).toEqual([
      { deposeLe: new Date('2026-10-08T08:00:00.000Z') },
      { deposeLe: new Date('2026-10-09T08:00:00.000Z') },
    ]);
  });

  it('le bilan suit la règle de visibilité de son écran', async () => {
    m.prisma.bookletEnvoi.findFirst.mockResolvedValue({ id: 'env_1', dateEnvoi: new Date('2026-10-01T08:00:00Z') });
    const s = await sourcesMesEchanges('PAT_SOPHIE');
    expect(m.prisma.bookletEnvoi.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_SOPHIE', visible: true } }),
    );
    expect(s.bilan).toEqual({ id: 'env_1', envoyeLe: new Date('2026-10-01T08:00:00Z') });
  });

  it('questionnaires : seulement transmis, instrument suspendu retiré sauf complété, daté par la dernière réponse', async () => {
    m.prisma.assignation.findMany.mockResolvedValue([
      { idAssignation: 'ASS_1', idQuestionnaire: 'Q_TEST_01', titre: 'Enquête alimentaire', statut: 'Complété' },
      { idAssignation: 'ASS_2', idQuestionnaire: 'Q_SUSPENDU', titre: 'Suspendu', statut: 'En attente' },
      { idAssignation: 'ASS_3', idQuestionnaire: 'Q_SUSPENDU', titre: 'Suspendu complété', statut: 'Complété' },
      { idAssignation: 'ASS_4', idQuestionnaire: 'Q_TEST_02', titre: 'Sans réponse', statut: 'Complété' },
    ]);
    m.prisma.questionnaireReponse.groupBy.mockResolvedValue([
      { idAssignation: 'ASS_1', _max: { dateReponse: new Date('2026-10-05T08:00:00Z') } },
      { idAssignation: 'ASS_3', _max: { dateReponse: new Date('2026-10-06T08:00:00Z') } },
    ]);
    const s = await sourcesMesEchanges('PAT_SOPHIE');
    // Seul `verrouille` est lu : un questionnaire rouvert (correction demandée,
    // déverrouillé) n'est pas « transmis » le temps de sa reprise.
    expect(m.prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT_SOPHIE', statutReponses: 'verrouille' } }),
    );
    expect(s.questionnaires).toEqual([
      { idAssignation: 'ASS_1', titre: 'Enquête alimentaire', transmisLe: new Date('2026-10-05T08:00:00Z') },
      { idAssignation: 'ASS_3', titre: 'Suspendu complété', transmisLe: new Date('2026-10-06T08:00:00Z') },
    ]);
  });

  it('signalements : catégorie, statut et date seulement — jamais la réponse à une demande de droit', async () => {
    m.prisma.trustRightsRequest.findMany.mockResolvedValue([
      { statutTraitement: 'traite', soumisLe: new Date('2026-10-07T08:00:00Z') },
    ]);
    const s = await sourcesMesEchanges('PAT_SOPHIE');
    for (const table of ['trustAdverseEffectReport', 'trustPrivacyIncident', 'trustRightsRequest'] as const) {
      expect(m.prisma[table].findMany).toHaveBeenCalledWith({
        where: { idPatient: 'PAT_SOPHIE' },
        select: { statutTraitement: true, soumisLe: true },
      });
    }
    expect(s.signalements).toEqual([
      { categorie: 'demande_droit', statutTraitement: 'traite', soumisLe: new Date('2026-10-07T08:00:00Z') },
    ]);
  });

  it('protocole : l’approbation active et sa date', async () => {
    m.resolveProtocoleDiffuse.mockResolvedValue({ approbationId: 'app_1', approvedAt: new Date('2026-10-04T08:00:00Z') });
    const s = await sourcesMesEchanges('PAT_SOPHIE');
    expect(s.protocole).toEqual({ approbationId: 'app_1', approuveLe: new Date('2026-10-04T08:00:00Z') });
  });
});
