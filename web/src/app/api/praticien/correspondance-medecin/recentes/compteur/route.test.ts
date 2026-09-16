import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getServerSession, prisma } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  prisma: {
    $queryRaw: vi.fn(),
    correspondanceMedecin: { findMany: vi.fn(), count: vi.fn() },
    patient: { findMany: vi.fn() },
  },
}));

vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));

import { GET } from './route';

// CE QUE CE FICHIER PROUVE, ET CE QU'IL NE PROUVE PAS.
//
// La première version de ce banc prétendait éprouver la sémantique du compteur
// — « la dernière ligne du dossier décide » — en servant à un mock une liste
// DÉJÀ dédupliquée. Il simulait donc la déduplication au lieu de la prouver, et
// serait resté vert si une ligne plus ancienne du même dossier avait été
// comptée. Constat de revue de la PR #1148, retenu : il était creux.
//
// La sélection vit désormais en SQL, et c'est `prisma/checks/
// c3_correspondance_attente_v1.sql` qui l'éprouve contre un vrai PostgreSQL —
// déduplication, seuil, sens illisible, cloisonnement praticien.
//
// Ici on garde ce qu'un banc unitaire peut réellement tenir : les gardes, la
// forme de la requête, le fait que le compte remonte de la base sans être
// refiltré, et le refus de rendre un zéro qui passerait pour un fait.
function sqlDuDernierAppel(): string {
  const [gabarit] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray];
  return gabarit.join(' ? ');
}

describe('GET /api/praticien/correspondance-medecin/recentes/compteur', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ user: { email: 'p@wellneuro.fr' } });
    prisma.$queryRaw.mockResolvedValue([{ nb: 0 }]);
  });

  it('sans session : 401 et `unavailable`', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
    expect((await res.json()).unavailable).toBe(true);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('une seule requête, agrégée en base, et aucune table d’identité', async () => {
    await GET();
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
    // La correction de la revue : plus aucun `findMany` sur l'historique — le
    // rail monte deux fois par page, et la requête n'était bornée par rien.
    expect(prisma.correspondanceMedecin.findMany).not.toHaveBeenCalled();
    expect(prisma.patient.findMany).not.toHaveBeenCalled();
  });

  it('la requête porte l’e-mail du praticien et un seuil de sept jours', async () => {
    await GET();
    const [, email, seuil] = prisma.$queryRaw.mock.calls[0] as [TemplateStringsArray, string, Date];
    expect(email).toBe('p@wellneuro.fr');
    const joursEcoules = (Date.now() - seuil.getTime()) / (24 * 60 * 60 * 1000);
    expect(joursEcoules).toBeGreaterThan(6.9);
    expect(joursEcoules).toBeLessThan(7.1);
  });

  it('la requête porte les trois clauses dont dépend la sémantique', async () => {
    // GARDE DE FORME, PAS PREUVE DE SÉMANTIQUE — la preuve est le contrat SQL.
    // Elle existe parce que retirer l'une de ces clauses ne se verrait qu'en
    // T2 : ce banc-ci rougit en T1, au moment de l'édition.
    await GET();
    const sql = sqlDuDernierAppel();
    expect(sql).toContain('DISTINCT ON (id_patient)');
    expect(sql).toContain('ORDER BY id_patient, consigne_le DESC');
    expect(sql).toContain("sens = 'sortant'");
    // Ni le texte consigné ni la désignation du médecin ne sortent de la base.
    expect(sql).not.toContain('texte');
    expect(sql).not.toContain('medecin_libelle');
  });

  it('le compte remonte de la base tel quel, et le délai est servi au client', async () => {
    prisma.$queryRaw.mockResolvedValue([{ nb: 2 }]);
    const payload = await (await GET()).json();
    expect(payload.nbEnAttente).toBe(2);
    expect(payload.delaiJours).toBe(7);
  });

  it('une base qui ne rend aucune ligne compte zéro, sans casser', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    const payload = await (await GET()).json();
    expect(payload.ok).toBe(true);
    expect(payload.nbEnAttente).toBe(0);
  });

  it('une panne rend le compteur indisponible, jamais un zéro qui passerait pour un fait', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('base injoignable'));
    const res = await GET();
    const payload = await res.json();
    expect(res.status).toBe(500);
    expect(payload.unavailable).toBe(true);
    expect(payload.nbEnAttente).toBe(0);
  });
});
