import { prisma } from '@/lib/prisma';
import { journaliserAccesDossier, type GabaritAcces } from './journalAcces';

// Garde d'appartenance praticien — factorisation du contrôle déjà appliqué
// par `boussole`, `ja/activation`, `ja/observations`, `protocoles/versions` et
// `protocoles/diffusion`, étendu aux routes qui s'en passaient.
//
// Le dépôt fonctionne sous « hypothèse mono-praticien » : tous les patients de
// production portent aujourd'hui le même `praticienEmail`, si bien que ces
// gardes sont des **no-op vérifiables** — elles ne changent rien à l'usage
// courant et rendent les routes sûres par construction si un second compte
// praticien apparaît un jour.
//
// La comparaison est insensible à la casse : `praticienEmail` est stocké en
// minuscules à la création (`api/praticien/patients`), mais rien ne le garantit
// pour une ligne héritée.

/** E-mail du praticien en session, normalisé. `null` si absent. */
export function emailPraticien(session: { user?: { email?: string | null } | null } | null): string | null {
  const email = session?.user?.email;
  return typeof email === 'string' && email.length > 0 ? email.toLowerCase() : null;
}

/**
 * Filtre Prisma scopant une requête sur `patients` au praticien en session.
 * Insensible à la casse pour tolérer une ligne héritée non normalisée.
 */
export function filtrePatientsDuPraticien(email: string) {
  return { praticienEmail: { equals: email, mode: 'insensitive' as const } };
}

export type VerdictAppartenance = 'accessible' | 'introuvable' | 'autre_praticien';

/**
 * Vérifie qu'un patient existe ET appartient au praticien en session.
 * Distingue les deux échecs pour que chaque route conserve le code HTTP
 * qu'elle exposait déjà (404 sur absence, 403 sur appartenance).
 *
 * `acces` (G-TRUST-04, exigence 5) : fourni par les GET « dossier nommé »,
 * il fait journaliser la lecture dans `journal_acces_dossiers` — si et
 * seulement si le verdict est `accessible` (une ligne de refus nommerait un
 * dossier qui n'a PAS été lu) et jamais à l'insu d'une route qui n'a pas
 * opté (POST, listes). Un seul site par handler porte `acces`, sinon la même
 * lecture serait journalisée deux fois. Écriture awaitée, fail-open (GD-4).
 */
export async function verifierAppartenancePatient(
  idPatient: string,
  emailSession: string | null,
  acces?: GabaritAcces,
): Promise<VerdictAppartenance> {
  const patient = await prisma.patient.findUnique({
    where: { idPatient },
    select: { praticienEmail: true },
  });
  if (!patient) return 'introuvable';
  if (!emailSession) return 'autre_praticien';
  if (patient.praticienEmail.toLowerCase() !== emailSession) return 'autre_praticien';
  if (acces) {
    await journaliserAccesDossier({ idPatient, praticienEmail: emailSession, ...acces });
  }
  return 'accessible';
}
