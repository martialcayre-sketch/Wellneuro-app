import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isG5GooglePatientEnabled } from '@/lib/portail/featureFlag';
import {
  COOKIE_ETAT,
  DESTINATION_REFUS,
  configurationGoogle,
  identiteDepuisCode,
  verifierEtatGoogle,
} from '@/lib/portail/googleIdentite';
import { PORTAIL_COOKIE_NAME, PORTAIL_COOKIE_OPTIONS, signPatientSession } from '@/lib/patient-session';
import { PortalAccessError, ensureActivePortalAccess } from '@/lib/consultation/portal-access';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';

// GET /portail/google/retour — retour de Google (gate G5).
//
// Le corps est celui, déjà éprouvé, de `portail/lien/[jeton]/route.ts` :
// vérifier, résoudre le patient, `ensureActivePortalAccess`, poser `wn_portail`
// via `signPatientSession`, rediriger. Ce qui change est seulement la preuve
// présentée à l'entrée — un jeton d'identité Google au lieu d'un lien reçu par
// e-mail. Dans les deux cas la preuve est la même en substance : le contrôle de
// la boîte associée au compte patient.
//
// AUCUN COOKIE NEXTAUTH N'EST ÉMIS ICI. NextAuth reste réservé aux praticiens
// (option A du LOT-03) ; `lib/auth.roles.guard.test.ts` fait échouer la suite si
// ce fichier se met à en importer quoi que ce soit.

export const dynamic = 'force-dynamic';

/**
 * Route journalisée, écrite en dur.
 *
 * `createRequestContext` remplit `route` avec l'URL réelle — laquelle porte
 * ici `code` et `state`. Le code d'autorisation est à usage unique et déjà
 * consommé au moment du log, mais un secret d'authentification n'a rien à
 * faire dans un journal : on journalise le gabarit, jamais l'URL.
 */
const ROUTE_JOURNALISEE = '/portail/google/retour';

function contexteSansSecret(req: Request): RequestContext {
  return { ...createRequestContext(req), route: ROUTE_JOURNALISEE };
}

/** Lit la valeur brute du cookie d'aller, sans rien en interpréter. */
function lireCookieEtat(req: Request): string | null {
  const entete = req.headers.get('cookie');
  if (!entete) return null;
  for (const part of entete.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() !== COOKIE_ETAT) continue;
    return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

/**
 * Le cookie d'aller ne sert qu'une fois : il est effacé dès que l'aller a été
 * reconnu, succès comme refus.
 *
 * **Mais jamais avant.** Les refus qui précèdent la vérification du `state` le
 * laissent en place, sinon n'importe quel site tiers pourrait effacer l'aller
 * d'une personne en cours de connexion en la faisant frapper
 * `/portail/google/retour?error=x` — nuisance sans gravité, mais gratuite.
 * Relevé en revue adversariale le 2026-07-21.
 */
function effacerEtat(res: NextResponse): NextResponse {
  res.cookies.set(COOKIE_ETAT, '', { path: '/', maxAge: 0 });
  return res;
}

export async function GET(req: Request): Promise<NextResponse> {
  if (!isG5GooglePatientEnabled()) {
    return new NextResponse(null, { status: 404 });
  }

  const contexte = contexteSansSecret(req);

  // Passe à `true` dès que le `state` reçu correspond à un aller que nous avons
  // émis. Tant qu'il est `false`, la requête peut venir de n'importe où, et son
  // traitement ne doit toucher à aucun cookie du navigateur.
  let allerReconnu = false;

  /**
   * La sortie unique. Adresse inconnue, non vérifiée, patient inactif, portail
   * révoqué, état invalide, panne : même destination, même écran, même code.
   *
   * Le `motif` reste dans le journal serveur et n'atteint jamais le navigateur.
   *
   * Pas de plancher de durée ici, contrairement à
   * `POST /api/portail/lien/demande` : ce canal-là accepte n'importe quelle
   * adresse saisie, celui-ci n'accepte qu'une adresse dont Google vient
   * d'attester le contrôle. On ne peut donc y sonder que ses propres adresses,
   * ce qui n'énumère rien.
   */
  const refuser = (motif: string): NextResponse => {
    logger.security({
      event: EVENT_CODES.PORTAIL_GOOGLE_REFUS,
      domain: 'SECURITY',
      // 307, et non 302 : c'est ce que `NextResponse.redirect` émet. Un journal
      // qui annonce un autre code complique l'enquête qu'il est censé servir.
      context: finalizeLogContext(contexte, { statusCode: 307, retryable: false }),
      message: `Entrée Google refusée (${motif})`,
    });
    const res = NextResponse.redirect(new URL(DESTINATION_REFUS, req.url));
    return allerReconnu ? effacerEtat(res) : res;
  };

  try {
    const config = configurationGoogle();
    if (!config) return refuser('configuration_absente');

    const url = new URL(req.url);
    // Google renvoie `error=access_denied` quand la personne referme son écran
    // de consentement. Ce n'est pas un incident : même sortie, sans bruit.
    if (url.searchParams.get('error')) return refuser('consentement_refuse');

    const code = url.searchParams.get('code');
    if (!code) return refuser('code_absent');

    const etatAttendu = verifierEtatGoogle(
      lireCookieEtat(req),
      url.searchParams.get('state'),
      new Date(),
    );
    if (!etatAttendu) return refuser('etat_invalide');
    allerReconnu = true;

    // Le jeton d'identité n'apparaît pas ici, et c'est voulu : `identiteDepuisCode`
    // est le seul point d'entrée public du module, précisément pour qu'aucun
    // appelant ne puisse lui fournir un jeton d'une autre provenance que
    // l'échange serveur-à-serveur qu'elle fait elle-même.
    const identite = await identiteDepuisCode(config, code, {
      nonce: etatAttendu.nonce,
      maintenant: new Date(),
    });
    if (!identite) return refuser('identite_non_etablie');

    const patient = await prisma.patient.findUnique({
      where: { email: identite.email },
      select: { idPatient: true, email: true, actif: true, accessTokenRevoked: true },
    });
    // Adresse inconnue, patient désactivé, portail révoqué : trois situations,
    // une seule sortie. C'est ce qui empêche d'apprendre ici qu'une adresse
    // correspond à un patient de ce cabinet.
    if (!patient || !patient.actif || patient.accessTokenRevoked) {
      return refuser('sans_espace_eligible');
    }

    // Verrouille la ligne et refuse si le portail a été révoqué entre-temps.
    // Fournit au passage le jeton permanent, qui reste la clé de l'URL.
    const acces = await ensureActivePortalAccess(patient.idPatient);

    logger.security({
      event: EVENT_CODES.PORTAIL_GOOGLE_CONNEXION,
      domain: 'SECURITY',
      message: 'Entrée Google acceptée, session portail ouverte',
      context: finalizeLogContext(contexte, { statusCode: 307, retryable: false }),
    });

    const res = effacerEtat(NextResponse.redirect(new URL(`/portail/${acces.accessToken}`, req.url)));
    // Le même cookie de session que les deux autres chemins d'entrée — session
    // de COMPTE depuis IDP2 LOT-02. La révocation continue de la couper via
    // `sessionsInvalidesAvant`, sans rien de particulier à prévoir ici.
    res.cookies.set(
      PORTAIL_COOKIE_NAME,
      signPatientSession({ idPatient: patient.idPatient, email: patient.email }),
      PORTAIL_COOKIE_OPTIONS,
    );
    return res;
  } catch (err) {
    if (err instanceof PortalAccessError) return refuser('acces_indisponible');
    logger.error({
      event: EVENT_CODES.PORTAIL_GOOGLE_EXCEPTION,
      domain: 'PORTAIL_PATIENT',
      message: 'Échec du retour Google',
      context: finalizeLogContext(contexte, { statusCode: 307, retryable: true }),
      error: err,
    });
    // Même en panne, la destination ne varie pas.
    return refuser('exception');
  }
}
