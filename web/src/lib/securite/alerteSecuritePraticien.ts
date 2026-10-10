import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { reponsesSecuriteDeclarees } from '@/lib/clinical-engine/safetyFindings';
import {
  TYPES_CORRESPONDANCE_PATIENT,
  journaliserCorrespondancePatient,
  type StatutCorrespondancePatient,
} from '@/lib/correspondance/patient';

// LE COURRIEL AU PRATICIEN SUR UNE RÉPONSE SUICIDAIRE — [[D-277]] §2 et §3.
//
// IL PART QUAND UN CONSTAT NAÎT. Pour un questionnaire, la décision passe par
// `reponsesSecuriteDeclarees`, la lecture même du producteur signé
// `SAF-QUEST-01` ([[D-275]] §2) : une option autre que « non », ou une valeur
// hors options (fail-closed), appelle le courriel ; une réponse illisible, qui
// ne produit qu'une limitation, ne l'appelle pas. Le texte renvoie au Fil :
// il ne doit partir que lorsque le Fil a de quoi le montrer.
//
// RIEN DU DOSSIER DANS LE COURRIEL : ni nom, ni réponse, ni questionnaire, ni
// identifiant. Le lien mène au Fil du jour, pas au dossier.
//
// UN ÉCHEC SE TRACE, IL NE SE RETENTE PAS. La ligne va au journal des
// correspondances du dossier, que le praticien lit dans le panneau
// « Correspondance » ; la carte du Fil reste le filet. Clé de source unique :
// une transmission ne produit qu'une ligne. L'envoi ne conditionne jamais
// l'enregistrement de la réponse — cette fonction ne lève pas. Elle rend son
// statut : la route, qui porte le contexte de requête, journalise un échec en
// exploitation (le journal des correspondances avale ses propres pannes).
//
// LE VERROU DE SIGNATURE N'EST PAS LU, ET C'EST VOULU. Si une retouche du
// catalogue refermait le verrou de `SAF-QUEST-01`, le constat et sa carte se
// tairaient ; le courriel, lui, partirait encore. Un courriel de trop vaut
// mieux qu'un signal tu ([[D-277]], limite connue).

/**
 * Texte SIGNÉ par le responsable le 2026-10-10 ([[D-277]] §2). Ne pas
 * reformuler sans nouvelle signature : le banc le tient mot pour mot.
 */
export const COURRIEL_SIGNAL_SECURITE = Object.freeze({
  sujet: 'Signal de sécurité à évaluer — Wellneuro',
  corps: (lien: string) =>
    'Bonjour,\n\n' +
    'Un patient vient de transmettre une réponse qui appelle une évaluation de sécurité. ' +
    'Elle figure en tête de votre Fil du jour, sous « Signal de sécurité à évaluer ».\n\n' +
    `Connectez-vous à Wellneuro pour la consulter : ${lien}\n\n` +
    'Cet e-mail ne contient volontairement aucun détail.\n',
});

/** Objet de la ligne de journal, lue par le praticien dans le dossier. */
export const OBJET_JOURNAL_SIGNAL_SECURITE = 'Signal de sécurité à évaluer — courriel au praticien';

export function lienFilDuJour(): string {
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}/dashboard`;
}

/**
 * Cette transmission de questionnaire appelle-t-elle le courriel ? Exactement
 * quand elle produit un constat `SAF-QUEST-01`.
 */
export function transmissionAppelleAlerteSecurite(idQuestionnaire: string, reponses: unknown): boolean {
  return reponsesSecuriteDeclarees([{
    idReponse: 'transmission',
    idQuestionnaire,
    dateReponse: new Date(0),
    scoresJson: { rawAnswers: reponses },
    statutValidite: null,
  }]).some(reponse => (
    reponse.lecture.kind === 'hors_options'
    || (reponse.lecture.kind === 'option' && !reponse.lecture.non)
  ));
}

export type SourceAlerteSecurite =
  | { type: 'reponse_questionnaire'; id: string }
  | { type: 'anamnese'; id: string };

export async function notifierPraticienSignalSecurite(entree: {
  idPatient: string;
  praticienEmail: string | null | undefined;
  source: SourceAlerteSecurite;
}): Promise<{ statut: StatutCorrespondancePatient; erreur?: unknown }> {
  const trace = {
    idPatient: entree.idPatient,
    type: TYPES_CORRESPONDANCE_PATIENT.alerteSecuritePraticien,
    objet: OBJET_JOURNAL_SIGNAL_SECURITE,
    referenceType: entree.source.type,
    referenceId: entree.source.id,
    sourceType: 'alerte_securite_praticien',
    sourceId: `${entree.source.type}:${entree.source.id}`,
  } as const;
  const smtpUrl = process.env.SMTP_URL;
  const destinataire = (entree.praticienEmail ?? '').trim();
  if (!smtpUrl || !destinataire) {
    await journaliserCorrespondancePatient({ ...trace, statut: 'Non_envoye' });
    return { statut: 'Non_envoye' };
  }
  try {
    await creerTransportSmtp(smtpUrl).sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: destinataire,
      subject: COURRIEL_SIGNAL_SECURITE.sujet,
      text: COURRIEL_SIGNAL_SECURITE.corps(lienFilDuJour()),
    });
    await journaliserCorrespondancePatient({ ...trace, statut: 'Envoye' });
    return { statut: 'Envoye' };
  } catch (erreur) {
    await journaliserCorrespondancePatient({ ...trace, statut: 'Erreur', erreur });
    return { statut: 'Erreur', erreur };
  }
}
