import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import {
  anomaliesDuDeclencheur,
  INDICATIONS_ASSIETTES_METADATA,
  INDICATIONS_ASSIETTES_V1,
  indicationsAssiettesSignees,
  lignesIndicationAssietteServables,
  shaPerimetreIndicationsAssiettes,
  type IndicationsAssiettesMetadata,
  type LigneIndicationAssiette,
} from './indicationsAssiettesV1';
import { cleClaim } from './catalogueConduitesV1';
import { C5B_RECOMMENDED_PLATES } from '@/lib/food-compass/plates';

// Banc de garde des indications d'assiette ([[D-225]]).
//
// CE QU'IL DOIT EMPÊCHER : qu'une ligne non attestée — ou attestée mais en
// BROUILLON, ou fondée sur un claim que le corpus ne soutient plus, ou pointant
// une assiette qui n'existe plus — atteigne un écran. Chaque terme du verrou est
// donc falsifié SÉPARÉMENT : un verrou dont on ne falsifie que l'ensemble ne
// prouve pas que chacun de ses termes mord.

const ASSIETTE = C5B_RECOMMENDED_PLATES[0].plateCode;

function ligne(surcharges: Partial<LigneIndicationAssiette> = {}): LigneIndicationAssiette {
  return {
    id: 'ASSIETTE-IND-BANC',
    plateCode: ASSIETTE,
    declencheur: { type: 'zone', idQuestionnaire: 'Q_BANC_01', zone: { type: 'couleur', couleurs: ['danger'] } },
    claimsIndication: [{ claimId: 'WN-CL-9999-001', versionClaim: 'v1.0' }],
    raccourciAssume: null,
    statut: 'publiee',
    ...surcharges,
  } as LigneIndicationAssiette;
}

/** Une signature VALIDE sur les lignes passées — le point de départ des falsifications. */
function signatureBanc(
  lignes: readonly LigneIndicationAssiette[],
  surcharges: Partial<IndicationsAssiettesMetadata> = {},
): IndicationsAssiettesMetadata {
  const claimsSource = [...new Map(
    lignes.flatMap(l => l.claimsIndication).map(c => [cleClaim(c), c]),
  ).values()];
  const base: IndicationsAssiettesMetadata = {
    validationExterne: true,
    dateValidation: '2026-09-17T00:00:00.000Z',
    claimsSource,
    shaPerimetre: shaPerimetreIndicationsAssiettes(lignes, claimsSource),
  };
  const fusion = { ...base, ...surcharges };
  // Le sha suit le périmètre RÉELLEMENT déclaré : sans ce recalcul, surcharger
  // `claimsSource` casserait DEUX termes à la fois et le banc ne dirait plus
  // lequel a mordu.
  if (surcharges.claimsSource && surcharges.shaPerimetre === undefined) {
    fusion.shaPerimetre = shaPerimetreIndicationsAssiettes(lignes, fusion.claimsSource);
  }
  return fusion;
}

const claimsValidesDe = (lignes: readonly LigneIndicationAssiette[]) =>
  new Set(lignes.flatMap(l => l.claimsIndication).map(cleClaim));

describe('indications d’assiette — état livré', () => {
  it('la table est VIDE, et sa métadonnée n’atteste rien', () => {
    expect(INDICATIONS_ASSIETTES_V1).toEqual([]);
    expect(INDICATIONS_ASSIETTES_METADATA.validationExterne).toBe(false);
    expect(INDICATIONS_ASSIETTES_METADATA.dateValidation).toBeNull();
    expect(INDICATIONS_ASSIETTES_METADATA.claimsSource).toEqual([]);
    expect(INDICATIONS_ASSIETTES_METADATA.shaPerimetre).toBeNull();
  });

  it('rien n’est servable aujourd’hui, par aucun chemin', () => {
    expect(lignesIndicationAssietteServables(new Set())).toEqual([]);
    expect(lignesIndicationAssietteServables(null)).toEqual([]);
    expect(indicationsAssiettesSignees()).toBe(false);
  });
});

describe('indications d’assiette — les termes du verrou, falsifiés un par un', () => {
  it('signée et complète : le verrou ouvre — sinon rien ci-dessous ne prouverait quoi que ce soit', () => {
    const lignes = [ligne()];
    expect(indicationsAssiettesSignees(signatureBanc(lignes), lignes)).toBe(true);
  });

  it('1. sans validation externe : fermé', () => {
    const lignes = [ligne()];
    expect(indicationsAssiettesSignees(
      signatureBanc(lignes, { validationExterne: false }), lignes,
    )).toBe(false);
  });

  it('2. date absente, non ISO ou non canonique : fermé, et JAMAIS jeté', () => {
    const lignes = [ligne()];
    for (const date of [null, 'pas-une-date', '2026-09-17', '2026-09-17T00:00:00Z']) {
      expect(() =>
        indicationsAssiettesSignees(signatureBanc(lignes, { dateValidation: date }), lignes),
      ).not.toThrow();
      expect(
        indicationsAssiettesSignees(signatureBanc(lignes, { dateValidation: date }), lignes),
      ).toBe(false);
    }
  });

  it('3. LE PIÈGE DE LA TABLE VIDE : une signature parfaite sur zéro ligne ne passe pas', () => {
    // Sur zéro ligne, l'union des claims est ∅ et `claimsSource` est ∅ :
    // l'égalité est SATISFAITE. Sans le terme de non-vacuité, une table vide
    // « parfaitement signée » passerait le verrou.
    const signature = signatureBanc([]);
    expect(signature.validationExterne).toBe(true);
    expect(signature.shaPerimetre).not.toBeNull();
    expect(indicationsAssiettesSignees(signature, [])).toBe(false);
  });

  it('4. une ligne SANS claim d’indication ferme la table entière', () => {
    const lignes = [ligne(), ligne({ id: 'B', claimsIndication: [] })];
    expect(indicationsAssiettesSignees(signatureBanc(lignes), lignes)).toBe(false);
  });

  it('5. `claimsSource` qui déborde ou qui manque : fermé DANS LES DEUX SENS', () => {
    const lignes = [ligne()];
    const enTrop = [
      ...lignes[0].claimsIndication,
      { claimId: 'WN-CL-9999-777', versionClaim: 'v1.0' },
    ];
    expect(indicationsAssiettesSignees(
      signatureBanc(lignes, { claimsSource: enTrop }), lignes,
    )).toBe(false);
    expect(indicationsAssiettesSignees(
      signatureBanc(lignes, { claimsSource: [] }), lignes,
    )).toBe(false);
  });

  it('6. sha nul, ou sha qui ne correspond plus au périmètre', () => {
    const lignes = [ligne()];
    expect(indicationsAssiettesSignees(
      signatureBanc(lignes, { shaPerimetre: null }), lignes,
    )).toBe(false);
    expect(indicationsAssiettesSignees(
      signatureBanc(lignes, { shaPerimetre: 'a'.repeat(64) }), lignes,
    )).toBe(false);
  });

  it('7. UNE ASSIETTE QUI N’EXISTE PLUS ferme la table — le sha ne l’attrape pas', () => {
    // LE TERME PROPRE À CETTE TABLE. Une ligne signée qui pointe une assiette
    // retirée du catalogue reste parfaitement hachée : le sha atteste le contenu
    // de la ligne, pas l'existence de sa cible.
    const lignes = [ligne({ plateCode: 'ASSIETTE_QUI_N_EXISTE_PAS' })];
    const signature = signatureBanc(lignes);
    expect(signature.shaPerimetre)
      .toBe(shaPerimetreIndicationsAssiettes(lignes, signature.claimsSource));
    expect(indicationsAssiettesSignees(signature, lignes)).toBe(false);
  });

  it('UNE LIGNE AJOUTÉE APRÈS COUP n’entre pas sous la signature acquise', () => {
    const lignes = [ligne()];
    const signature = signatureBanc(lignes);
    const elargie = [...lignes, ligne({ id: 'AJOUTEE' })];
    expect(indicationsAssiettesSignees(signature, elargie)).toBe(false);
    expect(lignesIndicationAssietteServables(claimsValidesDe(elargie), signature, elargie))
      .toEqual([]);
  });

  it('UN RACCOURCI REFORMULÉ périme l’attestation', () => {
    const lignes = [ligne({ raccourciAssume: 'Le déclencheur lit un score, le claim dit un tableau.' })];
    const signature = signatureBanc(lignes);
    const reecrite = lignes.map(l => ({ ...l, raccourciAssume: `${l.raccourciAssume} Ajout.` }));
    expect(indicationsAssiettesSignees(signature, reecrite)).toBe(false);
  });
});

describe('indications d’assiette — LE FILTRE DE SERVICE, raison d’être du lot', () => {
  it('UNE LIGNE EN BROUILLON EST DANS LE PÉRIMÈTRE SIGNÉ ET HORS DU SERVICE', () => {
    // LE CAS DE LA PSYCHOBIOTIQUE ([[D-216]]) : une porte étroite publiée, une
    // porte large en brouillon, sur la MÊME assiette. Les deux sont relues, les
    // deux sont hachées — une seule sort.
    const etroite = ligne({ id: 'PORTE-ETROITE', statut: 'publiee' });
    const large = ligne({
      id: 'PORTE-LARGE',
      statut: 'brouillon',
      claimsIndication: [{ claimId: 'WN-CL-9999-002', versionClaim: 'v1.0' }],
    });
    const lignes = [etroite, large];
    const signature = signatureBanc(lignes);

    // Le verrou ouvre : le brouillon est bien DANS le périmètre attesté.
    expect(indicationsAssiettesSignees(signature, lignes)).toBe(true);
    expect(signature.claimsSource).toHaveLength(2);

    // Et pourtant il ne sort pas.
    const servies = lignesIndicationAssietteServables(claimsValidesDe(lignes), signature, lignes);
    expect(servies.map(l => l.id)).toEqual(['PORTE-ETROITE']);
  });

  it('RETIRER LE BROUILLON DU PÉRIMÈTRE CASSERAIT LA SIGNATURE — hors service n’est pas hors périmètre', () => {
    const lignes = [ligne({ id: 'A' }), ligne({ id: 'B', statut: 'brouillon' })];
    const signature = signatureBanc(lignes);
    // Quelqu'un « nettoie » la table en retirant la ligne en brouillon : le sha
    // diverge, et la table entière cesse d'être servie. C'est voulu.
    const nettoyee = lignes.filter(l => l.statut === 'publiee');
    expect(indicationsAssiettesSignees(signature, nettoyee)).toBe(false);
  });

  it('un claim devenu invalide retire SA ligne, et elle seule', () => {
    const a = ligne({ id: 'A' });
    const b = ligne({ id: 'B', claimsIndication: [{ claimId: 'WN-CL-9999-002', versionClaim: 'v1.0' }] });
    const lignes = [a, b];
    const signature = signatureBanc(lignes);
    const sansCeluiDeB = new Set([cleClaim(a.claimsIndication[0])]);
    expect(lignesIndicationAssietteServables(sansCeluiDeB, signature, lignes).map(l => l.id))
      .toEqual(['A']);
  });

  it('statuts NON LUS (`null`) ferme, et ce n’est pas « aucun claim valide »', () => {
    const lignes = [ligne()];
    const signature = signatureBanc(lignes);
    expect(lignesIndicationAssietteServables(null, signature, lignes)).toEqual([]);
    expect(lignesIndicationAssietteServables(new Set(), signature, lignes)).toEqual([]);
    // Les deux rendent `[]` — c'est bien pourquoi l'APPELANT doit distinguer les
    // deux cas, ce module ne le peut pas pour lui.
  });

  it('table NON signée : aucune ligne, même publiée, même avec tous ses claims valides', () => {
    const lignes = [ligne()];
    const nonSignee = signatureBanc(lignes, { validationExterne: false });
    expect(lignesIndicationAssietteServables(claimsValidesDe(lignes), nonSignee, lignes))
      .toEqual([]);
  });
});

describe('indications d’assiette — le déclencheur ne dérive pas en silence', () => {
  // LE CONSTAT DE REVUE QUI A FONDÉ CE BLOC. Réutiliser `OrientationDeclencheur`
  // donne le vocabulaire, PAS les gardes anti-dérive de
  // `orientationRulesV1.test.ts` — celles-ci parcourent `ORIENTATION_RULES_V1`.
  // Sans ce bloc, une ligne future pouvait être signée puis servie avec un
  // questionnaire inexistant, et son déclencheur serait inerte sans rien casser.
  const IDS = new Set(QUESTIONNAIRES_CATALOG.map(q => q.id));

  it('le catalogue de questionnaires n’est pas vide — sinon tout ce bloc mentirait', () => {
    // Anti-vacuité : sur un catalogue vide, TOUT déclencheur serait « inconnu »
    // et le cas négatif passerait pour la mauvaise raison.
    expect(IDS.size).toBeGreaterThan(10);
  });

  it('ATTRAPE un questionnaire inventé', () => {
    const anomalies = anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'zone', idQuestionnaire: 'Q_INVENTE_99', zone: { type: 'couleur', couleurs: ['danger'] } } }),
      IDS,
    );
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toContain('Q_INVENTE_99');
  });

  it('ATTRAPE un drapeau sans valeur — il ne serait jamais atteint', () => {
    const anomalies = anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'drapeau', champ: 'antecedentsDomaines', valeurs: [] } }),
      IDS,
    );
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toContain('antecedentsDomaines');
  });

  it('ATTRAPE une disjonction vide — une ligne morte qui se lit comme vivante', () => {
    const anomalies = anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'ou', declencheurs: [] } }), IDS,
    );
    expect(anomalies).toEqual(['ASSIETTE-IND-BANC : disjonction sans branche']);
  });

  it('DESCEND DANS LES BRANCHES d’une disjonction — sinon `ou` serait la porte de service', () => {
    const anomalies = anomaliesDuDeclencheur(
      ligne({
        declencheur: {
          type: 'ou',
          declencheurs: [
            { type: 'zone', idQuestionnaire: QUESTIONNAIRES_CATALOG[0].id, zone: { type: 'couleur', couleurs: ['danger'] } },
            { type: 'comparaison', idQuestionnaire: 'Q_AUSSI_INVENTE', operateur: '>=', valeur: 3 },
          ],
        },
      }),
      IDS,
    );
    expect(anomalies).toEqual(['ASSIETTE-IND-BANC : questionnaire inconnu `Q_AUSSI_INVENTE`']);
  });

  it('LAISSE PASSER un déclencheur sain', () => {
    expect(anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'zone', idQuestionnaire: QUESTIONNAIRES_CATALOG[0].id, zone: { type: 'couleur', couleurs: ['danger'] } } }),
      IDS,
    )).toEqual([]);
  });

  it('AUCUNE ligne réelle ne porte d’anomalie', () => {
    // Vide aujourd'hui — et c'est pour cela que les cas ci-dessus existent : ce
    // balayage seul serait un banc vacué, donc un banc qui ment ([[D-012]],
    // [[D-015]]). Le jour où une ligne arrive, il la juge.
    expect(INDICATIONS_ASSIETTES_V1.flatMap(l => anomaliesDuDeclencheur(l, IDS))).toEqual([]);
  });

  // LE TROU QUE `D-225` AVAIT DÉCLARÉ EST FERMÉ — chantier 2 de S3. Ce bloc
  // portait jusqu'ici un test de FRANCHISE (« la mise en garde est-elle encore
  // écrite ? ») faute de garde réelle. Il porte maintenant le comportement :
  // `anomaliesDuDeclencheur` appelle `declencheursAnamnese.ts`, le validateur
  // partagé avec `ORIENTATION_RULES_V1`.
  //
  // CES CAS NE FONT PAS DOUBLON AVEC `declencheursAnamnese.test.ts`. Celui-là
  // éprouve le CORPS de la garde ; ceux-ci éprouvent son CÂBLAGE ici — une
  // assertion sur la fonction partagée seule n'aurait prouvé que son `return`,
  // jamais que cette table l'appelle.
  it('ATTRAPE un libellé d’anamnèse qui dérive — le déclencheur serait inerte', () => {
    const anomalies = anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'drapeau', champ: 'intolerancesAlimentaires', valeurs: ['Gluten '] } }),
      IDS,
    );
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toContain('intolerances_alimentaires');
  });

  it('LAISSE PASSER le même libellé écrit verbatim', () => {
    expect(anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'drapeau', champ: 'intolerancesAlimentaires', valeurs: ['Gluten'] } }),
      IDS,
    )).toEqual([]);
  });

  it('ATTRAPE un signal d’alerte — il appelle un adressage, pas une assiette', () => {
    // Arbitrage praticien du 2026-08-03, appliqué à la table qui hérite du
    // vocabulaire. Plus grave ici qu'à l'orientation : une assiette PRESCRIT là
    // qu'un questionnaire propose.
    const anomalies = anomaliesDuDeclencheur(
      ligne({
        declencheur: {
          type: 'drapeau',
          champ: 'signauxAlerte',
          valeurs: ['Idées noires ou suicidaires'],
        },
      }),
      IDS,
    );
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toContain('adressage');
  });

  it('DESCEND DANS LES BRANCHES pour les deux gardes partagées', () => {
    const anomalies = anomaliesDuDeclencheur(
      ligne({
        declencheur: {
          type: 'ou',
          declencheurs: [
            { type: 'drapeau', champ: 'signauxAlerte', valeurs: ['Idées noires ou suicidaires'] },
            { type: 'drapeau', champ: 'attentes', valeurs: ['Libellé qui n’existe pas'] },
          ],
        },
      }),
      IDS,
    );
    expect(anomalies).toHaveLength(2);
    expect(anomalies.join(' ')).toContain('attentes');
    expect(anomalies.join(' ')).toContain('adressage');
  });
});

describe('indications d’assiette — la prose ne réécrit pas le format de clé', () => {
  // LE CONSTAT DE REVUE QUI A FONDÉ CE BLOC. Les deux modules annonçaient des
  // clés à séparateur `@` quand `cleClaim` en produit d'une autre forme. Un
  // appelant suivant la prose aurait construit des clés qui ne correspondent
  // JAMAIS et reçu zéro ligne — fail-closed, mais pour une raison introuvable.
  // Le silence que `DC-24` interdit, produit par un commentaire.
  it('`cleClaim` produit bien `claimId::versionClaim`', () => {
    expect(cleClaim({ claimId: 'WN-CL-0000-001', versionClaim: 'v1.0' }))
      .toBe('WN-CL-0000-001::v1.0');
  });

  it('AUCUN module clinique ne réécrit le format à la main', () => {
    const fichiers = readdirSync(__dirname)
      .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.endsWith('.d.ts'));
    expect(fichiers.length).toBeGreaterThan(5);
    const fautifs = fichiers.filter(f =>
      /claimId@versionClaim/.test(readFileSync(join(__dirname, f), 'utf8')));
    expect(fautifs, 'la prose désigne `cleClaim`, elle ne recopie pas son format')
      .toEqual([]);
  });
});

describe('indications d’assiette — garde de source', () => {
  it('ne fige JAMAIS le sha sur la fonction de calcul', () => {
    // La tautologie que [[D-063]] a fermée : `shaPerimetre:
    // shaPerimetreIndicationsAssiettes(...)` se vérifierait toujours, et toute
    // ligne ajoutée entrerait sous une signature acquise. Le jour de
    // l'attestation, ce doit être un littéral figé à la main.
    const source = readFileSync(
      join(__dirname, 'indicationsAssiettesV1.ts'),
      'utf8',
    );
    const affectations = source.split('\n').filter(l => /^\s*shaPerimetre:/.test(l));
    expect(affectations.length, 'aucune affectation trouvée').toBeGreaterThan(0);
    for (const l of affectations) {
      expect(l, 'référence à la fonction au lieu du littéral figé')
        .not.toMatch(/shaPerimetre:\s*shaPerimetre/);
      expect(l).toMatch(/shaPerimetre:\s*(?:'[0-9a-f]{64}',|null,|string \| null;)/);
    }
    // La mise en garde est une DONNÉE de ce garde, pas une politesse.
    expect(/tautolog/i.test(source)).toBe(true);
  });
});
