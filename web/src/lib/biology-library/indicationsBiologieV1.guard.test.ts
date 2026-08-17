import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';
import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_SHA256,
  INDICATIONS_BIOLOGIE_V1,
  signatureIndicationsValide,
} from './indicationsBiologieV1';

// Revue du 2026-08-16 (suites de [[D-063]]/[[D-064]]) — l'instruction de
// signature de cette table prescrivait `shaPerimetre =
// INDICATIONS_BIOLOGIE_SHA256`, et cette écriture, exécutée telle quelle,
// cassait ou neutralisait le verrou : `ReferenceError` à l'import (la
// constante est déclarée après la métadonnée), ou — réordonnée pour
// compiler — concordance TAUTOLOGIQUE d'un SHA recalculé à chaque chargement
// avec lui-même, qui ne détecterait plus jamais une péremption. Les priorités
// et l'arrêt ont chacun leur littéral épinglé ; la biologie n'avait rien, et
// c'est précisément la table dont la signature est la plus fragile.
//
// Deux gardes, deux natures :
// 1. le LITTÉRAL épinglé (patron `SHA_CONTENU_…` des priorités) — toute
//    première règle ajoutée fait rougir ce banc, et le remède documenté est de
//    RE-SIGNER, pas de mettre le littéral à jour en silence ;
// 2. la LECTURE DU TEXTE — aucune assertion à l'exécution ne peut distinguer
//    un littéral d'une référence tautologique, puisque les deux produisent la
//    même valeur au chargement. Seul le source le montre.

const SOURCE = readFileSync(path.join(__dirname, 'indicationsBiologieV1.ts'), 'utf8');

// Le code seul, sans les lignes de commentaire : la mise en garde de
// l'instruction CITE l'écriture interdite, et c'est voulu — elle ne doit pas
// faire rougir le garde qui l'exige.
const CODE_SANS_COMMENTAIRES = SOURCE.split('\n')
  .filter(ligne => !ligne.trimStart().startsWith('//') && !ligne.trimStart().startsWith('*'))
  .join('\n');

// SHA du contenu SIGNÉ — quinze règles depuis [[D-069]] (la table vide de
// [[D-059]] §2 est l'histoire, son sha `4f53cda1…` avec elle). METTRE CE
// LITTÉRAL À JOUR NE VAUT PAS SIGNATURE : le jour où il rougit, une règle a
// bougé dans le périmètre, et c'est la relecture praticien (date + claims +
// `shaPerimetre` figé) qui est due — jamais une mise à jour silencieuse.
const SHA_CONTENU_2026_08_17 = 'a2f28c0be27051c1c93833197659f9dba19afda2a96305e8b61157ebb38acb8f';

describe('indications biologie — le verrou de signature ne peut pas être neutralisé', () => {
  it('le sha publié est celui du contenu réellement porté par la table', () => {
    expect(INDICATIONS_BIOLOGIE_V1).toHaveLength(15);
    expect(INDICATIONS_BIOLOGIE_SHA256).toBe(SHA_CONTENU_2026_08_17);
  });

  // Le piège exact de la revue : `shaPerimetre` câblé sur la constante au lieu
  // d'un littéral. Vérifiable UNIQUEMENT dans le texte — à l'exécution, la
  // tautologie est indiscernable d'une signature légitime posée le jour même.
  it('la métadonnée ne référence jamais INDICATIONS_BIOLOGIE_SHA256 — littéral figé obligatoire', () => {
    expect(CODE_SANS_COMMENTAIRES).not.toMatch(/shaPerimetre:\s*INDICATIONS_BIOLOGIE_SHA256/);
  });

  // L'instruction corrigée doit rester celle du littéral : si quelqu'un
  // resserre le commentaire un jour, qu'il ne ressuscite pas l'ancienne
  // consigne. On exige la mise en garde, pas une formule exacte.
  it('la signature posée prescrit le littéral et porte la mise en garde', () => {
    expect(SOURCE).toContain('littéral figé');
    expect(SOURCE).toContain('recopiée');
    // La constante n'apparaît dans le code que pour être DÉFINIE et exportée —
    // jamais comme valeur de la métadonnée (le garde du dessus le tient), et
    // le commentaire de la signature explique la péremption.
    expect(SOURCE).toContain('Toute règle retouchée après cette signature');
  });

  // SIGNÉE le 2026-08-17 ([[D-069]]) : le verrou est OUVERT côté signature —
  // le drapeau `WN_CB_ENABLED` reste le second terme du ET, et il est éteint.
  // Sentinelle INVERSÉE, jamais supprimée : une dé-signature accidentelle, une
  // date malformée ou un sha qui ne concorde plus rougissent ici, et tout
  // changement d'état s'accompagne du tableau de `docs/FEATURE_FLAGS.md`
  // (gardé par `verrousSignatureDocumentes.guard`).
  it('l\'état livré est signé aux cinq termes, et le verdict le dit', () => {
    expect(INDICATIONS_BIOLOGIE_METADATA.dateValidation).toBe('2026-08-17T00:00:00.000Z');
    expect(INDICATIONS_BIOLOGIE_METADATA.claimsSource.length).toBe(29);
    expect(INDICATIONS_BIOLOGIE_METADATA.shaPerimetre).toBe(INDICATIONS_BIOLOGIE_SHA256);
    expect(signatureIndicationsValide(INDICATIONS_BIOLOGIE_METADATA)).toBe(true);
  });

  // Ce que la signature LÉGITIME donnera : un littéral posé au moment de la
  // relecture concorde tant que la table ne bouge pas…
  // CONTRE-ÉPREUVES DES TERMES INVERSÉS (revue D-069, finding 4) : après
  // inversion des sentinelles, seuls « tout absent » et « sha étranger »
  // restaient éprouvés — la date non canonique et les claims vides n'étaient
  // tenus que par accident (l'égalité littérale à la date épinglée).
  it('une date non canonique ou des claims vides ferment le verrou — chaque terme séparément', () => {
    for (const malFormee of ['2026-08-17', '2026-08-17T00:00:00Z', 'demain']) {
      expect(
        signatureIndicationsValide({ ...INDICATIONS_BIOLOGIE_METADATA, dateValidation: malFormee }),
        `date « ${malFormee} » acceptée`,
      ).toBe(false);
    }
    expect(
      signatureIndicationsValide({ ...INDICATIONS_BIOLOGIE_METADATA, claimsSource: [] }),
    ).toBe(false);
  });

  it('une signature au littéral figé ouvre le verrou tant que le périmètre est celui relu', () => {
    expect(
      signatureIndicationsValide({
        validationExterne: true,
        dateValidation: '2026-08-16T00:00:00.000Z',
        claimsSource: [{ claimId: 'WN-CL-0000-001', versionClaim: 'v1.0' }],
        shaPerimetre: SHA_CONTENU_2026_08_17,
      }),
    ).toBe(true);
  });

  // …et cesse de concorder dès que le contenu bouge — la propriété que la
  // tautologie aurait détruite, éprouvée plutôt qu'affirmée.
  it('le même littéral ferme le verrou dès que le périmètre change', () => {
    const shaApresAjout = 'sha-d-un-perimetre-qui-a-bouge';
    expect(
      signatureIndicationsValide(
        {
          validationExterne: true,
          dateValidation: '2026-08-16T00:00:00.000Z',
          claimsSource: [{ claimId: 'WN-CL-0000-001', versionClaim: 'v1.0' }],
          shaPerimetre: SHA_CONTENU_2026_08_17,
        },
        shaApresAjout,
      ),
    ).toBe(false);
  });
});
