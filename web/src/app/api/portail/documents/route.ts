import { NextResponse } from 'next/server';
import { accepteNouvelEnvoi, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { refusSaisieSante, statutAge, type StatutAge } from '@/lib/patient/gardeAge';
import { jugerFichier, MESSAGES_DEPOT, preparerImage, TAILLE_MAX_OCTETS } from '@/lib/biology-library/publie';
import { depotDocumentsOuvert } from '@/lib/collecte/drapeau';
import { estCategorieDocument, MESSAGES_DEPOT_DOCUMENT } from '@/lib/collecte/documentsDeposes';
import {
  deposerDocument,
  jugerPlafondsDepot,
  listerDepotsPatient,
  type DepotLu,
} from '@/lib/collecte/documentsDeposesServeur';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// LE DÉPÔT D'UN DOCUMENT PAR LE PATIENT ([[D-330]], J3-collecte). Le dossier est
// celui de la session `wn_portail`, JAMAIS un identifiant venu du client.
// - GET : ses dépôts (date, catégorie proposée, retrait — rien d'autre) et ce
//   qui conditionne un dépôt (dossier ouvert, âge, plafonds). `?interrupteur=1`
//   : le seul « ouvert », pour le lien de la navigation, sans rien lire du
//   dossier (patron de `api/portail/echanges`).
// - POST : le dépôt, corps `multipart/form-data` (`fichier`, `categorie`). Aucun
//   accusé : le texte de collecte de G-11 se lit à côté du dépôt (arbitrage 2 de
//   G-11) ; aucune IA ne lit le document.
//
// Drapeau fermé : 404, avant toute lecture de session — la surface n'existe pas.
//
// SURFACE NEUVE, SERVIE AU SEUL DOSSIER MAJEUR ([[D-283]] §5, [[D-284]] §3) :
// mineur ou date de naissance manquante, 409 ; dossier clos, 409.
//
// LE CORPS NE SE LIT QU'EN DERNIER (patron du compte rendu, [[D-269]] §5) :
// drapeau, session, dossier, âge et plafonds se jugent avant, sur l'en-tête —
// aucun octet ne monte en mémoire pour un envoi refusé. La longueur est EXIGÉE :
// sans `Content-Length`, rien ne borne `formData()`, d'où un 411. Les bornes du
// fichier sont celles du compte rendu : signature des octets concordant avec le
// type déclaré, 10 Mio, image réencodée sans métadonnées, nom jamais gardé.
//
// Une erreur ne se journalise que par sa classe et son code : le message d'une
// contrainte refusée recopie la ligne ([[D-330]] §4).

export const runtime = 'nodejs';

const MARGE_MULTIPART = 64 * 1024;

export type PortailDocumentsResponse =
  | { ok: true; ouvert: true }
  | {
      ok: true;
      documents: DepotLu[];
      dossierOuvert: boolean;
      statutAge: StatutAge;
      plafond: 'plafond_non_consultes' | 'plafond_24h' | null;
    }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PortailDocumentsResponse>({ ok: false, reason, error }, { status });
}

const DESACTIVE = ['desactive', MESSAGES_DEPOT_DOCUMENT.desactive, 404] as const;

export async function GET(req: Request) {
  if (!depotDocumentsOuvert()) return echec(...DESACTIVE);
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur;
    const { patient } = auth;
    const age = statutAge(patient.dateNaissance, Date.now());

    if (new URL(req.url).searchParams.get('interrupteur') === '1') {
      // Le lien n'existe que pour le dossier majeur ; les autres n'ont pas de lien.
      if (age !== 'majeur') return echec('hors_majeur', 'Cette page n’est pas disponible pour votre dossier.', 409);
      return NextResponse.json<PortailDocumentsResponse>({ ok: true, ouvert: true });
    }

    const [documents, plafonds] = await Promise.all([
      listerDepotsPatient(patient.idPatient),
      jugerPlafondsDepot(patient.idPatient),
    ]);
    return NextResponse.json<PortailDocumentsResponse>({
      ok: true,
      documents,
      dossierOuvert: accepteNouvelEnvoi(patient),
      statutAge: age,
      plafond: plafonds.ok ? null : plafonds.reason,
    });
  } catch (err) {
    console.error('[portail/documents GET] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}

export async function POST(req: Request) {
  if (!depotDocumentsOuvert()) return echec(...DESACTIVE);
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur;
    const { patient } = auth;

    if (!accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, MESSAGES_DEPOT_DOCUMENT.dossier_cloture, 409);
    const refusAge = refusSaisieSante(statutAge(patient.dateNaissance, Date.now()));
    if (refusAge) return echec(refusAge.reason, refusAge.error, 409);
    const plafonds = await jugerPlafondsDepot(patient.idPatient);
    if (!plafonds.ok) return echec(plafonds.reason, MESSAGES_DEPOT_DOCUMENT[plafonds.reason], 429);

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
    const categorie = form.get('categorie');
    if (!estCategorieDocument(categorie)) {
      return echec('categorie_absente', MESSAGES_DEPOT_DOCUMENT.categorie_absente, 400);
    }
    const fichier = form.get('fichier');
    if (!(fichier instanceof Blob)) return echec('fichier_absent', MESSAGES_DEPOT_DOCUMENT.fichier_absent, 400);
    if (fichier.size > TAILLE_MAX_OCTETS) return echec('fichier_trop_lourd', MESSAGES_DEPOT.fichier_trop_lourd, 413);

    // Le nom du fichier (`File.name`) n'est jamais lu : il porte souvent l'identité.
    let octets: Buffer = Buffer.from(await fichier.arrayBuffer());
    const verdict = jugerFichier(octets, fichier.type);
    if (!verdict.ok) return echec(verdict.reason, MESSAGES_DEPOT[verdict.reason], verdict.status);
    if (verdict.typeMime !== 'application/pdf') {
      const image = await preparerImage(octets, verdict.typeMime);
      if (!image.ok) return echec(image.reason, MESSAGES_DEPOT[image.reason], image.status);
      octets = image.octets;
    }

    const issue = await deposerDocument({ idPatient: patient.idPatient, octets, typeMime: verdict.typeMime, categorie });
    if (!issue.ok) {
      const status = issue.reason === 'plafond_non_consultes' || issue.reason === 'plafond_24h' ? 429 : 409;
      return echec(issue.reason, MESSAGES_DEPOT_DOCUMENT[issue.reason], status);
    }
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err) {
    console.error('[portail/documents POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
