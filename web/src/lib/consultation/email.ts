import nodemailer from 'nodemailer';

// Envoi best-effort du lien d'accès au portail patient. Sans SMTP_URL
// configuré, l'envoi est silencieusement ignoré (le lien reste récupérable
// côté praticien dans la réponse de l'API).
export async function sendPortailLinkEmail(
  patientEmail: string,
  prenom: string,
  lien: string,
  motif?: string | null
): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl) return;
  const motifInfo = motif ? `\nMotif de votre consultation : ${motif}` : '';
  const transport = nodemailer.createTransport(smtpUrl);
  await transport.sendMail({
    from: '"Wellneuro" <noreply@wellneuro.fr>',
    to: patientEmail,
    subject: 'Accès à votre espace patient — Wellneuro',
    text:
      `Bonjour ${prenom},\n\n` +
      `Votre praticien vous ouvre l'accès à votre espace patient Wellneuro.${motifInfo}\n\n` +
      `Ce lien est personnel et permanent : vous pourrez y revenir à tout moment ` +
      `en confirmant l'adresse email enregistrée par votre praticien.\n\n` +
      `Lors de votre première connexion, il vous sera demandé de donner votre consentement, ` +
      `de remplir une courte fiche de renseignements puis un questionnaire d'anamnèse. ` +
      `Vos questionnaires de suivi seront ensuite mis à votre disposition.\n\n` +
      `Accéder à votre espace :\n${lien}\n\n` +
      `L'équipe Wellneuro`,
  });
}
