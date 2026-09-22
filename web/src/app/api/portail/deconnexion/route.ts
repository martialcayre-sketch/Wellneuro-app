import { NextResponse } from 'next/server';
import { PORTAIL_COOKIE_NAME, readPatientSession } from '@/lib/patient-session';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';

// POST /api/portail/deconnexion — le patient ferme sa session.
//
// CE GESTE N'EXISTAIT PAS, et jusqu'ici il n'avait pas besoin d'exister : la
// session durait 12 h, elle se fermait d'elle-même avant la fin de la journée.
// En la portant à 30 jours glissants, on retire cette fermeture automatique —
// il faut donc en rendre une. Sur un ordinateur familial, « je ne peux pas me
// déconnecter » cesse d'être un détail quand la session survit un mois.
//
// CE QUE CETTE ROUTE FAIT, EXACTEMENT : elle efface le cookie du navigateur qui
// appelle. Rien de plus. La session portail est sans état côté serveur — une
// charge signée, pas une ligne en base — donc un cookie DÉJÀ COPIÉ ailleurs
// n'est pas tué par ce geste. Ce n'est pas un oubli : le coupe-circuit qui tue
// une session partout est la révocation praticien (`sessionsInvalidesAvant`),
// et c'est elle qu'il faut employer quand un accès est compromis. Écrit ici
// pour qu'aucune lecture rapide ne prête à cette route une portée qu'elle n'a
// pas.
//
// POST et non GET : un `<img src="/api/portail/deconnexion">` sur un site tiers
// déconnecterait les patients au passage. La nuisance est bénigne, l'éviter est
// gratuit.

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const contexte = createRequestContext(req);

  // Lue avant d'effacer, pour savoir s'il y avait une session à fermer. On ne
  // journalise QUE ce booléen : ni identifiant, ni adresse — la règle
  // `auth-securite.md` vaut ici comme ailleurs.
  const avaitUneSession = readPatientSession(req) !== null;

  const res = NextResponse.json({ ok: true });
  // `maxAge: 0` ET les mêmes attributs qu'à la pose : un cookie ne s'efface que
  // si `path` (et le reste) correspondent. Un effacement posé sur un autre
  // `path` laisserait l'original en place, et la déconnexion mentirait.
  res.cookies.set(PORTAIL_COOKIE_NAME, '', {
    httpOnly: true,
    secure: !(process.env.NEXTAUTH_URL ?? 'https://').startsWith('http://'),
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  logger.security({
    event: EVENT_CODES.PORTAIL_SESSION_FERMEE,
    domain: 'SECURITY',
    message: avaitUneSession
      ? 'Session portail fermée par le patient'
      : 'Déconnexion demandée sans session ouverte',
    context: finalizeLogContext(contexte, { statusCode: 200, retryable: false }),
  });

  return res;
}
