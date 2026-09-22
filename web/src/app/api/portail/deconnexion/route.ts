import { NextResponse } from 'next/server';
import { PORTAIL_COOKIE_NAME, PORTAIL_COOKIE_OPTIONS, readPatientSession } from '@/lib/patient-session';
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
//
// CE N'EST PAS UNE PROTECTION CSRF, et il ne faut pas le lire comme telle : un
// `<form method="POST">` auto-soumis depuis un site tiers atteint toujours cette
// route. `SameSite=Lax` empêche le cookie de PARTIR avec cette requête — donc le
// tiers n'apprend rien et n'agit sur rien — mais le `Set-Cookie` de la réponse,
// lui, s'applique : un tiers peut encore forcer une déconnexion. Aucune donnée
// n'est exposée et aucun état serveur ne bouge ; c'est une nuisance, assumée
// comme telle. Un contrôle `Origin`/`Sec-Fetch-Site` la fermerait, et reste à
// faire le jour où ce geste coûtera plus qu'un reclic.

export const dynamic = 'force-dynamic';

export async function POST(req: Request): Promise<NextResponse> {
  const contexte = createRequestContext(req);

  // Lue avant d'effacer, pour savoir s'il y avait une session à fermer. On ne
  // journalise QUE ce booléen : ni identifiant, ni adresse — la règle
  // `auth-securite.md` vaut ici comme ailleurs.
  const avaitUneSession = readPatientSession(req) !== null;

  const res = NextResponse.json({ ok: true });
  // ON ÉTALE `PORTAIL_COOKIE_OPTIONS`, ON NE LE RECOPIE PAS. Un cookie ne
  // s'efface que si ses attributs correspondent à ceux de la pose : un `path`
  // ou un `domain` divergent laisserait l'original en place, et la déconnexion
  // mentirait — sans erreur nulle part.
  //
  // La première version recopiait les quatre attributs à la main. Elle était
  // juste, et c'est précisément le problème : la revue adversariale a ajouté un
  // `domain` à la POSE seulement, et les 16 bancs sont restés VERTS. Recopier,
  // c'est créer une seconde source de vérité qui dérive en silence au prochain
  // attribut ajouté. `maxAge: 0` est le seul écart, et il est l'objet même du
  // geste.
  res.cookies.set(PORTAIL_COOKIE_NAME, '', { ...PORTAIL_COOKIE_OPTIONS, maxAge: 0 });

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
