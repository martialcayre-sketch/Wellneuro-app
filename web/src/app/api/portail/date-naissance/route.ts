import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { statutAge, type StatutAge } from '@/lib/patient/gardeAge';
import { accepteNouvelEnvoi, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';

export type PortailDateNaissanceResponse =
  | { ok: true; statutAge: StatutAge }
  | { ok: false; reason: string; error: string };

const FORMAT_ISO_JOUR = /^\d{4}-\d{2}-\d{2}$/;

// POST /api/portail/date-naissance — D-284 §3, lot (h).
//
// Le patient dont le dossier n'a pas de date de naissance lisible la donne à sa
// connexion. ELLE NE S'ÉCRASE JAMAIS : une date lisible déjà au dossier n'est
// corrigée que par le praticien, sur sa fiche. Sans cette règle, un patient
// mineur pourrait se déclarer majeur d'un geste et rouvrir ce que le §4 ferme.
//
// L'identité vient du cookie de session, jamais du corps de la requête.
export async function POST(req: Request): Promise<NextResponse<PortailDateNaissanceResponse>> {
  const auth = await authentifierPatientPortail(req);
  if (auth.erreur) return auth.erreur as NextResponse<PortailDateNaissanceResponse>;
  const { patient } = auth;

  // UN DOSSIER CLOS NE RECUEILLE PLUS RIEN, sa date non plus.
  if (!accepteNouvelEnvoi(patient)) {
    return NextResponse.json(
      { ok: false, reason: RAISON_DOSSIER_CLOS, error: 'Votre suivi est clôturé : aucune information n’est plus recueillie.' },
      { status: 409 },
    );
  }

  let brut: unknown;
  try {
    brut = ((await req.json()) as { dateNaissance?: unknown }).dateNaissance;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Requête invalide.' }, { status: 400 });
  }

  const maintenant = Date.now();
  const saisie = typeof brut === 'string' ? brut.trim() : '';
  // UNE DATE QUE LA GARDE NE SAIT PAS LIRE N'EST PAS ENREGISTRÉE : elle
  // laisserait le dossier en pause sans que le patient sache pourquoi.
  if (
    !FORMAT_ISO_JOUR.test(saisie)
    || Number(saisie.slice(0, 4)) < 1900
    || statutAge(saisie, maintenant) === 'date_manquante'
  ) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_payload', error: 'Cette date n’est pas valide. Vérifiez le jour, le mois et l’année.' },
      { status: 400 },
    );
  }

  if (statutAge(patient.dateNaissance, maintenant) !== 'date_manquante') {
    return NextResponse.json(
      {
        ok: false,
        reason: 'deja_renseignee',
        error: 'Votre date de naissance est déjà enregistrée. Pour la corriger, adressez-vous à votre praticien.',
      },
      { status: 409 },
    );
  }

  try {
    // ÉCRITURE CONDITIONNELLE : seulement si la valeur lue est toujours celle
    // du dossier. Deux onglets, ou un praticien qui saisit au même instant, ne
    // s'écrasent pas — le second voit `count: 0` et le dit.
    const { count } = await prisma.patient.updateMany({
      where: { idPatient: patient.idPatient, dateNaissance: patient.dateNaissance },
      data: { dateNaissance: saisie },
    });
    if (count === 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'deja_renseignee',
          error: 'Votre date de naissance vient d’être enregistrée. Rechargez la page.',
        },
        { status: 409 },
      );
    }
    return NextResponse.json({ ok: true, statutAge: statutAge(saisie, maintenant) });
  } catch (err) {
    console.error('[portail/date-naissance POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
