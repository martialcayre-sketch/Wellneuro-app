// Rappel de l'agenda du sommeil dans l'espace patient (domaine PUR,
// client-safe : aucune dépendance Prisma, aucun import serveur).
//
// Ce module ne dit au patient QUE ce que le journal de l'agenda lui montre
// déjà : combien de nuits il a notées sur 21, et si la nuit du jour manque.
// Interdits tenus (registre des frontières, arbitrage 2026-07-21) :
//   — aucun compte à rebours, aucun « il vous reste N jours » ;
//   — aucun « vous avez manqué », aucune série, aucun pourcentage ;
//   — aucun agrégat, aucun score, aucune interprétation.
// « X nuits notées sur 21 » est de la NAVIGATION, pas de la gamification :
// c'est le même chiffre que la frise, déjà arbitré.

export type EtatRappelAgenda =
  | 'a_commencer' // aucune nuit : la fenêtre n'est pas encore ancrée
  | 'nuit_a_noter' // la nuit du jour manque, fenêtre ouverte
  | 'a_jour' // la nuit du jour est notée
  | 'a_transmettre'; // fenêtre de 21 jours atteinte

export type RappelAgenda = {
  etat: EtatRappelAgenda;
  /** Libellé du bouton, `null` quand il n'y a rien à faire aujourd'hui. */
  cta: string | null;
  /** Une phrase factuelle, jamais une injonction. */
  factuel: string;
  /** L'agenda doit-il passer devant les autres tâches du hub ? */
  prioritaire: boolean;
};

export type EtatAgendaPortail = {
  nbRenseignees: number;
  jourCourant: number | null;
  nuitDuJourNotee: boolean;
  cloturablePatient: boolean;
};

export function deriverRappelAgenda(
  etat: EtatAgendaPortail,
  nbJoursAgenda: number,
): RappelAgenda {
  const notees = `${etat.nbRenseignees} nuit${etat.nbRenseignees > 1 ? 's' : ''} notée${
    etat.nbRenseignees > 1 ? 's' : ''
  } sur ${nbJoursAgenda}.`;

  // Jamais commencé. NON prioritaire, et c'est délibéré : l'argument de
  // péremption ne s'applique pas ici — la fenêtre s'ancre sur la PREMIÈRE nuit
  // saisie, donc rien ne se perd à commencer demain. Le mettre en tête
  // enterrerait sans terme un pack assigné avant une consultation.
  if (etat.nbRenseignees === 0) {
    return {
      etat: 'a_commencer',
      cta: 'Commencer mon agenda du sommeil',
      factuel: `Une minute chaque matin, pendant ${nbJoursAgenda} jours.`,
      prioritaire: false,
    };
  }

  // Hors fenêtre : plus aucun emplacement à remplir, la transmission est le
  // seul geste restant.
  if (etat.jourCourant === null) {
    return {
      etat: 'a_transmettre',
      cta: 'Terminer et transmettre à mon praticien',
      factuel: notees,
      prioritaire: true,
    };
  }

  // La nuit du jour manque et la fenêtre est ouverte : cet état passe AVANT la
  // transmission, y compris le matin du 21e jour où `cloturablePatient` est
  // déjà vrai. Sinon le hub inviterait à transmettre pendant que le journal
  // ouvre le formulaire — et le patient qui suit le hub clôturerait
  // IRRÉVERSIBLEMENT en abandonnant sa dernière nuit.
  if (!etat.nuitDuJourNotee) {
    // La seule tâche PÉRISSABLE du portail : `estDateSaisissable` referme la
    // porte à J-2, alors qu'un brouillon attend sans rien perdre.
    return {
      etat: 'nuit_a_noter',
      cta: 'Noter ma nuit',
      factuel: notees,
      prioritaire: true,
    };
  }

  // Nuit du jour notée et fenêtre atteinte : tout est en place pour clôturer.
  // Le compte de nuits reste dit — c'est lui qui qualifie la décision, et
  // clôturer sous 7 nuits produit une réponse sans agrégat. Ne pas écrire
  // « complet » : la fenêtre l'est, le recueil pas forcément.
  if (etat.cloturablePatient) {
    return {
      etat: 'a_transmettre',
      cta: 'Terminer et transmettre à mon praticien',
      factuel: notees,
      prioritaire: true,
    };
  }

  return {
    etat: 'a_jour',
    cta: null,
    factuel: `Nuit notée ce matin. ${notees}`,
    prioritaire: false,
  };
}
