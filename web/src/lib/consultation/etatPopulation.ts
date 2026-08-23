import { OUI_NON_INCONNU } from './anamnese';

// L'ÉTAT DE POPULATION DU PATIENT — [[D-101]], LOT-05 « Doctrine exécutable ».
//
// CE QUE CE MODULE EST, ET CE QU'IL N'EST PAS. Il LIT une déclaration, il n'en
// dérive aucune. Rien ici ne regarde un score, un texte libre, un antécédent ni
// un facteur déclenchant : l'état de population se DÉCLARE, il ne s'infère pas
// (interdit explicite du lot, `DC-01`, `DC-27`).
//
// POURQUOI PAS `extraireDrapeauxAnamnese`. Ce module-là répond à « qu'est-ce que
// le patient a coché », toutes sections confondues, et sert le contexte
// praticien. Celui-ci répond à « quel est l'état COURANT qui qualifie une
// population » — une question plus étroite, sur un chemin de sécurité, dont la
// réponse doit distinguer trois états et non deux.
//
// TROIS ÉTATS, ET `inconnu` N'EST PAS `non` (`DC-24`). C'est l'invariant du
// module, et il est plus large que les libellés : TOUT ce qui n'est pas le
// « Non » exact de l'énuméré rend `inconnu`. Un champ absent, un « Je ne sais
// pas », une valeur qu'aucune option ne porte — `normaliserAnamnese` conserve
// n'importe quelle chaîne non vide sur un champ `radio`, sans la confronter aux
// options — se lisent tous comme « je n'ai pas la réponse ». Conclure `non` sur
// une chaîne inconnue serait lire une absence comme une normalité.

/** Réponse à un état de population : déclarée oui, déclarée non, ou pas su. */
export type ReponseEtat = 'oui' | 'non' | 'inconnu';

/** Exclusion alimentaire déclarée — `inconnu` tant qu'aucune option n'est lue. */
export type ExclusionAlimentaire =
  | 'aucune_exclusion'
  | 'vegetarienne'
  | 'vegetalienne'
  | 'autre_exclusion'
  | 'inconnu';

/**
 * Les états de population déclarés par le patient, à la date de l'anamnèse lue.
 *
 * Chaque clé correspond à UN champ de la section « État actuel », et à rien
 * d'autre. La correspondance est explicite plus bas : elle ne se devine pas
 * d'un nom de clé, et un champ renommé d'un côté sans l'autre doit rendre
 * `inconnu` plutôt que de disparaître.
 */
export type EtatPopulation = {
  grossesse: ReponseEtat;
  allaitement: ReponseEtat;
  pathologieRenale: ReponseEtat;
  pathologieHepatique: ReponseEtat;
  chirurgieDigestive: ReponseEtat;
  maladieCoeliaque: ReponseEtat;
  alimentation: ExclusionAlimentaire;
};

/** Les critères binaires, et le champ d'anamnèse qui porte chacun. */
const CHAMPS_BINAIRES = {
  grossesse: 'etat_grossesse',
  allaitement: 'etat_allaitement',
  pathologieRenale: 'etat_pathologie_renale',
  pathologieHepatique: 'etat_pathologie_hepatique',
  chirurgieDigestive: 'etat_chirurgie_digestive',
  maladieCoeliaque: 'etat_maladie_coeliaque',
} as const satisfies Record<string, string>;

const CHAMP_ALIMENTATION = 'etat_alimentation';

const [LIBELLE_OUI, LIBELLE_NON] = OUI_NON_INCONNU;

const EXCLUSIONS_ALIMENTAIRES: Record<string, ExclusionAlimentaire> = {
  'Aucune exclusion particulière': 'aucune_exclusion',
  'Végétarienne (sans viande ni poisson)': 'vegetarienne',
  'Végétalienne / végane (aucun produit animal)': 'vegetalienne',
  'Autre exclusion importante': 'autre_exclusion',
};

/**
 * L'état déclaré sur UN critère binaire.
 *
 * Deux libellés reconnus, et un seul défaut : `inconnu`. Le « Je ne sais pas »
 * de l'énuméré n'a pas besoin d'être cité — il tombe dans le défaut avec tout
 * le reste, et c'est voulu : une branche qui le nommerait laisserait croire que
 * les autres valeurs inconnues sont traitées autrement.
 */
function lireBinaire(valeur: unknown): ReponseEtat {
  if (valeur === LIBELLE_OUI) return 'oui';
  if (valeur === LIBELLE_NON) return 'non';
  return 'inconnu';
}

/**
 * L'état de population porté par une anamnèse, ou TOUT `inconnu`.
 *
 * Une anamnèse absente, illisible ou antérieure à la section « État actuel »
 * rend un état intégralement inconnu — jamais un état vide qu'un appelant
 * pourrait confondre avec « rien à signaler ». C'est la même discipline que
 * `signauxDeclares` : la structure est toujours complète, ce sont les valeurs
 * qui disent ce qu'on ignore.
 */
export function lireEtatPopulation(anamnese: unknown): EtatPopulation {
  const record = anamnese !== null && typeof anamnese === 'object' && !Array.isArray(anamnese)
    ? anamnese as Record<string, unknown>
    : {};
  const brutAlimentation = record[CHAMP_ALIMENTATION];
  return {
    grossesse: lireBinaire(record[CHAMPS_BINAIRES.grossesse]),
    allaitement: lireBinaire(record[CHAMPS_BINAIRES.allaitement]),
    pathologieRenale: lireBinaire(record[CHAMPS_BINAIRES.pathologieRenale]),
    pathologieHepatique: lireBinaire(record[CHAMPS_BINAIRES.pathologieHepatique]),
    chirurgieDigestive: lireBinaire(record[CHAMPS_BINAIRES.chirurgieDigestive]),
    maladieCoeliaque: lireBinaire(record[CHAMPS_BINAIRES.maladieCoeliaque]),
    alimentation: typeof brutAlimentation === 'string'
      ? EXCLUSIONS_ALIMENTAIRES[brutAlimentation] ?? 'inconnu'
      : 'inconnu',
  };
}

/**
 * Les identifiants de critère, dans un ordre stable — bancs et gate les partagent.
 *
 * ÉNUMÉRÉS PLUTÔT QUE DÉRIVÉS DE `CHAMPS_BINAIRES` : `Object.keys` rend
 * `string[]`, ce qui ferait perdre au type toute prise sur `EtatPopulation` et
 * laisserait un critère ajouté d'un côté manquer de l'autre en silence. Écrits
 * ici, ils sont vérifiés par `satisfies` à la compilation.
 */
export const CRITERES_POPULATION = [
  'grossesse',
  'allaitement',
  'pathologieRenale',
  'pathologieHepatique',
  'chirurgieDigestive',
  'maladieCoeliaque',
  'alimentation',
] as const satisfies readonly (keyof EtatPopulation)[];

/**
 * L'état est-il intégralement inconnu ?
 *
 * Sert le motif rendu au praticien : « exclusions non curées » et « état du
 * patient non renseigné » sont deux ignorances distinctes, et les confondre
 * ferait porter à la curation un manque qui vient du dossier.
 */
export function etatIntegralementInconnu(etat: EtatPopulation): boolean {
  return CRITERES_POPULATION.every(critere => etat[critere] === 'inconnu');
}
