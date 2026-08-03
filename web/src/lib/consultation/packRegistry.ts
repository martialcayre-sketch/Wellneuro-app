import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import { resolveQidsLogic } from './packRegistryLogic';

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
  // `niveau` reste au défaut, VOLONTAIREMENT. Le prendre depuis la doctrine
  // avait été tenté au LOT-03 puis retiré à la revue : `syncPackToRegistry`
  // n'est appelé que sur création/édition/suppression d'un pack (et par le
  // backfill manuel, absent de `vercel-build.sh`), donc les packs existants
  // n'auraient jamais été repris — et surtout, AUCUN code ne lit
  // `questionnaire_packs.niveau` : l'UI lit celui de `PACKS_REGISTRY`. Écrire
  // une colonne morte au prix d'un correctif qui ne s'applique qu'aux cas
  // futurs n'aurait rien corrigé. Si ce champ trouve un jour un lecteur, il
  // faudra le poser ET rejouer un sync sur les packs existants.
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

/**
 * Pourquoi le registre relationnel n'a pas été suivi.
 *
 * La distinction n'est pas cosmétique : `registre_absent` et `registre_vide`
 * décrivent un pack jamais synchronisé — bénin, et vrai pour tout pack neuf.
 * `ensembles_divergents` décrit une VRAIE dérive entre deux descriptions du
 * même pack. Les journaliser sous le même signal rendrait l'alarme permanente,
 * donc inutile : c'est le défaut du repli muet, retourné.
 */
export type RaisonRepliLegacy = 'registre_absent' | 'registre_vide' | 'ensembles_divergents';

export type ResolvedPackQuestionnaires =
  | { qids: string[]; source: 'registry'; raison: null; registryCount: number }
  | { qids: string[]; source: 'legacy'; raison: RaisonRepliLegacy; registryCount: number };

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

  if (!registryPack) {
    return { qids: pack.qids, source: 'legacy', raison: 'registre_absent', registryCount: 0 };
  }

  const registryQids = registryPack.questionnaires.map(item => item.questionnaire.questionnaireId);
  if (registryQids.length === 0) {
    return { qids: pack.qids, source: 'legacy', raison: 'registre_vide', registryCount: 0 };
  }

  const resolved = resolveQidsLogic(registryQids, pack.qids);
  if (resolved !== null) {
    return { qids: resolved, source: 'registry', raison: null, registryCount: registryQids.length };
  }

  return {
    qids: pack.qids,
    source: 'legacy',
    raison: 'ensembles_divergents',
    registryCount: registryQids.length,
  };
}
