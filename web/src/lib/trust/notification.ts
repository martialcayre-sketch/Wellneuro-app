import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { prisma } from '@/lib/prisma';

/** Fenêtre de l'e-mail praticien des signalements : l'heure CIVILE en cours ([[D-328]]). */
export const FENETRE_COURRIEL_SIGNALEMENT_MS = 60 * 60 * 1000;

/**
 * Début de l'heure civile en cours. PAS une heure glissante : comptée sur les
 * soixante minutes précédentes, une suite de dépôts espacés de moins d'une
 * heure ferait taire TOUS les e-mails après le premier, sans borne de temps
 * (revue `wn-reviewer` du 2026-10-18). L'heure civile garantit au moins un
 * e-mail par heure où le dossier dépose. Paris est décalé d'heures entières :
 * tronquer en UTC tronque aussi à l'heure de Paris.
 */
export function debutHeureCivile(maintenant: Date): Date {
  return new Date(Math.floor(maintenant.getTime() / FENETRE_COURRIEL_SIGNALEMENT_MS) * FENETRE_COURRIEL_SIGNALEMENT_MS);
}

/**
 * Ce dossier n'a-t-il déposé AUCUN signalement depuis le début de l'heure ? Appelée
 * AVANT d'écrire le signalement : seul le premier de l'heure prévient le
 * praticien par e-mail, les suivants s'enregistrent et se lisent dans
 * « Confiance & droits » ([[D-328]]). Les trois natures comptent ensemble :
 * l'e-mail est le même pour toutes.
 *
 * Compter AVANT et non après l'écriture : deux dépôts simultanés voient alors
 * chacun zéro et envoient chacun leur e-mail — un doublon, bénin. Compter
 * après ferait voir à chacun l'autre, et AUCUN e-mail ne partirait.
 *
 * EN ÉCHEC, ON PRÉVIENT : une lecture qui échoue rend `true`. Un e-mail de
 * trop vaut mieux qu'un signalement que le praticien n'apprend pas.
 */
export async function premierSignalementDeLHeure(idPatient: string, maintenant: Date = new Date()): Promise<boolean> {
  const where = { idPatient, soumisLe: { gte: debutHeureCivile(maintenant) } };
  try {
    const comptes = await Promise.all([
      prisma.trustAdverseEffectReport.count({ where }),
      prisma.trustPrivacyIncident.count({ where }),
      prisma.trustRightsRequest.count({ where }),
    ]);
    return comptes.every((compte) => compte === 0);
  } catch (err) {
    console.error('[trust notification] lecture de la cadence', err instanceof Error ? err.message : String(err));
    return true;
  }
}

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
    const transporter = creerTransportSmtp(smtpUrl);
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
