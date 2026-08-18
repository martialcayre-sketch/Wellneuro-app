import { assemblerDocument } from '@/lib/documents/document';
import { blocsPourDestinataire, contenuPourDestinataire } from '@/lib/documents/bloc';
import { MODELE_COURRIER_BIOLOGIE } from '@/lib/documents/modele';
import { renderDocumentHtml } from '@/lib/documents/rendu';
import type { Bloc, DocumentComposite } from '@/lib/documents/types';
import type { LignePanelProposition } from './statuts';

// Courrier médecin — proposition d'explorations biologiques (LOT-06, D-059 §6).
// UN SEUL chemin de rendu : `renderDocumentHtml(document, 'medecin')`, donc
// sous `assertRenduMedecinNonPrescriptif` — jamais de second gabarit. Le
// vocabulaire est choisi pour la garde ET pour le fond : on « propose une
// exploration », on ne demande rien (le registre prescriptif interdit
// notamment le mot « dosage » ; c'est voulu, un courrier qui y recourt est un
// courrier qui prescrit).
//
// Remise MANUELLE en V1 : aucun envoi automatique — le praticien imprime ou
// transcrit, et la consignation passe par `preparerCorrespondance` existant
// (chokepoint de `CorrespondanceMedecin`).

/**
 * Statuts qui entrent dans le courrier : ce qui est réellement proposé.
 * EXPORTÉ pour que l'écran offre le geste sur le MÊME prédicat que le
 * générateur — un formulaire affiché là où le serveur refusera fait
 * journaliser un accès pour un 409 (revue M5).
 */
export const STATUTS_PROPOSES: ReadonlySet<string> =
  new Set(['recommande', 'a_repeter', 'optionnel', 'conditionnel']);

export type EntreeCourrierBiologie = {
  patientId: string;
  /** Lignes dérivées par `deriverStatutsBiologie` (proposition non vide). */
  lignes: LignePanelProposition[];
  /** SHA de la table d'indications au moment de la dérivation (provenance). */
  tableSha256: string;
  /** ISO 8601 — date du courrier, posée par l'appelant (jamais l'horloge ici). */
  dateCourrier: string;
};

export type RefusCourrierBiologie =
  /** Rien à proposer : un courrier vide n'existe pas. */
  | 'aucune_exploration_proposee'
  /** La garde non prescriptive a levé au rendu (libellé de catalogue fautif…). */
  | 'terme_prescriptif'
  /** Le rendu médecin ne porte pas le texte à consigner : rien ne part. */
  | 'bloc_non_diffuse';

export type CourrierBiologie = {
  document: DocumentComposite;
  /** Rendu HTML destinataire médecin, passé par la garde non prescriptive. */
  html: string;
  /** Texte brut à consigner dans `CorrespondanceMedecin` (même contenu). */
  texte: string;
};

export type PreparationCourrierBiologie =
  | { ok: true; courrier: CourrierBiologie }
  | { ok: false; raison: RefusCourrierBiologie };

function libelleStatut(ligne: LignePanelProposition): string {
  switch (ligne.statut) {
    case 'recommande':
      return 'proposée';
    case 'a_repeter':
      return 'proposée à nouveau (précédente exploration ancienne)';
    case 'optionnel':
      return 'laissée à votre appréciation';
    case 'conditionnel':
      return ligne.declencheurRempli
        ? 'proposée (signal d’appel présent au tableau clinique)'
        : `à envisager seulement si : ${ligne.condition ?? 'condition non renseignée'}`;
    default:
      return 'proposée';
  }
}

function paragrapheLigne(ligne: LignePanelProposition): string {
  const morceaux: string[] = [];
  morceaux.push(`${ligne.libelle} — ${libelleStatut(ligne)}.`);
  if (ligne.objectif) morceaux.push(`Objectif : ${ligne.objectif}`);
  // Les rapports CALCULÉS sont dits, et dits comme tels ([[D-072]]) : ce ne
  // sont pas des actes à demander au laboratoire, mais ils font partie de ce
  // que le bilan produit. Les taire ici laissait l'amputation sur le SEUL
  // artefact qui quitte le cabinet, alors même que l'écran, lui, les montre.
  if (ligne.ratios.length > 0) {
    morceaux.push(
      `Rapports calculés à partir de ces éléments : ${ligne.ratios.map(r => r.libelle).join(', ')}.`,
    );
  }
  if (ligne.analytes.length > 0) {
    morceaux.push(`Éléments : ${ligne.analytes.map(a => a.libelle).join(', ')}.`);
    const validation = ligne.analytes.filter(a => a.validationMedicaleRequise);
    if (validation.length > 0) {
      morceaux.push(
        `Interprétation médicale requise pour : ${validation.map(a => a.libelle).join(', ')}.`,
      );
    }
    const horsNomenclature = ligne.analytes.filter(
      a => a.remboursement.statut === 'hors_nomenclature',
    );
    if (horsNomenclature.length > 0) {
      morceaux.push(
        `Hors nomenclature (à la charge du patient) : ${horsNomenclature.map(a => a.libelle).join(', ')}.`,
      );
    }
  }
  return morceaux.join(' ');
}

/**
 * Génère le courrier médecin depuis une proposition dérivée. Le rendu HTML est
 * produit ICI, pour que la garde non prescriptive ait jugé le contenu avant
 * toute consignation : un courrier qui ne se rend pas ne se consigne pas.
 */
export function genererCourrierBiologie(
  entree: EntreeCourrierBiologie,
): PreparationCourrierBiologie {
  const proposees = entree.lignes.filter(ligne => STATUTS_PROPOSES.has(ligne.statut));
  if (proposees.length === 0) {
    return { ok: false, raison: 'aucune_exploration_proposee' };
  }

  const dateLisible = entree.dateCourrier.slice(0, 10);
  const paragraphes = [
    'Docteur,',
    'Dans le cadre d’un accompagnement en neuronutrition, je vous transmets, '
    + 'pour votre appréciation, les explorations biologiques qui me sembleraient '
    + 'utiles au vu du tableau clinique recueilli. La décision de les demander, '
    + 'comme leur interprétation, vous appartient pleinement.',
    ...proposees.map(paragrapheLigne),
    'Aucun résultat d’analyse n’est conservé dans notre outil : le retour du '
    + 'bilan se fait directement auprès du patient et de votre cabinet.',
    `Avec mes remerciements pour votre lecture. Courrier préparé le ${dateLisible}.`,
  ];
  const texte = paragraphes.join('\n\n');

  const bloc: Bloc = {
    id: `courrier-biologie-${entree.patientId}-${dateLisible}`,
    type: 'narratif',
    regime: 'statique_valide',
    provenance: {
      source: 'biologie_proposition',
      ancrageHash: entree.tableSha256,
      version: 'indications-biologie-v1',
    },
    contenu: {
      praticien: texte,
      medecin: texte,
    },
  };

  const document = assemblerDocument({
    modele: MODELE_COURRIER_BIOLOGIE,
    patientId: entree.patientId,
    blocs: [bloc],
  });

  let html: string;
  try {
    html = renderDocumentHtml(document, 'medecin', { dateDocument: dateLisible });
  } catch {
    // La garde du chokepoint a levé : un libellé (catalogue, objectif) porte un
    // terme prescriptif. Refus explicite plutôt qu'un rendu contourné.
    return { ok: false, raison: 'terme_prescriptif' };
  }

  // LE TEXTE CONSIGNÉ EST LA SORTIE DU RENDU, PAS SON ENTRÉE (revue M1).
  // `renderDocumentHtml` juge ce que `blocsPourDestinataire` laisse passer —
  // garde de régime comprise — et rend un corps de repli quand la liste
  // filtrée est vide. Sans cette vérification, un bloc devenu non diffusable
  // (régime `genere_ia` sans statut valide, `contenu.medecin` perdu) ferait
  // passer la garde À VIDE, et la route consignerait un texte que personne n'a
  // jugé. Le couplage cesse d'être accidentel : ce qui part en base est
  // exactement ce que la garde a lu.
  const diffuses = blocsPourDestinataire(document.blocs, 'medecin');
  const texteJuge = diffuses.length === 1 ? contenuPourDestinataire(diffuses[0], 'medecin') : null;
  if (texteJuge !== texte) {
    return { ok: false, raison: 'bloc_non_diffuse' };
  }

  return { ok: true, courrier: { document, html, texte } };
}
