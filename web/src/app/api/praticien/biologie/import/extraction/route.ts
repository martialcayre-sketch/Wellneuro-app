import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { garderImport } from '@/lib/biology-library/import/garde';
import { lancerExtraction } from '@/lib/biology-library/import/lancerExtraction';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Lance l'extraction d'un compte rendu déposé (BIO-INGEST LOT-02, [[D-256]]
// A4) : le document part ENTIER chez Anthropic. Synchrone — la réponse dit
// l'issue (lignes relevées, ou échec et son motif fermé). Une nouvelle
// extraction du même document crée un nouvel import ; les précédents restent.

export const runtime = 'nodejs';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

const MESSAGES: Record<string, string> = {
  compte_rendu_introuvable: 'Ce compte rendu est introuvable dans ce dossier.',
  extraction_en_cours: 'Une extraction est déjà en cours sur ce compte rendu.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

export async function POST(req: Request) {
  try {
    let body: { idPatient?: unknown; idCompteRendu?: unknown };
    try {
      body = (await req.json()) as typeof body;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    const garde = await garderImport(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);

    const idCompteRendu = typeof body.idCompteRendu === 'string' ? body.idCompteRendu.trim() : '';
    if (!ID.test(idCompteRendu)) return echec('invalid', 'Compte rendu mal désigné.', 400);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);

    const issue = await lancerExtraction({ idPatient, idCompteRendu, lancePar: garde.email });
    if (!issue.ok) {
      if (issue.reason === 'server_error') return echec('server_error', 'Erreur technique.', 500);
      const status = issue.reason === 'compte_rendu_introuvable' ? 404 : 409;
      return echec(issue.reason, MESSAGES[issue.reason], status);
    }
    return NextResponse.json(issue, { status: 201 });
  } catch (err) {
    console.error('[praticien/biologie/import/extraction POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
