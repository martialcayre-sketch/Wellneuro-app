import { describe, expect, it } from 'vitest';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  FICHES_USAGE_BESOIN2_METADATA,
  FICHES_USAGE_BESOIN2_V1,
  type FichesUsageMetadata,
  type StructureFichesUsage,
} from '@/lib/fiches-usage/ficheUsageBesoin2V1';
import {
  BIBLIOTHEQUE_BESOIN2_METADATA,
  BIBLIOTHEQUE_BESOIN2_SHA256,
  BIBLIOTHEQUE_BESOIN2_V1,
  bibliothequeSignee,
  etatBibliotheque,
  incoherencesDeBibliotheque,
  sourcesCitees,
  type BibliothequeMetadata,
  type OptionBibliotheque,
  type StructureBibliotheque,
} from './bibliothequeBesoin2V1';
import { RUBRIQUES_OPTION } from './vocabulaire';

// FIXTURES NEUTRES : identifiants synthétiques (`OPT_SYNTH_…`, `HYP_SYNTH`,
// `POP_SYNTH`, claims `WN-CL-9999-…`, position `WN-PE-9999`). Aucune option,
// aucun produit, aucune dose ni aucun texte clinique (porte 23, DC-11). Les
// seuls identifiants réels lus sont ceux du vocabulaire signé des fiches
// d'usage, pour la clé (D-480 §2).

const FU_SYNTH: StructureFichesUsage = {
  fiches: [],
  questions: [],
  hypotheses: ['HYP_SYNTH'],
  populations: ['POP_SYNTH'],
};

const renvoisVides = () =>
  Object.fromEntries(RUBRIQUES_OPTION.map(r => [r, [] as string[]])) as unknown as OptionBibliotheque['renvois'];

const OPTION: OptionBibliotheque = {
  id: 'OPT_SYNTH_1',
  hypothese: 'HYP_SYNTH',
  populations: ['POP_SYNTH'],
  renvois: {
    ...renvoisVides(),
    dose: ['information_manquante'],
    precautions: ['WN-CL-9999-001@v1.0'],
    surveillance: ['WN-PE-9999@v1.0'],
  },
};

const avec = (option: Partial<OptionBibliotheque>, reste: Partial<StructureBibliotheque> = {}): StructureBibliotheque => ({
  besoin: 2,
  options: [{ ...OPTION, ...option }],
  optionsRetirees: [],
  ...reste,
});

const empreinteDe = (structure: StructureBibliotheque) => sha256(JSON.stringify(structure));

/** Une signature recopiée sur la structure passée : les cinq termes tiennent. */
const signeeSur = (structure: StructureBibliotheque): BibliothequeMetadata => {
  const cites = sourcesCitees(structure);
  return {
    ...BIBLIOTHEQUE_BESOIN2_METADATA,
    validationExterne: true,
    dateValidation: '2026-11-11T12:00:00.000Z',
    claimsSource: cites.claims.map(c => {
      const [claimId, versionClaim] = c.split('@');
      return { claimId, versionClaim };
    }),
    positionsSource: cites.positions.map(p => {
      const [positionId, version] = p.split('@');
      return { positionId, version };
    }),
    shaPerimetre: empreinteDe(structure),
    shaFichesUsage: 'a'.repeat(64),
  };
};

const signee = (metadata: BibliothequeMetadata, structure: StructureBibliotheque) =>
  bibliothequeSignee(metadata, structure, FU_SYNTH);

describe('bibliothèque des options du besoin 2 — livrée vide et non signée (D-480 §3, §6)', () => {
  it('épingle l’empreinte de la structure vide', () => {
    expect(BIBLIOTHEQUE_BESOIN2_SHA256).toBe('c3113e329c2549d211dfceb0887a25e9c72c214952b3e348d6fc0cafd62375f4');
  });

  it('ne porte aucune option ni aucune signature : la signature est le geste du responsable (PR 7)', () => {
    expect(BIBLIOTHEQUE_BESOIN2_V1).toEqual({ besoin: 2, options: [], optionsRetirees: [] });
    expect(BIBLIOTHEQUE_BESOIN2_METADATA).toMatchObject({
      validationExterne: false,
      dateValidation: null,
      claimsSource: [],
      positionsSource: [],
      shaPerimetre: null,
      shaFichesUsage: null,
    });
    expect(incoherencesDeBibliotheque()).toEqual([]);
    expect(bibliothequeSignee()).toBe(false);
    expect(etatBibliotheque()).toBe('non_signee');
  });
});

describe('format de la structure (D-480 §1, §2, §4)', () => {
  it('une option conforme est cohérente', () => {
    expect(incoherencesDeBibliotheque(avec({}), FU_SYNTH)).toEqual([]);
  });

  it('une hypothèse non inscrite à la structure des fiches d’usage est refusée : HYP_FER_1 ne porte aucune option', () => {
    expect(FICHES_USAGE_BESOIN2_V1.hypotheses).not.toContain('HYP_FER_1');
    const populations = [FICHES_USAGE_BESOIN2_V1.populations[0]];
    expect(incoherencesDeBibliotheque(avec({ hypothese: 'HYP_FER_1', populations }), FICHES_USAGE_BESOIN2_V1)).toEqual([
      'OPT_SYNTH_1:hypothese',
    ]);
    // Contre-épreuve : une hypothèse inscrite passe.
    const inscrite = FICHES_USAGE_BESOIN2_V1.hypotheses[0];
    expect(incoherencesDeBibliotheque(avec({ hypothese: inscrite, populations }), FICHES_USAGE_BESOIN2_V1)).toEqual([]);
  });

  it('la population renvoie au vocabulaire des fiches d’usage : au moins une, déclarée, sans doublon', () => {
    expect(incoherencesDeBibliotheque(avec({ populations: [] }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:populations']);
    expect(incoherencesDeBibliotheque(avec({ populations: ['POP_AUTRE'] }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:populations']);
    expect(incoherencesDeBibliotheque(avec({ populations: ['POP_SYNTH', 'POP_SYNTH'] }), FU_SYNTH)).toEqual([
      'OPT_SYNTH_1:populations',
    ]);
  });

  it('un renvoi mal formé est refusé', () => {
    for (const renvoi of [
      '',
      'WN-CL-9999-001',
      'WN-CL-9999-001@1.0',
      'WN-CL-999-001@v1.0',
      'WN-PE-9999',
      'WN-PE-99@v1.0',
      'information manquante',
      ' WN-CL-9999-001@v1.0',
    ]) {
      expect(incoherencesDeBibliotheque(avec({ renvois: { ...OPTION.renvois, interactions: [renvoi] } }), FU_SYNTH), renvoi).toEqual([
        'OPT_SYNTH_1:interactions:renvoi',
      ]);
    }
    const double = { ...OPTION.renvois, interactions: ['WN-CL-9999-002@v1.0', 'WN-CL-9999-002@v1.0'] };
    expect(incoherencesDeBibliotheque(avec({ renvois: double }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:interactions:renvoi']);
    // Une valeur qui n'est pas une liste (JSON importé, cast) ferme le verrou (revue PR-Agent de #2006).
    const pasUneListe = { ...OPTION.renvois, dose: 'WN-CL-9999-001@v1.0' } as unknown as OptionBibliotheque['renvois'];
    expect(incoherencesDeBibliotheque(avec({ renvois: pasUneListe }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:dose:renvoi']);
  });

  it('« information manquante » vaut pour la dose seule, et seule', () => {
    const horsDose = { ...OPTION.renvois, duree: ['information_manquante'] };
    expect(incoherencesDeBibliotheque(avec({ renvois: horsDose }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:duree:information_manquante']);
    const avecSource = { ...OPTION.renvois, dose: ['information_manquante', 'WN-CL-9999-003@v1.0'] };
    expect(incoherencesDeBibliotheque(avec({ renvois: avecSource }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:dose:information_manquante']);
  });

  it('une rubrique hors liste est refusée, une rubrique absente aussi', () => {
    const horsListe = { ...OPTION.renvois, population: [] } as unknown as OptionBibliotheque['renvois'];
    expect(incoherencesDeBibliotheque(avec({ renvois: horsListe }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:rubriques']);
    const { role_praticien: _retiree, ...sansUne } = OPTION.renvois;
    expect(
      incoherencesDeBibliotheque(avec({ renvois: sansUne as unknown as OptionBibliotheque['renvois'] }), FU_SYNTH),
    ).toEqual(['OPT_SYNTH_1:rubriques']);
  });

  it('l’identifiant d’option suit son format, n’est porté qu’une fois et n’est jamais réattribué', () => {
    expect(incoherencesDeBibliotheque(avec({ id: 'opt_synth_1' }), FU_SYNTH)).toEqual(['opt_synth_1:format']);
    const long = `OPT_${'A'.repeat(125)}`;
    expect(long).toHaveLength(129);
    expect(incoherencesDeBibliotheque(avec({ id: long }), FU_SYNTH)).toEqual([`${long}:format`]);
    expect(incoherencesDeBibliotheque(avec({ id: long.slice(0, 128) }), FU_SYNTH)).toEqual([]);

    const deux: StructureBibliotheque = { besoin: 2, options: [OPTION, OPTION], optionsRetirees: [] };
    expect(incoherencesDeBibliotheque(deux, FU_SYNTH)).toEqual(['structure:option_en_double']);

    expect(incoherencesDeBibliotheque(avec({}, { optionsRetirees: ['OPT_SYNTH_1'] }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:reattribuee']);
    expect(incoherencesDeBibliotheque(avec({}, { optionsRetirees: ['OPT_SYNTH_9', 'OPT_SYNTH_9'] }), FU_SYNTH)).toEqual([
      'structure:options_retirees',
    ]);
  });

  it('une structure par besoin du guide', () => {
    for (const besoin of [0, -1, 2.5, 13]) {
      expect(incoherencesDeBibliotheque(avec({}, { besoin }), FU_SYNTH), String(besoin)).toEqual(['structure:besoin']);
    }
  });

  it('aucune option sans précautions documentées : non cohérente, donc non signable (D-480 §5.1)', () => {
    const sansPrecautions = { ...OPTION.renvois, precautions: [] };
    expect(incoherencesDeBibliotheque(avec({ renvois: sansPrecautions }), FU_SYNTH)).toEqual(['OPT_SYNTH_1:precautions']);
    // Les autres rubriques vides restent cohérentes ici : leur portée est un contrôle de la PR 4.
    expect(OPTION.renvois.duree).toEqual([]);
    expect(incoherencesDeBibliotheque(avec({}), FU_SYNTH)).toEqual([]);
  });

  it('un identifiant retiré suit le format des options', () => {
    expect(incoherencesDeBibliotheque(avec({}, { optionsRetirees: ['opt_synth_9'] }), FU_SYNTH)).toEqual([
      'structure:options_retirees',
    ]);
  });

  it('ni plus ni moins que les champs du format : une propriété en trop est refusée', () => {
    const enTrop = { ...OPTION, texte: 'X' } as unknown as OptionBibliotheque;
    expect(incoherencesDeBibliotheque({ besoin: 2, options: [enTrop], optionsRetirees: [] }, FU_SYNTH)).toEqual(['OPT_SYNTH_1:cles']);
    const structureEnTrop = { ...avec({}), version: 'X' } as unknown as StructureBibliotheque;
    expect(incoherencesDeBibliotheque(structureEnTrop, FU_SYNTH)).toEqual(['structure:cles']);
  });

  it('les sources citées sont l’union des renvois, information manquante exclue', () => {
    expect(sourcesCitees(avec({}))).toEqual({ claims: ['WN-CL-9999-001@v1.0'], positions: ['WN-PE-9999@v1.0'] });
  });
});

describe('signature à cinq termes (D-480 §6)', () => {
  const structure = avec({});

  it('les cinq termes tenus : signée', () => {
    expect(signee(signeeSur(structure), structure)).toBe(true);
  });

  it('une structure retouchée après signature n’est plus signée', () => {
    const metadata = signeeSur(structure);
    const retouchee = avec({ populations: ['POP_SYNTH'], renvois: { ...OPTION.renvois, interactions: ['WN-CL-9999-001@v1.0'] } });
    expect(empreinteDe(retouchee)).not.toBe(metadata.shaPerimetre);
    expect(signee(metadata, retouchee)).toBe(false);
  });

  it('l’empreinte et la cohérence sont celles de la structure jugée, jamais d’une autre (revue de #2006)', () => {
    // Même sources citées, structure retouchée hors des renvois : la signature
    // de l'ancienne ne vaut pas pour elle.
    const metadata = signeeSur(structure);
    const retiree = avec({}, { optionsRetirees: ['OPT_SYNTH_9'] });
    expect(sourcesCitees(retiree)).toEqual(sourcesCitees(structure));
    expect(signee(metadata, retiree)).toBe(false);
    // Appel avec la seule structure : les fiches d'usage du dépôt, où
    // `HYP_SYNTH` n'est pas inscrite, rendent la structure incohérente.
    expect(bibliothequeSignee(metadata, structure)).toBe(false);
  });

  it('verrou éteint, date absente ou hors forme ISO canonique : non signée', () => {
    const metadata = signeeSur(structure);
    expect(signee({ ...metadata, validationExterne: false }, structure)).toBe(false);
    expect(signee({ ...metadata, dateValidation: null }, structure)).toBe(false);
    expect(signee({ ...metadata, dateValidation: '2026-11-11' }, structure)).toBe(false);
    expect(signee({ ...metadata, dateValidation: 'pas une date' }, structure)).toBe(false);
  });

  it('claims ou positions déclarés différents des cités : non signée', () => {
    const metadata = signeeSur(structure);
    expect(signee({ ...metadata, claimsSource: [] }, structure)).toBe(false);
    expect(
      signee({ ...metadata, claimsSource: [...metadata.claimsSource, { claimId: 'WN-CL-9999-009', versionClaim: 'v1.0' }] }, structure),
    ).toBe(false);
    expect(signee({ ...metadata, positionsSource: [] }, structure)).toBe(false);
    expect(signee({ ...metadata, positionsSource: [{ positionId: 'WN-PE-9999', version: 'v1.1' }] }, structure)).toBe(false);
  });

  it('une structure incohérente ne l’est jamais, même verrou posé sur son empreinte', () => {
    const incoherente = avec({ hypothese: 'HYP_FER_1' });
    expect(signee(signeeSur(incoherente), incoherente)).toBe(false);
  });
});

describe('état : « à relire » après une re-signature des fiches d’usage (D-480 §2)', () => {
  const structure = avec({});
  /** Des fiches d'usage synthétiques signées sur leur propre empreinte. */
  const fichesSigneesSur = (fu: StructureFichesUsage): FichesUsageMetadata => ({
    ...FICHES_USAGE_BESOIN2_METADATA,
    validationExterne: true,
    dateValidation: '2026-11-11T09:00:00.000Z',
    claimsSource: [],
    shaPerimetre: sha256(JSON.stringify(fu)),
  });
  const metaFU = fichesSigneesSur(FU_SYNTH);
  const metadata = { ...signeeSur(structure), shaFichesUsage: sha256(JSON.stringify(FU_SYNTH)) };

  it('signée sur l’empreinte du jour des fiches d’usage signées : signée', () => {
    expect(etatBibliotheque(metadata, structure, FU_SYNTH, metaFU)).toBe('signee');
  });

  it('fiches d’usage re-signées sur une structure modifiée : à relire, sans réécriture', () => {
    const resignees: StructureFichesUsage = { ...FU_SYNTH, populations: ['POP_SYNTH', 'POP_AUTRE'] };
    expect(incoherencesDeBibliotheque(structure, resignees)).toEqual([]);
    expect(etatBibliotheque(metadata, structure, resignees, fichesSigneesSur(resignees))).toBe('a_relire');
  });

  it('fiches d’usage plus signées, ou empreinte jamais recopiée : à relire', () => {
    expect(etatBibliotheque(metadata, structure, FU_SYNTH, { ...metaFU, validationExterne: false })).toBe('a_relire');
    // Fiches d'usage incohérentes, même déclarées signées sur leur empreinte : à relire.
    const incoherentes: StructureFichesUsage = { ...FU_SYNTH, populations: ['POP_SYNTH', 'pas_une_population'] };
    const metaIncoherentes = { ...fichesSigneesSur(incoherentes) };
    const metaBib = { ...metadata, shaFichesUsage: sha256(JSON.stringify(incoherentes)) };
    expect(incoherencesDeBibliotheque(structure, incoherentes)).toEqual([]);
    expect(etatBibliotheque(metaBib, structure, incoherentes, metaIncoherentes)).toBe('a_relire');
    expect(etatBibliotheque({ ...metadata, shaFichesUsage: null }, structure, FU_SYNTH, metaFU)).toBe('a_relire');
  });

  it('non signée : non signée, quelles que soient les fiches d’usage', () => {
    expect(etatBibliotheque({ ...metadata, validationExterne: false }, structure, FU_SYNTH, metaFU)).toBe('non_signee');
    // Une signature d'une AUTRE structure ne se combine pas avec celle-ci.
    expect(etatBibliotheque(metadata, avec({}, { optionsRetirees: ['OPT_SYNTH_9'] }), FU_SYNTH, metaFU)).toBe('non_signee');
  });
});
