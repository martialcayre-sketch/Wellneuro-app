import { beforeEach, describe, expect, it, vi } from 'vitest';

// Test d'autorisation (exig. 7 G-TRUST-04, lot A5) — PRATICIEN SEUL. La route
// porte quatre méthodes (GET/POST/PATCH/DELETE) ; toutes refusent sans session.
//
// Depuis le LOT-03, ce fichier porte aussi le garde du PACK DE BASE (le pack
// `parDefaut`, seul chemin de résolution de `resoudrePackBase`) et le garde des
// instruments suspendus. Le harnais suit le patron de `packs/assign/route.test.ts`.
const { getServerSession, prisma, syncPackToRegistry } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  syncPackToRegistry: vi.fn(),
  prisma: {
    pack: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));
vi.mock('next-auth', () => ({ getServerSession }));
vi.mock('@/lib/auth', () => ({ authOptions: {} }));
vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/ids', () => ({ createPublicId: (prefix: string) => `${prefix}_TEST_12345678` }));
// La synchro du registre n'est pas l'objet de ces tests : on la mocke plutôt
// que de stuber les modèles qu'elle touche.
vi.mock('@/lib/consultation/packRegistry', () => ({ syncPackToRegistry }));

import { GET, POST, PATCH, DELETE } from './route';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { IDS_SUSPENDUS } from '@/lib/questionnaires-catalog';

// `IDS_SUSPENDUS` est DÉRIVÉ du catalogue (`filter(q => !q.actif)`) : on n'y
// code aucun identifiant en dur, il bouge avec les arbitrages cliniques et avec
// un drapeau d'environnement. On prend le premier suspendu qui porte aussi une
// définition de scoring — sans quoi `normaliserQids` l'écarterait avant le
// garde, et le test passerait pour une mauvaise raison.
const catalogueScoring = QUESTIONNAIRE_CATALOGUE as Record<string, unknown>;
const QID_SUSPENDU = Array.from(IDS_SUSPENDUS).find(id => catalogueScoring[id]) as string;
const QID_ACTIF = 'Q_NEU_03';

type PackRow = {
  idPack: string;
  nom: string;
  thematique: string | null;
  description: string | null;
  qids: string[];
  actif: boolean;
  parDefaut: boolean;
};

// Aucun identifiant de production : le garde se fonde sur `parDefaut`, jamais
// sur un `idPack`. Le seed local et la production en posent de différents.
const ID_BASE = 'PACK_TEST_BASE';
const ID_AUTRE = 'PACK_TEST_AUTRE';
const ID_INACTIF = 'PACK_TEST_INACTIF';
const ID_AVEC_SUSPENDU = 'PACK_TEST_SUSPENDU';

let store: Map<string, PackRow>;

// Reproduit les défauts du schéma pour un `pack.create` : ce que la route
// n'écrit pas, la base le pose. `parDefaut` en fait partie — c'est ce que le
// cas 12 vérifie.
function ligneCreee(data: Partial<PackRow> & { idPack: string }): PackRow {
  return {
    idPack: data.idPack,
    nom: data.nom ?? '',
    thematique: data.thematique ?? null,
    description: data.description ?? null,
    qids: data.qids ?? [],
    actif: data.actif ?? true,
    parDefaut: data.parDefaut ?? false,
  };
}

function seed(): void {
  store = new Map<string, PackRow>([
    [ID_BASE, { idPack: ID_BASE, nom: 'Base de consultation', thematique: null, description: null, qids: [QID_ACTIF], actif: true, parDefaut: true }],
    [ID_AUTRE, { idPack: ID_AUTRE, nom: 'Pack thématique', thematique: null, description: null, qids: [QID_ACTIF], actif: true, parDefaut: false }],
    [ID_INACTIF, { idPack: ID_INACTIF, nom: 'Pack retiré', thematique: null, description: null, qids: [QID_ACTIF], actif: false, parDefaut: false }],
    [ID_AVEC_SUSPENDU, { idPack: ID_AVEC_SUSPENDU, nom: 'Pack hérité', thematique: null, description: null, qids: [QID_ACTIF, QID_SUSPENDU], actif: true, parDefaut: false }],
  ]);
}

function patch(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/praticien/packs', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function post(body: Record<string, unknown>): Request {
  return new Request('http://localhost/api/praticien/packs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function del(idPack: string): Request {
  return new Request(`http://localhost/api/praticien/packs?idPack=${encodeURIComponent(idPack)}`, {
    method: 'DELETE',
  });
}

function req(method: string): Request {
  return new Request('http://localhost/api/praticien/packs', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  });
}

describe('/api/praticien/packs — autorisation', () => {
  it('GET sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('POST/PATCH/DELETE sans session : 401', async () => {
    getServerSession.mockResolvedValue(null);
    for (const [m, handler] of [['POST', POST], ['PATCH', PATCH], ['DELETE', DELETE]] as const) {
      const res = await handler(req(m));
      expect(res.status).toBe(401);
    }
  });
});

describe('/api/praticien/packs — garde du pack de base', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    syncPackToRegistry.mockResolvedValue(undefined);
    prisma.pack.findUnique.mockImplementation(
      async ({ where }: { where: { idPack: string } }) => store.get(where.idPack) ?? null,
    );
    prisma.pack.update.mockImplementation(
      async ({ where, data }: { where: { idPack: string }; data: Partial<PackRow> }) => {
        const ligne = { ...(store.get(where.idPack) as PackRow), ...data };
        store.set(where.idPack, ligne);
        return ligne;
      },
    );
    prisma.pack.updateMany.mockImplementation(
      async ({ where, data }: { where: { parDefaut?: boolean; NOT?: { idPack: string } }; data: Partial<PackRow> }) => {
        let count = 0;
        for (const [id, ligne] of store) {
          if (where.parDefaut !== undefined && ligne.parDefaut !== where.parDefaut) continue;
          if (where.NOT && where.NOT.idPack === id) continue;
          store.set(id, { ...ligne, ...data });
          count += 1;
        }
        return { count };
      },
    );
    prisma.pack.create.mockImplementation(async ({ data }: { data: Partial<PackRow> & { idPack: string } }) => {
      const ligne = ligneCreee(data);
      store.set(ligne.idPack, ligne);
      return ligne;
    });
    // Transaction interactive : le callback reçoit le client mocké lui-même.
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  });

  // ── Cas de casse : 409, et surtout AUCUNE transaction ouverte ──────────────

  it('1. DELETE sur le pack de base : 409, transaction jamais ouverte', async () => {
    const res = await DELETE(del(ID_BASE));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('default_pack_protected');
    expect(json.error).toMatch(/pack de base/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(store.get(ID_BASE)?.actif).toBe(true);
  });

  it('2. PATCH { actif: false } sur le pack de base : 409, et le message ne conseille pas de le réactiver', async () => {
    const res = await PATCH(patch({ idPack: ID_BASE, actif: false }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('default_pack_protected');
    // Le pack est ACTIF : lui conseiller de le réactiver serait un contresens,
    // et aucun écran n'offre ce geste. Le message doit nommer le seul geste
    // possible — désigner un autre pack actif comme pack de base.
    expect(json.error).not.toMatch(/réactivez/i);
    expect(json.error).toMatch(/un autre pack actif/i);
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(store.get(ID_BASE)?.actif).toBe(true);
  });

  it('3. PATCH { parDefaut: false } sur le pack de base — le bouton « Retirer par défaut » : 409', async () => {
    const res = await PATCH(patch({ idPack: ID_BASE, parDefaut: false }));
    expect(res.status).toBe(409);
    expect((await res.json()).reason).toBe('default_pack_protected');
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(store.get(ID_BASE)?.parDefaut).toBe(true);
  });

  it('4. PATCH { autre, parDefaut: true, actif: false } : 409 AVANT toute démarcation', async () => {
    const res = await PATCH(patch({ idPack: ID_AUTRE, parDefaut: true, actif: false }));
    expect(res.status).toBe(409);
    // L'assertion qui compte : le garde tombe avant `updateMany`, donc l'ancien
    // porteur n'a pas été démarqué au passage.
    expect(prisma.pack.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(store.get(ID_BASE)?.parDefaut).toBe(true);
  });

  it('5. PATCH { inactif, parDefaut: true } SANS champ `actif` : 409 (héritage de l’état stocké)', async () => {
    // Le cas qui échoue si le prédicat lit le payload : rien dans le payload ne
    // dit `actif: false`, c'est l'état stocké qui l'apporte.
    const res = await PATCH(patch({ idPack: ID_INACTIF, parDefaut: true }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('default_pack_protected');
    // Ici, et ici seulement, le pack visé est bien inactif : le message doit le
    // dire, au lieu de reprendre celui du porteur actif.
    expect(json.error).toMatch(/désactivé/i);
    expect(prisma.pack.updateMany).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('6. PATCH { nom, parDefaut: false } sur le pack de base : 409 et le nom n’est pas écrit', async () => {
    const res = await PATCH(patch({ idPack: ID_BASE, nom: 'Renommé', parDefaut: false }));
    expect(res.status).toBe(409);
    expect(prisma.pack.update).not.toHaveBeenCalled();
    expect(store.get(ID_BASE)?.nom).toBe('Base de consultation');
  });

  // ── Non-régression : ce que le garde ne doit PAS fermer ────────────────────

  it('7. PATCH { actif: true } sur un pack inactif : 200 — le chemin de secours reste ouvert', async () => {
    const res = await PATCH(patch({ idPack: ID_INACTIF, actif: true }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(store.get(ID_INACTIF)?.actif).toBe(true);
  });

  it('8. PATCH { parDefaut: true } sur un autre pack ACTIF : 200 et démarcation de l’ancien porteur', async () => {
    const res = await PATCH(patch({ idPack: ID_AUTRE, parDefaut: true }));
    expect(res.status).toBe(200);
    expect(prisma.pack.updateMany).toHaveBeenCalledWith({
      where: { parDefaut: true, NOT: { idPack: ID_AUTRE } },
      data: { parDefaut: false },
    });
    expect(store.get(ID_AUTRE)?.parDefaut).toBe(true);
    expect(store.get(ID_BASE)?.parDefaut).toBe(false);
  });

  it('9. DELETE sur un pack actif non-parDefaut : 200', async () => {
    const res = await DELETE(del(ID_AUTRE));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(store.get(ID_AUTRE)?.actif).toBe(false);
  });

  it('10. PATCH { nom, qids } sur le pack de base, sans toucher aux drapeaux : 200', async () => {
    const res = await PATCH(patch({ idPack: ID_BASE, nom: 'Base 2026', qids: [QID_ACTIF] }));
    expect(res.status).toBe(200);
    expect(store.get(ID_BASE)?.nom).toBe('Base 2026');
    expect(store.get(ID_BASE)?.parDefaut).toBe(true);
  });

  it('11. DELETE sur un idPack inconnu : 404 — l’ordre des contrôles est inchangé', async () => {
    const res = await DELETE(del('PACK_TEST_INCONNU'));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('not_found');
  });

  it('12. POST : le pack créé n’est jamais parDefaut', async () => {
    const res = await POST(post({ nom: 'Nouveau pack', qids: [QID_ACTIF] }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    const data = prisma.pack.create.mock.calls[0][0].data as Partial<PackRow>;
    expect(data.parDefaut).toBeUndefined();
    expect(store.get('PACK_TEST_12345678')?.parDefaut).toBe(false);
  });

  it('13. séquentiel : le garde suit la marque et libère l’ancien porteur', async () => {
    // a) On transfère la marque sur un autre pack actif.
    expect((await PATCH(patch({ idPack: ID_AUTRE, parDefaut: true }))).status).toBe(200);
    // b) Le nouveau porteur est désormais protégé.
    expect((await DELETE(del(ID_AUTRE))).status).toBe(409);
    // c) L'ancien porteur, démarqué, redevient désactivable.
    expect((await DELETE(del(ID_BASE))).status).toBe(200);
    expect(store.get(ID_BASE)?.actif).toBe(false);
    expect(store.get(ID_AUTRE)?.actif).toBe(true);
  });
});

describe('/api/praticien/packs — instruments suspendus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    seed();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
    syncPackToRegistry.mockResolvedValue(undefined);
    prisma.pack.findUnique.mockImplementation(
      async ({ where }: { where: { idPack: string } }) => store.get(where.idPack) ?? null,
    );
    prisma.pack.update.mockImplementation(
      async ({ where, data }: { where: { idPack: string }; data: Partial<PackRow> }) => {
        const ligne = { ...(store.get(where.idPack) as PackRow), ...data };
        store.set(where.idPack, ligne);
        return ligne;
      },
    );
    prisma.pack.updateMany.mockResolvedValue({ count: 0 });
    prisma.pack.create.mockImplementation(
      async ({ data }: { data: Partial<PackRow> & { idPack: string } }) => ligneCreee(data),
    );
    prisma.$transaction.mockImplementation((fn: (tx: typeof prisma) => Promise<unknown>) => fn(prisma));
  });

  // 409 et non 400 : même statut que les deux autres refus pour instrument
  // suspendu du dépôt (`praticien/assignations`, `patient/submit`). Le payload
  // est bien formé ; c'est le retrait de l'instrument qui interdit la saisie.
  it('14. POST avec un qid suspendu : 409, message nommant le qid', async () => {
    const res = await POST(post({ nom: 'Pack fautif', qids: [QID_ACTIF, QID_SUSPENDU] }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('questionnaire_suspendu');
    expect(json.error).toContain(QID_SUSPENDU);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("15. PATCH qui AJOUTE un qid suspendu absent du pack : 409", async () => {
    // Le pendant du cas 16 : tolérer un suspendu hérité ne doit pas ouvrir la
    // porte à un ajout. Sans ce cas, « ne refuser que les qids ajoutés »
    // pourrait dégénérer en « ne rien refuser » sans qu'aucun banc ne bouge.
    const res = await PATCH(patch({ idPack: ID_AUTRE, qids: [QID_ACTIF, QID_SUSPENDU] }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('questionnaire_suspendu');
    expect(json.error).toContain(QID_SUSPENDU);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("16. PATCH avec le payload RÉEL de l'écran sur un pack portant déjà un suspendu : accepté", async () => {
    // Le payload que l'écran d'édition émet vraiment : `PacksPanel` charge
    // `pack.qids` EN ENTIER (suspendus compris) et ne rend de case à cocher que
    // pour les instruments actifs — le suspendu revient donc toujours dans la
    // requête, sans qu'aucun geste ne permette de l'enlever.
    //
    // Un test qui renommerait sans envoyer `qids` passerait au vert sur un code
    // qui verrouille le pack en production : c'est ce que faisait la première
    // rédaction de ce cas.
    const res = await PATCH(
      patch({ idPack: ID_AVEC_SUSPENDU, nom: 'Pack hérité 2026', qids: [QID_ACTIF, QID_SUSPENDU] })
    );
    expect(res.status).toBe(200);
    expect(store.get(ID_AVEC_SUSPENDU)?.nom).toBe('Pack hérité 2026');
    expect(store.get(ID_AVEC_SUSPENDU)?.qids).toContain(QID_SUSPENDU);
  });

  it('16 bis. PATCH sur un idPack inconnu portant un qid suspendu : 404, pas 409', async () => {
    // L'ordre des contrôles : l'existence se juge avant la composition.
    const res = await PATCH(patch({ idPack: 'PACK_TEST_INCONNU', qids: [QID_ACTIF, QID_SUSPENDU] }));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('not_found');
  });

  it('17. PATCH { idPack: base, qids: [] } : 400 invalid_payload, findUnique jamais appelé', async () => {
    const res = await PATCH(patch({ idPack: ID_BASE, qids: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).reason).toBe('invalid_payload');
    // Verrouille l'ordre des contrôles : la validation de payload passe avant
    // toute lecture. Documente au passage que le pack de base ne peut pas être
    // vidé de ses qids.
    expect(prisma.pack.findUnique).not.toHaveBeenCalled();
  });
});
