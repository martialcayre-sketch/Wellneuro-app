import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { STATUTS_SYNTHESE_VALIDES, type StatutSyntheseSource } from '@/lib/documents';
import { compositionDepuisSynthese, htmlDocumentMedecin } from '@/lib/documents/compositionSynthese';
import { enregistrerImpression } from '@/lib/documents/documentMedecinImprime';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { journaliserAccesDossier } from '@/lib/praticien/journalAcces';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { refusPartage, verdictPartageMedecin } from '@/lib/trust/consentementPartage';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// POST /api/praticien/documents/medecin/impression — « Imprimer » le document
// pour le médecin, CONFIRMÉ ([[D-307]] §2, F38).
//
// Le HTML est RECOMPOSÉ ICI, depuis la synthèse validée, jamais reçu du
// navigateur : l'instantané enregistré est ce que le serveur a composé, et
// c'est ce HTML que l'écran imprime. Ouvrir l'aperçu ne laisse pas de trace.
//
// GARDES, dans l'ordre : session ; synthèse du praticien (404, sans dire si
// elle existe ailleurs) ; synthèse validée (422) ; dossier ouvert (409, comme
// la correspondance médecin) ; partage avec le médecin traitant accordé
// (409, sans trace — refus, retrait et silence ferment, arbitrage du
// 2026-10-18), relu sous verrou au moment d'écrire ; rendu non prescriptif
// (422, garde de vocabulaire du rendu médecin).

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/documents/medecin/impression';

export type ImpressionDocumentMedecinResponse =
  | { ok: true; impression: { id: string; imprimeLe: string }; html: string }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<ImpressionDocumentMedecinResponse>({ ok: false, reason, error }, { status });
}

export async function POST(req: Request): Promise<NextResponse<ImpressionDocumentMedecinResponse>> {
  const session = await getServerSession(authOptions);
  const email = session ? emailPraticien(session) : null;
  if (!email) return echec('unauthenticated', 'Non authentifié.', 401);

  let idSynthese = '';
  try {
    const corps = (await req.json()) as { idSynthese?: unknown };
    idSynthese = typeof corps.idSynthese === 'string' ? corps.idSynthese.trim() : '';
  } catch {
    return echec('invalid', 'Corps de requête illisible.', 400);
  }
  if (!idSynthese) return echec('invalid', 'idSynthese requis.', 400);

  try {
    const synthese = await prisma.syntheseIA.findFirst({
      where: { idSynthese, patient: filtrePatientsDuPraticien(email) },
    });
    if (!synthese) return echec('synthese_not_found', 'Synthèse introuvable.', 404);

    await journaliserAccesDossier({
      idPatient: synthese.idPatient,
      praticienEmail: email,
      route: ROUTE_JOURNAL,
      methode: 'POST',
    });

    if (!STATUTS_SYNTHESE_VALIDES.includes(synthese.statut as StatutSyntheseSource)) {
      return echec(
        'synthese_non_validee',
        'La synthèse doit être validée par le praticien avant d’imprimer le document.',
        422,
      );
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient: synthese.idPatient },
      select: { prenom: true, nom: true, actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // Garde d'entrée : un refus évite de composer pour rien. Celle qui fait
    // foi est relue sous verrou, dans `enregistrerImpression`.
    const choix = await prisma.trustChoiceEvent.findMany({
      where: { idPatient: synthese.idPatient, finalite: 'partage_medecin_traitant' },
      select: { finalite: true, statut: true, enregistreLe: true },
    });
    const verdict = verdictPartageMedecin(choix);
    if (verdict.bloquant) {
      const refus = refusPartage(verdict);
      return echec(refus.raison, refus.message, 409);
    }

    let html: string;
    try {
      html = htmlDocumentMedecin(compositionDepuisSynthese(synthese, patient));
    } catch (err) {
      return echec(
        'rendu_refuse',
        err instanceof Error ? err.message : 'Le document pour le médecin n’a pas pu être composé.',
        422,
      );
    }

    const resultat = await enregistrerImpression({
      idPatient: synthese.idPatient,
      idSynthese,
      praticienEmail: email,
      html,
    });
    if (!resultat.ok) return echec(resultat.raison, resultat.message, 409);

    return NextResponse.json(
      {
        ok: true,
        impression: { id: resultat.impression.id, imprimeLe: resultat.impression.imprimeLe.toISOString() },
        html,
      },
      { status: 201 },
    );
  } catch (err) {
    // La classe et le code seulement : un message Prisma recopie les arguments,
    // donc le HTML du document.
    console.error('[praticien/documents/medecin/impression POST]', ...classeEtCode(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
