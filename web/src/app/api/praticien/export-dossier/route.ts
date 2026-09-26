import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { assemblerDossierExport, nomFichierExport } from '@/lib/export-dossier/assembler';
import { estVersionExport, type VersionExport } from '@/lib/export-dossier/modele';
import { rendrePdf } from '@/lib/export-dossier/pdf';

// Export PDF du dossier patient (D-252) — LECTURE SEULE, téléchargement direct.
// La version par défaut est la version pseudonymisée : un paramètre oublié ne
// doit jamais faire sortir l'identité du patient.

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/export-dossier';

export type ExportDossierErreur = {
  ok: false;
  reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception';
  error: string;
};

// GET /api/praticien/export-dossier?idPatient=PAT001&version=ia-externe|complete
export async function GET(req: Request): Promise<Response> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json<ExportDossierErreur>(
      { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json<ExportDossierErreur>(
      { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
      { status: 400 },
    );
  }

  const versionDemandee = searchParams.get('version');
  if (versionDemandee !== null && !estVersionExport(versionDemandee)) {
    return NextResponse.json<ExportDossierErreur>(
      { ok: false, reason: 'invalid', error: 'Version d’export invalide : « ia-externe » ou « complete » attendue.' },
      { status: 400 },
    );
  }
  const version: VersionExport = versionDemandee ?? 'ia-externe';

  try {
    const praticienEmail = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, praticienEmail, {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json<ExportDossierErreur>(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (appartenance === 'autre_praticien' || !praticienEmail) {
      return NextResponse.json<ExportDossierErreur>(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const maintenant = new Date();
    const document = await assemblerDossierExport({ idPatient, praticienEmail, version, maintenant });
    if (!document) {
      return NextResponse.json<ExportDossierErreur>(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    const pdf = await rendrePdf(document, { maintenant });

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${nomFichierExport(idPatient, version, maintenant)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[praticien/export-dossier GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json<ExportDossierErreur>(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
