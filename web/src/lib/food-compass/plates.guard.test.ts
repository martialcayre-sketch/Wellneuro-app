import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  C5B_PLATE_CATALOG_HASH,
  C5B_RECOMMENDED_PLATES,
  assertCurrentRecommendedPlateRef,
  assertRefAssietteDObservation,
  assiettesParIndication,
  assiettesParMomentDeRepas,
  estAssietteDObservation,
  getCurrentRecommendedPlateRef,
} from './plates';

// BANC DE GARDE DU CATALOGUE C5B ÉTENDU ([[D-230]]).
//
// CE QU'IL DOIT EMPÊCHER, ET DANS CET ORDRE D'IMPORTANCE :
//
//   1. qu'une référence d'assiette DÉJÀ CONSIGNÉE en production devienne
//      caduque — c'est le seul défaut de ce lot qui casserait un dossier ;
//   2. que les deux axes se mélangent dans une liste servie au praticien ;
//   3. qu'une assiette d'indication cite un protocole que le registre ne
//      soutient pas, ou n'en cite aucun.

/** Le registre des sources, lu depuis le dépôt — il porte les 507 sources du corpus. */
const REGISTRE: Array<{ sourceId: string; prescriptive: boolean; documentType: string }> =
  JSON.parse(readFileSync(join(__dirname, '../../../../docs/claude/corpus/source_registry.json'), 'utf8'));

describe('catalogue C5B — les trois repères historiques sont INTACTS', () => {
  // LE BANC QUI COMPTE. Une référence consignée sur un dossier porte
  // `contentHash` et `refHash` ; `assertCurrentRecommendedPlateRef` refuse toute
  // référence dont ils ont bougé. Ces six littéraux sont ceux du 2026-07 :
  // recopiés ici, PAS recalculés — un recalcul se contenterait de suivre la
  // dérive qu'il est censé attraper ([[D-063]], même piège).
  const AVANT_EXTENSION = [
    {
      plateCode: 'ASSIETTE_PETIT_DEJEUNER_SIMPLE',
      contentHash: '2c3650b80985de2819205a8e982e27a6dd26feb2fdd9eda6ba6f8dc36ddd3cdc',
      refHash: '7f89d226226fc7c411b8c1ac640126b4bca2978844e26388305adb7dfa8e34ea',
    },
    {
      plateCode: 'ASSIETTE_DEJEUNER_EXTERIEUR',
      contentHash: 'd063a62aad641c68955331754e7f6ea098dddfbd3fd2de44ba58bee5e0d232db',
      refHash: 'd070a4eb1884a015f2b0676ed2d5413ef71edbd5d308056c2b3c02db45f5adb7',
    },
    {
      plateCode: 'ASSIETTE_SOIR_LEGER',
      contentHash: '4140aa2ca64887edd7cce0e40661f49d77b51fbda6d575ca2a0c32ba1baf9454',
      refHash: 'de3ddfaba871e778f84cca076247bf4e30a230121c974faa06bc797811d34e86',
    },
  ];

  it('AUCUNE référence déjà posée en production ne devient caduque', () => {
    for (const attendu of AVANT_EXTENSION) {
      const plate = C5B_RECOMMENDED_PLATES.find(p => p.plateCode === attendu.plateCode);
      expect(plate, `${attendu.plateCode} a disparu du catalogue`).toBeDefined();
      expect(plate!.contentHash, `${attendu.plateCode} : contentHash déplacé`).toBe(attendu.contentHash);
      expect(plate!.ref.refHash, `${attendu.plateCode} : refHash déplacé`).toBe(attendu.refHash);
      expect(plate!.ref.contentHash).toBe(attendu.contentHash);
    }
  });

  // CONTRE-ÉPREUVE DU BANC CI-DESSUS, et elle n'est pas décorative : elle prouve
  // POURQUOI les deux champs neufs sont hors du `contentHash`. Les y faire entrer
  // produirait une autre empreinte — donc périmerait toutes les références
  // consignées. Le calcul ci-dessous le montre sur une entrée réelle.
  it('`axe` et `sourceProtocole` sont HORS du contentHash — et les y mettre casserait tout', () => {
    const plate = C5B_RECOMMENDED_PLATES[0];
    const surLesQuatre = canonicalSha256({
      catalogVersion: plate.catalogVersion,
      plateCode: plate.plateCode,
      label: plate.label,
      substitutionFamily: plate.substitutionFamily,
    });
    expect(surLesQuatre).toBe(plate.contentHash);

    const avecLesDeuxNeufs = canonicalSha256({
      catalogVersion: plate.catalogVersion,
      plateCode: plate.plateCode,
      label: plate.label,
      substitutionFamily: plate.substitutionFamily,
      axe: plate.axe,
      sourceProtocole: plate.sourceProtocole,
    });
    expect(avecLesDeuxNeufs).not.toBe(plate.contentHash);
  });

  it('le hash de catalogue, lui, a bien bougé — l’extension n’est pas silencieuse', () => {
    expect(canonicalSha256(C5B_RECOMMENDED_PLATES.map(({ ref: _ref, ...plate }) => plate)))
      .toBe(C5B_PLATE_CATALOG_HASH);
    expect(C5B_PLATE_CATALOG_HASH)
      .not.toBe('7f8440bea95ead9b10ec0c7aa7b894a532f0e9c5891378efcbf6234aa9a8f117');
  });
});

describe('catalogue C5B — les deux axes ne se mélangent pas', () => {
  it('les deux points de service PARTITIONNENT le catalogue', () => {
    const moments = assiettesParMomentDeRepas();
    const indications = assiettesParIndication();
    expect(moments).toHaveLength(3);
    expect(indications).toHaveLength(12);
    // Partition : aucun recouvrement, et rien qui échappe aux deux. Sans ce
    // dernier terme, un troisième axe ajouté plus tard sortirait des deux listes
    // sans que rien ne le dise — donc deviendrait invisible en silence.
    expect(moments.length + indications.length).toBe(C5B_RECOMMENDED_PLATES.length);
    const codes = new Set([...moments, ...indications].map(p => p.plateCode));
    expect(codes.size).toBe(C5B_RECOMMENDED_PLATES.length);
  });

  it('LA LISTE D’OBSERVATION NE REND QUE LES TROIS REPÈRES — le défaut que ce lot ferme', () => {
    expect(assiettesParMomentDeRepas().map(p => p.plateCode)).toEqual([
      'ASSIETTE_PETIT_DEJEUNER_SIMPLE',
      'ASSIETTE_DEJEUNER_EXTERIEUR',
      'ASSIETTE_SOIR_LEGER',
    ]);
    // Et aucune des douze n'y entre, quelle que soit la façon de les compter.
    expect(assiettesParMomentDeRepas().some(p => p.sourceProtocole !== null)).toBe(false);
  });

  it('les trois repères n’ont AUCUNE source, les douze en ont toutes une', () => {
    for (const plate of assiettesParMomentDeRepas()) {
      expect(plate.sourceProtocole, `${plate.plateCode} ne devrait citer aucun protocole`).toBeNull();
    }
    for (const plate of assiettesParIndication()) {
      expect(plate.sourceProtocole, `${plate.plateCode} ne cite aucun protocole`).not.toBeNull();
    }
  });
});

describe('catalogue C5B — les douze assiettes face au registre des sources', () => {
  it('le registre est lisible et dense — sinon tout ce bloc mentirait', () => {
    // Anti-vacuité : sur un registre vide, chaque recherche rendrait `undefined`
    // et les cas ci-dessous passeraient pour la mauvaise raison.
    expect(REGISTRE.length).toBeGreaterThan(400);
  });

  /** Le prédicat, extrait pour être éprouvé sur autre chose que les douze saines. */
  function sourceRecevable(sourceId: string | null): boolean {
    const source = REGISTRE.find(s => s.sourceId === sourceId);
    return source !== undefined && source.prescriptive === true
      && source.documentType.includes('Protocole');
  }

  it('chaque assiette d’indication cite un protocole PRESCRIPTIF du registre', () => {
    for (const plate of assiettesParIndication()) {
      expect(sourceRecevable(plate.sourceProtocole), `${plate.plateCode} → ${plate.sourceProtocole}`)
        .toBe(true);
    }
  });

  // CONTRE-ÉPREUVE, ET ELLE N'EST PAS DÉCORATIVE. Les douze sources réelles sont
  // toutes recevables : le balayage ci-dessus resterait vert quoi qu'on fasse au
  // corps du prédicat ([[D-012]], [[D-015]] — un banc vacué est un banc qui
  // ment). Ce cas le joue sur ce que [[D-216]] interdit nommément : la FICHE
  // PATIENT de la même assiette, `prescriptive: false`, absente du registre des
  // interventions, et que le registre déclare impropre à fonder une règle.
  it('REFUSE une fiche patient — le piège exact que [[D-216]] nomme', () => {
    // `WN-SRC-0296` est la fiche de l'assiette végétale, dont le protocole est
    // `WN-SRC-0284` : deux documents de la MÊME assiette, un seul fait règle.
    expect(sourceRecevable('WN-SRC-0284')).toBe(true);
    expect(sourceRecevable('WN-SRC-0296')).toBe(false);
    // Et un identifiant hors registre ne passe pas davantage.
    expect(sourceRecevable('WN-SRC-9999')).toBe(false);
    expect(sourceRecevable(null)).toBe(false);
  });

  // L'APPARIEMENT EST ÉPINGLÉ PAIRE PAR PAIRE, PAS COMME UN ENSEMBLE — constat
  // de revue, vérifié et fondé. La version précédente comparait les douze
  // identifiants TRIÉS : intervertir `sourceProtocole` entre deux assiettes
  // l'aurait laissée verte, tout en attribuant à chacune le protocole de
  // l'autre. Or c'est précisément cette provenance qui rend l'axe vérifiable
  // ([[D-230]] §4) — un banc qui ne voit pas l'échange ne garde rien.
  it('chaque assiette est appariée à SON protocole, nommément', () => {
    const paires = assiettesParIndication().map(p => [p.plateCode, p.sourceProtocole]);
    expect(paires).toEqual([
      ['ASSIETTE_VEGETALE', 'WN-SRC-0284'],
      ['ASSIETTE_EPARGNE_DIGESTIVE', 'WN-SRC-0285'],
      ['ASSIETTE_METHYLATION', 'WN-SRC-0286'],
      ['ASSIETTE_DETOXICATION', 'WN-SRC-0287'],
      ['ASSIETTE_PROTEINEE', 'WN-SRC-0288'],
      ['ASSIETTE_DOPAMINERGIQUE', 'WN-SRC-0289'],
      ['ASSIETTE_SEROTONINERGIQUE', 'WN-SRC-0290'],
      ['ASSIETTE_PSYCHOBIOTIQUE', 'WN-SRC-0291'],
      ['ASSIETTE_ANTIOXYDANTE', 'WN-SRC-0292'],
      ['ASSIETTE_ANTI_INFLAMMATOIRE', 'WN-SRC-0293'],
      ['ASSIETTE_OMEGA_3', 'WN-SRC-0294'],
      ['ASSIETTE_CHRONOBIOLOGIQUE', 'WN-SRC-0295'],
    ]);
  });

  it('aucun `plateCode` en double dans le catalogue entier', () => {
    const codes = C5B_RECOMMENDED_PLATES.map(p => p.plateCode);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it('aucune famille de substitution n’est déclarée — [[D-216]] §4', () => {
    for (const plate of C5B_RECOMMENDED_PLATES) {
      expect(plate.substitutionFamily, `${plate.plateCode} déclare une famille`).toBeNull();
    }
  });
});

// LA BRÈCHE QUE CE LOT A OUVERTE, ET QU'IL REFERME — constat de revue, vérifié
// et fondé.
//
// Tant que le catalogue portait TROIS entrées, `assertCurrentRecommendedPlateRef`
// valait partition : il n'existait rien d'autre à attacher à une observation. En
// le portant à quinze, ce lot a ÉLARGI cette porte — et le filtre de la liste
// déroulante ne protège que l'écran. Deux chemins la contournent : un brouillon
// `sessionStorage` rouvert plus tard, et un POST forgé.
describe('catalogue C5B — l’axe est gardé au DOMAINE, pas seulement à l’écran', () => {
  it('`estAssietteDObservation` distingue les deux axes, et ignore l’inconnu', () => {
    expect(estAssietteDObservation('ASSIETTE_SOIR_LEGER')).toBe(true);
    expect(estAssietteDObservation('ASSIETTE_DOPAMINERGIQUE')).toBe(false);
    expect(estAssietteDObservation('ASSIETTE_QUI_N_EXISTE_PAS')).toBe(false);
  });

  it('REFUSE une référence d’assiette d’indication sur une observation', () => {
    const indication = getCurrentRecommendedPlateRef('ASSIETTE_DOPAMINERGIQUE');
    // La référence est parfaitement COURANTE — c'est bien l'axe, et lui seul,
    // qui la refuse. Sans ce terme, elle passerait.
    expect(assertCurrentRecommendedPlateRef(indication)).toEqual(indication);
    expect(() => assertRefAssietteDObservation(indication)).toThrow(/observation alimentaire/);
  });

  it('LAISSE PASSER un repère de moment de repas', () => {
    const observation = getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER');
    expect(assertRefAssietteDObservation(observation)).toEqual(observation);
  });

  it('une référence CADUQUE se dit caduque, pas « du mauvais axe » — l’ordre des termes compte', () => {
    const observation = getCurrentRecommendedPlateRef('ASSIETTE_SOIR_LEGER');
    expect(() => assertRefAssietteDObservation({ ...observation, catalogVersion: 'catalog-v0' }))
      .toThrow(/caduque/);
  });
});
