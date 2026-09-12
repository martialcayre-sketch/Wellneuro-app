import { describe, expect, it } from 'vitest';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import {
  GROUPES,
  GROUPES_SECONDAIRES,
  affichage,
  type AgendaAliPortail,
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

function agendaAli(over: Partial<AgendaAliPortail> = {}): AgendaAliPortail {
  return {
    idAssignation: 'ASS_AGD_ALI',
    nbRenseignees: 5,
    jourCourant: 6,
    journeeDuJourEnregistree: false,
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

const assignAgendaAli = (over: Partial<AssignationPatient> = {}) =>
  assign({
    idAssignation: 'ASS_AGD_ALI',
    idQuestionnaire: 'Q_ALI_09',
    titre: 'Agenda alimentaire — 21 jours',
    ...over,
  });

function enrichir(
  assignations: AssignationPatient[],
  agendas: AgendaPortail[],
  brouillons: Set<string>,
  agendasAli: AgendaAliPortail[] = [],
): Enrichi[] {
  return assignations.map(a => ({
    a,
    aff: affichage(
      a,
      brouillons.has(a.idAssignation),
      agendas.find(g => g.idAssignation === a.idAssignation),
      agendasAli.find(g => g.idAssignation === a.idAssignation),
    ),
  }));
}

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

describe('affichage — l’agenda ALIMENTAIRE', () => {
  it.each([
    ['verrouille', 'transmis', 'Transmis au praticien'],
    ['modification_demandee', 'correction', 'Correction demandée'],
    ['deverrouille', 'a_completer', 'Déverrouillé par le praticien'],
  ])('statutReponses=%s : groupe %s, badge « %s » — l’état praticien prime', (statut, groupe, badge) => {
    const aff = affichage(
      assignAgendaAli({ statutReponses: statut as never }),
      false,
      undefined,
      agendaAli(),
    );
    expect(aff.groupe).toBe(groupe);
    expect(aff.badge).toBe(badge);
  });

  it.each([
    [{ journeeDuJourEnregistree: false }, 'Journée du jour à noter'],
    [{ journeeDuJourEnregistree: true }, 'Journée notée aujourd’hui'],
    [{ nbRenseignees: 0, jourCourant: null }, 'À commencer'],
    // ÉTAT et non geste : aucune route de clôture alimentaire n'existe, et le
    // badge ne doit pas promettre ce que `rappelPortail` refuse déjà de proposer.
    [{ jourCourant: null }, 'Recueil terminé'],
  ])('badge d’agenda alimentaire %j → « %s »', (etatAgenda, badge) => {
    expect(affichage(assignAgendaAli(), false, undefined, agendaAli(etatAgenda)).badge).toBe(badge);
  });

  it('un agenda alimentaire n’est ni « à compléter » ni un brouillon', () => {
    // Sans l'état d'agenda, l'assignation retomberait sur le libellé générique.
    expect(affichage(assignAgendaAli(), true, undefined, agendaAli()).badge).toBe(
      'Journée du jour à noter',
    );
    expect(affichage(assignAgendaAli(), true).badge).toBe('Brouillon enregistré');
  });

  it('l’état d’un agenda du sommeil ne pilote jamais l’affichage d’un agenda alimentaire', () => {
    // Les deux tableaux sont disjoints côté route : un croisement d'ids ne doit
    // pas produire un badge « nuit » sur un recueil alimentaire.
    const aff = affichage(assignAgendaAli(), false, agenda({ idAssignation: 'ASS_AGD_ALI' }));
    expect(aff.badge).toBe('À compléter');
  });

  const badgesAli = [
    { journeeDuJourEnregistree: false },
    { journeeDuJourEnregistree: true },
    { nbRenseignees: 0, jourCourant: null },
    { jourCourant: null },
  ]
    .map(o => affichage(assignAgendaAli(), false, undefined, agendaAli(o)).badge)
    .join(' | ')
    .toLowerCase();

  it.each(['manqué', 'oubli', 'retard', 'reste', '%', 'série', 'affilée', 'urgent', 'complet', 'nuit'])(
    'badge alimentaire : ne dit jamais « %s »',
    interdit => expect(badgesAli).not.toContain(interdit),
  );
});

// ── LE RECUEIL ALIMENTAIRE CLOS SORT DE « À COMPLÉTER » ──────────────────────
//
// Constaté en production le 2026-09-12 : un agenda dont la fenêtre de 21 jours
// s'était refermée cinq semaines plus tôt tenait encore « VOTRE ÉTAPE DU
// MOMENT », sous « Consulter « Agenda alimentaire — 21 jours » » — un libellé
// que personne n'avait écrit, fabriqué par le `?? 'Consulter'` d'`affichage`.
// Aucune route de clôture alimentaire n'existant, AUCUN geste du patient ne
// pouvait l'en faire sortir.
//
// L'état d'un agenda clos est décrit par un helper local : `jourCourant: null`
// avec au moins une journée notée, c'est-à-dire ce que la route sert pour un
// recueil ancré puis dépassé.
const agendaAliClos = (over: Partial<AgendaAliPortail> = {}) =>
  agendaAli({ nbRenseignees: 1, jourCourant: null, ...over });

describe('agenda alimentaire clos — il quitte « À compléter »', () => {
  it('affichage : groupe « recueil_termine », jamais « a_completer »', () => {
    const aff = affichage(assignAgendaAli(), false, undefined, agendaAliClos());
    expect(aff.groupe).toBe('recueil_termine');
    expect(aff.badge).toBe('Recueil terminé');
  });

  it('relire ses journées reste possible — « Consulter », en retrait', () => {
    // Le geste offert doit rester POSSIBLE : le journal propose déjà la
    // relecture. C'est le geste de CLÔTURE qui n'existe pas, et qu'on ne nomme
    // donc nulle part.
    const aff = affichage(assignAgendaAli(), false, undefined, agendaAliClos());
    expect(aff.action).toBe('Consulter');
    expect(aff.ghost).toBe(true);
  });

  it('il ne compte plus parmi les « à compléter »', () => {
    const enriched = enrichir([assignAgendaAli(), assign()], [], new Set(), [agendaAliClos()]);
    expect(enriched.filter(e => e.aff.groupe === 'a_completer')).toHaveLength(1);
  });

  it('le groupe est déclaré, et affiché en section secondaire repliable', () => {
    expect(GROUPES.map(g => g.cle)).toContain('recueil_termine');
    expect(GROUPES_SECONDAIRES.has('recueil_termine')).toBe(true);
  });

  // ── CE QUI NE DOIT PAS BOUGER ──────────────────────────────────────────────

  it('un recueil EN COURS reste « à compléter », même la journée du jour notée', () => {
    // La fenêtre court encore : demain il y aura une journée à noter. Le sortir
    // ici enterrerait un recueil vivant.
    const aff = affichage(
      assignAgendaAli(),
      false,
      undefined,
      agendaAli({ journeeDuJourEnregistree: true }),
    );
    expect(aff.groupe).toBe('a_completer');
    expect(aff.badge).toBe('Journée notée aujourd’hui');
  });

  it('un agenda jamais commencé reste « à compléter »', () => {
    // `jourCourant: null` AUSSI, mais sans aucune journée notée : la fenêtre
    // n'est pas close, elle n'est pas encore ancrée. Distinguer les deux est
    // tout l'objet du garde — `jourCourant === null` ne suffit pas à conclure.
    const aff = affichage(
      assignAgendaAli(),
      false,
      undefined,
      agendaAli({ nbRenseignees: 0, jourCourant: null }),
    );
    expect(aff.groupe).toBe('a_completer');
    expect(aff.badge).toBe('À commencer');
  });

  it('l’état praticien prime toujours sur la clôture du recueil', () => {
    // Un recueil clos que le praticien rouvre redevient une tâche.
    const aff = affichage(
      assignAgendaAli({ statutReponses: 'deverrouille' }),
      false,
      undefined,
      agendaAliClos(),
    );
    expect(aff.groupe).toBe('a_completer');
    expect(aff.badge).toBe('Déverrouillé par le praticien');
  });

  it('l’agenda du SOMMEIL n’est pas touché : sa fin de fenêtre porte un vrai geste', () => {
    // Son `a_transmettre` a une route de clôture, donc un CTA : il reste une
    // tâche, et prioritaire. Le correctif ne vaut que là où le geste manque.
    const aff = affichage(
      assignAgenda(),
      false,
      agenda({ nbRenseignees: 21, jourCourant: null }),
    );
    expect(aff.groupe).toBe('a_completer');
    expect(aff.action).toBe('Terminer et transmettre à mon praticien');
  });
});
