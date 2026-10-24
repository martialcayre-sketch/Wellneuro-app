import { createHash } from 'node:crypto';
import type { Prisma } from '@/generated/prisma';
import type { prisma } from '@/lib/prisma';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import { lireEntreesGardeComplement } from '@/lib/clinical/entreesGardeComplement';
import { courrierComplementRequis, type VerdictGardeComplement } from '@/lib/clinical/gardeComplementCible';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { PREFIXE_ANCRAGE_COMPLEMENT } from './courrierComplement';
import {
  listeComplementsCibles,
  listeCouverte,
  memeListe,
  MOTIFS_REFUS_LISTE,
  type RefusListe,
} from './courrierComplementListe';

// LE COURRIER COMPLÉMENT AU CLIC « VALIDER POUR DIFFUSION » — [[D-345]] §4-§6,
// J3-12h, lot 3 (G6 de la fiche de cadrage, remise de G5).
//
// UNE SEULE RÈGLE POUR L'APERÇU, LE REFUS ET LA REMISE. Le praticien voit ce que
// le clic fera ; la route refuse avant l'embranchement ce que l'aperçu dit
// bloquant ; la transaction recalcule l'aperçu sous verrou et remet le courrier
// qu'il a montré. Deux règles finiraient par montrer un courrier et en remettre
// un autre (patron `lettreAdressageRemise.ts`).
//
// FAIL-CLOSED, ET C'EST LA DIFFÉRENCE AVEC LA LETTRE D'ADRESSAGE. Une lettre
// d'adressage refusée par la base laisse le clic aboutir sans elle ; un courrier
// complément requis et non remis laisse un complément ciblé entrer au programme
// d'une personne visée — exactement ce que la garde existe pour empêcher. Une
// remise refusée pour une autre raison que « déjà remis » ANNULE donc le clic
// entier (D-345 §4 : « fail-closed si la remise est sautée »).
//
// LA TRACE PROUVE LA REMISE, JAMAIS L'ACCORD : la garde relit l'accord de
// partage à chaque appel, même quand une remise antérieure couvre la liste.
//
// CE QUE LE VERROU DU CLIC NE SÉRIALISE PAS (revue `wn-reviewer` du lot 3,
// P2-5, fenêtre acceptée) : l'écriture d'une ligne physiologique (son propre
// verrou consultatif) et l'envoi d'une anamnèse ne prennent pas la ligne du
// patient. Une grossesse déclarée entre la relecture sous verrou et le commit
// du clic n'est pas vue par CE clic — elle l'est par le suivant. L'accord, lui,
// est sérialisé : son écrivain prend la ligne du patient que le clic lit en
// partage.

type Client = Prisma.TransactionClient | typeof prisma;

/**
 * `WN_COURRIER_COMPLEMENT` — un seul drapeau pour la case du constructeur, le
 * générateur, la garde du clic et la remise (arbitrage du responsable du
 * 2026-10-24). Éteint, le clic fait exactement ce qu'il faisait avant ce lot.
 * NE S'ALLUME PAS AVANT l'écran du portail (lot suivant). Fail-closed : seule
 * la chaîne exacte « true » ouvre.
 */
export function courrierComplementOuvert(value = process.env.WN_COURRIER_COMPLEMENT): boolean {
  return value === 'true';
}

/**
 * Ce que le clic fera du courrier complément :
 *
 * - `non_requis` : aucun courrier n'est requis — rien ne part, rien ne bloque ;
 * - `refuse` : la garde ou la liste refuse — le clic est refusé, motif en clair ;
 * - `deja` : une remise antérieure du dossier couvre la liste — rien ne part ;
 * - `part` : le courrier consigné pour cette liste sera remis par ce clic ;
 * - `manquant` : requis, et aucun courrier n'est consigné pour cette liste — refus.
 */
export type EtatCourrierComplement = 'non_requis' | 'refuse' | 'deja' | 'part' | 'manquant';

export type ApercuCourrierComplement = {
  etat: EtatCourrierComplement;
  statut: VerdictGardeComplement['statut'] | RefusListe | 'dossier_introuvable' | 'version_illisible' | 'lecture_impossible' | 'dossier_bloque';
  motif: string;
  /** Un critère de population (grossesse, allaitement) a déclenché : libellé du destinataire. */
  populationDeclenche: boolean;
  /** `part` seulement : le courrier que le clic remettra. */
  courrier: { idCorrespondance: string; consigneLe: string } | null;
};

/** Ce que la transaction a besoin de savoir pour remettre, au-delà de l'aperçu. */
type CourrierDu = { idCorrespondance: string; consigneLe: Date; texte: string };

type Calcul = {
  apercu: ApercuCourrierComplement;
  liste: { elements: string[]; sha256: string } | null;
  du: CourrierDu | null;
};

const MOTIF_DOSSIER = 'Dossier introuvable : aucun complément ciblé ne peut être diffusé.';
const MOTIF_DEJA = 'Un courrier déjà remis au patient couvre ces compléments ciblés.';
const MOTIF_PART = 'Le courrier consigné pour ces compléments ciblés sera remis au patient avec ce protocole.';
const MOTIF_MANQUANT =
  'Un courrier au médecin est requis pour ces compléments ciblés : préparez-le avant de valider la diffusion.';

export const MOTIF_REMISE_REFUSEE =
  'La remise du courrier au médecin a été refusée : rien n’a été diffusé. Relisez l’aperçu puis recommencez.';

function populationDeclenche(verdict: VerdictGardeComplement): boolean {
  return (verdict.statut === 'requis' || verdict.statut === 'accord_requis')
    && verdict.declencheurs.some(id => id === 'grossesse' || id === 'allaitement');
}

/** Le plus récent courrier complément consigné pour EXACTEMENT cette liste, non encore remis. */
async function courrierDu(
  client: Client,
  idPatient: string,
  liste: { elements: string[]; sha256: string },
): Promise<CourrierDu | null> {
  const listes = await client.courrierComplementListe.findMany({
    where: { idPatient, complementsSha256: liste.sha256, remise: { is: null } },
    orderBy: { consigneLe: 'desc' },
    select: {
      complements: true,
      correspondance: {
        select: { id: true, idPatient: true, sens: true, ancrageVersion: true, texte: true, consigneLe: true },
      },
    },
  });
  for (const ligne of listes) {
    const courrier = ligne.correspondance;
    if (!memeListe(ligne.complements, liste.elements)) continue;
    if (courrier.idPatient !== idPatient || courrier.sens !== 'sortant') continue;
    if (!courrier.ancrageVersion?.startsWith(PREFIXE_ANCRAGE_COMPLEMENT)) continue;
    if (!/\S/.test(courrier.texte)) continue;
    return { idCorrespondance: courrier.id, consigneLe: courrier.consigneLe, texte: courrier.texte };
  }
  return null;
}

async function calculer(
  client: Client,
  entrees: { idPatient: string; actions: readonly ProtocolAction[]; contractVersion: string | null; maintenantMs: number },
): Promise<Calcul> {
  const garde = await lireEntreesGardeComplement(client, entrees.idPatient, entrees.actions, entrees.maintenantMs);
  if (!garde) {
    return {
      apercu: { etat: 'refuse', statut: 'dossier_introuvable', motif: MOTIF_DOSSIER, populationDeclenche: false, courrier: null },
      liste: null,
      du: null,
    };
  }
  const verdict = courrierComplementRequis(garde);
  const population = populationDeclenche(verdict);
  if (verdict.statut === 'non_requis') {
    return {
      apercu: { etat: 'non_requis', statut: verdict.statut, motif: verdict.motif, populationDeclenche: false, courrier: null },
      liste: null,
      du: null,
    };
  }
  if (verdict.statut !== 'requis') {
    return {
      apercu: { etat: 'refuse', statut: verdict.statut, motif: verdict.motif, populationDeclenche: population, courrier: null },
      liste: null,
      du: null,
    };
  }

  const liste = listeComplementsCibles(entrees.actions, entrees.contractVersion);
  if (!liste.ok) {
    return {
      apercu: {
        etat: 'refuse', statut: liste.raison, motif: MOTIFS_REFUS_LISTE[liste.raison], populationDeclenche: population, courrier: null,
      },
      liste: null,
      du: null,
    };
  }
  const elements = { elements: liste.elements, sha256: liste.sha256 };

  const remises = await client.courrierComplementRemise.findMany({
    where: { idPatient: entrees.idPatient },
    select: { complements: true },
  });
  if (listeCouverte(liste.elements, remises)) {
    return {
      apercu: { etat: 'deja', statut: verdict.statut, motif: MOTIF_DEJA, populationDeclenche: population, courrier: null },
      liste: elements,
      du: null,
    };
  }

  const du = await courrierDu(client, entrees.idPatient, elements);
  if (!du) {
    return {
      apercu: { etat: 'manquant', statut: verdict.statut, motif: MOTIF_MANQUANT, populationDeclenche: population, courrier: null },
      liste: elements,
      du: null,
    };
  }
  return {
    apercu: {
      etat: 'part',
      statut: verdict.statut,
      motif: MOTIF_PART,
      populationDeclenche: population,
      courrier: { idCorrespondance: du.idCorrespondance, consigneLe: du.consigneLe.toISOString() },
    },
    liste: elements,
    du,
  };
}

export type EntreesCourrierComplement = {
  idPatient: string;
  /** Les actions PERSISTÉES de la version (jamais le corps d'une requête). */
  actions: readonly ProtocolAction[];
  /** `contract_version` de la version persistée. */
  contractVersion: string | null;
  maintenantMs: number;
};

/** L'aperçu du clic : ce que le praticien voit, ce que la route juge. */
export async function apercuCourrierComplement(
  client: Client,
  entrees: EntreesCourrierComplement,
): Promise<ApercuCourrierComplement> {
  return (await calculer(client, entrees)).apercu;
}

/** L'aperçu bloque-t-il le clic ? `refuse` et `manquant` seulement. */
export function bloqueLeClic(apercu: ApercuCourrierComplement): boolean {
  return apercu.etat === 'refuse' || apercu.etat === 'manquant';
}

/**
 * LE JETON DU CLIC COUVRE AUSSI LE COURRIER COMPLÉMENT (patron
 * `jetonAvecLettre`) : un courrier consigné, ou une remise survenue, entre
 * l'aperçu et le clic périme le jeton — le clic est refusé, l'aperçu relu.
 * Drapeau fermé : le jeton reçu, INCHANGÉ — octet pour octet.
 */
export function jetonAvecComplement(jeton: string, apercu: ApercuCourrierComplement | null): string {
  if (!courrierComplementOuvert()) return jeton;
  const etat = apercu ? `${apercu.etat}:${apercu.courrier?.idCorrespondance ?? '-'}` : 'aucun';
  return createHash('sha256').update(`${jeton}|complement:${etat}`, 'utf8').digest('hex');
}

/** Une remise refusée pour une autre raison que « déjà remis » : le clic s'annule. */
export class RemiseComplementRefusee extends Error {
  /** Le motif en clair que la route rend au praticien. */
  readonly motif: string;

  constructor(motif: string = MOTIF_REMISE_REFUSEE) {
    super('remise du courrier complément refusée');
    this.name = 'RemiseComplementRefusee';
    this.motif = motif;
  }
}

function estConflitUnicite(err: unknown): boolean {
  const code = classeEtCode(err)[1];
  if (code === 'P2002' || code === '23505') return true;
  return err instanceof Error && err.message.includes('23505');
}

async function dejaRemis(client: Client, idCorrespondance: string): Promise<boolean> {
  const remise = await client.courrierComplementRemise.findUnique({
    where: { idCorrespondance },
    select: { id: true },
  });
  return remise !== null;
}

/**
 * DANS la transaction du clic, après le verrou du patient : recalcule
 * l'aperçu, vérifie que c'est celui que le praticien a vu (`idCorrespondanceVue`)
 * et remet le courrier dû.
 *
 * Rend `remis`, `deja_remis` (0 ligne, ou conflit d'unicité d'un clic rejoué)
 * ou `rien` (aucun courrier à remettre : non requis ou déjà couvert). Lève
 * `RemiseComplementRefusee` sur tout autre refus — le clic s'annule entier.
 * Un aperçu devenu bloquant lève aussi : la garde a changé sous le verrou.
 */
export async function remettreCourrierComplement(
  client: Client,
  entrees: EntreesCourrierComplement & { idApprobation: string; idCorrespondanceVue: string | null },
): Promise<'remis' | 'deja_remis' | 'rien'> {
  const { apercu, liste, du } = await calculer(client, entrees);
  if (bloqueLeClic(apercu)) throw new RemiseComplementRefusee();
  if (apercu.etat !== 'part') return 'rien';
  if (!du || !liste || du.idCorrespondance !== entrees.idCorrespondanceVue) throw new RemiseComplementRefusee();

  await client.$executeRaw`SAVEPOINT courrier_complement_remise`;
  try {
    const { count } = await client.courrierComplementRemise.createMany({
      data: [{
        idPatient: entrees.idPatient,
        idApprobation: entrees.idApprobation,
        idCorrespondance: du.idCorrespondance,
        texte: du.texte,
        texteSha256: createHash('sha256').update(du.texte, 'utf8').digest('hex'),
        complements: liste.elements,
        complementsSha256: liste.sha256,
      }],
    });
    await client.$executeRaw`RELEASE SAVEPOINT courrier_complement_remise`;
    if (count === 1) return 'remis';
  } catch (err) {
    await client.$executeRaw`ROLLBACK TO SAVEPOINT courrier_complement_remise`;
    // La classe et le code au journal, jamais le message (il cite le courrier).
    if (!estConflitUnicite(err)) {
      console.warn('[correspondance/courrierComplementRemise] remise refusée', ...classeEtCode(err));
      throw new RemiseComplementRefusee();
    }
  }
  // 0 ligne (le trigger a rendu NULL) ou conflit d'unicité : « déjà remis »,
  // à condition que la remise de CE courrier existe bien.
  if (await dejaRemis(client, du.idCorrespondance)) return 'deja_remis';
  throw new RemiseComplementRefusee();
}
