import { describe, expect, it } from 'vitest';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import {
  GROUPES,
  GROUPES_SECONDAIRES,
  affichage,
  calculerActionRecommandee,
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

function etape(
  assignations: AssignationPatient[],
  agendas: AgendaPortail[] = [],
  brouillons = new Set<string>(),
  agendasAli: AgendaAliPortail[] = [],
) {
  return calculerActionRecommandee(
    enrichir(assignations, agendas, brouillons, agendasAli),
    brouillons,
    agendas,
    agendasAli,
  );
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

describe('étape du moment — l’agenda ALIMENTAIRE au même rang que celui du sommeil', () => {
  it('une journée à noter passe DEVANT un brouillon enregistré', () => {
    const r = etape([assign(), assignAgendaAli()], [], new Set(['ASS_Q']), [agendaAli()]);
    expect(r).toMatchObject({
      kind: 'action',
      idAssignation: 'ASS_AGD_ALI',
      cta: 'Noter ma journée',
      appui: '5 journées notées sur 21.',
    });
  });

  it('agenda alimentaire à jour : la main revient au brouillon', () => {
    const r = etape(
      [assign(), assignAgendaAli()],
      [],
      new Set(['ASS_Q']),
      [agendaAli({ journeeDuJourEnregistree: true })],
    );
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
    expect((r as { cta: string }).cta).toContain('Reprendre');
  });

  it('agenda alimentaire jamais commencé : NON prioritaire, le pack garde la main', () => {
    const r = etape([assign(), assignAgendaAli()], [], new Set(), [
      agendaAli({ nbRenseignees: 0, jourCourant: null }),
    ]);
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
  });

  it('agenda alimentaire déverrouillé par le praticien : son état prime, pas la transmission', () => {
    // Proposer « transmettre » sur un recueil rouvert créerait une seconde
    // QuestionnaireReponse pour la même assignation. Même garde que le sommeil.
    const r = etape([assignAgendaAli({ statutReponses: 'deverrouille' })], [], new Set(), [
      agendaAli({ cloturablePatient: true, journeeDuJourEnregistree: true, jourCourant: 21 }),
    ]);
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_AGD_ALI' });
    expect((r as { cta: string }).cta).toContain('Corriger');
    expect((r as { appui?: string }).appui).toBeUndefined();
  });

  it('agenda alimentaire présent mais absent des assignations : aucun CTA orphelin', () => {
    // Cas du filtre IDS_SUSPENDUS, drapeau `WN_AGENDA_ALI` éteint : la route
    // peut ne plus servir l'assignation. La boucle passe au suivant, pas de
    // CTA pointant vers un écran qui rendrait 410.
    const r = etape([assign()], [], new Set(), [agendaAli()]);
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
  });

  it('agenda alimentaire expiré (date limite dépassée) : jamais mis en avant', () => {
    const r = etape([assignAgendaAli({ estEnAttenteSaisie: false })], [], new Set(), [agendaAli()]);
    expect(r).toMatchObject({ kind: 'stable' });
  });

  // LE CAS QUI DÉCIDE : les deux recueils ouverts en même temps. Le portail ne
  // met en avant qu'UNE chose — le second ne doit ni écraser le premier, ni
  // disparaître de la liste.
  it('sommeil ET alimentaire tous deux à noter : le sommeil est recommandé, l’alimentaire reste listé', () => {
    const enriched = enrichir(
      [assignAgenda(), assignAgendaAli()],
      [agenda()],
      new Set(),
      [agendaAli()],
    );
    const r = calculerActionRecommandee(enriched, new Set(), [agenda()], [agendaAli()]);
    expect(r).toMatchObject({
      kind: 'action',
      idAssignation: 'ASS_AGD',
      cta: 'Noter ma nuit',
      appui: '5 nuits notées sur 21.',
    });
    // L'alimentaire n'est pas écrasé : il garde son propre badge dans la liste.
    const ali = enriched.find(e => e.a.idAssignation === 'ASS_AGD_ALI');
    expect(ali?.aff.badge).toBe('Journée du jour à noter');
    expect(ali?.aff.action).toBe('Noter ma journée');
  });

  it('sommeil à jour, alimentaire à noter : l’alimentaire prend la main', () => {
    const r = etape(
      [assignAgenda(), assignAgendaAli()],
      [agenda({ nuitDuJourNotee: true })],
      new Set(),
      [agendaAli()],
    );
    expect(r).toMatchObject({
      kind: 'action',
      idAssignation: 'ASS_AGD_ALI',
      cta: 'Noter ma journée',
    });
  });

  it('les deux à jour : la main revient aux questionnaires ordinaires', () => {
    const r = etape(
      [assign(), assignAgenda(), assignAgendaAli()],
      [agenda({ nuitDuJourNotee: true })],
      new Set(),
      [agendaAli({ journeeDuJourEnregistree: true })],
    );
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
  });

  // Non-régression : sans agenda alimentaire, le hub se comporte EXACTEMENT
  // comme avant — le quatrième paramètre est facultatif.
  it('appel à trois arguments (sans agendas alimentaires) : comportement inchangé', () => {
    const enriched = enrichir([assign(), assignAgenda()], [agenda()], new Set());
    expect(calculerActionRecommandee(enriched, new Set(), [agenda()])).toMatchObject({
      kind: 'action',
      idAssignation: 'ASS_AGD',
      cta: 'Noter ma nuit',
    });
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

  it('seul reste à l’écran : plus jamais l’étape du moment', () => {
    const r = etape([assignAgendaAli()], [], new Set(), [agendaAliClos()]);
    expect(r).toMatchObject({ kind: 'stable' });
  });

  it('un vrai questionnaire à compléter reprend l’étape du moment', () => {
    // L'ordre place l'agenda EN PREMIER : avant le correctif, le repli
    // « premier à compléter » le choisissait lui, et non le questionnaire.
    const r = etape([assignAgendaAli(), assign()], [], new Set(), [agendaAliClos()]);
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_Q' });
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
    const r = etape([assignAgenda()], [agenda({ nbRenseignees: 21, jourCourant: null })]);
    expect(r).toMatchObject({ kind: 'action', idAssignation: 'ASS_AGD' });
  });
});
