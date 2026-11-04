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

// Ce qu'ouvre un clic sur « Analyse du praticien », étape courante de la frise
// navigable ([[D-423]] §8, Q27). La phrase suit l'état, jamais au-delà (D7,
// D11) : en `elements_transmis`, l'analyse n'est pas commencée, et « Votre
// praticien prépare… » serait faux — la phrase déjà servie, aucun texte neuf.
// Le texte d'`analyse_en_cours`, accepté mot pour mot le 2026-11-02, ne porte
// ni chiffre ni délai promis. Entre dans `TOUTES` de la garde D7.
export const TEXTES_ETAPE_ANALYSE_COURANTE: Record<'elements_transmis' | 'analyse_en_cours', string> = {
  elements_transmis: FORMULATIONS_PATIENT.elements_transmis,
  analyse_en_cours:
    'Votre praticien prépare votre restitution à partir des éléments transmis. Vous la retrouverez ici dès qu’elle sera prête.',
};

// Libellés courts pour la frise de parcours (`PatientJourneyProgress`) : la
// phrase complète va dans la carte, le libellé court sous l'étape.
export const LIBELLES_COURTS_PATIENT: Record<EtapePatientSynchronisee, string> = {
  elements_transmis: 'Vos éléments ont été transmis',
  analyse_en_cours: 'Votre praticien les prépare',
  restitution_disponible: 'Votre restitution est disponible',
  prochaine_etape_prete: 'Votre prochaine étape est prête',
};
