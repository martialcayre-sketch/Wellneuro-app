import { describe, expect, it } from 'vitest';
import {
  LIBELLE_MARQUE_PURPOSE,
  PURPOSE_AXE_SIGNE,
  PURPOSE_OBJECTIF_PRIORITE,
  PURPOSE_OBJECTIF_REFORMULATION,
  citeExactementPurpose,
  constaterProvenancePurpose,
  sourcesCitablesPurpose,
} from './provenancePurpose';

const AXE = { texte: 'Sommeil fragmenté, réveils nocturnes', idRegle: 'sommeil-fragmente' };
const OBJECTIF = {
  idObjectif: 'obj_v2',
  priorite: 'Retrouver des nuits entières.',
  reformulationPraticien: 'Vous voulez dormir sans vous réveiller à 3 h.',
};

describe('sourcesCitablesPurpose — la liste est FERMÉE', () => {
  // BANC TEXTUEL DE LISTE FERMÉE ([[D-189]] §3), patron
  // `propositionObjectif.guard.test.ts` : les clés sont épinglées, et une source
  // ajoutée sans décision fait rougir ce banc.
  it('n’expose QUE les trois marques nommées par la décision', () => {
    expect(Object.keys(LIBELLE_MARQUE_PURPOSE).sort()).toEqual(
      [PURPOSE_AXE_SIGNE, PURPOSE_OBJECTIF_PRIORITE, PURPOSE_OBJECTIF_REFORMULATION].sort(),
    );
  });

  it('propose l’axe signé et les deux textes de l’objectif actif', () => {
    const sources = sourcesCitablesPurpose({ libelleAxe: AXE, objectif: OBJECTIF });
    expect(sources.map(source => source.marque)).toEqual([
      PURPOSE_AXE_SIGNE,
      PURPOSE_OBJECTIF_PRIORITE,
      PURPOSE_OBJECTIF_REFORMULATION,
    ]);
    // Le texte est RECOPIÉ, jamais reformulé.
    expect(sources[0].texte).toBe(AXE.texte);
    expect(sources[1].idSource).toBe('obj_v2');
  });

  // REGISTRE NON SIGNÉ ⇒ PAS DE LIBELLÉ, jamais un texte fabriqué ([[D-115]]).
  it('ne propose aucun axe quand le registre n’est pas signé', () => {
    const sources = sourcesCitablesPurpose({ libelleAxe: null, objectif: OBJECTIF });
    expect(sources.some(source => source.marque === PURPOSE_AXE_SIGNE)).toBe(false);
  });

  it('ne propose rien quand aucune tête d’objectif n’est active', () => {
    const sources = sourcesCitablesPurpose({ libelleAxe: AXE, objectif: null });
    expect(sources).toHaveLength(1);
    expect(sources[0].marque).toBe(PURPOSE_AXE_SIGNE);
  });

  // Proposer « Reprendre » sur du vide effacerait la raison d'être en un clic.
  it('écarte une source au texte vide', () => {
    const sources = sourcesCitablesPurpose({
      libelleAxe: { texte: '   ', idRegle: 'r' },
      objectif: { idObjectif: 'obj_v2', priorite: '', reformulationPraticien: null },
    });
    expect(sources).toHaveLength(0);
  });
});

describe('constaterProvenancePurpose — la marque se constate, elle ne se déclare pas', () => {
  const sources = sourcesCitablesPurpose({ libelleAxe: AXE, objectif: OBJECTIF });

  it('constate la citation exacte de l’axe signé', () => {
    expect(constaterProvenancePurpose(AXE.texte, sources))
      .toEqual({ marque: PURPOSE_AXE_SIGNE, idSource: 'sommeil-fragmente' });
  });

  it('constate la citation exacte de la priorité de l’objectif', () => {
    expect(constaterProvenancePurpose(OBJECTIF.priorite, sources))
      .toEqual({ marque: PURPOSE_OBJECTIF_PRIORITE, idSource: 'obj_v2' });
  });

  // LA MARQUE TOMBE AU PREMIER CARACTÈRE RÉÉCRIT, et c'est le cœur du
  // mécanisme : il n'y a rien à retirer, elle ne se pose simplement plus.
  it('ne pose RIEN dès qu’un caractère bouge', () => {
    expect(constaterProvenancePurpose(`${AXE.texte} `, sources)).not.toBeNull();
    expect(constaterProvenancePurpose(`${AXE.texte}.`, sources)).toBeNull();
    expect(constaterProvenancePurpose(AXE.texte.replace('fragmenté', 'fragmente'), sources)).toBeNull();
  });

  // `trim` SEULEMENT. Replier les espaces internes ou la casse ferait passer
  // pour « cité verbatim » un texte que le praticien a retouché — poser la
  // marque sur ses mots à lui.
  it('tolère les bords, jamais l’intérieur ni la casse', () => {
    expect(citeExactementPurpose(`\n  ${AXE.texte}\t`, AXE.texte)).toBe(true);
    expect(citeExactementPurpose(AXE.texte.toUpperCase(), AXE.texte)).toBe(false);
    expect(citeExactementPurpose(AXE.texte.replace(', ', ',  '), AXE.texte)).toBe(false);
  });

  it('ne pose rien sur une raison d’être écrite de zéro', () => {
    expect(constaterProvenancePurpose('Stabiliser vos matins.', sources)).toBeNull();
    expect(constaterProvenancePurpose(null, sources)).toBeNull();
    expect(constaterProvenancePurpose(AXE.texte, [])).toBeNull();
  });
});
