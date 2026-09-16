import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CATALOGUE_CONDUITES_METADATA,
  CATALOGUE_CONDUITES_V1,
  catalogueConduitesSigne,
  claimsDeLaLigne,
  cleClaim,
  lignesConduitesServables,
  shaPerimetreConduites,
  type CatalogueConduitesMetadata,
  type LigneConduite,
} from './catalogueConduitesV1';

// Banc de garde du catalogue de conduites ([[D-206]], LOT-01).
//
// CE QU'IL DOIT EMPÊCHER, et c'est sa seule raison d'être : qu'une ligne non
// attestée, ou fondée sur un claim qui ne l'est plus, atteigne la production.
// Chaque terme du verrou est donc falsifié SÉPARÉMENT — un verrou dont on ne
// prouve que le cas vert est un verrou dont on ignore lequel de ses termes est
// mort.

const SOURCE = readFileSync(join(__dirname, 'catalogueConduitesV1.ts'), 'utf8');

const LIGNE: LigneConduite = {
  cleTableau: 'tableau_de_banc',
  sourceId: 'WN-SRC-0000',
  claimsIndication: [{ claimId: 'WN-CL-0000-001', versionClaim: 'v1.0' }],
  claimsInstrument: [{ claimId: 'WN-CL-0000-002', versionClaim: 'v1.0' }],
  claimsSecurite: [{ claimId: 'WN-CL-0000-003', versionClaim: 'v1.0' }],
  raccourciAssume: null,
  statut: 'publiee',
};

const TOUS_VALIDES = new Set(claimsDeLaLigne(LIGNE).map(cleClaim));

// La fixture CALCULE son sha au lieu de le recopier : un périmètre élargi rougit
// alors ici ET dans le module, au lieu de laisser le banc prouver l'ancien
// périmètre pendant que la production sert le nouveau.
function signatureBanc(
  lignes: readonly LigneConduite[],
  sur: Partial<CatalogueConduitesMetadata> = {},
): CatalogueConduitesMetadata {
  const claimsSource = lignes.flatMap(claimsDeLaLigne);
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
    expect(lignesConduitesServables(new Set())).toEqual([]);
    expect(catalogueConduitesSigne(CATALOGUE_CONDUITES_METADATA)).toEqual(false);
  });
});

describe('catalogue de conduites — les termes du verrou, falsifiés un par un', () => {
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
    expect(catalogueConduitesSigne(signature, [])).toBe(false);
  });

  it('4. aucun claim au périmètre relu : fermé', () => {
    const nue = [{ ...LIGNE, claimsIndication: [], claimsInstrument: [], claimsSecurite: [] }];
    expect(catalogueConduitesSigne(signatureBanc(nue), nue)).toBe(false);
  });

  // UNE LIGNE SANS INDICATION FONDÉE N'EST PAS UNE LIGNE, et ce terme ne se
  // déduit pas de l'égalité : une ligne ne citant qu'un claim d'instrument y
  // passerait sans que rien ne fonde son QUAND.
  it('5. une ligne qui ne cite qu’un instrument, sans indication : fermé', () => {
    const sansIndication = [{ ...LIGNE, claimsIndication: [] }];
    expect(catalogueConduitesSigne(signatureBanc(sansIndication), sansIndication)).toBe(false);
  });

  it('6. le périmètre relu diverge des claims cités, dans un sens comme dans l’autre : fermé', () => {
    const base = signatureBanc([LIGNE]);

    // Un claim gardé qu'aucune ligne n'invoque.
    expect(catalogueConduitesSigne(
      { ...base, claimsSource: [...base.claimsSource, { claimId: 'WN-CL-0000-009', versionClaim: 'v1.0' }] },
      [LIGNE],
    )).toBe(false);

    // Un claim invoqué que le contrat de fraîcheur ne garderait pas.
    expect(catalogueConduitesSigne(
      { ...base, claimsSource: LIGNE.claimsIndication },
      [LIGNE],
    )).toBe(false);

    // Une VERSION qui change suffit — le périmètre est par paire.
    const v2 = [{ ...LIGNE, claimsSecurite: [{ claimId: 'WN-CL-0000-003', versionClaim: 'v2.0' }] }];
    expect(catalogueConduitesSigne(base, v2)).toBe(false);
  });

  // LES TROIS CATÉGORIES SONT DANS LE PÉRIMÈTRE. Un claim de sécurité retiré
  // après l'attestation doit la périmer : c'est lui qui devait s'afficher.
  it('7. retirer le claim de sécurité périme la signature acquise', () => {
    const signature = signatureBanc([LIGNE]);
    expect(catalogueConduitesSigne(signature, [LIGNE])).toBe(true);
    expect(catalogueConduitesSigne(signature, [{ ...LIGNE, claimsSecurite: [] }])).toBe(false);
  });

  it('8. une ligne retouchée ou ajoutée après l’attestation périme la signature', () => {
    const signature = signatureBanc([LIGNE]);
    expect(catalogueConduitesSigne(signature, [{ ...LIGNE, raccourciAssume: 'ajout hors claim' }])).toBe(false);
    expect(catalogueConduitesSigne(signature, [LIGNE, { ...LIGNE, cleTableau: 'second' }])).toBe(false);
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
      claimsSecurite: LIGNE.claimsSecurite,
      claimsInstrument: LIGNE.claimsInstrument,
      claimsIndication: LIGNE.claimsIndication,
      sourceId: LIGNE.sourceId,
      cleTableau: LIGNE.cleTableau,
    } as LigneConduite;
    expect(shaPerimetreConduites([reordonnee], [])).toBe(shaPerimetreConduites([LIGNE], []));
  });
});

describe('catalogue de conduites — un claim qui cesse d’être VALIDE retire la ligne', () => {
  it('tous les claims valides ⇒ la ligne est servie', () => {
    expect(lignesConduitesServables(TOUS_VALIDES, signatureBanc([LIGNE]), [LIGNE])).toEqual([LIGNE]);
  });

  // LES TROIS CATÉGORIES COMPTENT. Une sécurité retirée pèse autant qu'une
  // indication retirée — davantage même, puisque c'est elle qui devait
  // s'afficher au praticien.
  it('un claim retiré, quelle que soit sa catégorie ⇒ la ligne n’est plus servie', () => {
    for (const claim of claimsDeLaLigne(LIGNE)) {
      const amputes = new Set(TOUS_VALIDES);
      amputes.delete(cleClaim(claim));
      expect(lignesConduitesServables(amputes, signatureBanc([LIGNE]), [LIGNE])).toEqual([]);
    }
  });

  // « JE N'AI PAS PU LIRE » N'EST PAS « AUCUN CLAIM N'EST VALIDE ». Les deux
  // ferment, et c'est voulu ; l'appelant doit pouvoir dire lequel des deux.
  it('statuts non lus (`null`) ⇒ rien n’est servi, sans même consulter la signature', () => {
    expect(lignesConduitesServables(null, signatureBanc([LIGNE]), [LIGNE])).toEqual([]);
  });

  it('une version de claim qui ne correspond pas ne vaut pas validité', () => {
    const autreVersion = new Set(['WN-CL-0000-001@v2.0', 'WN-CL-0000-002@v1.0', 'WN-CL-0000-003@v1.0']);
    expect(lignesConduitesServables(autreVersion, signatureBanc([LIGNE]), [LIGNE])).toEqual([]);
  });
});

describe('catalogue de conduites — le service est fail-closed', () => {
  it('non signé ⇒ liste vide, jamais un défaut raisonnable', () => {
    expect(lignesConduitesServables(TOUS_VALIDES, signatureBanc([LIGNE], { validationExterne: false }), [LIGNE]))
      .toEqual([]);
  });

  it('signé ⇒ les lignes publiées, et elles seules', () => {
    const brouillon: LigneConduite = { ...LIGNE, cleTableau: 'brouillon', statut: 'brouillon' };
    const lignes = [LIGNE, brouillon];
    expect(lignesConduitesServables(TOUS_VALIDES, signatureBanc(lignes), lignes)).toEqual([LIGNE]);
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

  // LES TROIS CATÉGORIES SONT DES CHAMPS, et le nom du champ est le discriminant.
  // Les fondre en une liste unique renverrait « ce que ce claim fonde » à la
  // prose, hors de toute vérification — c'est l'état de toutes les autres tables.
  it('les trois catégories de claim restent des champs distincts', () => {
    for (const champ of ['claimsIndication', 'claimsInstrument', 'claimsSecurite']) {
      expect(SOURCE).toMatch(new RegExp(`${champ}: readonly ClaimRef\\[\\];`));
    }
  });

  // Une ligne DÉSIGNE. Si un jour un champ de prose clinique apparaît, ce banc
  // doit rougir avant que le gate G6 ne soit franchi par inadvertance.
  it('aucun champ de prose clinique dans le type d’une ligne', () => {
    for (const interdit of ['texteConduite', 'verbatim', 'extrait', 'libelleClinique', 'planIdeal']) {
      expect(SOURCE).not.toMatch(new RegExp(`\\b${interdit}\\s*:`));
    }
  });
});
