import { assemblerDocument } from '@/lib/documents/document';
import { blocsPourDestinataire, contenuPourDestinataire } from '@/lib/documents/bloc';
import { MODELE_DOCUMENT_PATIENT_BIOLOGIE } from '@/lib/documents/modele';
import { renderDocumentHtml } from '@/lib/documents/rendu';
import type { Bloc, DocumentComposite } from '@/lib/documents/types';
import { STATUTS_PROPOSES } from './statuts';
import type { LignePanelProposition } from './statuts';

// Document patient — proposition d'explorations biologiques (décision F du
// cadrage CB, [[D-122]] §1). Miroir de `courrier.ts` SANS le médecin : même
// prédicat d'entrée (`STATUTS_PROPOSES`), même provenance ancrée, mais le
// registre est celui du patient — des phrases qui expliquent sans inquiéter
// ni rien demander. La demande, JAMAIS le résultat : rien ici ne cite une
// valeur, et la table `documents_patient_biologie` n'a pas de colonne pour ça.
//
// LA GARDE DU REGISTRE PATIENT NE VIT PAS ICI. Le chokepoint `rendu.ts` ne
// juge que le rendu médecin ; le registre anxiogène se garde CÔTÉ ROUTE
// (`termeAnxiogene`, refus confirmable — carte des chemins sortants,
// `documents/vocabulaire.ts`). Le générateur rend le texte, la route juge le
// geste — même partage que le booklet et la synthèse de compréhension.
//
// Remise MANUELLE en V1 : aucun envoi — le praticien imprime ou remet en
// consultation, et la consignation va dans `documents_patient_biologie`
// (append-only : re-générer fait une ligne de plus).

export type EntreeDocumentPatientBiologie = {
  patientId: string;
  /** Lignes dérivées par `deriverStatutsBiologie` (proposition non vide). */
  lignes: LignePanelProposition[];
  /** SHA de la table d'indications au moment de la dérivation (provenance). */
  tableSha256: string;
  /** ISO 8601 — date du document, posée par l'appelant (jamais l'horloge ici). */
  dateDocument: string;
};

export type RefusDocumentPatientBiologie =
  /** Rien à proposer : un document vide n'existe pas. */
  | 'aucune_exploration_proposee'
  /** Le rendu patient ne porte pas le texte à consigner : rien ne part. */
  | 'bloc_non_diffuse';

export type DocumentPatientBiologieGenere = {
  document: DocumentComposite;
  /** Rendu HTML destinataire patient (badge « Validé par votre praticien »). */
  html: string;
  /** Texte brut à consigner dans `documents_patient_biologie` (même contenu). */
  texte: string;
};

export type PreparationDocumentPatientBiologie =
  | { ok: true; documentPatient: DocumentPatientBiologieGenere }
  | { ok: false; raison: RefusDocumentPatientBiologie };

function phraseStatut(ligne: LignePanelProposition): string {
  switch (ligne.statut) {
    case 'recommande':
      return 'proposée';
    case 'a_repeter':
      return 'proposée à nouveau (la précédente exploration date)';
    case 'optionnel':
      return 'proposée en option, à discuter ensemble';
    case 'conditionnel':
      return ligne.declencheurRempli
        ? 'proposée au vu de ce que vous avez décrit'
        : `à envisager seulement dans certaines situations (${ligne.condition ?? 'condition non renseignée'})`;
    default:
      return 'proposée';
  }
}

function paragrapheLigne(ligne: LignePanelProposition): string {
  const morceaux: string[] = [];
  morceaux.push(`${ligne.libelle} — ${phraseStatut(ligne)}.`);
  if (ligne.objectif) morceaux.push(`Pourquoi : ${ligne.objectif}`);
  // Les rapports CALCULÉS sont dits, et dits comme tels ([[D-072]]) : le
  // patient lit ce que le bilan produit, pas seulement ce qui se prélève.
  if (ligne.ratios.length > 0) {
    morceaux.push(
      `Le bilan permet aussi de calculer : ${ligne.ratios.map(r => r.libelle).join(', ')}.`,
    );
  }
  if (ligne.analytes.length > 0) {
    morceaux.push(`Ce qui serait analysé : ${ligne.analytes.map(a => a.libelle).join(', ')}.`);
    const validation = ligne.analytes.filter(a => a.validationMedicaleRequise);
    if (validation.length > 0) {
      morceaux.push(
        `À interpréter avec un médecin : ${validation.map(a => a.libelle).join(', ')}.`,
      );
    }
    const horsNomenclature = ligne.analytes.filter(
      a => a.remboursement.statut === 'hors_nomenclature',
    );
    if (horsNomenclature.length > 0) {
      morceaux.push(
        `Non pris en charge par l’assurance maladie (resterait à votre charge) : ${horsNomenclature.map(a => a.libelle).join(', ')}.`,
      );
    }
  }
  return morceaux.join(' ');
}

/**
 * Génère le document patient depuis une proposition dérivée. Le rendu HTML
 * est produit ici pour l'impression à venir ; c'est le COUPLAGE ci-dessous
 * (`blocsPourDestinataire`) qui juge que le texte consigné est bien celui que
 * le rendu patient diffuse — le chokepoint patient, lui, ne lève jamais
 * (seul le rendu médecin porte une garde au rendu).
 */
export function genererDocumentPatientBiologie(
  entree: EntreeDocumentPatientBiologie,
): PreparationDocumentPatientBiologie {
  const proposees = entree.lignes.filter(ligne => STATUTS_PROPOSES.has(ligne.statut));
  if (proposees.length === 0) {
    return { ok: false, raison: 'aucune_exploration_proposee' };
  }

  const dateLisible = entree.dateDocument.slice(0, 10);
  const paragraphes = [
    'Ce document présente les explorations biologiques que votre praticien vous '
    + 'propose d’envisager, et pourquoi. Il a été préparé à partir des éléments '
    + 'recueillis lors de votre accompagnement.',
    ...proposees.map(paragrapheLigne),
    'Ce document n’est ni une ordonnance ni un diagnostic : la décision de '
    + 'réaliser ces explorations se prend avec votre praticien et, le cas échéant, '
    + 'avec votre médecin traitant, à qui leur interprétation revient.',
    'Aucun résultat d’analyse n’est conservé dans notre outil : le retour du '
    + 'bilan se fait directement auprès de vous et de votre médecin.',
    `Document préparé le ${dateLisible}.`,
  ];
  const texte = paragraphes.join('\n\n');

  const bloc: Bloc = {
    id: `document-patient-biologie-${entree.patientId}-${dateLisible}`,
    type: 'narratif',
    regime: 'statique_valide',
    provenance: {
      source: 'biologie_proposition',
      ancrageHash: entree.tableSha256,
      version: 'indications-biologie-v1',
    },
    contenu: {
      praticien: texte,
      patient: texte,
    },
  };

  const document = assemblerDocument({
    modele: MODELE_DOCUMENT_PATIENT_BIOLOGIE,
    patientId: entree.patientId,
    blocs: [bloc],
  });

  const html = renderDocumentHtml(document, 'patient', { dateDocument: dateLisible });

  // LE TEXTE CONSIGNÉ EST LA SORTIE DU RENDU, PAS SON ENTRÉE (patron M1 du
  // courrier) : `blocsPourDestinataire` applique la garde de régime et le
  // field-filter — un bloc devenu non diffusable au patient ferait consigner
  // un texte que personne n'a servi. Ce qui part en base est exactement ce
  // que le rendu patient porte.
  const diffuses = blocsPourDestinataire(document.blocs, 'patient');
  const texteJuge = diffuses.length === 1 ? contenuPourDestinataire(diffuses[0], 'patient') : null;
  if (texteJuge !== texte) {
    return { ok: false, raison: 'bloc_non_diffuse' };
  }

  return { ok: true, documentPatient: { document, html, texte } };
}
