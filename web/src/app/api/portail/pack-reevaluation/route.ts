import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { readPatientSession, isSessionValideForPatient } from '@/lib/patient-session';
import { evaluerReprise } from '@/lib/patient/reprise';
import {
  accuseReponse,
  choisirPackPropose,
  doitProposer,
  texteProposition,
  type PackCandidat,
  type ReponseProposition,
} from '@/lib/patient/packReevaluation';

// Proposition de pack de réévaluation (SP-SPI / LOT-01).
//
// GET  — dit s'il y a une proposition à afficher. LECTURE SEULE, aucune écriture :
//        une proposition affichée n'est pas un événement, et un GET qui écrirait
//        se déclencherait au moindre préchargement du navigateur.
// POST — enregistre la réponse du patient. C'est le SEUL point d'écriture, et il
//        n'écrit qu'une ligne : ni assignation, ni envoi, ni relance.
//
// Le statut `proposee` / l'acteur `systeme` du modèle ne sont pas écrits ici :
// ils décriront le jour où une proposition sera *poussée* (e-mail, notification),
// ce que ce lot ne fait pas — il se contente de l'afficher quand le patient vient.

export type PropositionPack = {
  idPack: string;
  titre: string;
  corps: string;
};

export type PackReevaluationResponse =
  | { ok: true; proposition: PropositionPack | null }
  | { ok: true; accuse: string }
  | { ok: false; reason: string; error: string };

const REPONSES_ACCEPTEES: ReponseProposition[] = ['acceptee', 'declinee'];

/** Identité portail : cookie signé, recoupé en base. Aucun identifiant du client. */
async function patientDeLaSession(req: Request) {
  const session = readPatientSession(req);
  if (!session) return null;
  const patient = await prisma.patient.findUnique({
    where: { idPatient: session.idPatient },
    select: {
      idPatient: true,
      actif: true,
      email: true,
      accessToken: true,
      accessTokenRevoked: true,
      sessionsInvalidesAvant: true,
    },
  });
  if (!patient || !isSessionValideForPatient(session, patient)) return null;
  return patient;
}

function refus(): NextResponse<PackReevaluationResponse> {
  return NextResponse.json(
    { ok: false, reason: 'unauthorized', error: 'Accès non reconnu.' },
    { status: 404 },
  );
}

/** Dernière réponse du patient, tous packs confondus : c'est elle qui fait taire la question. */
async function derniereReponse(idPatient: string) {
  const ligne = await prisma.packProposition.findFirst({
    where: { idPatient, statut: { in: REPONSES_ACCEPTEES } },
    orderBy: { enregistreLe: 'desc' },
    select: { idPack: true, statut: true },
  });
  return ligne ? { idPack: ligne.idPack, statut: ligne.statut as ReponseProposition } : null;
}

async function candidat(idPatient: string): Promise<PackCandidat | null> {
  // Le pack déjà rempli — celui de la dernière consultation validée — porte les
  // mêmes instruments, seule façon de comparer les deux passages (A6-5).
  const consultation = await prisma.consultation.findFirst({
    where: { idPatient, statut: 'validee', idPackAssigne: { not: null } },
    orderBy: { dateValidation: 'desc' },
    select: { idPackAssigne: true },
  });

  const packs = await prisma.pack.findMany({
    where: {
      actif: true,
      OR: [
        ...(consultation?.idPackAssigne ? [{ idPack: consultation.idPackAssigne }] : []),
        { parDefaut: true },
      ],
    },
    select: { idPack: true, nom: true, description: true, qids: true, parDefaut: true },
  });

  const versCandidat = (p: (typeof packs)[number]): PackCandidat => ({
    idPack: p.idPack,
    nom: p.nom,
    description: p.description,
    nbQuestionnaires: p.qids.length,
  });

  const dejaRempli = packs.find((p) => p.idPack === consultation?.idPackAssigne);
  const parDefaut = packs.find((p) => p.parDefaut);

  return choisirPackPropose(
    dejaRempli ? versCandidat(dejaRempli) : null,
    parDefaut ? versCandidat(parDefaut) : null,
  );
}

export async function GET(req: Request): Promise<NextResponse<PackReevaluationResponse>> {
  try {
    const patient = await patientDeLaSession(req);
    if (!patient) return refus();

    // Même horloge que le Fil praticien : la dernière réponse TRANSMISE, jamais
    // la dernière connexion. Se connecter n'est pas participer.
    const derniere = await prisma.questionnaireReponse.findFirst({
      where: { idPatient: patient.idPatient },
      orderBy: { dateReponse: 'desc' },
      select: { dateReponse: true },
    });
    const reprise = evaluerReprise(derniere?.dateReponse.toISOString() ?? null, new Date());

    const pack = reprise.enReprise ? await candidat(patient.idPatient) : null;
    const dejaRepondu = await derniereReponse(patient.idPatient);

    if (!doitProposer(reprise.enReprise, pack, dejaRepondu) || !pack) {
      return NextResponse.json({ ok: true, proposition: null });
    }

    const { titre, corps } = texteProposition(pack);
    return NextResponse.json({ ok: true, proposition: { idPack: pack.idPack, titre, corps } });
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request): Promise<NextResponse<PackReevaluationResponse>> {
  try {
    const patient = await patientDeLaSession(req);
    if (!patient) return refus();

    let corps: { idPack?: unknown; reponse?: unknown };
    try {
      corps = (await req.json()) as typeof corps;
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Requête invalide.' },
        { status: 400 },
      );
    }

    const idPack = typeof corps.idPack === 'string' ? corps.idPack.trim() : '';
    const reponse = corps.reponse as ReponseProposition;
    if (!idPack || !REPONSES_ACCEPTEES.includes(reponse)) {
      return NextResponse.json(
        { ok: false, reason: 'invalid_payload', error: 'Réponse invalide.' },
        { status: 400 },
      );
    }

    // Une ligne, append-only. La précédente réponse — s'il y en a une — reste
    // lisible et devient l'antécédent : on ne réécrit jamais.
    const precedente = await prisma.packProposition.findFirst({
      where: { idPatient: patient.idPatient, idPack },
      orderBy: { enregistreLe: 'desc' },
      select: { id: true },
    });

    await prisma.packProposition.create({
      data: {
        idPatient: patient.idPatient,
        idPack,
        statut: reponse,
        acteurRole: 'patient',
        supersedesPropositionId: precedente?.id ?? null,
      },
    });

    return NextResponse.json({ ok: true, accuse: accuseReponse(reponse) });
  } catch {
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
