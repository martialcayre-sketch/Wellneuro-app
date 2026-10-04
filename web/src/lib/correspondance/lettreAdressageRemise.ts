import { createHash } from 'node:crypto';
import type { Prisma } from '@/generated/prisma';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { estActionOrientation } from '@/lib/clinical-engine/orientationAdressage';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// LA LETTRE D'ADRESSAGE REMISE AU PATIENT — [[D-262]], LOT-02.
//
// CE QUE CE MODULE FAIT. Au clic « Valider pour diffusion », dans LA MÊME
// transaction que l'approbation (cadrage §3, B1), il remet au patient la lettre
// d'adressage due : la lettre ACTIVE la plus récente du dossier (§3.1). Le texte
// est RECOPIÉ avec son empreinte (§3.2) : c'est un instantané, jamais une
// relecture au moment où le patient l'ouvre.
//
// LA RÈGLE EST CELLE DE LA BASE, RELUE ICI. Le trigger de la migration
// `lettres_adressage_remises_v1` refuse toute autre lettre : une couverture
// `adressage` non révoquée, sur la consultation porteuse courante, la plus
// récente au sens d'`ordre`. Ce module choisit la lettre par la même règle ;
// s'il se trompait, la base refuserait — elle ne laisserait rien passer.
//
// LE REFUS DE LA BASE NE FAIT PAS ÉCHOUER LA DIFFUSION (§3.1). Le trigger LÈVE
// une exception (il ne rend pas zéro ligne), et une exception dans une
// transaction PostgreSQL l'interrompt tout entière. Une lettre révoquée entre la
// lecture et l'insertion — le verrou de la table ne couvre pas la révocation —
// ferait donc échouer l'approbation et les fiches. L'insertion est isolée par un
// POINT DE SAUVEGARDE : refusée, elle est annulée seule, et le clic aboutit sans
// lettre. Une remise identique à la remise en cours, elle, rend zéro ligne sans
// erreur : d'où `createMany`, jamais `create`.
//
// CE QUI NE PART PAS. Rien quand le drapeau est fermé, quand les fiches sont
// bloquées pour le dossier (dossier clos, contrat patient refusé : la lettre suit
// le même sort que tout envoi du clic), ni quand le protocole ne s'ouvre pas sur
// l'orientation — la lettre part avec l'action qui la nomme, jamais seule.

const PREFIXE_ANCRAGE = 'safety-signals-';

type Client = Pick<
  Prisma.TransactionClient,
  'consultation' | 'adressageSignalAlerte' | 'lettreAdressageRemise' | '$executeRaw'
>;

/**
 * `WN_LETTRE_ADRESSAGE_PATIENT` — LE DRAPEAU GARDE L'ÉMISSION, LA LECTURE ET
 * L'ANNONCE ([[D-262]], cadrage §3.6). Le code se déploie avant d'être servi :
 * éteint, le clic fait exactement ce qu'il faisait avant ce lot.
 *
 * NE S'ALLUME PAS AVANT LE LOT-03 : l'écran du portail n'existe pas encore, et
 * l'annonce promettrait une porte close. Il n'agit que sur le chemin
 * transactionnel du clic, ouvert par `WN_FICHES_ASSIETTE`.
 *
 * Fail-closed : seule la chaîne exacte « true » ouvre.
 */
export function lettreAdressagePatientOuverte(
  value = process.env.WN_LETTRE_ADRESSAGE_PATIENT,
): boolean {
  return value === 'true';
}

function empreinte(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

/** La lettre due au patient, par la règle de la base, ou `null`. */
async function lettreDue(
  client: Client,
  idPatient: string,
): Promise<{ id: string; texte: string } | null> {
  const porteuse = await client.consultation.findFirst({
    where: whereConsultationPorteuse(idPatient),
    orderBy: ORDRE_CONSULTATION_PORTEUSE,
    select: { id: true },
  });
  if (!porteuse) return null;
  const couverture = await client.adressageSignalAlerte.findFirst({
    where: {
      idPatient,
      acte: 'adressage',
      idConsultation: porteuse.id,
      revocations: { none: {} },
    },
    orderBy: { ordre: 'desc' },
    select: {
      correspondance: { select: { id: true, idPatient: true, sens: true, ancrageVersion: true, texte: true } },
    },
  });
  const lettre = couverture?.correspondance;
  if (!lettre || lettre.idPatient !== idPatient || lettre.sens !== 'sortant') return null;
  if (!lettre.ancrageVersion?.startsWith(PREFIXE_ANCRAGE)) return null;
  if (!/\S/.test(lettre.texte)) return null;
  return { id: lettre.id, texte: lettre.texte };
}

/**
 * Remet la lettre due, DANS la transaction du clic. Rend le nombre de remises
 * écrites : 1, ou 0 quand rien n'était dû, quand la remise en cours porte déjà
 * cette lettre, ou quand la base l'a refusée.
 */
export async function remettreLettreAdressage(
  client: Client,
  entrees: {
    idPatient: string;
    idApprobation: string;
    actions: readonly { actionId: string; type: string }[];
    bloque: boolean;
  },
): Promise<number> {
  if (!lettreAdressagePatientOuverte() || entrees.bloque) return 0;
  const premiere = entrees.actions[0];
  if (!premiere || !estActionOrientation(premiere)) return 0;

  const lettre = await lettreDue(client, entrees.idPatient);
  if (!lettre) return 0;

  await client.$executeRaw`SAVEPOINT lettre_adressage_remise`;
  try {
    const { count } = await client.lettreAdressageRemise.createMany({
      data: [{
        idPatient: entrees.idPatient,
        idApprobation: entrees.idApprobation,
        idCorrespondance: lettre.id,
        texte: lettre.texte,
        texteSha256: empreinte(lettre.texte),
      }],
    });
    await client.$executeRaw`RELEASE SAVEPOINT lettre_adressage_remise`;
    return count;
  } catch (err) {
    await client.$executeRaw`ROLLBACK TO SAVEPOINT lettre_adressage_remise`;
    // La classe et le code au journal, jamais le message (il cite la lettre) :
    // le code distingue un refus du trigger (`P2039` sous l'adaptateur pg,
    // constaté en sonde) d'un défaut durable — clé étrangère, droits,
    // validation Prisma — qui éteindrait la remise en silence.
    console.warn('[correspondance/lettreAdressageRemise] remise refusée', ...classeEtCode(err));
    return 0;
  }
}
