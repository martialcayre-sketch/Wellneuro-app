import { prisma } from '../prisma';
import { isLeveeAdressageEnabled } from '../clinical/adressageFeatureFlag';
import type { CouvertureAdressage } from './safetyFindingSource';

// LECTURE DES COUVERTURES D'ADRESSAGE — [[D-257]], LOT-04.
//
// MODULE À PART, POUR LE MOTIF DE `effetsIndesirablesPrisma.ts` :
// `runtimeFromPrisma` traduit des lignes sans toucher la base, et ses bancs
// tournent sans `DATABASE_URL`. La lecture est PARTAGÉE par les quatre
// appelants de la chaîne C1 (cockpit ×2, `verifierChaineC1`, rejeu patient) :
// une requête recopiée finirait par diverger, et une couverture vue d'un côté
// seulement ferait 409 sur une carte honnête.
//
// CE QUE LA BASE TIENT DÉJÀ, ET CE QU'ELLE NE PEUT PAS TENIR. Le trigger de la
// migration `adressages_signal_alerte_v1` vérifie, À L'INSERTION, que la lettre
// est une lettre d'adressage sortante du dossier et que la consultation est la
// porteuse. Il ne peut rien dire de la suite (cadrage §7) :
//   — une anamnèse validée APRÈS la lettre change la porteuse : la couverture
//     ne vaut plus (A6, « rebloque ») ;
//   — `correspondances_medecin` n'a pas de gel : la lettre est RELUE ici.
// Tout écart écarte la couverture. Fail-closed : un constat qu'on ne sait pas
// couvert reste ouvert, il ne se lève jamais par défaut.

const FINDING_ID_ANAMNESE = /^safety:anamnese:[0-9a-f]{16}$/;
const PREFIXE_ANCRAGE = 'safety-signals-';

/**
 * Les couvertures ACTIVES du dossier, ou `undefined` quand la levée est éteinte.
 *
 * `undefined` NE DIT PAS « aucune couverture » : il dit qu'aucune lecture n'a
 * eu lieu, et la chaîne C1 se comporte alors exactement comme avant ce lot.
 *
 * `idConsultationPorteuse` est celle dont l'appelant a LU l'anamnèse, dans la
 * même requête : comparer à une porteuse relue à part ouvrirait une fenêtre où
 * les signaux lus et la couverture vérifiée ne parlent pas de la même ligne.
 */
export async function lireCouverturesAdressage(
  idPatient: string,
  idConsultationPorteuse: string | null,
): Promise<CouvertureAdressage[] | undefined> {
  if (!isLeveeAdressageEnabled()) return undefined;
  if (!idConsultationPorteuse) return [];
  const lignes = await prisma.adressageSignalAlerte.findMany({
    where: {
      idPatient,
      acte: 'adressage',
      idConsultation: idConsultationPorteuse,
      revocations: { none: {} },
    },
    select: {
      id: true,
      idCorrespondance: true,
      findingIds: true,
      acteLe: true,
      correspondance: { select: { idPatient: true, sens: true, ancrageVersion: true } },
    },
    orderBy: [{ acteLe: 'asc' }, { id: 'asc' }],
  });
  const couvertures: CouvertureAdressage[] = [];
  for (const ligne of lignes) {
    const lettre = ligne.correspondance;
    if (!ligne.idCorrespondance || !lettre) continue;
    if (lettre.idPatient !== idPatient || lettre.sens !== 'sortant') continue;
    if (!lettre.ancrageVersion?.startsWith(PREFIXE_ANCRAGE)) continue;
    const findingIds = Array.isArray(ligne.findingIds) ? ligne.findingIds : [];
    if (findingIds.length === 0 || !findingIds.every(id => FINDING_ID_ANAMNESE.test(id))) continue;
    couvertures.push({
      idAdressage: ligne.id,
      idCorrespondance: ligne.idCorrespondance,
      findingIds: [...new Set(findingIds)].sort(),
      acteLe: ligne.acteLe.toISOString(),
    });
  }
  return couvertures;
}
