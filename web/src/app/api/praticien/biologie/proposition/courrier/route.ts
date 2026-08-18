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
import { INDICATIONS_BIOLOGIE_SHA256 } from '@/lib/biology-library/indicationsBiologieV1';
import { preparerCorrespondance } from '@/lib/praticien/correspondanceMedecin';

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
// Remise MANUELLE : aucun envoi. La réponse rend le texte pour transcription.

const ROUTE_JOURNAL = '/api/praticien/biologie/proposition/courrier';

export type CourrierApiResponse =
  | { ok: true; texte: string; ancrageSha256: string; ancrageVersion: string }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS_COURRIER: Record<string, string> = {
  aucune_exploration_proposee:
    'Aucune exploration n’est proposée pour ce dossier : il n’y a pas de courrier à établir.',
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

    const genere = genererCourrierBiologie({
      patientId: idPatient,
      lignes: proposition.proposition.lignes,
      // Le SHA VIVANT de la table, recalculé à l'import depuis les règles
      // réellement publiées — jamais le littéral figé de la signature, qui
      // dirait ce qui a été relu, pas ce qui a servi.
      tableSha256: INDICATIONS_BIOLOGIE_SHA256,
      dateCourrier: maintenant,
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

    try {
      await prisma.correspondanceMedecin.create({
        data: {
          ...preparation.donnees,
          ancrageSha256: provenance.ancrageHash,
          ancrageVersion: provenance.version,
        },
      });
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
