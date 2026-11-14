// Export PDF du dossier patient — section 5, les résultats de biologie
// ([[D-519]]). Des faits, jamais une lecture : aucune valeur n'est dite
// normale ou anormale, aucune plage WellNeuro n'est écrite (`DC-47`), et une
// absence d'intervalle se dit par sa raison (`DC-24`).

import { DATEUR_CALENDAIRE, type Dateur } from './datesExport';
import {
  citer,
  type AbsenceIntervalle,
  type BiologieExport,
  type BlocExport,
  type MesureBiologieExport,
} from './modele';

const TITRE = '5. Résultats de biologie';

const PORTEE =
  "Les résultats validés par le praticien : ceux qu'il a saisis lui-même, et ceux qu'il a validés depuis " +
  "un compte rendu importé dont la lecture est consignée. Une mesure annulée n'y figure pas ; une mesure " +
  "corrigée y figure dans sa dernière version. Par analyse, dans l'ordre des prélèvements.";

const SANS_INTERPRETATION =
  "Aucune interprétation : WellNeuro ne qualifie aucune valeur (ni normale, ni anormale) et n'applique " +
  "aucune plage qui lui soit propre. L'intervalle cité est celui que le laboratoire a imprimé sur son " +
  "compte rendu, tel qu'il a été relevé ; le marquage du laboratoire (haut, bas) n'est pas repris. Deux " +
  "mesures de laboratoires, d'unités ou de circonstances différentes peuvent ne pas être comparables ; " +
  "les circonstances du prélèvement (jeûne, traitement, cycle) ne figurent pas dans ce document.";

const SANS_LABORATOIRE =
  'Le nom du laboratoire est retiré de cette version : il peut situer le patient.';

const AUCUN = 'Aucun résultat de biologie du dossier ne remplit ces conditions.';

const ABSENCES: Record<AbsenceIntervalle, string> = {
  saisie_praticien: 'non relevé (saisie du praticien)',
  correction: 'non repris (valeur corrigée par le praticien)',
  non_imprime: 'non imprimé',
  non_transcrit: 'imprimé mais non relevé (trop long)',
  ecart_ligne_lue: "non repris (la valeur ou l'unité validée diffère de celle lue sur le compte rendu)",
};

function phraseNonLues(n: number): string {
  return n === 1
    ? "1 résultat validé depuis un compte rendu dont la lecture n'est pas consignée ne figure pas dans ce document."
    : `${n} résultats validés depuis un compte rendu dont la lecture n'est pas consignée ne figurent pas dans ce document.`;
}

function ligneMesure(m: MesureBiologieExport, dateur: Dateur, avecLaboratoire: boolean): string {
  const valeur = m.unite ? `${m.valeur} ${m.unite}` : m.valeur;
  const morceaux = [
    `${dateur.jour(m.preleveLe)} : ${valeur}${m.corrigee ? ' (valeur corrigée par le praticien)' : ''}`,
    'texte' in m.intervalle
      ? `intervalle imprimé par le laboratoire : ${citer(m.intervalle.texte)}`
      : `intervalle du laboratoire : ${ABSENCES[m.intervalle.absence]}`,
  ];
  if (avecLaboratoire) {
    morceaux.push(m.laboratoire ? `laboratoire : ${citer(m.laboratoire)}` : 'laboratoire non identifié');
  }
  return morceaux.join(' — ');
}

/** La version « IA externe » se reconnaît à son dateur relatif : sans laboratoire. */
export function sectionBiologie(
  biologie: BiologieExport,
  dateur: Dateur = DATEUR_CALENDAIRE,
): BlocExport[] {
  const avecLaboratoire = !dateur.relatif;
  const blocs: BlocExport[] = [
    { type: 'titre', niveau: 1, texte: TITRE },
    { type: 'paragraphe', texte: PORTEE },
    { type: 'paragraphe', texte: SANS_INTERPRETATION, ton: 'discret' },
  ];
  if (!avecLaboratoire) blocs.push({ type: 'paragraphe', texte: SANS_LABORATOIRE, ton: 'discret' });
  if (biologie.nonLues > 0) blocs.push({ type: 'paragraphe', texte: phraseNonLues(biologie.nonLues), ton: 'alerte' });
  if (biologie.analytes.length === 0) {
    blocs.push({ type: 'paragraphe', texte: AUCUN });
    return blocs;
  }
  for (const analyte of biologie.analytes) {
    blocs.push(
      { type: 'titre', niveau: 2, texte: analyte.libelle },
      { type: 'liste', elements: analyte.mesures.map(m => ligneMesure(m, dateur, avecLaboratoire)) },
    );
  }
  return blocs;
}
