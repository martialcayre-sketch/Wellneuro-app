import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import type { TypeCarteFil } from '@/lib/fil/cartes';
import { lectureEffective, sAcquitteParLecture } from '@/lib/fil/lectureCartes';

// POST /api/praticien/fil/lecture — consigne qu'un praticien a LU les cartes
// d'un type, sur un dossier ; ou annule cette lecture (« Remettre »).
//
// SŒUR DE `fil/refus`, ET DÉLIBÉRÉMENT DISTINCTE D'ELLE. Le Fil sépare déjà
// « écartée sans avoir été vue » de « traitée » (`lib/fil/inbox.ts`). Écrire
// une lecture parmi les refus ferait afficher « Carte écartée — … » pour une
// carte qu'on a traitée : le dossier dirait que le praticien l'a refusée.
//
// Append-only : ni UPDATE ni DELETE. Annuler écrit une nouvelle ligne chaînée
// sur la précédente — même discipline que le refus.
//
// CE QUI EST CONSIGNÉ EST UN TYPE, PAS UNE CLÉ DE CARTE. Une lecture n'est pas
// l'acquittement d'une ligne : c'est le constat qu'on a ouvert la phase où ces
// gestes se lisent, et on les y voit TOUS (arbitrage du 2026-09-12).

export type FilLectureApiResponse =
  | { ok: true; typeCarte: string; lue: boolean; inchange: boolean }
  | { ok: false; reason: string; error: string };

type PostBody = {
  idPatient?: string;
  typeCarte?: string;
  lue?: boolean;
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<FilLectureApiResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<FilLectureApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

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

    // LA LISTE ÉTROITE EST TENUE ICI, ET PAS SEULEMENT À L'ÉCRAN. Un écran qui
    // n'offre pas un geste ne l'interdit pas : une requête forgée acquitterait
    // un signalement Trust, c'est-à-dire ferait disparaître du Fil un suivi que
    // personne n'a fait. Le serveur vérifie (`D-164`).
    const typeCarte = (body.typeCarte ?? '').trim();
    if (!typeCarte || !sAcquitteParLecture(typeCarte as TypeCarteFil)) {
      return echec('type_non_acquittable', 'Ce type de carte ne s’acquitte pas par lecture.', 400);
    }
    if (typeof body.lue !== 'boolean') {
      return echec('invalid', 'Décision de lecture manquante.', 400);
    }

    // LE LECTEUR EST NOMMÉ, OU RIEN NE S'ÉCRIT. La contrainte
    // `fil_lecture_lecteur_nomme` refuse une chaîne vide : sans ce contrôle,
    // une session sans e-mail ferait remonter un 23514 de Postgres, donc un
    // 500, pour une situation parfaitement identifiable ici. La sœur `refus`
    // écrit `''` faute de CHECK côté base — ce n'est pas un modèle à suivre,
    // c'est une trace d'audit anonyme, et elle ne se conteste pas.
    const email = emailPraticien(session);
    if (email === null) {
      return echec('lecteur_inconnu', 'Session sans identité praticien : lecture non consignée.', 401);
    }

    const appartenance = await verifierAppartenancePatient(idPatient, email);
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const lignes = await prisma.filCardLecture.findMany({
      where: { idPatient, typeCarte },
      select: { id: true, idPatient: true, typeCarte: true, lue: true, lueLe: true },
      orderBy: { lueLe: 'desc' },
    });
    const effective = lectureEffective(lignes).get(`${idPatient}|${typeCarte}`) ?? null;
    const courant = lignes[0] ?? null;

    // PAS D'IDEMPOTENCE SUR UNE LECTURE, et c'est le point délicat de cette
    // route. Le refus, lui, est un ÉTAT : re-refuser n'ajoute rien. Une lecture
    // est un INSTANT, et c'est l'instant qui fait le travail — il déplace la
    // coupure. Un praticien qui relit le dossier à 11 h après un geste posé à
    // 10 h doit écrire une lecture NEUVE, sinon la carte de 10 h resterait à
    // l'écran pour toujours : « déjà lu » est vrai de la lecture de 9 h, et
    // faux du dossier tel qu'il est maintenant.
    //
    // L'annulation, elle, EST un état : « Remettre » sur un dossier qu'aucune
    // lecture ne couvre ne remet rien.
    if (!body.lue && effective === null) {
      return NextResponse.json({ ok: true, typeCarte, lue: false, inchange: true });
    }

    await prisma.filCardLecture.create({
      data: {
        idPatient,
        typeCarte,
        lue: body.lue,
        luePar: email,
        supersedesLectureId: courant?.id ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({ ok: true, typeCarte, lue: body.lue, inchange: false }, { status: 201 });
  } catch (err) {
    console.error('[praticien/fil/lecture POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
