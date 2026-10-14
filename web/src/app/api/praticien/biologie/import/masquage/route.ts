import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { isBioIngestEnabled } from '@/lib/biology-library/featureFlag';
import { garderImport } from '@/lib/biology-library/import/garde';
import { enregistrerMasquage } from '@/lib/biology-library/import/enregistrerMasquage';
import { MESSAGES_MASQUAGE, PAGES_MAX, TOTAL_MAX_OCTETS, type JugementPage } from '@/lib/biology-library/import/masquage';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// Le masquage de l'identité d'un compte rendu, avant sa lecture ([[D-284]] §5,
// lot (j)). `idPatient` en paramètre de requête ; corps `multipart/form-data` :
// `idCompteRendu`, `zones` (entier), `aucuneIdentite` (`1` ou absent) et une
// partie `page` par page, dans l'ordre — des JPEG produits par le navigateur,
// zones déjà noircies. Seules ces pages partiront chez Anthropic.
//
// LE CORPS NE SE LIT QU'EN DERNIER, ET BORNÉ, comme au dépôt : drapeau, session
// et appartenance se jugent sur l'en-tête, la longueur est EXIGÉE (411) et
// bornée (413) avant `formData()`.

export const runtime = 'nodejs';

const ID = /^[A-Za-z0-9_-]{1,64}$/;
const ENTIER = /^\d{1,4}$/;
/** Le jugement d'une page : son nombre de zones, ou « aucune » identité. */
const JUGEMENT = /^(?:\d{1,4}|aucune)$/;
const MARGE_MULTIPART = 64 * 1024;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
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
    if (Number.isNaN(longueur)) return echec('longueur_requise', MESSAGES_MASQUAGE.longueur_requise, 411);
    if (longueur > TOTAL_MAX_OCTETS + MARGE_MULTIPART) {
      return echec('pages_trop_lourdes', MESSAGES_MASQUAGE.pages_trop_lourdes, 413);
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
    const idCompteRendu = form.get('idCompteRendu');
    const zones = form.get('zones');
    const aucune = form.get('aucuneIdentite');
    if (typeof idCompteRendu !== 'string' || !ID.test(idCompteRendu)
      || typeof zones !== 'string' || !ENTIER.test(zones)
      || (aucune !== null && aucune !== '1')) {
      return echec('invalid', 'Requête invalide.', 400);
    }
    const parties = form.getAll('page');
    if (parties.length === 0) return echec('pages_absentes', MESSAGES_MASQUAGE.pages_absentes, 400);
    if (parties.length > PAGES_MAX) return echec('trop_de_pages', MESSAGES_MASQUAGE.trop_de_pages, 413);
    // Un jugement par page, dans l'ordre : le serveur rejuge chaque page.
    const jugements: JugementPage[] = [];
    for (const j of form.getAll('jugement')) {
      if (typeof j !== 'string' || !JUGEMENT.test(j)) return echec('invalid', 'Requête invalide.', 400);
      jugements.push(j === 'aucune' ? 'aucune' : Number(j));
    }
    if (jugements.length !== parties.length) return echec('invalid', 'Requête invalide.', 400);
    const pages: Buffer[] = [];
    for (const partie of parties) {
      if (!(partie instanceof Blob)) return echec('invalid', 'Requête invalide.', 400);
      pages.push(Buffer.from(await partie.arrayBuffer()));
    }

    const issue = await enregistrerMasquage({
      idPatient,
      idCompteRendu,
      posePar: garde.email,
      pages,
      jugements,
      zonesMasquees: Number(zones),
      aucuneIdentite: aucune === '1',
    });
    if (!issue.ok && issue.reason === 'dossier_clos') return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    if (!issue.ok) return echec(issue.reason, MESSAGES_MASQUAGE[issue.reason], issue.status);
    return NextResponse.json({ ok: true, idMasquage: issue.idMasquage }, { status: 201 });
  } catch (err) {
    console.error('[praticien/biologie/import/masquage POST] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
