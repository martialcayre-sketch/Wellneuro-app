import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { garderImport } from '@/lib/biology-library/import/garde';
import { deciderLignes } from '@/lib/biology-library/import/decisions';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Décisions du praticien sur les lignes d'une extraction (BIO-INGEST LOT-02,
// [[D-256]] A3/A5) : valider (crée le résultat) ou écarter (avec motif). Le
// seul chemin d'un import vers `resultats_biologiques`. Tout ou rien.
// Corps : `{ idPatient, idImport, decisions: [...] }`.
//
// PAS de journal d'accès : dispense d'écriture GD-1 ([[D-118]]) — `saisi_par`,
// `traite_par` et leurs dates attribuent déjà chaque écriture.

export const runtime = 'nodejs';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

function echec(reason: string, error: string, status: number, lignes?: unknown) {
  return NextResponse.json(lignes ? { ok: false, reason, error, lignes } : { ok: false, reason, error }, { status });
}

export async function POST(req: Request) {
  try {
    let body: { idPatient?: unknown; idImport?: unknown; decisions?: unknown };
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

    const idImport = typeof body.idImport === 'string' ? body.idImport.trim() : '';
    if (!ID.test(idImport)) return echec('invalid', 'Extraction mal désignée.', 400);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);

    const issue = await deciderLignes({ idPatient, idImport, traitePar: garde.email, decisions: body.decisions });
    if (!issue.ok) return echec(issue.reason, issue.error, issue.status, issue.lignes);
    return NextResponse.json(issue, { status: 201 });
  } catch (err) {
    console.error('[praticien/biologie/import/decisions POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
