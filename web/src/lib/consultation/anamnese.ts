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

/**
 * Les trois réponses d'un état de population — l'inconnu est ÉCRIT.
 *
 * Exporté parce que `lireEtatPopulation` compare contre ces libellés exacts :
 * deux littéraux recopiés dériveraient l'un de l'autre en silence, et une
 * dérive fait basculer une gate de sécurité sans qu'aucun banc ne bouge.
 */
export const OUI_NON_INCONNU = ['Oui', 'Non', 'Je ne sais pas'] as const;

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
      {
        // Difficulté fonctionnelle actuelle, auto-rapportée. Structuré pour un
        // moteur de règles (parcours alimentation mixée). ATTENTION : une
        // dysphagie récente et inexpliquée est aussi un signal d'adressage —
        // une règle qui la lit ne doit jamais court-circuiter cette vigilance.
        id: 'symptomes_fonctionnels',
        label: 'Difficultés fonctionnelles actuelles',
        type: 'checkbox-multi',
        options: ['Difficultés à avaler / troubles de la déglutition'],
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
      {
        // Intolérances déclarées, sous forme énumérée (le champ libre ci-dessus
        // reste pour tout le reste). Structuré pour qu'un moteur de règles
        // déterministe puisse les lire — le texte libre, lui, ne remonte qu'en
        // contexte praticien, jamais en déclencheur.
        id: 'intolerances_alimentaires',
        label: 'Intolérances alimentaires connues',
        type: 'checkbox-multi',
        options: ['Gluten', 'Histamine', 'Lactose'],
      },
    ],
  },
  {
    // ÉTAT ACTUEL — les états de population, et RIEN D'AUTRE ([[D-101]],
    // LOT-05 « Doctrine exécutable », `DC-43`).
    //
    // DISTINCTE DES DEUX SECTIONS QUI LUI RESSEMBLENT, et la distinction est le
    // motif de la section. `facteurs_declenchants` porte « Grossesse /
    // post-partum » comme ANTÉCÉDENT — un fait survenu dans la période du début
    // des troubles ; `antecedents_domaines` porte des domaines d'histoire
    // médicale. Ni l'un ni l'autre ne dit ce qui est VRAI AUJOURD'HUI, et
    // c'est le seul état qu'une gate de population a le droit de lire.
    // Réétiqueter le facteur déclenchant aurait été le raccourci ; l'audit
    // doctrinal l'interdit nommément.
    //
    // TROIS ÉTATS PAR QUESTION, JAMAIS DEUX (`DC-24`). Une case à cocher non
    // cochée ne distingue pas « je ne suis pas concerné » de « je n'ai pas
    // répondu » — sur une gate de sécurité, cette confusion est le fail-open
    // exact que la constitution interdit. D'où un `radio` par critère, avec
    // « Je ne sais pas » ÉCRIT : le silence reste un quatrième état (champ
    // absent), et `lireEtatPopulation` les ramène tous deux à `inconnu`.
    //
    // CE QUE LA SECTION NE PORTE PAS, ET POURQUOI — chacun de ces trois
    // critères est nommé par `DC-43`, et chacun manque de la provenance qui en
    // ferait une question :
    //
    //   · ÂGE (« enfant », « personne âgée ») : aucune borne d'âge n'a de
    //     provenance au dépôt. Poser un pivot ici serait inventer un seuil
    //     clinique (`DC-19`). `Patient.dateNaissance` reste un fait
    //     administratif, lu par le praticien, jamais par une gate.
    //   · POLYMÉDICATION : le groupe `medicaments` donne déjà le compte exact.
    //     Ce qui manque n'est pas la donnée mais le NOMBRE à partir duquel elle
    //     qualifie une population — aucune source ne le fixe.
    //   · ALLERGIE / INTOLÉRANCE : déjà déclarée juste au-dessus
    //     (`intolerances_alimentaires`, énuméré ; `allergies`, texte libre).
    //     La redemander ici créerait deux vérités pour un même fait.
    id: 'etat_actuel',
    titre: 'État actuel',
    description:
      'Ces questions portent sur votre situation AUJOURD’HUI, et non sur vos antécédents. '
      + 'Si vous ne savez pas, répondez « Je ne sais pas » : c’est une réponse utile, et elle vaut mieux qu’une case laissée vide.',
    champs: [
      { id: 'etat_grossesse', label: 'Êtes-vous enceinte actuellement ?', type: 'radio', options: [...OUI_NON_INCONNU] },
      { id: 'etat_allaitement', label: 'Allaitez-vous actuellement ?', type: 'radio', options: [...OUI_NON_INCONNU] },
      {
        id: 'etat_pathologie_renale',
        label: 'Une maladie des reins vous a-t-elle été diagnostiquée ?',
        type: 'radio',
        options: [...OUI_NON_INCONNU],
      },
      {
        id: 'etat_pathologie_hepatique',
        label: 'Une maladie du foie vous a-t-elle été diagnostiquée ?',
        type: 'radio',
        options: [...OUI_NON_INCONNU],
      },
      {
        id: 'etat_chirurgie_digestive',
        label: 'Avez-vous subi une chirurgie de l’appareil digestif (estomac, intestin, vésicule…) ?',
        type: 'radio',
        options: [...OUI_NON_INCONNU],
      },
      {
        id: 'etat_maladie_coeliaque',
        label: 'Une maladie cœliaque vous a-t-elle été diagnostiquée ?',
        type: 'radio',
        options: [...OUI_NON_INCONNU],
      },
      {
        // Question SÉPARÉE de l'intolérance au gluten déclarée plus haut : une
        // intolérance déclarée n'est pas un diagnostic de maladie cœliaque, et
        // en déduire l'autre serait exactement l'inférence que `DC-27` refuse.
        id: 'etat_alimentation',
        label: 'Votre alimentation exclut-elle certaines familles d’aliments ?',
        type: 'radio',
        options: [
          'Aucune exclusion particulière',
          'Végétarienne (sans viande ni poisson)',
          'Végétalienne / végane (aucun produit animal)',
          'Autre exclusion importante',
          'Je ne sais pas',
        ],
      },
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
