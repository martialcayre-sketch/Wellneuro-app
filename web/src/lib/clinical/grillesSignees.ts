/**
 * LE PÉRIMÈTRE QUI MANQUAIT AUX DEUX SIGNATURES.
 *
 * CE QUE CE MODULE RÉPARE. Les zones des règles d'orientation et d'indication
 * citent des COULEURS (`{type: 'couleur', couleurs: ['info', …]}`) ou des
 * LIBELLÉS (`{type: 'interpretation', …}`) — jamais des nombres. Le point où une
 * règle s'allume n'est donc PAS écrit dans la règle : il est écrit dans la
 * grille d'interprétation de l'instrument qu'elle cite. Or
 * `ORIENTATION_RULES_SHA256` et `INDICATIONS_BIOLOGIE_SHA256` ne hachaient que
 * leur tableau de règles. Une borne déplacée dans une grille changeait le
 * comportement des deux tables sans faire bouger un seul sha, et les deux
 * signatures continuaient de se lire comme valides.
 *
 * CE N'EST PAS UNE HYPOTHÈSE, C'EST UN CONSTAT. Le 2026-09-13, la borne 4/5 du
 * PSQI a été portée à 5/6 sur arbitrage praticien ([[D-180]]). `R-SOM-01` a
 * cessé de s'allumer à 5 — c'était le but, et il était relu. Mais `BIO-SOM-01`,
 * règle `publiee` d'une table ELLE AUSSI signée, lit la même zone couleur sur le
 * même instrument : elle a cessé de prescrire `PANEL_SOMMEIL_1` à 5 **sans avoir
 * été éditée, sans re-signature, et sans que rien ne rougisse**. Les bancs du
 * jour sont tous passés au vert.
 *
 * LE PATRON N'EST PAS NEUF. `PRIORITY_RULES_SHA256` signe
 * `{ regles, abstention }` depuis [[D-062]], parce que la procédure d'abstention
 * décrivait un verdict que les règles seules ne portaient pas. Même geste ici,
 * même motif : un périmètre signé doit couvrir tout ce qui détermine le
 * comportement signé, pas seulement l'objet qui porte son nom.
 *
 * CE QUE LA SIGNATURE COÛTE DÉSORMAIS, ET C'EST VOULU. Renommer un libellé de
 * bande, déplacer une borne, changer une couleur : chacun de ces gestes referme
 * les deux verrous jusqu'à re-signature. C'est le prix d'un fail-closed qui
 * porte sur ce qui décide — et la contrepartie de ce que [[D-180]] a montré.
 */
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import {
  Q_ALI_01_COURT_14,
  Q_ALI_01_SIIN_57,
} from '@/lib/questionnaires/alimentaire';
import { BANDES_PSQI, type BandeInterpretation } from './bandesPsqi';

export type { BandeInterpretation };
export { BANDES_PSQI };

/**
 * Les grilles qui ne sont PAS dans le `scoring.interpretation` de leur
 * questionnaire, et qu'une dérivation générique ne trouverait donc jamais.
 *
 * Une seule entrée, et c'est celle qui a ouvert le trou. `grillesCitees`
 * consulte cette table AVANT le catalogue ; une grille oubliée ici serait
 * silencieusement absente du périmètre — exactement le défaut qu'on referme.
 * D'où `GRILLE_INTROUVABLE` plus bas : l'absence se hache au lieu de s'omettre,
 * et un banc refuse qu'un instrument cité n'ait de grille nulle part.
 */
const GRILLES_HORS_CATALOGUE: Record<string, BandeInterpretation[]> = {
  Q_SOM_01: BANDES_PSQI,
};

/**
 * Marqueur d'une grille INTROUVABLE, et il entre dans le hachage.
 *
 * Rendre `undefined` ferait disparaître la clé de `JSON.stringify` : le
 * périmètre se refermerait en silence sur une grille manquante, c'est-à-dire le
 * défaut même qu'on répare. Une absence se HACHE, pour qu'elle se voie — et
 * pour qu'ajouter plus tard la grille manquante FERME le verrou au lieu de le
 * laisser ouvert sur un périmètre qui a changé.
 */
export const GRILLE_INTROUVABLE = '__grille-introuvable__' as const;

type ZoneLue = { type?: string } | undefined;
type FeuilleLue = { idQuestionnaire?: unknown; zone?: ZoneLue };
type DeclencheurLu = FeuilleLue & { type?: string; declencheurs?: unknown };

/**
 * Les feuilles d'un déclencheur — lui-même, ou les branches de sa disjonction.
 *
 * Lecture STATIQUE et structurelle, volontairement indépendante des types des
 * deux tables : l'orientation a `feuillesDuDeclencheur`, la biologie n'a pas
 * d'équivalent, et le périmètre doit se dériver de la même façon des deux côtés.
 * `grillesSignees.guard.test.ts` vérifie que cette lecture rend exactement ce
 * que `feuillesDuDeclencheur` rend sur la table d'orientation — sans quoi les
 * deux lectures pourraient diverger en silence.
 */
function feuilles(declencheur: DeclencheurLu): FeuilleLue[] {
  if (declencheur?.type === 'ou' && Array.isArray(declencheur.declencheurs)) {
    return declencheur.declencheurs as FeuilleLue[];
  }
  return [declencheur];
}

/** Les instruments qu'une zone — couleur ou libellé — fait lire à une table. */
export function instrumentsCitesParUneZone(
  regles: ReadonlyArray<{ declencheurs: ReadonlyArray<unknown> }>,
): string[] {
  const vus = new Set<string>();
  for (const regle of regles) {
    for (const declencheur of regle.declencheurs) {
      for (const feuille of feuilles(declencheur as DeclencheurLu)) {
        const type = feuille?.zone?.type;
        if (type !== 'couleur' && type !== 'interpretation') continue;
        if (typeof feuille.idQuestionnaire === 'string') vus.add(feuille.idQuestionnaire);
      }
    }
  }
  // Tri indispensable : `JSON.stringify` respecte l'ordre d'INSERTION des clés,
  // si bien qu'un périmètre construit dans l'ordre des règles changerait de sha
  // au seul déplacement d'une règle dans le tableau — une signature cassée par
  // un geste qui ne touche à aucun contenu clinique. L'ordre alphabétique rend
  // l'empreinte stable sous réordonnancement.
  return [...vus].sort();
}

/**
 * Le périmètre GRILLES d'une table : ce que ses zones lisent réellement.
 *
 * Rendu comme un objet aux clés triées, pour que `JSON.stringify` en donne une
 * empreinte stable. Une grille introuvable est rendue comme telle, jamais omise.
 */
/**
 * TOUTES les grilles d'un instrument, dans les TROIS formes que le catalogue
 * emploie.
 *
 * Le premier jet de ce module ne lisait que `scoring.interpretation`, et le banc
 * de garde a rougi sur-le-champ : `Q_GAS_01` (TFD SIIN), cité par une zone
 * couleur dans LES DEUX tables, range ses bandes sous `globalInterpretation` et
 * sous `subScores[].ranges`. Une grille sur trois formes était donc lue, et le
 * périmètre aurait eu l'air complet — c'est exactement le défaut qu'on referme,
 * reproduit dans sa réparation.
 *
 * SUR-COUVRIR PLUTÔT QUE SOUS-COUVRIR. Toutes les grilles de l'instrument
 * entrent, y compris celles qu'aucune zone ne lit aujourd'hui. Le mauvais sens
 * de l'erreur est connu : sur-couvrir coûte une re-signature de trop,
 * sous-couvrir laisse une borne commander une table signée sans être signée.
 */
function grillesDeLInstrument(id: string): unknown {
  const horsCatalogue = GRILLES_HORS_CATALOGUE[id];
  if (horsCatalogue) return horsCatalogue;

  if (id === 'Q_ALI_01') {
    const formes: Record<string, unknown> = {};
    const court14 = grillesDeScoring((Q_ALI_01_COURT_14 as DefinitionLue).scoring);
    const siin57 = grillesDeScoring((Q_ALI_01_SIIN_57 as DefinitionLue).scoring);
    if (court14) formes.COURT_14 = court14;
    if (siin57) formes.SIIN_57 = siin57;
    return Object.keys(formes).length > 0 ? formes : undefined;
  }

  const def = (QUESTIONNAIRE_CATALOGUE as Record<string, DefinitionLue>)[id];
  return grillesDeScoring(def?.scoring);
}

function grillesDeScoring(scoring: DefinitionLue['scoring']): unknown {
  if (!scoring) return undefined;
  const bandes: Record<string, unknown> = {};
  if (grilleNonVide(scoring.interpretation)) bandes.interpretation = scoring.interpretation;
  if (grilleNonVide(scoring.globalInterpretation)) {
    bandes.globalInterpretation = scoring.globalInterpretation;
  }
  if (Array.isArray(scoring.subScores)) {
    // Clés triées, même motif que plus haut : l'ordre des sous-scores dans le
    // catalogue ne doit pas peser sur l'empreinte.
    const parSousScore: Record<string, unknown> = {};
    for (const sousScore of [...scoring.subScores].sort(parId)) {
      if (typeof sousScore?.id === 'string' && grilleNonVide(sousScore.ranges)) {
        parSousScore[sousScore.id] = sousScore.ranges;
      }
    }
    if (Object.keys(parSousScore).length > 0) bandes.sousScores = parSousScore;
  }
  return Object.keys(bandes).length > 0 ? bandes : undefined;
}

type DefinitionLue = {
  scoring?: {
    interpretation?: unknown;
    globalInterpretation?: unknown;
    subScores?: Array<{ id?: unknown; ranges?: unknown }>;
  };
};

function grilleNonVide(grille: unknown): boolean {
  return Array.isArray(grille) && grille.length > 0;
}

function parId(a: { id?: unknown }, b: { id?: unknown }): number {
  return String(a?.id ?? '').localeCompare(String(b?.id ?? ''));
}

export function grillesCitees(
  regles: ReadonlyArray<{ declencheurs: ReadonlyArray<unknown> }>,
): Record<string, unknown> {
  const perimetre: Record<string, unknown> = {};
  for (const id of instrumentsCitesParUneZone(regles)) {
    perimetre[id] = grillesDeLInstrument(id) ?? GRILLE_INTROUVABLE;
  }
  return perimetre;
}
