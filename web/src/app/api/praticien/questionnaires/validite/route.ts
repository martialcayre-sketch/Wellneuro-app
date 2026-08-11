import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { champsInvalidation, validerDemandeInvalidation } from '@/lib/scoring/invalidation';
import { validitePassationsActive } from '@/lib/scoring/validite';

// POST /api/praticien/questionnaires/validite — retire une passation du
// raisonnement clinique, ou l'y rétablit (LOT-00, campagne « chaîne T0 »).
//
// FERMÉE TANT QUE LE FILTRE EST ÉTEINT. Sans `WN_ENABLE_VALIDITE_PASSATIONS`,
// invalider n'aurait aucun effet sur la synthèse, l'orientation ni l'équilibre :
// l'écran promettrait un retrait que rien n'applique. Mieux vaut une porte
// close qu'une promesse creuse — 503 explicite, message en français.
//
// La passation n'est jamais supprimée ni vidée : seul son statut change, avec
// la trace de qui l'a posé, quand et pourquoi. Le registre des passations non
// interprétables (`lib/scoring/passationsNonInterpretables.ts`) reste distinct
// et ne passe pas par ici — il dit « le résultat n'est pas une mesure », pas
// « cette passation ne compte pas ».

export type ValiditeApiResponse =
  | { ok: true; idReponse: string; statutValidite: string }
  | { ok: false; reason: string; error: string };

// Gabarit littéral, jamais l'URL reçue (contrat du journal d'accès).
const ROUTE_JOURNAL = '/api/praticien/questionnaires/validite';

type PostBody = {
  idPatient?: string;
  idReponse?: string;
  statutDemande?: unknown;
  motif?: unknown;
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ValiditeApiResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<ValiditeApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    if (!validitePassationsActive()) {
      return echec(
        'validite_inactive',
        "La validité des passations n'est pas encore active sur cet environnement.",
        503,
      );
    }

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = (body.idPatient ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }
    const idReponse = (body.idReponse ?? '').trim();
    if (!idReponse || !/^[A-Za-z0-9_-]+$/.test(idReponse) || idReponse.length > 64) {
      return echec('invalid', 'Identifiant de passation invalide.', 400);
    }

    const verdict = validerDemandeInvalidation({ statutDemande: body.statutDemande, motif: body.motif });
    if (!verdict.ok) return echec(verdict.raison, verdict.message, 400);

    const email = emailPraticien(session);
    // Une session sans e-mail ne peut pas signer une invalidation : `invalidePar`
    // serait vide, et la trace ne dirait plus qui a retiré la passation.
    if (!email) return echec('unauthenticated', 'Session praticien incomplète.', 401);

    const appartenance = await verifierAppartenancePatient(idPatient, email);
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    // La passation doit appartenir au patient annoncé : sans ce test, l'identifiant
    // de patient ne serait qu'un laissez-passer et n'importe quelle passation du
    // cabinet pourrait être visée depuis un dossier légitime.
    const reponse = await prisma.questionnaireReponse.findUnique({
      where: { idReponse },
      select: { idPatient: true, statutValidite: true },
    });
    if (!reponse || reponse.idPatient !== idPatient) {
      return echec('reponse_not_found', 'Passation introuvable pour ce patient.', 404);
    }

    const champs = champsInvalidation(verdict, email, new Date());
    if (reponse.statutValidite === champs.statutValidite) {
      // Idempotence : rien à écrire, et surtout pas un nouvel horodatage qui
      // ferait croire à un second geste.
      return NextResponse.json<ValiditeApiResponse>({
        ok: true,
        idReponse,
        statutValidite: reponse.statutValidite,
      });
    }

    await prisma.questionnaireReponse.update({ where: { idReponse }, data: champs });
    await journaliserAccesDossier({
      idPatient,
      praticienEmail: email,
      route: ROUTE_JOURNAL,
      methode: 'POST',
    });

    return NextResponse.json<ValiditeApiResponse>({
      ok: true,
      idReponse,
      statutValidite: champs.statutValidite,
    });
  } catch {
    return echec('unavailable', 'Service temporairement indisponible.', 503);
  }
}
