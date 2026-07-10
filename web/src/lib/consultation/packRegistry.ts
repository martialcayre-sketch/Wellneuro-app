import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';

export const DEFAULT_REGISTRY_PACK_NIVEAU = 'approfondissement';

// Miroir le pack legacy (qids) dans le registre relationnel
// (QuestionnairePack / QuestionnairePackQuestionnaire). Ids sans
// QuestionnaireDefinition correspondante sont ignorés (silencieusement, comme
// avant l'extraction) : voir resolvePackQuestionnaireIds pour le filet de
// sécurité côté lecture.
export async function syncPackToRegistry(tx: Prisma.TransactionClient, pack: {
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

export type ResolvedPackQuestionnaires = { qids: string[]; source: 'registry' | 'legacy' };

// Lecture primaire registre, fallback legacy : on ne fait confiance au
// registre que s'il couvre exactement le même ensemble de qids que
// `pack.qids` (un sync partiel/périmé ne doit jamais faire disparaître un
// questionnaire d'une assignation). Ordre pris depuis `ordre` (registre) dans
// ce cas ; sinon on renvoie `pack.qids` tel quel.
export async function resolvePackQuestionnaireIds(pack: {
  idPack: string;
  qids: string[];
}): Promise<ResolvedPackQuestionnaires> {
  const registryPack = await prisma.questionnairePack.findUnique({
    where: { packId: pack.idPack },
    include: {
      questionnaires: {
        orderBy: { ordre: 'asc' },
        include: { questionnaire: { select: { questionnaireId: true } } },
      },
    },
  });

  if (registryPack) {
    const registryQids = registryPack.questionnaires.map(item => item.questionnaire.questionnaireId);
    const registrySet = new Set(registryQids);
    const legacySet = new Set(pack.qids);
    const sameMembers = registrySet.size === legacySet.size && pack.qids.every(qid => registrySet.has(qid));
    if (registryQids.length > 0 && sameMembers) {
      return { qids: registryQids, source: 'registry' };
    }
  }

  return { qids: pack.qids, source: 'legacy' };
}
