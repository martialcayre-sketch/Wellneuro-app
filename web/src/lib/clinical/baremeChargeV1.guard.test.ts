import { describe, expect, it } from 'vitest';
import {
  BAREME_CHARGE_METADATA,
  BAREME_CHARGE_V1,
  baremeChargeSigne,
  lignesBaremeServables,
  mesurerProtocole,
  type LigneBaremeCharge,
} from './baremeChargeV1';
import { readFileSync } from 'fs';
import { join } from 'path';
import { chevauchementsBareme, suggererDepuisLignes } from './baremeChargePur';
import { MAX_ACTIONS_PROTOCOLE_21J } from '@/lib/clinical-engine/types';
import type { ProtocolAction } from '@/lib/clinical-engine/types';

function action(surcharges: Partial<ProtocolAction> = {}): ProtocolAction {
  return {
    actionId: 'a1',
    type: 'food',
    title: 'Intitulé',
    idealPlan: 'Idéal',
    minimalPlan: 'Minimal',
    rescuePlan: 'Secours',
    limitations: [],
    ...surcharges,
  } as ProtocolAction;
}

function ligne(surcharges: Partial<LigneBaremeCharge> = {}): LigneBaremeCharge {
  return {
    id: 'L1',
    terme: 'nombreActionsFermes',
    min: 3,
    max: null,
    niveau: 'loaded',
    motif: 'Motif de banc — aucune valeur clinique.',
    statut: 'publiee',
    ...surcharges,
  };
}

const SIGNATURE_BANC = (lignes: LigneBaremeCharge[]) => ({
  validationExterne: true,
  dateValidation: '2026-09-15T10:00:00.000Z',
  shaPerimetre: require('crypto').createHash('sha256').update(JSON.stringify(lignes), 'utf8').digest('hex'),
});

describe('barème de charge — le verrou de signature', () => {
  // LA TABLE RÉELLE EST SIGNÉE, ET SA SIGNATURE SE RECOUPE. Le banc l'exerce sur
  // le contenu VRAI : une ligne retouchée sans re-signature fait rougir ici, et
  // c'est tout l'objet du SHA de périmètre ([[D-063]]).
  it('la table réelle est signée, et son SHA concorde', () => {
    expect(BAREME_CHARGE_METADATA.validationExterne).toBe(true);
    expect(BAREME_CHARGE_METADATA.dateValidation).toBe('2026-09-15T00:00:00.000Z');
    expect(baremeChargeSigne()).toBe(true);
  });

  // L'ÉCHELLE RATIFIÉE : un seul terme, contiguë, sans trou ni recouvrement, et
  // ne montant jamais jusqu'à `excessive` — qui reste un jugement du praticien
  // sur CE patient.
  it('l’échelle ratifiée tient sa forme', () => {
    expect(BAREME_CHARGE_V1).toHaveLength(3);
    expect(new Set(BAREME_CHARGE_V1.map(l => l.terme))).toEqual(new Set(['nombreActionsFermes']));
    expect(BAREME_CHARGE_V1.map(l => l.niveau)).toEqual(['light', 'moderate', 'loaded']);
    expect(BAREME_CHARGE_V1.some(l => l.niveau === 'excessive')).toBe(false);
    expect(chevauchementsBareme(BAREME_CHARGE_V1)).toEqual([]);
    // Contiguïté : aucune valeur de 0 à MAX_ACTIONS_PROTOCOLE_21J ne tombe dans
    // un trou. Un trou serait un silence que personne n'a décidé.
    for (let valeur = 0; valeur <= MAX_ACTIONS_PROTOCOLE_21J; valeur += 1) {
      const couvrantes = BAREME_CHARGE_V1.filter(l =>
        (l.min === null || valeur >= l.min) && (l.max === null || valeur <= l.max));
      expect(couvrantes).toHaveLength(1);
    }
  });

  // AUCUNE SOURCE CLINIQUE NE PORTE CES BORNES, et le module doit le dire : une
  // convention ratifiée n'est pas une règle sourcée, et les confondre ferait
  // lire au praticien une certification qu'il n'a pas donnée.
  it('la table dit qu’elle est une convention, pas une règle sourcée', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/clinical/baremeChargeV1.ts'),
      'utf8',
    );
    expect(source).toMatch(/aucune source clinique/i);
    expect(source).toMatch(/convention d'organisation|convention d’organisation/i);
    // Pas de `claimsSource` : il n'aurait rien à porter, et un champ vide se
    // lirait comme un oubli.
    expect(source).not.toMatch(/claimsSource:/);
  });

  // SIGNER ZÉRO LIGNE N'ATTESTE AUCUNE RELECTURE. Sans ce terme, un booléen
  // basculé suffirait à « signer » une table vide.
  it('refuse une signature posée sur une table vide', () => {
    expect(baremeChargeSigne(SIGNATURE_BANC([]), [])).toBe(false);
  });

  it('refuse un booléen seul, sans date ni SHA', () => {
    const lignes = [ligne()];
    expect(baremeChargeSigne({ validationExterne: true, dateValidation: null, shaPerimetre: null }, lignes)).toBe(false);
    expect(baremeChargeSigne({ ...SIGNATURE_BANC(lignes), dateValidation: '15/09/2026' }, lignes)).toBe(false);
    expect(baremeChargeSigne({ ...SIGNATURE_BANC(lignes), shaPerimetre: null }, lignes)).toBe(false);
  });

  // LE DÉFAUT QUE `D-063` A FERMÉ, ET QUI EST FERMÉ ICI DÈS LA PREMIÈRE LIGNE :
  // une ligne ajoutée après la signature entrerait sous une signature acquise.
  it('refuse dès qu’une ligne bouge après la signature', () => {
    const lignes = [ligne()];
    const signature = SIGNATURE_BANC(lignes);
    expect(baremeChargeSigne(signature, lignes)).toBe(true);
    expect(baremeChargeSigne(signature, [...lignes, ligne({ id: 'L2', niveau: 'excessive' })])).toBe(false);
    expect(baremeChargeSigne(signature, [ligne({ min: 2 })])).toBe(false);
  });
});

describe('barème de charge — ce qu’il mesure et ce qu’il suggère', () => {
  it('ne compte pas une action suspendue parmi les actions engagées', () => {
    const mesure = mesurerProtocole([
      action({ actionId: 'a1', interventionStatus: 'active' }),
      action({ actionId: 'a2', type: 'chronobiology' }),
      action({ actionId: 'a3', type: 'supplement_exploration', interventionStatus: 'conditionnelle_biologie' }),
    ]);
    expect(mesure.nombreActions).toBe(3);
    expect(mesure.nombreActionsFermes).toBe(2);
    expect(mesure.typesDistincts).toBe(2);
  });

  // L'ÉCART ENTRE PLAN IDÉAL ET PLAN MINIMAL est la seule des quatre mesures
  // qui parle de l'effort plutôt que du volume : c'est lui que le patient vit
  // les jours difficiles.
  it('compte l’écart entre plan idéal et plan minimal', () => {
    const mesure = mesurerProtocole([
      action({ actionId: 'a1', idealPlan: 'Chaque matin', minimalPlan: 'Trois matins' }),
      action({ actionId: 'a2', idealPlan: 'Pareil', minimalPlan: 'Pareil' }),
    ]);
    expect(mesure.actionsAvecEcartDePlan).toBe(1);
  });

  // FAIL-CLOSED, ET PAS UN DÉFAUT ACCUEILLANT. Le dépôt a mesuré ce que devient
  // une table vide dont le chemin sert quand même : `clinical_rules`, alertes
  // compléments et seuils ingrédients portent ZÉRO ligne chacune.
  it('ne suggère RIEN tant que le barème n’est pas signé', () => {
    const mesure = mesurerProtocole([action(), action({ actionId: 'a2' }), action({ actionId: 'a3' })]);
    // Sur une table NON signée, rien n'est servi, donc rien n'est suggéré.
    expect(suggererDepuisLignes(mesure, lignesBaremeServables([ligne()], {
      validationExterne: false, dateValidation: null, shaPerimetre: null,
    }))).toBeNull();
  });

  it('suggère le niveau de la ligne signée qui s’applique, avec son motif', () => {
    const lignes = [ligne()];
    const mesure = mesurerProtocole([action(), action({ actionId: 'a2' }), action({ actionId: 'a3' })]);
    expect(suggererDepuisLignes(mesure, lignesBaremeServables(lignes, SIGNATURE_BANC(lignes))))
      .toEqual({ niveau: 'loaded', motif: 'Motif de banc — aucune valeur clinique.', idLigne: 'L1' });
  });

  it('ignore une ligne en brouillon, même signée', () => {
    const lignes = [ligne({ statut: 'brouillon' })];
    const mesure = mesurerProtocole([action(), action({ actionId: 'a2' }), action({ actionId: 'a3' })]);
    expect(suggererDepuisLignes(mesure, lignesBaremeServables(lignes, SIGNATURE_BANC(lignes)))).toBeNull();
  });

  // DEUX LIGNES EN DÉSACCORD SONT UNE DISCORDANCE DU BARÈME, et le dépôt refuse
  // de moyenner une discordance (`DC-30`). L'écran n'affiche alors rien, et le
  // praticien déclare sa charge comme avant.
  it('ne suggère RIEN quand deux lignes publiées prescrivent deux niveaux', () => {
    const lignes = [ligne(), ligne({ id: 'L2', terme: 'typesDistincts', min: 1, niveau: 'light' })];
    const mesure = mesurerProtocole([action(), action({ actionId: 'a2' }), action({ actionId: 'a3' })]);
    expect(suggererDepuisLignes(mesure, lignesBaremeServables(lignes, SIGNATURE_BANC(lignes)))).toBeNull();
  });
});

// ── LE VERROU RESTE AU SERVEUR, ET IL EST LE POINT UNIQUE ─────────────────
//
// La suggestion s'affiche PENDANT que le praticien compose, donc dans le
// navigateur — qui ne peut pas importer la table signée (elle tire `crypto`).
// L'écran ne reçoit donc que des lignes DÉJÀ vouchées. Il ne peut pas se signer
// un barème à lui-même, et la vérification n'est pas dupliquée : deux
// vérifications finiraient par diverger.
describe('barème de charge — ce que le serveur a le droit de servir à un écran', () => {
  it('ne sert AUCUNE ligne tant que le barème n’est pas signé', () => {
    const lignes = [ligne()];
    // SUR UNE TABLE NON VIDE, sinon le banc prouverait le vide et non le verrou :
    // constaté par mutation le 2026-09-15 — neutraliser la garde ne faisait
    // rougir personne tant que l'assertion portait sur la table réelle.
    expect(lignesBaremeServables(lignes, BAREME_CHARGE_METADATA)).toEqual([]);
    expect(lignesBaremeServables(lignes, SIGNATURE_BANC(lignes))).toEqual(lignes);
    // La table RÉELLE, elle, est signée : ses trois lignes publiées sortent.
    expect(lignesBaremeServables()).toHaveLength(3);
  });

  it('ne sert jamais une ligne en brouillon, même sous une signature valide', () => {
    const lignes = [ligne(), ligne({ id: 'L2', statut: 'brouillon' })];
    expect(lignesBaremeServables(lignes, SIGNATURE_BANC(lignes))).toEqual([lignes[0]]);
  });

  it('la partie pure ne revérifie pas la signature — elle fait confiance à l’appelant', () => {
    const lignes = [ligne()];
    const mesure = mesurerProtocole([action(), action({ actionId: 'a2' }), action({ actionId: 'a3' })]);
    // C'est voulu, et c'est pourquoi `lignesBaremeServables` est le seul chemin
    // vers l'écran : la fonction pure appliquerait n'importe quelle ligne qu'on
    // lui donne.
    expect(suggererDepuisLignes(mesure, lignes)?.niveau).toBe('loaded');
    // Le chemin SERVEUR, lui, ne lui donne rien à lire.
    expect(suggererDepuisLignes(mesure, lignesBaremeServables(lignes, BAREME_CHARGE_METADATA))).toBeNull();
  });
});

// ── UNE TABLE QUI SE CONTREDIT NE SORT PAS ([[D-195]]) ────────────────────
//
// L'arbitrage a retenu une ÉCHELLE SUR UN SEUL TERME, sans trou ni
// recouvrement. Un recouvrement n'est donc pas un cas clinique à gérer : c'est
// une table mal écrite, et la laisser passer produirait une discordance
// SILENCIEUSE sur toute la plage commune.
describe('barème de charge — le recouvrement est un défaut de table, pas un cas', () => {
  const SIGNE = (lignes: LigneBaremeCharge[]) => SIGNATURE_BANC(lignes);

  it('ne voit aucun recouvrement sur une échelle contiguë', () => {
    const echelle = [
      ligne({ id: 'E1', min: null, max: 1, niveau: 'light' }),
      ligne({ id: 'E2', min: 2, max: 2, niveau: 'moderate' }),
      ligne({ id: 'E3', min: 3, max: null, niveau: 'loaded' }),
    ];
    expect(chevauchementsBareme(echelle)).toEqual([]);
    expect(lignesBaremeServables(echelle, SIGNE(echelle))).toEqual(echelle);
  });

  it('voit le recouvrement, bornes INCLUSES des deux côtés', () => {
    // `[3, null]` et `[null, 3]` se touchent en 3 : c'est un recouvrement.
    const lignes = [
      ligne({ id: 'A', min: 3, max: null }),
      ligne({ id: 'B', min: null, max: 3, niveau: 'light' }),
    ];
    expect(chevauchementsBareme(lignes)).toEqual([{ a: 'A', b: 'B', terme: 'nombreActionsFermes' }]);
  });

  it('REFUSE de servir une table qui se recouvre, même signée', () => {
    const lignes = [
      ligne({ id: 'A', min: 2, max: 5 }),
      ligne({ id: 'B', min: 4, max: 9, niveau: 'excessive' }),
    ];
    expect(lignesBaremeServables(lignes, SIGNE(lignes))).toEqual([]);
  });

  // Deux termes différents ne se recouvrent JAMAIS au sens de cette garde : ils
  // mesurent autre chose. C'est la forme « plusieurs termes croisés », écartée
  // à l'arbitrage mais non interdite par le mécanisme — elle produit alors une
  // discordance que `suggererDepuisLignes` rend en silence.
  it('ne confond pas deux termes distincts avec un recouvrement', () => {
    const lignes = [
      ligne({ id: 'A', terme: 'nombreActionsFermes', min: 2, max: 5 }),
      ligne({ id: 'B', terme: 'typesDistincts', min: 2, max: 5, niveau: 'light' }),
    ];
    expect(chevauchementsBareme(lignes)).toEqual([]);
    expect(lignesBaremeServables(lignes, SIGNE(lignes))).toEqual(lignes);
  });

  // Une ligne en brouillon ne peut pas recouvrir : elle n'est jamais servie.
  it('ignore les brouillons dans le calcul des recouvrements', () => {
    const lignes = [
      ligne({ id: 'A', min: 2, max: 5 }),
      ligne({ id: 'B', min: 4, max: 9, statut: 'brouillon' }),
    ];
    expect(chevauchementsBareme(lignes)).toEqual([]);
    expect(lignesBaremeServables(lignes, SIGNE(lignes))).toEqual([lignes[0]]);
  });
});

