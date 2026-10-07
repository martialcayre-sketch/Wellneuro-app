import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { garderImport } from '@/lib/biology-library/import/garde';
import { estTypeCompteRendu } from '@/lib/biology-library/import/depot';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// LE DOCUMENT DÉPOSÉ, MONTRÉ AU PRATICIEN ([[D-269]] §1, BIO-INGEST LOT-04) :
// le regard qui précède la lecture. Un patient peut transmettre le compte rendu
// d'un tiers ; la lecture l'enverrait ENTIER chez Anthropic. Le praticien
// vérifie d'abord ici, sans rien envoyer à personne (revue `wn-reviewer` de la
// PR 3, P1 : jusque-là, seule l'extraction lisait le contenu).
//
// Paramètres : `idPatient`, `idCompteRendu`. Lecture d'un dossier : l'accès est
// journalisé (GD-1) par la garde. Un document purgé ([[D-258]]) n'existe plus :
// 410.
//
// UN FICHIER VENU DE L'EXTÉRIEUR, rendu au navigateur du praticien :
// - le type servi est celui CONSIGNÉ, tiré de la liste fermée et contrôlé à la
//   signature au dépôt, jamais celui d'une requête ; `nosniff` interdit au
//   navigateur d'en deviner un autre ;
// - une image (réencodée au dépôt) est servie sous `sandbox` ;
// - un PDF ne l'est pas : le lecteur PDF du navigateur refuse de s'ouvrir dans
//   un document sandboxé. Il reste un `application/pdf` vérifié (`%PDF-`),
//   rendu par le lecteur isolé du navigateur, jamais interprété comme HTML ;
// - aucun nom de fichier (il n'est pas gardé), aucun cache, aucun référent.

export const runtime = 'nodejs';

const ROUTE_JOURNAL = '/api/praticien/biologie/import/document';
const ID = /^[A-Za-z0-9_-]{1,64}$/;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false, reason, error }, { status });
}

export async function GET(req: Request) {
  try {
    const params = new URL(req.url).searchParams;
    const idPatient = params.get('idPatient')?.trim() ?? '';
    const idCompteRendu = params.get('idCompteRendu')?.trim() ?? '';
    const garde = await garderImport(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);
    if (!ID.test(idCompteRendu)) return echec('invalid', 'Compte rendu mal désigné.', 400);

    const document = await prisma.compteRenduBiologique.findFirst({
      where: { id: idCompteRendu, idPatient },
      select: { contenu: true, typeMime: true },
    });
    if (!document) return echec('compte_rendu_introuvable', 'Ce compte rendu est introuvable dans ce dossier.', 404);
    if (document.contenu === null) {
      return echec('document_purge', 'Le document a été effacé : il ne peut plus être affiché.', 410);
    }
    if (!estTypeCompteRendu(document.typeMime)) return echec('server_error', 'Erreur technique.', 500);

    const enTetes = new Headers({
      'Content-Type': document.typeMime,
      'Content-Disposition': 'inline',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-store, private',
      'Referrer-Policy': 'no-referrer',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    if (document.typeMime !== 'application/pdf') enTetes.set('Content-Security-Policy', 'sandbox');
    return new Response(new Uint8Array(document.contenu), { status: 200, headers: enTetes });
  } catch (err) {
    console.error('[praticien/biologie/import/document GET] refus :', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
