import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { depotDocumentsOuvert } from '@/lib/collecte/drapeau';
import { estCategorieDocument, estMotifRetrait } from '@/lib/collecte/documentsDeposes';
import {
  classerDocument,
  listerDocumentsPraticien,
  retirerDocument,
  type DocumentDeposeLu,
} from '@/lib/collecte/documentsDeposesServeur';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// « DOCUMENTS DÉPOSÉS PAR LE PATIENT » — route PRATICIEN ([[D-330]], J3-collecte).
//
// - GET ?idPatient= : la liste du dossier, SANS le document (jamais `contenu`) :
//   catégorie proposée et courante, corrections datées, dépôt, première
//   consultation, retrait et son motif. Lecture d'un dossier : journalisée.
//   `ouvert` dit si la surface patient l'est — l'écran se tait sur un dossier
//   sans dépôt tant qu'elle est fermée.
// - POST { idPatient, idDocument, geste: 'classer', categorie } : corrige la
//   catégorie (une ligne datée de plus).
// - POST { idPatient, idDocument, geste: 'retirer', motif } : efface le contenu,
//   garde la ligne (motif `depot_par_erreur` ou `demande_droit`, sans désigner la
//   demande traitée — arbitrage 7). Écritures attribuées par `classe_par` /
//   `retire_par` : non journalisées comme lectures (patron de l'écart, D-118).
//
// Seul le praticien du dossier : la base le refuse aussi, sans égard à la casse.
// Une erreur ne se journalise que par sa classe et son code ([[D-330]] §4).

const ID = /^[A-Za-z0-9_-]{1,64}$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/documents-deposes';

export type DocumentsDeposesResponse =
  | { ok: true; ouvert: boolean; documents: DocumentDeposeLu[] }
  | { ok: false; reason: string; error: string };

export type GesteDocumentDeposeResponse =
  | { ok: true; modifie?: boolean }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

type Garde = { ok: true; email: string } | { ok: false; reponse: NextResponse };

async function garder(idPatient: string, journaliser: boolean): Promise<Garde> {
  const session = await getServerSession(authOptions);
  if (!session) return { ok: false, reponse: echec('unauthenticated', 'Authentification requise.', 401) };
  if (!ID.test(idPatient)) return { ok: false, reponse: echec('invalid', 'Identifiant patient invalide.', 400) };
  const email = emailPraticien(session);
  const verdict = await verifierAppartenancePatient(
    idPatient,
    email,
    journaliser ? { route: ROUTE_JOURNAL, methode: 'GET' } : undefined,
  );
  if (verdict === 'introuvable') return { ok: false, reponse: echec('patient_not_found', 'Patient introuvable.', 404) };
  if (verdict === 'autre_praticien' || !email) {
    return { ok: false, reponse: echec('forbidden', 'Patient non accessible pour ce praticien.', 403) };
  }
  return { ok: true, email };
}

export async function GET(req: Request) {
  try {
    const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
    const garde = await garder(idPatient, true);
    if (!garde.ok) return garde.reponse;
    const documents = await listerDocumentsPraticien(idPatient);
    return NextResponse.json<DocumentsDeposesResponse>({ ok: true, ouvert: depotDocumentsOuvert(), documents });
  } catch (err) {
    console.error('[praticien/documents-deposes GET] refus :', ...classeEtCode(err));
    return echec('server_error', 'Les documents déposés n’ont pas pu être lus.', 500);
  }
}

const MESSAGES_GESTE: Record<string, [string, number]> = {
  document_introuvable: ['Ce document est introuvable dans ce dossier.', 404],
  document_retire: ['Ce document a été retiré : il ne se classe plus.', 409],
  document_deja_retire: ['Ce document est déjà retiré.', 409],
};

export async function POST(req: Request) {
  try {
    let corps: Record<string, unknown>;
    try {
      const lu: unknown = await req.json();
      if (!lu || typeof lu !== 'object' || Array.isArray(lu)) throw new Error('corps');
      corps = lu as Record<string, unknown>;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const idPatient = typeof corps.idPatient === 'string' ? corps.idPatient.trim() : '';
    const idDocument = typeof corps.idDocument === 'string' ? corps.idDocument.trim() : '';
    const garde = await garder(idPatient, false);
    if (!garde.ok) return garde.reponse;
    if (!ID.test(idDocument)) return echec('invalid', 'Document mal désigné.', 400);

    let issue: Awaited<ReturnType<typeof classerDocument>> | Awaited<ReturnType<typeof retirerDocument>>;
    if (corps.geste === 'classer') {
      if (!estCategorieDocument(corps.categorie)) return echec('invalid', 'Catégorie inconnue.', 400);
      issue = await classerDocument({ idPatient, idDocument, categorie: corps.categorie, praticienEmail: garde.email });
    } else if (corps.geste === 'retirer') {
      if (!estMotifRetrait(corps.motif)) return echec('invalid', 'Motif de retrait inconnu.', 400);
      issue = await retirerDocument({ idPatient, idDocument, motif: corps.motif, praticienEmail: garde.email });
    } else {
      return echec('invalid', 'Geste inconnu.', 400);
    }

    if (!issue.ok) {
      const [message, status] = MESSAGES_GESTE[issue.reason];
      return echec(issue.reason, message, status);
    }
    return NextResponse.json<GesteDocumentDeposeResponse>({ ok: true, ...('modifie' in issue ? { modifie: issue.modifie } : {}) });
  } catch (err) {
    console.error('[praticien/documents-deposes POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Le geste n’a pas pu être enregistré.', 500);
  }
}
