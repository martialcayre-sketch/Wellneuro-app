import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  construireImport,
  empreinteSnapshot,
  estCodeActe,
  extraireProprietes,
  NABM_PLANCHER_ACTES,
  serialiserCanonique,
  type ConceptFhir,
  type PageExpand,
} from './nabmImport';

const URL_PROP =
  'http://hl7.org/fhir/5.0/StructureDefinition/extension-ValueSet.expansion.contains.property';

/** Fabrique un concept FHIR tel que le SMT le rend. */
function concept(
  code: string,
  display: string,
  proprietes: Record<string, unknown | unknown[]> = {},
): ConceptFhir {
  const extension = Object.entries(proprietes).flatMap(([nom, valeur]) =>
    (Array.isArray(valeur) ? valeur : [valeur]).map(v => ({
      url: URL_PROP,
      extension: [
        { url: 'code', valueCode: nom },
        {
          url: 'value',
          ...(typeof v === 'boolean'
            ? { valueBoolean: v }
            : typeof v === 'number'
              ? { valueInteger: v }
              : { valueString: v }),
        },
      ],
    })),
  );
  return { code, display, extension };
}

/** Les dix propriétés présentes sur 987/987 actes de la V105. */
function universelles(surcharges: Record<string, unknown | unknown[]> = {}) {
  return {
    coeffB: '17',
    examenSanguin: true,
    ententePrealable: false,
    indicationMedicale: true,
    initativeBiologistePossible: true,
    rmo: true,
    remboursementTotal: false,
    acteReserve: false,
    parent: '12',
    inactive: false,
    ...surcharges,
  };
}

/** Un millésime jouet, sous le plancher : `autoriserReduction` partout. */
function page(concepts: ConceptFhir[], version = 'V105'): PageExpand {
  return { version, expansion: { total: concepts.length, offset: 0, contains: concepts } };
}

const OPTIONS = { autoriserReduction: true } as const;

describe('CB-02a — reconnaissance des actes', () => {
  it('accepte un code à quatre chiffres, zéros de tête compris', () => {
    expect(estCodeActe('1213')).toBe(true);
    expect(estCodeActe('0014')).toBe(true);
  });

  it('REFUSE la racine « NABM », qui compte quatre caractères sans être un acte', () => {
    // Le défaut que le motif '^[0-9A-Z]{4}$' laissait passer : la racine de la
    // nomenclature serait entrée au catalogue comme une analyse.
    expect(estCodeActe('NABM')).toBe(false);
  });

  it('refuse chapitres, sous-chapitres et nœuds de règle', () => {
    expect(estCodeActe('05')).toBe(false);
    expect(estCodeActe('06-04')).toBe(false);
    expect(estCodeActe('CONTINGENCE_3')).toBe(false);
    expect(estCodeActe('12345')).toBe(false);
  });
});

describe('CB-02a — lecture des propriétés FHIR', () => {
  it('rend toujours des listes, y compris pour une propriété multi-valuée', () => {
    const p = extraireProprietes(
      concept('1211', 'T.S.H. + T4 LIBRE (SANG)', {
        codeIncompatible: ['1207', '1212', '1208'],
        coeffB: '35',
      }),
    );
    expect(p.codeIncompatible).toEqual(['1207', '1212', '1208']);
    expect(p.coeffB).toEqual(['35']);
  });

  it('ignore les extensions étrangères au format de propriété', () => {
    expect(extraireProprietes({ code: '1213', extension: [{ url: 'autre-chose' }] })).toEqual({});
  });
});

describe('CB-02a — construction de l\'import', () => {
  it('sépare les 4 actes des concepts qui n\'en sont pas', () => {
    const { actes, rapport } = construireImport(
      [
        page([
          concept('1213', 'FERRITINE (DOSAGE) (SANG)', universelles()),
          concept('1208', 'T.S.H.(SANG)', universelles({ parent: '10' })),
          concept('05', 'HEMATOLOGIE'),
          concept('06-04', 'Sous-chapitre'),
          concept('CONTINGENCE_3', 'Règle'),
          concept('NABM', 'NABM'),
        ]),
      ],
      OPTIONS,
    );

    expect(actes.map(a => a.codeActe)).toEqual(['1213', '1208']);
    expect(rapport.nombreConcepts).toBe(6);
    expect(rapport.nombreActes).toBe(2);
    expect(rapport.nonActes).toEqual({
      chapitres: 1,
      sousChapitres: 1,
      noeudsRegle: 1,
      racine: 1,
    });
  });

  it('n\'écrit JAMAIS un tableau vide : absence de propriété ⇒ null', () => {
    // Le CHECK en base interdit `{}` pour n'avoir qu'une écriture de « aucune
    // incompatibilité ». Si ce test tombe, l'insertion échouera en production.
    const { actes } = construireImport(
      [page([concept('1213', 'FERRITINE', universelles())])],
      OPTIONS,
    );
    expect(actes[0].codeIncompatible).toBeNull();
    expect(actes[0].regleApplicable).toBeNull();
  });

  it('conserve les incompatibilités et les règles quand elles existent', () => {
    const { actes, rapport } = construireImport(
      [
        page([
          concept('1208', 'T.S.H.', universelles({ codeIncompatible: ['1211', '1207'] })),
          concept('1211', 'T.S.H. + T4L', universelles({ codeIncompatible: ['1208'] })),
          concept('1207', 'T4 LIBRE', universelles({ regleApplicable: 'REGLESPECIFIQUE_4' })),
        ]),
      ],
      OPTIONS,
    );
    expect(actes[0].codeIncompatible).toEqual(['1211', '1207']);
    expect(actes[2].regleApplicable).toEqual(['REGLESPECIFIQUE_4']);
    expect(rapport.incompatibilites).toEqual({
      occurrences: 3,
      actesConcernes: 2,
      maxParActe: 2,
    });
    // 1208 exclut 1207, mais 1207 ne le rend pas : une paire déclarée d'un seul
    // côté. Signalée au rapport, jamais bloquante — c'est un défaut de la
    // source, et refuser l'import en priverait tout le millésime.
    expect(rapport.incompatibilitesAsymetriques).toBe(1);
  });
});

describe('CB-02a — ce que l\'import REFUSE', () => {
  it('refuse une pagination incomplète', () => {
    // Le mode de panne le plus dangereux : cinq pages sur six produisent un
    // catalogue plausible, que le pointeur de version servirait comme complet.
    const tronquee: PageExpand = {
      version: 'V105',
      expansion: { total: 1050, contains: [concept('1213', 'FERRITINE', universelles())] },
    };
    expect(() => construireImport([tronquee], OPTIONS)).toThrow(/pagination incomplète/);
  });

  it('refuse un millésime qui change pendant la pagination', () => {
    expect(() =>
      construireImport(
        [
          page([concept('1213', 'FERRITINE', universelles())], 'V105'),
          page([concept('1208', 'T.S.H.', universelles())], 'V106'),
        ],
        OPTIONS,
      ),
    ).toThrow(/Millésime incohérent/);
  });

  it('refuse un concept reçu deux fois', () => {
    expect(() =>
      construireImport(
        [page([concept('1213', 'FERRITINE', universelles()), concept('1213', 'FERRITINE', universelles())])],
        OPTIONS,
      ),
    ).toThrow(/deux fois/);
  });

  it('refuse un coefficient B non entier plutôt que de l\'arrondir', () => {
    // La colonne est en INTEGER. Arrondir produirait un chiffre de facturation
    // faux et silencieux.
    expect(() =>
      construireImport([page([concept('1213', 'FERRITINE', universelles({ coeffB: '17,5' }))])], OPTIONS),
    ).toThrow(/attendue entière positive/);
  });

  it('refuse un acte déclaré incompatible avec lui-même', () => {
    expect(() =>
      construireImport(
        [page([concept('1213', 'FERRITINE', universelles({ codeIncompatible: '1213' }))])],
        OPTIONS,
      ),
    ).toThrow(/incompatible avec lui-même/);
  });

  it('refuse une incompatibilité vers un acte absent du millésime', () => {
    expect(() =>
      construireImport(
        [page([concept('1213', 'FERRITINE', universelles({ codeIncompatible: '9999' }))])],
        OPTIONS,
      ),
    ).toThrow(/absent du millésime/);
  });

  it('refuse une incompatibilité vers un chapitre', () => {
    expect(() =>
      construireImport(
        [page([concept('1213', 'FERRITINE', universelles({ codeIncompatible: '12' }))])],
        OPTIONS,
      ),
    ).toThrow(/n'est pas un code d'acte/);
  });

  it('refuse une propriété universelle devenue absente', () => {
    // Retirer une entrée de NABM_PROPRIETES ne provoque aucune erreur côté
    // serveur : la colonne devient simplement vide sur les 987 actes. Ce
    // contrôle transforme cette panne muette en refus.
    const sansRmo = universelles();
    delete (sansRmo as Record<string, unknown>).rmo;
    expect(() =>
      construireImport([page([concept('1213', 'FERRITINE', sansRmo)])], OPTIONS),
    ).toThrow(/universelle/);
  });

  it('refuse un millésime sous le plancher de volumétrie', () => {
    // Sans plancher, un catalogue mutilé deviendrait le catalogue COURANT et
    // ferait basculer en « hors nomenclature » tout ce qu'il aurait perdu.
    expect(() =>
      construireImport([page([concept('1213', 'FERRITINE', universelles())])]),
    ).toThrow(new RegExp(`plancher ${NABM_PLANCHER_ACTES}`));
  });

  it('refuse un concept sans libellé', () => {
    expect(() => construireImport([page([concept('1213', '  ')])], OPTIONS)).toThrow(
      /sans libellé/,
    );
  });
});

describe('CB-02a — snapshot et empreinte', () => {
  it('produit la même empreinte quel que soit l\'ordre rendu par le serveur', () => {
    // Le serveur ne garantit aucun ordre. Sans canonisation, un rejeu du MÊME
    // millésime produirait une empreinte différente et déclencherait à tort le
    // refus « la source a changé sans changer de version ».
    const a = construireImport(
      [
        page([
          concept('1213', 'FERRITINE', universelles({ codeIncompatible: ['1822', '1208'] })),
          concept('1208', 'T.S.H.', universelles()),
          concept('1822', 'C.R.P.', universelles()),
        ]),
      ],
      OPTIONS,
    );
    const b = construireImport(
      [
        page([
          concept('1822', 'C.R.P.', universelles()),
          concept('1208', 'T.S.H.', universelles()),
          concept('1213', 'FERRITINE', universelles({ codeIncompatible: ['1208', '1822'] })),
        ]),
      ],
      OPTIONS,
    );
    expect(b.rapport.contenuSha256).toBe(a.rapport.contenuSha256);
  });

  it('conserve les 1050 concepts, pas seulement les actes', () => {
    // Les chapitres n'ont pas de table dédiée : le snapshot est le seul endroit
    // où « 05 HEMATOLOGIE » survit à l'import.
    const { snapshot, rapport } = construireImport(
      [page([concept('1213', 'FERRITINE', universelles()), concept('05', 'HEMATOLOGIE')])],
      OPTIONS,
    );
    expect(snapshot).toContain('HEMATOLOGIE');
    expect(rapport.nombreConcepts).toBe(2);
    expect(rapport.nombreActes).toBe(1);
  });

  it('hache exactement le texte stocké, comme le fera le CHECK en base', () => {
    const texte = serialiserCanonique('V105', [
      { code: '1213', libelle: 'FERRITINE', proprietes: { coeffB: ['17'] } },
    ]);
    expect(empreinteSnapshot(texte)).toBe(
      createHash('sha256').update(Buffer.from(texte, 'utf8')).digest('hex'),
    );
    expect(empreinteSnapshot(texte)).toMatch(/^[a-f0-9]{64}$/);
  });
});
