import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  evaluerPortesBiologiquesPourPatient,
  portesBiologiquesActives,
  type PorteBiologiqueLue,
} from '@/lib/clinical/portesBiologiquesService';

// CE QUE LES SOURCES DISENT ET CE QUE LE DOSSIER MESURE — LECTURE SEULE
// ([[D-245]], [[D-246]], LOT-03 du chantier 6).
//
// Enveloppeur HTTP et rien d'autre, sur le patron de la route voisine des
// indications : session, entrée, VERROU AVANT L'APPARTENANCE — qui journalise
// l'accès au dossier (G-TRUST-04) : verrou fermé, aucune ligne n'est écrite pour
// une lecture qui n'a pas eu lieu. Aucun POST : rien ne s'écrit au dossier.

const ROUTE_JOURNAL = '/api/praticien/assiettes-indiquees/portes-biologiques';

export type PortesBiologiquesApiResponse =
  | { ok: true; actif: false; message: string }
  | {
      ok: true;
      actif: true;
      shaPerimetre: string;
      corpusLu: boolean;
      retireesFauteDeClaim: number;
      /** VIDE, JAMAIS ABSENT (`DC-24`). */
      portes: PorteBiologiqueLue[];
    }
  | {
      ok: false;
      reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception';
      error: string;
    };

// GET /api/praticien/assiettes-indiquees/portes-biologiques?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<PortesBiologiquesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
      { status: 400 },
    );
  }

  try {
    if (!portesBiologiquesActives()) {
      return NextResponse.json({ ok: true, actif: false, message: 'Lecture biologique des assiettes non activée.' });
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const resultat = await evaluerPortesBiologiquesPourPatient(idPatient);
    if (!resultat.actif) {
      return NextResponse.json({ ok: true, actif: false, message: resultat.message });
    }
    return NextResponse.json({ ok: true, ...resultat });
  } catch (err) {
    console.error('[portes-biologiques] lecture impossible', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Lecture impossible de la biologie des assiettes.' },
      { status: 500 },
    );
  }
}
