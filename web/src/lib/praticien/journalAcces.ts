import { prisma } from '@/lib/prisma';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import type { AppEnvironment, LogContext } from '@/lib/observability/types';

// Journal des accès praticien aux dossiers nommés (G-TRUST-04, exigence 5).
//
// La table `journal_acces_dossiers` EST le journal : aucun log console de
// succès. On n'y écrit que le « qui / quel dossier / quand / par où » —
// idPatient, praticienEmail, gabarit de route, méthode — JAMAIS l'URL reçue,
// JAMAIS d'adresse IP, de user-agent, de payload ni de donnée clinique.
//
// Purge opportuniste, même patron que `tracer()` de /portail/google/retour :
// pas de tâche planifiée dans ce dépôt, la purge se fait à chaque écriture,
// sur les lignes sorties de la fenêtre de conservation.

/**
 * Fenêtre de conservation : 12 mois glissants (décision GD-2 du 2026-07-22,
 * alignée sur RETENTION_CONNEXIONS_GOOGLE_MS arbitrée le même jour — voir la
 * justification complète dans `googleIdentite.ts`). Constante applicative,
 * révisable sans migration.
 */
export const RETENTION_JOURNAL_ACCES_MS = 365 * 24 * 60 * 60 * 1000;

/** Les lignes antérieures à cet instant sont hors fenêtre de conservation. */
export function debutRetentionJournalAcces(maintenant: Date): Date {
  return new Date(maintenant.getTime() - RETENTION_JOURNAL_ACCES_MS);
}

export type AccesDossier = {
  idPatient: string;
  /** E-mail de session, minuscule — non nul par construction au verdict `accessible`. */
  praticienEmail: string;
  /** Gabarit littéral (`/api/praticien/...`), jamais l'URL reçue. */
  route: string;
  methode: string;
};

/** Part du gabarit fournie par la route appelante ; le reste vient de la garde. */
export type GabaritAcces = Pick<AccesDossier, 'route' | 'methode'>;

// Contexte de log SANS Request : la garde d'appartenance n'a pas accès à la
// requête. `LogContext` n'exige que environment/release/runtime — même
// fabrication manuelle que `instrumentation.ts`, précédent du dépôt.
// `route`/`method` portent le gabarit, littéral donc sans donnée sensible.
function contexteHorsRequete(acces: AccesDossier): LogContext {
  const vercelEnv = process.env.VERCEL_ENV;
  const environment: AppEnvironment =
    vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development'
      ? vercelEnv
      : process.env.NODE_ENV === 'production'
        ? 'production'
        : 'development';
  return {
    environment,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    runtime: process.env.NEXT_RUNTIME ?? 'nodejs',
    route: acces.route,
    method: acces.methode,
  };
}

/**
 * Écrit une ligne du journal d'accès puis purge les lignes hors fenêtre.
 * Awaitée par la garde (un handler serverless est tué à la réponse — un
 * fire-and-forget perdrait des traces), fail-open : un échec (écriture OU
 * purge) ne fait jamais échouer la consultation du dossier, mais il est
 * journalisé sous un code dédié — une trace perdue est alertable pour
 * elle-même.
 *
 * Pas de `.catch()` local sur la purge, délibérément : le try/catch englobant
 * la fait échouer sans bloquer ET la journalise. Un `.catch()` muet avalerait
 * l'échec que TRACE_ECHEC existe pour signaler.
 */
export async function journaliserAccesDossier(acces: AccesDossier): Promise<void> {
  try {
    const maintenant = new Date();
    await prisma.journalAccesDossier.create({
      data: {
        idPatient: acces.idPatient,
        praticienEmail: acces.praticienEmail,
        route: acces.route,
        methode: acces.methode,
      },
    });
    await prisma.journalAccesDossier.deleteMany({
      where: { creeLe: { lt: debutRetentionJournalAcces(maintenant) } },
    });
  } catch (err) {
    logger.error({
      event: EVENT_CODES.PRATICIEN_ACCES_DOSSIER_TRACE_ECHEC,
      domain: 'PRATICIEN',
      message: 'Échec de tenue du journal des accès praticien (écriture ou purge)',
      context: contexteHorsRequete(acces),
      error: err,
    });
  }
}
