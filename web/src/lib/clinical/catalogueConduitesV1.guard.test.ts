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
const SOURCE_VALIDITE = readFileSync(join(__dirname, '..', 'rag', 'claims', 'validite.ts'), 'utf8');

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
  it('porte TROIS lignes, attestées le 2026-09-17 en deux gestes', () => {
    expect(CATALOGUE_CONDUITES_V1.map(l => l.cleTableau)).toEqual([
      'insomnie_depression',
      'insomnie_anxiete',
      'insomnie_jambes_sans_repos',
    ]);
    expect(CATALOGUE_CONDUITES_METADATA.validationExterne).toBe(true);
    // LA DATE EST CELLE DE LA SECONDE ATTESTATION, et elle REMPLACE la première.
    // Le périmètre se hache en entier : la date du matin attestait trois lignes
    // de moins, elle ne couvre plus rien.
    expect(CATALOGUE_CONDUITES_METADATA.dateValidation).toBe('2026-09-17T20:26:03.000Z');
    expect(catalogueConduitesSigne(CATALOGUE_CONDUITES_METADATA)).toBe(true);
  });

  it('chaque ligne porte EXACTEMENT les claims attestés, catégorie par catégorie', () => {
    // Le banc fige les trois CATÉGORIES séparément, et non l'union : c'est le
    // nom du champ qui dit ce qu'un claim fonde, et une désignation qui glisse
    // d'une catégorie à l'autre ne changerait pas l'union.
    const [depression, anxiete, jambes] = CATALOGUE_CONDUITES_V1;

    expect(depression.claimsIndication.map(c => c.claimId))
      .toEqual(['WN-CL-0315-001', 'WN-CL-0315-002', 'WN-CL-0318-023']);
    expect(depression.claimsInstrument.map(c => c.claimId)).toEqual(['WN-CL-0320-002']);
    expect(depression.claimsSecurite.map(c => c.claimId))
      .toEqual(['WN-CL-0315-006', 'WN-CL-0315-004']);

    expect(anxiete.claimsIndication.map(c => c.claimId))
      .toEqual(['WN-CL-0316-001', 'WN-CL-0316-002', 'WN-CL-0318-018']);
    expect(anxiete.claimsInstrument.map(c => c.claimId)).toEqual(['WN-CL-0320-002']);
    expect(anxiete.claimsSecurite.map(c => c.claimId))
      .toEqual(['WN-CL-0316-016', 'WN-CL-0316-006', 'WN-CL-0316-029']);

    // LE CONSTAT DU MATIN, FIGÉ. La surface désignait `WN-CL-0320-002` en claim
    // d'instrument des TROIS lignes. Lu en production, il fonde le HAD — donc
    // les deux lignes ci-dessus, jamais celle-ci, qui se déclenche sur l'IRLS.
    // Les deux vides sont des déclarations, pas des trous.
    expect(jambes.claimsInstrument).toEqual([]);
    expect(jambes.claimsSecurite).toEqual([]);
    expect(jambes.claimsIndication.map(c => c.claimId))
      .toEqual(['WN-CL-0320-003', 'WN-CL-0318-020']);
  });

  it('le périmètre relu est l’UNION des claims cités — `WN-CL-0320-002` n’y figure qu’une fois', () => {
    // Deux lignes citent le même claim d'instrument. Le verrou dédoublonne des
    // DEUX côtés avant de comparer ; sans cela, une attestation parfaitement
    // correcte serait refusée dès qu'un claim servirait deux lignes.
    const cite = CATALOGUE_CONDUITES_V1.flatMap(l => claimsDeLaLigne(l).map(cleClaim));
    expect(cite.filter(c => c.startsWith('WN-CL-0320-002'))).toHaveLength(2);
    expect(CATALOGUE_CONDUITES_METADATA.claimsSource).toHaveLength(14);
    expect(CATALOGUE_CONDUITES_METADATA.claimsSource.filter(c => c.claimId === 'WN-CL-0320-002'))
      .toHaveLength(1);
    expect(catalogueConduitesSigne(CATALOGUE_CONDUITES_METADATA)).toBe(true);
  });

  it('CHAQUE ligne DÉCLARE son raccourci : le déclencheur lit un score, les claims disent le syndrome', () => {
    // Les trois lignes font le même pas — d'une bande d'instrument au syndrome
    // constaté — et les trois le déclarent. La ligne dépression était proposée
    // SANS raccourci ; l'attestation du soir l'a corrigé, par cohérence avec
    // [[D-224]].
    for (const ligne of CATALOGUE_CONDUITES_V1) {
      expect(ligne.raccourciAssume).not.toBeNull();
      // Singulier ou pluriel : la ligne anxiété en déclare DEUX. Ce qui est
      // gardé est que le raccourci s'attribue à l'outil, pas au corpus.
      expect(ligne.raccourciAssume).toMatch(/assumés? par l’outil/);
    }
    const [depression, anxiete, jambes] = CATALOGUE_CONDUITES_V1;
    // Le champ est DANS le périmètre haché : le reformuler périme l'attestation.
    expect(depression.raccourciAssume).toContain('sous-score D du HAD');
    expect(anxiete.raccourciAssume).toContain('sous-score A du HAD');
    // Le second raccourci de la ligne anxiété, qui n'est pas celui des deux
    // autres : un seuil que le corpus pose et qu'aucun indicateur n'expose.
    expect(anxiete.raccourciAssume).toContain('latence');
    expect(jambes.raccourciAssume).toContain('IRLS');
    expect(jambes.raccourciAssume).toContain('syndrome');
  });

  it('sert les TROIS lignes, et un claim retiré ne retire QUE la sienne', () => {
    const valides = new Set(CATALOGUE_CONDUITES_METADATA.claimsSource.map(cleClaim));
    expect(lignesConduitesServables(valides).map(l => l.cleTableau)).toEqual([
      'insomnie_depression',
      'insomnie_anxiete',
      'insomnie_jambes_sans_repos',
    ]);

    // LE FILTRE EST PAR LIGNE, ET CE BANC LE PROUVE. Avec une seule ligne au
    // catalogue, « un claim retiré ⇒ liste vide » était satisfait par un filtre
    // qui aurait tout éteint. À trois lignes, l'assertion mord : retirer un
    // claim de la ligne dépression doit laisser les deux autres servies, et
    // `WN-CL-0320-002` — cité par deux lignes — doit en retirer exactement deux.
    for (const claim of CATALOGUE_CONDUITES_METADATA.claimsSource) {
      const ampute = new Set([...valides].filter(c => c !== cleClaim(claim)));
      const servies = lignesConduitesServables(ampute).map(l => l.cleTableau);
      const attendues = CATALOGUE_CONDUITES_V1
        .filter(l => !claimsDeLaLigne(l).some(c => cleClaim(c) === cleClaim(claim)))
        .map(l => l.cleTableau);
      expect(servies).toEqual(attendues);
      expect(servies.length).toBeLessThan(3);
    }

    // Le claim partagé retire DEUX lignes et en laisse UNE — l'assertion que le
    // catalogue à une ligne ne pouvait pas porter.
    const sansInstrument = new Set(
      [...valides].filter(c => !c.startsWith('WN-CL-0320-002')),
    );
    expect(lignesConduitesServables(sansInstrument).map(l => l.cleTableau))
      .toEqual(['insomnie_jambes_sans_repos']);

    // `null` = L'ENSEMBLE N'A PAS PU ÊTRE LU. Ferme aussi, mais pas pour la même
    // raison qu'un ensemble vide.
    expect(lignesConduitesServables(null)).toEqual([]);
    expect(lignesConduitesServables(new Set())).toEqual([]);
  });

  it('PERD SA SIGNATURE si le raccourci est reformulé', () => {
    // Le raccourci est dans le périmètre haché, et ce banc le prouve plutôt que
    // de le promettre en prose — c'est tout l'intérêt d'avoir sorti ce champ du
    // commentaire.
    const reecrite = CATALOGUE_CONDUITES_V1.map(l => ({
      ...l,
      raccourciAssume: `${l.raccourciAssume} Précision ajoutée après coup.`,
    }));
    expect(catalogueConduitesSigne(CATALOGUE_CONDUITES_METADATA, reecrite)).toBe(false);
    const valides = new Set(CATALOGUE_CONDUITES_METADATA.claimsSource.map(cleClaim));
    expect(lignesConduitesServables(valides, CATALOGUE_CONDUITES_METADATA, reecrite)).toEqual([]);
  });

  // UNE LIGNE RETIRÉE PÉRIME L'ATTESTATION AUTANT QU'UNE LIGNE AJOUTÉE. Le sens
  // n'est pas symétrique pour un lecteur pressé — « j'ai juste enlevé une ligne »
  // se dit facilement — mais il l'est pour le verrou, et c'est le point.
  it('PERD SA SIGNATURE si l’une des trois lignes est retirée', () => {
    for (let index = 0; index < CATALOGUE_CONDUITES_V1.length; index++) {
      const amputee = CATALOGUE_CONDUITES_V1.filter((_, i) => i !== index);
      expect(catalogueConduitesSigne(CATALOGUE_CONDUITES_METADATA, amputee)).toBe(false);
    }
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
    const autreVersion = new Set(['WN-CL-0000-001::v2.0', 'WN-CL-0000-002::v1.0', 'WN-CL-0000-003::v1.0']);
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
  // une garde de source les distingue. Le fichier est enrôlé à
  // `shaPerimetreLitteral.guard.test.ts` depuis le jour de sa PREMIÈRE signature
  // ([[D-224]]) — pas avant, son `shaPerimetre` valant `null` jusque-là, ce qui
  // aurait fait rougir la première assertion de ce banc-là. Même séquence que
  // `baremeChargeV1.ts`, enrôlé à [[D-198]] et non à [[D-196]]. Les assertions
  // ci-dessous gardent ce que l'autre banc ne regarde pas : la mise en garde
  // elle-même, et l'absence de constante recopiable.
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

  // LA CLÉ DOIT ÊTRE CELLE DU MODULE QUI JUGE LA VALIDITÉ, et ce banc est le seul
  // qui puisse le garantir. `claimsValidesAuCorpus` (`rag/claims/validite.ts`)
  // PRODUIT l'ensemble que `lignesConduitesServables` consomme, avec ses propres
  // clés. Un séparateur qui diverge ne casse rien de visible : chaque recherche
  // manque, et le catalogue ne sert plus RIEN, en silence et pour toujours.
  //
  // LE DÉFAUT A EXISTÉ. La première version de ce module écrivait `@`, séparateur
  // du contrat de fraîcheur et de `rag/claims/store.ts` — mais pas celui du module
  // de VALIDITÉ, qui est la source de l'ensemble consommé ici. Rattrapé en revue,
  // pas par un test : d'où ce banc.
  //
  // LECTURE DU TEXTE, PAS IMPORT : `validite.ts` instancie un client Prisma au
  // chargement. Même raison que `claimsEpinglesFraicheur.guard.test.ts`, qui lit
  // les tables signées comme du texte plutôt que de les importer.
  it('la clé de claim est exactement celle du module de validité', () => {
    const motif = /return `\$\{[A-Za-z.]+claimId\}::\$\{[A-Za-z.]+versionClaim\}`;/;
    expect(SOURCE).toMatch(motif);
    expect(SOURCE_VALIDITE).toMatch(motif);
  });

  // Une ligne DÉSIGNE. Si un jour un champ de prose clinique apparaît, ce banc
  // doit rougir avant que le gate G6 ne soit franchi par inadvertance.
  it('aucun champ de prose clinique dans le type d’une ligne', () => {
    for (const interdit of ['texteConduite', 'verbatim', 'extrait', 'libelleClinique', 'planIdeal']) {
      expect(SOURCE).not.toMatch(new RegExp(`\\b${interdit}\\s*:`));
    }
  });
});
