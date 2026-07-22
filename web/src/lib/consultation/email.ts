import nodemailer from 'nodemailer';
import { isG5GooglePatientEnabled } from '@/lib/portail/featureFlag';
import { CHEMIN_CONNEXION } from '@/lib/portail/googleIdentite';

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
 * Distinct de `sendPortailLinkEmail`, qui reste mot pour mot ce qu'il était
 * pour le chemin permanent : les deux coexistent pendant la bascule. Le texte
 * diffère parce que la promesse diffère — l'autre dit « personnel et
 * permanent », celui-ci doit dire l'inverse sans inquiéter.
 */
export async function sendMagicLinkEmail(
  patientEmail: string,
  prenom: string,
  lien: string,
): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return;
  const transport = nodemailer.createTransport(smtpUrl);
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
}

// Envoi best-effort du lien d'accès au portail patient. Sans SMTP_URL
// configuré, l'envoi est silencieusement ignoré (le lien reste récupérable
// côté praticien dans la réponse de l'API).
//
// Gate G5 (IDP2 LOT-03f) : quand le drapeau est actif, l'e-mail propose Google
// avant le lien permanent, sans jamais le retirer — le patient garde le choix,
// et un patient qui refuse Google n'est pas laissé sans accès. Drapeau éteint,
// le texte est identique lettre pour lettre à ce qu'il était avant ce lot.
export async function sendPortailLinkEmail(
  patientEmail: string,
  prenom: string,
  lien: string,
  motif?: string | null
): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return;
  const motifInfo = motif ? `\nMotif de votre consultation : ${motif}` : '';
  const googleActif = isG5GooglePatientEnabled();
  const lienIntro = googleActif
    ? ''
    : `Ce lien est personnel et permanent : vous pourrez y revenir à tout moment ` +
      `en confirmant l'adresse email enregistrée par votre praticien.\n\n`;
  const acces = googleActif
    ? `Deux façons d'accéder à votre espace :\n\n` +
      `→ Continuer avec Google (recommandé) :\n${buildGoogleConnexionUrl()}\n\n` +
      `→ Ou via ce lien personnel et permanent :\n${lien}\n\n`
    : `Accéder à votre espace :\n${lien}\n\n`;
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from: '"Wellneuro" <noreply@wellneuro.fr>',
    to: patientEmail,
    subject: 'Accès à votre espace patient — Wellneuro',
    text:
      `Bonjour ${prenom},\n\n` +
      `Votre praticien vous ouvre l'accès à votre espace patient Wellneuro.${motifInfo}\n\n` +
      lienIntro +
      `Lors de votre première connexion, il vous sera demandé de donner votre consentement, ` +
      `de remplir une courte fiche de renseignements puis un questionnaire d'anamnèse. ` +
      `Vos questionnaires de suivi seront ensuite mis à votre disposition.\n\n` +
      acces +
      `L'équipe Wellneuro`,
  });
}
