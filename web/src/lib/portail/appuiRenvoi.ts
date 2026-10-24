// `WN_PORTAIL_APPUI_RENVOI` — LA PHRASE D'APPUI DU QUESTIONNAIRE RENVOYÉ
// (lettre ak, fiche H80, [[D-352]]). Fermé, le fil du jour sert les
// questionnaires exactement comme avant. Ouvert, la route du check-in annonce,
// pendant la fenêtre du rendez-vous de suivi J21, les assignations renvoyées ;
// le fil pose sous chacune la phrase acceptée (`texteAppuiRenvoi.ts`). Aucune
// écriture, aucune trace, aucune migration.
//
// UN QUESTIONNAIRE RENVOYÉ ([[D-352]] §2, Q4 du 2026-10-24) : une assignation
// ouverte, faite au jour 0 ou après, d'un instrument que le patient a déjà
// rempli AVANT le jour 0. Le jour 0 et la fenêtre ne se calculent pas ici :
// ce sont ceux de la route du check-in ([[D-255]], `pointEtapeCourant`), pour
// que la règle n'existe qu'à un endroit.
//
// Convention des drapeaux produit (`docs/FEATURE_FLAGS.md` § A) : la chaîne
// exacte `'true'`, absent = fermé. Variable serveur : un composant client ne la
// lit pas, c'est la route du check-in qui le lui dit.

import { prisma } from '@/lib/prisma';
import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';

export function appuiRenvoiOuvert(): boolean {
  return process.env.WN_PORTAIL_APPUI_RENVOI === 'true';
}

/**
 * Les `idAssignation` des questionnaires renvoyés du patient, au sens du §2.
 * Sélection minimale : identifiants et dates, jamais une réponse ni un score.
 * Toute réponse antérieure compte, quel que soit son statut de validité : la
 * phrase répond au fait d'avoir déjà répondu, pas à la valeur de la réponse.
 */
export async function assignationsRenvoyees(idPatient: string, jourZero: Date): Promise<string[]> {
  const ouvertes = await prisma.assignation.findMany({
    where: {
      idPatient,
      dateAssignation: { gte: jourZero },
      // Une assignation déverrouillée pour correction reste `Complété` : une
      // correction n'est pas un renvoi.
      statut: { notIn: ['Complété', 'Annulée'] },
      // Les agendas ne sont pas des questionnaires renvoyés : ils portent leur
      // propre rappel, et le geste du 21e jour de l'agenda est un message
      // distinct (place 9, H81), sans fusion avec celui-ci.
      idQuestionnaire: { notIn: [AGENDA_SOMMEIL_ID, AGENDA_ALI_ID] },
    },
    select: { idAssignation: true, idQuestionnaire: true },
  });
  if (ouvertes.length === 0) return [];

  const dejaRemplis = await prisma.questionnaireReponse.findMany({
    where: {
      idPatient,
      idQuestionnaire: { in: [...new Set(ouvertes.map(a => a.idQuestionnaire))] },
      dateReponse: { lt: jourZero },
    },
    select: { idQuestionnaire: true },
    distinct: ['idQuestionnaire'],
  });
  const remplis = new Set(dejaRemplis.map(r => r.idQuestionnaire));
  return ouvertes.filter(a => remplis.has(a.idQuestionnaire)).map(a => a.idAssignation);
}
