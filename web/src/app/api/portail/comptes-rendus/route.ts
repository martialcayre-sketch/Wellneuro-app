import { NextResponse } from 'next/server';
import { accepteNouvelEnvoi, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { isBioPortailEnabled } from '@/lib/biology-library/featureFlag';
import { jugerFichier, MESSAGES_DEPOT, preparerImage, TAILLE_MAX_OCTETS } from '@/lib/biology-library/import/depot';
import {
  aPrisConnaissanceUsageIa,
  deposerTransmission,
  jugerPlafonds,
  listerTransmissions,
  type DocumentTransmisLu,
} from '@/lib/biology-library/import/transmission';
import { MESSAGES_TRANSMISSION } from '@/lib/biology-library/import/transmissionStatut';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Le compte rendu d'analyses TRANSMIS PAR LE PATIENT depuis son portail
// ([[D-269]], BIO-INGEST LOT-04). Le dossier est celui de la session
// `wn_portail`, JAMAIS un identifiant venu du client.
// - GET : les documents qu'il a transmis, date et statut seuls (§4), et ce qui
//   conditionne un dépôt (accusé, dossier ouvert, plafonds).
// - POST : le dépôt, corps `multipart/form-data` (`fichier`). Il n'appelle PAS
//   l'IA (§1) : la lecture reste un geste du praticien.
//
// LE CORPS NE SE LIT QU'EN DERNIER (§5, patron du dépôt praticien) : drapeau,
// session, accusé, dossier ouvert et plafonds se jugent AVANT, sur l'en-tête —
// aucun octet ne monte en mémoire pour un envoi refusé. La longueur est
// EXIGÉE : sans `Content-Length`, rien ne borne `formData()`, d'où un 411.

export const runtime = 'nodejs';

const MARGE_MULTIPART = 64 * 1024;

export type PortailComptesRendusResponse =
  | {
      ok: true;
      documents: DocumentTransmisLu[];
      accuseRequis: boolean;
      dossierOuvert: boolean;
      plafond: 'plafond_en_attente' | 'plafond_24h' | null;
    }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

const DESACTIVE = ['bio_portail_desactive', 'La transmission de comptes rendus n’est pas ouverte.', 503] as const;

export async function GET(req: Request) {
  try {
    if (!isBioPortailEnabled()) return echec(...DESACTIVE);
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur;
    const { idPatient } = auth.patient;
    const [documents, accuse, plafonds] = await Promise.all([
      listerTransmissions(idPatient),
      aPrisConnaissanceUsageIa(idPatient),
      jugerPlafonds(idPatient),
    ]);
    return NextResponse.json({
      ok: true,
      documents,
      accuseRequis: !accuse,
      dossierOuvert: accepteNouvelEnvoi(auth.patient),
      plafond: plafonds.ok ? null : plafonds.reason,
    } satisfies PortailComptesRendusResponse);
  } catch (err) {
    console.error('[portail/comptes-rendus GET] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}

export async function POST(req: Request) {
  try {
    if (!isBioPortailEnabled()) return echec(...DESACTIVE);
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur;
    const { patient } = auth;

    if (!(await aPrisConnaissanceUsageIa(patient.idPatient))) {
      return echec('accuse_requis', MESSAGES_TRANSMISSION.accuse_requis, 403);
    }
    if (!accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, MESSAGES_TRANSMISSION.dossier_cloture, 409);
    const plafonds = await jugerPlafonds(patient.idPatient);
    if (!plafonds.ok) return echec(plafonds.reason, MESSAGES_TRANSMISSION[plafonds.reason], 429);

    const enTete = req.headers.get('content-length');
    const longueur = enTete !== null && /^\d+$/.test(enTete) ? Number(enTete) : Number.NaN;
    if (Number.isNaN(longueur)) return echec('longueur_requise', MESSAGES_DEPOT.longueur_requise, 411);
    if (longueur > TAILLE_MAX_OCTETS + MARGE_MULTIPART) {
      return echec('fichier_trop_lourd', MESSAGES_DEPOT.fichier_trop_lourd, 413);
    }

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const fichier = form.get('fichier');
    if (!(fichier instanceof Blob)) return echec('fichier_absent', MESSAGES_DEPOT.fichier_absent, 400);
    if (fichier.size > TAILLE_MAX_OCTETS) return echec('fichier_trop_lourd', MESSAGES_DEPOT.fichier_trop_lourd, 413);

    let octets: Buffer = Buffer.from(await fichier.arrayBuffer());
    const verdict = jugerFichier(octets, fichier.type);
    if (!verdict.ok) return echec(verdict.reason, MESSAGES_DEPOT[verdict.reason], verdict.status);
    if (verdict.typeMime !== 'application/pdf') {
      // Une image n'est consignée que nettoyée de ses métadonnées (§5, LOT-03).
      const image = await preparerImage(octets, verdict.typeMime);
      if (!image.ok) return echec(image.reason, MESSAGES_DEPOT[image.reason], image.status);
      octets = image.octets;
    }

    const issue = await deposerTransmission({ idPatient: patient.idPatient, octets, typeMime: verdict.typeMime });
    if (!issue.ok) {
      const status =
        issue.reason === 'document_deja_transmis' || issue.reason === 'document_deja_ecarte' || issue.reason === RAISON_DOSSIER_CLOS
          ? 409
          : 429;
      return echec(issue.reason, MESSAGES_TRANSMISSION[issue.reason], status);
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[portail/comptes-rendus POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
