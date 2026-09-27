// Export PDF du dossier patient (D-252) — lecture des agrégats des agendas.
//
// Q_ALI_09 porte `sections: []` par conception (questionnaires/alimentaire.ts) :
// ses agrégats de clôture n'ont au catalogue ni libellé ni unité. L'export les
// restitue par cette table, typée sur `AgregatsAgendaAli` : une clé ajoutée au
// domaine ne compile plus tant qu'elle n'a pas son libellé. Aucun poids, aucun
// seuil : des noms et des unités, rien d'autre.
//
// Q_SOM_09 déclare ses agrégats au catalogue, qui reste intouché : l'export ne
// remplace que sa légende et dit comment lire ses deux pseudo-items sans unité.
//
// Module PUR : `agenda-alimentaire/cloture.ts` importe Prisma.

import type { AgregatsAgendaAli } from '@/lib/agenda-alimentaire/agregats';
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';
import type { AgregatsAgenda } from '@/lib/agenda-sommeil/agregats';
import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';

/** Recopie de `pseudoItemAgendaAli` (agenda-alimentaire/cloture.ts), épinglée par le banc. */
export function pseudoItemAli(cle: string): string {
  return `AGA_${cle.replace(/([A-Z])/g, '_$1').toUpperCase()}`;
}

/** Pseudo-item d'agenda (sommeil `AGD_`, alimentaire `AGA_`) : une valeur calculée à la clôture, jamais saisie. */
export function estPseudoItemAgenda(id: string): boolean {
  return /^AG[DA]_/.test(id);
}

type LibelleAgregat = { texte: string; unite: string };

// Les trois premiers libellés de grandeur sont ceux de l'écran praticien
// (AgendaAlimentairePraticienPanel) ; les autres suivent la documentation du
// type. Minutes laissées en « min », comme les pseudo-items du sommeil.
export const LIBELLES_AGREGATS_ALI: Record<keyof AgregatsAgendaAli, LibelleAgregat> = {
  nbJours: { texte: 'Nombre de journées renseignées', unite: 'journées' },
  nbJoursWeekEnd: { texte: 'Journées de week-end retenues', unite: 'journées' },
  nbJoursSansPrise: { texte: 'Journées déclarées sans prise', unite: 'journées' },
  nbJoursAvecPrises: { texte: 'Journées avec prises', unite: 'journées' },
  nbJoursFenetreConnue: { texte: 'Journées où la fenêtre alimentaire est connue', unite: 'journées' },
  nbPairesJeune: {
    texte: 'Paires de journées consécutives exploitables pour le jeûne nocturne',
    unite: 'paires',
  },
  nbJoursProteinesConnu: {
    texte: 'Journées renseignées pour la première prise riche en protéines',
    unite: 'journées',
  },
  nbJoursContenuConnu: {
    texte: 'Journées renseignées pour les légumes, les fruits ou oléagineux et les aliments ultra-transformés',
    unite: 'journées',
  },
  nbJoursSoirConnu: { texte: 'Journées renseignées pour le repas du soir plus copieux', unite: 'journées' },
  jeuneMedian: { texte: 'Jeûne nocturne médian', unite: 'min' },
  fenetreAliMoyenne: { texte: 'Fenêtre alimentaire moyenne', unite: 'min' },
  regularitePremiereEcartType: {
    texte: "Régularité de la première prise (écart-type de son heure)",
    unite: 'min',
  },
  regulariteDerniereEcartType: {
    texte: "Régularité de la dernière prise (écart-type de son heure)",
    unite: 'min',
  },
  nbPrisesMoyen: { texte: 'Prises moyennes par journée avec prises', unite: 'prises' },
  nbRepasMoyen: { texte: 'Repas moyens par journée avec prises', unite: 'repas' },
  nbHorsRepasMoyen: { texte: 'Prises hors repas moyennes par journée avec prises', unite: 'prises' },
  freqHorsRepasSem: { texte: 'Jours par semaine avec au moins une prise hors repas', unite: 'jours / semaine' },
  freqMoinsDeuxRepasSem: {
    texte: 'Jours par semaine à moins de deux repas structurés',
    unite: 'jours / semaine',
  },
  freqProteinesMatinSem: {
    texte: 'Jours par semaine à première prise riche en protéines',
    unite: 'jours / semaine',
  },
  freqLegumesSem: { texte: 'Jours par semaine avec légumes à deux prises', unite: 'jours / semaine' },
  freqFruitsSem: { texte: 'Jours par semaine avec fruits ou oléagineux', unite: 'jours / semaine' },
  freqUltraTransformesSem: {
    texte: 'Jours par semaine avec aliments ultra-transformés',
    unite: 'jours / semaine',
  },
  freqSoirCopieuxSem: { texte: 'Jours par semaine à repas du soir plus copieux', unite: 'jours / semaine' },
};

/**
 * Définition de LECTURE de l'agenda alimentaire : ses agrégats en pseudo-items,
 * comme Q_SOM_09 les déclare au catalogue. null pour tout autre instrument, ou
 * dès que le catalogue déclarera lui-même des questions pour Q_ALI_09.
 */
export function definitionLectureAgendaAli(definition: QuestionnaireDef): QuestionnaireDef | null {
  if (definition.id !== AGENDA_ALI_ID) return null;
  if ((definition.sections ?? []).some(section => (section.questions ?? []).length > 0)) return null;
  const cles = Object.keys(LIBELLES_AGREGATS_ALI) as Array<keyof AgregatsAgendaAli>;
  return {
    ...definition,
    sections: [
      {
        id: 'agregats',
        titre: 'Agrégats générés à la clôture — jamais saisis',
        description:
          'Valeurs calculées à la clôture à partir des journées renseignées, sans poids ni seuil. ' +
          "Une métrique non couverte n'est pas calculée — jamais remplacée par 0.",
        questions: cles.map(cle => ({
          id: pseudoItemAli(cle),
          texte: LIBELLES_AGREGATS_ALI[cle].texte,
          type: 'number' as const,
          unit: LIBELLES_AGREGATS_ALI[cle].unite,
        })),
      },
    ],
  };
}

/**
 * Légende de LECTURE des agrégats du sommeil. Celle du catalogue est une note
 * de développeur (« vaut null ») : le document n'écrit jamais « null », il
 * écrit « Non calculé : recueil insuffisant », que le préambule définit.
 */
export const LEGENDE_AGREGATS_SOMMEIL =
  'Valeurs calculées à partir des nuits renseignées ; une métrique non couverte est écrite ' +
  '« Non calculé : recueil insuffisant », jamais 0.';

/**
 * Définition de LECTURE de l'agenda du sommeil : questions, bornes et unités
 * du catalogue, seule la légende de la section d'agrégats est celle de
 * l'export. null pour tout autre instrument.
 */
export function definitionLectureAgendaSommeil(definition: QuestionnaireDef): QuestionnaireDef | null {
  if (definition.id !== AGENDA_SOMMEIL_ID) return null;
  return {
    ...definition,
    sections: (definition.sections ?? []).map(section =>
      (section.questions ?? []).some(question => estPseudoItemAgenda(question.id))
        ? { ...section, description: LEGENDE_AGREGATS_SOMMEIL }
        : section,
    ),
  };
}

export type LectureSansUnite = 'echelle' | 'oui-non';

// Typée sur le domaine : un pseudo-item renommé ne compile plus ici.
const LECTURES_SANS_UNITE: Array<[keyof AgregatsAgenda, LectureSansUnite]> = [
  ['AGD_QUAL_MOY', 'echelle'],
  ['AGD_INDICE_ELIGIBLE', 'oui-non'],
];

/**
 * Pseudo-items du sommeil SANS unité : comment l'export les lit. Une borne du
 * catalogue n'est pas toujours une échelle (Q_NEU_12 compte des sélections de
 * 0 à 6) : « échelle » ne s'écrit que pour un item nommé ici, et ses bornes
 * restent celles de la définition. Le banc exige une entrée pour chaque
 * pseudo-item sans unité de Q_SOM_09.
 */
export const LECTURE_SANS_UNITE_SOMMEIL: ReadonlyMap<string, LectureSansUnite> = new Map(LECTURES_SANS_UNITE);

/** Les deux valeurs que la clôture écrit pour un drapeau (`AGD_INDICE_ELIGIBLE: 1 | 0`). */
export const OUI_NON: ReadonlyMap<string, string> = new Map([
  ['1', 'oui'],
  ['0', 'non'],
]);
