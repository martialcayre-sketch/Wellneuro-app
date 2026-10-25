import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { rendreCourrierComplementFige } from './courrierComplement';

// LE COURRIER COMPLÉMENT SERVI AU PATIENT — [[D-345]] §4-§7, J3-12h, lot 4
// (patron `lettreServicePatient.ts`, [[D-262]] LOT-03a).
//
// CE QUI EST SERVI. La remise la plus récente du dossier, au sens d'`ordre`. Un
// courrier neuf n'est requis que si la liste de la version n'est incluse dans
// aucune remise antérieure (D-358 §2), et il couvre alors TOUTE la liste ciblée
// de sa version : la dernière remise est celle qui couvre le programme en
// cours. Le texte servi est l'INSTANTANÉ recopié à la remise, jamais le
// courrier relu ni régénéré.
//
// DEUX ÉTATS, PAS TROIS. Ni la correspondance ni la remise ne se révoquent :
// il n'y a pas d'état « retiré ».
//   — `servie` : le texte part ;
//   — `indisponible` : l'empreinte recalculée n'est pas celle consignée. La
//     base l'interdit déjà (CHECK) ; ce contrôle rejoué au service est celui de
//     la lettre et des fiches (D-251 §6).
// Le texte ne sort que d'un courrier servi.
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
};

function empreinte(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

/** Le courrier remis à ce patient, ou `null` s'il n'en a reçu aucun. */
export async function courrierComplementRemisAuPatient(idPatient: string): Promise<CourrierComplementServi | null> {
  const remise = await prisma.courrierComplementRemise.findFirst({
    where: { idPatient },
    orderBy: { ordre: 'desc' },
    select: {
      id: true,
      remiseLe: true,
      texte: true,
      texteSha256: true,
      correspondance: { select: { medecinLibelle: true } },
    },
  });
  if (!remise) return null;

  const etat: EtatCourrierComplementServi = empreinte(remise.texte) === remise.texteSha256 ? 'servie' : 'indisponible';
  return {
    idRemise: remise.id,
    remiseLe: remise.remiseLe.toISOString(),
    etat,
    texte: etat === 'servie' ? remise.texte : null,
    destinataire: etat === 'servie' ? remise.correspondance.medecinLibelle : null,
  };
}

/** Ce que le fil du jour annonce : le courrier servi, s'il y en a un. */
export async function courrierComplementALire(idPatient: string): Promise<{ id: string; remiseLe: Date }[]> {
  const courrier = await courrierComplementRemisAuPatient(idPatient);
  return courrier?.etat === 'servie' ? [{ id: courrier.idRemise, remiseLe: new Date(courrier.remiseLe) }] : [];
}

/** Le lien de l'accueil : un courrier a-t-il été remis ? Aucun texte lu. */
export async function aUnCourrierComplementRemis(idPatient: string): Promise<boolean> {
  const remise = await prisma.courrierComplementRemise.findFirst({ where: { idPatient }, select: { id: true } });
  return remise !== null;
}

/**
 * Le courrier SERVI, rendu pour l'impression : le texte figé de la remise, par
 * le rendu `medecin` (en-tête, nom du patient, date du courrier). `null` : rien
 * de servi, ou rendu refusé par le chokepoint.
 */
export async function courrierComplementImprimable(idPatient: string): Promise<string | null> {
  const courrier = await courrierComplementRemisAuPatient(idPatient);
  if (courrier?.etat !== 'servie' || !courrier.texte) return null;
  const [remise, patient] = await Promise.all([
    prisma.courrierComplementRemise.findUnique({
      where: { id: courrier.idRemise },
      select: { correspondance: { select: { consigneLe: true, ancrageSha256: true, ancrageVersion: true } } },
    }),
    prisma.patient.findUnique({ where: { idPatient }, select: { prenom: true, nom: true } }),
  ]);
  if (!remise) return null;
  return rendreCourrierComplementFige({
    patientId: idPatient,
    texte: courrier.texte,
    dateCourrier: remise.correspondance.consigneLe.toISOString(),
    patientNom: patient ? `${patient.prenom} ${patient.nom}`.trim() : undefined,
    ancrageSha256: remise.correspondance.ancrageSha256,
    ancrageVersion: remise.correspondance.ancrageVersion,
  });
}
