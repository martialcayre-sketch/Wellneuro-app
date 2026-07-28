import { describe, expect, it } from 'vitest';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { Q_ALI_01_COURT_14, Q_ALI_01_SIIN_57 } from '@/lib/questionnaires/alimentaire';
import {
  MASSE_RESIDUELLE,
  libellePourLeModele,
  reponsesLisibles,
  reponsesLisiblesPourPrompt,
} from './reponsesLisibles';

// Définitions fabriquées à la main : le comportement du module ne doit
// dépendre d'aucun instrument nommé. Les assertions portant sur les libellés
// RÉELS vivent dans `promptAlimentaire.guard.test.ts`.
const DEF_CODES: any = {
  id: 'Q_TEST', titre: 'T',
  sections: [{ id: 'A', questions: [
    // Trois options : c'est un item gradué, pas binaire. Le distinguo compte —
    // sur un moteur à quantités, un item à deux options est un Oui/Non et sa
    // valeur n'est jamais une quantité.
    { id: 'X1', texte: 'Fréquence ?', type: 'select', options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 3, l: 'Souvent' }] },
    { id: 'X2', texte: 'Oui ?', type: 'select', options: [{ v: 'oui', l: 'Oui' }, { v: 'non', l: 'Non' }] },
    { id: 'X3', texte: 'Ambigu ?', type: 'select', options: [{ v: 1, l: 'A' }, { v: 1, l: 'B' }] },
  ] }],
  scoring: { type: 'sum' },
};
const DEF_QUANTITES: any = { ...DEF_CODES, scoring: { type: 'seuils_points' } };

describe('reponsesLisibles — résolution', () => {
  it('résout une option unique', () => {
    expect(reponsesLisibles(DEF_CODES, { X1: 3 })).toEqual({
      X1: { question: 'Fréquence ?', reponse: 'Souvent' },
    });
  });

  it('résout une option à valeur chaîne (héritage GAS oui/non)', () => {
    expect(reponsesLisibles(DEF_CODES, { X2: 'oui' })).toEqual({
      X2: { question: 'Oui ?', reponse: 'Oui' },
    });
  });

  it('accepte l’une pour l’autre : `1` et `\'1\'` désignent la même option', () => {
    expect((reponsesLisibles(DEF_CODES, { X1: '3' }) as any).X1.reponse).toBe('Souvent');
  });

  it('deux options de même valeur : ambigu, jamais l’une des deux', () => {
    // En choisir une serait inventer laquelle le patient a cochée.
    const item = (reponsesLisibles(DEF_CODES, { X3: 1 }) as any).X3;
    expect(item.reponse).toBeUndefined();
    expect(item.valeurNonResolue).toBe(1);
  });

  it('le MOTEUR décide du sens d’une valeur hors options, pas l’item', () => {
    // Même définition, même valeur, deux sorties : c'est le contrat central.
    expect((reponsesLisibles(DEF_CODES, { X1: 42 }) as any).X1).toEqual({
      question: 'Fréquence ?', valeurNonResolue: 42,
    });
    expect((reponsesLisibles(DEF_QUANTITES, { X1: 42 }) as any).X1).toEqual({
      question: 'Fréquence ?', quantiteDeclaree: 42,
    });
  });

  it('un item BINAIRE n’est jamais une quantité, même sur un moteur à quantités', () => {
    // La forme SIIN mêle 33 items quantitatifs et 24 items Oui/Non. Décider sur
    // le seul moteur ferait de « Choisissez-vous du pain complet ? » une
    // quantité — la faute corrigée par ce module, replacée à l'autre bout.
    const binaire: any = {
      ...DEF_QUANTITES,
      sections: [{ id: 'A', questions: [
        { id: 'B1', texte: 'Pain complet ?', type: 'select', options: [{ v: 1, l: 'Oui' }, { v: 0, l: 'Non' }] },
      ] }],
    };
    const item = (reponsesLisibles(binaire, { B1: 7 }) as any).B1;
    expect(item.quantiteDeclaree).toBeUndefined();
    expect(item.valeurNonResolue).toBe(7);
  });

  it.each([
    ['chaîne', 'oui'],
    ['NaN', Number.NaN],
    ['objet', { a: 1 }],
    ['null', null],
  ])('une valeur %s n’est jamais annoncée comme quantité déclarée', (_n, valeur) => {
    const item = (reponsesLisibles(DEF_QUANTITES, { X1: valeur }) as any).X1;
    expect(item.quantiteDeclaree).toBeUndefined();
    expect(item.valeurNonResolue).toBeDefined();
  });

  it('deux options de même valeur sur `seuils_points` : ambigu, pas une quantité', () => {
    const item = (reponsesLisibles(DEF_QUANTITES, { X3: 1 }) as any).X3;
    expect(item.reponse).toBeUndefined();
    // La valeur EST dans les options : ce n'est pas une quantité hors tranches,
    // c'est une définition ambiguë. Elle ne doit pas être blanchie en quantité.
    expect(item.quantiteDeclaree).toBeUndefined();
    expect(item.valeurNonResolue).toBe(1);
  });

  it('un item étranger à la définition n’est jamais une quantité déclarée', () => {
    // On ignore de quelle forme il vient : le livrer comme une quantité serait
    // fabriquer une déclaration. Vrai même sur un moteur à quantités.
    expect((reponsesLisibles(DEF_QUANTITES, { INCONNU: 7 }) as any).INCONNU)
      .toEqual({ valeurNonResolue: 7 });
  });
});

describe('reponsesLisibles — valeurs dégénérées, aucun throw', () => {
  it.each([
    ['null', null, 'null'],
    ['tableau', [1, 2], '[1,2]'],
    ['objet', { a: 1 }, '{"a":1}'],
    ['booléen', true, 'true'],
    ['NaN', Number.NaN, 'NaN'],
  ])('%s est conservé lisiblement, jamais perdu par JSON', (_nom, valeur, attendu) => {
    const item = (reponsesLisibles(DEF_CODES, { X1: valeur }) as any).X1;
    expect(item.valeurNonResolue).toBe(attendu);
    // La promesse du champ est que la valeur SURVIT à la sérialisation.
    expect(JSON.parse(JSON.stringify(item)).valeurNonResolue).toBe(attendu);
  });

  it('une définition vide ne casse rien', () => {
    expect(reponsesLisibles({ id: 'X', titre: 'X', sections: [] } as any, { A: 1 }))
      .toEqual({ A: { valeurNonResolue: 1 } });
  });
});

describe('reponsesLisiblesPourPrompt — enveloppe', () => {
  it('ne touche à rien hors des Q_ALI, et rend l’objet IDENTIQUE', () => {
    const scores = { rawAnswers: { P1: 2 }, total: 7 };
    expect(reponsesLisiblesPourPrompt('Q_SOM_01', scores)).toBe(scores);
    expect(reponsesLisiblesPourPrompt('CAB_TENSION', scores)).toBe(scores);
  });

  it('laisse passer ce qu’elle ne sait pas traiter', () => {
    for (const entree of [null, undefined, 'texte', 42, [1, 2], { error: 'introuvable' }, { rawAnswers: null }, { rawAnswers: [1] }]) {
      expect(() => reponsesLisiblesPourPrompt('Q_ALI_01', entree)).not.toThrow();
    }
    const errone = { error: 'Questionnaire introuvable' };
    expect(reponsesLisiblesPourPrompt('Q_ALI_01', errone)).toBe(errone);
  });

  it('ne mute jamais l’entrée', () => {
    const scores = { total: 3, rawAnswers: { AL1: 3 } };
    reponsesLisiblesPourPrompt('Q_ALI_01', scores);
    expect(scores.rawAnswers).toEqual({ AL1: 3 });
  });

  it('conserve les autres champs de `scores`', () => {
    const sortie = reponsesLisiblesPourPrompt('Q_ALI_01', { total: 3, maxTotal: 42, rawAnswers: {} }) as any;
    expect(sortie).toMatchObject({ total: 3, maxTotal: 42 });
  });
});

describe('invariants du catalogue alimentaire', () => {
  const defs = [
    Q_ALI_01_SIIN_57, Q_ALI_01_COURT_14,
    QUESTIONNAIRE_CATALOGUE['Q_ALI_02'], QUESTIONNAIRE_CATALOGUE['Q_ALI_03'],
  ] as any[];

  it('aucun item alimentaire n’est en saisie chiffrée libre', () => {
    // Le module suppose que TOUTE réponse alimentaire vient d'une liste. Le jour
    // où un `type: 'number'` apparaît, sa valeur réelle serait annoncée « non
    // exploitable » au modèle. Ce test le fait savoir avant, pas après.
    const chiffres = defs.flatMap(d =>
      d.sections.flatMap((s: any) => s.questions.filter((q: any) => q.type === 'number').map((q: any) => q.id))
    );
    expect(chiffres, `items en saisie chiffrée : ${chiffres.join(', ')} — étendre resoudreItem`).toEqual([]);
  });

  it('le catalogue relie bien `Q_ALI_01` à son moteur, dans la position servie', () => {
    // Les gardes passent par les DÉFINITIONS pour mordre dans les deux positions
    // du drapeau — juste, mais plus rien ne vérifiait alors le lien
    // catalogue → `scoring.type`. Si une évolution enveloppait ou dépouillait
    // les définitions, `valeurEstQuantite` retomberait à `false` EN SILENCE et
    // toute la branche « quantité déclarée » disparaîtrait sans un test rouge.
    const servie = QUESTIONNAIRE_CATALOGUE['Q_ALI_01'] as any;
    const attendu = process.env.WN_ALI_01_SIIN57 === 'true'
      ? { type: 'seuils_points', items: 57 }
      : { type: 'sum', items: 14 };
    const items = servie.sections.reduce((n: number, s: any) => n + s.questions.length, 0);
    expect({ type: servie.scoring?.type, items }).toEqual(attendu);
  });

  it('bout en bout : une quantité hors tranches survit par le catalogue', () => {
    // Preuve comportementale de la branche `seuils_points`, sur le chemin réel.
    // Ne s'exerce que drapeau allumé : c'est la seule position où le catalogue
    // sert ce moteur. La position éteinte est couverte par le contrôle négatif.
    const siin = process.env.WN_ALI_01_SIIN57 === 'true';
    const sortie = reponsesLisiblesPourPrompt('Q_ALI_01', {
      rawAnswers: siin ? { SIIN07: 13 } : { AL1: 99 },
    }) as any;
    const item = siin ? sortie.rawAnswers.SIIN07 : sortie.rawAnswers.AL1;
    expect(siin ? item.quantiteDeclaree : item.valeurNonResolue).toBe(siin ? 13 : 99);
  });

  it('aucun libellé d’OPTION ne porte une masse', () => {
    // Le nettoyage ne porte que sur les libellés de QUESTIONS. La consigne
    // affirme au modèle qu'aucune équivalence en grammes ne lui parvient : vrai
    // aujourd'hui par le contenu, et vérifié ici plutôt qu'espéré.
    const fautifs = defs.flatMap(d =>
      d.sections.flatMap((s: any) => s.questions.flatMap((q: any) =>
        (q.options ?? []).filter((o: any) => MASSE_RESIDUELLE.test(o.l)).map((o: any) => `${q.id}: ${o.l}`)
      ))
    );
    expect(fautifs, `options portant une masse : ${fautifs.join(' | ')}`).toEqual([]);
  });

  it('chaque item porte au moins deux options', () => {
    const sansOptions = defs.flatMap(d =>
      d.sections.flatMap((s: any) => s.questions.filter((q: any) => (q.options ?? []).length < 2).map((q: any) => q.id))
    );
    expect(sansOptions).toEqual([]);
  });
});

describe('libellePourLeModele', () => {
  it('laisse intact un libellé sans masse', () => {
    const t = 'Combien de portions de fruits consommez-vous par jour ?';
    expect(libellePourLeModele(t)).toBe(t);
  });

  it('retire la parenthèse entière qui porte une masse', () => {
    expect(libellePourLeModele('Poisson : combien de portions par semaine ? (1 portion = 120-150 g)'))
      .toBe('Poisson : combien de portions par semaine ?');
  });

  it('n’abîme pas une parenthèse voisine sans masse', () => {
    expect(libellePourLeModele('Légumes (frais ou surgelés) : combien (environ 80 g) par jour ?'))
      .toBe('Légumes (frais ou surgelés) : combien par jour ?');
  });

  it.each([
    '(1 à 2 fois par semaine)', '(groupe 1, 2 ou 3)', '2 gros morceaux',
    '2 grandes assiettes', '(25 cl)',
  ])('ne confond pas %s avec une masse', texte => {
    const t = `Question ${texte} ?`;
    expect(libellePourLeModele(t)).toBe(t);
    expect(MASSE_RESIDUELLE.test(t)).toBe(false);
  });

  it('le garde est plus large que le nettoyeur — c’est voulu', () => {
    // Un garde calé sur la même classe que ce qu'il vérifie bouge avec lui et
    // ne prouve rien. Ces trois formes ne sont PAS nettoyées ; le garde les
    // refuse, donc leur apparition dans un libellé fera rougir au lieu de
    // passer en silence.
    for (const forme of ['(80g)', '(une portion = 80 grammes)', '(2 c. à s. = 30 GR)']) {
      expect(MASSE_RESIDUELLE.test(forme), `${forme} non attrapé`).toBe(true);
    }
  });
});
