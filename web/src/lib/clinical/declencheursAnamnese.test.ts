import { describe, expect, it } from 'vitest';
import {
  CHAMP_ANAMNESE,
  entreesSurSignauxAlerte,
  optionsDuChampAnamnese,
  valeursDeDrapeauInconnues,
  type EntreeADeclencheurs,
} from './declencheursAnamnese';
import { extraireDrapeauxAnamnese, type DrapeauxAnamnese } from '@/lib/consultation/drapeauxAnamnese';

// LE BANC DU VALIDATEUR PARTAGÉ ([[D-225]] §4 bis, chantier 2 de S3).
//
// POURQUOI IL EST ICI ET NON DANS LE BANC D'UNE TABLE. Les deux tables qui
// partagent ce vocabulaire de porte lui appliquent chacune le validateur sur
// LEUR contenu — c'est leur banc à elles. Ce que personne ne peut éprouver sur
// une table réelle, c'est que le validateur MORD : les deux tables sont saines,
// donc un banc qui ne les balaierait qu'elles resterait vert quoi qu'on fasse
// au corps de la garde ([[D-012]], [[D-015]] — un banc vacué est un banc qui
// ment). Les cas ci-dessous fabriquent donc les fautes.

/** Une entrée de table minimale : le validateur ne lit rien d'autre. */
function entree(declencheurs: EntreeADeclencheurs['declencheurs'], id = 'X-01'): EntreeADeclencheurs {
  return { id, declencheurs };
}

describe('CHAMP_ANAMNESE — la correspondance clé typée ↔ champ d’anamnèse', () => {
  // LA GARDE DE LA GARDE, et elle n'est pas de politesse. Le nom du champ ne se
  // déduit pas de la clé : c'est `extraireDrapeauxAnamnese` qui le décide. Si
  // cette correspondance dérivait, `valeursDeDrapeauInconnues` chercherait les
  // options dans le MAUVAIS champ et resterait vert — donc muet exactement là
  // où on l'attend. On injecte la première option réelle du champ et on exige
  // de la retrouver sous la clé attendue.
  it('décrit bien ce que extraireDrapeauxAnamnese fait', () => {
    const drapeauxVides = extraireDrapeauxAnamnese({});
    // Aucune clé oubliée NI EN TROP : le type donne le premier sens, ce banc
    // donne l'autre. Un onzième drapeau force la mise à jour.
    expect(Object.keys(CHAMP_ANAMNESE).sort()).toEqual(Object.keys(drapeauxVides).sort());
    for (const [cle, champId] of Object.entries(CHAMP_ANAMNESE)) {
      const options = optionsDuChampAnamnese(champId);
      expect(options.length, `aucune option pour ${champId}`).toBeGreaterThan(0);
      // Un champ liste se stocke en tableau, un champ radio en valeur seule :
      // injecter la mauvaise forme ferait échouer le banc sur sa propre fixture
      // au lieu du mapping. La forme se lit sur l'extraction vide.
      const estListe = Array.isArray(drapeauxVides[cle as keyof DrapeauxAnamnese]);
      const extrait = extraireDrapeauxAnamnese({ [champId]: estListe ? [options[0]] : options[0] });
      const valeur = extrait[cle as keyof typeof extrait];
      const obtenues = Array.isArray(valeur) ? valeur : valeur === null ? [] : [valeur];
      expect(obtenues, `${cle} ne lit pas ${champId}`).toContain(options[0]);
    }
  });

  it('un champ d’anamnèse sans option rend une liste vide, jamais une exception', () => {
    expect(optionsDuChampAnamnese('champ_qui_n_existe_pas')).toEqual([]);
    // `motif_principal` existe et est un champ texte : il n'a pas d'options.
    expect(optionsDuChampAnamnese('motif_principal')).toEqual([]);
  });
});

describe('valeursDeDrapeauInconnues — ce que le CI attrape désormais pour LES DEUX tables', () => {
  const OPTION_REELLE = optionsDuChampAnamnese('intolerances_alimentaires')[0];

  it('LAISSE PASSER un libellé qui existe verbatim', () => {
    expect(OPTION_REELLE).toBeTruthy();
    expect(valeursDeDrapeauInconnues([
      entree([{ type: 'drapeau', champ: 'intolerancesAlimentaires', valeurs: [OPTION_REELLE] }]),
    ])).toEqual([]);
  });

  // LE DÉFAUT QUE TOUT CECI EXISTE POUR FERMER. Une apostrophe typographique
  // remplacée par une apostrophe droite, un accent perdu : le libellé ne sort
  // plus jamais d'`extraireDrapeauxAnamnese`, la porte cesse de s'ouvrir, et
  // RIEN ne casse. La ligne reste signée, relue, hachée — et morte.
  it('ATTRAPE un libellé dérivé d’un caractère', () => {
    const derive = `${OPTION_REELLE} `;
    const anomalies = valeursDeDrapeauInconnues([
      entree([{ type: 'drapeau', champ: 'intolerancesAlimentaires', valeurs: [derive] }]),
    ]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toContain('intolerances_alimentaires');
  });

  // [[D-060]] §5 : un `ou` ne doit pas devenir la porte de service des interdits.
  it('DESCEND DANS LES BRANCHES d’une disjonction', () => {
    const anomalies = valeursDeDrapeauInconnues([
      entree([{
        type: 'ou',
        declencheurs: [
          { type: 'drapeau', champ: 'intolerancesAlimentaires', valeurs: [OPTION_REELLE] },
          { type: 'drapeau', champ: 'attentes', valeurs: ['Libellé qui n’existe pas'] },
        ],
      }]),
    ]);
    expect(anomalies).toHaveLength(1);
    expect(anomalies[0]).toContain('attentes');
  });

  // Le message doit envoyer la correction au BON endroit : un champ non mappé
  // ne dit pas « ce libellé est faux », il dit « le validateur ne sait plus où
  // regarder ». Les confondre ferait corriger `anamnese.ts` au lieu de la carte.
  it('distingue un champ non mappé d’un libellé faux', () => {
    const anomalies = valeursDeDrapeauInconnues([
      { id: 'Y-01', declencheurs: [{ type: 'drapeau', champ: 'inconnu' as never, valeurs: ['x'] }] },
    ]);
    expect(anomalies).toEqual(['Y-01 : champ non mappé — inconnu']);
  });

  it('ne dit rien d’un déclencheur qui n’est pas un drapeau', () => {
    expect(valeursDeDrapeauInconnues([
      entree([{ type: 'comparaison', idQuestionnaire: 'Q_INF_03', sousScore: 'DA', operateur: '>=', valeur: 10 }]),
    ])).toEqual([]);
  });
});

describe('entreesSurSignauxAlerte — l’interdit d’adressage, partagé lui aussi', () => {
  it('ATTRAPE un signal d’alerte, à la racine comme sous un `ou`', () => {
    const signal = optionsDuChampAnamnese('signaux_alerte')[0];
    expect(signal).toBeTruthy();
    expect(entreesSurSignauxAlerte([
      entree([{ type: 'drapeau', champ: 'signauxAlerte', valeurs: [signal] }], 'RACINE'),
    ])).toEqual(['RACINE']);
    expect(entreesSurSignauxAlerte([
      entree([{
        type: 'ou',
        declencheurs: [
          { type: 'drapeau', champ: 'attentes', valeurs: ['peu importe'] },
          { type: 'drapeau', champ: 'signauxAlerte', valeurs: [signal] },
        ],
      }], 'SOUS-OU'),
    ])).toEqual(['SOUS-OU']);
  });

  it('LAISSE PASSER un drapeau qui n’est pas un signal d’alerte', () => {
    expect(entreesSurSignauxAlerte([
      entree([{ type: 'drapeau', champ: 'attentes', valeurs: ['peu importe'] }]),
    ])).toEqual([]);
  });
});
