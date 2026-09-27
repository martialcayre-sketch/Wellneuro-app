import { beforeEach, describe, expect, it, vi } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { clesSecuriteDeLAssiette } from './securite';
import type { ContenuFicheAssiette } from './types';

const { tx, transaction } = vi.hoisted(() => {
  const tx = {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    ficheAssietteVersion: { findUnique: vi.fn(), findMany: vi.fn() },
    ficheAssietteActe: { create: vi.fn() },
  };
  return { tx, transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
});

vi.mock('@/lib/prisma', () => ({ prisma: { $transaction: transaction, $queryRaw: tx.$queryRaw } }));

import { MOTIF_MAX, poserActeFiche, type DemandeActe } from './decision';

// Texte SYNTHÉTIQUE uniquement ([[D-251]] §4). Les réserves de sécurité sont
// celles de la table signée : c'est leur présence que le rejeu contrôle.
const SECURITE = clesSecuriteDeLAssiette('ASSIETTE_PROTEINEE');
const CLAIM_FICHE = 'WN-CL-0300-002::v1.0';
const TEXTE_SOURCE = 'Un texte source synthétique, écrit pour le banc.';
const CONTENU: ContenuFicheAssiette = {
  titre: 'Titre synthétique',
  precautions: [{ texte: 'Parlez-en à votre praticien.', claims: SECURITE }],
  sections: [
    {
      titre: 'Section synthétique',
      blocs: [
        { texte: 'un texte source synthétique', provenance: { type: 'verbatim' } },
        { texte: 'Reformulation synthétique.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
      ],
    },
  ],
};
const SHA = canonicalSha256(CONTENU);
const LE = new Date('2026-09-27T10:00:00.000Z');

type Acte = { ordre: bigint; acte: string; contenuSha256: string; validateur: string; relectureIntegrale: boolean; motif: string | null; le: Date };
let courante: Record<string, unknown>;

function acte(ordre: bigint, over: Partial<Acte> = {}): Acte {
  return { ordre, acte: 'validee', contenuSha256: SHA, validateur: 'x@exemple.fr', relectureIntegrale: true, motif: null, le: LE, ...over };
}

function demande(over: Partial<DemandeActe> = {}): DemandeActe {
  return {
    idVersion: 'version0000000002',
    acte: 'validee',
    contenuSha256Vu: SHA,
    dernierActeVu: null,
    relectureIntegrale: true,
    validateur: 'praticien@exemple.fr',
    ...over,
  };
}

describe('poserActeFiche — l’acte du responsable (D-251, lot 6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    courante = {
      sourceId: 'WN-SRC-0300',
      plateCode: 'ASSIETTE_PROTEINEE',
      numero: 2,
      contenu: CONTENU,
      contenuSha256: SHA,
      texteSource: TEXTE_SOURCE,
      actes: [] as Acte[],
    };
    tx.ficheAssietteVersion.findUnique.mockImplementation(async ({ select }: { select: Record<string, unknown> }) =>
      select.contenu ? courante : { sourceId: courante.sourceId },
    );
    tx.ficheAssietteVersion.findMany.mockResolvedValue([]);
    // Le corpus simulé : tout claim demandé est VALIDE, avec un texte synthétique.
    tx.$queryRaw.mockImplementation(async (_g: unknown, ids: string[], versions: string[]) =>
      ids.map((claim_id, i) => ({ claim_id, version_claim: versions[i], texte_normalise: 'Claim synthétique.' })),
    );
    tx.ficheAssietteActe.create.mockImplementation(async ({ data }: { data: Record<string, unknown> }) => ({
      ordre: BigInt('10'),
      le: LE,
      ...data,
    }));
  });

  it('valider exige la déclaration de relecture intégrale, STRICTEMENT true — rien n’est lu sans elle', async () => {
    for (const relectureIntegrale of [undefined, false, 'true', 1]) {
      expect(await poserActeFiche(demande({ relectureIntegrale }))).toEqual({ issue: 'refusee', raison: 'relecture_requise' });
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it('retirer exige un motif non vide et borné', async () => {
    for (const motif of [undefined, '', ' \t\u00a0', 'x'.repeat(MOTIF_MAX + 1)]) {
      expect(await poserActeFiche(demande({ acte: 'retiree', motif }))).toEqual({ issue: 'refusee', raison: 'motif_requis' });
    }
    expect(transaction).not.toHaveBeenCalled();
  });

  it('version introuvable', async () => {
    tx.ficheAssietteVersion.findUnique.mockResolvedValue(null);
    expect(await poserActeFiche(demande())).toEqual({ issue: 'refusee', raison: 'version_introuvable' });
  });

  it('le verrou est pris PAR FICHE, avant la lecture de l’état', async () => {
    await poserActeFiche(demande());
    const [gabarit, cle] = tx.$executeRaw.mock.calls[0];
    expect((gabarit as string[]).join('?')).toContain('pg_advisory_xact_lock(hashtext(');
    expect(cle).toBe('fiches_assiette_actes:WN-SRC-0300');
    const lectureEtat = tx.ficheAssietteVersion.findUnique.mock.invocationCallOrder[1];
    expect(tx.$executeRaw.mock.invocationCallOrder[0]).toBeLessThan(lectureEtat);
  });

  it('un contenu qui n’est plus celui affiché : rien n’est écrit', async () => {
    expect(await poserActeFiche(demande({ contenuSha256Vu: 'b'.repeat(64) }))).toEqual({ issue: 'refusee', raison: 'empreinte_divergente' });
    expect(tx.ficheAssietteActe.create).not.toHaveBeenCalled();
  });

  it('un état qui a bougé depuis l’affichage : rien n’est écrit', async () => {
    courante.actes = [acte(BigInt('7'), { acte: 'retiree', motif: 'Motif synthétique.', relectureIntegrale: false })];
    expect(await poserActeFiche(demande({ dernierActeVu: null }))).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    expect(await poserActeFiche(demande({ dernierActeVu: '6' }))).toEqual({ issue: 'refusee', raison: 'etat_divergent' });
    expect(tx.ficheAssietteActe.create).not.toHaveBeenCalled();
  });

  it('un état illisible n’accepte aucun acte (DC-24)', async () => {
    courante.actes = [acte(BigInt('3'), { acte: 'publiee' })];
    expect(await poserActeFiche(demande({ dernierActeVu: '3' }))).toEqual({ issue: 'refusee', raison: 'etat_illisible' });
  });

  it('valider une version déjà validée, ou retirer une version déjà retirée : refusé', async () => {
    courante.actes = [acte(BigInt('4'))];
    expect(await poserActeFiche(demande({ dernierActeVu: '4' }))).toEqual({ issue: 'refusee', raison: 'deja_dans_cet_etat' });
  });

  it('valider une version plus ancienne qu’une version validée : refusé', async () => {
    tx.ficheAssietteVersion.findMany.mockResolvedValue([{ contenuSha256: SHA, actes: [acte(BigInt('5'))] }]);
    expect(await poserActeFiche(demande())).toEqual({ issue: 'refusee', raison: 'version_depassee' });
    expect(tx.ficheAssietteVersion.findMany.mock.calls[0][0].where).toEqual({ sourceId: 'WN-SRC-0300', numero: { gt: 2 } });
  });

  it('valider REJOUE les contrôles : une réserve de sécurité omise refuse l’acte (§6)', async () => {
    const sansReserve = { ...CONTENU, precautions: [] };
    courante.contenu = sansReserve;
    courante.contenuSha256 = canonicalSha256(sansReserve);
    const issue = await poserActeFiche(demande({ contenuSha256Vu: canonicalSha256(sansReserve) }));
    expect(issue.issue === 'refusee' && issue.raison).toBe('controle');
    expect(issue.issue === 'refusee' && issue.raison === 'controle' && issue.anomalies.map(a => a.code)).toContain('precaution_manquante');
    expect(tx.ficheAssietteActe.create).not.toHaveBeenCalled();
  });

  it('valider REJOUE les contrôles : un claim qui n’est plus VALIDE refuse l’acte', async () => {
    tx.$queryRaw.mockResolvedValue([]);
    const issue = await poserActeFiche(demande());
    expect(issue.issue === 'refusee' && issue.raison === 'controle' && issue.anomalies.map(a => a.code)).toContain('claim_non_valide');
  });

  it('valider REJOUE les contrôles : un JSON rangé que le contrat ne relit pas refuse l’acte', async () => {
    courante.contenu = { titre: 'Titre', precautions: [], sections: [], statut: 'valide' };
    const issue = await poserActeFiche(demande());
    expect(issue.issue === 'refusee' && issue.raison === 'controle' && issue.anomalies.map(a => a.code)).toEqual(['contenu_illisible']);
  });

  it('valider : l’acte recopie l’empreinte DE LA VERSION, le validateur de la session, la relecture déclarée', async () => {
    const issue = await poserActeFiche(demande());
    expect(tx.ficheAssietteActe.create).toHaveBeenCalledTimes(1);
    expect(tx.ficheAssietteActe.create.mock.calls[0][0].data).toEqual({
      idVersion: 'version0000000002',
      acte: 'validee',
      contenuSha256: SHA,
      validateur: 'praticien@exemple.fr',
      relectureIntegrale: true,
      motif: null,
    });
    expect(issue).toMatchObject({ issue: 'posee', acte: { ordre: '10', acte: 'validee' }, etat: { etat: 'validee', ordre: '10' } });
  });

  it('retirer : aucun contrôle — le coupe-circuit reste un geste rapide — et le motif est rangé', async () => {
    courante.actes = [acte(BigInt('4'))];
    tx.$queryRaw.mockResolvedValue([]);
    const issue = await poserActeFiche(demande({ acte: 'retiree', dernierActeVu: '4', relectureIntegrale: undefined, motif: '  Motif synthétique.  ' }));
    expect(tx.$queryRaw).not.toHaveBeenCalled();
    expect(tx.ficheAssietteActe.create.mock.calls[0][0].data).toMatchObject({ acte: 'retiree', relectureIntegrale: false, motif: 'Motif synthétique.' });
    expect(issue).toMatchObject({ issue: 'posee', etat: { etat: 'retiree', motif: 'Motif synthétique.' } });
  });

  it('une version retirée peut être revalidée, un brouillon peut être retiré', async () => {
    courante.actes = [acte(BigInt('4'), { acte: 'retiree', motif: 'Motif synthétique.', relectureIntegrale: false })];
    expect((await poserActeFiche(demande({ dernierActeVu: '4' }))).issue).toBe('posee');
    courante.actes = [];
    expect((await poserActeFiche(demande({ acte: 'retiree', motif: 'Écarté.' }))).issue).toBe('posee');
  });
});
