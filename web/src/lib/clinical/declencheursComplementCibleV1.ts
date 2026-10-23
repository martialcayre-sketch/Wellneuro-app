import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import { SITUATIONS_COMPLEMENT, type SituationComplement } from '@/lib/clinical-engine/complementCible';

// LES DÉCLENCHEURS DU COURRIER AVANT UN COMPLÉMENT CIBLÉ — [[D-345]] §2,
// J3-12h, lot 1 (G1 de la fiche de cadrage).
//
// CE QUE LA TABLE PORTE. Un complément marqué « ciblé » n'entre au programme
// d'une personne visée qu'après la remise tracée d'un courrier au médecin.
// Une ligne par déclencheur : sa nature (une population, ou une situation
// propre à un nutriment), sa portée, et SA PROVENANCE — aucune ligne sans
// elle (`DC-01`, `DC-19`). Le type l'exige, le verrou la vérifie.
//
// FORME OPAQUE ([[D-285]]). Les situations sont des identifiants ; leurs
// libellés, et le claim qui adosse l'une d'elles, restent au dossier de preuve
// privé. Le dépôt est public : relier un claim à une situation y publierait
// une conduite (P0-1 de la contre-revue du cadrage). La provenance dit QUELLE
// position signée porte la ligne, jamais ce qu'elle énonce.
//
// AUCUN SEUIL, AUCUNE DOSE, AUCUNE DURÉE. La table ne compare aucun nombre :
// elle nomme qui est visé. L'âge de la majorité est le seuil JURIDIQUE de
// `patient/gardeAge.ts`, pas un seuil de cette table.
//
// UNE LIGNE DE CETTE TABLE EST UNE MODIFICATION CLINIQUE (`DC-17`) : elle
// appelle une décision `D-xxx`, un fragment `changelog.d/` et une nouvelle
// signature — le périmètre se hache en entier.

export type IdPopulation = 'mineur' | 'grossesse' | 'allaitement';
export type IdDeclencheur = IdPopulation | SituationComplement;

export type ProvenanceDeclencheur = {
  nature: 'regle_responsable' | 'decision' | 'position_expert';
  /** Ce qui porte la ligne, en forme opaque : texte daté, décision, position signée. */
  reference: string;
  /** Date de la règle, de la décision ou de la signature de la position (AAAA-MM-JJ). */
  date: string;
};

export type LigneDeclencheur = {
  id: IdDeclencheur;
  nature: 'population' | 'situation';
  /** Une population vise tout complément ciblé ; une situation, un nutriment. */
  portee: 'tous_nutriments' | 'magnesium';
  provenance: readonly ProvenanceDeclencheur[];
};

const REGLE_DU_2026_10_17: ProvenanceDeclencheur = {
  nature: 'regle_responsable',
  reference: 'Règle du responsable du 2026-10-17 (fiche H15) : mineur, grossesse, allaitement — '
    + 'un complément ciblé n’entre au programme qu’après la remise tracée d’un courrier au médecin, '
    + 'sans attendre sa réponse.',
  date: '2026-10-17',
};

export const DECLENCHEURS_COMPLEMENT_V1: readonly LigneDeclencheur[] = [
  {
    id: 'mineur',
    nature: 'population',
    portee: 'tous_nutriments',
    provenance: [
      REGLE_DU_2026_10_17,
      {
        nature: 'decision',
        reference: 'D-284 §4 (pause du mineur), étendue au complément ciblé par D-345 §3 : refus '
          + 'jusqu’au circuit J3-mineurs, quel que soit le courrier.',
        date: '2026-10-22',
      },
    ],
  },
  {
    id: 'grossesse',
    nature: 'population',
    portee: 'tous_nutriments',
    provenance: [
      REGLE_DU_2026_10_17,
      {
        nature: 'position_expert',
        reference: 'Dossier du fer (BP-07), position P5 v0.3 : destinataire du courrier, le '
          + 'professionnel qui suit la grossesse, à défaut le médecin traitant.',
        date: '2026-10-21',
      },
    ],
  },
  {
    id: 'allaitement',
    nature: 'population',
    portee: 'tous_nutriments',
    provenance: [REGLE_DU_2026_10_17],
  },
  {
    id: 'S-MG-1',
    nature: 'situation',
    portee: 'magnesium',
    provenance: [{
      nature: 'position_expert',
      reference: 'Dossier du magnésium érythrocytaire, position P6 v0.4 §2 (décision du '
        + '2026-10-22), adossée à un claim signé du dossier privé.',
      date: '2026-10-23',
    }],
  },
  {
    id: 'S-MG-2',
    nature: 'situation',
    portee: 'magnesium',
    provenance: [{
      nature: 'position_expert',
      reference: 'Dossier du magnésium érythrocytaire, position P6 v0.4 §2 (décision Q6 du '
        + '2026-10-22 : courrier, puis complément), position d’expert sans claim.',
      date: '2026-10-23',
    }],
  },
];

export type DeclencheursMetadata = {
  validationExterne: boolean;
  dateValidation: string | null;
  /**
   * SURTOUT PAS la constante recalculée : la comparaison deviendrait
   * tautologique — recalculée à chaque chargement des deux côtés — et toute
   * ligne ajoutée entrerait sous une signature acquise. Un littéral de 64 hex,
   * recopié à la main le jour de l'attestation.
   */
  shaPerimetre: string | null;
};

/**
 * LE PÉRIMÈTRE SIGNÉ : les lignes EN ENTIER, provenance comprise — patron
 * `shaPerimetreConduites`. Une provenance retouchée sous une signature acquise
 * périmerait l'attestation sans que rien ne le dise. `canonicalSha256` trie les
 * clés : déplacer un champ ne change pas le sha.
 *
 * EXPORTÉE pour que les bancs CALCULENT au lieu de recopier.
 */
export function shaPerimetreDeclencheurs(lignes: readonly LigneDeclencheur[]): string {
  return canonicalSha256({ lignes });
}

/**
 * MÉTADONNÉE NON SIGNÉE — verrou éteint jusqu'à la déclaration du responsable
 * ([[D-195]] §1). Tant qu'elle l'est, la garde rend `table_non_signee` pour
 * tout complément ciblé : fail-closed, jamais « un défaut raisonnable ».
 */
export const DECLENCHEURS_COMPLEMENT_METADATA: DeclencheursMetadata = {
  validationExterne: false,
  dateValidation: null,
  shaPerimetre: null,
};

const POPULATIONS: readonly IdPopulation[] = ['allaitement', 'grossesse', 'mineur'];

function estIsoCanonique(valeur: string | null): valeur is string {
  if (valeur === null) return false;
  const date = new Date(valeur);
  // `getTime()` D'ABORD : `toISOString()` jette sur une date invalide, et un
  // verrou doit fermer, jamais jeter.
  if (Number.isNaN(date.getTime())) return false;
  return date.toISOString() === valeur;
}

function estJourIso(valeur: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(valeur) && estIsoCanonique(`${valeur}T00:00:00.000Z`);
}

function memesIds(gauche: readonly string[], droite: readonly string[]): boolean {
  const a = [...gauche].sort();
  const b = [...droite].sort();
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

/**
 * LE VERROU, et chacun de ses termes ferme un chemin distinct.
 *
 * LES IDENTIFIANTS SONT EXACTEMENT CEUX QUE LA GARDE LIT. Une ligne
 * « grossesse » retirée ne doit pas éteindre la garde en silence : les trois
 * populations sont exigées, et les situations sont exactement
 * `SITUATIONS_COMPLEMENT` — la liste que le contrat du protocole accepte. Une
 * situation déclarable sans ligne serait un déclencheur sans provenance.
 *
 * SIGNER ZÉRO LIGNE N'ATTESTE AUCUNE RELECTURE : la table vide ferme.
 */
export function tableDeclencheursSignee(
  signature: DeclencheursMetadata,
  lignes: readonly LigneDeclencheur[] = DECLENCHEURS_COMPLEMENT_V1,
): boolean {
  if (signature.validationExterne !== true) return false;
  if (!estIsoCanonique(signature.dateValidation)) return false;
  if (lignes.length === 0) return false;
  if (new Set(lignes.map(ligne => ligne.id)).size !== lignes.length) return false;
  const provenanceValide = (provenance: ProvenanceDeclencheur) =>
    provenance.reference.trim().length > 0 && estJourIso(provenance.date);
  if (lignes.some(ligne => ligne.provenance.length === 0 || !ligne.provenance.every(provenanceValide))) {
    return false;
  }
  const populations = lignes.filter(ligne => ligne.nature === 'population');
  const situations = lignes.filter(ligne => ligne.nature === 'situation');
  if (populations.some(ligne => ligne.portee !== 'tous_nutriments')) return false;
  if (!memesIds(populations.map(ligne => ligne.id), POPULATIONS)) return false;
  if (!memesIds(situations.map(ligne => ligne.id), SITUATIONS_COMPLEMENT)) return false;
  if (signature.shaPerimetre === null) return false;
  return signature.shaPerimetre === shaPerimetreDeclencheurs(lignes);
}
