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
import { construireSafetyFindings, signauxDeclares } from '@/lib/clinical-engine/safetyFindings';
import { estFindingAnamnese } from '@/lib/clinical-engine/safetyFindingSource';
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
// LA COUVERTURE S'ÉCRIT AVEC LA LETTRE ([[D-257]] §2-§5, LOT-03). La lettre
// consignée vaut désormais adressage pour les constats qu'elle porte : la route
// écrit, dans la MÊME transaction et au même niveau, la ligne
// `adressages_signal_alerte` qui les nomme. La base l'exige (la lettre doit
// être de cette transaction, la consultation doit être la porteuse) ; la route
// lit donc la porteuse — `id` et anamnèse ensemble — DANS la transaction, et
// dérive les constats couverts de `construireSafetyFindings`, la fonction même
// que le moteur appellera pour les comparer (LOT-04). Pas de lettre sans
// couverture, pas de couverture d'une autre lettre.
//
// CE QUE CETTE ROUTE NE FAIT PAS ENCORE : lever l'abstention. La couverture est
// écrite, personne ne la lit. La levée appartient à la chaîne C1, derrière un
// drapeau éteint (LOT-04).

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
  provenance_absente: 'Lettre sans provenance : rien n’est consigné.',
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

type CourrierGenere = Extract<ReturnType<typeof genererCourrierAdressage>, { ok: true }>['courrier'];
type Resultat =
  | {
      ok: true;
      courrier: CourrierGenere;
      provenance: NonNullable<CourrierGenere['document']['blocs'][number]['provenance']>;
    }
  | { ok: false; reason: string; status: number };

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

    // TOUT SE PASSE DANS UNE TRANSACTION INTERACTIVE, lecture de la porteuse
    // comprise : la base refuse une couverture dont la lettre n'est pas de la
    // transaction courante, ou dont la consultation n'est plus la porteuse au
    // moment de l'insertion. Lire la porteuse dans la transaction RÉDUIT la
    // fenêtre d'une validation concurrente, elle ne la ferme pas (READ
    // COMMITTED, aucun verrou) : si une consultation est validée entre la
    // lecture et l'insertion, la base refuse, la transaction annule la lettre
    // avec sa couverture, et la route rend 500 — refus fermé, rien d'écrit. Un
    // refus métier (générateur, libellé) sort de la transaction SANS rien
    // écrire.
    let resultat: Resultat;
    try {
      resultat = await prisma.$transaction(async tx => {
        const consultation = await tx.consultation.findFirst({
          where: whereConsultationPorteuse(idPatient),
          // `id` ET `anamnese` dans la même lecture : la couverture désigne la
          // consultation dont la lettre recopie les signaux, aucune autre.
          select: { id: true, anamnese: true },
          orderBy: ORDRE_CONSULTATION_PORTEUSE,
        });
        // La MÊME fonction pure que le runtime clinique : deux lectures
        // différentes des signaux déclarés feraient diverger la lettre du
        // blocage qu'elle est censée porter.
        const signaux = signauxDeclares(consultation?.anamnese);

        const genere = genererCourrierAdressage({
          patientId: idPatient,
          signaux,
          // Le SHA VIVANT de la table, recalculé à l'import depuis les signaux
          // réellement publiés — jamais le littéral figé de la signature, qui
          // dirait ce qui a été relu, pas ce qui a servi.
          tableSha256: SAFETY_SIGNALS_SHA256,
          dateCourrier: new Date().toISOString(),
          patientNom: `${patient.prenom} ${patient.nom}`.trim(),
        });
        if (!genere.ok) {
          return { ok: false, reason: genere.raison, status: 409 } satisfies Resultat;
        }

        // L'ancre vient du bloc EFFECTIVEMENT RENDU, celui que la garde non
        // prescriptive a jugé. La reconstruire ici rouvrirait l'écart entre ce
        // qui a été rendu et ce qui est consigné.
        const provenance = genere.courrier.document.blocs[0]?.provenance;
        if (!provenance) {
          return { ok: false, reason: 'provenance_absente', status: 500 } satisfies Resultat;
        }

        const preparation = preparerCorrespondance({
          idPatient,
          praticienEmail: email ?? '',
          sens: 'sortant',
          medecinLibelle: body.medecinLibelle,
          texte: genere.courrier.texte,
        });
        if (!preparation.ok) {
          // `texte_vide` et `texte_trop_long` portent sur un texte que le
          // SERVEUR a généré : un 400 accuserait le client d'un refus dont il
          // n'est pas l'auteur. Les refus de libellé, eux, restent siens.
          const refusServeur =
            preparation.raison === 'texte_vide' || preparation.raison === 'texte_trop_long';
          return {
            ok: false,
            reason: preparation.raison,
            status: refusServeur ? 409 : 400,
          } satisfies Resultat;
        }

        // Les constats couverts : ceux que le producteur de sécurité tire des
        // MÊMES signaux — rang `adressage` et libellés hors cotation, exactement
        // ceux que la lettre imprime ([[D-218]] §4). Jamais un constat d'effet
        // indésirable : la base le refuserait, et le préfixe est filtré ici
        // pour que le refus ne soit pas le seul rempart.
        const findingIds = construireSafetyFindings(signaux).findings
          .map(finding => finding.findingId)
          .filter(estFindingAnamnese);
        if (!consultation || findingIds.length === 0) {
          // Un générateur qui rend une lettre sans constat à couvrir dirait un
          // adressage que le moteur ne pose pas : refus fermé, rien d'écrit.
          return { ok: false, reason: 'aucun_signal_adressage', status: 409 } satisfies Resultat;
        }

        const lettre = await tx.correspondanceMedecin.create({
          data: {
            ...preparation.donnees,
            ancrageSha256: provenance.ancrageHash,
            ancrageVersion: provenance.version,
          },
          select: { id: true },
        });
        await tx.adressageSignalAlerte.create({
          data: {
            idPatient,
            acte: 'adressage',
            idCorrespondance: lettre.id,
            idConsultation: consultation.id,
            findingIds,
            praticienEmail: email ?? '',
          },
          select: { id: true },
        });
        return { ok: true, courrier: genere.courrier, provenance } satisfies Resultat;
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

    if (!resultat.ok) {
      return echec(
        resultat.reason,
        MESSAGES_REFUS_COURRIER[resultat.reason]
          ?? MESSAGES_REFUS_CONSIGNATION[resultat.reason]
          ?? 'Lettre indisponible : rien n’est consigné.',
        resultat.status,
      );
    }

    // 201 : les deux routes sœurs qui écrivent cette table rendent ce code à la
    // création.
    return NextResponse.json<AdressageCourrierApiResponse>(
      {
        ok: true,
        texte: resultat.courrier.texte,
        html: resultat.courrier.html,
        ancrageSha256: resultat.provenance.ancrageHash,
        ancrageVersion: resultat.provenance.version,
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
