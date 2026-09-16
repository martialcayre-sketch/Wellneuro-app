import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_CONDUITES_METADATA,
  CATALOGUE_CONDUITES_V1,
  catalogueConduitesSigne,
  lignesConduitesServables,
  shaPerimetreConduites,
  type CatalogueConduitesMetadata,
  type LigneConduite,
} from './catalogueConduitesV1';

// Banc de garde du catalogue de conduites ([[D-206]], LOT-01).
//
// CE QU'IL DOIT EMPÊCHER, et c'est sa seule raison d'être : qu'une ligne non
// attestée atteigne la production. Chaque terme du verrou est donc falsifié
// SÉPARÉMENT — un verrou dont on ne prouve que le cas vert est un verrou dont on
// ignore lequel de ses termes est mort.

const SOURCE = readFileSync(join(__dirname, 'catalogueConduitesV1.ts'), 'utf8');

const LIGNE: LigneConduite = {
  cleTableau: 'tableau_de_banc',
  sourceId: 'WN-SRC-0000',
  claimsIndication: [{ claimId: 'WN-CL-0000-001', versionClaim: 'v1', fonde: 'indication' }],
  raccourciAssume: null,
  statut: 'publiee',
};

// La fixture CALCULE son sha au lieu de le recopier : un périmètre élargi rougit
// alors ici ET dans le module, au lieu de laisser le banc prouver l'ancien
// périmètre pendant que la production sert le nouveau.
function signatureBanc(
  lignes: readonly LigneConduite[],
  sur: Partial<CatalogueConduitesMetadata> = {},
): CatalogueConduitesMetadata {
  const claimsSource = lignes.flatMap(ligne =>
    ligne.claimsIndication.map(claim => ({ claimId: claim.claimId, versionClaim: claim.versionClaim })),
  );
  const base: CatalogueConduitesMetadata = {
    validationExterne: true,
    dateValidation: '2026-09-16T00:00:00.000Z',
    claimsSource,
    shaPerimetre: shaPerimetreConduites(lignes, claimsSource),
  };
  return { ...base, ...sur };
}

describe('catalogue de conduites — état livré', () => {
  it('la table est VIDE, et sa métadonnée n’atteste rien', () => {
    expect(CATALOGUE_CONDUITES_V1).toEqual([]);
    expect(CATALOGUE_CONDUITES_METADATA.validationExterne).toBe(false);
    expect(CATALOGUE_CONDUITES_METADATA.dateValidation).toBeNull();
    expect(CATALOGUE_CONDUITES_METADATA.claimsSource).toEqual([]);
    expect(CATALOGUE_CONDUITES_METADATA.shaPerimetre).toBeNull();
  });

  it('rien n’est servable aujourd’hui', () => {
    expect(lignesConduitesServables()).toEqual([]);
    expect(catalogueConduitesSigne(CATALOGUE_CONDUITES_METADATA)).toBe(false);
  });
});

describe('catalogue de conduites — les six termes du verrou, falsifiés un par un', () => {
  it('signé et complet : le verrou ouvre', () => {
    expect(catalogueConduitesSigne(signatureBanc([LIGNE]), [LIGNE])).toBe(true);
  });

  it('1. sans validation externe : fermé', () => {
    expect(catalogueConduitesSigne(signatureBanc([LIGNE], { validationExterne: false }), [LIGNE])).toBe(false);
  });

  it('2. date absente, non ISO, ou non canonique : fermé, et JAMAIS jeté', () => {
    for (const date of [null, 'pas-une-date', '2026-09-16', '2026-09-16T00:00:00Z']) {
      expect(() =>
        catalogueConduitesSigne(signatureBanc([LIGNE], { dateValidation: date }), [LIGNE]),
      ).not.toThrow();
      expect(catalogueConduitesSigne(signatureBanc([LIGNE], { dateValidation: date }), [LIGNE])).toBe(false);
    }
  });

  // LE PIÈGE QUE L'ÉGALITÉ SEULE NE FERME PAS. Sur zéro ligne, l'union des claims
  // cités est ∅ et `claimsSource` est ∅ : l'égalité est SATISFAITE. Sans ce
  // terme, une table vide « parfaitement signée » passerait le verrou.
  it('3. table vide, par ailleurs signée sans faute : fermé', () => {
    const signature = signatureBanc([], { claimsSource: [], shaPerimetre: shaPerimetreConduites([], []) });
    expect(signature.validationExterne).toBe(true);
    expect(signature.shaPerimetre).toBe(shaPerimetreConduites([], []));
    expect(catalogueConduitesSigne(signature, [])).toBe(false);
  });

  it('4. aucun claim au périmètre relu : fermé', () => {
    const lignes = [{ ...LIGNE, claimsIndication: [] }];
    expect(catalogueConduitesSigne(signatureBanc(lignes), lignes)).toBe(false);
  });

  it('5. le périmètre relu diverge des claims cités, dans un sens comme dans l’autre : fermé', () => {
    // Un claim gardé qu'aucune ligne n'invoque.
    const enTrop = signatureBanc([LIGNE]);
    expect(catalogueConduitesSigne(
      { ...enTrop, claimsSource: [...enTrop.claimsSource, { claimId: 'WN-CL-0000-002', versionClaim: 'v1' }] },
      [LIGNE],
    )).toBe(false);

    // Un claim invoqué que le contrat de fraîcheur ne garderait pas.
    const deuxClaims: LigneConduite = {
      ...LIGNE,
      claimsIndication: [
        ...LIGNE.claimsIndication,
        { claimId: 'WN-CL-0000-002', versionClaim: 'v1', fonde: 'indication' },
      ],
    };
    expect(catalogueConduitesSigne({ ...enTrop, claimsSource: enTrop.claimsSource }, [deuxClaims])).toBe(false);

    // Une VERSION de claim qui change suffit — le périmètre est par paire.
    expect(catalogueConduitesSigne(
      { ...enTrop, claimsSource: [{ claimId: 'WN-CL-0000-001', versionClaim: 'v2' }] },
      [LIGNE],
    )).toBe(false);
  });

  it('6. une ligne retouchée APRÈS l’attestation périme la signature acquise', () => {
    const signature = signatureBanc([LIGNE]);
    expect(catalogueConduitesSigne(signature, [LIGNE])).toBe(true);

    // Le raccourci assumé est DANS le périmètre : le reformuler referme le
    // verrou. C'est toute la raison pour laquelle il est un champ et non un
    // commentaire.
    const reformule = [{ ...LIGNE, raccourciAssume: 'ajout que le claim ne fonde pas' }];
    expect(catalogueConduitesSigne(signature, reformule)).toBe(false);

    // Une ligne AJOUTÉE aussi — un périmètre signé se hache en entier.
    expect(catalogueConduitesSigne(signature, [LIGNE, { ...LIGNE, cleTableau: 'second_tableau' }])).toBe(false);
  });

  it('un sha nul ne vaut pas signature', () => {
    expect(catalogueConduitesSigne(signatureBanc([LIGNE], { shaPerimetre: null }), [LIGNE])).toBe(false);
  });

  // L'ORDRE DES CLÉS NE DOIT PAS PÉRIMER UNE ATTESTATION : c'est pourquoi le
  // périmètre passe par la forme canonique et non par `JSON.stringify`.
  it('réordonner les clés d’une ligne ne change pas le périmètre', () => {
    const reordonnee = {
      statut: LIGNE.statut,
      raccourciAssume: LIGNE.raccourciAssume,
      claimsIndication: LIGNE.claimsIndication,
      sourceId: LIGNE.sourceId,
      cleTableau: LIGNE.cleTableau,
    } as LigneConduite;
    expect(shaPerimetreConduites([reordonnee], [])).toBe(shaPerimetreConduites([LIGNE], []));
  });
});

describe('catalogue de conduites — le service est fail-closed', () => {
  it('non signé ⇒ liste vide, jamais un défaut raisonnable', () => {
    expect(lignesConduitesServables(signatureBanc([LIGNE], { validationExterne: false }), [LIGNE])).toEqual([]);
  });

  it('signé ⇒ les lignes publiées, et elles seules', () => {
    const brouillon: LigneConduite = { ...LIGNE, cleTableau: 'brouillon', statut: 'brouillon' };
    const lignes = [LIGNE, brouillon];
    expect(lignesConduitesServables(signatureBanc(lignes), lignes)).toEqual([LIGNE]);
  });
});

describe('catalogue de conduites — la doctrine tenue par la source', () => {
  // Le littéral et la tautologie rendent la MÊME chaîne à l'exécution : seule
  // une garde de source les distingue. Le fichier n'entre pas encore à
  // `shaPerimetreLitteral.guard.test.ts` — son `shaPerimetre` vaut `null`, la
  // première assertion de ce banc-là rougirait. Il y entrera le jour de la
  // première signature, exactement comme `baremeChargeV1.ts` à [[D-198]] et non
  // à [[D-196]]. En attendant, la doctrine est tenue ici.
  it('la mise en garde contre le sha tautologique reste écrite', () => {
    expect(SOURCE).toMatch(/SURTOUT PAS la constante recalculée/);
    expect(SOURCE).toMatch(/tautologique/);
  });

  it('aucune constante de sha exportée que la métadonnée pourrait recopier', () => {
    expect(SOURCE).not.toMatch(/export const CATALOGUE_CONDUITES_SHA256/);
  });

  it('le périmètre porte le bloc entier, jamais une sélection de champs', () => {
    expect(SOURCE).toMatch(/canonicalSha256\(\{ lignes, claimsSource \}\)/);
  });

  // Une ligne DÉSIGNE. Si un jour un champ de prose clinique apparaît, ce banc
  // doit rougir avant que le gate G6 ne soit franchi par inadvertance.
  it('aucun champ de prose clinique dans le type d’une ligne', () => {
    for (const interdit of ['texteConduite', 'verbatim', 'extrait', 'libelleClinique', 'planIdeal']) {
      expect(SOURCE).not.toMatch(new RegExp(`\\b${interdit}\\s*:`));
    }
  });
});
