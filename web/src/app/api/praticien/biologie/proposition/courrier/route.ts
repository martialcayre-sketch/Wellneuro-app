import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderProposition, type VerdictGarde } from '@/lib/biology-library/gardeProposition';
import { deriverPropositionPourPatient } from '@/lib/biology-library/propositionService';
import { genererCourrierBiologie } from '@/lib/biology-library/courrier';
import { isCbResultsEnabled } from '@/lib/biology-library/featureFlag';
import { INDICATIONS_BIOLOGIE_SHA256 } from '@/lib/biology-library/indicationsBiologieV1';
import { preparerCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import { refusPartage, verdictPartageMedecin } from '@/lib/trust/consentementPartage';

// Courrier médecin de la proposition de bilan ([[D-073]]) — dernier appelant
// manquant du LOT-06.
//
// LE TEXTE EST GÉNÉRÉ CÔTÉ SERVEUR, JAMAIS REÇU DU CLIENT. La lettre doit
// passer par `assertRenduMedecinNonPrescriptif` avant d'être consignée : un
// courrier qui ne se rend pas ne se consigne pas. Accepter un texte du
// navigateur permettrait de consigner n'importe quoi comme « la lettre », et
// la garde non prescriptive deviendrait contournable par construction.
//
// L'ANCRE EST CELLE DU DOCUMENT RENDU. `ancrage_sha256` et `ancrage_version`
// sont relus dans la `provenance` du bloc effectivement rendu — pas
// reconstruits, pas fournis par l'appelant. C'est ce qui fait de ces colonnes
// une garde et non deux champs de plus ([[D-073]] §2).
//
// Le praticien ne fournit qu'une chose : le libellé du médecin destinataire.
// L'auteur, la date et l'ancre viennent tous du serveur.
//
// Remise MANUELLE : aucun envoi. La réponse rend DEUX formes du même
// courrier — `texte` à transcrire, `html` à imprimer — toutes deux issues du
// même rendu jugé par la garde. Le `html` n'est PAS consigné : la base garde
// le texte, l'impression est un artefact de sortie.

const ROUTE_JOURNAL = '/api/praticien/biologie/proposition/courrier';

export type CourrierApiResponse =
  | {
      ok: true;
      texte: string;
      /** Rendu médecin autonome et imprimable — jamais consigné, jamais reçu du client. */
      html: string;
      ancrageSha256: string;
      ancrageVersion: string;
    }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS_COURRIER: Record<string, string> = {
  aucune_exploration_proposee:
    'Aucune exploration n’est proposée pour ce dossier : il n’y a pas de courrier à établir.',
  bloc_non_diffuse:
    'Le rendu médecin n’est pas diffusable : le texte jugé par la garde est absent. '
    + 'Rien n’est consigné.',
  terme_prescriptif:
    'Le courrier n’a pas pu être rendu : un libellé du catalogue porte un terme prescriptif. '
    + 'Rien n’est consigné.',
};

const MESSAGES_REFUS_CONSIGNATION: Record<string, string> = {
  medecin_libelle_vide: 'Le nom du médecin destinataire est requis.',
  medecin_libelle_email: 'Indiquez un nom de médecin, pas une adresse e-mail.',
  medecin_libelle_trop_long: 'Le nom du médecin est trop long (200 caractères maximum).',
  texte_vide: 'Le courrier généré est vide : rien n’est consigné.',
  texte_trop_long:
    'Le courrier généré dépasse la longueur consignable (8 000 caractères) : rien '
    + 'n’est consigné. La proposition dérivée est inhabituellement longue — à signaler.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CourrierApiResponse>({ ok: false, reason, error }, { status });
}

function depuisVerdict(verdict: Exclude<VerdictGarde, { ok: true }>) {
  return echec(verdict.reason, verdict.error, verdict.status);
}

type PostBody = { idPatient?: unknown; medecinLibelle?: unknown };

export async function POST(req: Request) {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    // `null`, `42`, `"texte"` et `[]` sont du JSON parfaitement valide :
    // sans cette garde, `body.idPatient` lèverait AVANT toute session — un
    // 500 que n'importe quel client anonyme peut fabriquer (patron de la
    // route document-patient).
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    // `acces` EST fourni ici, contrairement au POST de déclaration : cette
    // route LIT le dossier entier pour en dériver la proposition, et une
    // lecture de dossier nommé se journalise (G-TRUST-04).
    const garde = await garderProposition(idPatient, { route: ROUTE_JOURNAL, methode: 'POST' });
    if (!garde.ok) return depuisVerdict(garde);

    // Le courrier est une pièce du dossier : le refus vit dans la route, pas
    // seulement dans l'écran.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      // `prenom`/`nom` : l'en-tête du papier doit dire DE QUI il parle — une
      // lettre remise à un médecin sans nom de patient n'est pas exploitable.
      // Cette lecture est celle d'un dossier NOMMÉ, déjà journalisée par
      // `garderProposition` ci-dessus ; elle ne sort pas d'ici : le nom entre
      // dans le HTML rendu, jamais dans le texte consigné ni dans un log.
      select: { actif: true, suiviClotureLe: true, prenom: true, nom: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // LE CONSENTEMENT EST UNE GARDE DEPUIS LE 2026-09-17 ([[D-219]] §3 amendé).
    // Ce courrier-ci est celui que la finalité vise nommément — il part au
    // MÉDECIN TRAITANT. Le refus, le retrait ET le silence le ferment.
    //
    // POURQUOI AVANT LA GÉNÉRATION et non après : produire la lettre puis la
    // jeter ferait tourner le moteur sur un dossier dont le patient a dit non,
    // et laisserait une trace de lecture pour rien.
    const choix = await prisma.trustChoiceEvent.findMany({
      where: { idPatient, finalite: 'partage_medecin_traitant' },
      select: { finalite: true, statut: true, enregistreLe: true },
    });
    const verdict = verdictPartageMedecin(choix);
    if (verdict.bloquant) {
      const refus = refusPartage(verdict);
      return echec(refus.raison, refus.message, 409);
    }

    const maintenant = new Date().toISOString();
    const proposition = await deriverPropositionPourPatient(idPatient, maintenant);
    if (!proposition.ok) {
      // L'abstention du moteur n'est pas une erreur technique : son motif est
      // écrit pour être lu par le praticien.
      return echec('proposition_indisponible', proposition.motif, 409);
    }

    const genere = genererCourrierBiologie({
      patientId: idPatient,
      lignes: proposition.proposition.lignes,
      // Le SHA VIVANT de la table, recalculé à l'import depuis les règles
      // réellement publiées — jamais le littéral figé de la signature, qui
      // dirait ce qui a été relu, pas ce qui a servi.
      tableSha256: INDICATIONS_BIOLOGIE_SHA256,
      dateCourrier: maintenant,
      patientNom: `${patient.prenom} ${patient.nom}`.trim(),
      // La phrase « aucun résultat conservé » suit l'état réel de l'étage 2.
      resultatsActifs: isCbResultsEnabled(),
    });
    if (!genere.ok) {
      return echec(genere.raison, MESSAGES_REFUS_COURRIER[genere.raison] ?? 'Courrier indisponible.', 409);
    }

    // L'ancre vient du bloc EFFECTIVEMENT RENDU, celui que la garde non
    // prescriptive a jugé. La reconstruire ici rouvrirait l'écart entre ce qui
    // a été rendu et ce qui est consigné.
    const provenance = genere.courrier.document.blocs[0]?.provenance;
    if (!provenance) {
      return echec('provenance_absente', 'Courrier sans provenance : rien n’est consigné.', 500);
    }

    const preparation = preparerCorrespondance({
      idPatient,
      praticienEmail: garde.email,
      sens: 'sortant',
      medecinLibelle: body.medecinLibelle,
      texte: genere.courrier.texte,
    });
    if (!preparation.ok) {
      // `texte_vide` et `texte_trop_long` portent sur un texte que le SERVEUR
      // a généré : un 400 accuserait le client d'un refus dont il n'est pas
      // l'auteur (revue B3). Les refus de libellé, eux, restent siens.
      const refusServeur = preparation.raison === 'texte_vide' || preparation.raison === 'texte_trop_long';
      return echec(
        preparation.raison,
        MESSAGES_REFUS_CONSIGNATION[preparation.raison] ?? 'Consignation refusée.',
        refusServeur ? 409 : 400,
      );
    }

    const correspondance = {
      ...preparation.donnees,
      ancrageSha256: provenance.ancrageHash,
      ancrageVersion: provenance.version,
    };
    try {
      // RELECTURE DU CONSENTEMENT JUSTE AVANT L'INSERTION — constat de la revue
      // Copilot, retenu. La première lecture a lieu AVANT la génération de la
      // lettre ; entre les deux, le patient peut retirer son accord depuis son
      // portail. La fenêtre est brève, mais ce qu'elle laisse passer est
      // exactement ce que ce lot existe pour empêcher : une consignation contre
      // un refus explicite.
      //
      // SON VERROU, EN REVANCHE, EST ÉCARTÉ, et le motif mérite d'être gardé.
      // La revue a proposé d'abord `pg_advisory_xact_lock`, puis un
      // `SELECT … FOR UPDATE` sur `patients`. AUCUN DES DEUX NE SÉRIALISE QUOI
      // QUE CE SOIT ICI : un verrou ne retient que les parties qui le prennent,
      // et l'écrivain du consentement — `POST /api/portail/trust/choix` — ne
      // prend aucun verrou, n'ouvre aucune transaction, et ne touche jamais la
      // table `patients`. Le `FOR UPDATE` aurait donc coûté une contention sur
      // les écritures réelles du dossier pour une protection nulle.
      //
      // CE QUI RESTE VRAI SANS LUI : en READ COMMITTED, la relecture voit tout
      // retrait déjà validé, et l'insertion suit immédiatement. La fenêtre passe
      // de « toute la génération de la lettre » à quelques microsecondes. Une
      // sérialisation réelle demanderait que la route du portail prenne le même
      // verrou — c'est un autre lot, et il n'est pas ouvert.
      const transaction = await prisma.$transaction(async (tx) => {
        const choixRelu = await tx.trustChoiceEvent.findMany({
          where: { idPatient, finalite: 'partage_medecin_traitant' },
          select: { finalite: true, statut: true, enregistreLe: true },
        });
        const verdictRelu = verdictPartageMedecin(choixRelu);
        if (verdictRelu.bloquant) {
          return { ok: false as const, refus: refusPartage(verdictRelu) };
        }
        await tx.correspondanceMedecin.create({ data: correspondance });
        return { ok: true as const };
      });
      if (!transaction.ok) {
        return echec(transaction.refus.raison, transaction.refus.message, 409);
      }
    } catch (err) {
      // JAMAIS `err.message` ici : un `PrismaClientValidationError` rend ses
      // arguments dans son message — texte de la lettre compris — et partirait
      // dans les logs (revue B2). Le nom de l'erreur suffit à diagnostiquer.
      console.error(
        '[praticien/biologie/proposition/courrier POST] consignation refusée :',
        err instanceof Error ? err.name : 'inconnue',
      );
      return echec('server_error', 'Erreur technique.', 500);
    }

    // 201 : la route sœur du fil rend ce code à la création — deux routes qui
    // écrivent la même table répondent pareil (revue B3).
    return NextResponse.json<CourrierApiResponse>(
      {
        ok: true,
        texte: genere.courrier.texte,
        html: genere.courrier.html,
        ancrageSha256: provenance.ancrageHash,
        ancrageVersion: provenance.version,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(
      '[praticien/biologie/proposition/courrier POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('server_error', 'Erreur technique.', 500);
  }
}
