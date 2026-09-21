import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  REPLIS_ASSIETTE_METADATA,
  REPLIS_ASSIETTE_V1,
  anomaliesDeLaLigneRepli,
  replisAssietteSignes,
  replisDepuis,
  replisServables,
  shaPerimetreReplisAssiette,
  type LigneRepliAssiette,
  type ReplisAssietteMetadata,
} from './replisAssietteV1';
import { INDICATIONS_ASSIETTES_V1 } from './indicationsAssiettesV1';

// LE VERROU DE LA TABLE DE REPLIS ([[D-241]]). Ce banc garde trois choses, et la
// troisième est la seule qui compte vraiment : que l'ÉTAT LIVRÉ — table vide,
// non signée, rien servi — tienne, et qu'une signature ne puisse pas s'acquérir
// par inadvertance. Les deux premières sont la mécanique qui le rend vrai.

/** Une indication réellement présente au dépôt — désignée, jamais inventée. */
const INDICATION = INDICATIONS_ASSIETTES_V1[0]?.id ?? 'ASSIETTE-IND-INTROUVABLE';

function ligne(over: Partial<LigneRepliAssiette> = {}): LigneRepliAssiette {
  return {
    id: 'REPLI-FIXTURE-1',
    depuis: 'ASSIETTE_DOPAMINERGIQUE',
    vers: 'ASSIETTE_SEROTONINERGIQUE',
    indication: INDICATION,
    degre: 'acceptable',
    raccourciAssume: 'Affirmation de fixture, assumée pour le banc.',
    statut: 'publiee',
    ...over,
  };
}

/** Signature CALCULÉE dans le banc — jamais la métadonnée réelle ([[D-225]]). */
function signeePour(lignes: readonly LigneRepliAssiette[]): ReplisAssietteMetadata {
  return {
    validationExterne: true,
    dateValidation: '2026-09-21T22:00:00.000Z',
    shaPerimetre: shaPerimetreReplisAssiette(lignes),
  };
}

describe('L’ÉTAT LIVRÉ — la table est vide, non signée, et ne sert rien', () => {
  it('aucune ligne n’est écrite, et c’est l’état NOMINAL', () => {
    // Une ligne ici serait une affirmation clinique qu'aucun claim ne fonde :
    // le corpus décrit l'inclusion, l'association et la parenté de modèle, qui
    // sont l'inverse logique de l'échange. La déclarer appartient au praticien.
    expect(REPLIS_ASSIETTE_V1).toEqual([]);
  });

  it('la métadonnée n’atteste RIEN, et ses trois termes le disent', () => {
    expect(REPLIS_ASSIETTE_METADATA.validationExterne).toBe(false);
    expect(REPLIS_ASSIETTE_METADATA.dateValidation).toBeNull();
    expect(REPLIS_ASSIETTE_METADATA.shaPerimetre).toBeNull();
  });

  it('le verrou est FERMÉ et le service VIDE — sur la table réelle, pas une fixture', () => {
    expect(replisAssietteSignes()).toBe(false);
    expect(replisServables()).toEqual([]);
    expect(replisDepuis('ASSIETTE_DOPAMINERGIQUE')).toEqual([]);
  });

  it('ON NE SIGNE PAS UNE ABSENCE : une table vide reste non signée même sous une signature valide', () => {
    // Le piège serait de laisser une métadonnée complète « couvrir » le vide :
    // la table deviendrait signée sans que personne n'ait rien relu, et la
    // première ligne ajoutée entrerait sous une attestation acquise.
    expect(replisAssietteSignes(signeePour([]), [])).toBe(false);
  });
});

describe('Le verrou — chaque terme ferme, et aucun ne se supplée', () => {
  it('accepte une table bien formée sous une signature calculée', () => {
    const lignes = [ligne()];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(true);
    expect(replisServables(signeePour(lignes), lignes)).toEqual(lignes);
  });

  it('refuse sans validation externe, sans date, sans sha, ou sur un sha qui ne correspond pas', () => {
    const lignes = [ligne()];
    const bonne = signeePour(lignes);
    expect(replisAssietteSignes({ ...bonne, validationExterne: false }, lignes)).toBe(false);
    expect(replisAssietteSignes({ ...bonne, dateValidation: null }, lignes)).toBe(false);
    expect(replisAssietteSignes({ ...bonne, shaPerimetre: null }, lignes)).toBe(false);
    expect(replisAssietteSignes({ ...bonne, shaPerimetre: 'a'.repeat(64) }, lignes)).toBe(false);
  });

  it('UNE DATE D’ATTESTATION SE VÉRIFIE — constat de revue, et les deux tables sœurs le faisaient déjà', () => {
    // La première rédaction n'exigeait que `!== null` : une métadonnée portant
    // `validationExterne: true`, une date illisible et le BON sha ouvrait la
    // table. Une date d'attestation qu'on ne peut pas lire n'atteste rien.
    const lignes = [ligne()];
    const bonne = signeePour(lignes);
    for (const date of ['pas une date', '2026-09-21', '2026-13-45T00:00:00.000Z', '']) {
      expect(replisAssietteSignes({ ...bonne, dateValidation: date }, lignes)).toBe(false);
    }
    // Et un verrou FERME au lieu de jeter, même sur une date invalide.
    expect(() => replisAssietteSignes({ ...bonne, dateValidation: 'pas une date' }, lignes)).not.toThrow();
  });

  it('LE PÉRIMÈTRE PORTE LES LIGNES EN ENTIER — une ligne retouchée périme l’attestation', () => {
    const lignes = [ligne()];
    const signature = signeePour(lignes);
    const retouchee = [ligne({ degre: 'dernier_recours' })];
    // Le degré n'est pas un détail de présentation : il change ce qui est
    // attesté. Le sha doit donc bouger avec lui.
    expect(shaPerimetreReplisAssiette(retouchee)).not.toBe(signature.shaPerimetre);
    expect(replisAssietteSignes(signature, retouchee)).toBe(false);
    // Et le calcul est bien celui du module, pas une recopie du banc.
    expect(shaPerimetreReplisAssiette(lignes)).toBe(canonicalSha256({ lignes }));
  });

  it('refuse un identifiant de ligne en double', () => {
    const lignes = [ligne(), ligne({ vers: 'ASSIETTE_PSYCHOBIOTIQUE' })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(false);
  });

  it('une seule ligne anormale ferme le service ENTIER, jamais la seule fautive', () => {
    const lignes = [ligne(), ligne({ id: 'REPLI-FIXTURE-2', depuis: 'ASSIETTE_INCONNUE' })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(false);
    expect(replisServables(signeePour(lignes), lignes)).toEqual([]);
  });

  it('un BROUILLON est signé avec la table mais jamais servi', () => {
    const lignes = [ligne(), ligne({ id: 'REPLI-FIXTURE-2', vers: 'ASSIETTE_PSYCHOBIOTIQUE', statut: 'brouillon' })];
    expect(replisAssietteSignes(signeePour(lignes), lignes)).toBe(true);
    expect(replisServables(signeePour(lignes), lignes)).toHaveLength(1);
  });
});

describe('Les anomalies — ce qu’une ligne ne peut pas être', () => {
  it('accepte la ligne de fixture, sans quoi tous les cas suivants seraient vains', () => {
    expect(anomaliesDeLaLigneRepli(ligne())).toEqual([]);
  });

  it('refuse une assiette qui se replie sur elle-même — la direction serait vide', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ vers: 'ASSIETTE_DOPAMINERGIQUE' })))
      .toContain('une assiette ne se replie pas sur elle-même');
  });

  it('refuse une assiette absente du catalogue, aux deux bouts', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ depuis: 'ASSIETTE_QUI_N_EXISTE_PAS' })).join(' '))
      .toMatch(/« depuis » absente du catalogue/);
    expect(anomaliesDeLaLigneRepli(ligne({ vers: 'ASSIETTE_QUI_N_EXISTE_PAS' })).join(' '))
      .toMatch(/« vers » absente du catalogue/);
  });

  it('refuse un repère de MOMENT DE REPAS aux deux bouts — il ne se prescrit pas', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ depuis: 'ASSIETTE_SOIR_LEGER' })).join(' '))
      .toMatch(/« depuis » hors de l’axe d’indication/);
    expect(anomaliesDeLaLigneRepli(ligne({ vers: 'ASSIETTE_SOIR_LEGER' })).join(' '))
      .toMatch(/« vers » hors de l’axe d’indication/);
  });

  it('refuse une indication que la table signée ne porte pas', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ indication: 'ASSIETTE-IND-INVENTEE' })).join(' '))
      .toMatch(/indication inconnue/);
  });

  it('refuse un raccourci assumé absent — aucune ligne ne va de soi', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ raccourciAssume: '   ' })))
      .toContain('raccourci assumé absent');
  });

  it('refuse un degré et un statut inconnus', () => {
    expect(anomaliesDeLaLigneRepli(ligne({ degre: 'tres_proche' as LigneRepliAssiette['degre'] })).join(' '))
      .toMatch(/degré de repli inconnu/);
    expect(anomaliesDeLaLigneRepli(ligne({ statut: 'retiree' as LigneRepliAssiette['statut'] })).join(' '))
      .toMatch(/statut inconnu/);
  });
});

describe('La direction se lit dans un seul sens', () => {
  it('`replisDepuis` ne rend jamais la ligne inverse', () => {
    const lignes = [ligne()];
    const servables = replisServables(signeePour(lignes), lignes);
    expect(replisDepuis('ASSIETTE_DOPAMINERGIQUE', servables)).toHaveLength(1);
    // Sans une seconde ligne écrite et attestée, l'inverse n'existe pas.
    expect(replisDepuis('ASSIETTE_SEROTONINERGIQUE', servables)).toEqual([]);
  });
});
