import { describe, expect, it } from 'vitest';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import {
  affichage,
  calculerActionRecommandee,
  type AgendaPortail,
  type Enrichi,
} from './hubQuestionnaires';

function assign(over: Partial<AssignationPatient> = {}): AssignationPatient {
  return {
    idAssignation: 'ASS_Q',
    idQuestionnaire: 'Q_ALI_01',
    titre: 'Enquête alimentaire',
    statut: 'En attente',
    statutReponses: 'non_rempli',
    dateAssignation: '2026-07-29T09:00:00.000Z',
    dateLimite: null,
    estEnAttenteSaisie: true,
    notes: null,
    ...over,
  } as AssignationPatient;
}

function agenda(over: Partial<AgendaPortail> = {}): AgendaPortail {
  return {
    idAssignation: 'ASS_AGD',
    nbRenseignees: 5,
    jourCourant: 6,
    nuitDuJourNotee: false,
    cloturablePatient: false,
    ...over,
  };
}

const assignAgenda = (over: Partial<AssignationPatient> = {}) =>
  assign({
    idAssignation: 'ASS_AGD',
    idQuestionnaire: 'Q_SOM_09',
    titre: 'Agenda du sommeil — 21 nuits',
    ...over,
  });

function enrichir(assignations: AssignationPatient[], agendas: AgendaPortail[], brouillons: Set<string>): Enrichi[] {
  return assignations.map(a => ({
    a,
    aff: affichage(a, brouillons.has(a.idAssignation), agendas.find(g => g.idAssignation === a.idAssignation)),
  }));
}

function etape(assignations: AssignationPatient[], agendas: AgendaPortail[] = [], brouillons = new Set<string>()) {
  return calculerActionRecommandee(enrichir(assignations, agendas, brouillons), brouillons, agendas);
}

describe('étape du moment — la priorité de l’agenda', () => {
  it('une nuit à noter passe DEVANT un brouillon enregistré', () => {
    // Le brouillon attend sans rien perdre ; la nuit, non.
    const r = etape(
      [assign(), assignAgenda()],
      [agenda()],
      new Set(['ASS_Q']),
    );
    expect(r).toMatchObject({
      kind: 'action',
      idAssignation: 'ASS_AGD',
      cta: 'Noter ma nuit',
      appui: '5 nuits notées sur 21.',
    });
  });

  it('agenda à jour : la main revient au brouillon', () => {
    const r = etape(
      [assign(), assignAgenda()],
      [agenda({ nuitDuJourNotee: true })],
      new Set(['ASS_Q']),
    );
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
    expect((r as { cta: string }).cta).toContain('Reprendre');
  });

  it('agenda jamais commencé : NON prioritaire, le pack assigné garde la main', () => {
    // Sinon un agenda sans date limite enterrerait le pack sans terme.
    const r = etape(
      [assign(), assignAgenda()],
      [agenda({ nbRenseignees: 0, jourCourant: null })],
    );
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
  });

  it('agenda déverrouillé par le praticien : son état prime, pas la transmission', () => {
    // Proposer « transmettre » sur un recueil rouvert créerait une seconde
    // QuestionnaireReponse pour la même assignation.
    const r = etape(
      [assignAgenda({ statutReponses: 'deverrouille' })],
      [agenda({ cloturablePatient: true, nuitDuJourNotee: true, jourCourant: 21 })],
    );
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_AGD' });
    expect((r as { cta: string }).cta).toContain('Corriger');
    expect((r as { appui?: string }).appui).toBeUndefined();
  });

  it('agenda présent dans agendas mais absent des assignations : aucun CTA orphelin', () => {
    // Cas du filtre IDS_SUSPENDUS : la boucle passe au suivant, pas de crash.
    const r = etape([assign()], [agenda()]);
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
  });

  it('deux agendas, un seul prioritaire : c’est celui-là qui est mis en avant', () => {
    const r = etape(
      [assignAgenda({ idAssignation: 'ASS_A' }), assignAgenda({ idAssignation: 'ASS_B' })],
      [
        agenda({ idAssignation: 'ASS_A', nuitDuJourNotee: true }),
        agenda({ idAssignation: 'ASS_B', nuitDuJourNotee: false }),
      ],
    );
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_B', cta: 'Noter ma nuit' });
  });

  it('agenda expiré (date limite dépassée) : jamais mis en avant', () => {
    const r = etape([assignAgenda({ estEnAttenteSaisie: false })], [agenda()]);
    expect(r).toMatchObject({ kind: 'stable' });
  });

  it('sans assignation : état vide, jamais une action', () => {
    expect(etape([], [agenda()])).toEqual({ kind: 'vide' });
  });
});

describe('affichage — l’état praticien prime toujours sur le rythme de l’agenda', () => {
  it.each([
    ['verrouille', 'transmis', 'Transmis au praticien'],
    ['modification_demandee', 'correction', 'Correction demandée'],
    ['deverrouille', 'a_completer', 'Déverrouillé par le praticien'],
  ])('statutReponses=%s : groupe %s, badge « %s »', (statut, groupe, badge) => {
    const aff = affichage(assignAgenda({ statutReponses: statut as never }), false, agenda());
    expect(aff.groupe).toBe(groupe);
    expect(aff.badge).toBe(badge);
  });

  it.each([
    [{ nuitDuJourNotee: false }, 'Nuit du jour à noter'],
    [{ nuitDuJourNotee: true }, 'Nuit notée ce matin'],
    [{ nbRenseignees: 0, jourCourant: null }, 'À commencer'],
    [{ jourCourant: null }, 'À transmettre'],
  ])('badge d’agenda %j → « %s »', (etatAgenda, badge) => {
    expect(affichage(assignAgenda(), false, agenda(etatAgenda)).badge).toBe(badge);
  });

  it('un questionnaire ordinaire garde ses badges d’origine', () => {
    expect(affichage(assign(), false).badge).toBe('À compléter');
    expect(affichage(assign(), true).badge).toBe('Brouillon enregistré');
  });
});

// Les badges sont lus par le patient : ils tombent sous la même doctrine que
// les textes du module de rappel, que leur banc ne couvrait pas.
describe('badges d’agenda — vocabulaire', () => {
  const badges = [
    { nuitDuJourNotee: false },
    { nuitDuJourNotee: true },
    { nbRenseignees: 0, jourCourant: null },
    { jourCourant: null },
  ]
    .map(o => affichage(assignAgenda(), false, agenda(o)).badge)
    .join(' | ')
    .toLowerCase();

  it.each(['manqué', 'oubli', 'retard', 'reste', '%', 'série', 'affilée', 'urgent', 'complet'])(
    'ne dit jamais « %s »',
    interdit => expect(badges).not.toContain(interdit),
  );
});
