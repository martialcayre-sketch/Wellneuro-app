import type { QuestionnaireDef } from '@/lib/questionnaire-types';

export const PLAINTES = [
  { key: 'fatigue', label: 'Fatigue', icon: '😴' },
  { key: 'douleurs', label: 'Douleurs', icon: '💢' },
  { key: 'digestion', label: 'Digestion', icon: '🫃' },
  { key: 'surpoids', label: 'Surpoids / morphologie', icon: '⚖️' },
  { key: 'insomnie', label: 'Insomnie / sommeil', icon: '🌙' },
  { key: 'moral', label: 'Moral / anxiété', icon: '😟' },
  { key: 'mobilite', label: 'Mobilité / douleurs musculaires', icon: '🦵' },
] as const;

// Définition d'affichage uniquement : le renderer Plaintes conserve son calcul
// historique et le moteur de scoring général n'utilise jamais cet objet.
export const QUESTIONNAIRE_PLAINTES_LECTURE: QuestionnaireDef = {
  id: 'Q_PLAINTES',
  titre: 'Plaintes',
  sections: [
    {
      id: 'plaintes',
      titre: 'Intensité des plaintes',
      questions: PLAINTES.map(plainte => ({
        id: plainte.key,
        texte: plainte.label,
        type: 'number',
        min: 1,
        max: 10,
        step: 1,
        unit: '/ 10',
      })),
    },
  ],
};
