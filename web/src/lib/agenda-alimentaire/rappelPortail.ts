// Rappel de l'agenda alimentaire dans l'espace patient (domaine PUR,
// client-safe : aucune dépendance Prisma, aucun import serveur).
//
// Jumeau de `agenda-sommeil/rappelPortail.ts` : même structure, même
// vocabulaire, mêmes interdits. Ce module ne dit au patient QUE ce que le
// journal de l'agenda lui montre déjà : combien de journées il a notées sur 21,
// et si celle du jour manque.
// Interdits tenus (registre des frontières, arbitrage 2026-07-21) :
//   — aucun compte à rebours, aucun « il vous reste N jours » ;
//   — aucun « vous avez manqué », aucune série, aucun pourcentage ;
//   — aucun agrégat, aucune moyenne, aucune tendance, aucune interprétation.
// Le seul chiffre est un COMPTE DE SAISIES : « X journées notées sur 21 » est de
// la NAVIGATION, pas de la gamification — c'est le même chiffre que la frise,
// déjà arbitré. Aucune grandeur de l'étage d'agrégation (jeûne nocturne,
// fenêtre alimentaire, écart-type des ancres, indice /100) n'entre ici.

import { NB_JOURS_AGENDA_ALI } from './types';

export type EtatRappelAgendaAli =
  | 'a_commencer' // aucune journée : la fenêtre n'est pas encore ancrée
  | 'journee_a_noter' // la journée du jour manque, fenêtre ouverte
  | 'a_jour' // la journée du jour est déjà en base
  | 'a_transmettre'; // fenêtre de 21 jours atteinte

export type RappelAgendaAli = {
  etat: EtatRappelAgendaAli;
  /** Libellé du bouton, `null` quand il n'y a rien à faire aujourd'hui. */
  cta: string | null;
  /** Une phrase factuelle, jamais une injonction. */
  factuel: string;
  /** L'agenda doit-il passer devant les autres tâches du hub ? */
  prioritaire: boolean;
};

export type EtatAgendaAliPortail = {
  nbRenseignees: number;
  jourCourant: number | null;
  /**
   * ── POURQUOI « ENREGISTREE » ET NON « NOTEE » ────────────────────────────
   *
   * Ce champ mesure « une ligne existe en base pour la date du jour », LISIBLE
   * OU NON. Le hub ne parse JAMAIS le JSONB `reponses` (sa requête ne le
   * sélectionne même pas) : il ne peut donc pas distinguer une journée relue
   * d'une journée en quarantaine. Le nom dit ce qu'il mesure, il ne promet pas
   * ce qu'on ne sait pas.
   *
   * Le ramener à `journeeDuJourNotee` — le nom du jumeau sommeil — laisserait
   * croire à une lecture du contenu qui n'a pas lieu. Et le renommer ne
   * changerait rien à la DÉCISION, qui est la même dans les deux lectures : le
   * patient n'a rien à faire aujourd'hui. Une date en quarantaine n'est pas
   * notable non plus — toute écriture sur cette date est refusée en 409
   * (`agenda_illisible`) par le POST de la route agenda. Proposer « Noter ma
   * journée » enverrait le patient vers une porte close.
   */
  journeeDuJourEnregistree: boolean;
  cloturablePatient: boolean;
};

export function deriverRappelAgendaAli(etat: EtatAgendaAliPortail): RappelAgendaAli {
  const pluriel = etat.nbRenseignees > 1 ? 's' : '';
  const notees = `${etat.nbRenseignees} journée${pluriel} notée${pluriel} sur ${NB_JOURS_AGENDA_ALI}.`;

  // Jamais commencé. NON prioritaire, et c'est délibéré : l'argument de
  // péremption ne s'applique pas ici — la fenêtre s'ancre sur la PREMIÈRE
  // journée enregistrée, donc rien ne se perd à commencer demain. Le mettre en
  // tête enterrerait sans terme un pack assigné avant une consultation.
  if (etat.nbRenseignees === 0) {
    return {
      etat: 'a_commencer',
      cta: 'Commencer mon agenda alimentaire',
      factuel: `Une minute chaque jour, pendant ${NB_JOURS_AGENDA_ALI} jours.`,
      prioritaire: false,
    };
  }

  // ── POURQUOI CET ÉTAT N'OFFRE AUCUN GESTE ─────────────────────────────────
  //
  // Le jumeau sommeil propose ici « Terminer et transmettre à mon praticien »,
  // et il le peut : `api/portail/agenda-sommeil/cloture` existe. **Son
  // équivalent alimentaire n'existe pas** — la clôture patient est hors du
  // périmètre de LOT-04, et `AgendaAlimentaireJournal` ne pose délibérément
  // aucun bouton de transmission.
  //
  // Recopier le CTA du sommeil aurait donc envoyé le patient, au 21e jour, vers
  // une frise sans le geste que le hub venait de lui promettre. C'est la classe
  // de défaut que ce lot ferme partout ailleurs (D-015 : un refus qui nomme un
  // geste doit nommer un geste POSSIBLE) — la règle vaut autant pour ce qu'on
  // propose que pour ce qu'on refuse. `cta: null`, et `prioritaire: false` :
  // sans action possible, passer devant les autres tâches du hub serait un
  // rappel qui ne mène nulle part. Le compte reste dit, il informe.
  //
  // À reprendre par le lot qui livrera la clôture alimentaire.
  const recueilTermine: RappelAgendaAli = {
    etat: 'a_transmettre',
    cta: null,
    factuel: `${notees} Votre période de recueil est terminée.`,
    prioritaire: false,
  };

  // Hors fenêtre : plus aucun emplacement à remplir.
  if (etat.jourCourant === null) {
    return recueilTermine;
  }

  // La journée du jour manque et la fenêtre est ouverte : cet état passe AVANT
  // « recueil terminé », y compris le matin du 21e jour où `cloturablePatient`
  // est déjà vrai — la case est ATTEINTE, pas remplie (D-022). Sinon le hub
  // annoncerait un recueil terminé pendant que le journal ouvre le formulaire
  // de la dernière journée, et le patient qui suit le hub la laisserait vide.
  // L'ordre porte aujourd'hui sur une phrase ; il portera sur un geste
  // irréversible le jour où la clôture patient existera, et il sera déjà juste.
  if (!etat.journeeDuJourEnregistree) {
    // La seule tâche PÉRISSABLE du portail : la fenêtre de saisie se referme,
    // alors qu'un brouillon attend sans rien perdre.
    return {
      etat: 'journee_a_noter',
      cta: 'Noter ma journée',
      factuel: notees,
      prioritaire: true,
    };
  }

  // Journée du jour enregistrée et fenêtre atteinte. Le compte de journées reste
  // dit — c'est lui qui qualifie le recueil. Ne pas écrire « complet » : la
  // fenêtre l'est, le recueil pas forcément (elle peut être trouée).
  if (etat.cloturablePatient) {
    return recueilTermine;
  }

  return {
    etat: 'a_jour',
    cta: null,
    factuel: `Journée notée aujourd'hui. ${notees}`,
    prioritaire: false,
  };
}
