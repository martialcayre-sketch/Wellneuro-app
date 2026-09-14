/**
 * LE PÉRIMÈTRE QUI MANQUAIT AUX DEUX SIGNATURES.
 *
 * CE QUE CE MODULE RÉPARE. Les zones des règles d'orientation et d'indication
 * citent des COULEURS (`{type: 'couleur', couleurs: ['info', …]}`) ou des
 * LIBELLÉS (`{type: 'interpretation', …}`) — jamais des nombres. Le point où une
 * règle s'allume n'est donc PAS écrit dans la règle : il est écrit dans
 * l'instrument qu'elle cite. Or `ORIENTATION_RULES_SHA256` et
 * `INDICATIONS_BIOLOGIE_SHA256` ne hachaient que leur tableau de règles. Une
 * borne déplacée changeait le comportement des deux tables sans faire bouger un
 * seul sha, et les deux signatures continuaient de se lire comme valides.
 *
 * CE N'EST PAS UNE HYPOTHÈSE, C'EST UN CONSTAT. Le 2026-09-13, la borne 4/5 du
 * PSQI a été portée à 5/6 sur arbitrage praticien ([[D-180]]). `R-SOM-01` a
 * cessé de s'allumer à 5 — c'était le but, et il était relu. Mais `BIO-SOM-01`,
 * règle `publiee` d'une table ELLE AUSSI signée, lit la même zone couleur sur le
 * même instrument : elle a cessé de prescrire `PANEL_SOMMEIL_1` à 5 **sans avoir
 * été éditée, sans re-signature, et sans que rien ne rougisse**.
 *
 * ────────────────────────────────────────────────────────────────────────────
 * LA FRONTIÈRE A ÉTÉ DÉPLACÉE DEUX FOIS, ET LA PREMIÈRE ÉTAIT TROP COURTE.
 *
 * La version du 2026-09-13 ne hachait que les GRILLES — `interpretation`,
 * `globalInterpretation`, `subScores[].ranges`, plus les deux drapeaux du
 * plancher. C'est-à-dire la DERNIÈRE étape du calcul, `score → couleur`, en
 * laissant dehors celle d'avant, `réponses → score`.
 *
 * Le contre-audit du 2026-09-14 l'a démontré sur `Q_GAS_01`, avec la table
 * biologique réelle et sa signature inchangée : retirer `C1_8` de
 * `subScores[0].items` fait passer le total de 24 à 21, la couleur globale de
 * `warning` à `success`, et `BIO-DIG-01` cesse de proposer `PANEL_DIGESTIF_1` —
 * sha identique, signature valide, aucun banc rouge. Le défaut de [[D-180]],
 * reproduit à l'identique dans sa propre réparation.
 *
 * Et `items` n'était qu'une porte sur douze. L'énumération des dix-sept
 * instruments cités par les deux tables a rendu : `type` (17), `maxTotal` (13),
 * `note` (6), `dimensions` (2), `subscalesA`/`subscalesD`, `phases`, `minTotal`,
 * `subScores[].items`/`max` — et `threshold: 3` sur `Q_INF_05`, un champ qui
 * s'appelle *seuil*, hors d'un périmètre de signature bâti pour couvrir les
 * seuils cliniques. En dessous encore, les VALEURS D'OPTIONS : `O_PSS_INVERSE`
 * exprime l'inversion d'items du PSS dans les nombres eux-mêmes, et un
 * `conditionnel` décide si un item est posé, donc si une bande est servie.
 *
 * D'OÙ LA RÈGLE D'AUJOURD'HUI, ET ELLE N'EST PAS UNE LISTE. On hache le bloc
 * `scoring` ENTIER de chaque instrument cité, plus les valeurs d'options de ses
 * items. Choisir les champs à couvrir serait un piège de la même famille que
 * celui qu'on referme : une sélection se périme en silence le jour où le
 * catalogue gagne un champ, et personne ne le voit. Hacher le bloc entier est
 * AUTO-MAINTENU — ce qui s'ajoute demain entre tout seul (arbitrage praticien
 * du 2026-09-14).
 *
 * CE QUI RESTE DEHORS, ET C'EST DÉLIBÉRÉ : le TEXTE des questions et les
 * LIBELLÉS d'options. Ni l'un ni l'autre n'entre dans un calcul ; les inclure
 * ferait refermer les deux verrous sur une correction de coquille.
 *
 * LE PATRON N'EST PAS NEUF. `PRIORITY_RULES_SHA256` signe `{ regles, abstention }`
 * depuis [[D-062]], parce que la procédure d'abstention décrivait un verdict que
 * les règles seules ne portaient pas. Même geste ici, même motif : un périmètre
 * signé doit couvrir tout ce qui détermine le comportement signé, pas seulement
 * l'objet qui porte son nom.
 *
 * CE QUE LA SIGNATURE COÛTE DÉSORMAIS, ET C'EST VOULU. Déplacer une borne,
 * renommer une bande, recoter un item, retirer un item d'un axe, changer un
 * `threshold` : chacun de ces gestes referme les deux verrous jusqu'à
 * re-signature. Le mauvais sens de l'erreur est connu — sur-couvrir coûte une
 * re-signature de trop, sous-couvrir laisse un seuil commander une table signée
 * sans être signé.
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
 * Les grilles qui ne sont PAS dans le `scoring` de leur questionnaire, et qu'une
 * dérivation générique ne trouverait donc jamais.
 *
 * Une seule entrée, et c'est celle qui a ouvert le trou : `Q_SOM_01.scoring`
 * vaut `{type:'psqi', severiteCroissante:true, certification:{…}}` — ses bandes
 * vivaient dans une `const` locale à `computeScoreFromDefBrut`, hors de portée
 * de tout périmètre. Une grille oubliée ici serait silencieusement absente ;
 * d'où `GRILLE_INTROUVABLE` plus bas, et le banc qui refuse qu'un instrument
 * cité n'ait de scoring nulle part.
 */
const GRILLES_HORS_CATALOGUE: Record<string, BandeInterpretation[]> = {
  Q_SOM_01: BANDES_PSQI,
};

/**
 * Marqueur d'un instrument INTROUVABLE, et il entre dans le hachage.
 *
 * Rendre `undefined` ferait disparaître la clé de `JSON.stringify` : le
 * périmètre se refermerait en silence sur un instrument manquant, c'est-à-dire
 * le défaut même qu'on répare. Une absence se HACHE, pour qu'elle se voie — et
 * pour qu'ajouter plus tard l'instrument manquant FERME le verrou au lieu de le
 * laisser ouvert sur un périmètre qui a changé.
 */
export const GRILLE_INTROUVABLE = '__grille-introuvable__' as const;

type ZoneLue = { type?: string } | undefined;
type FeuilleLue = { idQuestionnaire?: unknown; zone?: ZoneLue };
type DeclencheurLu = FeuilleLue & { type?: string; declencheurs?: unknown };

type QuestionLue = {
  id?: unknown;
  type?: unknown;
  options?: Array<{ v?: unknown }>;
  min?: unknown;
  max?: unknown;
  step?: unknown;
  conditionnel?: unknown;
};
type DefinitionLue = {
  scoring?: Record<string, unknown>;
  sections?: Array<{ questions?: QuestionLue[] }>;
  questions?: QuestionLue[];
};

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
 * Forme CANONIQUE : clés d'objets triées, ordre des tableaux préservé.
 *
 * `JSON.stringify` respecte l'ordre d'insertion, si bien que déplacer
 * `severiteCroissante` au-dessus de `type` dans un littéral du catalogue —
 * geste qui ne touche à aucune valeur — changerait les deux sha. Trier les clés
 * fait porter l'empreinte sur ce qui est écrit, pas sur l'ordre dans lequel
 * c'est écrit. La version précédente atteignait le même but en recopiant
 * champ par champ ; c'est cette recopie qui laissait des champs dehors.
 *
 * LES TABLEAUX NE SONT PAS TRIÉS, et ce serait un contresens : `interpretRanges`
 * prend la PREMIÈRE bande qui contient le score — l'ordre des bandes est du
 * contenu clinique. Conséquence assumée : réordonner `subScores` dans le
 * catalogue referme les deux verrous, alors qu'aucune valeur n'a bougé.
 * Sur-couverture, dans le sens sûr.
 */
function canonique(valeur: unknown): unknown {
  if (Array.isArray(valeur)) return valeur.map(canonique);
  if (valeur && typeof valeur === 'object') {
    const trie: Record<string, unknown> = {};
    for (const cle of Object.keys(valeur as Record<string, unknown>).sort()) {
      trie[cle] = canonique((valeur as Record<string, unknown>)[cle]);
    }
    return trie;
  }
  return valeur;
}

/**
 * CE QUI, DANS UN ITEM, PÈSE SUR LE SCORE — et rien d'autre.
 *
 * Les VALEURS d'options, pas leurs libellés : `O_PSS_INVERSE` n'est pas une
 * option inversée par un drapeau, c'est `[{v:5,l:'Jamais'} … {v:1,l:'Souvent'}]`
 * — la clé de correction du PSS vit dans ces nombres. Les bornes des items
 * numériques, pour la même raison. Et `conditionnel`, parce qu'un item non posé
 * n'est pas un item sans réponse : il décide de `missing`, donc de ce que
 * `bandePlancher` sert, donc d'une couleur qu'une règle signée lit.
 *
 * Le TEXTE reste dehors : corriger une coquille ne doit pas éteindre deux
 * tables.
 */
function optionsDesItems(def: DefinitionLue | undefined): Record<string, unknown> | undefined {
  const items: QuestionLue[] = [];
  for (const section of def?.sections ?? []) items.push(...(section?.questions ?? []));
  items.push(...(def?.questions ?? []));

  const parItem: Record<string, unknown> = {};
  for (const item of items) {
    if (typeof item?.id !== 'string') continue;
    const cote: Record<string, unknown> = { type: item.type ?? null };
    if (Array.isArray(item.options)) cote.valeurs = item.options.map((o) => o?.v ?? null);
    if (item.min !== undefined) cote.min = item.min;
    if (item.max !== undefined) cote.max = item.max;
    if (item.step !== undefined) cote.step = item.step;
    if (item.conditionnel !== undefined) cote.conditionnel = item.conditionnel;
    parItem[item.id] = cote;
  }
  return Object.keys(parItem).length > 0 ? parItem : undefined;
}

/**
 * TOUT ce qui, chez un instrument, mène d'une réponse à une couleur.
 *
 * Le bloc `scoring` entier — pas une sélection de ses champs, voir l'en-tête du
 * module — plus la cotation de ses items, plus la grille hors catalogue quand il
 * en a une.
 */
function perimetreDeDefinition(id: string, def: DefinitionLue | undefined): unknown {
  const horsCatalogue = GRILLES_HORS_CATALOGUE[id];
  if (!def?.scoring && !horsCatalogue) return undefined;

  const bloc: Record<string, unknown> = {};
  if (def?.scoring) bloc.scoring = def.scoring;
  // La grille du PSQI, qui ne vit pas dans son `scoring`. Clé DISTINCTE, pour
  // qu'une grille un jour rapatriée dans le catalogue se voie comme un
  // déplacement — et referme le verrou — au lieu de se fondre en silence.
  if (horsCatalogue) bloc.grilleHorsCatalogue = horsCatalogue;
  const options = optionsDesItems(def);
  if (options) bloc.options = options;
  return bloc;
}

function perimetreDeLInstrument(id: string): unknown {
  // `Q_ALI_01` est servi en 14 ou en 57 items selon `WN_ALI_01_SIIN57`, seul
  // drapeau de FORME du dépôt. Les DEUX formes canoniques entrent, indépendamment
  // de la position du drapeau : sans quoi les deux sha dépendraient d'une
  // variable d'environnement, et la table serait signée dans une position et
  // éteinte dans l'autre.
  if (id === 'Q_ALI_01') {
    const formes: Record<string, unknown> = {};
    const court14 = perimetreDeDefinition(id, Q_ALI_01_COURT_14 as DefinitionLue);
    const siin57 = perimetreDeDefinition(id, Q_ALI_01_SIIN_57 as DefinitionLue);
    if (court14) formes.COURT_14 = court14;
    if (siin57) formes.SIIN_57 = siin57;
    return Object.keys(formes).length > 0 ? formes : undefined;
  }
  return perimetreDeDefinition(id, (QUESTIONNAIRE_CATALOGUE as Record<string, DefinitionLue>)[id]);
}

/**
 * Le périmètre de CALCUL d'une table : tout ce que ses zones font dépendre
 * d'un instrument.
 *
 * Rendu sous forme canonique, pour que `JSON.stringify` en donne une empreinte
 * stable. Un instrument introuvable est rendu comme tel, jamais omis.
 */
export function grillesCitees(
  regles: ReadonlyArray<{ declencheurs: ReadonlyArray<unknown> }>,
): Record<string, unknown> {
  const perimetre: Record<string, unknown> = {};
  for (const id of instrumentsCitesParUneZone(regles)) {
    perimetre[id] = perimetreDeLInstrument(id) ?? GRILLE_INTROUVABLE;
  }
  return canonique(perimetre) as Record<string, unknown>;
}
