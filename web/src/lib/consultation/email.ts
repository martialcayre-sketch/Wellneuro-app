import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { CHEMIN_CONNEXION } from '@/lib/portail/googleIdentite';
import {
  journaliserCorrespondancePatient,
  TYPES_CORRESPONDANCE_PATIENT,
  type TypeCorrespondancePatient,
} from '@/lib/correspondance/patient';

async function envoyerAccesTrace({
  idPatient,
  type,
  objet,
  envoyer,
}: {
  idPatient?: string;
  type: TypeCorrespondancePatient;
  objet: string;
  envoyer: () => Promise<unknown>;
}): Promise<void> {
  if (!process.env.SMTP_URL) {
    if (idPatient) {
      await journaliserCorrespondancePatient({ idPatient, type, objet, statut: 'Non_envoye' });
    }
    return;
  }
  try {
    await envoyer();
    if (idPatient) {
      await journaliserCorrespondancePatient({ idPatient, type, objet, statut: 'Envoye' });
    }
  } catch (erreur) {
    if (idPatient) {
      await journaliserCorrespondancePatient({ idPatient, type, objet, statut: 'Erreur', erreur });
    }
    throw erreur;
  }
}

/**
 * URL d'un lien magique (gate G4). Le jeton n'apparaît que là : dans l'e-mail
 * du patient, et dans le chemin qu'il ouvrira une fois.
 */
export function buildMagicLinkUrl(jeton: string): string {
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}/portail/lien/${jeton}`;
}

/**
 * URL de la page d'entrée Google (gate G5). Distincte de `buildMagicLinkUrl` :
 * elle ne porte aucun secret, donc rien à générer par appel — la même URL vaut
 * pour tout patient.
 */
export function buildGoogleConnexionUrl(): string {
  const baseUrl = (process.env.NEXTAUTH_URL ?? 'http://localhost:3000').replace(/\/$/, '');
  return `${baseUrl}${CHEMIN_CONNEXION}`;
}

/**
 * Envoi d'un lien magique — 24 h, une seule ouverture.
 *
 * Distinct de `sendPortailLinkEmail`, qui pointe la page de connexion (Google +
 * redemande d'un lien) : ici l'e-mail porte un lien à usage unique qui ouvre
 * directement la session. Le texte le dit franchement, sans inquiéter.
 */
export async function sendMagicLinkEmail(
  patientEmail: string,
  prenom: string,
  lien: string,
  idPatient?: string,
): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  await envoyerAccesTrace({
    idPatient,
    type: TYPES_CORRESPONDANCE_PATIENT.lienMagique,
    objet: 'Lien temporaire d’accès à l’espace patient',
    envoyer: async () => {
      if (!smtpUrl) return;
      const transport = creerTransportSmtp(smtpUrl);
      await transport.sendMail({
        from: '"Wellneuro" <noreply@wellneuro.fr>',
        to: patientEmail,
        subject: 'Votre lien d’accès — Wellneuro',
        text:
          `Bonjour ${prenom},\n\n` +
          `Voici votre lien d'accès à votre espace patient Wellneuro :\n${lien}\n\n` +
          `Ce lien est valable 24 heures et ne s'ouvre qu'une fois. ` +
          `Passé ce délai, ou si vous l'avez déjà utilisé, vous pourrez en redemander ` +
          `un nouveau depuis la page qui s'affichera — sans passer par votre praticien.\n\n` +
          `Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer ce message : ` +
          `sans clic de votre part, ce lien expirera seul.\n\n` +
          `L'équipe Wellneuro`,
      });
    },
  });
}

// Envoi best-effort du lien d'accès au portail patient. Sans SMTP_URL
// configuré, l'envoi est silencieusement ignoré (l'URL de connexion reste
// récupérable côté praticien dans la réponse de l'API).
//
// Aucune donnée clinique dans le corps (audit HDS 2026-07-24) : le motif de
// consultation n'y figure plus — une boîte e-mail n'est pas un canal maîtrisé.
// Il reste en base (`consultations.motif`), visible du praticien.
//
// LOT-04 : plus aucun lien permanent secret dans l'e-mail. On pointe la page de
// connexion (non secrète, durable), où le patient choisit Google ou la réception
// d'un lien d'accès par e-mail. Ce sont les deux seuls chemins d'entrée.
export async function sendPortailLinkEmail(
  patientEmail: string,
  prenom: string,
  idPatient?: string,
): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  const connexion = buildGoogleConnexionUrl();
  await envoyerAccesTrace({
    idPatient,
    type: TYPES_CORRESPONDANCE_PATIENT.accesPortail,
    objet: 'Accès à l’espace patient',
    envoyer: async () => {
      if (!smtpUrl) return;
      const transport = creerTransportSmtp(smtpUrl);
      await transport.sendMail({
        from: '"Wellneuro" <noreply@wellneuro.fr>',
        to: patientEmail,
        subject: 'Accès à votre espace patient — Wellneuro',
        text:
          `Bonjour ${prenom},\n\n` +
          `Votre praticien vous ouvre l'accès à votre espace patient Wellneuro.\n\n` +
          `Rendez-vous sur votre page d'accès :\n${connexion}\n\n` +
          `Vous pourrez vous connecter avec Google, ou recevoir un lien d'accès ` +
          `par e-mail à l'adresse enregistrée par votre praticien.\n\n` +
          `Lors de votre première connexion, il vous sera demandé de donner votre consentement, ` +
          `de remplir une courte fiche de renseignements puis un questionnaire d'anamnèse. ` +
          `Vos questionnaires de suivi seront ensuite mis à votre disposition.\n\n` +
          `L'équipe Wellneuro`,
      });
    },
  });
}
