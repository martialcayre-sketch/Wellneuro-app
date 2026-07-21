import { NextResponse } from 'next/server';
import { isG5GooglePatientEnabled } from '@/lib/portail/featureFlag';
import {
  COOKIE_ETAT,
  DESTINATION_REFUS,
  DUREE_ETAT_MS,
  configurationGoogle,
  construireUrlAutorisation,
  creerEtatGoogle,
} from '@/lib/portail/googleIdentite';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';

// GET /portail/google — départ du chemin d'entrée par Google (gate G5).
//
// Un Route Handler et non une page : il faut poser un cookie (l'état d'aller)
// et rediriger, ce qu'un composant serveur ne peut pas faire en App Router.
//
// Rien n'est lu en base ici, et c'est voulu : cette route ne sait pas encore de
// qui il s'agit. Tout ce qui touche au patient se passe au retour.

export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<NextResponse> {
  // Drapeau éteint : la route n'existe pas. Merger 03c n'active rien — c'est
  // l'activation (03d) qui est une décision, pas le merge.
  if (!isG5GooglePatientEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const contexte = createRequestContext(req);
  const config = configurationGoogle();

  if (!config) {
    // État normal de la production entre le merge de 03c et l'activation : le
    // drapeau peut être allumé avant que le client OAuth existe. On refuse par
    // la sortie commune plutôt que de lever une 500.
    logger.security({
      event: EVENT_CODES.PORTAIL_GOOGLE_REFUS,
      domain: 'SECURITY',
      message: 'Chemin Google sollicité sans client OAuth configuré',
      // 307 : ce que `NextResponse.redirect` émet réellement.
      context: finalizeLogContext(contexte, { statusCode: 307, retryable: false }),
    });
    return NextResponse.redirect(new URL(DESTINATION_REFUS, req.url));
  }

  const { etat, cookie } = creerEtatGoogle(new Date());
  const res = NextResponse.redirect(construireUrlAutorisation(config, etat));

  res.cookies.set(COOKIE_ETAT, cookie, {
    httpOnly: true,
    // Même convention que le cookie de session portail : Secure sauf quand
    // NEXTAUTH_URL est explicitement en http (e2e de parité production sur
    // localhost, où WebKit refuse de stocker un cookie Secure).
    secure: !(process.env.NEXTAUTH_URL ?? 'https://').startsWith('http://'),
    // `lax` et non `strict` : le retour est une navigation venue de Google,
    // donc d'un autre site. En `strict`, le cookie ne serait pas renvoyé et
    // aucune connexion n'aboutirait jamais.
    sameSite: 'lax',
    path: '/',
    maxAge: Math.floor(DUREE_ETAT_MS / 1000),
  });
  return res;
}
