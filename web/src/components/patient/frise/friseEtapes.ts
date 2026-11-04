import type { JourneyStep } from '@/components/patient/PatientJourneyProgress';
import { TEXTES_ETAPE_ANALYSE_COURANTE, type EtapePatientSynchronisee } from '@/lib/trajectoire-partagee/formulations';

// Ancres du hub que la frise vise : la liste des questionnaires (une section de
// la page, sans route) et, quand cette liste n'est pas rendue, « Mon parcours »,
// le fil où les questionnaires restants sont remontés.
export const ANCRE_LISTE_QUESTIONNAIRES = 'mes-questionnaires';
export const ANCRE_MON_PARCOURS = 'mon-parcours';

export type CibleEtape =
  | { type: 'lien'; href: string }
  | { type: 'texte'; texte: string }
  | { type: 'aucune' };

export type SignauxFrise = {
  token: string;
  // État dérivé des étapes 5 et 6 (`deriverEtatParcoursPatient`) ; null tant
  // que des questionnaires restent à compléter.
  etape: EtapePatientSynchronisee | null;
  bilanConsultable: boolean;
  listeQuestionnairesRendue: boolean;
};

const AUCUNE: CibleEtape = { type: 'aucune' };

/*
 * LE TABLEAU ÉTAPE → CIBLE DE [[D-423]] §8, ET RIEN D'AUTRE.
 *
 * Une étape sans cible existante n'est pas cliquable ; aucune route n'est
 * créée. Une étape à venir est annoncée et fermée. Sur le hub, les étapes 1 à 3
 * sont toujours passées, et aucune page patient ne relit ce qui y a été saisi
 * (consentement au suivi, fiche signalétique, anamnèse) : non cliquables.
 *
 * L'étape 5 courante est la seule exception voulue (Q27) : sans cible, elle
 * s'ouvre sur un texte qui suit l'état dérivé, jamais au-delà (D7, D11).
 * L'étape 6 courante n'a jamais de texte d'attente : le bilan quand
 * `bilanConsultable` le sert — pas `bookletEnvoye`, qui fait avancer la frise
 * sans dire que le document est lisible —, sinon non cliquable.
 */
export function cibleEtape(step: JourneyStep, signaux: SignauxFrise): CibleEtape {
  if (step.state === 'upcoming') return AUCUNE;
  switch (step.id) {
    case 4:
      return {
        type: 'lien',
        href: `#${signaux.listeQuestionnairesRendue ? ANCRE_LISTE_QUESTIONNAIRES : ANCRE_MON_PARCOURS}`,
      };
    case 5:
      if (step.state !== 'current') return AUCUNE;
      if (signaux.etape === 'elements_transmis' || signaux.etape === 'analyse_en_cours') {
        return { type: 'texte', texte: TEXTES_ETAPE_ANALYSE_COURANTE[signaux.etape] };
      }
      return AUCUNE;
    case 6:
      return signaux.bilanConsultable ? { type: 'lien', href: `/portail/${signaux.token}/bilan` } : AUCUNE;
    default:
      return AUCUNE;
  }
}
