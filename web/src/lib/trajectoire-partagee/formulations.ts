// Formulations patient du contrat d'épisode partagé (SP-CONV LOT-01, D7).
//
// Doctrine : le Jardin raconte une construction, jamais une dégradation.
// Ces phrases sont la SEULE surface textuelle que le contrat autorise côté
// patient : pas de score, pas de pourcentage, pas de délai promis, pas de
// vocabulaire de jeu (garde `formulations.guard.test.ts`). Le praticien a ses
// propres formulations, jamais partagées.

export type EtapePatientSynchronisee =
  | 'elements_transmis'
  | 'analyse_en_cours'
  | 'restitution_disponible'
  | 'prochaine_etape_prete';

export const FORMULATIONS_PATIENT: Record<EtapePatientSynchronisee, string> = {
  elements_transmis: 'Vos éléments ont été transmis.',
  analyse_en_cours: 'Votre praticien les prépare.',
  restitution_disponible: 'Votre restitution est disponible.',
  prochaine_etape_prete: 'Votre prochaine étape est prête.',
};

// Libellés courts pour la frise de parcours (`PatientJourneyProgress`) : la
// phrase complète va dans la carte, le libellé court sous l'étape.
export const LIBELLES_COURTS_PATIENT: Record<EtapePatientSynchronisee, string> = {
  elements_transmis: 'Vos éléments ont été transmis',
  analyse_en_cours: 'Votre praticien les prépare',
  restitution_disponible: 'Votre restitution est disponible',
  prochaine_etape_prete: 'Votre prochaine étape est prête',
};
