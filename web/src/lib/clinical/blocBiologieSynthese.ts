// LE BLOC DÉTERMINISTE DE BIOLOGIE DE LA SYNTHÈSE — [[D-513]] §2 (H95 part B).
//
// Module PUR : aucune base, aucune horloge. `blocBiologieSyntheseService.ts`
// lit le dossier et lui passe les lignes ; ce fichier dit, ligne par ligne, ce
// qui part au modèle et ce que le contrôle de contamination recherchera
// ensuite (`TraceBlocBiologie`, `lib/synthese/contaminationBiologie.ts`).
//
// LE CHEMIN DU COCKPIT (§2). Les mêmes têtes non annulées et la même série par
// analyte que `api/praticien/biologie/resultats` : `serieParAnalyte`, par
// l'entrée publiée de BioFlow ([[D-306]]). Toute la série part, sans fenêtre,
// dans l'ordre chronologique ; les analytes dans l'ordre de leurs codes, comme
// la fiche. Les motifs de non-comparabilité sont ceux de la série, sous les
// libellés du cockpit ; leur absence ne déclare jamais la série comparable.
//
// CE QUI N'ENTRE PAS (§2, « Sont exclus du bloc ») — aucun de ces faits n'est
// même lu par le lecteur : le marquage du laboratoire, son commentaire, toute
// plage fonctionnelle et tout intervalle de `biology_reference_ranges`, les
// statuts posés ([[D-322]]) et les constats du praticien ([[D-331]]), les
// lignes remplacées et les résultats annulés, la date de correction, le « jour
// N » du suivi, l'identifiant des résultats et le code de l'analyte.
//
// AUCUNE INTERPRÉTATION. Aucun nombre n'est calculé ici : les valeurs sont le
// texte décimal de la base, les dates celles du prélèvement, et le seul nombre
// ajouté est celui des prélèvements de chaque série (§11).
//
// LES TEXTES VENUS DU COMPTE RENDU (§2). Le nom du laboratoire et le texte de
// l'intervalle viennent d'un document externe. Chacun est sérialisé en une
// chaîne JSON complète, chevrons remplacés par `\u003c` et `\u003e`, entre
// les deux balises `<textes_laboratoire_cites>` ajoutées ici. Ils ne sont
// jamais interpolés comme titre, délimiteur ou instruction.

import {
  CHAMPS_CONTEXTE,
  LIBELLES_CHAMP,
  lireValeurQuantitative,
  serieParAnalyte,
  unitesConcordent,
  valeurAffichee,
  type ContextePrelevementSaisi,
  type MotifNonComparabilite,
} from '@/lib/biology-library/publie';
import { dateJourParis } from '@/lib/dateParis';
import type { TraceBlocBiologie } from '@/lib/synthese/contaminationBiologie';

/** Une ligne de `resultats_biologiques`, telle que le lecteur la passe. */
export type LigneBiologieSynthese = {
  id: string;
  supersedesResultatId: string | null;
  /** `saisiLe`, ISO. */
  saisiLe: string;
  analyteCode: string;
  /** Le libellé de l'analyte au catalogue — jamais le libellé lu sur le compte rendu. */
  analyteLibelle: string;
  /** `preleveLe`, ISO. */
  preleveLe: string;
  /** Le décimal en texte exact (`Decimal.toFixed()`). */
  valeur: string;
  unite: string | null;
  /** `saisie_praticien` | `import_labo` (CHECK). */
  source: string;
  /** Le laboratoire lu à l'import de CETTE ligne ; `null` sinon — comme la fiche. */
  laboratoire: string | null;
  /** La tête du contexte de CETTE ligne ; seule une racine en porte une. */
  contexte: ContextePrelevementSaisi | null;
  /** L'heure du prélèvement a-t-elle été lue à l'import de CETTE ligne ? */
  heureLue: boolean;
  /** La ligne lue qui a créé ce résultat ; `null` : saisie praticien ou correction. */
  lue: {
    /** `imports_biologiques.version_prompt` : la version du procédé d'extraction. */
    versionProcede: string;
    intervalleLu: string | null;
    intervalleNonTranscrit: boolean;
    uniteLue: string | null;
    valeurLue: string;
  } | null;
};

export const TITRE_BLOC_BIOLOGIE = '## Résultats de biologie';

export const AVERTISSEMENT_BLOC_BIOLOGIE =
  'Lecture déterministe du dossier. Aucune interprétation ajoutée par Wellneuro : ni marquage du laboratoire, '
  + 'ni plage fonctionnelle, ni seuil, ni constat du praticien.';

/**
 * Les libellés des motifs, ceux du cockpit (`EstimeMesurePanel.tsx`) au
 * caractère près — le banc les compare au composant.
 */
export const LIBELLES_MOTIFS_BLOC: Record<MotifNonComparabilite, string> = {
  point_unique: 'point unique',
  unites_differentes: 'unités différentes',
  laboratoire_non_identifie: 'laboratoire non identifié',
  laboratoires_differents: 'laboratoires différents',
  contexte_non_renseigne: 'contexte de prélèvement non renseigné',
  contextes_differents: 'contextes de prélèvement différents',
};

/** Sans motif : la phrase du cockpit, qui ne déclare pas la série comparable. */
export const SANS_MOTIF_BLOC =
  'Aucun motif connu de non-comparabilité ; la série n’est pas déclarée comparable.';

export const BALISE_OUVRANTE = '<textes_laboratoire_cites>';
export const BALISE_FERMANTE = '</textes_laboratoire_cites>';

/**
 * Un texte du compte rendu, encodé (§2) : une chaîne JSON complète, guillemets
 * compris, chaque `<` devenu `\u003c` et chaque `>` devenu `\u003e`, dans une
 * seule enveloppe. Une unique désérialisation JSON du contenu restitue le texte.
 */
export function enveloppeTexteLaboratoire(texte: string): string {
  const json = JSON.stringify(texte).replace(/</g, '\\u003c').replace(/>/g, '\\u003e');
  return `${BALISE_OUVRANTE}${json}${BALISE_FERMANTE}`;
}

/**
 * Le procédé de cette extraction recueillait-il l'intervalle ? Depuis
 * `bio-extraction-v2` seulement ([[D-267]] §4). Une version illisible est une
 * provenance qui ne permet pas de conclure : « non renseigné », jamais
 * « non imprimé ».
 */
export function procedeRecueilleIntervalle(versionProcede: string): boolean {
  const v = /^bio-extraction-v(\d+)$/.exec(versionProcede);
  return v !== null && Number(v[1]) >= 2;
}

/** L'intervalle d'une tête sous l'une des cinq formes du §2, et le texte imprimé transmis s'il y en a un. */
export function intervalleDuPoint(ligne: LigneBiologieSynthese): { phrase: string; imprime: string | null } {
  const nonTransmis = { phrase: 'Intervalle du laboratoire : non transmis', imprime: null };
  const nonRenseigne = { phrase: 'Intervalle du laboratoire : non renseigné', imprime: null };
  // Une correction après validation n'a pas de ligne lue et n'hérite de rien :
  // fait tu par [[D-267]] §5.
  if (ligne.supersedesResultatId !== null) return nonTransmis;
  const lue = ligne.lue;
  // Sans ligne lue : une saisie du praticien, ou une provenance qui ne permet
  // pas de conclure.
  if (!lue) return ligne.source === 'saisie_praticien' ? nonTransmis : nonRenseigne;
  // Les silences de [[D-267]] §5 PRIMENT : unité ou valeur corrigée à la
  // validation, l'intervalle imprimé portait sur une autre mesure.
  if (!unitesConcordent(lue.uniteLue, ligne.unite)) return nonTransmis;
  if (lireValeurQuantitative(lue.valeurLue) !== ligne.valeur) return nonTransmis;
  // « Non imprimé » ne se déduit jamais du seul champ nul : la version du
  // procédé d'abord, puis le signal de la borne technique ([[D-267]] §10).
  if (!procedeRecueilleIntervalle(lue.versionProcede)) return nonRenseigne;
  if (lue.intervalleNonTranscrit) return { phrase: 'Intervalle du laboratoire : imprimé, non transcrit', imprime: null };
  if (lue.intervalleLu === null) return { phrase: 'Intervalle du laboratoire : non imprimé', imprime: null };
  return {
    phrase: `Intervalle imprimé par le laboratoire : ${enveloppeTexteLaboratoire(lue.intervalleLu)}`,
    imprime: lue.intervalleLu,
  };
}

/** La date du prélèvement au calendrier de Paris, `AAAA-MM-JJ` — la fonction du dépôt, celle de la série. */
function dateParis(iso: string): string {
  return dateJourParis(new Date(iso));
}

/** L'heure du prélèvement au calendrier de Paris, `HH:MM`. */
function heureParis(iso: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(new Date(iso));
}

function minusculeInitiale(texte: string): string {
  return texte.charAt(0).toLocaleLowerCase('fr-FR') + texte.slice(1);
}

/** Le contexte, champ par champ, dans l'ordre et sous les libellés de [[D-497]] §2. */
export function phraseContexte(contexte: ContextePrelevementSaisi | null): string {
  if (contexte === null) return 'Contexte de prélèvement non recueilli.';
  const champs = CHAMPS_CONTEXTE.map(
    champ => `${minusculeInitiale(LIBELLES_CHAMP[champ])} : ${valeurAffichee(contexte, champ)}`,
  );
  return `Contexte : ${champs.join(' ; ')}.`;
}

/**
 * Le bloc et sa trace, ou `null` quand le dossier ne porte aucun résultat qui
 * fasse foi (aucun résultat, ou tous annulés) : le bloc ne naît pas (§2).
 *
 * `annulations` : les annulations ACTIVES du dossier, indexées par la ligne
 * qui les porte (`annulationsActives`) — obligatoire, comme pour la série.
 */
export function construireBlocBiologie(
  lignes: readonly LigneBiologieSynthese[],
  annulations: ReadonlyMap<string, unknown>,
): TraceBlocBiologie | null {
  // Aucun jour 0 : la position dans le suivi n'entre pas au bloc (§2).
  const series = serieParAnalyte([...lignes], annulations, []);
  if (series.length === 0) return null;

  const valeursUnites: TraceBlocBiologie['formes']['valeursUnites'] = [];
  const intervalles: string[] = [];
  const paragraphes = series.map(serie => {
    const n = serie.points.length;
    const libelle = serie.points[0].ligne.analyteLibelle;
    const motifs = serie.motifs.length > 0
      ? `Motifs de non-comparabilité : ${serie.motifs.map(m => LIBELLES_MOTIFS_BLOC[m]).join(' ; ')}.`
      : SANS_MOTIF_BLOC;
    const entete = `${libelle} — ${n} prélèvement${n > 1 ? 's' : ''}. ${motifs}`;
    const points = serie.points.map(point => {
      const ligne = point.ligne;
      // L'heure et le contexte sont ceux de la RACINE du fil (la série les
      // hérite) ; le laboratoire, celui de la ligne, comme la fiche.
      const moment = point.heureLue
        ? `${dateParis(ligne.preleveLe)} à ${heureParis(ligne.preleveLe)}`
        : `${dateParis(ligne.preleveLe)}, heure non lue`;
      // Une unité vide vaut absente, comme à la fiche (`formatValeur`).
      const unite = ligne.unite !== null && ligne.unite.trim() !== '' ? ligne.unite : null;
      const valeur = unite !== null
        ? `${ligne.valeur} ${unite}`
        : `${ligne.valeur} (unité non renseignée)`;
      if (unite !== null) valeursUnites.push({ valeur: ligne.valeur, unite });
      const intervalle = intervalleDuPoint(ligne);
      if (intervalle.imprime !== null) intervalles.push(intervalle.imprime);
      const laboratoire = ligne.laboratoire !== null
        ? `Laboratoire : ${enveloppeTexteLaboratoire(ligne.laboratoire)}.`
        : 'Laboratoire non identifié.';
      return `- Prélevé le ${moment} : ${valeur}. ${intervalle.phrase}. ${laboratoire} ${phraseContexte(point.contexte)}`;
    });
    return [entete, ...points].join('\n');
  });

  const texte = [`${TITRE_BLOC_BIOLOGIE}\n${AVERTISSEMENT_BLOC_BIOLOGIE}`, ...paragraphes].join('\n\n');
  return { texte, formes: { valeursUnites, intervalles } };
}
