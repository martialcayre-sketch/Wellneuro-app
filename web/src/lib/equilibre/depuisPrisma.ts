import { JOURS_JALON } from './constants';
import { calculerEquilibre } from './score';
import type { JalonMomentum, LectureDatee, ReponsesParQuestionnaire } from './types';

const JOUR_MS = 24 * 60 * 60 * 1000;

// Forme minimale attendue d'une ligne QuestionnaireReponse (Prisma) — pas de
// dépendance directe au client Prisma pour garder ce module testable avec des
// fixtures synthétiques, comme le reste de web/src/lib/equilibre.
export type ReponseBrute = {
  idQuestionnaire: string;
  dateReponse: Date;
  scoresJson: unknown;
};

// Les réponses soumises via api/patient/submit portent les réponses brutes
// sous scoresJson.rawAnswers (cf. web/src/app/api/patient/submit/route.ts) —
// nécessaires pour rappeler calculateScore(idQuestionnaire, answers) via le
// moteur d'équilibre. Les données de seed antérieures à ce chantier stockent
// uniquement le résultat déjà calculé (pas de rawAnswers) : ces
// questionnaires sont ignorés ici plutôt que de recalculer sur des données
// déjà agrégées — le besoin correspondant reste non évaluable, jamais 0 par
// défaut.
function extraireRawAnswers(scoresJson: unknown): Record<string, string | number> | null {
  if (!scoresJson || typeof scoresJson !== 'object') return null;
  const raw = (scoresJson as Record<string, unknown>).rawAnswers;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, string | number>;
}

/**
 * Dédoublonne les réponses d'un patient par idQuestionnaire (garde la plus
 * récente), extrait les réponses brutes exploitables par le moteur
 * d'équilibre. `dateLimite` optionnelle : ignore toute réponse postérieure —
 * utilisé par construireHistoriqueEquilibre pour reconstituer l'état connu à
 * une date passée.
 */
export function construireReponsesParQuestionnaire(
  reponses: ReponseBrute[],
  dateLimite?: Date
): ReponsesParQuestionnaire {
  const parQuestionnaire = new Map<string, ReponseBrute>();
  for (const r of reponses) {
    if (dateLimite && r.dateReponse > dateLimite) continue;
    const existante = parQuestionnaire.get(r.idQuestionnaire);
    if (!existante || r.dateReponse > existante.dateReponse) {
      parQuestionnaire.set(r.idQuestionnaire, r);
    }
  }

  const resultat: ReponsesParQuestionnaire = {};
  for (const [idQuestionnaire, r] of parQuestionnaire) {
    const rawAnswers = extraireRawAnswers(r.scoresJson);
    if (rawAnswers) resultat[idQuestionnaire] = rawAnswers;
  }
  return resultat;
}

/**
 * Convention actée pour dateT0 (MON_EQUILIBRE_CONTEXTE.md §5, aucun champ
 * dédié dans le schéma Prisma) : date de la toute première réponse à un
 * questionnaire du patient — pas la date de création du dossier patient, ni
 * celle de sa première assignation, qui peuvent précéder sans lien direct le
 * moment réel où le patient a commencé à renseigner l'outil.
 */
export function resoudreDateT0(reponses: ReponseBrute[]): Date | null {
  if (reponses.length === 0) return null;
  return reponses.reduce(
    (plusAncienne, r) => (r.dateReponse < plusAncienne ? r.dateReponse : plusAncienne),
    reponses[0].dateReponse
  );
}

/**
 * Historique borné aux 4 jalons T0/J21/J42/J90 (jamais une lecture par date
 * de réponse individuelle, pour rester borné quel que soit le volume de
 * réponses du patient) : à chaque jalon atteint, reconstruit l'état des
 * réponses connues jusqu'à cette date et calcule l'indice global à ce
 * moment-là. Un jalon futur (pas encore atteint) ou sans aucune couverture
 * disponible à cette date est omis, jamais représenté par une valeur à 0.
 *
 * `ancreT0` optionnel (C2B LOT-08, registre A8-1) : ancre explicitement les
 * jalons sur ce T0 plutôt que sur le T0 global (première réponse). Utilisé côté
 * praticien pour ancrer les jalons au T0 confirmé d'un épisode
 * (`assessment_episodes`). Absent → comportement inchangé (T0 global), pour la
 * fiche patient « Mon équilibre ».
 */
export function construireHistoriqueEquilibre(reponses: ReponseBrute[], ancreT0?: Date): LectureDatee[] {
  const dateT0 = ancreT0 ?? resoudreDateT0(reponses);
  if (!dateT0) return [];

  const maintenant = new Date();
  const jalons = Object.keys(JOURS_JALON) as JalonMomentum[];

  const lectures: LectureDatee[] = [];
  for (const jalon of jalons) {
    const dateJalon = new Date(dateT0.getTime() + JOURS_JALON[jalon] * JOUR_MS);
    if (dateJalon > maintenant) continue;

    const reponsesConnues = construireReponsesParQuestionnaire(reponses, dateJalon);
    const resultat = calculerEquilibre(reponsesConnues);
    if (resultat.scoreGlobal !== null) {
      lectures.push({ date: dateJalon, valeur: resultat.scoreGlobal });
    }
  }
  return lectures;
}
