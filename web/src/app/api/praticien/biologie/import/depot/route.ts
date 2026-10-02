import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { isBioIngestEnabled } from '@/lib/biology-library/featureFlag';
import { garderImport } from '@/lib/biology-library/import/garde';
import {
  deposerCompteRendu,
  jugerFichier,
  MESSAGES_DEPOT,
  TAILLE_MAX_OCTETS,
} from '@/lib/biology-library/import/depot';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Dépôt d'un compte rendu PDF par le praticien (BIO-INGEST LOT-02, [[D-256]]
// A2). `idPatient` en paramètre de requête, corps `multipart/form-data` :
// `fichier`. Le dépôt n'appelle pas l'IA : l'extraction est un second geste
// (`../extraction`).
//
// LE CORPS NE SE LIT QU'EN DERNIER, ET BORNÉ (revue `wn-reviewer`, P1-1) :
// drapeau, session et appartenance se jugent AVANT, sur l'en-tête et la
// requête — un client anonyme ne fait monter aucun octet en mémoire. Et la
// longueur est EXIGÉE : sans `Content-Length` (envoi par morceaux), rien ne
// borne `formData()`, d'où un 411. Node ne lit pas au-delà de la longueur
// déclarée ; une marge couvre l'enveloppe multipart.

export const runtime = 'nodejs';

const MARGE_MULTIPART = 64 * 1024;

function echec(reason: string, error: string, status: number, idCompteRendu?: string | null) {
  return NextResponse.json(
    idCompteRendu ? { ok: false, reason, error, idCompteRendu } : { ok: false, reason, error },
    { status },
  );
}

export async function POST(req: Request) {
  try {
    if (!isBioIngestEnabled()) {
      return echec('bio_ingest_desactive', 'L’import de comptes rendus n’est pas activé sur cet environnement.', 503);
    }
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderImport(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);

    const enTete = req.headers.get('content-length');
    const longueur = enTete !== null && /^\d+$/.test(enTete) ? Number(enTete) : Number.NaN;
    if (Number.isNaN(longueur)) return echec('longueur_requise', MESSAGES_DEPOT.longueur_requise, 411);
    if (longueur > TAILLE_MAX_OCTETS + MARGE_MULTIPART) {
      return echec('fichier_trop_lourd', MESSAGES_DEPOT.fichier_trop_lourd, 413);
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);

    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const fichier = form.get('fichier');
    if (!(fichier instanceof Blob)) return echec('fichier_absent', MESSAGES_DEPOT.fichier_absent, 400);
    if (fichier.size > TAILLE_MAX_OCTETS) return echec('fichier_trop_lourd', MESSAGES_DEPOT.fichier_trop_lourd, 413);

    const octets = Buffer.from(await fichier.arrayBuffer());
    const verdict = jugerFichier(octets, fichier.type);
    if (!verdict.ok) return echec(verdict.reason, MESSAGES_DEPOT[verdict.reason], verdict.status);

    const issue = await deposerCompteRendu({ idPatient, deposePar: garde.email, octets, typeMime: verdict.typeMime });
    if (!issue.ok) return echec(issue.reason, MESSAGES_DEPOT[issue.reason], 409, issue.idCompteRendu);
    return NextResponse.json({ ok: true, idCompteRendu: issue.idCompteRendu }, { status: 201 });
  } catch (err) {
    console.error('[praticien/biologie/import/depot POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
