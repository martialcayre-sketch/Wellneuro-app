import { statutAge } from '@/lib/patient/gardeAge';
import { estPatientSuivi, type AccuseConnu } from './avantDeCommencer';
import { CLE_CONDITIONS } from './conditionsUtilisation';
import { getDocumentCourant } from './contenus/registre';

// L'ENVOI DES CONDITIONS AUX PATIENTS SUIVIS ([[D-292]] §3, arbitrage du
// 2026-10-16) : un geste unique au cockpit. Ce module dit QUI le reçoit, en
// fonction pure ; la route lit la base et l'applique, à la liste comme à
// l'envoi — un dossier sorti entre l'aperçu et le clic n'est pas servi.
//
// Un dossier est éligible s'il réunit les six conditions (les cinq premières ici) :
// - EN COURS : actif, suivi non clos (`accepteNouvelEnvoi`) ;
// - ACCÈS À L'ESPACE : portail non révoqué ;
// - MAJEUR : un dossier mineur ou sans date de naissance ne reçoit pas
//   l'e-mail, ses conditions lui viendront avec le circuit des mineurs ;
// - SUIVI : un accusé sur l'un des textes d'information, toute version — un
//   nouveau patient les voit à l'accueil, l'e-mail ne lui est pas destiné
//   (« E-mail aux patients déjà suivis ») ;
// - SANS ACCUSÉ de la version en vigueur des conditions ;
// - PAS DÉJÀ ANNONCÉ pour cette version : c'est la RÉSERVATION en base qui le
//   dit (`annonceConditions.ts`), lue par la route en SQL, pas ce module. Un
//   envoi en échec libère la réservation : le dossier revient dans la liste.

export type DossierAnnonce = {
  actif: boolean;
  accessTokenRevoked: boolean;
  suiviClotureLe: Date | null;
  dateNaissance: string | null;
};

/** `reference_id` du journal pour la version en vigueur des conditions. */
export function referenceConditionsCourantes(): string {
  return `${CLE_CONDITIONS}@${getDocumentCourant(CLE_CONDITIONS).version}`;
}

export function eligibleAnnonceConditions(
  dossier: DossierAnnonce,
  accuses: readonly AccuseConnu[],
  maintenantMs: number,
): boolean {
  if (!dossier.actif || dossier.suiviClotureLe !== null || dossier.accessTokenRevoked) return false;
  if (statutAge(dossier.dateNaissance, maintenantMs) !== 'majeur') return false;
  if (!estPatientSuivi(accuses)) return false;
  const version = getDocumentCourant(CLE_CONDITIONS).version;
  const accuse = accuses.some(
    a => a.documentKey === CLE_CONDITIONS && a.documentVersion === version && a.type === 'pris_connaissance',
  );
  return !accuse;
}
