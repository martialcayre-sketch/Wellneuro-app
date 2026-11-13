import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { assemblerDossierExport, nomFichierExport } from '@/lib/export-dossier/assembler';
import { estVersionExport, type VersionExport } from '@/lib/export-dossier/modele';
import { rendrePdf } from '@/lib/export-dossier/pdf';
import { lireSecretPseudonyme, pseudonymeExport } from '@/lib/export-dossier/pseudonyme';

// Export PDF du dossier patient (D-252) — LECTURE SEULE, téléchargement direct.
// La version par défaut est la version pseudonymisée : un paramètre oublié ne
// doit jamais faire sortir l'identité du patient.

// Gabarits littéraux pour le journal des accès (G-TRUST-04) — jamais l'URL
// reçue. Un par version (revue de sécurité du 2026-11-12, P2-1) : le journal
// dit si l'identité est sortie du dossier. La version est validée avant, et
// seule l'une de ces deux chaînes peut être écrite.
const ROUTE_JOURNAL: Record<VersionExport, string> = {
  'ia-externe': '/api/praticien/export-dossier?version=ia-externe',
  complete: '/api/praticien/export-dossier?version=complete',
};

export type ExportDossierErreur = {
  ok: false;
  reason:
    | 'unauthenticated'
    | 'invalid'
    | 'patient_not_found'
    | 'forbidden'
    | 'pseudonymisation_indisponible'
    | 'exception';
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

  // [[D-512]] §1 : sans secret serveur, pas de pseudonyme — l'export pseudonymisé
  // échoue franchement, avant toute lecture du dossier, plutôt que de laisser
  // sortir l'identifiant interne ou de pousser vers la version complète.
  const secret = version === 'ia-externe' ? lireSecretPseudonyme() : null;
  if (version === 'ia-externe' && !secret) {
    console.error('[praticien/export-dossier GET] secret de pseudonymisation absent ou trop court');
    return NextResponse.json<ExportDossierErreur>(
      {
        ok: false,
        reason: 'pseudonymisation_indisponible',
        error: 'Export pseudonymisé indisponible : la pseudonymisation n’est pas configurée sur le serveur.',
      },
      { status: 503 },
    );
  }

  try {
    const praticienEmail = emailPraticien(session);
    const appartenance = await verifierAppartenancePatient(idPatient, praticienEmail, {
      route: ROUTE_JOURNAL[version],
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
    const pseudonyme = secret ? pseudonymeExport(idPatient, secret) : null;
    const document = await assemblerDossierExport({ idPatient, praticienEmail, version, maintenant, pseudonyme });
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
        'Content-Disposition': `attachment; filename="${nomFichierExport(pseudonyme ?? idPatient, version, maintenant)}"`,
        'Cache-Control': 'no-store',
        // [[D-512]] §1 : le tiroir affiche le pseudonyme au praticien.
        ...(pseudonyme ? { 'X-Pseudonyme-Export': pseudonyme } : {}),
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
