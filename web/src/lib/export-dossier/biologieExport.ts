// Export PDF du dossier patient — la sélection de la biologie ([[D-519]]).
//
// CE QUI ENTRE : les mesures qui FONT FOI, élues par `serieParAnalyte` — la
// même élection que la fiche du praticien (fil annulé écarté, une tête par
// fil). Puis la LECTURE (§1) : une mesure dont la racine vient d'un import
// n'entre que si la lecture de cet import est consignée ([[D-268]]) ; une
// saisie du praticien entre toujours. Une mesure écartée pour lecture
// manquante se compte, elle ne disparaît pas en silence.
//
// CE QUI EST ÉCRIT (§3) : la valeur, l'unité, la date du prélèvement,
// l'intervalle TEL QU'IMPRIMÉ par le laboratoire — mêmes silences que la fiche
// ([[D-267]] §5) — et le laboratoire. Jamais le marquage, jamais une plage ni
// un seuil WellNeuro (`DC-47`), jamais une qualification de la valeur.
//
// Aucun accès base ni horloge ici : les fonctions de la biologie qu'il
// emploie sont pures, lues par l'entrée publiée ([[D-306]]).

import {
  lireValeurQuantitative,
  racineDe,
  serieParAnalyte,
  unitesConcordent,
} from '@/lib/biology-library/publie';
import type { BiologieExport, MesureBiologieExport } from './modele';

/** Une ligne de `resultats_biologiques`, telle que l'assembleur la lit. */
export type LigneBiologieLue = {
  id: string;
  analyteCode: string;
  analyteLibelle: string;
  /** Le décimal en texte exact (`Decimal.toFixed()`). */
  valeur: string;
  unite: string | null;
  preleveLe: Date;
  saisiLe: Date;
  supersedesResultatId: string | null;
  /** `saisie_praticien` | `import_labo` (CHECK) : une validation d'import écrit `saisie_praticien`. */
  source: string;
  /** La ligne lue qui a créé ce résultat ; `null` : saisie praticien ou correction. */
  lue: {
    idImport: string;
    intervalleLu: string | null;
    intervalleNonTranscrit: boolean;
    uniteLue: string | null;
    valeurLue: string;
    laboratoireLu: string | null;
  } | null;
};

/** L'intervalle de la tête, ou la raison de son absence — mêmes silences que la fiche. */
function intervalleDe(tete: LigneBiologieLue): MesureBiologieExport['intervalle'] {
  if (tete.supersedesResultatId !== null) return { absence: 'correction' };
  const lue = tete.lue;
  if (!lue) return { absence: 'saisie_praticien' };
  if (lue.intervalleNonTranscrit) return { absence: 'non_transcrit' };
  if (lue.intervalleLu === null) return { absence: 'non_imprime' };
  // L'intervalle imprimé portait sur la valeur LUE : une unité ou une valeur
  // retouchée à la validation ne se juxtapose plus à lui ([[D-267]] §5).
  if (!unitesConcordent(lue.uniteLue, tete.unite)) return { absence: 'ecart_ligne_lue' };
  if (lireValeurQuantitative(lue.valeurLue) !== tete.valeur) return { absence: 'ecart_ligne_lue' };
  return { texte: lue.intervalleLu };
}

/**
 * `annulations` : les annulations ACTIVES du dossier, indexées par la ligne
 * qui les porte. `importsLus` : les imports dont une lecture est active.
 */
export function selectionnerBiologie(
  lignes: readonly LigneBiologieLue[],
  annulations: ReadonlyMap<string, unknown>,
  importsLus: ReadonlySet<string>,
): BiologieExport {
  const parId = new Map(lignes.map(l => [l.id, l] as const));
  const enSerie = lignes.map(l => ({
    id: l.id,
    supersedesResultatId: l.supersedesResultatId,
    saisiLe: l.saisiLe.toISOString(),
    analyteCode: l.analyteCode,
    preleveLe: l.preleveLe.toISOString(),
    valeur: l.valeur,
    unite: l.unite,
    laboratoire: l.lue?.laboratoireLu ?? null,
  }));
  const parIdSerie = new Map(enSerie.map(l => [l.id, l] as const));

  let nonLues = 0;
  const analytes: BiologieExport['analytes'] = [];
  // Aucun jour 0 de suivi : la position dans le protocole n'est pas écrite.
  for (const serie of serieParAnalyte(enSerie, annulations, [])) {
    const mesures: MesureBiologieExport[] = [];
    let libelle = serie.analyteCode;
    for (const point of serie.points) {
      const tete = parId.get(point.ligne.id);
      const racine = parId.get(racineDe(point.ligne, parIdSerie).id);
      // Inatteignable : la série est faite de ces lignes. Jamais un écart silencieux.
      if (!tete || !racine) throw new Error('Biologie : ligne de la série introuvable.');
      libelle = tete.analyteLibelle;
      // La lecture se juge sur l'import de la RACINE : corriger une valeur
      // importée ne dispense pas d'en avoir lu le compte rendu.
      // Sans ligne lue, seule une saisie du praticien entre sans lecture : une
      // autre origine (`import_labo`, sans écrivain aujourd'hui) n'a été ni
      // relue ni lue, et se compte avec les non lues.
      const nonLue = racine.lue
        ? !importsLus.has(racine.lue.idImport)
        : racine.source !== 'saisie_praticien';
      if (nonLue) {
        nonLues += 1;
        continue;
      }
      mesures.push({
        preleveLe: tete.preleveLe,
        valeur: tete.valeur,
        unite: tete.unite,
        intervalle: intervalleDe(tete),
        laboratoire: racine.lue?.laboratoireLu ?? null,
        corrigee: tete.supersedesResultatId !== null,
      });
    }
    if (mesures.length > 0) analytes.push({ analyteCode: serie.analyteCode, libelle, mesures });
  }
  return { analytes, nonLues };
}
