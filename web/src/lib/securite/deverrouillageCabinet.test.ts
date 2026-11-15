// [[D-524]] §2 — le déverrouillage d'un `CAB_` « oui » se juge sur la
// concordance de sa copie avec la désignation que l'envoi écrirait
// aujourd'hui. Les deux sens : le constat manqué (refus) et le constat de trop
// (une concordance réelle laisse déverrouiller).
import { describe, expect, it } from 'vitest';
import { copieDesignationSuicide } from './declarationSuicideCabinet';
import { concordance, deverrouillageAJuger, type CopieAssignation, type InstrumentCourant } from './deverrouillageCabinet';

const DEFINITION = {
  sections: [
    {
      id: 'S',
      questions: [
        { id: 'Q1', texte: 'Humeur du jour ?', options: [{ v: 0, l: 'Bonne' }, { v: 1, l: 'Basse' }] },
        { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Souvent' }] },
      ],
    },
  ],
};

const INSTRUMENT: InstrumentCourant = {
  actif: true,
  statutRelecture: 'valide',
  titre: 'Humeur cabinet',
  definitionJson: DEFINITION,
  poseQuestionSuicide: true,
  questionSuicideId: 'Q2',
  questionSuicideOptionNon: 0,
};

/** La copie que l'envoi a écrite sur l'assignation, depuis `INSTRUMENT`. */
function copieEnvoi(): CopieAssignation {
  const d = copieDesignationSuicide(INSTRUMENT);
  if (!d) throw new Error('fixture incohérente');
  return { poseQuestionSuicide: true, ...d };
}

function definitionAvec(q2: unknown) {
  return { sections: [{ id: 'S', questions: [DEFINITION.sections[0].questions[0], q2] }] };
}

describe('concordance — le constat de trop : une copie fidèle se déverrouille', () => {
  it('instrument inchangé : concordance', () => {
    expect(concordance(copieEnvoi(), INSTRUMENT)).toBe(true);
  });

  it('une copie relue de JSONB, clés réordonnées : concordance', () => {
    const c = copieEnvoi();
    const { instrument, enonce, options } = c.questionSuicideCopie as { instrument: string; enonce: string; options: { v: number; l: string }[] };
    const relue = { ...c, questionSuicideCopie: { options: options.map(o => ({ l: o.l, v: o.v })), enonce, instrument } };
    expect(concordance(relue, INSTRUMENT)).toBe(true);
  });

  it('une question autre que la désignée change : concordance', () => {
    const autre = {
      sections: [{ id: 'S', questions: [{ id: 'Q1', texte: 'Énergie ?', options: [{ v: 0, l: 'Haute' }] }, DEFINITION.sections[0].questions[1]] }],
    };
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, definitionJson: autre })).toBe(true);
  });
});

describe('concordance — le constat manqué : toute discordance refuse', () => {
  it('options renumérotées : refus', () => {
    const q2 = { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 1, l: 'Jamais' }, { v: 3, l: 'Souvent' }] };
    // La désignation courante concorde avec elle-même (option « non » = 1)…
    const courant = { ...INSTRUMENT, definitionJson: definitionAvec(q2), questionSuicideOptionNon: 1 };
    expect(concordance(copieEnvoi(), courant)).toBe(false);
    // … et des valeurs renumérotées sous la même option « non » aussi.
    const q2b = { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 2, l: 'Souvent' }] };
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, definitionJson: definitionAvec(q2b) })).toBe(false);
  });

  it('identifiant de la question désignée changé : refus', () => {
    const q = { id: 'Q9', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Souvent' }] };
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, definitionJson: definitionAvec(q), questionSuicideId: 'Q9' })).toBe(false);
  });

  it('option ajoutée : refus', () => {
    const q2 = { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 2, l: 'Parfois' }, { v: 3, l: 'Souvent' }] };
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, definitionJson: definitionAvec(q2) })).toBe(false);
  });

  it('libellé ou énoncé changé : refus', () => {
    const libelle = { id: 'Q2', texte: 'Idées de mort ?', options: [{ v: 0, l: 'Non' }, { v: 3, l: 'Souvent' }] };
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, definitionJson: definitionAvec(libelle) })).toBe(false);
    const enonce = { id: 'Q2', texte: 'Pensées de mort ?', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Souvent' }] };
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, definitionJson: definitionAvec(enonce) })).toBe(false);
  });

  it('nom de l’instrument changé : refus (la copie le porte, D-524 §2 se lit à la lettre)', () => {
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, titre: 'Humeur du cabinet' })).toBe(false);
  });

  it('désignation courante absente — instrument introuvable, déclaration effacée, « non », désignation incohérente : refus', () => {
    expect(concordance(copieEnvoi(), null)).toBe(false);
    const effacee = { ...INSTRUMENT, poseQuestionSuicide: null, questionSuicideId: null, questionSuicideOptionNon: null };
    expect(concordance(copieEnvoi(), effacee)).toBe(false);
    expect(concordance(copieEnvoi(), { ...effacee, poseQuestionSuicide: false })).toBe(false);
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, questionSuicideOptionNon: 7 })).toBe(false);
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, definitionJson: null })).toBe(false);
  });

  it('instrument non publié ou désactivé, désignation pourtant intacte (drapeau éteint, la déclaration survit au brouillon) : refus', () => {
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, statutRelecture: 'brouillon' })).toBe(false);
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, statutRelecture: 'grille_a_relire' })).toBe(false);
    expect(concordance(copieEnvoi(), { ...INSTRUMENT, actif: false })).toBe(false);
  });

  it('copie de l’assignation vide ou illisible (désignation inconnue à l’envoi) : refus', () => {
    const vide: CopieAssignation = { poseQuestionSuicide: true, questionSuicideId: null, questionSuicideOptionNon: null, questionSuicideCopie: null };
    expect(concordance(vide, INSTRUMENT)).toBe(false);
    expect(concordance({ ...copieEnvoi(), questionSuicideCopie: 'texte' }, INSTRUMENT)).toBe(false);
    expect(concordance({ ...copieEnvoi(), questionSuicideCopie: [] }, INSTRUMENT)).toBe(false);
    const c = copieEnvoi();
    expect(concordance({ ...c, questionSuicideCopie: { ...(c.questionSuicideCopie as object), options: [null, null] } }, INSTRUMENT)).toBe(false);
  });
});

describe('deverrouillageAJuger — seule une copie « oui » est jugée', () => {
  it('« oui » : jugée ; « non » et non déclaré : inchangés', () => {
    expect(deverrouillageAJuger({ poseQuestionSuicide: true })).toBe(true);
    expect(deverrouillageAJuger({ poseQuestionSuicide: false })).toBe(false);
    expect(deverrouillageAJuger({ poseQuestionSuicide: null })).toBe(false);
  });
});
