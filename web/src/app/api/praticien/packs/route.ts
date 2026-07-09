import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import type { Prisma } from '@/generated/prisma';

export type Pack = {
  idPack: string;
  nom: string;
  thematique: string | null;
  description: string | null;
  qids: string[];
  actif: boolean;
  parDefaut: boolean;
};

export type PacksApiResponse = {
  packs: Pack[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export type MutatePackResponse = {
  success: boolean;
  idPack?: string;
  error?: string;
  reason?: 'unauthenticated' | 'invalid_payload' | 'not_found' | 'exception';
};

type CreatePackPayload = {
  nom?: string;
  thematique?: string;
  description?: string;
  qids?: unknown;
};

type PatchPackPayload = {
  idPack?: string;
  nom?: string;
  thematique?: string;
  description?: string;
  qids?: unknown;
  actif?: boolean;
  parDefaut?: boolean;
};

const catalogue = QUESTIONNAIRE_CATALOGUE as Record<string, { id: string; titre: string }>;

const DEFAULT_REGISTRY_PACK_NIVEAU = 'approfondissement';

async function syncPackToRegistry(tx: Prisma.TransactionClient, pack: {
  idPack: string;
  nom: string;
  description: string | null;
  actif: boolean;
  qids: string[];
}) {
  const registryPack = await tx.questionnairePack.upsert({
    where: { packId: pack.idPack },
    create: {
      packId: pack.idPack,
      titre: pack.nom,
      description: pack.description,
      niveau: DEFAULT_REGISTRY_PACK_NIVEAU,
      actif: pack.actif,
    },
    update: {
      titre: pack.nom,
      description: pack.description,
      actif: pack.actif,
    },
    select: { id: true },
  });

  const definitions = await tx.questionnaireDefinition.findMany({
    where: { questionnaireId: { in: pack.qids } },
    select: { id: true, questionnaireId: true },
  });

  const definitionIdByQid = new Map(definitions.map(d => [d.questionnaireId, d.id]));
  const items = pack.qids
    .map((qid, index) => {
      const questionnaireId = definitionIdByQid.get(qid);
      if (!questionnaireId) return null;
      return {
        packId: registryPack.id,
        questionnaireId,
        ordre: index,
      };
    })
    .filter((item): item is { packId: string; questionnaireId: string; ordre: number } => item !== null);

  await tx.questionnairePackQuestionnaire.deleteMany({ where: { packId: registryPack.id } });
  if (items.length > 0) {
    await tx.questionnairePackQuestionnaire.createMany({ data: items });
  }
}

// Ne garde que des ids de questionnaire existants, dédupliqués, bornés.
function normaliserQids(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const vus = new Set<string>();
  for (const raw of input) {
    const id = String(raw ?? '').trim().slice(0, 50);
    if (id && catalogue[id]) vus.add(id);
  }
  return Array.from(vus).slice(0, 60);
}

// GET /api/praticien/packs — liste des packs (récents d'abord).
export async function GET(): Promise<NextResponse<PacksApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ packs: [], unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }
  try {
    const rows = await prisma.pack.findMany({ orderBy: { createdAt: 'desc' } });
    const packs: Pack[] = rows.map(p => ({
      idPack: p.idPack,
      nom: p.nom,
      thematique: p.thematique,
      description: p.description,
      qids: p.qids,
      actif: p.actif,
      parDefaut: p.parDefaut,
    }));
    return NextResponse.json({ packs });
  } catch {
    return NextResponse.json({ packs: [], unavailable: true, reason: 'exception' }, { status: 500 });
  }
}

// POST /api/praticien/packs — création d'un pack.
export async function POST(req: Request): Promise<NextResponse<MutatePackResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  let payload: CreatePackPayload;
  try {
    payload = (await req.json()) as CreatePackPayload;
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const nom = (payload.nom ?? '').trim().slice(0, 120);
  const thematique = (payload.thematique ?? '').trim().slice(0, 120);
  const description = (payload.description ?? '').trim().slice(0, 500);
  const qids = normaliserQids(payload.qids);

  if (!nom || qids.length === 0) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Nom et au moins un questionnaire valide requis.' },
      { status: 400 }
    );
  }

  try {
    const idPack = createPublicId('PACK');
    await prisma.$transaction(async tx => {
      const created = await tx.pack.create({
        data: {
          idPack,
          nom,
          thematique: thematique || null,
          description: description || null,
          qids,
          actif: true,
        },
      });
      await syncPackToRegistry(tx, {
        idPack: created.idPack,
        nom: created.nom,
        description: created.description,
        actif: created.actif,
        qids: created.qids,
      });
    });
    return NextResponse.json({ success: true, idPack });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: 'Erreur technique lors de la création du pack.' });
  }
}

// PATCH /api/praticien/packs — mise à jour (nom, contenu, activation).
export async function PATCH(req: Request): Promise<NextResponse<MutatePackResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  let payload: PatchPackPayload;
  try {
    payload = (await req.json()) as PatchPackPayload;
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const idPack = (payload.idPack ?? '').trim();
  if (!idPack) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant du pack requis.' }, { status: 400 });
  }

  const data: {
    nom?: string;
    thematique?: string | null;
    description?: string | null;
    qids?: string[];
    actif?: boolean;
    parDefaut?: boolean;
  } = {};
  if (payload.nom !== undefined) {
    const nom = payload.nom.trim().slice(0, 120);
    if (!nom) {
      return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Nom invalide.' }, { status: 400 });
    }
    data.nom = nom;
  }
  if (payload.thematique !== undefined) data.thematique = payload.thematique.trim().slice(0, 120) || null;
  if (payload.description !== undefined) data.description = payload.description.trim().slice(0, 500) || null;
  if (payload.qids !== undefined) {
    const qids = normaliserQids(payload.qids);
    if (qids.length === 0) {
      return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Au moins un questionnaire valide requis.' }, { status: 400 });
    }
    data.qids = qids;
  }
  if (payload.actif !== undefined) data.actif = Boolean(payload.actif);
  if (payload.parDefaut !== undefined) data.parDefaut = Boolean(payload.parDefaut);

  try {
    const existant = await prisma.pack.findUnique({ where: { idPack } });
    if (!existant) {
      return NextResponse.json({ success: false, reason: 'not_found', error: 'Pack introuvable.' }, { status: 404 });
    }
    // Un seul pack par défaut à la fois : on démarque les autres avant de marquer celui-ci.
    await prisma.$transaction(async tx => {
      if (data.parDefaut === true) {
        await tx.pack.updateMany({ where: { parDefaut: true, NOT: { idPack } }, data: { parDefaut: false } });
      }
      const updated = await tx.pack.update({ where: { idPack }, data });
      await syncPackToRegistry(tx, {
        idPack: updated.idPack,
        nom: updated.nom,
        description: updated.description,
        actif: updated.actif,
        qids: updated.qids,
      });
    });
    return NextResponse.json({ success: true, idPack });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: 'Erreur technique lors de la mise à jour du pack.' });
  }
}

// DELETE /api/praticien/packs?idPack=... — désactivation (soft delete).
export async function DELETE(req: Request): Promise<NextResponse<MutatePackResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  const idPack = (new URL(req.url).searchParams.get('idPack') ?? '').trim();
  if (!idPack) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant du pack requis.' }, { status: 400 });
  }

  try {
    const existant = await prisma.pack.findUnique({ where: { idPack } });
    if (!existant) {
      return NextResponse.json({ success: false, reason: 'not_found', error: 'Pack introuvable.' }, { status: 404 });
    }
    await prisma.$transaction(async tx => {
      const updated = await tx.pack.update({ where: { idPack }, data: { actif: false } });
      await syncPackToRegistry(tx, {
        idPack: updated.idPack,
        nom: updated.nom,
        description: updated.description,
        actif: updated.actif,
        qids: updated.qids,
      });
    });
    return NextResponse.json({ success: true, idPack });
  } catch {
    return NextResponse.json({ success: false, reason: 'exception', error: 'Erreur technique lors de la suppression du pack.' });
  }
}
