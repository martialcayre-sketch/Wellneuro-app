import { jourCourantLocal } from '@/lib/patient-access';

/**
 * RELANCER UN ENVOI ÉCHU ([[D-562]]) — ce que la fiche et le Fil disent, et la
 * date que la relance donne. Module SANS dépendance serveur : la route
 * l'applique, les deux écrans l'annoncent, et une seule source évite qu'ils
 * divergent.
 */

/**
 * LA NOUVELLE ÉCHÉANCE D'UNE RELANCE ([[D-562]] §1) : le jour de la relance
 * plus 7 jours. Durée fixée par le responsable le 2026-11-25 (liste commune
 * `20261125-1159-d`) ; elle ne change que par une décision.
 */
export const JOURS_NOUVELLE_ECHEANCE_RELANCE = 7;

/**
 * LA NOUVELLE DATE LIMITE, au format de la colonne (`AAAA-MM-JJ`) : le jour
 * LOCAL de la relance plus `JOURS_NOUVELLE_ECHEANCE_RELANCE` jours, PAR LE
 * CALENDRIER — jamais + 7 × 24 h, qu'un changement d'heure ferait tomber la
 * veille ([[D-414]] §2). L'instant est injecté.
 */
export function nouvelleDateLimiteRelance(maintenant: Date): string {
  const jour = new Date(maintenant);
  jour.setHours(12, 0, 0, 0);
  jour.setDate(jour.getDate() + JOURS_NOUVELLE_ECHEANCE_RELANCE);
  return jourCourantLocal(jour);
}

/** `AAAA-MM-JJ` → `JJ/MM/AAAA` ; toute autre forme est rendue telle quelle. */
export function dateLimiteAffichee(dateLimite: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateLimite);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : dateLimite;
}

/** La réponse de `POST /api/praticien/assignations/relance`, telle que les écrans la lisent. */
export type ResultatRelance = {
  ok?: boolean;
  error?: string;
  statut?: string;
  questionnaires?: number;
  nouvelleDateLimite?: string;
};

/** T-93 ([[D-488]] DOC-20). */
export const MESSAGE_RELANCE_SANS_REPONSE = 'Relance impossible : le serveur n’a pas répondu.';

/**
 * CE QUE L'ÉCRAN DIT APRÈS UNE RÉPONSE 200 ([[D-488]] DOC-20, T-89 à T-92).
 *
 * UN 200 N'EST PAS UN ENVOI ([[D-404]] §2) : « Relance envoyée » ne se dit que
 * du statut `Envoye`, seul cas où la date a bougé. Un refus (`ok` faux) rend
 * le message du serveur tel quel : il dit la raison.
 */
export function messageResultatRelance(r: ResultatRelance): string {
  if (!r.ok) return r.error ?? MESSAGE_RELANCE_SANS_REPONSE;
  if (r.statut === 'Non_envoye') return 'Relance non partie : l’envoi d’e-mails n’est pas configuré. Rien n’a changé.';
  // TOUT AUTRE STATUT QU'`Envoye` est un e-mail non parti : « Relance
  // envoyée » ne se dit jamais d'un statut qu'on ne connaît pas.
  if (r.statut !== 'Envoye') return 'Relance non partie : l’envoi a échoué. Rien n’a changé ; vous pouvez réessayer.';
  const date = r.nouvelleDateLimite ? dateLimiteAffichee(r.nouvelleDateLimite) : '';
  const nombre = r.questionnaires ?? 1;
  return nombre > 1
    ? `Relance envoyée. Elle couvre les ${nombre} envois échus de ce dossier ; nouvelle date limite : ${date}.`
    : `Relance envoyée. Nouvelle date limite : ${date}.`;
}
