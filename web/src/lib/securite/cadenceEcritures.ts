// LA CADENCE DES ÉCRITURES PAR DOSSIER — [[D-327]] (dette t08).
//
// MODULE PUR. Chaque route qui écrit une ligne neuve compte, AVANT d'écrire, les
// lignes que ce dossier a déjà écrites dans sa table sur l'heure écoulée ; au
// plafond, elle refuse (429) et n'écrit rien. Même patron que la redemande de
// lien magique (`lib/portail/lienMagique.ts`) : la borne vit EN BASE, pas en
// mémoire de processus — plusieurs conteneurs répondent.
//
// CE QUE CE PLAFOND EST : un garde-fou contre une boucle ou un script, sous une
// session authentifiée. Aucun usage normal ne l'atteint (un patient qui saisit
// trois semaines d'agenda d'un coup reste sous 60). Ce n'est PAS une borne
// exacte : comptage et écriture ne partagent ni transaction ni verrou, deux
// requêtes simultanées au plafond peuvent le franchir d'une unité chacune.
// Accepté (D-327 §3) : l'objet est l'ordre de grandeur, et un verrou par route
// coûterait plus que le risque.
//
// CHIFFRES TECHNIQUES, pas cliniques (`DC-20`) : arbitrés par le responsable
// le 2026-10-18.

/** Fenêtre glissante d'une heure, à l'horloge de l'application (comme `creeLe`, posé par Prisma). */
export const FENETRE_CADENCE_MS = 60 * 60 * 1000;

export const PLAFONDS_ECRITURES_PAR_HEURE = Object.freeze({
  /** Agendas du sommeil et alimentaire : saisies et corrections chaînées. */
  agenda: 60,
  /** Autres écritures du portail patient. */
  portail: 20,
  /** Écritures praticien sur les objectifs d'un dossier. */
  praticienObjectifs: 30,
  /** Proposition de priorité par IA : chaque appel est payant. */
  propositionPrioriteIa: 10,
});

export type FamilleCadence = keyof typeof PLAFONDS_ECRITURES_PAR_HEURE;

/** Texte lu par le patient au plafond (arbitrage du 2026-10-18). */
export const MESSAGE_CADENCE_PATIENT = 'Vous avez fait beaucoup d’envois en peu de temps. Réessayez dans une heure.';

/** Texte lu par le praticien au plafond. */
export const MESSAGE_CADENCE_PRATICIEN =
  'Trop d’enregistrements sur ce dossier en une heure (plafond technique). Réessayez plus tard.';

export function debutFenetreCadence(maintenant: Date = new Date()): Date {
  return new Date(maintenant.getTime() - FENETRE_CADENCE_MS);
}

/**
 * Le plafond de la famille est-il atteint ? `compter` reçoit le début de la
 * fenêtre et rend le nombre de lignes déjà écrites par ce dossier depuis. Au
 * plafond (et non au-delà) : la ligne qu'on s'apprête à écrire le franchirait.
 */
export async function cadenceAtteinte(
  famille: FamilleCadence,
  compter: (depuis: Date) => Promise<number>,
  maintenant: Date = new Date(),
): Promise<boolean> {
  return (await compter(debutFenetreCadence(maintenant))) >= PLAFONDS_ECRITURES_PAR_HEURE[famille];
}
