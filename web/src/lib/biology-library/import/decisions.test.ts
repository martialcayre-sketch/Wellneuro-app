import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { prisma, journal } = vi.hoisted(() => {
  const journal: string[] = [];
  const prisma = {
    $executeRaw: vi.fn(async () => 1),
    $transaction: vi.fn(),
    importBiologique: { findFirst: vi.fn(), count: vi.fn() },
    compteRenduBiologique: { updateMany: vi.fn(), findUnique: vi.fn() },
    ligneBiologiqueCandidate: { findMany: vi.fn(), updateMany: vi.fn(), findFirst: vi.fn(), count: vi.fn() },
    biologyAnalyte: { findMany: vi.fn() },
    resultatBiologique: { findMany: vi.fn(), create: vi.fn(), findFirst: vi.fn() },
  };
  return { prisma, journal };
});
vi.mock('@/lib/prisma', () => ({ prisma }));

import { deciderLignes } from './decisions';

const MAINTENANT = new Date('2026-10-02T10:00:00.000Z');
const BASE = { idPatient: 'pat_sophie', idImport: 'imp_1', traitePar: 'praticien@wellneuro.fr', maintenant: MAINTENANT };
const PRELEVE = '2026-09-15T06:30:00.000Z';

const LU = new Date(PRELEVE); // 08:30 à Paris : heure lue
const MINUIT_PARIS = '2026-09-14T22:00:00.000Z'; // l'extraction n'a lu que la date
const LIGNES = [
  { id: 'l1', statut: 'proposee', valeurLue: '48', uniteLue: 'ng/mL', preleveLeLu: LU, heureLue: true },
  { id: 'l2', statut: 'proposee', valeurLue: '<0,5', uniteLue: 'mg/L', preleveLeLu: LU, heureLue: true },
  { id: 'l3', statut: 'proposee', valeurLue: '3,1', uniteLue: 'mg/dL', preleveLeLu: LU, heureLue: true },
  { id: 'l4', statut: 'validee', valeurLue: '12', uniteLue: 'mg/L', preleveLeLu: LU, heureLue: true },
  { id: 'l5', statut: 'proposee', valeurLue: '50', uniteLue: 'ng/mL', preleveLeLu: new Date(MINUIT_PARIS), heureLue: false },
  { id: 'l6', statut: 'proposee', valeurLue: '52', uniteLue: 'ng/mL', preleveLeLu: null, heureLue: false },
  // « 00:00 » IMPRIMÉ sur le compte rendu ([[D-258]], `heure_lue`).
  { id: 'l7', statut: 'proposee', valeurLue: '53', uniteLue: 'ng/mL', preleveLeLu: new Date(MINUIT_PARIS), heureLue: true },
];
const ANALYTES = [
  { code: 'BIO_FERRITINE', unite: 'ng/mL', actif: true },
  { code: 'BIO_CRP_US', unite: 'mg/L', actif: true },
];

const valider = (idLigne: string, patch: Record<string, unknown> = {}) => ({
  idLigne, decision: 'valider', analyteCode: 'BIO_FERRITINE', valeur: 48, preleveLe: PRELEVE, ...patch,
});

let espions: Array<ReturnType<typeof vi.spyOn>>;
let courante = 'imp_1';
/** Lignes encore proposées dans l'extraction APRÈS les décisions — 0 déclenche la purge. */
let restantes = 1;

beforeEach(() => {
  journal.length = 0;
  // Deux lectures : l'extraction désignée, puis la COURANTE du compte rendu (`statut: { not: 'echec' }`).
  prisma.importBiologique.findFirst.mockImplementation(async ({ where }: { where: { statut?: unknown } }) =>
    (where.statut ? { id: courante } : { statut: 'extrait', idCompteRendu: 'cr_1' }));
  courante = 'imp_1';
  prisma.ligneBiologiqueCandidate.findMany.mockImplementation(async ({ where }: { where: { id: { in: string[] } } }) =>
    LIGNES.filter(l => where.id.in.includes(l.id)));
  prisma.biologyAnalyte.findMany.mockResolvedValue(ANALYTES);
  prisma.resultatBiologique.findMany.mockResolvedValue([]);
  prisma.resultatBiologique.create.mockImplementation(async () => {
    journal.push('resultat.create');
    return { id: 'res_1' };
  });
  prisma.ligneBiologiqueCandidate.updateMany.mockImplementation(async () => {
    journal.push('ligne.updateMany');
    return { count: 1 };
  });
  restantes = 1;
  prisma.ligneBiologiqueCandidate.count.mockImplementation(async ({ where }: { where: { id?: { in: string[] } } }) =>
    (where.id ? where.id.in.length : restantes));
  prisma.importBiologique.count.mockResolvedValue(0);
  prisma.compteRenduBiologique.updateMany.mockImplementation(async () => {
    journal.push('compteRendu.purge');
    return { count: 1 };
  });
  prisma.compteRenduBiologique.findUnique.mockResolvedValue({ motifPurge: null });
  prisma.$transaction.mockImplementation(async (cb: (tx: typeof prisma) => unknown) => cb(prisma));
  espions = (['error', 'warn', 'log'] as const).map(m => vi.spyOn(console, m).mockImplementation(() => {}));
});

afterEach(() => {
  vi.clearAllMocks();
  for (const e of espions) e.mockRestore();
});

describe('deciderLignes — aucune écriture sans geste', () => {
  it('une liste vide ou absente rend 400, sans rien écrire', async () => {
    for (const decisions of [[], undefined, 'x']) {
      expect(await deciderLignes({ ...BASE, decisions })).toMatchObject({ ok: false, reason: 'decisions_vides', status: 400 });
    }
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('une extraction pas encore terminée ne se décide pas', async () => {
    prisma.importBiologique.findFirst.mockResolvedValueOnce({ statut: 'en_cours', idCompteRendu: 'cr_1' });
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, reason: 'import_non_extrait', status: 409 });
  });

  it('une extraction d’un autre dossier est introuvable — les lectures filtrent par dossier', async () => {
    await deciderLignes({ ...BASE, decisions: [valider('l1')] });
    expect(prisma.importBiologique.findFirst.mock.calls[0][0].where).toEqual({ id: 'imp_1', idPatient: 'pat_sophie' });
    expect(prisma.ligneBiologiqueCandidate.findMany.mock.calls[0][0].where)
      .toMatchObject({ idImport: 'imp_1', idPatient: 'pat_sophie' });
    vi.clearAllMocks();
    prisma.importBiologique.findFirst.mockResolvedValueOnce(null);
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, reason: 'import_introuvable', status: 404 });
  });
});

describe('deciderLignes — seule l’extraction courante se décide (arbitrage du 2026-10-02)', () => {
  it('une extraction remplacée par une plus récente est refusée, sans transaction', async () => {
    courante = 'imp_2';
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, reason: 'import_remplace', status: 409 });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('une ré-extraction lancée pendant le préflight est vue sous le verrou, rien n’est écrit', async () => {
    prisma.$transaction.mockImplementationOnce(async (cb: (tx: typeof prisma) => unknown) => {
      courante = 'imp_2';
      return cb(prisma);
    });
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, reason: 'import_remplace', status: 409 });
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
  });

  it('la courante est la plus récente qui n’a pas échoué', async () => {
    await deciderLignes({ ...BASE, decisions: [valider('l1')] });
    expect(prisma.importBiologique.findFirst).toHaveBeenCalledWith({
      where: { idCompteRendu: 'cr_1', idPatient: 'pat_sophie', statut: { not: 'echec' } },
      orderBy: { lanceLe: 'desc' },
      select: { id: true },
    });
  });
});

describe('deciderLignes — valider crée le résultat, PUIS décide la ligne', () => {
  it('crée le résultat SANS saisiLe, source saisie_praticien, unité du catalogue', async () => {
    const issue = await deciderLignes({ ...BASE, decisions: [valider('l1', { valeur: 47.5 })] });
    expect(issue).toEqual({ ok: true, validees: 1, ecartees: 0, documentPurge: false });
    const { data } = prisma.resultatBiologique.create.mock.calls[0][0];
    expect(data).toEqual({
      idPatient: 'pat_sophie',
      analyteCode: 'BIO_FERRITINE',
      valeur: 47.5,
      unite: 'ng/mL',
      preleveLe: new Date(PRELEVE),
      source: 'saisie_praticien',
      saisiPar: 'praticien@wellneuro.fr',
      supersedesResultatId: null,
    });
    expect(data).not.toHaveProperty('saisiLe');
    expect(journal).toEqual(['resultat.create', 'ligne.updateMany']);
    expect(prisma.ligneBiologiqueCandidate.updateMany).toHaveBeenCalledWith({
      where: { id: 'l1', idImport: 'imp_1', idPatient: 'pat_sophie', statut: 'proposee' },
      data: { statut: 'validee', idResultat: 'res_1', traitePar: 'praticien@wellneuro.fr' },
    });
  });

  it('écarte avec le motif confirmé par le praticien', async () => {
    const issue = await deciderLignes({ ...BASE, decisions: [{ idLigne: 'l2', decision: 'ecarter', motif: 'non_quantitative' }] });
    expect(issue).toEqual({ ok: true, validees: 0, ecartees: 1, documentPurge: false });
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
    expect(prisma.ligneBiologiqueCandidate.updateMany).toHaveBeenCalledWith({
      where: { id: 'l2', idImport: 'imp_1', idPatient: 'pat_sophie', statut: 'proposee' },
      data: { statut: 'ecartee', motifEcart: 'non_quantitative', traitePar: 'praticien@wellneuro.fr' },
    });
  });

  it('un motif d’écart hors liste est refusé', async () => {
    expect(await deciderLignes({ ...BASE, decisions: [{ idLigne: 'l2', decision: 'ecarter', motif: 'basse' }] }))
      .toMatchObject({ ok: false, status: 400, lignes: [{ idLigne: 'l2', reason: 'motif_invalide' }] });
  });
});

describe('deciderLignes — refus du préflight, tout ou rien', () => {
  it('une ligne LUE non quantitative est refusée, même si le praticien tape un nombre', async () => {
    const issue = await deciderLignes({ ...BASE, decisions: [valider('l2', { analyteCode: 'BIO_CRP_US', valeur: 0.4 })] });
    expect(issue).toMatchObject({ ok: false, status: 409, lignes: [{ idLigne: 'l2', reason: 'non_quantitative' }] });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('une unité divergente est refusée, sans conversion ni transaction', async () => {
    const issue = await deciderLignes({ ...BASE, decisions: [valider('l3', { analyteCode: 'BIO_CRP_US', valeur: 3.1 })] });
    expect(issue).toMatchObject({ ok: false, status: 409, lignes: [{ idLigne: 'l3', reason: 'unite_divergente' }] });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('une ligne valide et une refusée : RIEN n’est écrit', async () => {
    const issue = await deciderLignes({ ...BASE, decisions: [valider('l1'), valider('l3', { analyteCode: 'BIO_CRP_US' })] });
    expect(issue).toMatchObject({ ok: false, reason: 'lignes_invalides' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('une ligne déjà décidée, absente ou en double est refusée', async () => {
    const issue = await deciderLignes({
      ...BASE,
      decisions: [valider('l4'), valider('inconnue'), { idLigne: 'l2', decision: 'ecarter', motif: 'non_quantitative' },
        { idLigne: 'l2', decision: 'ecarter', motif: 'non_quantitative' }, {}],
    });
    expect(issue).toMatchObject({ ok: false, status: 400 });
    if (issue.ok) throw new Error('attendu un refus');
    expect(issue.lignes?.map(l => [l.index, l.reason])).toEqual([
      [0, 'ligne_deja_traitee'], [1, 'ligne_introuvable'], [3, 'ligne_en_double'], [4, 'ligne_absente'],
    ]);
  });

  it('HEURE NON LUE : un minuit de Paris renvoyé tel quel est refusé, sans transaction', async () => {
    const issue = await deciderLignes({
      ...BASE,
      decisions: [valider('l5', { preleveLe: MINUIT_PARIS }), valider('l6', { preleveLe: MINUIT_PARIS })],
    });
    expect(issue).toMatchObject({ ok: false, status: 400 });
    if (issue.ok) throw new Error('attendu un refus');
    expect(issue.lignes?.map(l => [l.idLigne, l.reason])).toEqual([['l5', 'heure_absente'], ['l6', 'heure_absente']]);
    expect(issue.lignes?.[0].error).toBe('L’heure du prélèvement n’a pas été lue : saisissez-la.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('HEURE NON LUE puis saisie : acceptée', async () => {
    expect(await deciderLignes({ ...BASE, decisions: [valider('l5', { preleveLe: '2026-09-15T05:45:00.000Z' })] }))
      .toMatchObject({ ok: true, validees: 1 });
  });

  it('HEURE LUE à 08:30, corrigée en minuit : elle passe', async () => {
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1', { preleveLe: MINUIT_PARIS })] }))
      .toMatchObject({ ok: true, validees: 1 });
  });

  it('« 00:00 » IMPRIMÉ (heure lue, D-258) : le minuit lu passe tel quel', async () => {
    expect(await deciderLignes({ ...BASE, decisions: [valider('l7', { preleveLe: MINUIT_PARIS })] }))
      .toMatchObject({ ok: true, validees: 1 });
  });

  it('une mesure déjà au dossier au même horodatage est refusée au préflight', async () => {
    prisma.resultatBiologique.findMany.mockResolvedValueOnce([{ analyteCode: 'BIO_FERRITINE', preleveLe: new Date(PRELEVE) }]);
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, status: 409, lignes: [{ reason: 'doublon_mesure' }] });
  });
});

describe('deciderLignes — courses entre le préflight et l’écriture', () => {
  it('SAISIE INTERCALÉE : le P2002 se rend tel quel, sans repli, la ligne reste proposée', async () => {
    // Le préflight ne voit rien ; une saisie manuelle prend la clé juste avant l'écriture.
    prisma.resultatBiologique.create.mockRejectedValueOnce(Object.assign(new Error('unique'), { code: 'P2002' }));
    const issue = await deciderLignes({ ...BASE, decisions: [valider('l1')] });
    expect(issue).toMatchObject({ ok: false, reason: 'doublon_mesure', status: 409 });
    expect(prisma.ligneBiologiqueCandidate.updateMany).not.toHaveBeenCalled();
    // Aucun repli : le résultat existant n'est ni relu, ni rattaché.
    expect(prisma.resultatBiologique.findFirst).not.toHaveBeenCalled();
    expect(prisma.ligneBiologiqueCandidate.findFirst).not.toHaveBeenCalled();
  });

  it('DEUX VALIDATIONS CONCURRENTES : la seconde, relue sous le verrou, rend `ligne_deja_traitee` (revue, P2-9)', async () => {
    prisma.ligneBiologiqueCandidate.count.mockResolvedValueOnce(0);
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, reason: 'ligne_deja_traitee', status: 409 });
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
  });

  it('une ligne décidée entre-temps rend `ligne_deja_traitee` et annule tout', async () => {
    prisma.ligneBiologiqueCandidate.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, reason: 'ligne_deja_traitee', status: 409 });
  });

  it('une panne ne journalise ni valeur, ni identifiant, ni message', async () => {
    prisma.resultatBiologique.create.mockRejectedValueOnce(
      Object.assign(new Error('valeur 48 pat_sophie'), { code: 'P2010' }),
    );
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] })).toMatchObject({ ok: false, status: 500 });
    const ecrit = JSON.stringify(espions.flatMap(e => e.mock.calls));
    expect(ecrit).toContain('P2010');
    for (const interdit of ['48', 'pat_sophie', 'BIO_FERRITINE']) expect(ecrit).not.toContain(interdit);
  });
});

describe('deciderLignes — document écarté (D-269 §3)', () => {
  it('une validation est refusée en clair (409), relue sous le verrou ; rien n’est écrit', async () => {
    prisma.compteRenduBiologique.findUnique.mockResolvedValue({ motifPurge: 'ecarte' });
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toMatchObject({ ok: false, reason: 'document_ecarte', status: 409 });
    expect(prisma.resultatBiologique.create).not.toHaveBeenCalled();
    expect(journal).not.toContain('ligne.updateMany');
  });

  it('les lignes d’un document écarté s’écartent encore', async () => {
    prisma.compteRenduBiologique.findUnique.mockResolvedValue({ motifPurge: 'ecarte' });
    expect(await deciderLignes({ ...BASE, decisions: [{ idLigne: 'l2', decision: 'ecarter', motif: 'ecartee_par_praticien' }] }))
      .toMatchObject({ ok: true, ecartees: 1 });
  });
});

describe('deciderLignes — la dernière décision purge le document (D-258)', () => {
  it('plus aucune ligne proposée : le document est purgé APRÈS les décisions, dans la même transaction', async () => {
    restantes = 0;
    const issue = await deciderLignes({ ...BASE, decisions: [valider('l1')] });
    expect(issue).toEqual({ ok: true, validees: 1, ecartees: 0, documentPurge: true });
    expect(journal).toEqual(['resultat.create', 'ligne.updateMany', 'compteRendu.purge']);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.ligneBiologiqueCandidate.count).toHaveBeenLastCalledWith({ where: { idImport: 'imp_1', statut: 'proposee' } });
    expect(prisma.importBiologique.count).toHaveBeenCalledWith({ where: { idCompteRendu: 'cr_1', statut: 'en_cours' } });
    expect(prisma.compteRenduBiologique.updateMany).toHaveBeenCalledWith({
      where: { id: 'cr_1', contenu: { not: null } },
      data: { contenu: null, motifPurge: 'lignes_decidees' },
    });
  });

  it('une ligne encore proposée : aucune purge tentée', async () => {
    const issue = await deciderLignes({ ...BASE, decisions: [valider('l1')] });
    expect(issue).toMatchObject({ ok: true, documentPurge: false });
    expect(prisma.compteRenduBiologique.updateMany).not.toHaveBeenCalled();
  });

  it('une extraction en cours : aucune purge tentée — la base la refuserait, et les décisions avec', async () => {
    restantes = 0;
    prisma.importBiologique.count.mockResolvedValueOnce(1);
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] })).toMatchObject({ ok: true, documentPurge: false });
    expect(prisma.compteRenduBiologique.updateMany).not.toHaveBeenCalled();
  });

  it('un document déjà purgé à l’échéance n’est pas retouché : les décisions passent', async () => {
    restantes = 0;
    prisma.compteRenduBiologique.updateMany.mockResolvedValueOnce({ count: 0 });
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] }))
      .toEqual({ ok: true, validees: 1, ecartees: 0, documentPurge: false });
  });

  it('un refus inattendu de la base annule tout : rien n’est dit enregistré', async () => {
    restantes = 0;
    prisma.compteRenduBiologique.updateMany.mockRejectedValueOnce(Object.assign(new Error('purge refusée'), { code: 'P2010' }));
    expect(await deciderLignes({ ...BASE, decisions: [valider('l1')] })).toMatchObject({ ok: false, status: 500 });
  });
});
