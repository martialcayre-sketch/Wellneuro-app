import { describe, expect, it } from 'vitest';
import type { CarteFil, TypeCarteFil } from './cartes';
import {
  lectureEffective,
  partagerParLecture,
  sAcquitteParLecture,
  TYPES_ACQUITTABLES_PAR_LECTURE,
  type LectureCarteFilRow,
} from './lectureCartes';

// Bancs de la LECTURE d'une carte du Fil (SP-FIL, 2026-09-12).
//
// Ce que ces bancs défendent, et qui n'est pas évident : la lecture ACQUITTE
// sans refuser. Trois issues, pas deux — une carte reste, une carte affiche sa
// trace du jour, une carte s'en va. Confondre les deux dernières ferait soit
// une liste qui ne s'efface jamais, soit une disparition en silence.

const MIDI = new Date('2026-09-12T10:00:00.000Z'); // 12:00 à Paris

function carte(surcharge: Partial<CarteFil> = {}): CarteFil {
  return {
    type: 'geste_objectif',
    idPatient: 'PAT006',
    patient: 'Michel Dogné',
    titre: 'Votre patient s’est prononcé sur son objectif',
    pourquoi: 'Le 11 septembre, il a répondu « c’est bien ça ».',
    date: '2026-09-11T16:14:00.000Z',
    href: '/dashboard/patients/PAT006',
    actionLabel: 'Ouvrir la fiche',
    cle: 'geste_objectif:ligne1',
    ...surcharge,
  };
}

function lecture(surcharge: Partial<LectureCarteFilRow> = {}): LectureCarteFilRow {
  return {
    idPatient: 'PAT006',
    typeCarte: 'geste_objectif',
    lue: true,
    lueLe: new Date('2026-09-12T09:00:00.000Z'),
    ...surcharge,
  };
}

describe('lectureEffective — la ligne la plus récente fait foi', () => {
  it('sans aucune ligne, aucune lecture effective', () => {
    expect(lectureEffective([]).size).toBe(0);
  });

  it('une lecture seule vaut lecture', () => {
    const effectives = lectureEffective([lecture()]);
    expect(effectives.get('PAT006|geste_objectif')?.toISOString()).toBe('2026-09-12T09:00:00.000Z');
  });

  it('une ANNULATION postérieure retire la lecture — sinon « Remettre » ne remettrait rien', () => {
    const effectives = lectureEffective([
      lecture({ lueLe: new Date('2026-09-12T09:00:00.000Z') }),
      lecture({ lue: false, lueLe: new Date('2026-09-12T09:05:00.000Z') }),
    ]);
    expect(effectives.has('PAT006|geste_objectif')).toBe(false);
  });

  it('une annulation ANTÉRIEURE ne retire rien : on a relu depuis', () => {
    const effectives = lectureEffective([
      lecture({ lue: false, lueLe: new Date('2026-09-12T08:00:00.000Z') }),
      lecture({ lueLe: new Date('2026-09-12T09:00:00.000Z') }),
    ]);
    expect(effectives.get('PAT006|geste_objectif')?.toISOString()).toBe('2026-09-12T09:00:00.000Z');
  });

  it('l’ordre d’arrivée des lignes ne change pas le verdict', () => {
    const lignes = [
      lecture({ lueLe: new Date('2026-09-12T09:00:00.000Z') }),
      lecture({ lue: false, lueLe: new Date('2026-09-12T09:05:00.000Z') }),
    ];
    const endroit = lectureEffective(lignes);
    const envers = lectureEffective([...lignes].reverse());
    expect(endroit.has('PAT006|geste_objectif')).toBe(envers.has('PAT006|geste_objectif'));
  });

  it('deux dossiers ne se mélangent pas', () => {
    const effectives = lectureEffective([
      lecture({ idPatient: 'PAT006' }),
      lecture({ idPatient: 'PAT017', lue: false }),
    ]);
    expect(effectives.has('PAT006|geste_objectif')).toBe(true);
    expect(effectives.has('PAT017|geste_objectif')).toBe(false);
  });

  it('deux TYPES ne se mélangent pas — lire un type n’acquitte pas l’autre', () => {
    const effectives = lectureEffective([lecture({ typeCarte: 'geste_objectif' })]);
    expect(effectives.has('PAT006|signalement_trust')).toBe(false);
  });
});

describe('partagerParLecture — trois issues, jamais deux', () => {
  it('sans lecture, la carte reste une carte', () => {
    const { visibles, lues } = partagerParLecture([carte()], [], MIDI);
    expect(visibles).toHaveLength(1);
    expect(lues).toHaveLength(0);
  });

  it('lue AUJOURD’HUI : la carte quitte la liste et laisse sa trace', () => {
    const { visibles, lues } = partagerParLecture([carte()], [lecture()], MIDI);
    expect(visibles).toHaveLength(0);
    expect(lues.map(c => c.cle)).toEqual(['geste_objectif:ligne1']);
  });

  it('LES DEUX RATIFICATIONS DE PAT006 partent ENSEMBLE — une lecture, pas un acquittement ligne à ligne', () => {
    const deux = [
      carte({ cle: 'geste_objectif:l1', date: '2026-09-11T16:14:00.000Z' }),
      carte({ cle: 'geste_objectif:l2', date: '2026-09-11T16:14:10.000Z' }),
    ];
    const { visibles, lues } = partagerParLecture(deux, [lecture()], MIDI);
    expect(visibles).toHaveLength(0);
    expect(lues).toHaveLength(2);
  });

  it('un geste POSTÉRIEUR à la lecture reparaît — un fait nouveau n’est pas acquitté', () => {
    const neuf = carte({ cle: 'geste_objectif:neuf', date: '2026-09-12T09:30:00.000Z' });
    const { visibles, lues } = partagerParLecture([neuf], [lecture()], MIDI);
    expect(visibles.map(c => c.cle)).toEqual(['geste_objectif:neuf']);
    expect(lues).toHaveLength(0);
  });

  it('un geste EXACTEMENT à l’instant de la lecture est lu — la borne est inclusive', () => {
    const pile = carte({ date: '2026-09-12T09:00:00.000Z' });
    const { visibles, lues } = partagerParLecture([pile], [lecture()], MIDI);
    expect(visibles).toHaveLength(0);
    expect(lues).toHaveLength(1);
  });

  it('une carte SANS DATE n’est jamais lue — l’acquitter au bénéfice du doute effacerait un signal', () => {
    const sansDate = carte({ date: null });
    const { visibles, lues } = partagerParLecture([sansDate], [lecture()], MIDI);
    expect(visibles).toHaveLength(1);
    expect(lues).toHaveLength(0);
  });

  it('lue HIER : la carte s’en va, sans trace — le régime d’une carte écartée', () => {
    const hier = lecture({ lueLe: new Date('2026-09-11T09:00:00.000Z') });
    // La carte PRÉCÈDE la lecture : sans cela elle ne serait pas lue du tout,
    // et le banc prouverait autre chose que ce que son titre annonce.
    const avant = carte({ date: '2026-09-11T08:00:00.000Z' });
    const { visibles, lues } = partagerParLecture([avant], [hier], MIDI);
    expect(visibles).toHaveLength(0);
    expect(lues).toHaveLength(0);
  });

  it('la journée est celle de PARIS, pas celle d’UTC — 23h30 hier soir n’est pas aujourd’hui', () => {
    // 2026-09-11T21:30Z = 23:30 à Paris le 11. En UTC, c'est encore le 11 :
    // les deux cadres tombent d'accord ici, et c'est le cas suivant qui sépare.
    const hierSoir = lecture({ lueLe: new Date('2026-09-11T21:30:00.000Z') });
    expect(partagerParLecture([carte()], [hierSoir], MIDI).lues).toHaveLength(0);

    // 2026-09-11T22:30Z = 00:30 à Paris le 12 : AUJOURD'HUI pour le cabinet,
    // hier pour UTC. Un cadre UTC ferait disparaître cette trace sans la
    // montrer — c'est exactement ce que `bornesJourParis` existe pour éviter.
    const nuitParis = lecture({ lueLe: new Date('2026-09-11T22:30:00.000Z') });
    const carteAvant = carte({ date: '2026-09-11T20:00:00.000Z' });
    expect(partagerParLecture([carteAvant], [nuitParis], MIDI).lues).toHaveLength(1);
  });

  it('MINUIT PARIS appartient au jour qui commence, et la veille s’arrête juste avant', () => {
    // Les deux bornes du jour civil, éprouvées séparément : sans cela, un `>`
    // au lieu d’un `>=` ne se verrait jamais — la trace disparaîtrait pour les
    // lectures posées à minuit pile, et personne ne saurait pourquoi.
    const minuit = lecture({ lueLe: new Date('2026-09-11T22:00:00.000Z') }); // 00:00 Paris le 12
    const avant = carte({ date: '2026-09-11T20:00:00.000Z' });
    expect(partagerParLecture([avant], [minuit], MIDI).lues).toHaveLength(1);

    const justeAvant = lecture({ lueLe: new Date('2026-09-11T21:59:59.999Z') }); // 23:59:59 le 11
    expect(partagerParLecture([avant], [justeAvant], MIDI).lues).toHaveLength(0);

    // Et la borne HAUTE : minuit du lendemain n’appartient pas à aujourd’hui.
    const minuitDemain = lecture({ lueLe: new Date('2026-09-12T22:00:00.000Z') });
    expect(partagerParLecture([avant], [minuitDemain], MIDI).lues).toHaveLength(0);
  });

  it('un AUTRE dossier n’est pas acquitté par la lecture du premier', () => {
    const autre = carte({ idPatient: 'PAT017', cle: 'geste_objectif:autre' });
    const { visibles, lues } = partagerParLecture([carte(), autre], [lecture()], MIDI);
    expect(visibles.map(c => c.idPatient)).toEqual(['PAT017']);
    expect(lues.map(c => c.idPatient)).toEqual(['PAT006']);
  });

  it('un AUTRE TYPE du même dossier reste visible — lire l’un n’acquitte pas l’autre', () => {
    const signalement = carte({ type: 'signalement_trust', cle: 'signalement_trust:s1' });
    const { visibles, lues } = partagerParLecture([signalement], [lecture()], MIDI);
    expect(visibles.map(c => c.type)).toEqual(['signalement_trust']);
    expect(lues).toHaveLength(0);
  });

  it('une lecture ANNULÉE rend la carte à la liste', () => {
    const annulee = [
      lecture({ lueLe: new Date('2026-09-12T09:00:00.000Z') }),
      lecture({ lue: false, lueLe: new Date('2026-09-12T09:05:00.000Z') }),
    ];
    const { visibles, lues } = partagerParLecture([carte()], annulee, MIDI);
    expect(visibles).toHaveLength(1);
    expect(lues).toHaveLength(0);
  });

  it('l’ordre des cartes est préservé dans chaque liste', () => {
    const cartes = [
      carte({ cle: 'geste_objectif:a', date: '2026-09-11T10:00:00.000Z' }),
      carte({ cle: 'geste_objectif:b', date: '2026-09-11T11:00:00.000Z' }),
    ];
    expect(partagerParLecture(cartes, [lecture()], MIDI).lues.map(c => c.cle)).toEqual([
      'geste_objectif:a',
      'geste_objectif:b',
    ]);
  });
});

describe('les types qui s’acquittent par lecture — liste fermée et étroite', () => {
  it('le retour du patient sur son objectif s’acquitte en le lisant', () => {
    expect(sAcquitteParLecture('geste_objectif')).toBe(true);
  });

  it('CE QUI APPELLE UN GESTE AILLEURS ne s’acquitte PAS par lecture', () => {
    const exigeantUnGeste: TypeCarteFil[] = [
      'signalement_trust',
      'biologie_arbitree',
      'assignation_en_retard',
      'synthese_a_valider',
      'consultation_prevue',
      'jalon_j21',
      't0_a_confirmer',
      'synthese_a_generer',
      'reprise',
    ];
    for (const type of exigeantUnGeste) {
      expect(sAcquitteParLecture(type), `${type} ne doit pas s'acquitter par lecture`).toBe(false);
    }
  });

  it('la liste ne contient QUE le geste objectif — l’élargir est un arbitrage, pas une retouche', () => {
    expect([...TYPES_ACQUITTABLES_PAR_LECTURE]).toEqual(['geste_objectif']);
  });
});
