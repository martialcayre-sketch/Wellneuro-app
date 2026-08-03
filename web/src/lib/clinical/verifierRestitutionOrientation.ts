import { PACKS_REGISTRY, type PackId } from '@/lib/questionnaires-functional';

// Garde de restitution (LOT-06) — fonction PURE, sans I/O.
//
// La synthèse IA reçoit la recommandation d'orientation déterministe et doit la
// RESTITUER, jamais la produire. Ce module vérifie l'énoncé inverse : le texte
// rendu cite-t-il une cible qui ne lui a pas été donnée ?
//
// Pourquoi c'est vérifiable ici, alors que « le modèle a-t-il inventé quelque
// chose » ne l'est pas en général : packs et questionnaires forment des
// **vocabulaires fermés** — seize entrées déclarées dans `PACKS_REGISTRY`, et
// des identifiants de questionnaire de forme fixe. On ne cherche pas une
// invention quelconque, on cherche l'apparition d'un nom d'une liste connue en
// dehors de ceux fournis. C'est une question décidable.
//
// CE QUE CE GARDE NE FAIT PAS, et pourquoi : il ne neutralise pas la synthèse.
// L'objet actionnable — la carte d'orientation et son bouton d'assignation —
// vient de la route déterministe, jamais du modèle. Un pack cité à tort dans la
// prose ne peut donc rien déclencher. Priver le praticien de sa synthèse sur une
// correspondance textuelle coûterait plus que l'écart lui-même. L'appelant
// journalise ; il ne censure pas.
//
// CE QU'IL NE VOIT PAS, et qu'il ne faut pas croire couvert :
// - un pack désigné par son titre SANS le mot « pack » (« je propose Sommeil et
//   chronobiologie ») — voir la note sur l'adjacence plus bas ;
// - une exploration décrite en langage libre, sans nommer de cible ;
// - un RÉORDONNANCEMENT de la recommandation, qui est pourtant interdit par la
//   consigne. Cela demanderait de comparer des positions dans une prose, pas
//   des occurrences.

/** Les champs de `SyntheseSchema` qui portent du texte libre. */
export type TexteSynthese = {
  resume_praticien?: string;
  axes_prioritaires?: { axe?: string; arguments?: string[]; points_a_confirmer?: string[] }[];
  points_de_vigilance?: string[];
  questions_entretien?: string[];
  narratif_patient?: string;
  limites?: string;
};

export type EcartRestitution =
  | { type: 'pack'; identifiant: PackId }
  | { type: 'questionnaire'; identifiant: string };

// Plage des diacritiques combinants (U+0300–U+036F), construite depuis une
// chaîne : écrits littéralement dans un littéral d'expression régulière, ces
// caractères sont invisibles à la relecture d'un diff.
const DIACRITIQUES_COMBINANTS = new RegExp('[\\u0300-\\u036f]', 'g');

/** Identifiants de questionnaire du catalogue : `Q_SOM_09`, `Q_ALI_01`… */
const MOTIF_QUESTIONNAIRE = /\bQ_[A-Z]{3}_\d{2}\b/g;

/**
 * Normalise pour une comparaison robuste : minuscules, accents retirés, et
 * toute suite de non-alphanumériques ramenée à un espace unique.
 *
 * Les accents comptent : le registre écrit « Cognition, vieillissement et
 * aidants » quand un modèle écrira volontiers « cognition, vieillissement et
 * aidants ». Comparer sans normaliser reviendrait à ne rien vérifier.
 */
function normaliser(texte: string): string {
  return texte
    .normalize('NFD')
    .replace(DIACRITIQUES_COMBINANTS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function morceaux(synthese: TexteSynthese): string[] {
  const out: string[] = [
    synthese.resume_praticien ?? '',
    synthese.narratif_patient ?? '',
    synthese.limites ?? '',
    ...(synthese.points_de_vigilance ?? []),
    ...(synthese.questions_entretien ?? []),
  ];
  for (const axe of synthese.axes_prioritaires ?? []) {
    out.push(axe.axe ?? '');
    out.push(...(axe.arguments ?? []));
    out.push(...(axe.points_a_confirmer ?? []));
  }
  return out;
}

/**
 * Rend les cibles citées par la synthèse mais absentes de la recommandation qui
 * lui a été transmise. Tableau vide = restitution fidèle.
 *
 * **Adjacence exigée sur les titres de pack.** Un titre seul ne suffit pas : il
 * faut « pack » juste avant. Quatre des seize titres sont des syntagmes
 * cliniques français ordinaires — « digestif et intestin-cerveau », « stress
 * chronique et burnout », « sommeil et chronobiologie », « migraine et
 * cephalees » — qu'un praticien écrit dans une synthèse sans jamais désigner un
 * pack. Sans cette contrainte, le garde accusait la prose clinique normale, et
 * ce faux signal aurait noyé le vrai dès le premier jour. Le slug, lui, n'a
 * aucun homonyme naturel : il est cherché partout.
 */
export function verifierRestitutionOrientation(
  synthese: TexteSynthese,
  fournis: {
    packs: readonly PackId[];
    questionnaires: readonly string[];
  },
): EcartRestitution[] {
  const parties = morceaux(synthese);
  const texte = normaliser(parties.join(' \n '));
  const ecarts: EcartRestitution[] = [];

  if (texte) {
    const packsAutorises = new Set<PackId>(fournis.packs);
    for (const pack of PACKS_REGISTRY) {
      if (packsAutorises.has(pack.id)) continue;
      const titre = normaliser(pack.titre);
      const slug = normaliser(pack.id);
      if (!titre) continue;
      if (texte.includes(`pack ${titre}`) || texte.includes(slug)) {
        ecarts.push({ type: 'pack', identifiant: pack.id });
      }
    }
  }

  // Les identifiants de questionnaire sont cherchés sur le texte NON normalisé :
  // leur forme est déjà canonique, et la normalisation détruirait les
  // séparateurs qui la définissent.
  const questionnairesAutorises = new Set(fournis.questionnaires);
  const vus = new Set<string>();
  for (const partie of parties) {
    for (const trouve of partie.match(MOTIF_QUESTIONNAIRE) ?? []) {
      if (questionnairesAutorises.has(trouve) || vus.has(trouve)) continue;
      vus.add(trouve);
      ecarts.push({ type: 'questionnaire', identifiant: trouve });
    }
  }

  return ecarts;
}

/** Rendu court pour un journal : `pack:slug`, `questionnaire:Q_SOM_09`. */
export function formaterEcarts(ecarts: readonly EcartRestitution[]): string {
  return ecarts.map(ecart => `${ecart.type}:${ecart.identifiant}`).join(', ');
}
