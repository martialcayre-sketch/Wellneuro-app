import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isG4LienMagiqueEnabled } from '@/lib/portail/featureFlag';
import { empreinteJeton, etatLien } from '@/lib/portail/lienMagique';
import { PORTAIL_COOKIE_NAME, PORTAIL_COOKIE_OPTIONS, signPatientSession } from '@/lib/patient-session';
import { PortalAccessError, ensureActivePortalAccess } from '@/lib/consultation/portal-access';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';

// GET /portail/lien/[jeton] — entrée par lien magique (gate G4).
//
// Un Route Handler et non une page : en App Router, un composant serveur ne
// peut pas poser de cookie. Celui-ci valide, consomme, ouvre la session, puis
// redirige vers l'espace patient existant.
//
// LE JETON NE SORT PAS DE CETTE FONCTION. Il n'est ni stocké, ni journalisé, ni
// transmis : seule son empreinte sert à retrouver la ligne.
//
// L'URL du portail ne change pas. Après consommation, le patient atterrit sur
// `/portail/<jeton permanent>` — l'espace d'aujourd'hui, qui décide seul de
// l'étape à afficher (gate e-mail, consentement, fiche, anamnèse, hub).

export const dynamic = 'force-dynamic';

/**
 * Route journalisée, écrite en dur.
 *
 * `createRequestContext` remplit `route` avec `sanitizeUrl(req.url)`, qui
 * conserve le chemin — et le chemin, ici, EST le jeton. Laisser faire écrirait
 * un secret d'accès dans les logs à chaque tentative. On journalise donc le
 * gabarit, jamais l'URL réelle.
 */
const ROUTE_JOURNALISEE = '/portail/lien/[jeton]';

function contexteSansJeton(req: Request): RequestContext {
  return { ...createRequestContext(req), route: ROUTE_JOURNALISEE };
}

/**
 * Le seul atterrissage possible en cas de refus. Consommé, expiré, inconnu,
 * portail révoqué : même destination, même code HTTP, même message. Rien à
 * apprendre en sondant.
 */
function refuser(req: Request): NextResponse {
  return NextResponse.redirect(new URL('/portail/lien/indisponible', req.url));
}

export async function GET(
  req: Request,
  { params }: { params: { jeton: string } },
): Promise<NextResponse> {
  // Drapeau éteint : la route n'existe pas. C'est ce qui rend le NO-GO réel —
  // merger la migration n'active rien.
  if (!isG4LienMagiqueEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const contexte = contexteSansJeton(req);
  const refuse = (motif: string, statusCode = 302) => {
    logger.security({
      event: EVENT_CODES.PORTAIL_LIEN_REJEU_REFUSE,
      domain: 'SECURITY',
      message: `Lien magique refusé (${motif})`,
      context: finalizeLogContext(contexte, { statusCode, retryable: false }),
    });
    return refuser(req);
  };

  const jeton = (params.jeton ?? '').trim();
  if (!jeton) return refuse('jeton_absent');

  try {
    const lien = await prisma.portailMagicLink.findUnique({
      where: { jetonEmpreinte: empreinteJeton(jeton) },
      select: { id: true, idPatient: true, expireLe: true, consommeLe: true },
    });

    const maintenant = new Date();

    // Empreinte inconnue : aucune ligne à incrémenter, mais l'événement est tracé.
    if (!lien) return refuse('inconnu');

    const etat = etatLien(lien, maintenant);
    if (etat !== 'valide') {
      // Trace durable, en base : un log Vercel est purgé, et une trace purgée
      // ne prouve plus rien le jour où on la cherche.
      await prisma.portailMagicLink.update({
        where: { id: lien.id },
        data: { rejeuxRefuses: { increment: 1 }, derniereTentative: maintenant },
      });
      return refuse(etat);
    }

    // Consommation ATOMIQUE : `updateMany` filtré sur `consommeLe: null` fait
    // de la vérification et de l'écriture une seule opération. Deux requêtes
    // concurrentes sur le même lien : une seule voit `count === 1`, l'autre est
    // refusée. Un `update` précédé d'une lecture laisserait la fenêtre ouverte
    // entre les deux.
    const consommation = await prisma.portailMagicLink.updateMany({
      where: { id: lien.id, consommeLe: null },
      data: { consommeLe: maintenant },
    });
    if (consommation.count !== 1) return refuse('concurrence');

    // Le patient doit toujours être actif et son portail non révoqué :
    // `ensureActivePortalAccess` verrouille la ligne et lève sinon. Il fournit
    // au passage le jeton permanent, qui reste la clé de l'URL du portail.
    const acces = await ensureActivePortalAccess(lien.idPatient);

    const patient = await prisma.patient.findUnique({
      where: { idPatient: lien.idPatient },
      select: { email: true },
    });
    if (!patient) return refuse('patient_introuvable');

    logger.security({
      event: EVENT_CODES.PORTAIL_LIEN_CONSOMME,
      domain: 'SECURITY',
      message: 'Lien magique consommé, session portail ouverte',
      context: finalizeLogContext(contexte, { statusCode: 302, retryable: false }),
    });

    const res = NextResponse.redirect(new URL(`/portail/${acces.accessToken}`, req.url));
    // Le cookie reste ancré sur le jeton permanent : `isPatientSessionBoundToToken`
    // et les routes qui l'appellent ne changent pas, et toutes les propriétés de
    // révocation d'aujourd'hui sont préservées (réémettre le jeton tue les
    // cookies, `accessTokenRevoked` reste le coupe-circuit global). Cet ancrage
    // sera à déplacer le jour où le jeton permanent disparaîtra — autre gate.
    res.cookies.set(
      PORTAIL_COOKIE_NAME,
      signPatientSession({
        idPatient: lien.idPatient,
        email: patient.email,
        accessToken: acces.accessToken,
      }),
      PORTAIL_COOKIE_OPTIONS,
    );
    return res;
  } catch (err) {
    // Portail révoqué ou patient inactif (`PortalAccessError`) : même refus que
    // tout le reste — un message distinct dirait à un tiers que le lien a existé.
    if (err instanceof PortalAccessError) return refuse('acces_indisponible');
    logger.error({
      event: EVENT_CODES.PORTAIL_SESSION_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec de consommation d’un lien magique',
      context: finalizeLogContext(contexte, { statusCode: 302, retryable: true }),
      error: err,
    });
    return refuser(req);
  }
}
