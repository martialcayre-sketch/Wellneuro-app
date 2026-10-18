import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Le module qui écrit les impressions et les téléchargements (D-307, F38).
// La garde de partage est RÉELLE ; Prisma est simulé, et la transaction joue
// les appels dans l'ordre, pour vérifier que le verrou précède la relecture.

const { appels, tx, prisma } = vi.hoisted(() => {
  const appels: string[] = [];
  const tx = {
    $queryRaw: vi.fn(async () => {
      appels.push('verrou');
      return [];
    }),
    trustChoiceEvent: { findMany: vi.fn() },
    patient: { findUnique: vi.fn() },
    documentMedecinImprime: { create: vi.fn(), findFirst: vi.fn() },
    telechargementDocumentMedecin: { create: vi.fn() },
  };
  const prisma = {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    trustChoiceEvent: { findMany: vi.fn() },
    documentMedecinImprime: { findFirst: vi.fn() },
  };
  return { appels, tx, prisma };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  documentDisponible,
  documentMedecinPatientOuvert,
  empreinteHtml,
  enregistrerImpression,
  telechargerDocument,
} from './documentMedecinImprime';

const evenement = (statut: string) => [
  { finalite: 'partage_medecin_traitant', statut, enregistreLe: new Date('2026-07-01T08:00:00Z') },
];

beforeEach(() => {
  vi.clearAllMocks();
  appels.length = 0;
  tx.trustChoiceEvent.findMany.mockImplementation(async () => {
    appels.push('choix');
    return evenement('accorde');
  });
  tx.patient.findUnique.mockImplementation(async () => {
    appels.push('dossier');
    return { actif: true, suiviClotureLe: null };
  });
  tx.documentMedecinImprime.create.mockResolvedValue({ id: 'imp_1', imprimeLe: new Date('2026-10-18T15:00:00Z') });
  tx.documentMedecinImprime.findFirst.mockResolvedValue({
    id: 'imp_2', html: '<p>Instantané</p>', imprimeLe: new Date('2026-10-18T15:00:00Z'),
  });
  tx.telechargementDocumentMedecin.create.mockResolvedValue({ id: 'tel_1' });
  prisma.trustChoiceEvent.findMany.mockResolvedValue(evenement('accorde'));
  prisma.documentMedecinImprime.findFirst.mockResolvedValue({ imprimeLe: new Date('2026-10-18T15:00:00Z') });
});
afterEach(() => vi.unstubAllEnvs());

describe('drapeau et empreinte', () => {
  it('le drapeau du portail est fail-closed : seule la chaîne « true » ouvre', () => {
    expect(documentMedecinPatientOuvert('true')).toBe(true);
    expect(documentMedecinPatientOuvert('1')).toBe(false);
    expect(documentMedecinPatientOuvert('TRUE')).toBe(false);
    expect(documentMedecinPatientOuvert(undefined)).toBe(false);
  });

  it('l’empreinte est le sha-256 du HTML en UTF-8, celle que le CHECK recalcule', () => {
    const html = '<p>Document pour le médecin — été</p>';
    expect(empreinteHtml(html)).toBe(createHash('sha256').update(Buffer.from(html, 'utf8')).digest('hex'));
  });
});

describe('enregistrerImpression', () => {
  const entree = { idPatient: 'PAT_1', idSynthese: 'SYN_1', praticienEmail: 'p@wellneuro.fr', html: '<p>x</p>' };

  it('verrouille le dossier, PUIS relit le partage, PUIS écrit — avec l’empreinte', async () => {
    tx.documentMedecinImprime.create.mockImplementation(async () => {
      appels.push('ecriture');
      return { id: 'imp_1', imprimeLe: new Date('2026-10-18T15:00:00Z') };
    });
    const res = await enregistrerImpression(entree);
    expect(res).toEqual({ ok: true, impression: { id: 'imp_1', imprimeLe: new Date('2026-10-18T15:00:00Z') } });
    expect(appels).toEqual(['verrou', 'dossier', 'choix', 'ecriture']);
    expect(tx.documentMedecinImprime.create.mock.calls[0][0].data).toEqual({
      ...entree,
      htmlSha256: empreinteHtml('<p>x</p>'),
    });
  });

  it.each(['refuse', 'retire'])('partage %s à la relecture : refus, aucune écriture', async (statut) => {
    tx.trustChoiceEvent.findMany.mockResolvedValue(evenement(statut));
    const res = await enregistrerImpression(entree);
    expect(res.ok).toBe(false);
    expect(tx.documentMedecinImprime.create).not.toHaveBeenCalled();
  });

  it('dossier clos à la relecture sous verrou : refus « dossier clos », aucune écriture', async () => {
    tx.patient.findUnique.mockResolvedValue({ actif: false, suiviClotureLe: new Date('2026-10-18T14:00:00Z') });
    const res = await enregistrerImpression(entree);
    expect(res).toMatchObject({ ok: false, raison: 'dossier_cloture' });
    expect(tx.trustChoiceEvent.findMany).not.toHaveBeenCalled();
    expect(tx.documentMedecinImprime.create).not.toHaveBeenCalled();
  });

  it('partage jamais exprimé : refus, aucune écriture', async () => {
    tx.trustChoiceEvent.findMany.mockResolvedValue([]);
    expect((await enregistrerImpression(entree)).ok).toBe(false);
    expect(tx.documentMedecinImprime.create).not.toHaveBeenCalled();
  });
});

describe('documentDisponible', () => {
  it('rend la date de la dernière impression quand le partage est accordé', async () => {
    expect(await documentDisponible('PAT_1')).toEqual({ imprimeLe: new Date('2026-10-18T15:00:00Z') });
    expect(prisma.documentMedecinImprime.findFirst.mock.calls[0][0]).toMatchObject({
      where: { idPatient: 'PAT_1' },
      orderBy: { ordre: 'desc' },
    });
  });

  it('rien après un retrait, même avec une impression (arbitrage du 2026-10-18)', async () => {
    prisma.trustChoiceEvent.findMany.mockResolvedValue(evenement('retire'));
    expect(await documentDisponible('PAT_1')).toBeNull();
  });

  it('rien sans impression', async () => {
    prisma.documentMedecinImprime.findFirst.mockResolvedValue(null);
    expect(await documentDisponible('PAT_1')).toBeNull();
  });
});

describe('telechargerDocument', () => {
  it('sert la dernière impression et journalise CE téléchargement, sous le verrou', async () => {
    tx.telechargementDocumentMedecin.create.mockImplementation(async () => {
      appels.push('journal');
      return { id: 'tel_1' };
    });
    const res = await telechargerDocument('PAT_1');
    expect(res).toEqual({ html: '<p>Instantané</p>', imprimeLe: new Date('2026-10-18T15:00:00Z') });
    expect(appels).toEqual(['verrou', 'choix', 'journal']);
    expect(tx.documentMedecinImprime.findFirst.mock.calls[0][0]).toMatchObject({
      where: { idPatient: 'PAT_1' },
      orderBy: { ordre: 'desc' },
    });
    expect(tx.telechargementDocumentMedecin.create.mock.calls[0][0].data).toEqual({
      idPatient: 'PAT_1',
      idImpression: 'imp_2',
    });
  });

  it('partage retiré : rien servi, rien journalisé', async () => {
    tx.trustChoiceEvent.findMany.mockResolvedValue(evenement('retire'));
    expect(await telechargerDocument('PAT_1')).toBeNull();
    expect(tx.documentMedecinImprime.findFirst).not.toHaveBeenCalled();
    expect(tx.telechargementDocumentMedecin.create).not.toHaveBeenCalled();
  });

  it('aucune impression : rien servi, rien journalisé', async () => {
    tx.documentMedecinImprime.findFirst.mockResolvedValue(null);
    expect(await telechargerDocument('PAT_1')).toBeNull();
    expect(tx.telechargementDocumentMedecin.create).not.toHaveBeenCalled();
  });
});
