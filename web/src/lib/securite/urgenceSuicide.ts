// L'ENCART D'URGENCE — [[D-275]]. Aucune dépendance Node : lu par des
// composants client.
//
// TOUJOURS VISIBLE, SANS AUCUN CALCUL, ET C'EST LE CHOIX. L'encart ne dépend
// d'aucune réponse : il s'affiche sur chaque écran des questionnaires qui
// posent une question sur le suicide, et dans la section « Signaux à
// signaler » de l'anamnèse. Un défaut de règle ne peut donc pas le faire
// disparaître, et il n'ajoute aucun triage calculé (arbitrage du responsable,
// 2026-10-09).
//
// LES LIBELLÉS DES NUMÉROS REPRENNENT MOT À MOT la page d'information déjà
// publiée (`trust/contenus/registre.ts`, « En cas d'urgence »).

/** Questionnaire → identifiant de la question qui porte sur le suicide. */
export const QUESTION_SUICIDE_PAR_QUESTIONNAIRE: Readonly<Record<string, string>> = Object.freeze({
  Q_NEU_01: 'B7', // BDI — « Idées de mort ou de suicide »
  Q_NEU_02: 'Q010', // MADRS — « Idées de suicide »
  Q_NEU_03: 'SIGH_Q019', // SIGH-SAD-SA — question 19
  Q_NEU_12: 'IA9', // IDTAS-AE — « Pensées de mort ou d'auto-agression ? »
});

/** La section de l'anamnèse où le patient peut cocher « Idées noires ou suicidaires ». */
export const SECTION_ANAMNESE_SIGNAUX = 'alertes';

export function afficheEncartUrgence(idQuestionnaire: string | null | undefined): boolean {
  return typeof idQuestionnaire === 'string'
    && Object.hasOwn(QUESTION_SUICIDE_PAR_QUESTIONNAIRE, idQuestionnaire);
}

export const ENCART_URGENCE = Object.freeze({
  titre: 'Besoin d’aide maintenant ?',
  numeros: Object.freeze([
    Object.freeze({ numero: '3114', libelle: 'numéro national de prévention du suicide' }),
    Object.freeze({ numero: '15', libelle: 'SAMU, urgence médicale' }),
    Object.freeze({ numero: '112', libelle: 'numéro d’urgence européen' }),
    Object.freeze({ numero: '114', libelle: 'urgence par SMS ou application' }),
  ]),
  delai: 'Vos réponses sont transmises à votre praticien, mais il ne les lit pas en temps réel : n’attendez pas sa réponse.',
});
