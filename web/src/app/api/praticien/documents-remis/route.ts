import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getRecommendedPlate } from '@/lib/food-compass/plates';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { jourIso } from '@/lib/portail/lectureDatee';
import type { EspeceLecture } from '@/lib/portail/lecturesAttendues';

// « DOCUMENTS REMIS » — route PRATICIEN ([[D-297]] §5, lettre ai).
//
// Pour chaque version remise au patient, au dossier : quand elle a été remise,
// et si elle a été lue — « Lu le JJ/MM/AAAA », « Lu, date non enregistrée » ou
// rien. Encart arbitré par le responsable le 2026-10-18.
//
// C'EST LA SEULE SURFACE PRATICIEN QUI LIT `portail_lectures_patient`, et la
// garde `portailLecturesPatient.guard.test.ts` la nomme seule. Ce qu'elle ne
// fait pas est aussi important que ce qu'elle fait (§5) :
//
//  — elle ne COMPTE rien : pas d'ouvertures (la table n'en garde qu'une), pas
//    de « non lus », pas de taux. Une lecture se rend version par version ;
//  — elle n'alerte, ne relance et n'alimente aucune carte du fil du jour ;
//  — aucune intelligence artificielle ne la lit ([[D-293]] §5).
//
// L'absence de lecture n'a pas de libellé : elle deviendrait un constat sur la
// personne (`DC-19`/`DC-20`). L'écran n'affiche rien quand `lu` est faux.

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;
const LONGUEUR_MAX_ID = 64;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/documents-remis';

/** Les six espèces du CHECK de la table : les cinq documents et le protocole ([[D-315]], [[D-345]]). */
export type EspeceRemise = EspeceLecture | 'protocole';

export type DocumentRemis = {
  espece: EspeceRemise;
  idObjet: string;
  libelle: string;
  /** ISO 8601 — l'instant de la remise. */
  remisLe: string;
  /** La version a-t-elle été ouverte par le patient ? */
  lu: boolean;
  /** Le jour de la première ouverture (`AAAA-MM-JJ`), `null` s'il n'a pas été enregistré. */
  luLe: string | null;
};

export type DocumentsRemisResponse =
  | { ok: true; documents: DocumentRemis[] }
  | { ok: false; reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception'; error: string };

function echec(
  reason: Exclude<DocumentsRemisResponse, { ok: true }>['reason'],
  error: string,
  status: number,
): NextResponse<DocumentsRemisResponse> {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

const LIBELLES: Record<Exclude<EspeceRemise, 'fiche_assiette'>, string> = {
  bilan: 'Bilan',
  synthese: 'Ce que j’ai compris de vous',
  lettre_adressage: 'Courrier pour le médecin',
  courrier_complement: 'Courrier avant un complément ciblé',
  protocole: 'Protocole',
};

// GET /api/praticien/documents-remis?idPatient=
export async function GET(req: Request): Promise<NextResponse<DocumentsRemisResponse>> {
  try {
    // Session, forme, puis appartenance — dans cet ordre : l'appartenance
    // JOURNALISE l'accès (patron `comprehension/route.ts`).
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    const idPatient = (new URL(req.url).searchParams.get('idPatient') ?? '').trim();
    if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > LONGUEUR_MAX_ID) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const [envois, syntheses, fiches, lettres, courriersComplement, approbations, lectures] = await Promise.all([
      // Les envois RÉUSSIS, y compris ceux dont la synthèse a été rejetée
      // depuis : « remis » est le geste du praticien (amendement de D-297), pas
      // ce que le portail sert aujourd'hui — `whereEnvoiVisible` répond à
      // l'autre question. La concordance des dossiers reste exigée.
      prisma.bookletEnvoi.findMany({
        where: { idPatient, statut: 'Envoye', synthese: { is: { idPatient } } },
        select: { id: true, dateEnvoi: true },
      }),
      prisma.syntheseComprehension.findMany({
        where: { idPatient, publieeLe: { not: null } },
        select: { id: true, publieeLe: true },
      }),
      prisma.ficheAssietteRemise.findMany({
        where: { idPatient },
        select: { id: true, remiseLe: true, version: { select: { plateCode: true } } },
      }),
      prisma.lettreAdressageRemise.findMany({ where: { idPatient }, select: { id: true, remiseLe: true } }),
      prisma.courrierComplementRemise.findMany({ where: { idPatient }, select: { id: true, remiseLe: true } }),
      prisma.protocolDiffusionApproval.findMany({ where: { idPatient }, select: { id: true, approvedAt: true } }),
      // Trois colonnes, et rien d'autre : ni compte, ni agrégat.
      prisma.portailLecturePatient.findMany({ where: { idPatient }, select: { espece: true, idObjet: true, luLe: true } }),
    ]);

    const lecturesParCle = new Map(lectures.map(l => [`${l.espece}:${l.idObjet}`, l.luLe]));
    const documenter = (espece: EspeceRemise, idObjet: string, libelle: string, remisLe: Date): DocumentRemis => {
      const cle = `${espece}:${idObjet}`;
      const lu = lecturesParCle.has(cle);
      return { espece, idObjet, libelle, remisLe: remisLe.toISOString(), lu, luLe: lu ? jourIso(lecturesParCle.get(cle) ?? null) : null };
    };

    const documents: DocumentRemis[] = [
      ...envois.map(e => documenter('bilan', e.id, LIBELLES.bilan, e.dateEnvoi)),
      ...syntheses.map(s => documenter('synthese', s.id, LIBELLES.synthese, s.publieeLe as Date)),
      ...fiches.map(f =>
        documenter(
          'fiche_assiette',
          f.id,
          `Fiche d’assiette — ${getRecommendedPlate(f.version.plateCode)?.label ?? f.version.plateCode}`,
          f.remiseLe,
        ),
      ),
      ...lettres.map(l => documenter('lettre_adressage', l.id, LIBELLES.lettre_adressage, l.remiseLe)),
      ...courriersComplement.map(c => documenter('courrier_complement', c.id, LIBELLES.courrier_complement, c.remiseLe)),
      ...approbations.map(a => documenter('protocole', a.id, LIBELLES.protocole, a.approvedAt)),
    ].sort((a, b) => (a.remisLe === b.remisLe ? a.idObjet.localeCompare(b.idObjet) : b.remisLe.localeCompare(a.remisLe)));

    return NextResponse.json({ ok: true, documents });
  } catch (err) {
    // La CLASSE de l'erreur seule : un message Prisma peut citer des valeurs.
    console.error('[praticien/documents-remis GET]', err instanceof Error ? err.name : typeof err);
    return echec('exception', 'Les documents remis n’ont pas pu être lus.', 500);
  }
}
