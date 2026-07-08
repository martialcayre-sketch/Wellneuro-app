// Fiche d'anamnèse hiérarchisée — version patient, adaptée à la neuronutrition.
//
// Volontairement RESSERRÉE pour ne PAS dupliquer ce que le pack de base extrait
// déjà (plaintes/douleurs cotées, mode de vie, alimentaire, DNSM/neurotransmet-
// teurs). L'anamnèse se concentre sur ce que le pack ne couvre pas : repères
// corporels, motif & attentes, histoire des troubles, signaux d'alerte médicaux,
// antécédents, et traitements/compléments (saisie répétable).
//
// L'exploitation praticien (cartographie des axes, hypothèses, biologie, phases
// de 21 jours) n'appartient pas à ce formulaire patient : elle relèvera d'un
// outil praticien dédié. Rendue par `AnamneseForm`, stockée en JSON.

export type AnamneseChampType = 'text' | 'textarea' | 'radio' | 'checkbox-multi';

export type AnamneseChamp = {
  id: string;
  label: string;
  type: AnamneseChampType;
  options?: string[]; // pour 'radio' et 'checkbox-multi'
  placeholder?: string;
  suffixe?: string; // ex. « cm », « kg »
};

// Groupe répétable : une même structure de champs saisie plusieurs fois
// (ex. plusieurs médicaments). Chaque entrée = un enregistrement de champs texte.
export type AnamneseGroupeRepetable = {
  id: string;
  label: string;
  description?: string;
  ajoutLabel: string;
  champs: AnamneseChamp[]; // en pratique de type 'text'
  maxEntrees?: number;
};

export type AnamneseSection = {
  id: string;
  titre: string;
  description?: string;
  champs?: AnamneseChamp[];
  groupes?: AnamneseGroupeRepetable[];
};

// Champ minimum requis pour valider l'anamnèse.
export const ANAMNESE_CHAMP_REQUIS = 'motif_principal';

const MAX_ENTREES_DEFAUT = 20;

export const ANAMNESE_SECTIONS: AnamneseSection[] = [
  {
    id: 'reperes',
    titre: 'Repères corporels',
    champs: [
      { id: 'taille', label: 'Taille', type: 'text', suffixe: 'cm' },
      { id: 'poids_actuel', label: 'Poids actuel', type: 'text', suffixe: 'kg' },
      { id: 'poids_habituel', label: 'Poids habituel', type: 'text', suffixe: 'kg' },
      { id: 'variation_poids', label: 'Variation récente du poids', type: 'radio', options: ['Perte', 'Prise', 'Stable'] },
    ],
  },
  {
    id: 'motif',
    titre: 'Motif et attentes',
    champs: [
      { id: 'motif_principal', label: 'Qu’est-ce qui vous amène aujourd’hui ?', type: 'textarea', placeholder: 'Décrivez ce qui vous préoccupe le plus…' },
      { id: 'objectif_prioritaire', label: 'Si vous ne pouviez améliorer qu’une seule chose en priorité, laquelle ?', type: 'textarea' },
      {
        id: 'attentes',
        label: 'Vos attentes principales',
        type: 'checkbox-multi',
        options: [
          'Comprendre l’origine possible des troubles',
          'Améliorer l’énergie',
          'Améliorer le sommeil',
          'Réduire les douleurs ou l’inflammation',
          'Améliorer la digestion / le transit',
          'Améliorer l’humeur, le stress, l’anxiété',
          'Améliorer le poids / la composition corporelle',
          'Adapter l’alimentation et les compléments',
          'Préparer un bilan biologique',
        ],
      },
    ],
  },
  {
    id: 'histoire',
    titre: 'Histoire des troubles',
    champs: [
      { id: 'debut', label: 'Début des troubles', type: 'radio', options: ['Brutal', 'Progressif'] },
      { id: 'debut_date', label: 'Depuis quand ? (date ou période)', type: 'text' },
      { id: 'declencheur', label: 'Un événement déclencheur a-t-il précédé les troubles ? Lequel ?', type: 'textarea' },
      { id: 'evolution', label: 'Comment évoluent-ils ?', type: 'radio', options: ['Ils s’aggravent', 'Ils sont stables', 'Ils sont variables'] },
      { id: 'facteurs_ameliorent', label: 'Ce qui les améliore', type: 'text' },
      { id: 'facteurs_aggravent', label: 'Ce qui les aggrave', type: 'text' },
      {
        id: 'facteurs_declenchants',
        label: 'Facteurs survenus dans la période du début',
        type: 'checkbox-multi',
        options: [
          'Infection / syndrome post-infectieux (Covid…)',
          'Stress aigu / burn-out',
          'Traumatisme, deuil, séparation ou conflit',
          'Grossesse / post-partum',
          'Ménopause / périménopause',
          'Intervention chirurgicale',
          'Antibiotiques / IPP / corticoïdes',
          'Changement alimentaire',
          'Perte ou prise de poids rapide',
          'Surentraînement',
        ],
      },
    ],
  },
  {
    id: 'alertes',
    titre: 'Signaux à signaler',
    description: 'Cochez ce qui vous concerne actuellement. Ces éléments peuvent nécessiter un avis médical prioritaire.',
    champs: [
      {
        id: 'signaux_alerte',
        label: 'Ressentez-vous l’un de ces signes ?',
        type: 'checkbox-multi',
        options: [
          'Perte de poids involontaire importante',
          'Fièvre prolongée / sueurs nocturnes',
          'Sang dans les selles ou les urines',
          'Douleur thoracique / oppression',
          'Essoufflement inhabituel',
          'Malaise / perte de connaissance',
          'Perte de force ou de sensibilité brutale',
          'Idées noires ou suicidaires',
          'Douleur intense et inhabituelle',
          'Vomissements persistants',
          'Diarrhée persistante ou nocturne',
          'Constipation récente inexpliquée',
        ],
      },
    ],
  },
  {
    id: 'antecedents',
    titre: 'Antécédents',
    champs: [
      {
        id: 'antecedents_domaines',
        label: 'Avez-vous des antécédents dans ces domaines ?',
        type: 'checkbox-multi',
        options: [
          'Cardiovasculaire',
          'Métabolique (diabète, cholestérol…)',
          'Thyroïde',
          'Digestif (SII, reflux, MICI…)',
          'Neurologique (migraine, TDAH…)',
          'Psychiatrique (anxiété, dépression, burn-out)',
          'Douleurs chroniques / fibromyalgie',
          'Auto-immun / rhumatologique',
          'Allergies / atopie',
          'Gynécologique / hormonal',
          'Respiratoire / apnée du sommeil',
          'Cancer',
        ],
      },
      { id: 'antecedents_details', label: 'Précisions sur ces antécédents', type: 'textarea' },
      { id: 'chirurgies', label: 'Chirurgies et hospitalisations', type: 'textarea' },
      { id: 'allergies', label: 'Allergies et intolérances connues', type: 'textarea' },
    ],
  },
  {
    id: 'traitements',
    titre: 'Traitements et compléments',
    description: 'Ajoutez autant de lignes que nécessaire.',
    champs: [
      {
        id: 'automedication',
        label: 'Automédication régulière',
        type: 'checkbox-multi',
        options: [
          'Anti-inflammatoires',
          'Antalgiques',
          'Laxatifs',
          'IPP / antiacides',
          'Somnifères / anxiolytiques',
          'Caféine / boissons énergisantes',
          'Alcool',
          'Nicotine',
          'Cannabis / autres substances',
        ],
      },
    ],
    groupes: [
      {
        id: 'medicaments',
        label: 'Médicaments en cours',
        ajoutLabel: 'Ajouter un médicament',
        champs: [
          { id: 'nom', label: 'Médicament', type: 'text' },
          { id: 'dose', label: 'Dose', type: 'text' },
          { id: 'moment', label: 'Moment de prise', type: 'text' },
          { id: 'depuis', label: 'Depuis quand', type: 'text' },
          { id: 'motif', label: 'Motif', type: 'text' },
        ],
      },
      {
        id: 'complements',
        label: 'Compléments alimentaires en cours',
        ajoutLabel: 'Ajouter un complément',
        champs: [
          { id: 'nom', label: 'Complément', type: 'text' },
          { id: 'dose', label: 'Dose', type: 'text' },
          { id: 'moment', label: 'Moment de prise', type: 'text' },
          { id: 'objectif', label: 'Objectif', type: 'text' },
        ],
      },
    ],
  },
];

// ─── normalisation défensive côté serveur ───────────────────────────────────
type ChampIndex = {
  simples: Map<string, AnamneseChamp>;
  multi: Map<string, Set<string>>; // id -> options autorisées
  groupes: Map<string, { champIds: Set<string>; max: number }>;
};

function indexer(): ChampIndex {
  const simples = new Map<string, AnamneseChamp>();
  const multi = new Map<string, Set<string>>();
  const groupes = new Map<string, { champIds: Set<string>; max: number }>();
  for (const section of ANAMNESE_SECTIONS) {
    for (const champ of section.champs ?? []) {
      if (champ.type === 'checkbox-multi') multi.set(champ.id, new Set(champ.options ?? []));
      else simples.set(champ.id, champ);
    }
    for (const groupe of section.groupes ?? []) {
      groupes.set(groupe.id, {
        champIds: new Set(groupe.champs.map(c => c.id)),
        max: groupe.maxEntrees ?? MAX_ENTREES_DEFAUT,
      });
    }
  }
  return { simples, multi, groupes };
}

export type AnamneseValeurs = Record<string, string | string[] | Array<Record<string, string>>>;

// Ne conserve que des champs connus, bornés. Renvoie une structure sûre.
export function normaliserAnamnese(input: unknown): AnamneseValeurs {
  const src = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const { simples, multi, groupes } = indexer();
  const out: AnamneseValeurs = {};

  for (const [id] of simples) {
    const v = src[id];
    if (typeof v === 'string' && v.trim()) out[id] = v.trim().slice(0, 2000);
  }

  for (const [id, autorisees] of multi) {
    const v = src[id];
    if (Array.isArray(v)) {
      const gardees = v.filter((x): x is string => typeof x === 'string' && autorisees.has(x));
      if (gardees.length) out[id] = Array.from(new Set(gardees));
    }
  }

  for (const [id, { champIds, max }] of groupes) {
    const v = src[id];
    if (!Array.isArray(v)) continue;
    const entrees: Array<Record<string, string>> = [];
    for (const brut of v.slice(0, max)) {
      if (!brut || typeof brut !== 'object') continue;
      const rec = brut as Record<string, unknown>;
      const entree: Record<string, string> = {};
      for (const champId of champIds) {
        const val = rec[champId];
        if (typeof val === 'string' && val.trim()) entree[champId] = val.trim().slice(0, 500);
      }
      if (Object.keys(entree).length) entrees.push(entree);
    }
    if (entrees.length) out[id] = entrees;
  }

  return out;
}
