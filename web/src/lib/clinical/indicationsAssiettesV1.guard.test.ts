import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { QUESTIONNAIRES_CATALOG } from '@/lib/questionnaires-catalog';
import {
  anomaliesDuDeclencheur,
  INDICATIONS_ASSIETTES_METADATA,
  INDICATIONS_ASSIETTES_V1,
  claimsDeLaLigne,
  indicationsAssiettesSignees,
  lignesIndicationAssietteServables,
  shaPerimetreIndicationsAssiettes,
  type IndicationsAssiettesMetadata,
  type LigneIndicationAssiette,
} from './indicationsAssiettesV1';
import { cleClaim } from './catalogueConduitesV1';
import { assiettesParIndication, C5B_RECOMMENDED_PLATES } from '@/lib/food-compass/plates';

// Banc de garde des indications d'assiette ([[D-225]]).
//
// CE QU'IL DOIT EMPÊCHER : qu'une ligne non attestée — ou attestée mais en
// BROUILLON, ou fondée sur un claim que le corpus ne soutient plus, ou pointant
// une assiette qui n'existe plus — atteigne un écran. Chaque terme du verrou est
// donc falsifié SÉPARÉMENT : un verrou dont on ne falsifie que l'ensemble ne
// prouve pas que chacun de ses termes mord.

// LA PREMIÈRE ENTRÉE DU CATALOGUE EST UN REPÈRE D'OBSERVATION — le
// petit-déjeuner simple, axe `moment_repas`. La fixture pointait donc une
// assiette que le verrou doit REFUSER depuis le constat de revue de la PR
// #1202 : elle prend maintenant une assiette d'indication, et l'observation
// sert de contre-épreuve.
const ASSIETTE = assiettesParIndication()[0].plateCode;
const ASSIETTE_OBSERVATION = C5B_RECOMMENDED_PLATES[0].plateCode;

// PAS DE `as LigneIndicationAssiette` ICI, ET C'EST UN CORRECTIF. Le cast
// éteignait le contrôle de champs : quand `claimsSecurite` est entré au type
// ([[D-235]]), ni `tsc` ni ce banc n'ont rougi d'une fixture qui ne le portait
// pas. Un objet littéral typé par son annotation de retour fait rougir
// l'oubli — même leçon qu'un `Record<string, string>` qui éteint le contrôle
// de clés.
function ligne(surcharges: Partial<LigneIndicationAssiette> = {}): LigneIndicationAssiette {
  return {
    id: 'ASSIETTE-IND-BANC',
    plateCode: ASSIETTE,
    declencheur: { type: 'zone', idQuestionnaire: 'Q_BANC_01', zone: { type: 'couleur', couleurs: ['danger'] } },
    claimsIndication: [{ claimId: 'WN-CL-9999-001', versionClaim: 'v1.0' }],
    claimsSecurite: [],
    raccourciAssume: null,
    statut: 'publiee',
    ...surcharges,
  };
}

/** Une signature VALIDE sur les lignes passées — le point de départ des falsifications. */
function signatureBanc(
  lignes: readonly LigneIndicationAssiette[],
  surcharges: Partial<IndicationsAssiettesMetadata> = {},
): IndicationsAssiettesMetadata {
  // LES DEUX CATÉGORIES, comme `claimsDeLaLigne` — sans quoi toute ligne
  // portant un claim de sécurité ferait échouer l'égalité ensembliste du verrou
  // et ce banc mesurerait un faux.
  const claimsSource = [...new Map(
    lignes.flatMap(l => [...l.claimsIndication, ...l.claimsSecurite]).map(c => [cleClaim(c), c]),
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
  new Set(lignes.flatMap(l => [...l.claimsIndication, ...l.claimsSecurite]).map(cleClaim));

describe('indications d’assiette — état livré', () => {
  it('ONZE LIGNES, dans cet ordre — et la métadonnée ATTESTE', () => {
    expect(INDICATIONS_ASSIETTES_V1.map(l => l.id)).toEqual([
      'ASSIETTE-IND-DOPAMINERGIQUE',
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE',
      'ASSIETTE-IND-PROTEINEE',
      'ASSIETTE-IND-SEROTONINERGIQUE',
      'ASSIETTE-IND-EPARGNE-DIGESTIVE',
      'ASSIETTE-IND-DETOXICATION',
      'ASSIETTE-IND-PSYCHOBIOTIQUE',
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE-PREVENTIVE',
      'ASSIETTE-IND-METHYLATION',
      'ASSIETTE-IND-ANTIOXYDANTE',
      'ASSIETTE-IND-OMEGA-3',
    ]);
    // PREMIÈRE SIGNATURE, 2026-09-19 ([[D-236]]). La date et le sha sont figés
    // ICI en littéraux, jamais recalculés : un banc qui recalculerait le sha
    // rendrait la comparaison tautologique et laisserait passer toute ligne
    // ajoutée après coup sous la signature acquise ([[D-063]]).
    expect(INDICATIONS_ASSIETTES_METADATA.validationExterne).toBe(true);
    expect(INDICATIONS_ASSIETTES_METADATA.dateValidation).toBe('2026-09-19T18:27:15.000Z');
    expect(INDICATIONS_ASSIETTES_METADATA.shaPerimetre)
      .toBe('92f02da47b335adc7f16443c1e74e298ee144ecec4746f60dc6ac34c6b49b35c');
    // VINGT CLAIMS POUR VINGT-ET-UNE DÉSIGNATIONS : `WN-CL-0288-013` fonde
    // l'indication de la protéinée ET porte son exception, et l'union le
    // dédoublonne.
    expect(INDICATIONS_ASSIETTES_METADATA.claimsSource).toHaveLength(20);
    expect(INDICATIONS_ASSIETTES_METADATA.claimsSource.map(cleClaim))
      .toEqual([...INDICATIONS_ASSIETTES_METADATA.claimsSource.map(cleClaim)].sort());
    // ET LE VERROU OUVRE RÉELLEMENT — sans ce terme, les sept cas ci-dessus
    // pourraient tous passer sur une signature que le verrou refuse.
    expect(indicationsAssiettesSignees()).toBe(true);
  });

  it('SEPT publiées, QUATRE en brouillon — comptées, jamais annoncées', () => {
    const parStatut = (statut: LigneIndicationAssiette['statut']) =>
      INDICATIONS_ASSIETTES_V1.filter(l => l.statut === statut).map(l => l.id);
    expect(parStatut('publiee')).toHaveLength(7);
    expect(parStatut('brouillon')).toEqual([
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE-PREVENTIVE',
      'ASSIETTE-IND-METHYLATION',
      'ASSIETTE-IND-ANTIOXYDANTE',
      'ASSIETTE-IND-OMEGA-3',
    ]);
  });

  it('chaque ligne fige ses claims CATÉGORIE PAR CATÉGORIE, et les vides sont assertés', () => {
    const parLigne = Object.fromEntries(INDICATIONS_ASSIETTES_V1.map(l => [
      l.id,
      { ind: l.claimsIndication.map(cleClaim), sec: l.claimsSecurite.map(cleClaim) },
    ]));
    expect(parLigne).toEqual({
      'ASSIETTE-IND-DOPAMINERGIQUE': { ind: ['WN-CL-0289-004::v1.0'], sec: [] },
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE': { ind: ['WN-CL-0293-011::v1.0'], sec: [] },
      'ASSIETTE-IND-PROTEINEE': {
        ind: ['WN-CL-0288-011::v1.0', 'WN-CL-0288-012::v1.0', 'WN-CL-0288-013::v1.0'],
        sec: ['WN-CL-0288-013::v1.0', 'WN-CL-0288-014::v1.0'],
      },
      'ASSIETTE-IND-SEROTONINERGIQUE': { ind: ['WN-CL-0290-005::v1.0'], sec: [] },
      'ASSIETTE-IND-EPARGNE-DIGESTIVE': {
        ind: ['WN-CL-0285-001::v1.0', 'WN-CL-0285-005::v1.0', 'WN-CL-0285-006::v1.0'],
        sec: ['WN-CL-0285-002::v1.0', 'WN-CL-0285-010::v1.0', 'WN-CL-0285-012::v1.0'],
      },
      'ASSIETTE-IND-DETOXICATION': {
        ind: ['WN-CL-0287-008::v1.0', 'WN-CL-0287-009::v1.0'], sec: [],
      },
      'ASSIETTE-IND-PSYCHOBIOTIQUE': { ind: ['WN-CL-0291-011::v1.0'], sec: [] },
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE-PREVENTIVE': { ind: ['WN-CL-0293-009::v1.0'], sec: [] },
      'ASSIETTE-IND-METHYLATION': { ind: ['WN-CL-0286-006::v1.0'], sec: [] },
      'ASSIETTE-IND-ANTIOXYDANTE': { ind: ['WN-CL-0292-003::v1.0'], sec: [] },
      'ASSIETTE-IND-OMEGA-3': { ind: ['WN-CL-0294-002::v1.0'], sec: [] },
    });
  });

  it('chaque `plateCode` existe au catalogue ET porte l’axe `indication`', () => {
    // LE VERROU NE VÉRIFIE QUE L'EXISTENCE — il accepterait donc une assiette de
    // MOMENT DE REPAS, celles de la liste d'observation du praticien. Ce cas
    // ferme l'écart : une ligne d'indication ne pointe jamais un repère
    // d'observation ([[D-230]]).
    const parIndication = new Set(assiettesParIndication().map(a => a.plateCode));
    expect(parIndication.size).toBe(12);
    for (const ligneReelle of INDICATIONS_ASSIETTES_V1) {
      expect(parIndication.has(ligneReelle.plateCode)).toBe(true);
    }
    // Dix assiettes reçoivent une ligne ; l'anti-inflammatoire en reçoit deux.
    // Les DEUX qui n'en reçoivent aucune sont la végétale et la chronobiologique
    // — relues sur pièce le 2026-09-19, aucun claim n'y fonde d'indication.
    expect(new Set(INDICATIONS_ASSIETTES_V1.map(l => l.plateCode)).size).toBe(10);
  });

  it('chaque ligne DÉCLARE son raccourci — aucune ne se tait sur ce qu’elle assume', () => {
    for (const ligneReelle of INDICATIONS_ASSIETTES_V1) {
      expect(ligneReelle.raccourciAssume, ligneReelle.id).not.toBeNull();
      expect(ligneReelle.raccourciAssume!.length, ligneReelle.id).toBeGreaterThan(80);
    }
    // Un fragment DISTINCTIF par ligne : sans lui, dix raccourcis identiques
    // passeraient le cas ci-dessus.
    const fragments: Record<string, string> = {
      'ASSIETTE-IND-DOPAMINERGIQUE': 'score FAIBLE',
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE': 'dysfonctionnels',
      'ASSIETTE-IND-PROTEINEE': 'parkinsonienne sous L-dopa',
      'ASSIETTE-IND-SEROTONINERGIQUE': 'second tour',
      'ASSIETTE-IND-EPARGNE-DIGESTIVE': 'PLUS ÉTROITE',
      'ASSIETTE-IND-DETOXICATION': 'bande B',
      'ASSIETTE-IND-PSYCHOBIOTIQUE': 'intestinale constatée',
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE-PREVENTIVE': 'classe d’âge',
      'ASSIETTE-IND-METHYLATION': 'susceptibilité',
      'ASSIETTE-IND-ANTIOXYDANTE': 'L’élargissement est réel',
      'ASSIETTE-IND-OMEGA-3': 'neuf tableaux cliniques',
    };
    for (const ligneReelle of INDICATIONS_ASSIETTES_V1) {
      expect(ligneReelle.raccourciAssume, ligneReelle.id).toContain(fragments[ligneReelle.id]);
    }
  });

  it('LES TROIS BORNES D’ÂGE PORTENT L’OPÉRATEUR DE LEUR CLAIM, et ils diffèrent', () => {
    // « plus de 50 ans » et « plus de 60 ans » s'écrivent `>` ; « dès l'âge de
    // 50 ans » s'écrit `>=`. Confondre les deux servirait une classe d'âge de
    // plus, sans qu'aucun autre banc ne le voie.
    const bornes = INDICATIONS_ASSIETTES_V1.flatMap(l => {
      const feuilles = l.declencheur.type === 'ou' ? l.declencheur.declencheurs : [l.declencheur];
      return feuilles
        .filter(f => f.type === 'age')
        .map(f => `${l.id}|${(f as { operateur: string; valeur: number }).operateur}${(f as { valeur: number }).valeur}`);
    });
    expect(bornes).toEqual([
      'ASSIETTE-IND-PROTEINEE|>60',
      'ASSIETTE-IND-ANTI-INFLAMMATOIRE-PREVENTIVE|>=50',
      'ASSIETTE-IND-METHYLATION|>50',
    ]);
  });

  it('LES QUATRE BROUILLONS DÉCLARENT que leur vraie porte est biologique', () => {
    // Arbitrage du responsable, 2026-09-19 : ces assiettes se proposent sur le
    // RÉSULTAT biologique, et la porte écrite n'en est qu'un proxy d'anamnèse.
    // Le motif doit vivre sur CHAQUE ligne, pas seulement dans le chapeau : un
    // statut changé à un seul endroit est le défaut que la revue a relevé quatre
    // fois cette semaine.
    const brouillons = INDICATIONS_ASSIETTES_V1.filter(l => l.statut === 'brouillon');
    expect(brouillons).toHaveLength(4);
    for (const b of brouillons) {
      expect(b.raccourciAssume, b.id).toMatch(/biologique|marqueur|homocystéine/);
    }
  });

  it('LES SEPT PUBLIÉES SORTENT, les quatre brouillons restent dedans', () => {
    // Sur la signature RÉELLE, cette fois — pas celle du banc.
    const servies = lignesIndicationAssietteServables(
      claimsValidesDe(INDICATIONS_ASSIETTES_V1),
    );
    expect(servies.map(l => l.id)).toEqual(
      INDICATIONS_ASSIETTES_V1.filter(l => l.statut === 'publiee').map(l => l.id),
    );
    expect(servies).toHaveLength(7);
  });

  it('LE FAIL-CLOSED TIENT MALGRÉ LA SIGNATURE — deux fermetures, deux motifs', () => {
    // `null` = l'ensemble des claims valides N'A PAS PU ÊTRE LU ; `Set()` =
    // aucun claim n'est valide. Les deux ferment, et ce ne sont pas les mêmes
    // faits — confondre les deux est le silence que `DC-24` interdit.
    expect(lignesIndicationAssietteServables(null)).toEqual([]);
    expect(lignesIndicationAssietteServables(new Set())).toEqual([]);
  });

  it('UN CLAIM QUI CESSE D’ÊTRE VALIDE retire SA ligne, et elle seule', () => {
    // Boucle sur les VINGT claims du périmètre : en retirer un ne doit retirer
    // que les lignes qui le citent. Un balayage global ne dirait pas lesquelles.
    for (const claim of INDICATIONS_ASSIETTES_METADATA.claimsSource) {
      const valides = new Set(claimsValidesDe(INDICATIONS_ASSIETTES_V1));
      valides.delete(cleClaim(claim));
      const servies = lignesIndicationAssietteServables(valides);
      const attendues = INDICATIONS_ASSIETTES_V1.filter(
        l => l.statut === 'publiee'
          && !claimsDeLaLigne(l).some(c => cleClaim(c) === cleClaim(claim)),
      );
      expect(servies.map(l => l.id), cleClaim(claim)).toEqual(attendues.map(l => l.id));
    }
  });

  it('SIGNÉE PAR LE BANC : les sept publiées sortent, les trois brouillons restent dedans', () => {
    // La signature est CALCULÉE ici, jamais lue dans la métadonnée réelle — sans
    // quoi ce cas attendrait une attestation qui n'existe pas.
    const lignes = INDICATIONS_ASSIETTES_V1;
    const servies = lignesIndicationAssietteServables(
      claimsValidesDe(lignes), signatureBanc(lignes), lignes,
    );
    expect(servies.map(l => l.id)).toEqual(
      lignes.filter(l => l.statut === 'publiee').map(l => l.id),
    );
    expect(servies).toHaveLength(7);
  });

  it('L’UNION DÉDOUBLONNE — `WN-CL-0288-013` fonde l’indication ET porte sa réserve', () => {
    const proteinee = INDICATIONS_ASSIETTES_V1.find(l => l.id === 'ASSIETTE-IND-PROTEINEE')!;
    expect(proteinee.claimsIndication.map(cleClaim)).toContain('WN-CL-0288-013::v1.0');
    expect(proteinee.claimsSecurite.map(cleClaim)).toContain('WN-CL-0288-013::v1.0');
    const cites = claimsDeLaLigne(proteinee).map(cleClaim);
    expect(cites).toHaveLength(5);
    expect(new Set(cites).size).toBe(4);
    // Le périmètre signé, lui, ne le compte qu'une fois — et le verrou ouvre.
    const lignes = [proteinee];
    expect(indicationsAssiettesSignees(signatureBanc(lignes), lignes)).toBe(true);
    expect(signatureBanc(lignes).claimsSource).toHaveLength(4);
  });

  it('UN CLAIM DE SÉCURITÉ retiré du corpus retire SA ligne du service', () => {
    // Une sécurité retirée pèse autant qu'une indication retirée — davantage
    // même, puisque c'est elle qui devait retenir.
    const lignes = INDICATIONS_ASSIETTES_V1;
    const valides = new Set(claimsValidesDe(lignes));
    valides.delete('WN-CL-0285-012::v1.0');
    const servies = lignesIndicationAssietteServables(valides, signatureBanc(lignes), lignes);
    expect(servies.map(l => l.id)).not.toContain('ASSIETTE-IND-EPARGNE-DIGESTIVE');
    expect(servies).toHaveLength(6);
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

  it('7 bis. UNE ASSIETTE D’OBSERVATION ferme la table — l’existence ne suffit pas', () => {
    // Le catalogue porte deux axes : une ligne d'indication pointant un repère de
    // moment de repas serait signée, puis SERVIE, en franchissant la séparation
    // observation/prescription. Constat de revue, PR #1202.
    expect(C5B_RECOMMENDED_PLATES.find(a => a.plateCode === ASSIETTE_OBSERVATION)?.axe)
      .toBe('moment_repas');
    const lignes = [ligne({ plateCode: ASSIETTE_OBSERVATION })];
    expect(indicationsAssiettesSignees(signatureBanc(lignes), lignes)).toBe(false);
    expect(lignesIndicationAssietteServables(
      claimsValidesDe(lignes), signatureBanc(lignes), lignes,
    )).toEqual([]);
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

  // LA BORNE D'ÂGE ([[D-231]]). Le type garde l'opérateur, jamais le nombre :
  // `0` rendrait la ligne servable pour tout le monde, et une borne
  // fractionnaire ne serait jamais atteinte — un âge révolu est toujours entier.
  it('ATTRAPE une borne d’âge implausible', () => {
    for (const valeur of [0, -5, 4.5, 200]) {
      const anomalies = anomaliesDuDeclencheur(
        ligne({ declencheur: { type: 'age', operateur: '>=', valeur } }),
        IDS,
      );
      expect(anomalies, `borne ${valeur}`).toHaveLength(1);
      expect(anomalies[0]).toContain('âge');
    }
  });

  it('LAISSE PASSER les trois bornes que les claims citent', () => {
    // 50, 60 et 70 — `WN-CL-0286-006`, `WN-CL-0288-011`, `WN-CL-0293-009`.
    // Qu'un claim les porte est ce qu'aucun banc ne peut dire : seule la
    // relecture le voit. Ce cas vérifie la seule chose vérifiable — la forme.
    for (const valeur of [50, 60, 70]) {
      expect(anomaliesDuDeclencheur(
        ligne({ declencheur: { type: 'age', operateur: '>=', valeur } }),
        IDS,
      ), `borne ${valeur}`).toEqual([]);
    }
  });

  // L'EXCLUSION ALIMENTAIRE ([[D-232]]). Deux formes mortes ou trompeuses, et
  // aucune ne se voit à la relecture du texte de la ligne.
  it('ATTRAPE une exclusion alimentaire sans valeur, ou citant `inconnu`', () => {
    const sansValeur = anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'exclusionAlimentaire', valeurs: [] } }), IDS,
    );
    expect(sansValeur).toHaveLength(1);
    expect(sansValeur[0]).toContain('sans aucune valeur');

    // `inconnu` est la valeur de l'IGNORANCE : une ligne qui la cite s'allumerait
    // sur un patient qui n'a pas répondu.
    const surInconnu = anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'exclusionAlimentaire', valeurs: ['vegetalienne', 'inconnu'] } }),
      IDS,
    );
    expect(surInconnu).toHaveLength(1);
    expect(surInconnu[0]).toContain('inconnu');
  });

  it('LAISSE PASSER les deux régimes que `WN-CL-0286-006` nomme', () => {
    expect(anomaliesDuDeclencheur(
      ligne({ declencheur: { type: 'exclusionAlimentaire', valeurs: ['vegetarienne', 'vegetalienne'] } }),
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
