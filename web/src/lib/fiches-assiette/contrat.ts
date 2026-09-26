// LE CONTRAT D'UN BROUILLON DE FICHE D'ASSIETTE ([[D-251]] §5, lot 4) — pur,
// sans base ni réseau.
//
// CE QUE LA VOIE D'INGESTION ACCEPTE : un brouillon, déposé par l'outil hors
// ligne (lot 5). Jamais une validation. `DC-16` veut que le brouillon et la
// validation ne partagent « jamais le même statut, jamais le même chemin » :
// tout champ d'acte, de validateur ou d'état est REFUSÉ ici, nommément, plutôt
// qu'ignoré — un champ ignoré laisserait croire à l'outil qu'il a validé.
//
// UN CONTRAT FERMÉ À CHAQUE NIVEAU. Le contenu est rangé tel quel en base, puis
// servi au patient après validation : une clé inconnue, à quelque profondeur
// que ce soit, serait un texte que personne n'a relu. Le contrat rebâtit donc
// le contenu champ par champ, et refuse ce qu'il ne connaît pas.
//
// CE QUE CE MODULE NE JUGE PAS : le fond. Nombres hors source, verbatim
// introuvable, précautions manquantes, lexique — c'est `controlerFiche`
// (invariants.ts), rejoué par l'ingestion après ce contrat.

import { ficheSourceDeLAssiette } from './appariement';
import type { BlocFiche, ContenuFicheAssiette, PrecautionFiche, SectionFiche } from './types';

/** Une faute de contrat : la route la rend en 422, avec ce message. */
export class ErreurContratFiche extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurContratFiche';
  }
}

export type BrouillonFiche = {
  sourceId: string;
  plateCode: string;
  contenu: ContenuFicheAssiette;
  /** Le texte extrait du PDF — la référence de la relecture côte à côte. */
  texteSource: string;
  /**
   * L'empreinte du PDF source, relevée par l'outil dans le manifeste local du
   * snapshot ([[D-251]] §3). Le serveur n'a pas le PDF : il la porte, il ne
   * peut pas la recalculer. La relecture la confronte au manifeste.
   */
  sourceSha256: string;
  modeleRedaction: string;
  modeleFidelite: string;
  versionConsigne: string;
};

const CHAMPS_DU_BROUILLON: readonly string[] = [
  'sourceId',
  'plateCode',
  'contenu',
  'texteSource',
  'sourceSha256',
  'modeleRedaction',
  'modeleFidelite',
  'versionConsigne',
];

/**
 * Les champs d'un ACTE ou d'un état — ceux de `fiches_assiette_actes`, et les
 * formes qu'un appelant pourrait leur donner. Refusés avec leur motif.
 */
const CHAMPS_DE_VALIDATION: readonly string[] = [
  'idVersion',
  'ordre',
  'acte',
  'validateur',
  'relectureIntegrale',
  'motif',
  'confirmationRegistre',
  'statut',
  'valide',
  'validee',
  'valideLe',
  'le',
];

/** Posés par le serveur ou par la base, jamais par l'appelant. */
const CHAMPS_DU_SERVEUR: readonly string[] = ['id', 'numero', 'contenuSha256', 'creeLe'];

/**
 * CHIFFRES TECHNIQUES, PAS DES SEUILS (`DC-20`) : des bornes de taille contre un
 * dépôt démesuré. Une Fiche MY tient en une ou deux pages, quelques milliers de
 * caractères ; ces bornes en laissent des dizaines de fois plus, et ne décident
 * de rien de clinique.
 */
export const TEXTE_SOURCE_MAX = 200_000;
export const CONTENU_SERIALISE_MAX = 200_000;
export const CHAMP_COURT_MAX = 200;

const RE_SOURCE = /^WN-SRC-\d{4}$/;
const RE_SHA256 = /^[0-9a-f]{64}$/;

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function clesFermees(objet: Record<string, unknown>, permises: readonly string[], ou: string): void {
  for (const cle of Object.keys(objet)) {
    if (!permises.includes(cle)) throw new ErreurContratFiche(`${ou} : champ inconnu « ${cle} ».`);
  }
}

function texte(valeur: unknown, ou: string): string {
  if (typeof valeur !== 'string') throw new ErreurContratFiche(`${ou} : une chaîne est attendue.`);
  return valeur;
}

function liste(valeur: unknown, ou: string): unknown[] {
  if (!Array.isArray(valeur)) throw new ErreurContratFiche(`${ou} : une liste est attendue.`);
  return valeur;
}

function clesDeClaims(valeur: unknown, ou: string): string[] {
  return liste(valeur, ou).map((cle, i) => texte(cle, `${ou} ${i + 1}`));
}

function champCourt(valeur: unknown, nom: string): string {
  const v = texte(valeur, nom);
  if (!/\S/u.test(v)) throw new ErreurContratFiche(`${nom} : vide.`);
  if (v.length > CHAMP_COURT_MAX) throw new ErreurContratFiche(`${nom} : trop long.`);
  return v;
}

function lirePrecaution(valeur: unknown, rang: number): PrecautionFiche {
  const ou = `précaution ${rang + 1}`;
  if (!estObjet(valeur)) throw new ErreurContratFiche(`${ou} : un objet est attendu.`);
  clesFermees(valeur, ['texte', 'claims'], ou);
  return { texte: texte(valeur.texte, `${ou}, texte`), claims: clesDeClaims(valeur.claims, `${ou}, claim`) };
}

function lireBloc(valeur: unknown, ou: string): BlocFiche {
  if (!estObjet(valeur)) throw new ErreurContratFiche(`${ou} : un objet est attendu.`);
  clesFermees(valeur, ['texte', 'provenance'], ou);
  const provenance = valeur.provenance;
  if (!estObjet(provenance)) throw new ErreurContratFiche(`${ou} : aucune provenance.`);
  if (provenance.type === 'verbatim') {
    clesFermees(provenance, ['type'], `${ou}, provenance`);
    return { texte: texte(valeur.texte, `${ou}, texte`), provenance: { type: 'verbatim' } };
  }
  if (provenance.type === 'claims') {
    clesFermees(provenance, ['type', 'claims'], `${ou}, provenance`);
    return {
      texte: texte(valeur.texte, `${ou}, texte`),
      provenance: { type: 'claims', claims: clesDeClaims(provenance.claims, `${ou}, claim`) },
    };
  }
  throw new ErreurContratFiche(`${ou} : provenance inconnue (attendue : « verbatim » ou « claims »).`);
}

function lireSection(valeur: unknown, rang: number): SectionFiche {
  const ou = `section ${rang + 1}`;
  if (!estObjet(valeur)) throw new ErreurContratFiche(`${ou} : un objet est attendu.`);
  clesFermees(valeur, ['titre', 'blocs'], ou);
  const blocs = liste(valeur.blocs, `${ou}, blocs`);
  if (blocs.length === 0) throw new ErreurContratFiche(`${ou} : aucun bloc.`);
  return {
    titre: texte(valeur.titre, `${ou}, titre`),
    blocs: blocs.map((bloc, b) => lireBloc(bloc, `${ou}, bloc ${b + 1}`)),
  };
}

function lireContenu(valeur: unknown): ContenuFicheAssiette {
  if (!estObjet(valeur)) throw new ErreurContratFiche('contenu : un objet est attendu.');
  clesFermees(valeur, ['titre', 'precautions', 'sections'], 'contenu');
  const sections = liste(valeur.sections, 'contenu, sections');
  if (sections.length === 0) throw new ErreurContratFiche('contenu : aucune section.');
  return {
    titre: texte(valeur.titre, 'contenu, titre'),
    precautions: liste(valeur.precautions, 'contenu, précautions').map(lirePrecaution),
    sections: sections.map(lireSection),
  };
}

/**
 * Le brouillon, rebâti champ par champ — ou une `ErreurContratFiche`, à la
 * première faute. L'appariement assiette → fiche est rejoué ici : l'outil ne
 * peut pas déposer la fiche d'une assiette sous le code d'une autre.
 */
export function lireBrouillonFiche(brut: unknown): BrouillonFiche {
  if (!estObjet(brut)) throw new ErreurContratFiche('Le corps doit être un objet.');

  for (const cle of Object.keys(brut)) {
    if (CHAMPS_DE_VALIDATION.includes(cle)) {
      throw new ErreurContratFiche(
        `Champ refusé : « ${cle} ». La voie d'ingestion dépose un brouillon et ne valide jamais (DC-16) : ` +
          'la validation est un acte du responsable, posé par un autre chemin.',
      );
    }
    if (CHAMPS_DU_SERVEUR.includes(cle)) {
      throw new ErreurContratFiche(`Champ refusé : « ${cle} ». Il est posé par le serveur, jamais par l'appelant.`);
    }
  }
  clesFermees(brut, CHAMPS_DU_BROUILLON, 'brouillon');

  const sourceId = texte(brut.sourceId, 'sourceId');
  if (!RE_SOURCE.test(sourceId)) throw new ErreurContratFiche('sourceId : format attendu WN-SRC-nnnn.');
  const plateCode = texte(brut.plateCode, 'plateCode');
  const attendue = ficheSourceDeLAssiette(plateCode);
  if (attendue === null) {
    throw new ErreurContratFiche(`plateCode : « ${plateCode} » n'est pas une assiette d'indication qui ait une fiche.`);
  }
  if (attendue !== sourceId) {
    throw new ErreurContratFiche(`Appariement faux : la fiche de ${plateCode} est ${attendue}, pas ${sourceId}.`);
  }

  const texteSource = texte(brut.texteSource, 'texteSource');
  if (!/\S/u.test(texteSource)) throw new ErreurContratFiche('texteSource : vide.');
  if (texteSource.length > TEXTE_SOURCE_MAX) throw new ErreurContratFiche('texteSource : trop long.');

  const sourceSha256 = texte(brut.sourceSha256, 'sourceSha256');
  if (!RE_SHA256.test(sourceSha256)) {
    throw new ErreurContratFiche('sourceSha256 : 64 caractères hexadécimaux minuscules attendus.');
  }

  const modeleRedaction = champCourt(brut.modeleRedaction, 'modeleRedaction');
  const modeleFidelite = champCourt(brut.modeleFidelite, 'modeleFidelite');
  // « Un modèle rédige, un SECOND contre-lit » ([[D-251]] §5) : un modèle qui
  // se relit lui-même n'est pas une contre-lecture.
  if (modeleRedaction.trim().toLowerCase() === modeleFidelite.trim().toLowerCase()) {
    throw new ErreurContratFiche('modeleFidelite : la contre-lecture exige un second modèle, distinct du rédacteur.');
  }
  const versionConsigne = champCourt(brut.versionConsigne, 'versionConsigne');

  const contenu = lireContenu(brut.contenu);
  if (JSON.stringify(contenu).length > CONTENU_SERIALISE_MAX) throw new ErreurContratFiche('contenu : trop long.');

  return { sourceId, plateCode, contenu, texteSource, sourceSha256, modeleRedaction, modeleFidelite, versionConsigne };
}
