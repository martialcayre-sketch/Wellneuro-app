import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { preparerCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import {
  ORDRE_CONSULTATION_PORTEUSE,
  whereConsultationPorteuse,
} from '@/lib/consultation/consultationPorteuse';
import { signauxDeclares } from '@/lib/clinical-engine/safetyFindings';
import { genererCourrierAdressage } from '@/lib/clinical/courrierAdressage';
import {
  isAdressageCourrierEnabled,
  MESSAGE_ADRESSAGE_FERME,
} from '@/lib/clinical/adressageFeatureFlag';
import {
  SAFETY_SIGNALS_SHA256,
  tableSignauxSecuriteSignee,
} from '@/lib/clinical/safetySignalsV1';

// Lettre d'adressage sur signal d'alerte ([[D-218]], LOT-04) — la seule raison
// cliniquement obligatoire d'écrire à un médecin, et elle n'avait aucun chemin.
//
// LE TEXTE EST GÉNÉRÉ CÔTÉ SERVEUR, JAMAIS REÇU DU CLIENT. La lettre passe par
// `assertRenduMedecinNonPrescriptif` avant d'être consignée : un courrier qui
// ne se rend pas ne se consigne pas. Accepter un texte du navigateur
// permettrait de consigner n'importe quoi comme « la lettre », et la garde
// deviendrait contournable par construction. Le praticien ne fournit qu'une
// chose : le libellé du médecin destinataire.
//
// L'ANCRE EST CELLE DU DOCUMENT RENDU, relue dans la `provenance` du bloc
// effectivement rendu — pas reconstruite, pas fournie par l'appelant ([[D-073]]
// §2). Son littéral de version est connu de `SHA_ATTENDU_PAR_VERSION` : sans
// cette ligne, chaque lettre lirait « référence inconnue » dans le fil.
//
// LA TABLE SIGNÉE N'EST NI RE-COTÉE NI TOUCHÉE. La route relit les signaux
// DÉCLARÉS de l'anamnèse porteuse (`signauxDeclares`, fonction pure déjà
// utilisée par le runtime clinique) et laisse le générateur recopier libellés
// et texte de conduite. Aucun score n'est lu, aucun rang n'est décidé ici.
//
// TABLE NON SIGNÉE ⇒ AUCUNE LETTRE. Verrou fermé, `construireSafetyFindings` ne
// produit aucun constat : la décision n'est pas suspendue, et une lettre qui
// annoncerait un adressage n'aurait rien derrière elle. Le refus est explicite,
// jamais silencieux.
//
// Remise MANUELLE : aucun envoi, aucune messagerie de santé, aucune pièce
// jointe ([[D-122]]). La réponse rend les deux formes du même rendu — `texte` à
// transcrire, `html` à imprimer. Le `html` n'est pas consigné.
//
// CE QUE CETTE ROUTE NE FAIT PAS : lever l'abstention. Une lettre consignée
// TRACE l'adressage, elle ne le vaut pas. Si l'abstention doit pouvoir se lever
// sur preuve d'adressage, c'est un arbitrage clinique distinct, qui touche la
// chaîne C1 et n'a pas été rendu.

const ROUTE_JOURNAL = '/api/praticien/adressage/courrier';

export type AdressageCourrierApiResponse =
  | {
      ok: true;
      texte: string;
      /** Rendu médecin autonome et imprimable — jamais consigné, jamais reçu du client. */
      html: string;
      ancrageSha256: string;
      ancrageVersion: string;
    }
  | { ok: true; ouvert: true }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS_COURRIER: Record<string, string> = {
  aucun_signal_adressage:
    'Aucun signal déclaré n’appelle un adressage sur ce dossier : il n’y a pas de lettre à établir.',
  terme_prescriptif:
    'La lettre n’a pas pu être rendue : un libellé porte un terme prescriptif. Rien n’est consigné.',
  bloc_non_diffuse:
    'Le rendu médecin n’est pas diffusable : le texte jugé par la garde est absent. Rien n’est consigné.',
};

const MESSAGES_REFUS_CONSIGNATION: Record<string, string> = {
  medecin_libelle_vide: 'Le nom du médecin destinataire est requis.',
  medecin_libelle_email: 'Indiquez un nom de médecin, pas une adresse e-mail.',
  medecin_libelle_trop_long: 'Le nom du médecin est trop long (200 caractères maximum).',
  texte_vide: 'La lettre générée est vide : rien n’est consigné.',
  texte_trop_long:
    'La lettre générée dépasse la longueur consignable (8 000 caractères) : rien n’est '
    + 'consigné. Le nombre de signaux déclarés est inhabituel — à signaler.',
};

const ID_PATIENT_PATTERN = /^[A-Za-z0-9_-]+$/;

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<AdressageCourrierApiResponse>({ ok: false, reason, error }, { status });
}

/**
 * Le GET ne lit AUCUN dossier, et c'est pour cela qu'il n'écrit aucune ligne au
 * journal d'accès. Il dit une seule chose — le geste est-il ouvert — que
 * l'écran ne peut pas déduire seul : le drapeau vit côté serveur. Lui faire
 * prendre un `idPatient` ajouterait une lecture de dossier NOMMÉ à chaque
 * chargement du cockpit, donc une ligne de journal pour une lecture que
 * personne n'a demandée (`G-TRUST-04`).
 */
export async function GET(): Promise<NextResponse<AdressageCourrierApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
  if (!isAdressageCourrierEnabled()) {
    return echec('feature_disabled', MESSAGE_ADRESSAGE_FERME, 503);
  }
  return NextResponse.json<AdressageCourrierApiResponse>({ ok: true, ouvert: true });
}

type PostBody = { idPatient?: unknown; medecinLibelle?: unknown };

export async function POST(req: Request) {
  try {
    // LE DRAPEAU D'ABORD, avant toute lecture et avant tout journal : un geste
    // fermé ne doit laisser aucune trace de dossier derrière lui.
    if (!isAdressageCourrierEnabled()) {
      return echec('feature_disabled', MESSAGE_ADRESSAGE_FERME, 503);
    }

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    // `null`, `42`, `"texte"` et `[]` sont du JSON parfaitement valide : sans
    // cette garde, `body.idPatient` lèverait AVANT toute session — un 500 que
    // n'importe quel client anonyme peut fabriquer.
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    if (!idPatient || !ID_PATIENT_PATTERN.test(idPatient) || idPatient.length > 64) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }

    const email = emailPraticien(session);
    // `acces` EST fourni : cette route LIT l'anamnèse d'un dossier NOMMÉ, et
    // une lecture de dossier nommé se journalise (G-TRUST-04).
    const appartenance = await verifierAppartenancePatient(idPatient, email, {
      route: ROUTE_JOURNAL,
      methode: 'POST',
    });
    if (appartenance === 'introuvable') {
      return echec('patient_not_found', 'Patient introuvable.', 404);
    }
    if (appartenance === 'autre_praticien') {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    // La lettre est une pièce du dossier : le refus vit dans la route, pas
    // seulement dans l'écran ([[D-219]] §2, leçon #181).
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      // `prenom`/`nom` : l'en-tête du papier doit dire DE QUI il parle. Le nom
      // entre dans le HTML rendu, jamais dans le texte consigné ni dans un log.
      select: { actif: true, suiviClotureLe: true, prenom: true, nom: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // AUCUNE GARDE DE CONSENTEMENT ICI, ET C'EST L'EXCEPTION, PAS UN OUBLI.
    //
    // Depuis le 2026-09-17, le refus — et le silence — du patient ferment le
    // courrier de biologie et la consignation à la main ([[D-219]] §3 amendé).
    // Cette route-ci reste ouverte, sur arbitrage explicite du responsable :
    // fermer ici serait fermer au moment précis où un signe repéré SUSPEND la
    // décision clinique, sur les dossiers où le besoin d'écrire est le plus
    // fondé. C'est l'exception que `donnees_confidentialite@v9` NOMME au
    // patient — il la lit, elle ne lui est pas cachée.
    //
    // DEUX RAISONS DE PLUS DE NE PAS « CORRIGER » CETTE OMISSION. La première :
    // presque aucun patient n'a exprimé de choix, donc une garde fail-closed
    // refermerait ce chemin le matin même de son ouverture. La seconde : la
    // finalité `partage_medecin_traitant` vise le MÉDECIN TRAITANT, alors que
    // l'adressage peut viser un autre médecin — lui opposer ce refus
    // sur-appliquerait un consentement qui ne porte pas sur lui.
    //
    // TABLE NON SIGNÉE : rien n'inhibe la décision, donc rien n'appelle un
    // adressage. Le refus est explicite — le contraire produirait une lettre
    // qui affirme un blocage que le moteur ne pose pas.
    if (!tableSignauxSecuriteSignee()) {
      return echec(
        'table_non_signee',
        'La cotation des signaux d’alerte n’est pas signée : aucune lettre d’adressage '
        + 'ne peut être établie.',
        409,
      );
    }

    const consultation = await prisma.consultation.findFirst({
      where: whereConsultationPorteuse(idPatient),
      select: { anamnese: true },
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
    });

    const genere = genererCourrierAdressage({
      patientId: idPatient,
      // La MÊME fonction pure que le runtime clinique : deux lectures
      // différentes des signaux déclarés feraient diverger la lettre du blocage
      // qu'elle est censée porter.
      signaux: signauxDeclares(consultation?.anamnese),
      // Le SHA VIVANT de la table, recalculé à l'import depuis les signaux
      // réellement publiés — jamais le littéral figé de la signature, qui
      // dirait ce qui a été relu, pas ce qui a servi.
      tableSha256: SAFETY_SIGNALS_SHA256,
      dateCourrier: new Date().toISOString(),
      patientNom: `${patient.prenom} ${patient.nom}`.trim(),
    });
    if (!genere.ok) {
      return echec(
        genere.raison,
        MESSAGES_REFUS_COURRIER[genere.raison] ?? 'Lettre indisponible.',
        409,
      );
    }

    // L'ancre vient du bloc EFFECTIVEMENT RENDU, celui que la garde non
    // prescriptive a jugé. La reconstruire ici rouvrirait l'écart entre ce qui
    // a été rendu et ce qui est consigné.
    const provenance = genere.courrier.document.blocs[0]?.provenance;
    if (!provenance) {
      return echec('provenance_absente', 'Lettre sans provenance : rien n’est consigné.', 500);
    }

    const preparation = preparerCorrespondance({
      idPatient,
      praticienEmail: email ?? '',
      sens: 'sortant',
      medecinLibelle: body.medecinLibelle,
      texte: genere.courrier.texte,
    });
    if (!preparation.ok) {
      // `texte_vide` et `texte_trop_long` portent sur un texte que le SERVEUR a
      // généré : un 400 accuserait le client d'un refus dont il n'est pas
      // l'auteur. Les refus de libellé, eux, restent siens.
      const refusServeur =
        preparation.raison === 'texte_vide' || preparation.raison === 'texte_trop_long';
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
      // arguments dans son message — texte de la lettre compris, donc les
      // signaux déclarés du patient — et partirait dans les logs. Le nom de
      // l'erreur suffit à diagnostiquer.
      console.error(
        '[praticien/adressage/courrier POST] consignation refusée :',
        err instanceof Error ? err.name : 'inconnue',
      );
      return echec('server_error', 'Erreur technique.', 500);
    }

    // 201 : les deux routes sœurs qui écrivent cette table rendent ce code à la
    // création.
    return NextResponse.json<AdressageCourrierApiResponse>(
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
    // LE NOM, JAMAIS LE MESSAGE — même motif que le `catch` de la
    // consignation, et la même conséquence s'il est oublié. Ce `catch`-ci
    // attrape aussi ce que lèvent le générateur et Prisma : un message peut
    // porter le texte de la lettre, donc les signaux déclarés du patient, et
    // il partirait dans les logs. Le nom suffit à diagnostiquer.
    console.error(
      '[praticien/adressage/courrier POST] erreur :',
      err instanceof Error ? err.name : 'inconnue',
    );
    return echec('server_error', 'Erreur technique.', 500);
  }
}
