import { assemblerDocument } from '@/lib/documents/document';
import { blocsPourDestinataire, contenuPourDestinataire } from '@/lib/documents/bloc';
import { MODELE_COURRIER_COMPLEMENT } from '@/lib/documents/modele';
import { renderDocumentHtml } from '@/lib/documents/rendu';
import type { Bloc, DocumentComposite } from '@/lib/documents/types';
import { SIGNATURE_PRATICIEN } from '@/lib/correspondance/signature';

// LE COURRIER COMPLÉMENT — [[D-345]] §7, J3-12h, lot 3 (G4 de la fiche de
// cadrage). Un papier que le PATIENT remet lui-même au médecin, avant qu'un
// complément ciblé entre à son programme ; la réponse n'est pas attendue.
//
// TEXTE VALIDÉ PAR LE RESPONSABLE le 2026-10-24 (arbitrage du lot 3) : il ne se
// retouche pas sans nouvelle validation. Il ne nomme ni la population ni la
// situation qui appelle le courrier — forme opaque : les situations propres à
// un nutriment n'ont pas de libellé au dépôt, et dire « grossesse » au médecin
// d'une personne qui ne l'a pas annoncée serait une divulgation que personne
// n'a décidée.
//
// UN SEUL CHEMIN DE RENDU, patron `biology-library/courrier.ts` :
// `renderDocumentHtml(document, 'medecin')`, donc sous
// `assertRenduMedecinNonPrescriptif`. Un intitulé de complément saisi par le
// praticien peut porter « posologie » ou « dosage » : la garde lève, le courrier
// se refuse — jamais un rendu contourné.
//
// PUR : ni horloge, ni base. L'appelant pose la date, la liste et les libellés
// d'ingrédient lus au catalogue.

export type LigneComplement = {
  /** Intitulé de l'action du protocole, tel que persisté. */
  intitule: string;
  /** Nom de l'ingrédient au catalogue, si la référence catalogue est renseignée. */
  ingredient: string | null;
};

export type EntreeCourrierComplement = {
  patientId: string;
  /** Les compléments ciblés de la version, dans l'ordre du protocole, non vides. */
  lignes: readonly LigneComplement[];
  /** Ancrage : `complement-cible-<sha de la table signée>` et ce sha. */
  ancrage: { version: string; sha256: string };
  /** ISO 8601 — date du courrier, posée par l'appelant. */
  dateCourrier: string;
  /** Nom lisible du patient : en-tête du RENDU seulement, jamais dans le texte consigné. */
  patientNom?: string;
};

export type RefusCourrierComplement =
  | 'aucun_complement'
  | 'terme_prescriptif'
  | 'bloc_non_diffuse';

export type PreparationCourrierComplement =
  | { ok: true; courrier: { document: DocumentComposite; html: string; texte: string } }
  | { ok: false; raison: RefusCourrierComplement };

export const PREFIXE_ANCRAGE_COMPLEMENT = 'complement-cible-';

const OUVERTURE =
  'Dans le cadre d’un accompagnement en neuronutrition, j’envisage de proposer à la personne que vous suivez '
  + 'les compléments alimentaires ci-dessous. Sa situation justifie que vous en soyez informé avant qu’ils '
  + 'n’entrent à son programme : je vous les transmets pour votre appréciation, la décision médicale vous '
  + 'appartenant pleinement.';

const REMISE =
  'Ce courrier vous est remis par la personne elle-même. Vos observations éventuelles seront les bienvenues ; '
  + 'il ne remplace pas une consultation sans délai si son état le demande.';

function ligneDuCourrier(ligne: LigneComplement): string {
  const intitule = ligne.intitule.trim();
  const ingredient = ligne.ingredient?.trim();
  return ingredient ? `- ${intitule} — ${ingredient}.` : `- ${intitule}.`;
}

export function genererCourrierComplement(entree: EntreeCourrierComplement): PreparationCourrierComplement {
  const lignes = entree.lignes.filter(ligne => /\S/.test(ligne.intitule));
  if (lignes.length === 0) return { ok: false, raison: 'aucun_complement' };

  const dateLisible = entree.dateCourrier.slice(0, 10);
  const texte = [
    'Docteur,',
    OUVERTURE,
    lignes.map(ligneDuCourrier).join('\n'),
    REMISE,
    `Avec mes remerciements pour votre lecture. Courrier préparé le ${dateLisible}.`,
    SIGNATURE_PRATICIEN,
  ].join('\n\n');

  const bloc: Bloc = {
    id: `courrier-complement-${entree.patientId}-${dateLisible}`,
    type: 'narratif',
    regime: 'statique_valide',
    provenance: {
      source: 'complement_cible',
      ancrageHash: entree.ancrage.sha256,
      version: entree.ancrage.version,
    },
    contenu: { praticien: texte, medecin: texte },
  };

  const document = assemblerDocument({
    modele: MODELE_COURRIER_COMPLEMENT,
    patientId: entree.patientId,
    blocs: [bloc],
  });

  let html: string;
  try {
    html = renderDocumentHtml(document, 'medecin', { dateDocument: dateLisible, patientNom: entree.patientNom });
  } catch {
    return { ok: false, raison: 'terme_prescriptif' };
  }

  // Ce qui part en base est exactement ce que la garde a lu (revue M1 du
  // courrier biologie) : un bloc filtré au rendu ne passe pas la garde à vide.
  const diffuses = blocsPourDestinataire(document.blocs, 'medecin');
  const texteJuge = diffuses.length === 1 ? contenuPourDestinataire(diffuses[0], 'medecin') : null;
  if (texteJuge !== texte) return { ok: false, raison: 'bloc_non_diffuse' };

  return { ok: true, courrier: { document, html, texte } };
}
