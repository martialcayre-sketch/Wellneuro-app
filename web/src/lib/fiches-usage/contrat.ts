// LE CONTRAT D'UN BROUILLON DE FICHE D'USAGE ET D'UN LIBELLÉ ([[D-314]] §3, §4)
// — pur, sans base ni réseau.
//
// CE QUE LA VOIE D'INGESTION ACCEPTE : un brouillon, déposé par l'outil hors
// ligne. Jamais une validation. `DC-16` veut que le brouillon et la validation
// ne partagent « jamais le même statut, jamais le même chemin » : tout champ
// d'acte, de validateur ou d'état est REFUSÉ ici, nommément, plutôt qu'ignoré —
// un champ ignoré laisserait croire à l'outil qu'il a validé.
//
// UN CONTRAT FERMÉ À CHAQUE NIVEAU, sur le patron des fiches d'assiette
// ([[D-251]] §5) : une clé inconnue serait un texte que personne n'a relu.
//
// CE QUE CE MODULE NE JUGE PAS : la conformité à la structure signée (fiche
// déclarée, rubriques attendues, structure du jour) — c'est `controle.ts`,
// rejoué par l'ingestion et par la décision.

import {
  estRubriqueFicheUsage,
  natureDuTerme,
  RE_FICHE_USAGE,
  type NatureLibelle,
  type RubriqueFicheUsage,
} from './vocabulaire';

/** Une faute de contrat : la route la rend en 422, avec ce message. */
export class ErreurContratFicheUsage extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurContratFicheUsage';
  }
}

/** Le texte d'une version : une entrée par rubrique de la liste fermée. */
export type ContenuFicheUsage = Partial<Record<RubriqueFicheUsage, string>>;

export type BrouillonVersionUsage = {
  ficheId: string;
  contenu: ContenuFicheUsage;
  /** L'empreinte de la structure signée que ce texte rédige (arbitrage 10). */
  structureSha256: string;
  modeleRedaction: string;
  modeleContreLecture: string;
  versionConsigne: string;
};

export type BrouillonLibelle = {
  termeId: string;
  /** Déduite du préfixe du terme, jamais fournie par l'appelant. */
  nature: NatureLibelle;
  libelle: string;
  /** L'empreinte de la structure signée qui déclare ce terme (arbitrage 15). */
  structureSha256: string;
  modeleRedaction: string;
  modeleContreLecture: string;
  versionConsigne: string;
};

const CHAMPS_VERSION: readonly string[] = [
  'ficheId',
  'contenu',
  'structureSha256',
  'modeleRedaction',
  'modeleContreLecture',
  'versionConsigne',
];

const CHAMPS_LIBELLE: readonly string[] = [
  'termeId',
  'libelle',
  'structureSha256',
  'modeleRedaction',
  'modeleContreLecture',
  'versionConsigne',
];

/**
 * Les champs d'un ACTE ou d'un état — ceux des tables d'actes, et les formes
 * qu'un appelant pourrait leur donner. Refusés avec leur motif.
 */
const CHAMPS_DE_VALIDATION: readonly string[] = [
  'idVersion',
  'idLibelle',
  'ordre',
  'acte',
  'actes',
  'validateur',
  'relectureIntegrale',
  'motif',
  'empreinte',
  'statut',
  'etat',
  'valide',
  'validee',
  'valideLe',
  'le',
];

/** Posés par le serveur ou par la base, jamais par l'appelant. */
const CHAMPS_DU_SERVEUR: readonly string[] = ['id', 'numero', 'creeLe', 'libelleSha256', 'nature'];

/**
 * CHIFFRES TECHNIQUES, PAS DES SEUILS (`DC-20`) : des bornes de taille contre un
 * dépôt démesuré. Une rubrique tient en quelques paragraphes, un libellé en une
 * ligne ; ces bornes en laissent des dizaines de fois plus, et ne décident de
 * rien de clinique.
 */
export const RUBRIQUE_MAX = 20_000;
export const LIBELLE_MAX = 300;
export const CHAMP_COURT_MAX = 200;

const RE_SHA256 = /^[0-9a-f]{64}$/;
/** Une balise HTML ouvrante ou fermante : le texte est rendu tel quel, jamais interprété. */
const RE_BALISE = /<\/?[a-zA-Z][^>]*>/;

function estObjet(valeur: unknown): valeur is Record<string, unknown> {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur);
}

function refuserChampsInterdits(brut: Record<string, unknown>): void {
  for (const cle of Object.keys(brut)) {
    if (CHAMPS_DE_VALIDATION.includes(cle)) {
      throw new ErreurContratFicheUsage(
        `Champ refusé : « ${cle} ». La voie d'ingestion dépose un brouillon et ne valide jamais (DC-16) : ` +
          'la validation est un acte du responsable, posé par un autre chemin.',
      );
    }
    if (CHAMPS_DU_SERVEUR.includes(cle)) {
      throw new ErreurContratFicheUsage(`Champ refusé : « ${cle} ». Il est posé par le serveur, jamais par l'appelant.`);
    }
  }
}

function clesFermees(objet: Record<string, unknown>, permises: readonly string[], ou: string): void {
  for (const cle of Object.keys(objet)) {
    if (!permises.includes(cle)) throw new ErreurContratFicheUsage(`${ou} : champ inconnu « ${cle} ».`);
  }
}

function texte(valeur: unknown, ou: string): string {
  if (typeof valeur !== 'string') throw new ErreurContratFicheUsage(`${ou} : une chaîne est attendue.`);
  return valeur;
}

function texteRedige(valeur: unknown, ou: string, max: number): string {
  const v = texte(valeur, ou);
  if (!/\S/u.test(v)) throw new ErreurContratFicheUsage(`${ou} : vide.`);
  if (v.length > max) throw new ErreurContratFicheUsage(`${ou} : trop long.`);
  if (RE_BALISE.test(v)) throw new ErreurContratFicheUsage(`${ou} : balisage refusé, le texte est rendu tel quel.`);
  return v;
}

function champCourt(valeur: unknown, nom: string): string {
  const v = texte(valeur, nom);
  if (!/\S/u.test(v)) throw new ErreurContratFicheUsage(`${nom} : vide.`);
  if (v.length > CHAMP_COURT_MAX) throw new ErreurContratFicheUsage(`${nom} : trop long.`);
  return v;
}

function empreinteStructure(valeur: unknown): string {
  const v = texte(valeur, 'structureSha256');
  if (!RE_SHA256.test(v)) {
    throw new ErreurContratFicheUsage('structureSha256 : 64 caractères hexadécimaux minuscules attendus.');
  }
  return v;
}

function modeles(brut: Record<string, unknown>): { modeleRedaction: string; modeleContreLecture: string; versionConsigne: string } {
  const modeleRedaction = champCourt(brut.modeleRedaction, 'modeleRedaction');
  const modeleContreLecture = champCourt(brut.modeleContreLecture, 'modeleContreLecture');
  // « Un modèle rédige, un SECOND contre-lit » (D-314 §4) : un modèle qui se
  // relit lui-même n'est pas une contre-lecture.
  if (modeleRedaction.trim().toLowerCase() === modeleContreLecture.trim().toLowerCase()) {
    throw new ErreurContratFicheUsage('modeleContreLecture : la contre-lecture exige un second modèle, distinct du rédacteur.');
  }
  return { modeleRedaction, modeleContreLecture, versionConsigne: champCourt(brut.versionConsigne, 'versionConsigne') };
}

/**
 * Le contenu d'une version, rebâti rubrique par rubrique — ou une
 * `ErreurContratFicheUsage`. Rejoué sur le JSON rangé en base avant toute
 * validation : ce qui n'a pas été écrit par ce contrat ne se relit pas comme
 * s'il l'avait été.
 */
export function lireContenuFicheUsage(valeur: unknown): ContenuFicheUsage {
  if (!estObjet(valeur)) throw new ErreurContratFicheUsage('contenu : un objet est attendu.');
  const contenu: ContenuFicheUsage = {};
  for (const [cle, texteBrut] of Object.entries(valeur)) {
    if (!estRubriqueFicheUsage(cle)) {
      throw new ErreurContratFicheUsage(`contenu : rubrique inconnue « ${cle} » (liste fermée, D-314 §8).`);
    }
    contenu[cle] = texteRedige(texteBrut, `contenu, ${cle}`, RUBRIQUE_MAX);
  }
  if (Object.keys(contenu).length === 0) throw new ErreurContratFicheUsage('contenu : aucune rubrique.');
  return contenu;
}

/** Le brouillon d'une version, rebâti champ par champ — ou une `ErreurContratFicheUsage`. */
export function lireBrouillonVersionUsage(brut: unknown): BrouillonVersionUsage {
  if (!estObjet(brut)) throw new ErreurContratFicheUsage('Le corps doit être un objet.');
  refuserChampsInterdits(brut);
  clesFermees(brut, CHAMPS_VERSION, 'brouillon');
  const ficheId = texte(brut.ficheId, 'ficheId');
  if (!RE_FICHE_USAGE.test(ficheId)) throw new ErreurContratFicheUsage('ficheId : format attendu FU_….');
  return {
    ficheId,
    contenu: lireContenuFicheUsage(brut.contenu),
    structureSha256: empreinteStructure(brut.structureSha256),
    ...modeles(brut),
  };
}

/** Le brouillon d'un libellé, rebâti champ par champ — ou une `ErreurContratFicheUsage`. */
export function lireBrouillonLibelle(brut: unknown): BrouillonLibelle {
  if (!estObjet(brut)) throw new ErreurContratFicheUsage('Le corps doit être un objet.');
  refuserChampsInterdits(brut);
  clesFermees(brut, CHAMPS_LIBELLE, 'brouillon');
  const termeId = texte(brut.termeId, 'termeId');
  const nature = natureDuTerme(termeId);
  if (nature === null) throw new ErreurContratFicheUsage('termeId : format attendu HYP_… ou POP_….');
  return {
    termeId,
    nature,
    libelle: texteRedige(brut.libelle, 'libelle', LIBELLE_MAX),
    structureSha256: empreinteStructure(brut.structureSha256),
    ...modeles(brut),
  };
}
