// Libellés français de la surface patient de l'agenda alimentaire (`Q_ALI_09`).
// Client-safe : aucune dépendance hors `lib/agenda-alimentaire/types`, aucun
// accès réseau, aucun agrégat.
//
// TON : on décrit une journée, on ne la juge pas. Aucun mot de quantité —
// gramme, portion, calorie, poids —, la frontière « journal alimentaire, pas
// carnet de pesée » étant assérée jusque dans un contrat SQL. Les libellés
// nomment une PRÉSENCE (« il y en avait / il n'y en avait pas »), jamais un
// « combien ».

import type { NaturePrise } from '@/lib/agenda-alimentaire/types';

export const LABEL_NATURE: Record<NaturePrise, string> = {
  repas: 'Repas',
  hors_repas: 'Hors repas',
};

// Deux formes DISTINCTES autant que deux couleurs : le disque plein et l'anneau
// pointillé se distinguent en niveaux de gris comme en daltonisme.
export const EMOJI_NATURE: Record<NaturePrise, string> = {
  repas: '🍽️',
  hors_repas: '🍎',
};

export const ARIA_NATURE: Record<NaturePrise, string> = {
  repas: 'repas',
  hors_repas: 'hors repas, grignotage ou boisson sucrée',
};

/** Les quatre présences À TROIS ÉTATS. `soirPlusCopieux` n'est PAS dans cette liste. */
export const CLES_PRESENCES = [
  'premierePriseProteines',
  'legumesDeuxPrises',
  'fruitsOuOleagineux',
  'ultraTransformes',
] as const;

export type ClePresence = (typeof CLES_PRESENCES)[number];

export const LABEL_PRESENCES: Record<ClePresence, string> = {
  premierePriseProteines: 'Des protéines à votre première prise ?',
  legumesDeuxPrises: 'Des légumes à au moins deux prises ?',
  fruitsOuOleagineux: 'Des fruits ou des fruits à coque ?',
  ultraTransformes: 'Des produits ultra-transformés ?',
};

// L'aide donne des EXEMPLES, jamais un seuil ni une quantité : elle lève une
// ambiguïté de vocabulaire, elle ne demande pas d'évaluer une portion.
export const AIDE_PRESENCES: Record<ClePresence, string> = {
  premierePriseProteines: 'Œuf, yaourt, fromage, jambon, poisson, tofu, fruits à coque…',
  legumesDeuxPrises: 'Crus ou cuits, en salade, en soupe, en accompagnement…',
  fruitsOuOleagineux: 'Fruit frais ou sec, amandes, noix, noisettes…',
  ultraTransformes: 'Plats tout prêts, biscuits industriels, sodas, charcuterie industrielle…',
};

export const LABEL_SOIR_PLUS_COPIEUX = 'Le repas du soir était le plus important de la journée ?';
export const AIDE_SOIR_PLUS_COPIEUX = 'Facultatif — répondez seulement si c’est net pour vous.';

export const LABEL_OUI = 'Oui';
export const LABEL_NON = 'Non';
/**
 * L'abstention EXPLICITE, proposée sur les quatre présences seulement. Elle vaut
 * `null` — une réponse —, jamais une clé absente. Sur `soirPlusCopieux`, la
 * proposer produirait un 400 systématique : ce champ n'admet pas l'abstention.
 */
export const LABEL_JE_NE_SAIS_PAS = 'Je ne sais pas';

export const LABEL_AUCUNE_PRISE = 'Je n’ai rien mangé ni bu de sucré ce jour-là';
export const AIDE_AUCUNE_PRISE =
  'C’est une réponse à part entière : elle compte dans votre recueil.';

export const LABEL_LIGNE_PRISES = 'Vos prises de la journée';
export const AIDE_LIGNE_PRISES =
  'Touchez la ligne pour poser une prise, touchez une prise pour la passer de repas à hors repas, appui long pour la retirer.';

export const LABEL_AJOUTER_PRISE = 'Ajouter une prise';
/** Suivi de l'heure de la prise à l'écran : le nom accessible reste le texte visible. */
export const LABEL_RETIRER_PRISE = 'Retirer la prise de';

export const MESSAGE_MAX_PRISES =
  'Vous avez noté le maximum de prises pour une journée. Retirez-en une avant d’en ajouter une autre.';
export const MESSAGE_LIGNE_PLEINE =
  'Il n’y a plus d’emplacement libre à cette heure-là. Déplacez une prise existante.';
export const MESSAGE_MANQUE_PRISES =
  'Posez au moins une prise sur la ligne, ou cochez « je n’ai rien mangé ni bu de sucré ce jour-là ».';
export const MESSAGE_MANQUE_PRESENCES =
  'Il reste une question sans réponse. Répondez oui, non, ou « je ne sais pas ».';

/**
 * « 12:30 » → « 12 heures 30 ». Utilisé dans les `aria-label` : un lecteur
 * d'écran épelle « 12:30 » de façon variable selon la synthèse vocale.
 */
export function heureParlee(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  const heures = Number(h);
  const minutes = Number(m);
  const partieHeure = `${heures} heure${heures > 1 ? 's' : ''}`;
  return minutes === 0 ? partieHeure : `${partieHeure} ${minutes}`;
}
