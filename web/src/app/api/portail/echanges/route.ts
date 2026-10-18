import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { mesEchangesOuvert } from '@/lib/portail/mesEchangesDrapeau';
import { sourcesMesEchanges } from '@/lib/portail/mesEchangesServeur';
import { entreesMesEchanges, type EntreeEchange } from '@/lib/portail/mesEchanges';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { statutAge } from '@/lib/patient/gardeAge';

// /api/portail/echanges — « Mes échanges » ([[D-293]], J3-base).
//
// LECTURE SEULE : aucune méthode d'écriture. Sert, pour le patient de la
// session, des espèces, des objets nommés, des dates et des chemins — jamais un
// contenu (le contenu reste aux pages qui le portent, avec leurs gardes).
//
// Drapeau fermé : 404, avant toute lecture de session — la surface n'existe pas.
// `?interrupteur=1` : le seul « ouvert », sans rien lire du dossier, pour le
// lien de la navigation (patron de `api/portail/lettre-adressage`).

export type PortailEchangesResponse =
  | { ok: true; ouvert: true; entrees?: EntreeEchange[] }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PortailEchangesResponse>({ ok: false, reason, error }, { status });
}

export async function GET(req: Request): Promise<NextResponse<PortailEchangesResponse>> {
  if (!mesEchangesOuvert()) return echec('desactive', 'Cette page n’est pas disponible.', 404);
  const auth = await authentifierPatientPortail(req);
  if (auth.erreur) return auth.erreur as NextResponse<PortailEchangesResponse>;

  // SURFACE NEUVE, SERVIE AU SEUL DOSSIER MAJEUR ([[D-283]] §5, [[D-284]] §3) :
  // mineur ou date de naissance manquante, ni page ni lien — même règle que les
  // conditions d'utilisation. 409 : la session est bonne, c'est le dossier qui
  // n'y a pas accès.
  if (statutAge(auth.patient.dateNaissance, Date.now()) !== 'majeur') {
    return echec('hors_majeur', 'Cette page n’est pas disponible pour votre dossier.', 409);
  }

  if (new URL(req.url).searchParams.get('interrupteur') === '1') {
    return NextResponse.json<PortailEchangesResponse>({ ok: true, ouvert: true });
  }

  try {
    const sources = await sourcesMesEchanges(auth.patient.idPatient);
    return NextResponse.json<PortailEchangesResponse>({ ok: true, ouvert: true, entrees: entreesMesEchanges(sources) });
  } catch (erreur) {
    console.error('[portail/echanges GET] lecture impossible :', ...classeEtCode(erreur));
    return echec('exception', 'Lecture impossible pour le moment.', 500);
  }
}
