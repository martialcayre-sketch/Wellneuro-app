import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  isTokenValide,
  isEmailValide,
  resolvePortailPatient,
  consultationCourante,
  CONSENTEMENT_VERSION,
} from '@/lib/consultation/portail';
import { normaliserAnamnese, ANAMNESE_CHAMP_REQUIS } from '@/lib/consultation/anamnese';
import { assignPackToPatient } from '@/lib/consultation/assignBasePack';
import { isMotifValide } from '@/lib/consultation/motifs';

export type PortailValiderResponse =
  | { ok: true; premiereAssignation: string | null; count: number }
  | { ok: false; reason: string; error: string };

type Payload = { token?: string; email?: string; anamnese?: unknown; motif?: string };

const NOM_PACK_BASE = 'BASE DE CONSULTATION';

// Résout le pack de base : le pack `parDefaut` actif en priorité, sinon le
// pack actif nommé « BASE DE CONSULTATION » (fallback).
async function resoudrePackBase() {
  const parDefaut = await prisma.pack.findFirst({ where: { parDefaut: true, actif: true } });
  if (parDefaut && parDefaut.qids.length > 0) return parDefaut;
  const parNom = await prisma.pack.findFirst({ where: { nom: NOM_PACK_BASE, actif: true } });
  return parNom;
}

// POST /api/portail/valider — enregistre l'anamnèse, valide l'onboarding et
// assigne automatiquement le pack de base.
export async function POST(req: Request): Promise<NextResponse<PortailValiderResponse>> {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const token = (payload.token ?? '').trim();
  const email = (payload.email ?? '').trim().toLowerCase();
  if (!isTokenValide(token) || !isEmailValide(email)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Identifiants invalides.' }, { status: 400 });
  }

  const anamnese = normaliserAnamnese(payload.anamnese);
  if (!anamnese[ANAMNESE_CHAMP_REQUIS]) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_payload', error: 'Merci de décrire ce qui vous amène à consulter.' },
      { status: 400 }
    );
  }

  const motif = (payload.motif ?? '').trim();
  if (motif && !isMotifValide(motif)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Motif de consultation invalide.' }, { status: 400 });
  }

  try {
    const patient = await resolvePortailPatient(token, email);
    if (!patient) {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Accès non reconnu ou révoqué.' }, { status: 403 });
    }
    const consultation = await consultationCourante(patient.idPatient);
    if (!consultation) {
      return NextResponse.json({ ok: false, reason: 'no_consultation', error: 'Aucune consultation en cours.' }, { status: 404 });
    }
    if (consultation.consentement !== 'donne') {
      return NextResponse.json({ ok: false, reason: 'consent_required', error: 'Consentement requis avant la validation.' }, { status: 409 });
    }
    if (consultation.ficheSignaletique == null) {
      return NextResponse.json({ ok: false, reason: 'fiche_required', error: 'Fiche de renseignements requise avant la validation.' }, { status: 409 });
    }

    const pack = await resoudrePackBase();
    if (!pack || pack.qids.length === 0) {
      return NextResponse.json(
        { ok: false, reason: 'pack_not_found', error: 'Pack de base introuvable. Contactez votre praticien.' },
        { status: 404 }
      );
    }

    // Assignation du pack de base (consentement déjà donné au niveau consultation).
    const cree = await assignPackToPatient({
      idPatientBusiness: patient.idPatient,
      emailPatient: patient.email,
      qids: pack.qids,
      packNom: pack.nom,
      options: { consentementDonne: true, consentementVersion: CONSENTEMENT_VERSION },
    });

    await prisma.consultation.update({
      where: { idConsultation: consultation.idConsultation },
      data: {
        anamnese,
        motif: motif || consultation.motif,
        statut: 'validee',
        dateValidation: new Date(),
        idPackAssigne: pack.idPack,
        consentementVersion: consultation.consentementVersion ?? CONSENTEMENT_VERSION,
      },
    });

    return NextResponse.json({ ok: true, premiereAssignation: cree[0]?.idAssignation ?? null, count: cree.length });
  } catch (err) {
    console.error('[portail/valider POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
