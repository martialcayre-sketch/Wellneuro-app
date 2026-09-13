import { AGENDA_SOMMEIL_ID } from '@/lib/agenda-sommeil/types';
import { AGENDA_ALI_ID } from '@/lib/agenda-alimentaire/types';

// Péremption d'un envoi SANS ÉCHÉANCE — arbitrage praticien du 2026-09-13.
//
// CE QUE CETTE RÈGLE COMBLE, ET RIEN D'AUTRE. Une assignation qui PORTE une
// `dateLimite` est déjà tenue de bout en bout : passé la date,
// `isDeadlineExpired` refuse lecture, consentement et soumission côté patient,
// le hub bascule l'item en « Expiré », et le Fil du jour en fait une carte
// « assignation en retard » datée. Le second rideau, lui, n'en porte AUCUNE
// tant que `WN_ECHEANCE_OBLIGATOIRE` est éteint — c'est le cas en production.
// Ces envois-là ne peuvent donc jamais être en retard, jamais expirer, et
// n'apparaissent dans aucun signal : ils attendent sans terme. Mesuré sur les
// dossiers réels le 2026-09-12 — le rendement du troisième tour d'exploration
// tombe à 11 %, et rien ne le disait.
//
// UN SEUL SIGNAL PAR FAIT. La règle ne s'applique donc PAS aux envois qui ont
// une échéance : deux horloges sur la même attente donneraient deux nombres
// derrière le même mot, à deux écrans d'écart. Le jour où
// `WN_ECHEANCE_OBLIGATOIRE` s'allume, le second rideau acquiert une échéance et
// sort de cette règle pour rejoindre la carte du Fil — la relève est propre et
// n'a rien à coordonner.
//
// ELLE PROPOSE, ELLE NE FERME RIEN. Aucun accès patient ne change : la
// péremption est une lecture praticien qui appelle un geste (l'annulation),
// pas un verrou. C'est ce qui la distingue d'une échéance, et c'est pourquoi
// elle peut se permettre d'être plus courte que les 30 jours du pack de base.

/**
 * Les instruments dont l'absence d'échéance est leur PROTOCOLE, pas un oubli.
 *
 * Déplacé depuis `consultation/assignBasePack.ts` le 2026-09-13, qui le
 * ré-exporte : ce module-ci est une feuille (aucun accès base), et la règle de
 * péremption doit pouvoir se lire dans un composant client. Même patron que
 * `clinical-engine/rideauT0.ts`. Le Set reste UNIQUE — déplacé, pas recopié.
 *
 * Un agenda court sur 21 nuits ; le signaler périmé à 21 jours le marquerait
 * exactement le jour où le patient le termine. Mesuré en production le
 * 2026-09-12 : retour moyen de l'agenda du sommeil à 27,1 jours, sur 11
 * recueils rendus. L'exemption n'est pas une prudence, c'est une correction.
 */
export const QIDS_SANS_DATE_LIMITE: ReadonlySet<string> = new Set([AGENDA_SOMMEIL_ID, AGENDA_ALI_ID]);

/**
 * Jours au-delà desquels un envoi sans échéance est dit périmé.
 *
 * CHIFFRE OPÉRATIONNEL, ET IL SE DÉCLARE COMME TEL (`DC-19`, `DC-20`). Il ne
 * dérive d'aucune source clinique, d'aucun claim et d'aucun instrument : c'est
 * un arbitrage de conduite de cabinet, rendu par le praticien responsable le
 * 2026-09-13. Le prétendre clinique serait exactement ce que la constitution
 * interdit.
 *
 * Ce que la production disait au moment de l'arbitrage, et qui l'a informé sans
 * le fonder : le retour patient est binaire — 0,4 jour de moyenne sur le Cungi,
 * 1,9 sur le PSS-10 — et ce qui n'est pas revenu dans les premiers jours ne
 * revient pas. 21 jours laisse donc une marge large devant l'usage observé.
 */
export const JOURS_PEREMPTION_ENVOI = 21;

/** Jours révolus depuis la pose, en jours entiers. Négatif impossible. */
export function joursDepuisPose(dateAssignation: string, maintenant: Date = new Date()): number {
  const pose = new Date(dateAssignation).getTime();
  if (Number.isNaN(pose)) return 0;
  return Math.max(0, Math.floor((maintenant.getTime() - pose) / 86_400_000));
}

export type EnvoiPourPeremption = {
  statut: string;
  idQuestionnaire: string;
  dateAssignation: string;
  /** `null` / absent = aucune échéance : le seul cas que cette règle regarde. */
  dateLimite?: string | null;
  /**
   * Au moins une passation existe pour cet envoi.
   *
   * TRI-ÉTAT, et `undefined` n'est pas `false` : un serveur qui ne publie pas
   * ce fait ne peut pas attester qu'aucune passation n'existe. Comme le badge
   * affirme « sans retour », l'inconnu ne l'autorise pas — même fail-closed que
   * `estAnnulable`, qui refuse le bouton dans le même cas.
   */
  aPassation?: boolean;
};

/**
 * Cet envoi attend-il depuis trop longtemps sans que rien ne le dise ?
 *
 * Forme POSITIVE et fail-closed, comme `estAnnulable` : chaque terme doit être
 * atteint pour qu'un envoi soit dit périmé. Une date illisible rend `0` jour,
 * donc jamais périmé — on ne signale pas sur une donnée qu'on ne sait pas lire.
 */
export function envoiPerime(envoi: EnvoiPourPeremption, maintenant: Date = new Date()): boolean {
  if (envoi.statut !== 'En attente') return false;
  // Une échéance existe : le Fil et le portail s'en chargent déjà.
  if (envoi.dateLimite) return false;
  if (QIDS_SANS_DATE_LIMITE.has(envoi.idQuestionnaire)) return false;
  // « SANS RETOUR » DOIT ÊTRE VRAI. Un envoi qui porte une passation a reçu une
  // réponse, quel que soit son statut d'assignation — le dire « sans retour »
  // serait faux, et enverrait le praticien annuler ce qui est déjà rentré.
  // Relevé par le banc d'écran avant toute mise en service.
  if (envoi.aPassation !== false) return false;
  return joursDepuisPose(envoi.dateAssignation, maintenant) > JOURS_PEREMPTION_ENVOI;
}
