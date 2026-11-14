import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { sanitizeAuditError } from '@/lib/anthropic';
import { reponsesSecuriteDeclarees, type DesignationCabinetLue } from '@/lib/clinical-engine/safetyFindings';
import { tableSecuriteQuestionnaireCabinetSignee } from '@/lib/clinical/safetyQuestionnaireCabinetV1';
import {
  TYPES_CORRESPONDANCE_PATIENT,
  journaliserCorrespondancePatient,
  type StatutCorrespondancePatient,
} from '@/lib/correspondance/patient';
import { baseLiensCourriel } from '@/lib/portail/urlPublique';

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
// une transmission ne produit qu'une ligne, et un seul courriel. L'envoi ne conditionne jamais
// l'enregistrement de la réponse — cette fonction ne lève pas. Elle rend son
// statut : la route, qui porte le contexte de requête, journalise un échec en
// exploitation (le journal des correspondances avale ses propres pannes).
//
// LE VERROU DE SIGNATURE N'EST PAS LU, ET C'EST VOULU. Si une retouche du
// catalogue refermait le verrou de `SAF-QUEST-01`, le constat et sa carte se
// tairaient ; le courriel, lui, partirait encore. Un courriel de trop vaut
// mieux qu'un signal tu ([[D-277]], limite connue).
//
// SAUF POUR UN INSTRUMENT DU CABINET ([[D-515]], lot de code §6.2, PR 3). La
// règle `SAF-QUEST-02` lit la désignation COPIÉE sur l'assignation, et le
// courriel part quand elle produirait un constat : copie « oui » lisible,
// valeur autre que la valeur « non » copiée — ET table signée. Tant qu'elle
// ne l'est pas, aucune carte ne naît au Fil, et le courriel, qui y renvoie,
// ne part pas ; le message au patient non plus
// (`designationSuicideCabinetServie`).
//
// LE DRAPEAU COURANT N'EST PAS LU (contre-revue Codex de la PR 3, P1). Le
// message est décidé à l'ouverture de la page, drapeau allumé ; un drapeau
// éteint avant la transmission ne doit pas laisser le patient sur une
// promesse non tenue. La copie « oui » n'existe que si le drapeau était
// allumé à l'envoi.
//
// CONSÉQUENCE DURABLE, À SAVOIR (revue `wn-reviewer` de l'écart, P2-1) :
// après une extinction, toute assignation `CAB_` envoyée drapeau allumé
// continue de faire partir le courriel sur une réponse positive, alors que le
// Fil, qui suit le drapeau courant, n'en montre plus la carte. Il reste la
// ligne de journal du dossier. Question 20261114-1335-a, à trancher avant la
// signature de `SAF-QUEST-02`.

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
  return `${baseLiensCourriel()}/dashboard`;
}

/**
 * Cette transmission de questionnaire appelle-t-elle le courriel ? Exactement
 * quand elle produit un constat `SAF-QUEST-01` — ou, pour un instrument du
 * cabinet dont la désignation copiée est passée, quand `SAF-QUEST-02`
 * produirait un constat drapeau allumé (table signée seulement, drapeau
 * courant non relu : voir plus haut).
 */
export function transmissionAppelleAlerteSecurite(
  idQuestionnaire: string,
  reponses: unknown,
  designationCabinet?: DesignationCabinetLue,
): boolean {
  return reponsesSecuriteDeclarees([{
    idReponse: 'transmission',
    idQuestionnaire,
    dateReponse: new Date(0),
    scoresJson: { rawAnswers: reponses },
    statutValidite: null,
    ...(designationCabinet ? { designationCabinet } : {}),
  }], { courrielMalgreDrapeau: true }).some(reponse => (
    (!reponse.cabinet || tableSecuriteQuestionnaireCabinetSignee())
    && (
      reponse.lecture.kind === 'hors_options'
      || (reponse.lecture.kind === 'option' && !reponse.lecture.non)
    )
  ));
}

// Client chargé une seule fois pour tout le module : le charger à chaque appel
// laisse deux appels concurrents se le disputer, et le second peut recevoir
// un autre module que le premier (constaté sous vitest).
let clientPrismaCharge: Promise<typeof import('@/lib/prisma')['prisma']> | undefined;
function clientPrisma() {
  clientPrismaCharge ??= import('@/lib/prisma').then(m => m.prisma);
  return clientPrismaCharge;
}

export type SourceAlerteSecurite =
  | { type: 'reponse_questionnaire'; id: string }
  | { type: 'anamnese'; id: string };

export async function notifierPraticienSignalSecurite(entree: {
  idPatient: string;
  praticienEmail: string | null | undefined;
  source: SourceAlerteSecurite;
}): Promise<{ statut: StatutCorrespondancePatient; erreur?: unknown; dejaReserve?: true }> {
  const trace = {
    idPatient: entree.idPatient,
    type: TYPES_CORRESPONDANCE_PATIENT.alerteSecuritePraticien,
    objet: OBJET_JOURNAL_SIGNAL_SECURITE,
    referenceType: entree.source.type,
    referenceId: entree.source.id,
    sourceType: 'alerte_securite_praticien',
    sourceId: `${entree.source.type}:${entree.source.id}`,
  } as const;
  // RÉSERVATION AVANT L'ENVOI (revue Copilot #1393). La ligne unique
  // `(sourceType, sourceId)` passe par un `create` DIRECT : le journal avale
  // ses exceptions, ce qui rendrait l'unicité décorative et laisserait deux
  // transmissions concurrentes envoyer deux courriels. Déjà réservée : rien ne
  // part. Réservation impossible pour une autre raison (registre en panne) :
  // le courriel part quand même — un courriel sans trace vaut mieux qu'un
  // signal tu. La réservation reste en cas d'échec : jamais de nouvelle
  // tentative.
  let reservation: { id: string } | null = null;
  try {
    reservation = await (await clientPrisma()).correspondancePatient.create({
      data: {
        idPatient: trace.idPatient,
        canal: 'email',
        sens: 'sortant',
        type: trace.type,
        objet: trace.objet,
        statut: 'Non_envoye',
        referenceType: trace.referenceType,
        referenceId: trace.referenceId,
        sourceType: trace.sourceType,
        sourceId: trace.sourceId,
      },
      select: { id: true },
    });
  } catch (erreur) {
    if ((erreur as { code?: string }).code === 'P2002') return { statut: 'Non_envoye', dejaReserve: true };
  }
  const consigner = async (statut: StatutCorrespondancePatient, erreur?: unknown) => {
    if (!reservation) {
      await journaliserCorrespondancePatient({ ...trace, statut, erreur });
      return;
    }
    await (await clientPrisma()).correspondancePatient
      .update({
        where: { id: reservation.id },
        data: { statut, erreurCourte: erreur ? sanitizeAuditError(erreur).slice(0, 200) : undefined },
      })
      .catch(() => {
        // Registre best-effort : la ligne reste « Non envoyé », sens prudent.
      });
  };

  const smtpUrl = process.env.SMTP_URL;
  const destinataire = (entree.praticienEmail ?? '').trim();
  if (!smtpUrl || !destinataire) {
    // La réservation porte déjà « Non envoyé ».
    if (!reservation) await consigner('Non_envoye');
    return { statut: 'Non_envoye' };
  }
  try {
    await creerTransportSmtp(smtpUrl).sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: destinataire,
      subject: COURRIEL_SIGNAL_SECURITE.sujet,
      text: COURRIEL_SIGNAL_SECURITE.corps(lienFilDuJour()),
    });
  } catch (erreur) {
    await consigner('Erreur', erreur);
    return { statut: 'Erreur', erreur };
  }
  await consigner('Envoye');
  return { statut: 'Envoye' };
}
