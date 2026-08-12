import { CATALOGUE_DEFINITIONS } from '../bibliotheque';
import { RIDEAU_T0 } from './preconditionsT0';

/**
 * Dossier de référence qui PASSE les préconditions T0 ([[D-052]]).
 *
 * Partagé par les bancs des trois routes concernées : sans lui, chacune
 * décrirait « un dossier confirmable » à sa façon, et une condition qui
 * changerait devrait être retrouvée dans trois fixtures divergentes.
 *
 * Les réponses brutes sont DÉRIVÉES DU CATALOGUE plutôt qu'écrites à la main :
 * une définition qui gagne ou perd un item ne doit pas rendre un banc vert par
 * accident.
 */
export function reponsesCompletes(idQuestionnaire: string): Record<string, unknown> {
  const definition = CATALOGUE_DEFINITIONS[idQuestionnaire];
  if (!definition) throw new Error(`Définition absente du catalogue : ${idQuestionnaire}`);
  const brutes: Record<string, unknown> = {};
  for (const section of (definition as { sections?: unknown[] }).sections ?? []) {
    for (const question of ((section as { questions?: unknown[] }).questions ?? [])) {
      const q = question as { id: string; min?: number; options?: { v: number }[] };
      brutes[q.id] = q.options?.[0]?.v ?? q.min ?? 1;
    }
  }
  return brutes;
}

export const DATE_RIDEAU_FIXTURE = new Date('2026-01-01T00:00:00.000Z');

/** Les quatre instruments du rideau, cotables, au statut par défaut. */
export function passationsRideauT0(dateReponse: Date = DATE_RIDEAU_FIXTURE) {
  return RIDEAU_T0.map(idQuestionnaire => ({
    idQuestionnaire,
    dateReponse,
    scoresJson: { rawAnswers: reponsesCompletes(idQuestionnaire) },
    statutValidite: 'VALID',
  }));
}

/** Synthèse validée, postérieure au rideau ci-dessus. */
export const SYNTHESE_VALIDEE_FIXTURE = {
  statut: 'Validee_Praticien',
  dateValidation: new Date('2026-01-02T00:00:00.000Z'),
};

/** Consultation validée portant un motif principal non vide. */
export const CONSULTATION_VALIDEE_FIXTURE = {
  anamnese: { motif_principal: 'Fatigue persistante depuis six mois.' },
};
