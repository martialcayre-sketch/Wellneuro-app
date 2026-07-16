import nodemailer from 'nodemailer';

/**
 * Notification praticien à la réception d'un signalement TRUST.
 * Règle du cadrage (décision 13) : les notifications externes sont
 * GÉNÉRIQUES — aucun nom de patient, aucune catégorie, aucun contenu de
 * santé. Le détail se consulte dans le dashboard. Échec silencieux comme
 * les autres emails non critiques (sendAck) : l'enregistrement du
 * signalement ne dépend jamais de l'email.
 */
export async function notifierPraticienSignalement(praticienEmail: string): Promise<void> {
  const smtpUrl = process.env.SMTP_URL;
  if (!smtpUrl || !praticienEmail) return;
  try {
    const transporter = nodemailer.createTransport(smtpUrl);
    await transporter.sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: praticienEmail,
      subject: 'Un signalement a été déposé dans votre espace — Wellneuro',
      text:
        'Bonjour,\n\n' +
        'Un patient a déposé un signalement ou une demande dans votre espace Wellneuro.\n' +
        'Connectez-vous à votre tableau de bord pour le consulter (page « Confiance & droits »).\n\n' +
        'Cet email ne contient volontairement aucun détail.\n',
    });
  } catch (err) {
    console.error('[trust notification]', err instanceof Error ? err.message : String(err));
  }
}
