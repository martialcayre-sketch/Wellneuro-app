import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { isCeQuiCompteEnabled } from '@/lib/patient/featureFlag';
import { preparerEntree, type RefusEntree } from '@/lib/patient/ceQuiCompte';

// Dépôt patient de « ce qui compte pour moi aujourd'hui » (Alliance 6.0-A,
// LOT-03). Route de classe AUTH : le contrôle d'accès prime sur tout le reste.
//
// POST SEUL — et GET, qui ne sert QUE d'interrupteur d'écran (voir plus bas).
// PAS DE PATCH, PAS DE DELETE, et ce n'est pas un manque : la table
// `ce_qui_compte_entrees` n'a pas de colonne `supersedes` (contrairement aux
// quatre autres du LOT-01), donc une entrée ne peut structurellement pas en
// corriger une autre. Une parole déposée se conserve ; on n'ouvre ici aucune
// surface de correction ni de suppression, et proposer d'ajouter la colonne
// serait changer la nature de l'objet, pas le compléter.
//
// Aucun e-mail, aucune notification : tout message neuf passe par le registre
// de gabarits, hors périmètre de ce lot. Ne pas recopier
// `notifierPraticienSignalement` d'`api/portail/trust/signalement`.
//
// Aucun agrégat, aucun décompte, aucune notation : la réponse rend l'entrée
// créée, jamais un total ni un état dérivé. C'est l'invariant de campagne
// « jamais un score » (Alliance 6.0-A, CAMPAGNE.md § Résultat observable), et
// il est adossé à `DC-19`/`DC-20` : noter, compter ou moyenner une parole de
// patient reviendrait à poser une borne clinique sans provenance. Ne PAS citer
// `DC-27` ici — cette règle dit « association ≠ causalité, score ≠ diagnostic »,
// ce qui ne porte pas l'interdit d'agrégation.

export type EntreeDeposee = {
  id: string;
  /** Enregistrement posé par la base. */
  creeLe: string;
  /** Déclaration du patient — `null` quand il n'a rien déclaré. Jamais comblé. */
  saisiLe: string | null;
};

export type PortailCeQuiCompteResponse =
  | { ok: true; ouvert: true }
  | { ok: true; entree: EntreeDeposee }
  | { ok: false; reason: string; error: string };

/**
 * BORNE TECHNIQUE DE TRANSPORT — 64 Kio, en octets annoncés. Ce n'est PAS un
 * seuil : ni clinique, ni un plafond de saisie, et elle ne se substitue pas à
 * `LONGUEUR_MAX_CE_QUI_COMPTE` (4 000 caractères), qui reste la seule borne
 * opposée au patient et qui refuse au lieu de tronquer. Chiffre d'ingénierie,
 * identifié comme tel (`DC-20`) : un dépôt conforme pèse au grand maximum
 * quelques kilooctets, la borne ne vise donc QUE les corps aberrants — un
 * mégaoctet de JSON envoyé sur une route d'écriture qui n'a aucune cadence.
 * Précédent : `api/portail/agenda-alimentaire/route.ts` (32 Kio, refus avant
 * tout parse).
 *
 * Elle est vérifiée AVANT toute lecture du corps : les Route Handlers Next
 * n'imposent aucun plafond, et `req.json()` bufférise l'intégralité du corps
 * en mémoire avant que la validation n'ait la moindre chance de refuser.
 */
const TAILLE_CORPS_MAX_OCTETS = 64 * 1024;

const MESSAGE_CORPS_TROP_GROS = 'Requête trop volumineuse.';

const MESSAGES_REFUS: Record<RefusEntree, string> = {
  texte_absent: 'Écrivez quelques mots avant d’envoyer.',
  texte_trop_long: 'Ce texte est trop long. Raccourcissez-le avant d’envoyer — rien n’est coupé automatiquement.',
  date_invalide: 'La date indiquée n’est pas lisible.',
  date_future: 'La date indiquée est dans le futur.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PortailCeQuiCompteResponse>({ ok: false, reason, error }, { status });
}

/**
 * Ce qu'on a le droit d'écrire au journal — SÛR PAR CONSTRUCTION, pas par
 * accident.
 *
 * Le patron du dépôt journalise `err.message` (`api/portail/ja/observations`).
 * Il est sûr partout où le message ne peut pas porter de donnée. Ici il porte
 * une condition nommée : **les erreurs Prisma recopient les ARGUMENTS de la
 * requête dans leur message** — `PrismaClientValidationError` rend le `data:`
 * du `create`, donc le TEXTE DÉPOSÉ, et `PrismaClientKnownRequestError` rend
 * son `meta`. Sur cette route, `preparerEntree` garantit les types avant le
 * `create` et cette classe est aujourd'hui inatteignable ; mais « aujourd'hui
 * inatteignable » n'est pas un invariant, et c'est exactement le genre de
 * garantie qu'un futur champ optionnel non validé retire en silence.
 *
 * On garde donc de ces erreurs la CLASSE et, quand il existe, le CODE
 * (`P2002`…) : c'est ce dont on se sert réellement pour diagnostiquer un 500
 * sur une route qui n'a qu'un seul `create`, et ni l'un ni l'autre ne peut
 * porter une valeur. Les erreurs non-Prisma (réseau, invariant applicatif)
 * gardent leur message : leur perdre reviendrait à ne plus rien pouvoir
 * diagnostiquer d'inattendu, et elles ne voient pas le corps de la requête.
 */
function messageJournalisable(err: unknown): string {
  if (!(err instanceof Error)) return String(err);
  if (!err.name.startsWith('PrismaClient')) return err.message;
  const code = (err as { code?: unknown }).code;
  return typeof code === 'string' ? `${err.name} (${code})` : err.name;
}

/** Surface fermée : 503, jamais 404 — le chemin existe, il n'est pas ouvert. */
function surfaceFermee() {
  return echec('feature_disabled', 'Cet espace n’est pas encore ouvert.', 503);
}

/**
 * GET — INTERRUPTEUR D'ÉCRAN, et rien d'autre.
 *
 * Ne lit AUCUNE entrée et ne rend AUCUNE donnée patient : uniquement « cette
 * surface est-elle ouverte pour vous ». Le hub du portail est un composant
 * client, qui ne peut pas lire `WN_CE_QUI_COMPTE` (les variables non
 * `NEXT_PUBLIC_*` ne sont pas dans le bundle navigateur, et les lire au SSR
 * ferait diverger l'hydratation). C'est donc la ROUTE qui décide de la
 * visibilité du lien — même idiome que `PropositionPackReevaluation`.
 *
 * Exposer ici la liste des dépôts du patient serait une surface de lecture que
 * ce lot n'a pas cadrée ; on s'en tient à l'interrupteur.
 */
export async function GET(req: Request): Promise<NextResponse<PortailCeQuiCompteResponse>> {
  if (!isCeQuiCompteEnabled()) return surfaceFermee();

  const auth = await authentifierPatientPortail(req);
  if (auth.erreur) return auth.erreur as NextResponse<PortailCeQuiCompteResponse>;

  return NextResponse.json<PortailCeQuiCompteResponse>({ ok: true, ouvert: true });
}

type CorpsDepot = {
  texte?: unknown;
  saisiLe?: unknown;
  /**
   * Toléré à la lecture du type, IGNORÉ à l'exécution. Voir le commentaire de
   * l'écriture plus bas : on n'en fait aucun usage, pas même une comparaison.
   */
  idPatient?: unknown;
};

// POST /api/portail/ce-qui-compte — dépose une entrée. 201.
export async function POST(req: Request): Promise<NextResponse<PortailCeQuiCompteResponse>> {
  // 1 — DRAPEAU D'ABORD, fail-closed. Avant l'authentification, avant le
  //     corps : une surface fermée ne fait travailler ni la vérification de
  //     session, ni la base, ni la validation — pas même munie d'un cookie
  //     valide.
  //
  //     EFFET ASSUMÉ, ET C'EST L'INVERSE DE CE QU'ON POURRAIT CROIRE : cet
  //     ordre rend l'état du DRAPEAU devinable par n'importe qui. Un appelant
  //     sans session reçoit 503 quand la surface est fermée, 401 quand elle
  //     est ouverte — il apprend donc qu'elle est ouverte. Ce qui ne fuit pas,
  //     en revanche : aucune donnée patient, aucune existence de compte,
  //     aucune énumération — l'écart ne dépend que d'une variable
  //     d'environnement, identique pour tous les appelants. On préfère ce
  //     demi-aveu à l'ordre inverse, qui ferait tourner l'authentification et
  //     une requête base sur un chemin qui n'est pas ouvert.
  if (!isCeQuiCompteEnabled()) return surfaceFermee();

  try {
    // 2 — AUTH ENSUITE, avant le corps. Le dépôt connaît les deux ordres ;
    //     pour une route de classe Auth, l'authentification passe devant, de
    //     sorte qu'aucune requête non authentifiée ne fasse travailler la
    //     validation.
    //
    //     `authentifierPatientPortail` et NON `authorizePortail` : celui-ci
    //     exige une assignation et rendrait 404 pour un patient qui n'en a
    //     plus. Or « ce qui compte » n'est pas adossé à un questionnaire ;
    //     précédent motivé mot pour mot dans `api/portail/bilan/route.ts` —
    //     un patient dont le suivi est terminé garde ses droits propres.
    //
    //     401 = session absente, expirée ou illisible ; 403 = cookie lisible
    //     mais COMPTE refusé (désactivé, jeton révoqué, sessions invalidées).
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailCeQuiCompteResponse>;
    const patient = auth.patient;

    // DOSSIER CLOS : LE DÉPÔT RESTE AUTORISÉ, délibérément.
    //
    // Aucune garde sur `suiviClotureLe` ici, et c'est un arbitrage, pas un
    // oubli : la clôture est un état du SUIVI PRATICIEN (elle interdit un
    // nouvel envoi de bilan, une nouvelle proposition), pas un ordre de
    // silence fait au patient. Un patient dont le dossier est clos et le
    // compte actif peut encore déposer ce qui compte pour lui — le praticien
    // le lira ou non, mais l'application ne coupe pas la parole. Ne pas
    // « corriger » cette absence de garde en la posant : c'est le comportement
    // voulu. La révocation du compte, elle, ferme bien la route (403 ci-dessus).

    // 3 — TAILLE DU CORPS, AVANT DE LE LIRE (voir `TAILLE_CORPS_MAX_OCTETS`).
    //
    //     Deux étages, et il en faut deux :
    //
    //     a) `content-length` annoncé au-delà du plafond ⇒ refus SEC. Rien
    //        n'est bufférisé : ni `req.json()`, ni `req.text()` ne sont
    //        appelés, donc le corps n'est jamais lu — c'est le seul étage qui
    //        évite réellement de payer la mémoire.
    //
    //     b) `content-length` ABSENT (transfert `chunked`, un client peut
    //        toujours l'imposer) ou MENSONGER : ce n'est pas un laissez-passer.
    //        On lit alors le corps en texte et on applique la MÊME borne avant
    //        `JSON.parse`. Le corps est arrivé et déjà payé à ce stade — c'est
    //        inévitable sans plafond de plateforme —, mais le coût du parse,
    //        lui, reste borné. Mesure en unités de chaîne, plus permissive que
    //        l'octet pour du texte accentué : la borne étant un ordre de
    //        grandeur au-dessus de ce que la validation accepte, l'écart est
    //        sans effet.
    const annonce = Number(req.headers.get('content-length'));
    if (Number.isFinite(annonce) && annonce > TAILLE_CORPS_MAX_OCTETS) {
      return echec('corps_trop_gros', MESSAGE_CORPS_TROP_GROS, 400);
    }

    // 4 — CORPS.
    const brut = await req.text();
    if (brut.length > TAILLE_CORPS_MAX_OCTETS) {
      return echec('corps_trop_gros', MESSAGE_CORPS_TROP_GROS, 400);
    }
    let corps: CorpsDepot;
    try {
      corps = JSON.parse(brut) as CorpsDepot;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (corps === null || typeof corps !== 'object') {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    // 5 — VALIDATION PURE. Aucune troncature : un texte trop long est refusé.
    const preparation = preparerEntree({ texte: corps.texte, saisiLe: corps.saisiLe });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // 6 — ÉCRITURE UNIQUE.
    //
    // `idPatient` VIENT DE LA SESSION, JAMAIS DU CORPS. Un `idPatient` reçu
    // dans le corps est simplement IGNORÉ — pas comparé, pas rejeté : le
    // comparer laisserait croire qu'il compte pour quelque chose, et un jour
    // quelqu'un écrirait `body.idPatient ?? session.idPatient` en pensant
    // relâcher une garde décorative. Même esprit que la barrière 3 d'
    // `api/portail/agenda-alimentaire/route.ts`.
    //
    // `creeLe` n'est PAS transmis : la base pose le présent
    // (`@default(now())`). C'est ce qui rend un dépôt inantidatable, et c'est
    // la seconde des deux dates. `saisiLe` reste `null` s'il l'est — jamais
    // comblé par `creeLe`, ici ni à l'affichage.
    //
    // `create` et non `upsert` : deux dépôts successifs font deux lignes.
    // Rien ne s'écrase — invariant de campagne « append-only par référence »
    // (Alliance 6.0-A, CAMPAGNE.md). Aucun `DC-nn` ne le porte : `DC-30`
    // traite des DISCORDANCES qu'on ne moyenne pas, ce qui est une autre
    // question, et le citer ici serait s'appuyer sur une règle qui ne dit pas
    // cela.
    const creee = await prisma.entreeCeQuiCompte.create({
      data: {
        idPatient: patient.idPatient,
        texte: preparation.donnees.texte,
        saisiLe: preparation.donnees.saisiLe,
      },
      select: { id: true, creeLe: true, saisiLe: true },
    });

    return NextResponse.json<PortailCeQuiCompteResponse>(
      {
        ok: true,
        entree: {
          id: creee.id,
          creeLe: creee.creeLe.toISOString(),
          saisiLe: creee.saisiLe ? creee.saisiLe.toISOString() : null,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    // JAMAIS le texte déposé, jamais l'e-mail du patient dans un log — et
    // c'est `messageJournalisable` qui le tient, pas la chance : voir la
    // condition nommée à sa définition.
    console.error('[portail/ce-qui-compte POST]', messageJournalisable(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
