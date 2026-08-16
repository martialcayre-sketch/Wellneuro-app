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
    // Depuis le LOT-03, `DELETE` ne passe plus par `syncPackToRegistry` : il ne
    // propage que `actif` au miroir. Voir le cas 20.
    questionnairePack: {
      updateMany: vi.fn(),
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
//
// MAIS on garde le MODULE RÉEL pour tout le reste — `QidsSansDefinitionError`
// en particulier. La route la reconnaît par `instanceof` : une classe factice
// rendrait le test vert sur un `instanceof` qui ne serait pas celui de la
// production, et le garde du LOT-03 ne serait pas éprouvé.
vi.mock('@/lib/consultation/packRegistry', async () => {
  const actual = await vi.importActual<typeof import('@/lib/consultation/packRegistry')>(
    '@/lib/consultation/packRegistry',
  );
  return { ...actual, syncPackToRegistry };
});

import { GET, POST, PATCH, DELETE } from './route';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { IDS_SUSPENDUS, QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import { QidsSansDefinitionError } from '@/lib/consultation/packRegistry';
import { logger } from '@/lib/observability/logger';

// `IDS_SUSPENDUS` est DÉRIVÉ du catalogue (`filter(q => !q.actif)`) : on n'y
// code aucun identifiant en dur, il bouge avec les arbitrages cliniques et avec
// un drapeau d'environnement. On prend le premier suspendu qui porte aussi une
// définition de scoring — sans quoi `normaliserQids` l'écarterait avant le
// garde, et le test passerait pour une mauvaise raison.
const catalogueScoring = QUESTIONNAIRE_CATALOGUE as Record<string, unknown>;
const QID_SUSPENDU = Array.from(IDS_SUSPENDUS).find(id => catalogueScoring[id]) as string;
const QID_ACTIF = 'Q_NEU_03';

// L'ÉCART ENTRE LES DEUX CATALOGUES, dérivé et non codé en dur : un qid que le
// scoring connaît et que l'écran ne montre pas. `Q_NEU_12` est le cas réel
// (`backfillQuestionnaireRegistry.ts`, EXTRA_DEFINITIONS), mais le prendre
// nommément figerait le test sur un état du catalogue.
const catalogueEcran = new Set(QUESTIONNAIRES_CATALOG.map(q => q.id));
const QID_HORS_ECRAN = Object.keys(catalogueScoring).find(id => !catalogueEcran.has(id)) as string;

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

  it("16 ter. PATCH qui RETIRE un qid suspendu déjà présent : 200, et le qid a disparu", async () => {
    // Le geste que l'écran d'édition rend enfin possible : décocher un
    // instrument suspendu hérité. La route l'accepte DÉJÀ — elle ne juge que
    // les qids ajoutés (`ajoutes`) — mais rien ne l'épinglait : durcir le garde
    // en « aucun suspendu dans le payload » aurait verrouillé ces packs à
    // jamais sans qu'un seul test bouge.
    const res = await PATCH(patch({ idPack: ID_AVEC_SUSPENDU, qids: [QID_ACTIF] }));
    expect(res.status).toBe(200);
    expect(store.get(ID_AVEC_SUSPENDU)?.qids).toEqual([QID_ACTIF]);
    expect(store.get(ID_AVEC_SUSPENDU)?.qids).not.toContain(QID_SUSPENDU);
  });

  it('16 bis. PATCH sur un idPack inconnu portant un qid suspendu : 404, pas 409', async () => {
    // L'ordre des contrôles : l'existence se juge avant la composition.
    const res = await PATCH(patch({ idPack: 'PACK_TEST_INCONNU', qids: [QID_ACTIF, QID_SUSPENDU] }));
    expect(res.status).toBe(404);
    expect((await res.json()).reason).toBe('not_found');
  });

  // ── Instruments de consultation ([[D-066]], revue finding B3) ──────────────
  //
  // C'est CE refus qui rend structurel l'invariant de la décision : « un
  // instrument de consultation s'assigne par geste praticien, jamais par envoi
  // de routine ». Le MMSE est ACTIF depuis D-066 — le refus « suspendu » ne le
  // voit plus, et sans celui-ci, il entrait dans n'importe quel pack, pack de
  // base de l'onboarding compris : envoyé à CHAQUE nouveau patient.
  it("26. POST avec un instrument de consultation ACTIF : 409, motif dédié", async () => {
    const res = await POST(post({ nom: 'Pack fautif', qids: [QID_ACTIF, 'Q_GEO_04'] }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('questionnaire_consultation');
    expect(json.error).toContain('Q_GEO_04');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("27. PATCH qui AJOUTE un instrument de consultation : 409, même motif", async () => {
    const res = await PATCH(patch({ idPack: ID_AUTRE, qids: [QID_ACTIF, 'Q_NEU_06'] }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('questionnaire_consultation');
    expect(json.error).toContain('Q_NEU_06');
    expect(prisma.$transaction).not.toHaveBeenCalled();
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

// ─── LOT-03 (dette 4) — le refus du miroir relationnel, nommé à l'écran ──────
//
// `syncPackToRegistry` lève désormais `QidsSansDefinitionError` plutôt que de
// jeter silencieusement un qid sans `QuestionnaireDefinition`. Ces cas éprouvent
// LE PASSAGE, c'est-à-dire ce que le praticien voit : sans lui, les trois
// `catch` de la route rendraient « Erreur technique », et le garde aurait
// remplacé une dérive silencieuse par un échec silencieux.
describe('/api/praticien/packs — qid sans définition au registre relationnel', () => {
  const QIDS_FAUTIFS = [QID_ACTIF];

  beforeEach(() => {
    vi.clearAllMocks();
    seed();
    getServerSession.mockResolvedValue({ user: { email: 'praticien@wellneuro.fr' } });
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
    syncPackToRegistry.mockRejectedValue(new QidsSansDefinitionError(ID_AUTRE, QIDS_FAUTIFS));
  });

  // Le message doit NOMMER les qids : « erreur technique » ne dit pas quoi
  // retirer, et retirer est le seul geste que l'écran offre.
  it('18. POST : 409 qid_sans_definition, et les qids fautifs sont nommés', async () => {
    const res = await POST(post({ nom: 'Pack neuf', qids: [QID_ACTIF] }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('qid_sans_definition');
    expect(json.success).toBe(false);
    for (const qid of QIDS_FAUTIFS) expect(json.error).toContain(qid);
    // Le geste nommé doit être POSSIBLE depuis l'écran : « retirer du pack »
    // l'est, « créer la définition manquante » ne l'est pas (c'est le backfill).
    expect(json.error).toMatch(/retirer du pack/i);
    expect(json.error).not.toMatch(/erreur technique/i);
  });

  it('19. PATCH : 409 qid_sans_definition, et les qids fautifs sont nommés', async () => {
    const res = await PATCH(patch({ idPack: ID_AUTRE, qids: [QID_ACTIF] }));
    expect(res.status).toBe(409);
    const json = await res.json();
    expect(json.reason).toBe('qid_sans_definition');
    for (const qid of QIDS_FAUTIFS) expect(json.error).toContain(qid);
  });

  // LE SENS DU REFUS COMPTE AUTANT QUE SON EXISTENCE. La désactivation ne
  // touche pas `qids` : elle ne peut créer aucune divergence. La refuser
  // rendrait le pack en dérive INDÉSACTIVABLE — donc actif, donc assignable :
  // le garde interdirait de retirer le pack qu'il dénonce. `DELETE` ne passe
  // donc plus par `syncPackToRegistry`, il ne propage que `actif`.
  it('20. DELETE d’un pack en dérive : la désactivation ABOUTIT', async () => {
    const res = await DELETE(del(ID_AUTRE));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(store.get(ID_AUTRE)?.actif).toBe(false);
    // Et la synchro des items n'est pas même tentée : c'est ce qui rend le
    // refus inatteignable, pas un `catch` qui l'avalerait.
    expect(syncPackToRegistry).not.toHaveBeenCalled();
    expect(prisma.questionnairePack.updateMany).toHaveBeenCalledWith({
      where: { packId: ID_AUTRE },
      data: { actif: false },
    });
    // Les deux écritures sont dans la MÊME transaction : sorties de là, un pack
    // pourrait être éteint côté legacy et actif au miroir.
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  // CONTRÔLE NÉGATIF. Sans lui, remplacer le `instanceof` par un `catch` rendant
  // TOUJOURS 409 qid_sans_definition passerait les trois cas ci-dessus.
  it('21. une panne quelconque reste « exception » — le refus ne se généralise pas', async () => {
    syncPackToRegistry.mockRejectedValue(new Error('connexion perdue'));
    const res = await POST(post({ nom: 'Pack neuf', qids: [QID_ACTIF] }));
    const json = await res.json();
    expect(json.reason).toBe('exception');
    expect(json.error).toMatch(/erreur technique/i);
  });

  // CONTRÔLE NÉGATIF. Sans lui, un `throw` inconditionnel dans
  // `syncPackToRegistry` passerait tout ce bloc en vert.
  it('22. synchro réussie : la sauvegarde passe, aucun 409', async () => {
    syncPackToRegistry.mockResolvedValue(undefined);
    const res = await POST(post({ nom: 'Pack neuf', qids: [QID_ACTIF] }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  // UN GESTE NOMMÉ DOIT ÊTRE POSSIBLE. `normaliserQids` filtre sur le catalogue
  // de SCORING ; l'écran, lui, ne montre que le catalogue d'AFFICHAGE. Les deux
  // ensembles diffèrent, et le dépôt sait que `Q_NEU_12` est dans l'écart
  // (`backfillQuestionnaireRegistry.ts`, EXTRA_DEFINITIONS). Conseiller de
  // « retirer du pack » un tel qid désignerait une case qui n'existe pas.
  it('23. un qid absent du catalogue d’écran n’est pas annoncé comme retirable', async () => {
    // `Set.has(undefined)` rend `false` : sans le contrôle de type, ce garde
    // serait satisfait par une fixture INEXISTANTE, le jour où les deux
    // catalogues convergeraient.
    expect(QID_HORS_ECRAN, 'les deux catalogues ont convergé : plus de fixture hors écran').toBeTypeOf('string');
    expect(catalogueEcran.has(QID_HORS_ECRAN), 'la fixture doit rester hors écran').toBe(false);
    syncPackToRegistry.mockRejectedValue(new QidsSansDefinitionError(ID_AUTRE, [QID_HORS_ECRAN]));

    const res = await PATCH(patch({ idPack: ID_AUTRE, qids: [QID_ACTIF] }));
    const json = await res.json();

    expect(res.status).toBe(409);
    expect(json.error).toContain(QID_HORS_ECRAN);
    expect(json.error).not.toMatch(/retirer du pack/i);
    expect(json.error).toMatch(/recréée en base/i);
  });

  it('24. les deux classes de qids se lisent séparément dans le même message', async () => {
    syncPackToRegistry.mockRejectedValue(new QidsSansDefinitionError(ID_AUTRE, [QID_ACTIF, QID_HORS_ECRAN]));

    const json = await (await PATCH(patch({ idPack: ID_AUTRE, qids: [QID_ACTIF] }))).json();

    // Le retirable est annoncé retirable, l'autre non : un message qui les
    // fondrait promettrait un geste impossible sur la moitié de sa liste.
    expect(json.error).toMatch(new RegExp(`retirer du pack : ${QID_ACTIF}`, 'i'));
    expect(json.error).toMatch(new RegExp(`${QID_HORS_ECRAN}[^.]*recréée en base`, 'i'));
  });

  // La journalisation est la seule trace serveur du refus. Sans assertion, elle
  // peut disparaître sans qu'un test bouge — et le refus redeviendrait muet
  // côté exploitation.
  it('25. le refus est journalisé une fois, sans donnée patient', async () => {
    const warn = vi.spyOn(logger, 'warn').mockImplementation(() => {});
    // LE TEMPS EST FAUX, ET C'EST LE SEUL MOYEN DE PINCER `durationMs`. Le
    // contexte est créé à l'ENTRÉE du handler ; construit dans le `catch`,
    // `durationMs` vaudrait 0 et le champ mentirait — mais un handler mocké dure
    // moins d'une milliseconde, donc 0 est aussi la valeur honnête. On fait donc
    // s'écouler du temps DANS le handler : seule la création à l'entrée le voit.
    // `mockImplementationOnce` : `vi.clearAllMocks()` efface les appels, pas les
    // implémentations. Installée durablement, celle-ci ferait appeler
    // `advanceTimersByTime` sous horloge réelle au prochain test ajouté.
    vi.useFakeTimers();
    getServerSession.mockImplementationOnce(async () => {
      vi.advanceTimersByTime(120);
      return { user: { email: 'praticien@wellneuro.fr' } };
    });
    try {
      await POST(post({ nom: 'Pack neuf', qids: [QID_ACTIF] }));

      expect(warn).toHaveBeenCalledTimes(1);
      const charge = warn.mock.calls[0][0];
      expect(charge.event).toBe('ASSIGNATION.PACK.REGISTRE_QID_SANS_DEFINITION');
      expect(charge.metadata).toEqual({ idPack: ID_AUTRE, qids: QIDS_FAUTIFS });
      expect(charge.context.statusCode).toBe(409);
      expect(charge.context.durationMs).toBeGreaterThanOrEqual(120);
      expect(JSON.stringify(charge)).not.toMatch(/@|patient/i);
    } finally {
      vi.useRealTimers();
      warn.mockRestore();
    }
  });
});
