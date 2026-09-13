import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { evaluerOrientationPourPatient } from '@/lib/clinical/orientationService';
import {
  cibleBienFormee,
  cleCibleEcartement,
  motifRecevable,
  motifStockable,
  teteDuFil,
  verdictPourCible,
  type GesteEcartement,
} from '@/lib/orientation/ecartements';

// ÉCARTEMENT PRATICIEN D'UNE PROPOSITION D'ORIENTATION — [[D-178]].
//
// Deux gestes sur la même route, parce qu'ils écrivent dans le MÊME fil et
// partagent tous leurs contrôles : `ecarter` et `reprendre`. L'état courant est
// la TÊTE de chaîne, jamais la ligne la plus récente par date.
//
// ── LES SIX CONTRÔLES DUS, ET COMMENT CHACUN EST TENU ──────────────────────
//
// La migration ferme tout ce qu'une contrainte de base PEUT fermer ; six règles
// restaient à la charge de cette route, et sa migration les nomme. Ici :
//
//   1. `regles_au_geste` contient des RÈGLES, jamais des cibles. Fermé PAR
//      CONSTRUCTION, et c'est le point le plus important de ce fichier : la
//      route n'accepte AUCUNE règle du client. Elle rejoue l'orientation et
//      prend les `regleId` des motifs que le moteur sert aujourd'hui pour cette
//      cible. Un client ne peut donc pas figer une liste qui empêcherait tout
//      réveil — ce qui ferait taire un axe en silence (`DC-30`).
//   2-5. `supersedes` désigne une ligne EXISTANTE, de la MÊME cible, du MÊME
//      dossier, et qui est la TÊTE COURANTE. Fermés par construction aussi : la
//      route ne prend jamais un `supersedes` du client — elle lit le fil de ce
//      (dossier, cible) et chaîne sur la tête qu'elle vient de calculer.
//   6. L'ALTERNANCE DES ESPÈCES est vérifiée explicitement : on ne reprend que
//      ce qui est écarté, et on n'écarte pas ce qui est DÉJÀ écarté — jugé sur le
//      verdict (règles actuelles comprises), pas sur le fil seul. Une ligne
//      RÉVEILLÉE se ré-écarte, et le long commentaire de la branche `ecarter`
//      explique pourquoi c'est le seul geste qui ait du sens là.
//
// ── DEUX ÉCARTS AUX PATRONS VOISINS, ASSUMÉS ───────────────────────────────
//
// CE POST ÉCRIT ET NE JOURNALISE PAS : dispense GD-1, la même que
// `cockpit/priorite` ([[D-127]]) et que les deux points de persistance du
// protocole — une écriture laisse déjà sa propre trace datée et attribuée, et
// c'est même ici l'objet de la table.
//
// LA GARDE D'APPARTENANCE NE PASSE PAS PAR `verifierAppartenancePatient`, qui
// distingue « introuvable » (404) de « autre praticien » (403). Sur une ÉCRITURE,
// cette distinction confirmerait à un praticien l'existence du dossier d'un
// autre. Les deux cas tombent donc en 404, et le filtre d'appartenance est porté
// par la requête elle-même (`filtrePatientsDuPraticien`) — le dossier d'un autre
// n'est pas refusé, il n'est pas trouvé. La dispense de journal rend d'ailleurs
// l'autre helper inutile ici : c'est lui qui journalise.
//
// ── CE QUE LA COURSE LAISSE, ET CE QUI LA RATTRAPE ─────────────────────────
//
// Deux écartements concurrents sur la même cible lisent tous deux « aucune
// tête » et tentent deux racines : l'index PARTIEL de racine refuse le second
// (`23505`). Deux reprises concurrentes chaînent sur la même tête : l'unicité de
// `supersedes_ecartement_id` refuse la seconde. La base tranche donc, et cette
// route traduit le refus en phrase française plutôt que de laisser fuiter un
// code d'erreur Postgres.

type Raison =
  | 'unauthenticated'
  | 'invalid'
  | 'not_found'
  | 'not_proposed'
  | 'conflict'
  | 'broken_thread'
  | 'exception';

export type EcartementPropositionResponse =
  | { ok: true; ecartementId: string }
  | { ok: false; reason: Raison; error: string };

function echec(reason: Raison, error: string, status: number): NextResponse<EcartementPropositionResponse> {
  return NextResponse.json<EcartementPropositionResponse>({ ok: false, reason, error }, { status });
}

/** Le code d'unicité de Postgres, tel que Prisma le remonte. */
function estConflitUnicite(erreur: unknown): boolean {
  return typeof erreur === 'object'
    && erreur !== null
    && (erreur as { code?: unknown }).code === 'P2002';
}

export async function POST(req: Request): Promise<NextResponse<EcartementPropositionResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

  try {
    const corps = (await req.json().catch(() => null)) as {
      idPatient?: unknown;
      cibleId?: unknown;
      action?: unknown;
      motif?: unknown;
    } | null;

    const idPatient = corps && typeof corps.idPatient === 'string' ? corps.idPatient.trim() : '';
    const cibleId = corps && typeof corps.cibleId === 'string' ? corps.cibleId.trim() : '';
    const action = corps && typeof corps.action === 'string' ? corps.action : '';
    const motif = corps ? corps.motif : undefined;

    if (!idPatient || idPatient.length > 64) return echec('invalid', 'Dossier invalide.', 400);
    // La forme de la cible est celle que le CHECK de la base impose : la refuser
    // ICI plutôt que de laisser remonter un `23514` opaque au praticien.
    if (!cibleBienFormee(cibleId)) return echec('invalid', 'Cible invalide.', 400);
    if (action !== 'ecarter' && action !== 'reprendre') {
      return echec('invalid', 'Geste inconnu.', 400);
    }
    // LE MOTIF EST LA DÉCISION, pas une note facultative — y compris sur une
    // reprise : rouvrir une exploration qu'on avait refusée se justifie autant
    // que l'avoir refusée.
    if (!motifRecevable(motif)) {
      return echec('invalid', 'Un motif écrit est requis (2 000 caractères au plus).', 400);
    }
    // STOCKÉ SANS SES BORDS BLANCS : la base garde ce qu'on lui donne, et deux
    // motifs identiques à un saut de ligne près se liraient comme deux textes
    // différents à l'audit. Le milieu n'est pas touché.
    const motifEcrit = motifStockable(motif);

    const emailSession = emailPraticien(session);
    if (!emailSession) return echec('unauthenticated', 'Authentification requise.', 401);

    // Garde d'appartenance : le dossier d'un autre praticien est introuvable.
    const patient = await prisma.patient.findFirst({
      where: { idPatient, ...filtrePatientsDuPraticien(emailSession) },
      select: { idPatient: true },
    });
    if (!patient) return echec('not_found', 'Dossier introuvable.', 404);

    // LE FIL DE CETTE CIBLE, ENTIER. La tête ne se lit qu'en sachant qui
    // supplante qui — pas en prenant la ligne la plus récente.
    const lignes = await prisma.ecartementProposition.findMany({
      where: { idPatient, cibleId },
      select: {
        id: true,
        cibleId: true,
        espece: true,
        reglesAuGeste: true,
        motif: true,
        parEmail: true,
        faitLe: true,
        supersedesEcartementId: true,
      },
    });
    const fil: GesteEcartement[] = lignes.map(ligne => ({
      id: ligne.id,
      cibleId: ligne.cibleId,
      espece: ligne.espece === 'reprise' ? 'reprise' : 'ecartement',
      reglesAuGeste: [...ligne.reglesAuGeste],
      motif: ligne.motif,
      parEmail: ligne.parEmail,
      faitLe: ligne.faitLe.toISOString(),
      supersedesEcartementId: ligne.supersedesEcartementId,
    }));
    const tete = fil.length === 0 ? null : teteDuFil(fil);
    // Des lignes existent mais aucune tête ne se dégage : cycle, `supersedes`
    // pendouillant, ou deux racines. On n'écrit PAS dans un fil qu'on ne sait
    // pas lire — ce serait ajouter au désordre, et l'écran affiche déjà la
    // proposition comme visible dans ce cas.
    if (fil.length > 0 && tete === null) {
      return echec(
        'broken_thread',
        "L'historique de cette proposition est incohérent : aucun geste n'est enregistré tant qu'il n'est pas corrigé.",
        409,
      );
    }

    if (action === 'reprendre') {
      // UNE REPRISE NE CONSULTE NI LE MOTEUR NI `orientationActive()`, et c'est
      // délibéré. Elle DÉFAIT un geste : la subordonner à l'état du drapeau ou à
      // ce que la table propose aujourd'hui rendrait un écartement indéfectible
      // le jour où le drapeau tombe, ou le jour où la cible cesse d'être
      // proposée. Défaire doit rester possible quand faire ne l'est plus.
      //
      // ALTERNANCE : on ne reprend que ce qui est écarté.
      if (tete === null || tete.espece !== 'ecartement') {
        return echec('conflict', "Cette proposition n'est pas écartée.", 409);
      }
      try {
        const cree = await prisma.ecartementProposition.create({
          data: {
            idPatient,
            cibleId,
            espece: 'reprise',
            // VIDE sur une reprise : une reprise ne motive rien, et le CHECK de
            // la base refuse une liste non vide sur cette espèce.
            reglesAuGeste: [],
            motif: motifEcrit,
            parEmail: emailSession,
            supersedesEcartementId: tete.id,
          },
          select: { id: true },
        });
        return NextResponse.json<EcartementPropositionResponse>({ ok: true, ecartementId: cree.id });
      } catch (erreur) {
        if (estConflitUnicite(erreur)) {
          return echec('conflict', 'Un autre geste vient d’être enregistré sur cette proposition. Rechargez la fiche.', 409);
        }
        throw erreur;
      }
    }

    // ── ÉCARTER ──────────────────────────────────────────────────────────────
    //
    // L'ORIENTATION EST LUE AVANT DE JUGER L'ALTERNANCE, et cet ordre est un
    // correctif, pas une préférence.
    //
    // La première rédaction jugeait l'alternance sur le FIL SEUL : tête =
    // `ecartement` ⇒ refus. Le service, lui, juge l'état sur le fil ET les règles
    // actuelles. Les deux divergent exactement pendant un RÉVEIL — le fil a bien
    // un écartement pour tête, et l'écran montre pourtant la ligne comme à
    // examiner. Le praticien se voyait alors refuser l'écartement d'une ligne
    // visible (« déjà écartée »), sans autre sortie : « Reprendre » ne vit que
    // dans le repli des écartées, où une ligne réveillée n'est PAS. La cible
    // restait gelée tant que la règle neuve s'allumait — sur le cas même que
    // [[D-178]] existe pour couvrir.
    //
    // L'en-tête de la migration qualifie un `ecartement` supplantant un
    // `ecartement` de « représentable et sans aucun sens ». Cette phrase a une
    // prémisse fausse, et c'est le réveil qui la falsifie : ré-écarter une ligne
    // REVENUE est un geste plein de sens — c'est le seul qui fige les règles
    // NEUVES, et sans lui la ligne se réveillerait aussitôt sur la même règle.
    // Le fichier de migration ne peut pas être corrigé : il est appliqué en
    // production, et Prisma en garde l'empreinte — la retoucher, même sur un
    // commentaire, casserait `migrate deploy`. La correction vit donc ici.
    //
    // Ce qui reste refusé est le geste VIDE : ré-écarter sans qu'aucune règle
    // neuve ne soit apparue. C'est cela que « déjà écartée » désigne désormais.

    // LES RÈGLES VIENNENT DU SERVEUR, JAMAIS DU CLIENT. C'est ce qui rend le
    // réveil fiable : un client pourrait sinon figer une liste qui couvre tout
    // et empêcherait la proposition de revenir, quel que soit l'axe qui la
    // motive plus tard.
    const orientation = await evaluerOrientationPourPatient(idPatient);
    if (orientation.actif !== true) {
      return echec('not_proposed', "L'orientation n'est pas active sur cet environnement.", 409);
    }
    const proposee = orientation.recommandations.find(
      recommandation => cleCibleEcartement(recommandation.cible) === cibleId,
    );
    // On n'écarte pas ce qui n'est pas proposé : l'écartement figerait alors une
    // liste de règles VIDE, que le CHECK de la base refuse — et à raison, un tel
    // écartement ne se réveillerait jamais.
    if (!proposee) {
      return echec(
        'not_proposed',
        "Cette exploration n'est plus proposée : il n'y a rien à écarter. Rechargez la fiche.",
        409,
      );
    }
    const reglesAuGeste = [...new Set(proposee.motifs.map(motifRegle => motifRegle.regleId))].sort();

    // ALTERNANCE, jugée sur le VERDICT — donc avec les règles actuelles — et non
    // sur le fil seul. Le nouvel écartement chaîne sur la tête réveillée et fige
    // les règles du moment, règle neuve comprise : sans cela, la ligne
    // reviendrait immédiatement au motif qui vient de la ramener.
    if (tete !== null && tete.espece === 'ecartement') {
      const verdict = verdictPourCible(tete, reglesAuGeste);
      if (verdict.etat === 'ecartee') {
        return echec('conflict', 'Cette proposition est déjà écartée.', 409);
      }
    }

    try {
      const cree = await prisma.ecartementProposition.create({
        data: {
          idPatient,
          cibleId,
          espece: 'ecartement',
          reglesAuGeste,
          motif: motifEcrit,
          parEmail: emailSession,
          supersedesEcartementId: tete === null ? null : tete.id,
        },
        select: { id: true },
      });
      return NextResponse.json<EcartementPropositionResponse>({ ok: true, ecartementId: cree.id });
    } catch (erreur) {
      if (estConflitUnicite(erreur)) {
        return echec('conflict', 'Un autre geste vient d’être enregistré sur cette proposition. Rechargez la fiche.', 409);
      }
      throw erreur;
    }
  } catch {
    // Jamais le détail : un message d'erreur de base peut porter le contenu de la
    // ligne refusée, donc le motif écrit par le praticien.
    return echec('exception', 'Erreur technique.', 500);
  }
}
