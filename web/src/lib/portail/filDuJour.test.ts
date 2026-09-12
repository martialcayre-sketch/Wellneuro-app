import { describe, expect, it } from 'vitest';
import type { AssignationPatient } from '@/lib/consultation/mapAssignation';
import { affichage, type AgendaAliPortail, type AgendaPortail, type Enrichi } from './hubQuestionnaires';
import { construireFilDuJour, type SourcesFilDuJour } from './filDuJour';

/*
 * LE FIL DU JOUR — ce que ces bancs protègent.
 *
 * D'abord, TOUTES LES PROMESSES DE L'ÉTAPE DU MOMENT, que ce module remplace.
 * `calculerActionRecommandee` élisait une action ; le fil en donne la liste.
 * Chacune de ses promesses est rejouée ici, y compris celles que le fil honore
 * AUTREMENT — et les cas où la réponse change sont dits comme tels, jamais
 * glissés.
 *
 * Ensuite, LA RÈGLE PROPRE DU FIL : une tâche est un geste que le patient peut
 * poser MAINTENANT, et elle DISPARAÎT quand il l'a posé. Une liste qui ne se
 * vide jamais cesse d'être une liste de tâches.
 */

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

/** Le recueil alimentaire CLOS : fenêtre atteinte, et aucune route de clôture. */
const agendaAliClos = () =>
  agendaAli({ nbRenseignees: 21, jourCourant: null, cloturablePatient: true });

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

function fil(
  assignations: AssignationPatient[],
  agendas: AgendaPortail[] = [],
  brouillons = new Set<string>(),
  agendasAli: AgendaAliPortail[] = [],
  reste: Partial<SourcesFilDuJour> = {},
) {
  return construireFilDuJour({
    token: 'TOK',
    enrichis: enrichir(assignations, agendas, brouillons, agendasAli),
    brouillons,
    lectures: [],
    agendas,
    agendasAli,
    ceQuiCompteOuvert: null,
    formulationParcours: null,
    ...reste,
  });
}

const cles = (f: ReturnType<typeof fil>) => f.taches.map(t => t.cle);

describe('l’ordre du fil — ce qui périme passe devant', () => {
  it('une nuit à noter passe DEVANT un brouillon enregistré', () => {
    // Le brouillon attend sans rien perdre ; la nuit, non.
    const f = fil([assign(), assignAgenda()], [agenda()], new Set(['ASS_Q']));
    expect(cles(f)).toEqual(['ASS_AGD', 'ASS_Q']);
    expect(f.taches[0]).toMatchObject({
      espece: 'agenda_sommeil',
      cta: 'Noter ma nuit',
      appui: '5 nuits notées sur 21.',
      href: '/portail/TOK/questionnaires/ASS_AGD',
    });
  });

  it('une journée à noter passe DEVANT un brouillon enregistré', () => {
    const f = fil([assign(), assignAgendaAli()], [], new Set(['ASS_Q']), [agendaAli()]);
    expect(cles(f)).toEqual(['ASS_AGD_ALI', 'ASS_Q']);
    expect(f.taches[0]).toMatchObject({
      espece: 'agenda_alimentaire',
      cta: 'Noter ma journée',
      appui: '5 journées notées sur 21.',
    });
  });

  it('sommeil ET alimentaire à noter : les DEUX sont là, le sommeil en tête', () => {
    // CE QUI CHANGE. L'étape du moment n'en montrait qu'un — l'autre ne
    // subsistait que dans une liste, plus bas. Le fil les porte tous les deux ;
    // l'ordre reste celui d'avant, et il reste arbitraire : ni l'un ni l'autre
    // ne prime CLINIQUEMENT, l'ordre n'est là que pour être STABLE.
    const f = fil([assignAgenda(), assignAgendaAli()], [agenda()], new Set(), [agendaAli()]);
    expect(cles(f)).toEqual(['ASS_AGD', 'ASS_AGD_ALI']);
  });

  it('un agenda jamais commencé ne passe PAS devant un pack assigné', () => {
    // Rien ne se perd à commencer demain : la fenêtre s'ancre sur la première
    // nuit saisie. Le mettre en tête enterrerait le pack SANS TERME — un
    // recueil de 21 jours repousserait six questionnaires de trois semaines.
    //
    // CE BANC A ÉTÉ ÉCRIT FAUX. Son titre disait déjà ceci ; son assertion
    // attendait l'agenda en tête. Un banc dont le titre et l'assertion se
    // contredisent ne garde rien : il fait passer la violation pour la règle.
    const f = fil([assign(), assignAgenda()], [agenda({ nbRenseignees: 0, jourCourant: null })]);
    expect(cles(f)).toEqual(['ASS_Q', 'ASS_AGD']);
    expect(f.taches[1].cta).toBe('Commencer mon agenda du sommeil');
  });

  it('un recueil à COMMENCER ne passe pas devant un recueil PÉRISSABLE de l’autre famille', () => {
    // LA SEULE FAÇON DE VOIR LA DISTINCTION. Quand une famille est seule, un
    // agenda « à commencer » arrive en tête de toute manière — il précède les
    // questionnaires. C'est donc CROISÉ entre les deux familles que « ce qui
    // périme d'abord » devient observable : une journée à noter aujourd'hui
    // passe devant un agenda du sommeil qu'on n'a jamais ouvert.
    const f = fil(
      [assignAgenda(), assignAgendaAli()],
      [agenda({ nbRenseignees: 0, jourCourant: null })],
      new Set(),
      [agendaAli()],
    );
    expect(cles(f)).toEqual(['ASS_AGD_ALI', 'ASS_AGD']);
  });

  it('et dans l’autre sens : une nuit à noter passe devant un agenda alimentaire à commencer', () => {
    const f = fil([assignAgenda(), assignAgendaAli()], [agenda()], new Set(), [
      agendaAli({ nbRenseignees: 0, jourCourant: null }),
    ]);
    expect(cles(f)).toEqual(['ASS_AGD', 'ASS_AGD_ALI']);
  });

  it('deux recueils jamais commencés : l’ordre est STABLE, et c’est tout ce qu’il promet', () => {
    // Ni l'un ni l'autre ne périme, donc aucun ne passe devant POUR UNE RAISON
    // CLINIQUE. L'ordre existe quand même, et il doit être le même à chaque
    // chargement : le sommeil d'abord, comme partout ailleurs dans le hub.
    // Sans ce banc, ranger l'alimentaire parmi les périssables ne se verrait
    // nulle part — les deux autres cas croisés y sont aveugles.
    const f = fil([assignAgenda(), assignAgendaAli()], [agenda({ nbRenseignees: 0, jourCourant: null })], new Set(), [
      agendaAli({ nbRenseignees: 0, jourCourant: null }),
    ]);
    expect(cles(f)).toEqual(['ASS_AGD', 'ASS_AGD_ALI']);
  });

  it('deux agendas, un seul à noter : celui qui est à jour n’est pas une tâche', () => {
    const f = fil(
      [assignAgenda({ idAssignation: 'ASS_A' }), assignAgenda({ idAssignation: 'ASS_B' })],
      [
        agenda({ idAssignation: 'ASS_A', nuitDuJourNotee: true }),
        agenda({ idAssignation: 'ASS_B', nuitDuJourNotee: false }),
      ],
    );
    expect(cles(f)).toEqual(['ASS_B']);
  });

  it('un questionnaire commencé passe devant un questionnaire intact', () => {
    const f = fil(
      [assign({ idAssignation: 'ASS_1' }), assign({ idAssignation: 'ASS_2' })],
      [],
      new Set(['ASS_2']),
    );
    expect(cles(f)).toEqual(['ASS_2', 'ASS_1']);
    expect(f.taches[0].cta).toContain('Reprendre');
  });
});

describe('la disparition — une tâche faite quitte le fil', () => {
  it('nuit notée ce matin : plus de tâche, et le repos le DIT', () => {
    // CE QUI CHANGE, ET C'EST LE CŒUR DU LOT. Avant, l'agenda à jour restait
    // dans « à compléter » sous « Consulter », et le repli « premier à
    // compléter » le présentait comme l'étape du moment : une tâche là où il
    // n'y en avait aucune. Le patient était mis au travail sur un recueil
    // qu'il venait de remplir.
    const f = fil([assignAgenda()], [agenda({ nuitDuJourNotee: true })]);
    expect(f.taches).toEqual([]);
    expect(f.repos).toEqual({
      kind: 'rien_aujourdhui',
      appuis: ['Nuit notée ce matin. 5 nuits notées sur 21.'],
    });
  });

  it('journée notée : idem côté alimentaire', () => {
    const f = fil([assignAgendaAli()], [], new Set(), [agendaAli({ journeeDuJourEnregistree: true })]);
    expect(f.taches).toEqual([]);
    expect(f.repos).toMatchObject({ kind: 'rien_aujourdhui' });
  });

  it('les deux agendas à jour : les DEUX phrases factuelles sont au repos', () => {
    const f = fil(
      [assignAgenda(), assignAgendaAli()],
      [agenda({ nuitDuJourNotee: true })],
      new Set(),
      [agendaAli({ journeeDuJourEnregistree: true })],
    );
    expect(f.taches).toEqual([]);
    expect((f.repos as { appuis: string[] }).appuis).toHaveLength(2);
  });

  it('un questionnaire transmis quitte le fil', () => {
    expect(fil([assign({ statutReponses: 'verrouille' })]).taches).toEqual([]);
  });

  it('un questionnaire expiré n’est jamais une tâche', () => {
    expect(fil([assign({ estEnAttenteSaisie: false })]).taches).toEqual([]);
  });

  it('un agenda expiré n’est jamais une tâche, malgré son rappel quotidien', () => {
    // Le rappel dit « nuit du jour à noter » — il ne connaît que le rythme du
    // recueil. C'est `affichage()` qui arbitre : date limite dépassée, donc
    // rien à faire.
    const f = fil([assignAgenda({ estEnAttenteSaisie: false })], [agenda()]);
    expect(f.taches).toEqual([]);
    expect(f.repos).toMatchObject({ kind: 'stable' });
  });

  it('le recueil alimentaire CLOS sans route de clôture n’est pas une tâche', () => {
    // `rappelPortail` rend déjà `cta: null` : aucun geste patient n'existe.
    // Le nommer quand même promettrait l'impossible (D-015).
    const f = fil([assignAgendaAli()], [], new Set(), [agendaAliClos()]);
    expect(f.taches).toEqual([]);
  });

  it('un vrai questionnaire reprend la tête quand le recueil clos est le seul autre', () => {
    const f = fil([assignAgendaAli(), assign()], [], new Set(), [agendaAliClos()]);
    expect(cles(f)).toEqual(['ASS_Q']);
  });
});

describe('l’état posé par le praticien prime sur le rythme du recueil', () => {
  it.each([
    ['sommeil', () => fil([assignAgenda({ statutReponses: 'deverrouille' })], [agenda({ cloturablePatient: true, nuitDuJourNotee: true, jourCourant: 21 })])],
    ['alimentaire', () => fil([assignAgendaAli({ statutReponses: 'deverrouille' })], [], new Set(), [agendaAli({ cloturablePatient: true, journeeDuJourEnregistree: true, jourCourant: 21 })])],
  ])('agenda %s déverrouillé : « Corriger », jamais « transmettre »', (_nom, faire) => {
    // Proposer « transmettre » sur un recueil rouvert créerait une SECONDE
    // QuestionnaireReponse pour la même assignation.
    const f = faire();
    expect(f.taches).toHaveLength(1);
    expect(f.taches[0].espece).toBe('questionnaire');
    expect(f.taches[0].cta).toContain('Corriger');
    expect(f.taches[0].appui).toBeNull();
  });

  it('une correction demandée n’est pas une tâche : le patient ne peut rien faire', () => {
    const f = fil([assign({ statutReponses: 'modification_demandee' })]);
    expect(f.taches).toEqual([]);
    expect(f.repos).toEqual({
      kind: 'attente',
      texte:
        'Votre demande de correction sur « Enquête alimentaire » est en attente de traitement par votre praticien.',
    });
  });
});

describe('aucun lien orphelin', () => {
  it('agenda du sommeil servi mais assignation absente : aucune tâche', () => {
    // Cas du filtre `IDS_SUSPENDUS` : un lien fabriqué depuis le seul rappel
    // pointerait vers un écran qui rend 410.
    expect(cles(fil([assign()], [agenda()]))).toEqual(['ASS_Q']);
  });

  it('agenda alimentaire servi mais assignation absente : aucune tâche', () => {
    // Cas du drapeau `WN_AGENDA_ALI` éteint.
    expect(cles(fil([assign()], [], new Set(), [agendaAli()]))).toEqual(['ASS_Q']);
  });

  it('un agenda transmis ne laisse AUCUNE phrase de repos derrière lui', () => {
    // Le rappel continue de compter les nuits ; l'assignation, elle, est
    // verrouillée. « 5 nuits notées sur 21 » sous « rien à faire aujourd'hui »
    // décrirait comme courant un recueil déjà parti chez le praticien.
    const f = fil([assignAgenda({ statutReponses: 'verrouille' })], [agenda({ nuitDuJourNotee: true })]);
    expect(f.taches).toEqual([]);
    expect(f.repos).toMatchObject({ kind: 'stable' });
  });

  it('lecture des agendas en échec : le recueil redevient un questionnaire ordinaire', () => {
    // Tableau vide = la route n'a pas répondu. `affichage()` retombe déjà sur
    // son rendu générique ; le fil retombe avec lui, plutôt que de faire
    // disparaître un recueil qu'il ne sait plus lire.
    const f = fil([assignAgenda()], []);
    expect(cles(f)).toEqual(['ASS_AGD']);
    expect(f.taches[0].espece).toBe('questionnaire');
    expect(f.taches[0].cta).toContain('Commencer');
  });
});

describe('l’invitation à dire ce qui compte', () => {
  it('fenêtre ouverte : l’invitation entre dans le fil, AVANT les questionnaires', () => {
    // C'est un arbitrage, pas un hasard : c'est la seule tâche où le patient
    // PARLE. Après les questionnaires, elle ne lui arriverait qu'une fois tout
    // rempli — c'est-à-dire, pour la plupart des dossiers, jamais.
    const f = fil([assign()], [], new Set(), [], { ceQuiCompteOuvert: true });
    expect(cles(f)).toEqual(['ce-qui-compte', 'ASS_Q']);
    expect(f.taches[0]).toMatchObject({
      espece: 'ce_qui_compte',
      cta: 'Dire ce qui compte pour moi',
      href: '/portail/TOK/ce-qui-compte',
    });
  });

  it('elle ne passe PAS devant une nuit à noter', () => {
    const f = fil([assignAgenda()], [agenda()], new Set(), [], { ceQuiCompteOuvert: true });
    expect(cles(f)).toEqual(['ASS_AGD', 'ce-qui-compte']);
  });

  it('fenêtre fermée : aucune invitation — le dépôt du cycle a déjà eu lieu', () => {
    // `D-166` : un dépôt par cycle. Inviter quand même nommerait un geste que
    // la route refuserait.
    expect(cles(fil([assign()], [], new Set(), [], { ceQuiCompteOuvert: false }))).toEqual(['ASS_Q']);
  });

  it('état INCONNU : aucune invitation — le doute ne produit pas de tâche', () => {
    // `null` = drapeau fermé, sonde en vol, sonde en échec. Inviter dans le
    // doute enverrait le patient sur un écran qui rend `notFound()`.
    expect(cles(fil([assign()], [], new Set(), [], { ceQuiCompteOuvert: null }))).toEqual(['ASS_Q']);
  });

  it('elle suffit à elle seule à faire un fil non vide', () => {
    // Un dossier sans aucun questionnaire à compléter n'est pas un dossier
    // sans rien à faire : c'est précisément là que l'invitation manquait.
    const f = fil([assign({ statutReponses: 'verrouille' })], [], new Set(), [], {
      ceQuiCompteOuvert: true,
    });
    expect(cles(f)).toEqual(['ce-qui-compte']);
  });
});

describe('les lectures — ce que le praticien a remis', () => {
  const bilan = { espece: 'bilan' as const, idObjet: 'env_1', remiseLe: '2026-09-01T10:00:00.000Z' };
  const synthese = {
    espece: 'synthese' as const,
    idObjet: 'syn_1',
    remiseLe: '2026-09-02T10:00:00.000Z',
  };

  it('une lecture entre au fil, avec son geste et son écran', () => {
    const f = fil([], [], new Set(), [], { lectures: [bilan] });
    expect(f.taches).toEqual([
      {
        cle: 'lecture:bilan:env_1',
        espece: 'lecture',
        cta: 'Lire mon bilan',
        appui: null,
        href: '/portail/TOK/bilan',
      },
    ]);
  });

  it('elle ne passe PAS devant une nuit à noter', () => {
    const f = fil([assignAgenda()], [agenda()], new Set(), [], { lectures: [bilan] });
    expect(cles(f)).toEqual(['ASS_AGD', 'lecture:bilan:env_1']);
  });

  it('elle passe devant l’invitation à dire ce qui compte, et c’est une SÉQUENCE', () => {
    // « Voici ce que j'ai compris de vous », puis « dites-moi ce qui compte » —
    // l'inverse ferait parler le patient avant de l'avoir écouté.
    const f = fil([], [], new Set(), [], { lectures: [synthese], ceQuiCompteOuvert: true });
    expect(cles(f)).toEqual(['lecture:synthese:syn_1', 'ce-qui-compte']);
  });

  it('elle passe devant les questionnaires : un document REMIS n’est pas un formulaire de plus', () => {
    const f = fil([assign()], [], new Set(), [], { lectures: [bilan] });
    expect(cles(f)).toEqual(['lecture:bilan:env_1', 'ASS_Q']);
  });

  it('l’ordre reçu est conservé — c’est `lecturesAttendues` qui arbitre, pas le fil', () => {
    const f = fil([], [], new Set(), [], { lectures: [synthese, bilan] });
    expect(cles(f)).toEqual(['lecture:synthese:syn_1', 'lecture:bilan:env_1']);
  });

  it('la clé porte l’ESPÈCE : deux identifiants identiques ne se confondent pas', () => {
    // Les deux familles d'identifiants sont indépendantes ; une clé de rendu
    // dupliquée ferait disparaître une tâche de l'écran sans rien faire rougir.
    const f = fil([], [], new Set(), [], {
      lectures: [
        { espece: 'bilan', idObjet: 'x', remiseLe: '2026-09-01T10:00:00.000Z' },
        { espece: 'synthese', idObjet: 'x', remiseLe: '2026-09-02T10:00:00.000Z' },
      ],
    });
    expect(cles(f)).toEqual(['lecture:bilan:x', 'lecture:synthese:x']);
    expect(new Set(cles(f)).size).toBe(2);
  });

  it('aucune lecture attendue : le fil n’en fabrique aucune', () => {
    expect(cles(fil([], [], new Set(), [], { lectures: [] }))).toEqual([]);
  });

  it('une lecture seule suffit à faire un fil non vide', () => {
    // Un dossier où tout est transmis n'est pas un dossier sans rien à faire
    // quand un bilan vient d'arriver.
    const f = fil([assign({ statutReponses: 'verrouille' })], [], new Set(), [], {
      lectures: [bilan],
    });
    expect(cles(f)).toEqual(['lecture:bilan:env_1']);
    expect(f.taches[0].espece).toBe('lecture');
  });
});

describe('le repos — ce qui se dit quand il n’y a rien à faire', () => {
  it('aucune assignation : « aucun questionnaire pour le moment »', () => {
    expect(fil([])).toEqual({ taches: [], repos: { kind: 'vide' } });
  });

  it('tout transmis, sans contrat de parcours : « stable »', () => {
    expect(fil([assign({ statutReponses: 'verrouille' })]).repos).toEqual({ kind: 'stable' });
  });

  it('tout transmis, avec contrat de parcours : c’est SA formulation qui parle', () => {
    const f = fil([assign({ statutReponses: 'verrouille' })], [], new Set(), [], {
      formulationParcours: 'Votre bilan est en préparation.',
    });
    expect(f.repos).toEqual({ kind: 'attente', texte: 'Votre bilan est en préparation.' });
  });

  it('une correction en attente prime sur la formulation du parcours', () => {
    const f = fil([assign({ statutReponses: 'modification_demandee' })], [], new Set(), [], {
      formulationParcours: 'Votre bilan est en préparation.',
    });
    expect(f.repos).toMatchObject({ kind: 'attente' });
    expect((f.repos as { texte: string }).texte).toContain('demande de correction');
  });

  it('un recueil qui court prime sur la correction en attente, et c’est assumé', () => {
    // Les deux énoncés sont vrais. Celui-ci répond à la question POSÉE — « que
    // dois-je faire aujourd'hui ? » — et la correction en attente garde sa
    // propre section, plus bas dans la page : elle ne se perd pas.
    const f = fil(
      [assignAgenda(), assign({ statutReponses: 'modification_demandee' })],
      [agenda({ nuitDuJourNotee: true })],
    );
    expect(f.repos).toMatchObject({ kind: 'rien_aujourdhui' });
  });
});

describe('les interdits du portail patient', () => {
  it('aucune tâche ne porte de compte à rebours, de reproche ni de pourcentage', () => {
    const f = fil(
      [assign(), assignAgenda(), assignAgendaAli()],
      [agenda()],
      new Set(['ASS_Q']),
      [agendaAli()],
      { ceQuiCompteOuvert: true },
    );
    const texte = f.taches.map(t => `${t.cta} ${t.appui ?? ''}`).join(' ');
    expect(texte).not.toMatch(/%/);
    expect(texte).not.toMatch(/manqué|retard|il vous reste|plus que|devez/i);
  });

  it('les clés sont uniques — un item ne peut pas être compté deux fois', () => {
    const f = fil(
      [assign(), assignAgenda(), assignAgendaAli()],
      [agenda()],
      new Set(),
      [agendaAli()],
      { ceQuiCompteOuvert: true },
    );
    expect(new Set(cles(f)).size).toBe(f.taches.length);
  });

  it('un agenda ne paraît JAMAIS deux fois : ni tâche + questionnaire, ni tâche + repos', () => {
    const f = fil([assignAgenda()], [agenda()]);
    expect(cles(f)).toEqual(['ASS_AGD']);
    expect(f.taches[0].espece).toBe('agenda_sommeil');
    expect((f.repos as { kind: string }).kind).toBe('stable');
  });
});
