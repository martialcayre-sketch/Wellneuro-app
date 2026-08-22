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
// créée, jamais un total ni un état dérivé (`DC-27`).

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

const MESSAGES_REFUS: Record<RefusEntree, string> = {
  texte_absent: 'Écrivez quelques mots avant d’envoyer.',
  texte_trop_long: 'Ce texte est trop long. Raccourcissez-le avant d’envoyer — rien n’est coupé automatiquement.',
  date_invalide: 'La date indiquée n’est pas lisible.',
  date_future: 'La date indiquée est dans le futur.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<PortailCeQuiCompteResponse>({ ok: false, reason, error }, { status });
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
  //     corps : une surface fermée ne doit rien apprendre à personne, pas même
  //     si une session est valide.
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

    // 3 — CORPS.
    let corps: CorpsDepot;
    try {
      corps = (await req.json()) as CorpsDepot;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (corps === null || typeof corps !== 'object') {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    // 4 — VALIDATION PURE. Aucune troncature : un texte trop long est refusé.
    const preparation = preparerEntree({ texte: corps.texte, saisiLe: corps.saisiLe });
    if (!preparation.ok) {
      return echec(preparation.raison, MESSAGES_REFUS[preparation.raison], 400);
    }

    // 5 — ÉCRITURE UNIQUE.
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
    // Rien ne s'écrase (invariant de campagne, `DC-30`).
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
    // JAMAIS le texte déposé, jamais l'e-mail du patient dans un log : les
    // routes portail ne journalisent que `err.message` (précédent
    // `api/portail/ja/observations`).
    console.error('[portail/ce-qui-compte POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
