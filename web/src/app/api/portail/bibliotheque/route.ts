import { NextResponse } from 'next/server';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { bibliothequeOuverte, bibliothequeServie } from '@/lib/portail/bibliothequeDrapeau';
import { lectureFichesOuverte } from '@/lib/fiches-assiette/drapeau';
import { aDesFichesRemises } from '@/lib/fiches-assiette/servicePatient';

// /api/portail/bibliotheque — « Ma bibliothèque » ([[D-357]], lettre ap).
//
// LECTURE SEULE, ET SANS CONTENU : la route dit si la bibliothèque est servie
// au dossier de la session et quels rayons ont quelque chose à montrer. Les
// documents se lisent par la route qui les porte, avec ses gardes (les fiches
// d'assiette : `api/portail/fiches-assiette`).
//
// Drapeau fermé : 404, avant toute lecture de session — la surface n'existe
// pas. Dossier mineur ou sans date de naissance : 409 ([[D-357]] §5).
//
// LE CONTENANT SEUL ([[D-357]] §2) : le rayon des documents remis porte les
// fiches d'assiette déjà remises, sous leur propre drapeau de lecture ; le
// socle commun n'a encore aucun document, il ne se déclare pas. Un rayon vide
// ne s'affiche pas.

export type PortailBibliothequeResponse =
  | { ok: true; ouvert: true; fichesRemises: boolean }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PortailBibliothequeResponse>({ ok: false, reason, error }, { status });
}

export async function GET(req: Request): Promise<NextResponse<PortailBibliothequeResponse>> {
  if (!bibliothequeOuverte()) return echec('desactive', 'Cette page n’est pas disponible.', 404);

  // L'authentification DANS le `try` : elle lit la base (même motif que
  // `api/portail/fiches-assiette`).
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailBibliothequeResponse>;

    // 409 : la session est bonne, c'est le dossier qui n'y a pas accès.
    if (!bibliothequeServie(auth.patient.dateNaissance, Date.now())) {
      return echec('hors_majeur', 'Cette page n’est pas disponible pour votre dossier.', 409);
    }

    const fichesRemises = lectureFichesOuverte() && (await aDesFichesRemises(auth.patient.idPatient));
    return NextResponse.json<PortailBibliothequeResponse>({ ok: true, ouvert: true, fichesRemises });
  } catch (erreur) {
    // La CLASSE seulement : un message Prisma recopie les arguments.
    console.error('[portail/bibliotheque GET]', erreur instanceof Error ? erreur.name : 'inconnu');
    return echec('exception', 'Lecture impossible pour le moment.', 500);
  }
}
