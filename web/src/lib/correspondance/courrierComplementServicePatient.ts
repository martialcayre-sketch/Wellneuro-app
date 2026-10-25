import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { rendreCourrierComplementFige } from './courrierComplement';

// LES COURRIERS COMPLÉMENT SERVIS AU PATIENT — [[D-345]] §4-§7, J3-12h, lot 4
// (patron `lettreServicePatient.ts`, [[D-262]] LOT-03a).
//
// CE QUI EST SERVI : TOUTES LES REMISES DU DOSSIER, la plus récente en tête
// (arbitrage du responsable du 2026-10-25, [[D-362]] §2). Pas la dernière
// seule : une version qui RETIRE un complément est couverte par une remise
// antérieure ([[D-358]] §2), qui peut ne pas être la dernière. Servir la
// dernière seule rendrait invisible le seul courrier qui cite les compléments
// en cours, pendant que le cockpit dit « déjà remis » (revue `wn-reviewer` du
// lot 4, P1-1). Le texte servi est l'INSTANTANÉ recopié à la remise, jamais le
// courrier relu ni régénéré. Chaque remise est sa propre lecture.
//
// DEUX ÉTATS, PAS TROIS. Ni la correspondance ni la remise ne se révoquent :
// il n'y a pas d'état « retiré ».
//   — `servie` : le texte part ;
//   — `indisponible` : l'empreinte recalculée n'est pas celle consignée. La
//     base l'interdit déjà (CHECK) ; ce contrôle rejoué au service est celui de
//     la lettre et des fiches (D-251 §6).
// Le texte ne sort que d'un courrier servi. `imprimable` dit si la version à
// imprimer se rend (ancrage du courrier complément, garde non prescriptive) :
// l'écran ne propose pas un lien qui mènerait à une erreur (revue du lot 4, P2-2).
//
// LE DESTINATAIRE est le libellé saisi par le praticien à la préparation,
// recopié tel quel : rien n'y est ajouté (forme opaque — le portail ne nomme
// ni la population ni la situation qui appellent le courrier).
//
// CE QUI NE SORT JAMAIS : l'identifiant du courrier consigné, de
// l'approbation, la liste des compléments couverts.
//
// LE DRAPEAU N'EST PAS LU ICI : les routes et l'écran le lisent d'abord
// (`courrierComplementOuvert`, un seul drapeau, D-358 §4).

export type EtatCourrierComplementServi = 'servie' | 'indisponible';

export type CourrierComplementServi = {
  /** L'identifiant de la REMISE : c'est lui que l'accusé de lecture porte. */
  idRemise: string;
  remiseLe: string;
  etat: EtatCourrierComplementServi;
  /** Le texte remis, seulement quand le courrier est servi. */
  texte: string | null;
  /** Le destinataire saisi par le praticien, seulement quand le courrier est servi. */
  destinataire: string | null;
  /** La version à imprimer se rend-elle ? Toujours faux hors d'un courrier servi. */
  imprimable: boolean;
};

type RemiseLue = {
  id: string;
  remiseLe: Date;
  texte: string;
  texteSha256: string;
  correspondance: { medecinLibelle: string; consigneLe: Date; ancrageSha256: string | null; ancrageVersion: string | null };
};

const SELECTION = {
  id: true,
  remiseLe: true,
  texte: true,
  texteSha256: true,
  correspondance: { select: { medecinLibelle: true, consigneLe: true, ancrageSha256: true, ancrageVersion: true } },
} as const;

function empreinte(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

/** Le rendu imprimable d'une remise, ou `null` (rendu refusé, ancrage étranger). */
function rendu(idPatient: string, remise: RemiseLue, patientNom: string | undefined): string | null {
  return rendreCourrierComplementFige({
    patientId: idPatient,
    texte: remise.texte,
    dateCourrier: remise.correspondance.consigneLe.toISOString(),
    patientNom,
    ancrageSha256: remise.correspondance.ancrageSha256,
    ancrageVersion: remise.correspondance.ancrageVersion,
  });
}

function servi(idPatient: string, remise: RemiseLue): CourrierComplementServi {
  const etat: EtatCourrierComplementServi = empreinte(remise.texte) === remise.texteSha256 ? 'servie' : 'indisponible';
  return {
    idRemise: remise.id,
    remiseLe: remise.remiseLe.toISOString(),
    etat,
    texte: etat === 'servie' ? remise.texte : null,
    destinataire: etat === 'servie' ? remise.correspondance.medecinLibelle : null,
    // Le nom n'entre que dans l'en-tête, échappé : il ne change pas le verdict du rendu.
    imprimable: etat === 'servie' && rendu(idPatient, remise, undefined) !== null,
  };
}

/** Les courriers remis à ce patient, le plus récent en tête ; `[]` s'il n'en a reçu aucun. */
export async function courriersComplementRemisAuPatient(idPatient: string): Promise<CourrierComplementServi[]> {
  const remises = await prisma.courrierComplementRemise.findMany({
    where: { idPatient },
    orderBy: { ordre: 'desc' },
    select: SELECTION,
  });
  return remises.map(remise => servi(idPatient, remise));
}

/** Ce que le fil du jour annonce : chaque courrier servi. */
export async function courrierComplementALire(idPatient: string): Promise<{ id: string; remiseLe: Date }[]> {
  return (await courriersComplementRemisAuPatient(idPatient))
    .filter(courrier => courrier.etat === 'servie')
    .map(courrier => ({ id: courrier.idRemise, remiseLe: new Date(courrier.remiseLe) }));
}

/** Le lien de l'accueil : un courrier a-t-il été remis ? Aucun texte lu. */
export async function aUnCourrierComplementRemis(idPatient: string): Promise<boolean> {
  const remise = await prisma.courrierComplementRemise.findFirst({ where: { idPatient }, select: { id: true } });
  return remise !== null;
}

/**
 * LA remise désignée, rendue pour l'impression : le texte figé, par le rendu
 * `medecin` (en-tête, nom du patient, date du courrier). La remise est cherchée
 * DANS CE DOSSIER : l'identifiant d'un autre dossier ne rend rien. `null` :
 * rien de servi sous cet identifiant, ou rendu refusé par le chokepoint.
 */
export async function courrierComplementImprimable(idPatient: string, idRemise: string): Promise<string | null> {
  const [remise, patient] = await Promise.all([
    prisma.courrierComplementRemise.findFirst({ where: { id: idRemise, idPatient }, select: SELECTION }),
    prisma.patient.findUnique({ where: { idPatient }, select: { prenom: true, nom: true } }),
  ]);
  if (!remise || empreinte(remise.texte) !== remise.texteSha256) return null;
  return rendu(idPatient, remise, patient ? `${patient.prenom} ${patient.nom}`.trim() : undefined);
}
