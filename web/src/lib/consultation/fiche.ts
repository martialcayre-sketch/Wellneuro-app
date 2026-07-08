// Fiche signalétique du patient (portail). Cellule familiale, profession,
// particularités du mode de vie + mentions obligatoires. Structure de départ,
// à affiner avec le praticien (cf. plan). Stockée en JSON sur la consultation.

export type FicheChampType = 'text' | 'textarea' | 'select';

export type FicheChamp = {
  id: string;
  label: string;
  type: FicheChampType;
  options?: string[];
  placeholder?: string;
};

export type FicheSection = {
  id: string;
  titre: string;
  champs: FicheChamp[];
};

export const FICHE_SECTIONS: FicheSection[] = [
  {
    id: 'cellule_familiale',
    titre: 'Cellule familiale',
    champs: [
      { id: 'situation_familiale', label: 'Situation familiale', type: 'select', options: ['Célibataire', 'En couple', 'Marié·e / Pacsé·e', 'Divorcé·e / Séparé·e', 'Veuf·ve'] },
      { id: 'nombre_enfants', label: 'Nombre d’enfants', type: 'text' },
      { id: 'composition_foyer', label: 'Composition du foyer (qui vit avec vous)', type: 'text' },
    ],
  },
  {
    id: 'profession',
    titre: 'Profession',
    champs: [
      { id: 'profession', label: 'Profession', type: 'text' },
      { id: 'statut_professionnel', label: 'Statut / rythme de travail (ex. horaires décalés)', type: 'text' },
    ],
  },
  {
    id: 'mode_de_vie',
    titre: 'Particularités du mode de vie',
    champs: [
      { id: 'activite_physique', label: 'Activité physique', type: 'text' },
      { id: 'regime_alimentaire', label: 'Régime alimentaire particulier (végétarien, sans gluten…)', type: 'text' },
      { id: 'consommations', label: 'Tabac, alcool, autres consommations', type: 'text' },
      { id: 'rythme_sommeil', label: 'Rythme de sommeil', type: 'text' },
      { id: 'particularites', label: 'Autres particularités à signaler', type: 'textarea' },
    ],
  },
];

export const FICHE_CHAMP_IDS: string[] = FICHE_SECTIONS.flatMap(s => s.champs.map(c => c.id));

// Champs dont au moins la présence est requise pour valider la fiche.
export const FICHE_CHAMPS_REQUIS = ['situation_familiale', 'profession'];

export function normaliserFiche(input: unknown): Record<string, string> {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const out: Record<string, string> = {};
  for (const id of FICHE_CHAMP_IDS) {
    const v = src[id];
    if (typeof v === 'string' && v.trim()) out[id] = v.trim().slice(0, 1000);
  }
  return out;
}
