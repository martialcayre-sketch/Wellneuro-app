import { prisma } from '@/lib/prisma';
import { STATUT_SYNTHESE_CITABLE, texteDepuisBlob } from './matierePriorite';

// L'ADAPTATEUR BORNÉ DE LA MATIÈRE DU RÉSUMÉ GLOBAL — le second de la campagne,
// sur le patron de `matierePriorite.ts` et pour les mêmes raisons.
//
// CE QU'IL ADMET, ET RIEN D'AUTRE :
//
//   1. `narratif_patient` de CHAQUE synthèse `Validee_Praticien` du dossier,
//      dans l'ordre de validation — la matière du texte ;
//   2. les LIBELLÉS de `axes_prioritaires` de ces mêmes synthèses, DANS LEUR
//      ORDRE — et rien d'autre de ces objets ;
//   3. les désaccords déjà signalés qui portent un texte.
//
// POURQUOI `axes_prioritaires` SORT ICI ALORS QU'IL NE SORT JAMAIS DE
// `matierePriorite.ts`. Ce n'est pas un relâchement, c'est l'objet de
// l'arbitrage du 2026-09-11 : le résumé global doit être HIÉRARCHISÉ, et sa
// hiérarchie ne doit pas être inventée par le modèle. Elle est donc reprise de
// celle qu'un praticien a VALIDÉE en validant la synthèse.
//
// LA PORTE EST ÉTROITE AU POINT DE NE LAISSER PASSER QU'UNE CHAÎNE PAR ENTRÉE.
// Un axe prioritaire porte quatre champs, et trois d'entre eux sont exactement
// ce que `DC-19`/`DC-20` interdit de faire voyager :
//
//   · `niveau_priorite` est une BANDE ('eleve' | 'modere' | 'faible') ;
//   · `arguments` contient des SCORES — le contrat JSON en donne « Score X
//     élevé » comme exemple canonique ;
//   · `points_a_confirmer` est une consigne d'entretien, pas de la matière de
//     résumé.
//
// AUCUN DES TROIS N'EST NOMMÉ DANS CE FICHIER. Ce qui n'est pas nommé ne peut
// pas sortir, et la garde de surface l'éprouve mot par mot.
//
// CE QUE « VALIDÉ » VEUT DIRE, ET CE QU'IL NE VEUT PAS DIRE. Le praticien a
// validé la synthèse entière, donc l'ordre des axes avec elle ; il ne l'a pas
// nécessairement COMPOSÉ — l'éditeur lui permet d'ajouter, retirer et modifier
// des axes, pas de les réordonner. « Ordre validé » est donc exact et
// « ordre choisi » serait faux. La nuance est écrite ici plutôt que tue : elle
// borne ce que la provenance du texte produit peut honnêtement affirmer.
//
// CE FICHIER NE FABRIQUE AUCUN TEXTE. Il rend ce qui est écrit, ou une liste
// vide. `[]` DIT « ABSENT », JAMAIS « ZÉRO » ni « refus » (`DC-24`).

/** Une synthèse validée, réduite à ce que le résumé global a le droit de lire. */
export type MatiereSyntheseGlobale = {
  idSynthese: string;
  narratifPatient: string;
  axes: string[];
};

/** Un désaccord déjà signalé, réduit à sa parole. */
export type MatiereDesaccord = {
  idDesaccord: string;
  texte: string;
};

/** Ce que les deux lectures rendent ensemble. */
export type MatiereComprehension = {
  syntheses: MatiereSyntheseGlobale[];
  desaccords: MatiereDesaccord[];
};

/**
 * Les LIBELLÉS d'axes, dans l'ordre du tableau, et rien d'autre.
 *
 * Une entrée sans libellé exploitable est SAUTÉE plutôt que remplacée par un
 * marqueur : un « (sans nom) » dans la matière ferait écrire au modèle une
 * phrase sur un axe qui n'existe pas.
 */
function libellesDAxes(blob: unknown): string[] {
  if (typeof blob !== 'object' || blob === null) return [];
  const axes = (blob as Record<string, unknown>)['axes_prioritaires'];
  if (!Array.isArray(axes)) return [];

  const libelles: string[] = [];
  for (const entree of axes) {
    if (typeof entree !== 'object' || entree === null) continue;
    const libelle = (entree as Record<string, unknown>)['axe'];
    if (typeof libelle !== 'string') continue;
    const propre = libelle.trim();
    if (propre !== '') libelles.push(propre);
  }
  return libelles;
}

/**
 * TOUTES les synthèses validées du dossier, de la plus ancienne à la plus
 * récente.
 *
 * L'ORDRE EST CROISSANT, ET CE N'EST PAS UN DÉTAIL : le résumé global raconte
 * une trajectoire, et une trajectoire se lit dans le sens où elle s'est
 * produite. C'est aussi cet ordre-là qui entre dans la clé d'unicité des
 * tirages — `{A,B}` et `{B,A}` ne rendent pas le même texte.
 *
 * `select` NOMME SES COLONNES : ni `donneesEntree`, ni `modele`, ni
 * `notesPraticien`. Ce qui n'est pas demandé ne peut pas fuir.
 *
 * UNE SYNTHÈSE SANS `narratif_patient` EST ÉCARTÉE, pas rendue à moitié : elle
 * n'apporte aucune matière de texte, et la faire compter dans le minimum de
 * deux laisserait produire un résumé sur une seule vraie source.
 */
export async function lireSynthesesCitables(idPatient: string): Promise<MatiereSyntheseGlobale[]> {
  const lignes = await prisma.syntheseIA.findMany({
    where: { idPatient, statut: STATUT_SYNTHESE_CITABLE },
    orderBy: { dateValidation: 'asc' },
    select: { idSynthese: true, syntheseJson: true },
  });

  const matiere: MatiereSyntheseGlobale[] = [];
  for (const ligne of lignes) {
    const narratifPatient = texteDepuisBlob(ligne.syntheseJson, 'narratif_patient');
    if (narratifPatient === null) continue;
    matiere.push({
      idSynthese: ligne.idSynthese,
      narratifPatient,
      axes: libellesDAxes(ligne.syntheseJson),
    });
  }
  return matiere;
}

/**
 * Les désaccords déjà signalés QUI PORTENT UN TEXTE.
 *
 * UN DÉSACCORD SANS TEXTE N'EST PAS RIEN — le geste seul est une parole, et le
 * portail le dit au patient (« vous avez signalé que ce n'était pas exactement
 * ça, sans ajouter de texte »). Mais il n'est pas de la MATIÈRE de rédaction :
 * il n'y a rien à relire. L'écarter ici ne l'efface nulle part ailleurs.
 */
export async function lireDesaccords(idPatient: string): Promise<MatiereDesaccord[]> {
  const lignes = await prisma.desaccordComprehension.findMany({
    where: { idPatient },
    orderBy: { creeLe: 'asc' },
    select: { id: true, texte: true },
  });

  const matiere: MatiereDesaccord[] = [];
  for (const ligne of lignes) {
    if (typeof ligne.texte !== 'string') continue;
    const propre = ligne.texte.trim();
    if (propre === '') continue;
    matiere.push({ idDesaccord: ligne.id, texte: propre });
  }
  return matiere;
}

/**
 * L'ÉTAT D'OUVERTURE DE LA FONCTION, AU SENS DE `D-158`.
 *
 * LA RÈGLE DU RESPONSABLE, 2026-09-11 : « deux rideaux de questionnaires et
 * deux synthèses minimum doivent donner de la matière ». Et elle se compte au
 * sens que le dépôt a DÉJÀ écrit, plutôt qu'au sens d'un comptage neuf —
 * `D-158` : le second rideau se compte depuis la PREMIÈRE SYNTHÈSE VALIDÉE du
 * dossier. Aucun seuil n'est donc inventé ici ; deux règles existantes sont
 * lues ensemble.
 *
 * DEUX BOOLÉENS ET NON UN, parce que les deux manques ne se confondent pas et
 * que l'écran doit pouvoir dire lequel. Un dossier peut avoir ses deux
 * synthèses sans second rideau, et l'inverse.
 *
 * CETTE FONCTION NE REND AUCUN DÉCOMPTE. Ni le nombre de synthèses, ni celui
 * des assignations : deux booléens suffisent à ouvrir ou fermer, et un nombre
 * servi à l'écran finirait par y être affiché comme une mesure du dossier.
 *
 * SANS DATE DE VALIDATION, LE RIDEAU NE SE CONSTATE PAS — mais les synthèses se
 * comptent quand même. Les confondre ferait dire « il manque une synthèse » à un
 * dossier qui en a deux, dont les dates sont absentes (`DC-24`).
 */
export type OuvertureResume = {
  deuxSynthesesValidees: boolean;
  secondRideau: boolean;
};

export async function constaterOuverture(idPatient: string): Promise<OuvertureResume> {
  const validees = await prisma.syntheseIA.findMany({
    where: { idPatient, statut: STATUT_SYNTHESE_CITABLE },
    orderBy: { dateValidation: 'asc' },
    select: { dateValidation: true },
  });

  const deuxSynthesesValidees = validees.length >= 2;

  const premiere = validees.find((v) => v.dateValidation !== null)?.dateValidation ?? null;
  if (premiere === null) return { deuxSynthesesValidees, secondRideau: false };

  // `gt` ET NON `gte` : une assignation posée dans la même milliseconde que la
  // validation appartient au premier rideau, pas au second.
  const posterieures = await prisma.assignation.count({
    where: { idPatient, dateAssignation: { gt: premiere } },
  });

  return { deuxSynthesesValidees, secondRideau: posterieures > 0 };
}

/** Les deux pièces, lues ensemble. */
export async function lireMatiereComprehension(idPatient: string): Promise<MatiereComprehension> {
  const [syntheses, desaccords] = await Promise.all([
    lireSynthesesCitables(idPatient),
    lireDesaccords(idPatient),
  ]);
  return { syntheses, desaccords };
}
