// L'ENCART D'URGENCE — [[D-275]]. Aucune dépendance Node : lu par des
// composants client.
//
// TOUJOURS VISIBLE, SANS AUCUN CALCUL, ET C'EST LE CHOIX. L'encart ne dépend
// d'aucune réponse : il s'affiche sur chaque écran des questionnaires qui
// posent une question sur le suicide, et dans la section « Signaux à
// signaler » de l'anamnèse. Un défaut de règle ne peut donc pas le faire
// disparaître (arbitrage du responsable, 2026-10-09).
//
// LE MESSAGE SUR RÉPONSE POSITIVE S'Y AJOUTE, IL NE LE REMPLACE PAS ([[D-277]]).
// Lui est calculé : il apparaît dès qu'une réponse positive est choisie. S'il
// manquait, l'encart resterait là — c'est pourquoi l'encart demeure.
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

/**
 * La phrase finale de l'encart, par écran ([[D-293]] §3). L'encart reste celui
 * de [[D-275]] §1, mot pour mot ; seul le SUJET de sa dernière phrase s'adapte —
 * « vos réponses » ne désigne rien hors d'un questionnaire. Textes validés tels
 * quels par le responsable le 2026-10-14 (lettre u).
 */
export const DELAI_ENCART_PAR_ECRAN = Object.freeze({
  questionnaire: ENCART_URGENCE.delai,
  mes_echanges:
    'Ce que vous transmettez est transmis à votre praticien, mais il ne le lit pas en temps réel : n’attendez pas sa réponse.',
  depot_documents:
    'Vos documents sont transmis à votre praticien, mais il ne les lit pas en temps réel : n’attendez pas sa réponse.',
});
export type EcranEncartUrgence = keyof typeof DELAI_ENCART_PAR_ECRAN;

// ─── [[D-277]] — LE MESSAGE SUR RÉPONSE POSITIVE ─────────────────────────────
//
// MÊME RÈGLE QUE LA TABLE SIGNÉE `SAF-QUEST-01` ([[D-275]] §2) : à la question
// listée ci-dessus, toute réponse autre que la PREMIÈRE option — celle qui dit
// « non » — est positive ; la plus légère compte, aucune gradation. Une valeur
// présente qu'aucune option ne connaît est positive aussi (fail-closed, comme
// le constat). Une réponse vide ne l'est pas. Cette fonction ne lit pas la
// table signée (elle embarquerait le catalogue et `node:crypto` dans le
// navigateur) : elle reçoit les options de la question affichée, celles-là
// mêmes que la table lit dans le catalogue ; le banc vérifie l'accord des deux.

/** La case de l'anamnèse (section `alertes`, champ `signaux_alerte`). */
export const CHAMP_ANAMNESE_SIGNAUX = 'signaux_alerte';
export const CASE_ANAMNESE_IDEES_SUICIDAIRES = 'Idées noires ou suicidaires';

export function estReponseSuicidePositive(
  idQuestionnaire: string | null | undefined,
  idQuestion: string,
  valeur: unknown,
  options: readonly { v: unknown }[] | undefined,
): boolean {
  if (!afficheEncartUrgence(idQuestionnaire)) return false;
  if (QUESTION_SUICIDE_PAR_QUESTIONNAIRE[idQuestionnaire as string] !== idQuestion) return false;
  if (valeur === undefined || valeur === null) return false;
  const texte = String(valeur).trim();
  if (!texte) return false;
  const index = (options ?? []).findIndex(option => String(option.v) === texte);
  return index !== 0;
}

/** Une réponse positive parmi toutes celles d'un questionnaire. */
export function questionnairePorteReponseSuicidePositive(
  idQuestionnaire: string | null | undefined,
  reponses: Readonly<Record<string, unknown>>,
  optionsDe: (idQuestion: string) => readonly { v: unknown }[] | undefined,
): boolean {
  if (!afficheEncartUrgence(idQuestionnaire)) return false;
  const idQuestion = QUESTION_SUICIDE_PAR_QUESTIONNAIRE[idQuestionnaire as string];
  return estReponseSuicidePositive(idQuestionnaire, idQuestion, reponses[idQuestion], optionsDe(idQuestion));
}

export function anamneseSignaleIdeesSuicidaires(valeur: unknown): boolean {
  return Array.isArray(valeur) && valeur.includes(CASE_ANAMNESE_IDEES_SUICIDAIRES);
}

/**
 * Texte SIGNÉ par le responsable le 2026-10-10 ([[D-277]] §1). Ne pas
 * reformuler sans nouvelle signature : le banc le tient mot pour mot.
 */
export const MESSAGE_REPONSE_SUICIDE = Object.freeze({
  titre: 'Vous venez d’indiquer des idées de mort ou de suicide.',
  ecoute: 'Vous pouvez en parler dès maintenant, gratuitement, 24 h sur 24 : appelez le 3114.',
  danger: 'Si vous pensez passer à l’acte ou si vous êtes en danger, appelez le 15 ou le 112.',
  praticien: 'Votre praticien sera prévenu de cette réponse quand vous transmettrez vos réponses, mais il ne pourra pas vous répondre immédiatement.',
});
