import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { type SyntheseSchema } from '@/lib/anthropic';
import { blocsDepuisSynthese, STATUTS_SYNTHESE_VALIDES, type StatutSyntheseSource } from '@/lib/documents';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { logger } from '@/lib/observability/logger';
import {
  createRequestContext,
  finalizeLogContext,
  withCorrelationHeader,
} from '@/lib/observability/requestContext';

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/documents';

// GET /api/praticien/documents?idSynthese=SYN...
// C3 (composition documentaire multi-destinataires). Compose CÔTÉ SERVEUR les blocs
// d'un document à partir d'une synthèse VALIDÉE (le `versionPrompt` et le nom patient
// ne sont accessibles qu'ici, pas dans le payload de GET /api/praticien/synthese).
// Lecture seule, aucune écriture, aucune migration. Le field-filter par destinataire
// est appliqué en aval (domaine `lib/documents`) au rendu.
export async function GET(req: Request) {
  const requestContext = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  const { searchParams } = new URL(req.url);
  const idSynthese = (searchParams.get('idSynthese') ?? '').trim();
  if (!idSynthese) {
    return withCorrelationHeader(NextResponse.json({ error: 'idSynthese requis.' }, { status: 400 }), requestContext);
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return withCorrelationHeader(NextResponse.json({ error: 'Non authentifié.' }, { status: 401 }), requestContext);
  }

  try {
    // Garde d'appartenance par la relation patient : la synthèse d'un patient
    // d'un autre praticien est introuvable, et non « non validée » — la
    // distinction renseignerait sur son existence et son état.
    const synthese = await prisma.syntheseIA.findFirst({
      where: { idSynthese, patient: filtrePatientsDuPraticien(emailSession) },
    });
    if (!synthese) {
      return withCorrelationHeader(NextResponse.json({ error: 'Synthèse introuvable.' }, { status: 404 }), requestContext);
    }

    // La synthèse résolue et scopée nomme le dossier ; journalisé AVANT le
    // 422 — au refus « non validée », la synthèse a bien été lue.
    await journaliserAccesDossier({ idPatient: synthese.idPatient, praticienEmail: emailSession, route: ROUTE_JOURNAL, methode: 'GET' });

    const statut = synthese.statut as StatutSyntheseSource;
    if (!STATUTS_SYNTHESE_VALIDES.includes(statut)) {
      return withCorrelationHeader(
        NextResponse.json(
          { error: 'La synthèse doit être validée par le praticien avant de composer un document.' },
          { status: 422 },
        ),
        requestContext,
      );
    }

    const patient = await prisma.patient.findUnique({ where: { idPatient: synthese.idPatient } });
    const patientNom = patient ? `${patient.prenom} ${patient.nom}` : '';
    const dateDocument = (synthese.dateValidation ?? synthese.dateGeneration).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });

    const blocs = blocsDepuisSynthese({
      syntheseJson: synthese.syntheseJson as unknown as SyntheseSchema,
      statut,
      versionPrompt: synthese.versionPrompt,
      dateValidation: synthese.dateValidation ? synthese.dateValidation.toISOString() : null,
    });

    return withCorrelationHeader(
      NextResponse.json({ ok: true, patientNom, dateDocument, statut, blocs }),
      requestContext,
    );
  } catch (err) {
    logger.error({
      event: EVENT_CODES.DOCUMENT_COMPOSE_EXCEPTION,
      domain: 'PRATICIEN',
      message: 'Échec composition document C3',
      context: finalizeLogContext(requestContext, { statusCode: 500, retryable: true }),
      error: err,
    });
    return withCorrelationHeader(NextResponse.json({ error: 'Erreur lors de la composition du document.' }, { status: 500 }), requestContext);
  }
}
