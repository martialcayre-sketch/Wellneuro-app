import type { Prisma } from '@/generated/prisma';
import { prisma } from '../prisma';
import type { DesignationCabinetLue, PassationSecuriteRow } from './safetyFindings';

// LA DÉSIGNATION COPIÉE, JOINTE AUX PASSATIONS DU CABINET — [[D-515]] §4, lot
// de code de §6.2 (H59).
//
// `questionnaire_reponses.id_assignation` rattache une passation à son
// assignation, sans relation Prisma (aucune migration dans ce lot) : la
// jointure se fait ici, par une seconde lecture bornée aux identifiants.
//
// LE SEUL LECTEUR DE LA COPIE, ET LE BANC LE TIENT
// (`declarationSuicideCabinet.guard.test.ts`) : la carte du Fil, le moteur et
// la lettre passent tous par cette fonction. Elle LIT, sans rien écrire — la
// copie est figée à l'envoi et rien ne la réécrit.
//
// PLUS DE DRAPEAU ([[D-528]]) : la jointure a lieu à chaque lecture. Le
// drapeau `WN_ENABLE_DECLARATION_SUICIDE_CAB`, qui la coupait, est retiré.

/** Les questionnaires du cabinet — la seule famille que `SAF-QUEST-02` lit. */
export const PREFIXE_INSTRUMENT_CABINET = 'CAB_';

/**
 * Le filtre des passations qu'un chargeur doit lire en plus du catalogue :
 * les instruments du cabinet ([[D-528]] : sans condition de drapeau).
 */
export function wherePassationsCabinet(): Prisma.QuestionnaireReponseWhereInput {
  return { idQuestionnaire: { startsWith: PREFIXE_INSTRUMENT_CABINET } };
}

type Client = Pick<Prisma.TransactionClient, 'assignation'>;

/** Les colonnes d'une assignation que lit `SAF-QUEST-02`, telles que Prisma les rend. */
export type AssignationDesignation = {
  titre: string;
  poseQuestionSuicide: boolean | null;
  questionSuicideId: string | null;
  questionSuicideOptionNon: number | null;
  questionSuicideCopie: unknown;
};

/**
 * Une assignation DÉJÀ LUE en désignation pour `SAF-QUEST-02`. Les routes du
 * patient (`api/patient/questionnaire`, `api/patient/submit`) lisent leur
 * assignation entière pour d'autres raisons ; elles passent ici au lieu de
 * nommer la copie (PR 3) — la copie reste nommée par ce fichier seul.
 */
export function designationDeLAssignation(assignation: AssignationDesignation): DesignationCabinetLue {
  return {
    poseQuestionSuicide: assignation.poseQuestionSuicide,
    titreAssignation: assignation.titre,
    questionSuicideId: assignation.questionSuicideId,
    questionSuicideOptionNon: assignation.questionSuicideOptionNon,
    questionSuicideCopie: assignation.questionSuicideCopie,
  };
}

/**
 * Joint à chaque passation du cabinet la déclaration et la désignation copiées
 * sur son assignation. Une passation sans assignation retrouvée n'en reçoit
 * aucune : sa déclaration est inconnue, et la règle ne la lit pas ([[D-515]]
 * §1 — seule une copie « oui » est lue). Une assignation « oui » sans
 * désignation reçoit ses colonnes NULL telles quelles : c'est le §7.
 *
 * L'ordre des lignes est conservé ; les passations du catalogue passent
 * inchangées.
 */
export async function joindreDesignationsCabinet<T extends PassationSecuriteRow & { idAssignation: string | null }>(
  rows: readonly T[],
  client: Client = prisma,
): Promise<T[]> {
  const ids = [...new Set(
    rows
      .filter(row => row.idQuestionnaire.startsWith(PREFIXE_INSTRUMENT_CABINET) && row.idAssignation)
      .map(row => row.idAssignation as string),
  )].sort();
  if (ids.length === 0) return [...rows];
  const assignations = await client.assignation.findMany({
    where: { idAssignation: { in: ids } },
    select: {
      idAssignation: true,
      titre: true,
      poseQuestionSuicide: true,
      questionSuicideId: true,
      questionSuicideOptionNon: true,
      questionSuicideCopie: true,
    },
  });
  const parId = new Map<string, DesignationCabinetLue>(
    assignations.map(assignation => [assignation.idAssignation, designationDeLAssignation(assignation)]),
  );
  return rows.map(row => {
    if (!row.idQuestionnaire.startsWith(PREFIXE_INSTRUMENT_CABINET) || !row.idAssignation) return row;
    const designationCabinet = parId.get(row.idAssignation);
    return designationCabinet ? { ...row, designationCabinet } : row;
  });
}
