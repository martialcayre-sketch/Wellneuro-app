import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TABLE_REPLI_METADATA,
  TABLE_REPLI_SHA256,
  TABLE_REPLI_V1,
  lignesRepliServables,
  tableRepliSignee,
  type TableRepliMetadata,
} from './tableRepliV1';
import { lireRepliDepuisLignes, type LigneRepli } from './tableRepliPur';
import { chevauchementsBareme, mesurerProtocole } from './baremeChargePur';
import { MAX_ACTIONS_PROTOCOLE_21J, type ProtocolAction } from '@/lib/clinical-engine/types';

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

function ligne(surcharges: Partial<LigneRepli> = {}): LigneRepli {
  return {
    id: 'L1',
    terme: 'actionsSansRepli',
    min: null,
    max: 0,
    constat: 'Constat de banc — aucune valeur clinique.',
    statut: 'publiee',
    ...surcharges,
  };
}

/** Une signature VALIDE sur les lignes passées — le point de départ des falsifications. */
function signatureValide(lignes: LigneRepli[]): TableRepliMetadata {
  return {
    validationExterne: true,
    dateValidation: '2026-09-16T00:00:00.000Z',
    shaPerimetre: TABLE_REPLI_SHA256_DE(lignes),
  };
}

function TABLE_REPLI_SHA256_DE(lignes: LigneRepli[]): string {
  // Recalculé comme le module le fait — c'est la seule façon d'écrire un banc
  // qui falsifie la signature sans figer un littéral qui périmerait au premier
  // mot changé dans un constat.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { createHash } = require('crypto') as typeof import('crypto');
  return createHash('sha256').update(JSON.stringify(lignes)).digest('hex');
}

describe('table du repli — le verrou', () => {
  it('est ÉTEINTE au dépôt : aucune attestation n’a été posée', () => {
    expect(TABLE_REPLI_METADATA.validationExterne).toBe(false);
    expect(TABLE_REPLI_METADATA.dateValidation).toBeNull();
    expect(TABLE_REPLI_METADATA.shaPerimetre).toBeNull();
    expect(tableRepliSignee()).toBe(false);
    // Le point de sortie unique se tait, et c'est tout ce que l'écran obtient.
    expect(lignesRepliServables()).toEqual([]);
  });

  it('reconnaît une signature complète — sinon les falsifications ci-dessous ne prouveraient rien', () => {
    const lignes = [ligne()];
    expect(tableRepliSignee(signatureValide(lignes), lignes)).toBe(true);
    expect(lignesRepliServables(lignes, signatureValide(lignes))).toEqual(lignes);
  });

  // CHAQUE TERME EST FALSIFIÉ SÉPARÉMENT. Un banc qui ne casserait qu'un terme à
  // la fois de la même façon laisserait passer un verrou qui n'en vérifie qu'un.
  it('refuse quand `validationExterne` n’est pas exactement true', () => {
    const lignes = [ligne()];
    for (const valeur of [false, undefined, null, 1, 'true'] as unknown[]) {
      const signature = { ...signatureValide(lignes), validationExterne: valeur } as TableRepliMetadata;
      expect(tableRepliSignee(signature, lignes)).toBe(false);
      expect(lignesRepliServables(lignes, signature)).toEqual([]);
    }
  });

  it('refuse une date absente, mal formée, ou non canonique', () => {
    const lignes = [ligne()];
    for (const valeur of [null, '', '2026-09-16', '2026-09-16T00:00:00Z', 'pas une date', '2026-13-45T00:00:00.000Z']) {
      const signature = { ...signatureValide(lignes), dateValidation: valeur };
      expect(tableRepliSignee(signature, lignes)).toBe(false);
    }
  });

  it('refuse un `shaPerimetre` nul, et refuse aussi un SHA qui ne correspond plus', () => {
    const lignes = [ligne()];
    expect(tableRepliSignee({ ...signatureValide(lignes), shaPerimetre: null }, lignes)).toBe(false);
    expect(tableRepliSignee({ ...signatureValide(lignes), shaPerimetre: 'f'.repeat(64) }, lignes)).toBe(false);
  });

  it('LE PIÈGE DE LA TABLE VIDE : une signature parfaite sur zéro ligne ne passe pas', () => {
    // Sans le terme `lignes.length === 0`, une table vide serait « parfaitement
    // signée » : le SHA de `[]` est stable, et l'égalité tiendrait. Signer zéro
    // ligne n'atteste pourtant aucune relecture.
    const vide: LigneRepli[] = [];
    expect(tableRepliSignee(signatureValide(vide), vide)).toBe(false);
    expect(lignesRepliServables(vide, signatureValide(vide))).toEqual([]);
  });

  it('UNE LIGNE AJOUTÉE APRÈS COUP N’ENTRE PAS sous la signature acquise', () => {
    const signees = [ligne()];
    const signature = signatureValide(signees);
    const elargies = [...signees, ligne({ id: 'L2', min: 1, max: 1 })];
    // Le périmètre se hache EN ENTIER : la table élargie n'est plus celle qui a
    // été relue, et le verrou se referme sur la table complète.
    expect(tableRepliSignee(signature, elargies)).toBe(false);
    expect(lignesRepliServables(elargies, signature)).toEqual([]);
  });

  it('refuse une table qui se recouvre, même signée', () => {
    const lignes = [ligne({ id: 'A', min: null, max: 2 }), ligne({ id: 'B', min: 2, max: 3 })];
    expect(tableRepliSignee(signatureValide(lignes), lignes)).toBe(true);
    expect(lignesRepliServables(lignes, signatureValide(lignes))).toEqual([]);
  });
});

describe('table du repli — les trois lignes proposées', () => {
  it('couvre les quatre valeurs possibles, sans trou ni recouvrement', () => {
    expect(chevauchementsBareme(TABLE_REPLI_V1)).toEqual([]);
    for (let valeur = 0; valeur <= MAX_ACTIONS_PROTOCOLE_21J; valeur += 1) {
      const couvrantes = TABLE_REPLI_V1.filter(l =>
        (l.min === null || valeur >= l.min) && (l.max === null || valeur <= l.max));
      expect(couvrantes, `valeur ${valeur}`).toHaveLength(1);
    }
  });

  it('n’affirme JAMAIS que le patient dispose d’une marche plus basse', () => {
    // La mesure compare deux chaînes : elle constate une différence de TEXTE,
    // pas une différence d'exigence. Un constat qui promettrait un allègement
    // réel dépasserait ce que la table sait.
    for (const l of TABLE_REPLI_V1) {
      expect(l.constat.toLowerCase()).not.toMatch(/marche plus basse|plus accessible|moins exigeant/);
    }
  });

  it('REPLI-01 RESTE VRAI quand une action est encore en cours de saisie', () => {
    // LE CAS QUE LA REVUE A TROUVÉ. Une action dont le plan idéal n'est pas
    // encore tapé n'entre pas dans `actionsSansRepli` — donc le terme vaut zéro
    // et REPLI-01 s'affiche, EN PLEINE COMPOSITION. Un texte affirmant que
    // « chaque action engagée distingue ses deux plans » serait alors faux :
    // celle-ci n'a pas encore de plan idéal du tout.
    const mesure = mesurerProtocole([
      action({ actionId: 'a1', idealPlan: 'Marcher 30 min', minimalPlan: 'Marcher 10 min' }),
      action({ actionId: 'a2', idealPlan: '', minimalPlan: '' }),
    ]);
    expect(mesure.actionsSansRepli).toBe(0);

    const lecture = lireRepliDepuisLignes(mesure, TABLE_REPLI_V1);
    expect(lecture).toEqual({
      statut: 'constat',
      constat: TABLE_REPLI_V1[0].constat,
      idLigne: 'REPLI-01',
    });
    // Le constat ne parle que de ce qui est MESURÉ : aucune répétition observée.
    // Il ne prétend rien sur les actions dont le plan idéal manque encore.
    expect(TABLE_REPLI_V1[0].constat.toLowerCase()).not.toMatch(/chaque action/);
  });

  it('le SHA exporté est bien celui de la table réelle', () => {
    expect(TABLE_REPLI_SHA256).toBe(TABLE_REPLI_SHA256_DE(TABLE_REPLI_V1));
    expect(TABLE_REPLI_SHA256).toMatch(/^[0-9a-f]{64}$/);
  });

  it('ne porte AUCUN niveau de charge — sinon deux tables en afficheraient deux', () => {
    for (const l of TABLE_REPLI_V1) {
      expect(l).not.toHaveProperty('niveau');
    }
  });
});

describe('actionsSansRepli — ce que la mesure compte', () => {
  it('compte les actions engagées dont les deux plans portent le même texte', () => {
    const mesure = mesurerProtocole([
      action({ actionId: 'a1', idealPlan: 'Marcher 30 min', minimalPlan: 'Marcher 10 min' }),
      action({ actionId: 'a2', idealPlan: 'Même texte', minimalPlan: 'Même texte' }),
      action({ actionId: 'a3', idealPlan: '  Espaces  ', minimalPlan: 'Espaces' }),
    ]);
    // a2 et a3 : identiques après `trim()`.
    expect(mesure.actionsSansRepli).toBe(2);
    expect(mesure.actionsAvecEcartDePlan).toBe(1);
  });

  it('NE COMPTE PAS une action dont le plan idéal n’est pas encore écrit', () => {
    // Le cas décisif : `mesurerProtocole` tourne dans le navigateur PENDANT la
    // composition. Une soustraction `fermes − avecEcart` compterait cette
    // action-là comme « sans repli » et l'afficherait au praticien pendant qu'il
    // tape. La mesure directe ne le fait pas.
    const enCoursDeSaisie = [action({ idealPlan: '', minimalPlan: '' })];
    const mesure = mesurerProtocole(enCoursDeSaisie);
    expect(mesure.actionsSansRepli).toBe(0);
    expect(mesure.nombreActionsFermes - mesure.actionsAvecEcartDePlan).toBe(1);
    expect(mesure.actionsSansRepli).not.toBe(mesure.nombreActionsFermes - mesure.actionsAvecEcartDePlan);
  });

  it('ignore les actions suspendues, comme les autres termes', () => {
    const mesure = mesurerProtocole([
      action({ actionId: 'a1', idealPlan: 'X', minimalPlan: 'X', interventionStatus: 'conditionnelle_biologie' }),
    ] as ProtocolAction[]);
    expect(mesure.actionsSansRepli).toBe(0);
  });
});

describe('lireRepliDepuisLignes — un motif par cause', () => {
  const mesure = mesurerProtocole([action({ idealPlan: 'X', minimalPlan: 'X' })]);

  it('nomme la table non servie', () => {
    expect(lireRepliDepuisLignes(mesure, [])).toEqual({ statut: 'silence', motif: 'table_non_servie' });
    // Et c'est bien ce que rend le chemin réel aujourd'hui : verrou éteint.
    expect(lireRepliDepuisLignes(mesure, lignesRepliServables()))
      .toEqual({ statut: 'silence', motif: 'table_non_servie' });
  });

  it('nomme l’absence de ligne applicable', () => {
    const lignes = [ligne({ min: 3, max: 3 })];
    expect(lireRepliDepuisLignes(mesure, lignes))
      .toEqual({ statut: 'silence', motif: 'aucune_ligne_applicable' });
  });

  it('NOMME LE DÉSACCORD — ce que rien ne dirait jamais autrement', () => {
    const lignes = [
      ligne({ id: 'A', min: null, max: null, constat: 'Première phrase.' }),
      ligne({ id: 'B', min: null, max: null, constat: 'Seconde phrase, incompatible.' }),
    ];
    expect(lireRepliDepuisLignes(mesure, lignes))
      .toEqual({ statut: 'silence', motif: 'lignes_en_desaccord' });
  });

  it('rend le constat quand une seule ligne publiée s’applique', () => {
    const lignes = [ligne({ id: 'A', min: 1, max: 3, constat: 'Le constat attendu.' })];
    expect(lireRepliDepuisLignes(mesure, lignes))
      .toEqual({ statut: 'constat', constat: 'Le constat attendu.', idLigne: 'A' });
  });

  it('ignore les lignes en brouillon', () => {
    const lignes = [ligne({ id: 'A', min: 1, max: 3, statut: 'brouillon' })];
    expect(lireRepliDepuisLignes(mesure, lignes))
      .toEqual({ statut: 'silence', motif: 'aucune_ligne_applicable' });
  });
});

describe('table du repli — garde de source', () => {
  it('ne fige JAMAIS le SHA du périmètre sur la constante recalculée', () => {
    // La tautologie que [[D-063]] a fermée : `shaPerimetre: TABLE_REPLI_SHA256`
    // se vérifierait toujours, et toute ligne ajoutée entrerait sous une
    // signature acquise. Le littéral doit être figé à la main, le jour de
    // l'attestation.
    const source = readFileSync(
      join(process.cwd(), 'src/lib/clinical/tableRepliV1.ts'),
      'utf8',
    );
    const metadonnee = source.slice(source.indexOf('TABLE_REPLI_METADATA'));
    expect(metadonnee.slice(0, 400)).not.toMatch(/shaPerimetre:\s*TABLE_REPLI_SHA256/);
  });
});
