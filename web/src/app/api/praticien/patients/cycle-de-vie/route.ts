import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { effacerDossier } from '@/lib/patient/effacement';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';

// POST /api/praticien/patients/cycle-de-vie — fin de parcours d'un dossier.
//
// DEUX ACTIONS QUI NE SE RESSEMBLENT PAS :
//
// - `cloture` / `reprise` — réversibles. Le dossier reste, le patient garde sa
//   LECTURE ; seuls les envois et assignations cessent.
// - `effacement` — irréversible. Les données partent. C'est l'exécution du
//   droit que l'application promet déjà au patient
//   (`lib/trust/contenus/registre.ts`) et qu'aucun code ne savait honorer.
//
// Les confirmations d'interface sont l'affaire du LOT-01b. Cette route ne s'en
// remet pas à elles : `effacement` exige `confirmation: 'EFFACER'` dans le
// corps, pour qu'un appel direct mal formé ne détruise rien.

export type CycleDeVieAction = 'cloture' | 'reprise' | 'effacement';

export type CycleDeVieResponse =
  | { success: true; action: CycleDeVieAction; lignesSupprimees?: number }
  | { success: false; reason: string; error: string };

const ACTIONS: CycleDeVieAction[] = ['cloture', 'reprise', 'effacement'];
const CONFIRMATION_EFFACEMENT = 'EFFACER';

export async function POST(req: Request): Promise<NextResponse<CycleDeVieResponse>> {
  const contexte = createRequestContext(req);

  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }

  let payload: { idPatient?: string; action?: string; confirmation?: string };
  try {
    payload = (await req.json()) as typeof payload;
  } catch {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'JSON invalide.' },
      { status: 400 },
    );
  }

  const idPatient = (payload.idPatient ?? '').trim();
  const action = (payload.action ?? '') as CycleDeVieAction;

  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || !ACTIONS.includes(action)) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Dossier ou action invalide.' },
      { status: 400 },
    );
  }

  // Même garde et mêmes codes que les 30 autres routes praticien : 404 sur
  // absence, 403 sur appartenance — les deux ne se confondent pas.
  const verdict = await verifierAppartenancePatient(idPatient, emailSession);
  if (verdict === 'introuvable') {
    return NextResponse.json(
      { success: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
      { status: 404 },
    );
  }
  if (verdict === 'autre_praticien') {
    return NextResponse.json(
      { success: false, reason: 'forbidden', error: 'Patient non accessible.' },
      { status: 403 },
    );
  }

  try {
    if (action === 'effacement') {
      // Le geste délibéré est exigé PAR LE SERVEUR. Une confirmation qui ne
      // vivrait que dans l'écran se contournerait par un appel direct — le
      // dépôt en a déjà fait les frais (#181).
      if (payload.confirmation !== CONFIRMATION_EFFACEMENT) {
        return NextResponse.json(
          {
            success: false,
            reason: 'confirmation_manquante',
            error: 'Effacement non confirmé : action sans effet.',
          },
          { status: 400 },
        );
      }

      const resultat = await effacerDossier(idPatient);
      const lignesSupprimees = Object.values(resultat.supprimees).reduce((a, b) => a + b, 0);

      // Journalisé sans identité : ni idPatient, ni résidu. La trace durable de
      // l'effacement est la ligne `dossiers_effaces`, pas un log purgeable.
      logger.security({
        event: EVENT_CODES.DOSSIER_EFFACE,
        domain: 'SECURITY',
        message: `Effacement de dossier exécuté (${lignesSupprimees} lignes)`,
        context: finalizeLogContext(contexte, { statusCode: 200, retryable: false }),
      });

      return NextResponse.json({ success: true, action, lignesSupprimees });
    }

    await prisma.patient.updateMany({
      where: { idPatient },
      data: { suiviClotureLe: action === 'cloture' ? new Date() : null },
    });

    logger.security({
      event: EVENT_CODES.DOSSIER_SUIVI_CLOTURE,
      domain: 'SECURITY',
      message: action === 'cloture' ? 'Suivi clôturé' : 'Suivi rouvert',
      context: finalizeLogContext(contexte, { statusCode: 200, retryable: false }),
    });

    return NextResponse.json({ success: true, action });
  } catch (err) {
    logger.error({
      event: EVENT_CODES.DOSSIER_CYCLE_DE_VIE_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec d’une action de cycle de vie',
      context: finalizeLogContext(contexte, { statusCode: 500, retryable: true }),
      error: err,
    });
    return NextResponse.json(
      { success: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
