import { createHash } from 'node:crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderProposition, type VerdictGarde } from '@/lib/biology-library/gardeProposition';
import { deriverPropositionPourPatient } from '@/lib/biology-library/propositionService';
import {
  genererDocumentPatientBiologie,
  type RefusDocumentPatientBiologie,
} from '@/lib/biology-library/documentPatient';
import { isCbResultsEnabled } from '@/lib/biology-library/featureFlag';
import { INDICATIONS_BIOLOGIE_SHA256 } from '@/lib/biology-library/indicationsBiologieV1';
import { termeAnxiogene } from '@/lib/documents/vocabulaire';

// Document patient de la proposition de bilan (décision F, [[D-122]] §1) —
// route sœur du courrier médecin, même colonne vertébrale.
//
// LE TEXTE EST GÉNÉRÉ CÔTÉ SERVEUR, JAMAIS REÇU DU CLIENT : accepter un texte
// du navigateur permettrait de consigner n'importe quoi comme « le document
// remis », et la garde de registre deviendrait contournable par construction.
//
// L'ANCRE EST CELLE DU DOCUMENT RENDU. `ancrage_sha256` et `ancrage_version`
// sont relus dans la `provenance` du bloc effectivement rendu — pas
// reconstruits, pas fournis par l'appelant ([[D-073]] §2, la table les exige
// NON NULS : sans ancre, pas de ligne).
//
// GARDE DE REGISTRE ANXIOGÈNE, REFUS CONFIRMABLE ([[D-090]] : le régime suit
// le GESTE — établir ce document est un acte praticien explicite, un humain
// est là pour trancher, comme au booklet et à la publication de synthèse).
// Un faux positif coûte un clic, jamais un document indélivrable.
//
// LA CONFIRMATION EST LIÉE AU TEXTE JUGÉ, PAS AU GESTE. Contrairement à la
// synthèse de compréhension — où le client SOUMET le texte, donc confirme ce
// qu'il a sous les yeux — cette route RE-DÉRIVE le texte à chaque appel : un
// booléen confirmerait ce que le second appel se trouve produire, pas ce que
// le praticien a lu au 409. Le refus rend donc `texteSha256`, et la
// confirmation le renvoie (`confirmerTexteSha256`) : si le dossier a bougé
// entre les deux clics et que le texte re-dérivé diffère, on re-refuse avec
// la nouvelle empreinte — même discipline stricte que l'ancrage D-073.
// Carte des chemins sortants : `documents/vocabulaire.ts` — le banc de
// débranchement vit dans le test de cette route.
//
// Remise MANUELLE : aucun envoi. La réponse rend le texte pour impression ou
// remise en consultation.

const ROUTE_JOURNAL = '/api/praticien/biologie/proposition/document-patient';

export type DocumentPatientApiResponse =
  | { ok: true; texte: string; ancrageSha256: string; ancrageVersion: string }
  | { ok: false; reason: string; error: string; texteSha256?: string };

// `Record` EXHAUSTIF sur l'union des refus : un motif ajouté au générateur
// sans message français devient une erreur de build, pas un texte générique.
const MESSAGES_REFUS: Record<RefusDocumentPatientBiologie, string> = {
  aucune_exploration_proposee:
    'Aucune exploration n’est proposée pour ce dossier : il n’y a pas de document à établir.',
  bloc_non_diffuse:
    'Le rendu patient n’est pas diffusable : le texte jugé est absent. Rien n’est consigné.',
};

// Même borne que la consignation du courrier (`preparerCorrespondance`) : une
// proposition dérivée qui la dépasse est une anomalie à signaler, pas une
// pièce à consigner. Borne technique, aucune sémantique clinique.
const LONGUEUR_MAX_TEXTE = 8000;

function echec(reason: string, error: string, status: number, texteSha256?: string) {
  return NextResponse.json<DocumentPatientApiResponse>(
    texteSha256 ? { ok: false, reason, error, texteSha256 } : { ok: false, reason, error },
    { status },
  );
}

function depuisVerdict(verdict: Exclude<VerdictGarde, { ok: true }>) {
  return echec(verdict.reason, verdict.error, verdict.status);
}

type PostBody = { idPatient?: unknown; confirmerTexteSha256?: unknown };

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
    // route de compréhension).
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    const confirmerTexteSha256 =
      typeof body.confirmerTexteSha256 === 'string' ? body.confirmerTexteSha256 : null;
    // `acces` EST fourni : cette route LIT le dossier entier pour en dériver
    // la proposition, et une lecture de dossier nommé se journalise (G-TRUST-04).
    const garde = await garderProposition(idPatient, { route: ROUTE_JOURNAL, methode: 'POST' });
    if (!garde.ok) return depuisVerdict(garde);

    // Le document est une pièce du dossier : le refus vit dans la route, pas
    // seulement dans l'écran.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const maintenant = new Date().toISOString();
    const proposition = await deriverPropositionPourPatient(idPatient, maintenant);
    if (!proposition.ok) {
      // L'abstention du moteur n'est pas une erreur technique : son motif est
      // écrit pour être lu par le praticien.
      return echec('proposition_indisponible', proposition.motif, 409);
    }

    const genere = genererDocumentPatientBiologie({
      patientId: idPatient,
      lignes: proposition.proposition.lignes,
      // Le SHA VIVANT de la table, recalculé à l'import depuis les règles
      // réellement publiées — jamais le littéral figé de la signature.
      tableSha256: INDICATIONS_BIOLOGIE_SHA256,
      dateDocument: maintenant,
      // La phrase « aucun résultat conservé » suit l'état réel de l'étage 2.
      resultatsActifs: isCbResultsEnabled(),
    });
    if (!genere.ok) {
      if (genere.raison === 'bloc_non_diffuse') {
        // Ce refus n'a pas de chemin nominal : le générateur construit le bloc
        // qu'il couple. L'atteindre est une régression du domaine documents —
        // une trace serveur, sinon la panne serait invisible du monitoring.
        console.error(
          '[praticien/biologie/proposition/document-patient POST] bloc non diffusé : invariant du générateur rompu',
        );
      }
      return echec(genere.raison, MESSAGES_REFUS[genere.raison], 409);
    }

    const texte = genere.documentPatient.texte;
    if (texte.length > LONGUEUR_MAX_TEXTE) {
      // Refus SERVEUR (409, pas 400) : le texte est généré ici — même
      // diagnostic « à signaler » que la borne du courrier.
      return echec(
        'texte_trop_long',
        `Le document généré dépasse la longueur consignable (${LONGUEUR_MAX_TEXTE} caractères) : `
        + 'rien n’est consigné. La proposition dérivée est inhabituellement longue — à signaler.',
        409,
      );
    }

    // Garde du registre patient — sur le texte QUI SERA CONSIGNÉ, après le
    // couplage rendu↔consignation du générateur : ce que la garde lit est
    // exactement ce qui part en base et sera remis au patient. La
    // confirmation n'est honorée que si elle vise CE texte-ci (empreinte) :
    // un dossier qui a bougé entre les deux clics re-refuse avec la nouvelle.
    const terme = termeAnxiogene(texte);
    const texteSha256 = createHash('sha256').update(texte, 'utf8').digest('hex');
    if (terme && confirmerTexteSha256 !== texteSha256) {
      return echec(
        'REGISTRE_ANXIOGENE',
        `Ce document emploie « ${terme} ». Il est destiné au patient, qui peut le relire seul. `
        + 'Reformulez le libellé en cause au catalogue, ou confirmez la consignation de ce '
        + 'texte-ci depuis l’écran.',
        409,
        texteSha256,
      );
    }

    // L'ancre vient du bloc EFFECTIVEMENT RENDU, celui que le couplage a jugé.
    const provenance = genere.documentPatient.document.blocs[0]?.provenance;
    if (!provenance) {
      return echec('provenance_absente', 'Document sans provenance : rien n’est consigné.', 500);
    }

    try {
      await prisma.documentPatientBiologie.create({
        data: {
          idPatient,
          texte: genere.documentPatient.texte,
          ancrageSha256: provenance.ancrageHash,
          ancrageVersion: provenance.version,
          generePar: garde.email,
        },
      });
    } catch (err) {
      // JAMAIS `err.message` ici : un `PrismaClientValidationError` rend ses
      // arguments dans son message — texte du document compris — et partirait
      // dans les logs (patron B2 du courrier). Le nom de l'erreur suffit.
      console.error(
        '[praticien/biologie/proposition/document-patient POST] consignation refusée :',
        err instanceof Error ? err.name : 'inconnue',
      );
      return echec('server_error', 'Erreur technique.', 500);
    }

    // 201 : les routes qui écrivent une pièce du dossier répondent pareil
    // (patron B3 du courrier).
    return NextResponse.json<DocumentPatientApiResponse>(
      {
        ok: true,
        texte: genere.documentPatient.texte,
        ancrageSha256: provenance.ancrageHash,
        ancrageVersion: provenance.version,
      },
      { status: 201 },
    );
  } catch (err) {
    console.error(
      '[praticien/biologie/proposition/document-patient POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('server_error', 'Erreur technique.', 500);
  }
}
