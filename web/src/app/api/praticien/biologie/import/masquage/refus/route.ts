import { NextResponse } from 'next/server';
import { garderImport } from '@/lib/biology-library/import/garde';
import { nombrePagesRefus } from '@/lib/biology-library/import/masquage';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// LE COMPTE DES REFUS `trop_de_pages` (arbitrage du responsable du
// 2026-11-03). Un compte rendu de plus de 20 pages est refusé dans le
// navigateur, avant tout envoi : sans ce signal, le refus ne laisse aucune
// trace et l'on ne sait pas s'il arrive. Le navigateur envoie le seul nombre
// de pages ; la route l'écrit dans le journal de l'application (Scalingo),
// SANS identifiant de dossier ni de compte rendu. Rien n'est écrit en base.
//
// `idPatient` en paramètre de requête ne sert qu'à la garde (session,
// appartenance), comme pour les autres routes d'import. Corps JSON :
// `{ "nombrePages": <entier> }`, borné à 1 Kio.

export const runtime = 'nodejs';

const CORPS_MAX_OCTETS = 1024;

/** Le corps en texte, lu en flux ; `null` dès que `max` octets sont dépassés (lecture annulée). */
async function lireBorne(req: Request, max: number): Promise<string | null> {
  if (!req.body) return '';
  const lecteur = req.body.getReader();
  const morceaux: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await lecteur.cancel();
      return null;
    }
    morceaux.push(value);
  }
  return Buffer.concat(morceaux).toString('utf8');
}

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

export async function POST(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderImport(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);

    // La longueur est EXIGÉE (411) et bornée (413) avant toute lecture, comme
    // au masquage ; puis le corps se lit en flux, interrompu au-delà de la
    // borne — un en-tête qui ment ne fait pas lire plus (revue de #1838).
    const enTete = req.headers.get('content-length');
    const longueur = enTete !== null && /^\d+$/.test(enTete) ? Number(enTete) : Number.NaN;
    if (Number.isNaN(longueur)) return echec('longueur_requise', 'La taille de l’envoi doit être annoncée.', 411);
    if (longueur > CORPS_MAX_OCTETS) return echec('invalid', 'Corps de requête trop long.', 413);
    const texte = await lireBorne(req, CORPS_MAX_OCTETS);
    if (texte === null) return echec('invalid', 'Corps de requête trop long.', 413);
    let corps: unknown;
    try {
      corps = JSON.parse(texte);
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    const nombrePages = nombrePagesRefus((corps as { nombrePages?: unknown } | null)?.nombrePages);
    if (nombrePages === null) return echec('invalid', 'Nombre de pages invalide.', 400);

    console.info(`[bio-ingest masquage] refus trop_de_pages : ${nombrePages} pages`);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[bio-ingest masquage] signalement du refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur serveur.', 500);
  }
}
