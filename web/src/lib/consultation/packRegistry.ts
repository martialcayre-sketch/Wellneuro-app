import { prisma } from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma';
import { resolveQidsLogic } from './packRegistryLogic';

export const DEFAULT_REGISTRY_PACK_NIVEAU = 'approfondissement';

// ─── Le refus qui ferme le générateur de la dérive ───────────────────────────
//
// Jusqu'au 2026-08-08, cette fonction IGNORAIT silencieusement tout qid sans
// `QuestionnaireDefinition`. C'est le mécanisme qui a produit la dérive du
// 2026-08-05 : le pack de base portait `Q_SOM_09`, dont la ligne de définition
// n'a été créée que le 2026-08-06 14:59 — le miroir ne POUVAIT pas le porter, et
// `resolvePackQuestionnaireIds` retombait sur le legacy en `ensembles_divergents`
// à chaque onboarding. La resynchronisation du 2026-08-07 15:46 est venue d'une
// écriture d'une AUTRE campagne, par accident : rien ne l'avait provoquée.
//
// `backfillQuestionnaireRegistry.ts` avait déjà le bon réflexe — il abandonne
// avant toute écriture sur ce cas, en le nommant « précisément le type de trou
// qui a rendu syncPackToRegistry silencieusement vide ». Ce garde est ce
// pré-contrôle, posé cette fois sur le chemin d'écriture praticien.
//
// PORTÉE, ET CE QU'ELLE N'EST PAS. Le garde ferme le chemin applicatif, pas la
// table : une écriture SQL hors application peut toujours créer la dérive. C'est
// le rôle du contrat `prisma/checks/packs_registre_coherence_v1.sql`, rejoué en
// préflight de production par `release-db.yml`.
export const RAISON_QID_SANS_DEFINITION = 'qid_sans_definition';

export const MESSAGE_QID_SANS_DEFINITION =
  'Ce pack référence un questionnaire absent du registre relationnel : il serait enregistré incomplet.';

// Erreur portée jusqu'aux appelants POUR ÊTRE NOMMÉE À L'ÉCRAN. Une erreur nue
// serait avalée par le `catch` des routes, qui rend « Erreur technique » sans
// journaliser : le garde aurait remplacé une dérive silencieuse par un échec
// silencieux, et le praticien n'aurait aucun moyen de savoir quoi retirer.
export class QidsSansDefinitionError extends Error {
  readonly qids: string[];
  readonly idPack: string;

  constructor(idPack: string, qids: string[]) {
    super(`${MESSAGE_QID_SANS_DEFINITION} Pack ${idPack} — questionnaires sans définition : ${qids.join(', ')}.`);
    this.name = 'QidsSansDefinitionError';
    this.idPack = idPack;
    this.qids = qids;
  }
}

// Miroir le pack legacy (qids) dans le registre relationnel
// (QuestionnairePack / QuestionnairePackQuestionnaire). Un id sans
// QuestionnaireDefinition correspondante fait désormais ÉCHOUER la
// synchronisation (`QidsSansDefinitionError`), donc la transaction appelante :
// voir le bloc ci-dessus. `resolvePackQuestionnaireIds` reste le filet de
// sécurité côté lecture, pour l'état déjà en base.
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

  // Le refus se lit sur l'ENSEMBLE des qids, pas sur la longueur du tableau :
  // `pack.qids` peut porter des doublons (la route les déduplique, le backfill
  // relit la base telle quelle), et comparer `items.length` à `pack.qids.length`
  // rendrait alors un faux positif.
  const sansDefinition = Array.from(new Set(pack.qids)).filter(qid => !definitionIdByQid.has(qid));
  if (sansDefinition.length > 0) {
    throw new QidsSansDefinitionError(pack.idPack, sansDefinition);
  }

  // DÉDUPLIQUÉ, comme le refus ci-dessus. `pack_questionnaires` porte
  // `@@unique([packId, questionnaireId])` : un doublon dans `pack.qids` faisait
  // jusqu'ici échouer `createMany` en P2002, donc « Erreur technique ». La route
  // déduplique déjà (`normaliserQids`), le backfill non — il relit la base telle
  // quelle. L'ordre reste celui de la PREMIÈRE occurrence.
  const items = Array.from(new Set(pack.qids))
    .map((qid, index) => {
      const questionnaireId = definitionIdByQid.get(qid);
      // Branche devenue INATTEIGNABLE depuis le refus ci-dessus : elle reste
      // pour narrower le type sans assertion non-nulle, pas comme filet.
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
