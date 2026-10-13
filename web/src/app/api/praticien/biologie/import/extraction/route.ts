import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { garderImport } from '@/lib/biology-library/import/garde';
import { demanderExtraction } from '@/lib/biology-library/import/fileExtraction';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Demande la lecture d'un compte rendu déposé (BIO-INGEST LOT-02, [[D-256]]
// A4) : le document part ENTIER chez Anthropic. PAR LA FILE DURABLE
// ([[D-282]], G3) : la route écrit un travail `en_attente` (sans import) et
// rend 202 ; le processus de fond le réclame, ouvre l'import et lit — trois
// pages durent ~36 s (mesure du 2026-10-02), au-delà de la fenêtre de 30 s du
// routeur Scalingo. L'écran relit le compte rendu jusqu'à l'issue. Une
// nouvelle lecture du même document crée un nouvel import ; les précédents
// restent. Refus jugés avant d'enfiler : `ligne_validee` dès qu'une ligne d'un
// import de ce compte rendu est validée (LOT-09), `lecture_demandee` pour une
// lecture déjà en file ou en reprise (409).
//
// Le chemin `after()` dans le processus web est retiré au lot 5 de [[D-282]],
// après une première lecture réussie par la file (2026-10-13) : il n'en reste
// qu'un, et le drapeau de bascule `WN_BIO_EXTRACTION_ASYNC` n'est plus lu.

export const runtime = 'nodejs';

const ID = /^[A-Za-z0-9_-]{1,64}$/;

const MESSAGES: Record<string, string> = {
  compte_rendu_introuvable: 'Ce compte rendu est introuvable dans ce dossier.',
  extraction_en_cours: 'Une extraction est déjà en cours sur ce compte rendu.',
  lecture_demandee:
    'Une lecture de ce compte rendu est déjà demandée, en attente ou en reprise : l’écran en suit l’issue.',
  document_purge: 'Le document de ce compte rendu a été effacé : il ne peut plus être relu.',
  ligne_validee:
    'Une ligne de ce compte rendu a déjà été validée : il ne peut plus être relu, rien de ce qui est enregistré n’est remplacé.',
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

    const demande = await demanderExtraction({ idPatient, idCompteRendu, demandePar: garde.email });
    if (!demande.ok) {
      const status = demande.reason === 'compte_rendu_introuvable' ? 404 : 409;
      return echec(demande.reason, MESSAGES[demande.reason], status);
    }
    return NextResponse.json({ ok: true, idTravail: demande.idTravail, statut: 'en_attente' }, { status: 202 });
  } catch (err) {
    console.error('[praticien/biologie/import/extraction POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
