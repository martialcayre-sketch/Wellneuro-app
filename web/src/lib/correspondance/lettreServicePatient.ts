import { createHash } from 'node:crypto';
import { prisma } from '@/lib/prisma';
import { rendreCourrierAdressageFige } from '@/lib/clinical/courrierAdressage';

// LA LETTRE D'ADRESSAGE SERVIE AU PATIENT — [[D-262]], LOT-03a.
//
// CE QUI EST SERVI. La remise la plus récente du dossier, au sens d'`ordre` —
// une lettre plus récente remplace la précédente, comme une remise de fiche
// remplace la sienne. Le texte servi est l'INSTANTANÉ recopié à la remise
// (cadrage §3.2), jamais la lettre relue : une révision du gabarit ne change pas
// ce que le patient a reçu.
//
// LES TROIS ÉTATS.
//   — `servie` : le texte part ;
//   — `retiree` : la lettre ne porte plus aucune couverture `adressage` non
//     révoquée — le praticien l'a révoquée après remise (cadrage §3.5). Calculé
//     À LA LECTURE, jamais depuis l'existence de la remise : le verrou de la
//     remise ne couvre pas la révocation (migration LOT-01). Aucun motif servi ;
//   — `indisponible` : l'empreinte recalculée n'est pas celle consignée. La base
//     l'interdit déjà (CHECK) ; ce contrôle rejoué au service est celui que les
//     fiches rejouent pour les leurs (D-251 §6).
// Le texte ne sort que d'une lettre servie.
//
// REMISE EN COURS ≠ LETTRE DUE (revue du LOT-03a). Ce service sert ce qui a été
// REMIS ; le LOT-02 décide ce qui est DÛ à un clic. Seule la révocation retire
// une lettre remise (cadrage §3.5) : une consultation porteuse dépassée, ou une
// lettre plus récente pas encore diffusée, la laissent servie jusqu'à la
// prochaine remise. Question ouverte au cadrage (Q-L1).
//
// UNE COUVERTURE PAR LETTRE : « retirée » le suppose. La base l'impose — index
// unique partiel `adressages_signal_alerte_une_couverture_par_lettre`
// (migration `adressages_signal_alerte_v1`, promesse 5 de son contrat) ; sans
// lui, révoquer l'une de deux couvertures laisserait la lettre servie.
//
// CE QUI NE SORT JAMAIS : l'identifiant de la lettre consignée, de
// l'approbation, de la couverture, le motif d'une révocation.

export type EtatLettreServie = 'servie' | 'retiree' | 'indisponible';

export type LettreAdressageServie = {
  /** L'identifiant de la REMISE : c'est lui que l'accusé de lecture porte. */
  idRemise: string;
  remiseLe: string;
  etat: EtatLettreServie;
  /** Le texte remis, seulement quand la lettre est servie. */
  texte: string | null;
};

function empreinte(texte: string): string {
  return createHash('sha256').update(texte, 'utf8').digest('hex');
}

/** La lettre remise à ce patient, ou `null` s'il n'en a reçu aucune. */
export async function lettreRemiseAuPatient(idPatient: string): Promise<LettreAdressageServie | null> {
  const remise = await prisma.lettreAdressageRemise.findFirst({
    where: { idPatient },
    orderBy: { ordre: 'desc' },
    select: { id: true, remiseLe: true, texte: true, texteSha256: true, idCorrespondance: true },
  });
  if (!remise) return null;

  const couvertureActive = await prisma.adressageSignalAlerte.findFirst({
    where: {
      idPatient,
      idCorrespondance: remise.idCorrespondance,
      acte: 'adressage',
      revocations: { none: {} },
    },
    select: { id: true },
  });

  const etat: EtatLettreServie = !couvertureActive
    ? 'retiree'
    : empreinte(remise.texte) !== remise.texteSha256
      ? 'indisponible'
      : 'servie';

  return {
    idRemise: remise.id,
    remiseLe: remise.remiseLe.toISOString(),
    etat,
    texte: etat === 'servie' ? remise.texte : null,
  };
}

/** Ce que le fil du jour annonce : la lettre servie, s'il y en a une. */
export async function lettreALire(idPatient: string): Promise<{ id: string; remiseLe: Date }[]> {
  const lettre = await lettreRemiseAuPatient(idPatient);
  return lettre?.etat === 'servie' ? [{ id: lettre.idRemise, remiseLe: new Date(lettre.remiseLe) }] : [];
}

/** Le lien de l'accueil : une lettre a-t-elle été remise ? Aucun texte lu. */
export async function aUneLettreRemise(idPatient: string): Promise<boolean> {
  const remise = await prisma.lettreAdressageRemise.findFirst({ where: { idPatient }, select: { id: true } });
  return remise !== null;
}

/**
 * La lettre SERVIE, rendue pour l'impression ([[D-262]], LOT-03b) : le texte
 * figé de la remise, par le rendu `medecin` de la lettre générée (en-tête, nom
 * du patient, date de la lettre). `null` : rien de servi, ou rendu refusé par
 * le chokepoint.
 */
export async function lettreImprimable(idPatient: string): Promise<string | null> {
  const lettre = await lettreRemiseAuPatient(idPatient);
  if (lettre?.etat !== 'servie' || !lettre.texte) return null;
  const [remise, patient] = await Promise.all([
    prisma.lettreAdressageRemise.findUnique({
      where: { id: lettre.idRemise },
      select: { correspondance: { select: { consigneLe: true, ancrageSha256: true, ancrageVersion: true } } },
    }),
    prisma.patient.findUnique({ where: { idPatient }, select: { prenom: true, nom: true } }),
  ]);
  if (!remise) return null;
  return rendreCourrierAdressageFige({
    patientId: idPatient,
    texte: lettre.texte,
    dateCourrier: remise.correspondance.consigneLe.toISOString(),
    patientNom: patient ? `${patient.prenom} ${patient.nom}`.trim() : undefined,
    ancrageSha256: remise.correspondance.ancrageSha256,
    ancrageVersion: remise.correspondance.ancrageVersion,
  });
}
