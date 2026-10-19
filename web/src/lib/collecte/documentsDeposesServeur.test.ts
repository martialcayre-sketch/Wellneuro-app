import { beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journal } = vi.hoisted(() => {
  const journal: string[] = [];
  return {
    journal,
    prisma: {
      documentDeposePatient: {
        count: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        findFirst: vi.fn(),
        updateMany: vi.fn(),
      },
      classementDocumentDepose: { create: vi.fn() },
      $queryRaw: vi.fn(),
      $executeRaw: vi.fn(),
      $transaction: vi.fn(),
    },
  };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import {
  classerDocument,
  consulterDocument,
  deposerDocument,
  jugerPlafondsDepot,
  listerDepotsPatient,
  listerDocumentsPraticien,
  retirerDocument,
} from './documentsDeposesServeur';
import { empreinteSha256 } from '@/lib/biology-library/import/depot';

// La collecte documentaire côté serveur ([[D-330]] §4). Prisma est simulé : ce
// banc tient l'ORDRE et la FORME des écritures (verrou, isolation, conditions,
// sélections). Ce que la base refuse est tenu par le contrat SQL négatif.

const PDF = Buffer.from('%PDF-1.7\n% fixture Michel Dogné\n%%EOF');
const sql = (s: TemplateStringsArray) => s.join('?');

let dossier: { actif: boolean; suivi_cloture_le: Date | null } | null;
let depots24h: number;

beforeEach(() => {
  vi.clearAllMocks();
  journal.length = 0;
  dossier = { actif: true, suivi_cloture_le: null };
  depots24h = 0;
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown, opts: unknown) => {
    journal.push(`transaction ${JSON.stringify(opts)}`);
    return cb(prisma);
  });
  prisma.$queryRaw.mockImplementation(async (s: TemplateStringsArray, ...valeurs: unknown[]) => {
    const texte = sql(s);
    if (texte.includes('FROM patients')) {
      journal.push(`dossier ${texte.includes('FOR SHARE') ? 'FOR SHARE' : 'SANS VERROU'}`);
      return dossier ? [dossier] : [];
    }
    journal.push(`compte 24h ${valeurs[0]}`);
    return [{ n: depots24h }];
  });
  prisma.$executeRaw.mockImplementation(async (s: TemplateStringsArray, ...valeurs: unknown[]) => {
    journal.push(`${sql(s).includes('pg_advisory_xact_lock') ? 'verrou' : 'autre'} ${valeurs[0]}`);
    return 1;
  });
  prisma.documentDeposePatient.count.mockImplementation(async ({ where }: { where: Record<string, unknown> }) => {
    journal.push(`count ${JSON.stringify(where)}`);
    return 0;
  });
  prisma.documentDeposePatient.create.mockImplementation(async () => {
    journal.push('create');
    return { id: 'doc_neuf' };
  });
});

describe('deposerDocument — sous le verrou du dossier, en READ COMMITTED', () => {
  it('dossier FOR SHARE, verrou du trigger, plafonds, doublon, puis l’écriture', async () => {
    const issue = await deposerDocument({ idPatient: 'PAT_MICHEL', octets: PDF, typeMime: 'application/pdf', categorie: 'courrier' });
    expect(issue).toEqual({ ok: true });
    const empreinte = empreinteSha256(PDF);
    expect(journal).toEqual([
      'transaction {"isolationLevel":"ReadCommitted","timeout":20000}',
      'dossier FOR SHARE',
      // Le même texte que le trigger : `hashtext('documents_deposes:' || id_patient)`.
      'verrou documents_deposes:PAT_MICHEL',
      'count {"idPatient":"PAT_MICHEL","consulteLe":null,"retireLe":null}',
      'compte 24h PAT_MICHEL',
      `count {"idPatient":"PAT_MICHEL","empreinteSha256":"${empreinte}","retireLe":null}`,
      'create',
    ]);
  });

  it('écrit le document, son type, son empreinte et la catégorie proposée — aucun nom de fichier, aucun instant', async () => {
    await deposerDocument({ idPatient: 'PAT_MICHEL', octets: PDF, typeMime: 'application/pdf', categorie: 'traitements_complements' });
    const { data } = prisma.documentDeposePatient.create.mock.calls[0][0];
    expect(Object.keys(data).sort()).toEqual(['categorieProposee', 'contenu', 'empreinteSha256', 'idPatient', 'typeMime']);
    expect(data.categorieProposee).toBe('traitements_complements');
    expect(Buffer.from(data.contenu).equals(PDF)).toBe(true);
  });

  it('dossier clos sous le verrou : refusé, rien n’est écrit', async () => {
    dossier = { actif: true, suivi_cloture_le: new Date('2026-10-01T00:00:00Z') };
    expect(await deposerDocument({ idPatient: 'PAT_MICHEL', octets: PDF, typeMime: 'application/pdf', categorie: 'autre' }))
      .toEqual({ ok: false, reason: 'dossier_cloture' });
    expect(prisma.documentDeposePatient.create).not.toHaveBeenCalled();
  });

  it('dossier introuvable : refusé comme clos, rien n’est écrit', async () => {
    dossier = null;
    expect((await deposerDocument({ idPatient: 'PAT_X', octets: PDF, typeMime: 'application/pdf', categorie: 'autre' })).ok).toBe(false);
    expect(prisma.documentDeposePatient.create).not.toHaveBeenCalled();
  });

  it('trois documents non consultés : refusé sous le verrou, rien n’est écrit', async () => {
    prisma.documentDeposePatient.count.mockResolvedValueOnce(3);
    expect(await deposerDocument({ idPatient: 'PAT_MICHEL', octets: PDF, typeMime: 'application/pdf', categorie: 'autre' }))
      .toEqual({ ok: false, reason: 'plafond_non_consultes' });
    expect(prisma.documentDeposePatient.create).not.toHaveBeenCalled();
  });

  it('dix dépôts en 24 heures : refusé sous le verrou, rien n’est écrit', async () => {
    depots24h = 10;
    expect(await deposerDocument({ idPatient: 'PAT_MICHEL', octets: PDF, typeMime: 'application/pdf', categorie: 'autre' }))
      .toEqual({ ok: false, reason: 'plafond_24h' });
    expect(prisma.documentDeposePatient.create).not.toHaveBeenCalled();
  });

  it('le même fichier, non retiré : « déjà déposé », rien n’est écrit', async () => {
    prisma.documentDeposePatient.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    expect(await deposerDocument({ idPatient: 'PAT_MICHEL', octets: PDF, typeMime: 'application/pdf', categorie: 'autre' }))
      .toEqual({ ok: false, reason: 'document_deja_depose' });
    expect(prisma.documentDeposePatient.create).not.toHaveBeenCalled();
  });

  it('une erreur de la base remonte à la route, qui n’en journalise que la classe', async () => {
    prisma.documentDeposePatient.create.mockRejectedValueOnce(new Error('dépôt refusé : … (ligne recopiée)'));
    await expect(deposerDocument({ idPatient: 'PAT_MICHEL', octets: PDF, typeMime: 'application/pdf', categorie: 'autre' }))
      .rejects.toThrow();
  });
});

describe('jugerPlafondsDepot', () => {
  it('deux non consultés et neuf dépôts ⇒ passe ; dix dépôts ⇒ plafond ; trois non consultés ⇒ plafond', async () => {
    prisma.documentDeposePatient.count.mockResolvedValueOnce(2);
    depots24h = 9;
    expect(await jugerPlafondsDepot('PAT_MICHEL')).toEqual({ ok: true });
    prisma.documentDeposePatient.count.mockResolvedValueOnce(2);
    depots24h = 10;
    expect(await jugerPlafondsDepot('PAT_MICHEL')).toEqual({ ok: false, reason: 'plafond_24h' });
    prisma.documentDeposePatient.count.mockResolvedValueOnce(3);
    expect(await jugerPlafondsDepot('PAT_MICHEL')).toEqual({ ok: false, reason: 'plafond_non_consultes' });
  });

  it('les 24 heures se comptent à l’horloge de la base', async () => {
    await jugerPlafondsDepot('PAT_MICHEL');
    const texte = sql(prisma.$queryRaw.mock.calls[0][0]);
    expect(texte).toContain('clock_timestamp()');
    expect(texte).toContain("interval '24 hours'");
  });
});

describe('les listes ne chargent jamais le document', () => {
  it('côté patient : date, catégorie proposée, retrait — rien d’autre', async () => {
    prisma.documentDeposePatient.findMany.mockResolvedValueOnce([
      { deposeLe: new Date('2026-10-08T08:00:00Z'), categorieProposee: 'courrier', retireLe: null },
      { deposeLe: new Date('2026-10-07T08:00:00Z'), categorieProposee: 'autre', retireLe: new Date('2026-10-09T08:00:00Z') },
    ]);
    const depots = await listerDepotsPatient('PAT_MICHEL');
    expect(prisma.documentDeposePatient.findMany.mock.calls[0][0].select).toEqual({
      deposeLe: true,
      categorieProposee: true,
      retireLe: true,
    });
    expect(depots).toEqual([
      { deposeLe: '2026-10-08T08:00:00.000Z', categorie: 'courrier', retireLe: null },
      { deposeLe: '2026-10-07T08:00:00.000Z', categorie: 'autre', retireLe: '2026-10-09T08:00:00.000Z' },
    ]);
  });

  it('côté praticien : sans `contenu`, catégorie courante = dernier classement', async () => {
    prisma.documentDeposePatient.findMany.mockResolvedValueOnce([
      {
        id: 'doc_1',
        typeMime: 'application/pdf',
        categorieProposee: 'autre',
        deposeLe: new Date('2026-10-08T08:00:00Z'),
        consulteLe: new Date('2026-10-09T08:00:00Z'),
        retireLe: null,
        motifRetrait: null,
        classements: [
          { categorie: 'courrier', classeLe: new Date('2026-10-09T09:00:00Z') },
          { categorie: 'compte_rendu_consultation', classeLe: new Date('2026-10-10T09:00:00Z') },
        ],
      },
    ]);
    const [doc] = await listerDocumentsPraticien('PAT_MICHEL');
    const { select } = prisma.documentDeposePatient.findMany.mock.calls[0][0];
    expect(select).not.toHaveProperty('contenu');
    expect(select.classements.orderBy).toEqual({ ordre: 'asc' });
    expect(doc.categorieCourante).toBe('compte_rendu_consultation');
    expect(doc.consulteLe).toBe('2026-10-09T08:00:00.000Z');
    expect(doc).not.toHaveProperty('contenu');
  });
});

describe('consulterDocument — seule la première ouverture est tracée', () => {
  it('trace d’abord, par une écriture conditionnelle, puis sert le document', async () => {
    const ordre: string[] = [];
    prisma.documentDeposePatient.updateMany.mockImplementationOnce(async () => {
      ordre.push('trace');
      return { count: 1 };
    });
    prisma.documentDeposePatient.findFirst.mockImplementationOnce(async () => {
      ordre.push('lecture');
      return { contenu: new Uint8Array(PDF), typeMime: 'application/pdf' };
    });
    const issue = await consulterDocument('PAT_MICHEL', 'doc_1', 'praticien@wellneuro.fr');
    expect(ordre).toEqual(['trace', 'lecture']);
    expect(prisma.documentDeposePatient.updateMany).toHaveBeenCalledWith({
      where: { id: 'doc_1', idPatient: 'PAT_MICHEL', consultePar: null, retireLe: null },
      data: { consultePar: 'praticien@wellneuro.fr' },
    });
    expect(issue.ok).toBe(true);
  });

  it('une seconde ouverture ne correspond à rien, n’écrit rien et n’échoue pas', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ contenu: new Uint8Array(PDF), typeMime: 'application/pdf' });
    expect((await consulterDocument('PAT_MICHEL', 'doc_1', 'praticien@wellneuro.fr')).ok).toBe(true);
  });

  it('document retiré : rien n’est servi', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ contenu: null, typeMime: 'image/png' });
    expect(await consulterDocument('PAT_MICHEL', 'doc_1', 'praticien@wellneuro.fr'))
      .toEqual({ ok: false, reason: 'document_retire' });
  });

  it('document d’un autre dossier : introuvable', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce(null);
    expect(await consulterDocument('PAT_MICHEL', 'doc_autre', 'praticien@wellneuro.fr'))
      .toEqual({ ok: false, reason: 'document_introuvable' });
    expect(prisma.documentDeposePatient.findFirst.mock.calls[0][0].where).toEqual({ id: 'doc_autre', idPatient: 'PAT_MICHEL' });
  });

  it('si la trace échoue, rien n’est servi', async () => {
    prisma.documentDeposePatient.updateMany.mockRejectedValueOnce(new Error('consultation refusée'));
    await expect(consulterDocument('PAT_MICHEL', 'doc_1', 'praticien@wellneuro.fr')).rejects.toThrow();
    expect(prisma.documentDeposePatient.findFirst).not.toHaveBeenCalled();
  });
});

describe('classerDocument — chaque correction datée par la base', () => {
  const params = { idPatient: 'PAT_MICHEL', idDocument: 'doc_1', praticienEmail: 'praticien@wellneuro.fr' } as const;

  it('une catégorie nouvelle : une ligne de classement, sans instant fourni', async () => {
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ retireLe: null, categorieProposee: 'autre', classements: [] });
    expect(await classerDocument({ ...params, categorie: 'courrier' })).toEqual({ ok: true, modifie: true });
    expect(prisma.classementDocumentDepose.create).toHaveBeenCalledWith({
      data: { idPatient: 'PAT_MICHEL', idDocument: 'doc_1', categorie: 'courrier', classePar: 'praticien@wellneuro.fr' },
      select: { id: true },
    });
  });

  it('la catégorie déjà courante : aucune ligne', async () => {
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({
      retireLe: null,
      categorieProposee: 'autre',
      classements: [{ categorie: 'courrier' }],
    });
    expect(await classerDocument({ ...params, categorie: 'courrier' })).toEqual({ ok: true, modifie: false });
    expect(prisma.classementDocumentDepose.create).not.toHaveBeenCalled();
  });

  it('document retiré : refusé sans écrire', async () => {
    prisma.documentDeposePatient.findFirst.mockResolvedValueOnce({ retireLe: new Date(), categorieProposee: 'autre', classements: [] });
    expect(await classerDocument({ ...params, categorie: 'courrier' })).toEqual({ ok: false, reason: 'document_retire' });
    expect(prisma.classementDocumentDepose.create).not.toHaveBeenCalled();
  });

  it('retrait concurrent : la base refuse, l’état relu le dit — jamais le message refusé', async () => {
    prisma.documentDeposePatient.findFirst
      .mockResolvedValueOnce({ retireLe: null, categorieProposee: 'autre', classements: [] })
      .mockResolvedValueOnce({ retireLe: new Date() });
    prisma.classementDocumentDepose.create.mockRejectedValueOnce(new Error('classement refusé : le document doc_1 est retiré.'));
    expect(await classerDocument({ ...params, categorie: 'courrier' })).toEqual({ ok: false, reason: 'document_retire' });
  });

  it('une autre erreur de la base remonte', async () => {
    prisma.documentDeposePatient.findFirst
      .mockResolvedValueOnce({ retireLe: null, categorieProposee: 'autre', classements: [] })
      .mockResolvedValueOnce({ retireLe: null });
    prisma.classementDocumentDepose.create.mockRejectedValueOnce(new Error('panne'));
    await expect(classerDocument({ ...params, categorie: 'courrier' })).rejects.toThrow('panne');
  });
});

describe('retirerDocument — contenu effacé, ligne gardée', () => {
  const params = { idPatient: 'PAT_MICHEL', idDocument: 'doc_1', praticienEmail: 'praticien@wellneuro.fr' } as const;

  it('écriture conditionnelle : contenu à NULL, auteur, motif — l’instant est posé par la base', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 1 });
    expect(await retirerDocument({ ...params, motif: 'demande_droit' })).toEqual({ ok: true });
    expect(prisma.documentDeposePatient.updateMany).toHaveBeenCalledWith({
      where: { id: 'doc_1', idPatient: 'PAT_MICHEL', retireLe: null },
      data: { contenu: null, retirePar: 'praticien@wellneuro.fr', motifRetrait: 'demande_droit' },
    });
  });

  it('déjà retiré : rien ne correspond, dit tel', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.documentDeposePatient.count.mockResolvedValueOnce(1);
    expect(await retirerDocument({ ...params, motif: 'depot_par_erreur' })).toEqual({ ok: false, reason: 'document_deja_retire' });
  });

  it('document d’un autre dossier : introuvable', async () => {
    prisma.documentDeposePatient.updateMany.mockResolvedValueOnce({ count: 0 });
    prisma.documentDeposePatient.count.mockResolvedValueOnce(0);
    expect(await retirerDocument({ ...params, motif: 'depot_par_erreur' })).toEqual({ ok: false, reason: 'document_introuvable' });
  });
});
