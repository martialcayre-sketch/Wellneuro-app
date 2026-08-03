import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';

// Garde de restitution (LOT-06) — fonction PURE, sans I/O.
//
// La synthèse IA reçoit la recommandation d'orientation déterministe et doit la
// RESTITUER, jamais la produire. Ce module vérifie l'énoncé inverse : le texte
// rendu cite-t-il un pack qui ne lui a pas été donné ?
//
// Pourquoi c'est vérifiable ici, alors que « le modèle a-t-il inventé quelque
// chose » ne l'est pas en général : les packs forment un **vocabulaire fermé**
// de seize entrées déclarées dans `PACKS_REGISTRY`. On ne cherche pas une
// invention quelconque, on cherche l'apparition d'un nom d'une liste connue en
// dehors de ceux fournis. C'est une question décidable.
//
// CE QUE CE GARDE NE FAIT PAS, et pourquoi : il ne neutralise pas la synthèse.
// L'objet actionnable — la carte d'orientation et son bouton d'assignation —
// vient de la route déterministe, jamais du modèle. Un pack cité à tort dans la
// prose ne peut donc rien déclencher. Priver le praticien de sa synthèse sur une
// correspondance textuelle coûterait plus que l'écart lui-même. L'appelant
// journalise ; il ne censure pas.

/** Les champs de `SyntheseSchema` qui portent du texte libre. */
export type TexteSynthese = {
  resume_praticien?: string;
  axes_prioritaires?: { axe?: string; arguments?: string[]; points_a_confirmer?: string[] }[];
  points_de_vigilance?: string[];
  questions_entretien?: string[];
  narratif_patient?: string;
  limites?: string;
};

/**
 * Normalise pour une comparaison robuste : minuscules, accents retirés, et
 * toute suite de non-alphanumériques ramenée à un espace unique.
 *
 * Les accents comptent : le registre écrit « Cognition, vieillissement et
 * aidants » quand un modèle écrira volontiers « cognition, vieillissement et
 * aidants ». Comparer sans normaliser reviendrait à ne rien vérifier.
 */
// Plage des diacritiques combinants (U+0300–U+036F), construite depuis une
// chaîne : écrits littéralement dans un littéral d'expression régulière, ces
// caractères sont invisibles à la relecture d'un diff.
const DIACRITIQUES_COMBINANTS = new RegExp('[\\u0300-\\u036f]', 'g');

function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(DIACRITIQUES_COMBINANTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function texteIntegral(synthese: TexteSynthese): string {
  const morceaux: string[] = [
    synthese.resume_praticien ?? '',
    synthese.narratif_patient ?? '',
    synthese.limites ?? '',
    ...(synthese.points_de_vigilance ?? []),
    ...(synthese.questions_entretien ?? []),
  ];
  for (const axe of synthese.axes_prioritaires ?? []) {
    morceaux.push(axe.axe ?? '');
    morceaux.push(...(axe.arguments ?? []));
    morceaux.push(...(axe.points_a_confirmer ?? []));
  }
  return normaliser(morceaux.join(' \n '));
}

/**
 * Rend les packs cités par la synthèse mais absents de la recommandation qui lui
 * a été transmise. Tableau vide = restitution fidèle.
 *
 * Un pack est « cité » si son titre de doctrine ou son slug apparaît dans le
 * texte. Deux formes, parce que le modèle reçoit le titre mais qu'un slug peut
 * fuir d'un exemple ou d'un identifiant recopié.
 */
export function verifierRestitutionOrientation(
  synthese: TexteSynthese,
  packsFournis: readonly PackId[],
): string[] {
  const texte = texteIntegral(synthese);
  if (!texte) return [];

  const autorises = new Set<PackId>(packsFournis);
  const ecarts: string[] = [];

  for (const pack of PACKS_REGISTRY) {
    if (autorises.has(pack.id)) continue;
    const titre = normaliser(pack.titre);
    const slug = normaliser(pack.id);
    // Un titre vide après normalisation ne peut rien prouver : on ne le teste
    // pas, plutôt que de le déclarer présent partout.
    if (!titre) continue;
    if (texte.includes(titre) || texte.includes(slug)) {
      ecarts.push(pack.id);
    }
  }

  return ecarts;
}
