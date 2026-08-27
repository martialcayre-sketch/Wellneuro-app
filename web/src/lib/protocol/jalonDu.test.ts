import { describe, expect, it } from 'vitest';

import { proposeRuntimeEpisode } from '@/lib/clinical-engine/runtimeFromPrisma';
import { lireEtatPopulation } from '@/lib/consultation/etatPopulation';
import { resoudreJalonDu } from './jalonDu';
import type { Trajectoire } from './trajectoire';

// Ce que ce banc défend (`D-058`, LOT-07) : le cockpit ne propose un jalon que
// dans SA fenêtre, et dit pourquoi quand il n'en propose aucun. Confirmer un
// J21 trois semaines trop tôt daterait l'épisode d'un moment où la mesure n'a
// pas eu lieu — et le momentum comparerait ensuite deux points que rien ne
// sépare.

const T0 = '2026-01-01T00:00:00.000Z';
const JOUR = 24 * 60 * 60 * 1000;
const apresT0 = (jours: number) => new Date(Date.parse(T0) + jours * JOUR);

function trajectoire(confirmes: string[] = ['T0']): Trajectoire {
  return {
    index: confirmes.map(milestone => ({
      milestone: milestone as Trajectoire['index'][number]['milestone'],
      date: T0,
      cycleId: 'cycle-1',
    })),
    cycles: [{
      cycleId: 'cycle-1',
      ancre: 'T0',
      dateAncre: T0,
      versionScore: 'equilibre-v15',
      jalons: [],
      momentum: null,
      momentumParBesoin: [],
    }],
    discordanceOrdreCycles: false,
    comparaison: { disponible: false, raison: 'un_seul_cycle' },
  };
}

describe('resoudreJalonDu — ce que le cockpit a le droit de proposer', () => {
  it('propose T0 quand aucun cycle n’existe — comportement historique inchangé', () => {
    const verdict = resoudreJalonDu(null, apresT0(0));
    expect(verdict).toMatchObject({ statut: 'du', jalon: 'T0' });
    // Sans cycle confirmé, il n'y a PAS de fenêtre calculable : aucune borne
    // n'est fabriquée (une « fenêtre » de durée nulle serait affichable telle
    // quelle — revue LOT-07, mineur).
    expect(verdict).not.toHaveProperty('ouvertLe');
  });

  it('propose J21 au centre de sa fenêtre', () => {
    expect(resoudreJalonDu(trajectoire(), apresT0(21))).toMatchObject({ statut: 'du', jalon: 'J21' });
  });

  it('propose J21 aux deux bords de sa fenêtre, tolérance comprise', () => {
    expect(resoudreJalonDu(trajectoire(), apresT0(13))).toMatchObject({ statut: 'du', jalon: 'J21' });
    expect(resoudreJalonDu(trajectoire(), apresT0(29))).toMatchObject({ statut: 'du', jalon: 'J21' });
  });

  it('ne propose RIEN entre deux fenêtres, et dit laquelle vient', () => {
    // J+35 : la fenêtre du J21 est fermée (29), celle du J42 pas encore
    // ouverte (34)… non : 42 - 8 = 34, donc J+35 est DANS la fenêtre J42.
    // J+31 en revanche ne l'est pas.
    const verdict = resoudreJalonDu(trajectoire(), apresT0(31));
    expect(verdict).toMatchObject({ statut: 'aucun', prochainJalon: 'J42' });
    expect((verdict as { motif: string }).motif).toContain('s’ouvrira');
  });

  it('ne propose pas un jalon déjà confirmé — il passe au suivant si sa fenêtre est ouverte', () => {
    expect(resoudreJalonDu(trajectoire(['T0', 'J21']), apresT0(21)))
      .toMatchObject({ statut: 'aucun', prochainJalon: 'J42' });
  });

  it('dit quand tout est confirmé, plutôt que de se taire', () => {
    const verdict = resoudreJalonDu(trajectoire(['T0', 'J21', 'J42', 'J90']), apresT0(90));
    expect(verdict).toMatchObject({ statut: 'aucun' });
    expect((verdict as { motif: string }).motif).toContain('Tous les jalons');
  });

  it('dit quand les fenêtres restantes sont passées', () => {
    const verdict = resoudreJalonDu(trajectoire(), apresT0(200));
    expect(verdict).toMatchObject({ statut: 'aucun' });
    expect((verdict as { motif: string }).motif).toContain('passées');
  });

  it('compte un jalon HÉRITÉ (cycleId null) confirmé — sa fenêtre n’est pas re-proposée', () => {
    // Revue LOT-07 (Mo1) : une règle de rattachement propre à ce module
    // ignorait les lignes antérieures au gate G2, et un J21 déjà confirmé
    // voyait sa fenêtre rouverte. Le rattachement est désormais celui de la
    // Spirale (`rattacherReperesAuxCycles`, repli par date) — le même écran
    // ne peut plus dire deux choses.
    const herite = trajectoire();
    herite.index = [
      { milestone: 'T0', date: T0, cycleId: null },
      { milestone: 'J21', date: apresT0(21).toISOString(), cycleId: null },
    ];
    expect(resoudreJalonDu(herite, apresT0(21)))
      .toMatchObject({ statut: 'aucun', prochainJalon: 'J42' });
  });

  it('un T0 hérité (cycleId null) est compté confirmé : « tous confirmés » reste atteignable', () => {
    const herite = trajectoire();
    herite.index = (['T0', 'J21', 'J42', 'J90'] as const).map(milestone => ({
      milestone,
      date: T0,
      cycleId: null,
    }));
    const verdict = resoudreJalonDu(herite, apresT0(90));
    expect(verdict).toMatchObject({ statut: 'aucun' });
    expect((verdict as { motif: string }).motif).toContain('Tous les jalons');
  });

  it('ne rattache pas un épisode d’un AUTRE cycle', () => {
    // `cycleId` nullable sur les lignes héritées : on ne devine pas leur
    // rattachement, donc le J21 d'un autre cycle ne masque pas celui-ci.
    const autre = trajectoire();
    autre.index = [
      { milestone: 'T0', date: T0, cycleId: 'cycle-1' },
      { milestone: 'J21', date: T0, cycleId: 'cycle-autre' },
    ];
    expect(resoudreJalonDu(autre, apresT0(21))).toMatchObject({ statut: 'du', jalon: 'J21' });
  });

  it('refuse de proposer quoi que ce soit sur une date T0 illisible', () => {
    const casse = trajectoire();
    casse.cycles[0].dateAncre = 'pas-une-date';
    expect(resoudreJalonDu(casse, apresT0(21))).toMatchObject({ statut: 'aucun' });
  });
});

describe('contrat inter-couches — la fenêtre affichée est celle que le serveur construira', () => {
  // Le banc qui aurait fermé le B2 de la revue LOT-07 : première réponse le
  // 1er janvier, T0 confirmé le 20. Avant le correctif, `resoudreJalonDu`
  // fenêtrait le J21 sur le 20 janvier (confirmedAt) et le serveur sur le
  // 1er (première réponse) — fenêtres DISJOINTES dès que l'écart dépasse deux
  // tolérances, et l'épisode « J21 » était bâti sur les réponses du T0.
  it('même ancre (`confirmedAt` du T0 confirmé), mêmes bornes, à la milliseconde', () => {
    const confirmedAt = '2026-01-20T00:00:00.000Z';
    const traj = trajectoire();
    traj.index = [{ milestone: 'T0', date: confirmedAt, cycleId: 'cycle-1' }];
    traj.cycles[0].dateAncre = confirmedAt;

    const du = resoudreJalonDu(traj, new Date('2026-02-10T00:00:00.000Z'));
    expect(du).toMatchObject({ statut: 'du', jalon: 'J21' });
    if (du.statut !== 'du') throw new Error('inatteignable');

    const { proposal } = proposeRuntimeEpisode(
      {
        patient: { idPatient: 'PAT_TEST', createdAt: new Date('2025-12-01T00:00:00.000Z') },
        responses: [{
          responseId: 'R1',
          questionnaireId: 'Q_STR_02',
          observedAt: '2026-01-01T00:00:00.000Z',
          scoresJson: {},
          scoreVersion: null,
        }],
        patientContext: { mainReason: null, priorityGoal: null, expectations: [], constraints: [] },
        signauxAlerte: [],
        etatPopulation: lireEtatPopulation(null),
      },
      'J21',
      confirmedAt,
    );
    expect(proposal.window.start).toBe(du.ouvertLe);
    expect(proposal.window.end).toBe(du.fermeLe);
  });

  it('sans ancre fournie, le serveur garde son repli historique (première réponse)', () => {
    const { proposal } = proposeRuntimeEpisode(
      {
        patient: { idPatient: 'PAT_TEST', createdAt: new Date('2025-12-01T00:00:00.000Z') },
        responses: [{
          responseId: 'R1',
          questionnaireId: 'Q_STR_02',
          observedAt: '2026-01-01T00:00:00.000Z',
          scoresJson: {},
          scoreVersion: null,
        }],
        patientContext: { mainReason: null, priorityGoal: null, expectations: [], constraints: [] },
        signauxAlerte: [],
        etatPopulation: lireEtatPopulation(null),
      },
      'T0',
    );
    expect(proposal.targetAt).toBe('2026-01-01T00:00:00.000Z');
  });
});

// ---------------------------------------------------------------------------
// `D-113` — cycles nommés, et l'ouverture du suivant.
// ---------------------------------------------------------------------------

/** Une trajectoire à DEUX cycles : `T0` en janvier, `T1` deux mois plus tard. */
function deuxCycles(confirmes: string[] = ['T0', 'T1']): Trajectoire {
  const dateT1 = new Date(Date.parse(T0) + 60 * JOUR).toISOString();
  // `T0` documente le premier cycle ; l'ancre `T1` et tout jalon de mesure
  // documentent le second — le cycle courant.
  return {
    index: confirmes.map(milestone => ({
      milestone: milestone as Trajectoire['index'][number]['milestone'],
      date: milestone === 'T0' ? T0 : dateT1,
      cycleId: milestone === 'T0' ? 'cycle-1' : 'cycle-2',
    })),
    cycles: [
      {
        cycleId: 'cycle-1',
        ancre: 'T0',
        dateAncre: T0,
        versionScore: 'equilibre-v15',
        jalons: [],
        momentum: null,
        momentumParBesoin: [],
      },
      {
        cycleId: 'cycle-2',
        ancre: 'T1',
        dateAncre: dateT1,
        versionScore: 'equilibre-v15',
        jalons: [],
        momentum: null,
        momentumParBesoin: [],
      },
    ],
    discordanceOrdreCycles: false,
    comparaison: { disponible: true, raison: 'comparable' },
  };
}

describe('resoudreJalonDu — cycles nommés (`D-113`)', () => {
  it('les jalons du cycle courant se comptent depuis SON ancre, pas depuis le T0', () => {
    // `T1` posé à J+60. Son J21 s'ouvre donc à J+81, pas à J+21.
    expect(resoudreJalonDu(deuxCycles(), apresT0(60 + 21))).toMatchObject({
      statut: 'du',
      jalon: 'J21',
    });
    // À J+21, c'est le J21 du PREMIER cycle qui aurait été proposé avant la
    // décision : sa fenêtre est fermée par l'ouverture du second (§8).
    expect(resoudreJalonDu(deuxCycles(), apresT0(21))).toMatchObject({ statut: 'aucun' });
  });

  it('l’ancre du cycle courant n’est jamais re-proposée', () => {
    // La liste littérale `['T0', …]` tenait `T0` pour un jalon non confirmé de
    // ce cycle : sa fenêtre, centrée sur l'ancre, était ouverte le jour même.
    const verdict = resoudreJalonDu(deuxCycles(), apresT0(60));
    expect(verdict.statut === 'du' && verdict.jalon === 'T0').toBe(false);
  });

  it('OUVRIR UN CYCLE FERME LES FENÊTRES DU PRÉCÉDENT — règle énoncée, plus effet de bord (§8)', () => {
    // Un seul cycle, J+21 : le J21 est dû.
    expect(resoudreJalonDu(trajectoire(), apresT0(21))).toMatchObject({ statut: 'du', jalon: 'J21' });
    // Le même instant, une fois `T1` ouvert : plus rien du cycle 1 n'est
    // proposé. Ce qui a déjà été confirmé reste lisible ; c'est la PROPOSITION
    // qui s'arrête.
    expect(resoudreJalonDu(deuxCycles(), apresT0(21))).toMatchObject({ statut: 'aucun' });
  });

  it('nomme l’ancre qu’ouvrirait un nouveau cycle, même pendant qu’un jalon est dû', () => {
    const unSeulCycle = resoudreJalonDu(trajectoire(), apresT0(21));
    expect(unSeulCycle.statut).toBe('du');
    expect(unSeulCycle.ancreOuvrable).toBe('T1');

    const deux = resoudreJalonDu(deuxCycles(), apresT0(60 + 21));
    expect(deux.ancreOuvrable).toBe('T2');
  });

  it('sans aucun cycle, l’ouverture N’EST PAS un geste à part : c’est le jalon dû', () => {
    const verdict = resoudreJalonDu(null, apresT0(0));
    expect(verdict).toMatchObject({ statut: 'du', jalon: 'T0' });
    expect(verdict.ancreOuvrable).toBeNull();
  });

  it('tous les jalons du cycle courant confirmés : le motif le dit, l’ouverture reste offerte', () => {
    const verdict = resoudreJalonDu(deuxCycles(['T0', 'T1', 'J21', 'J42', 'J90']), apresT0(60 + 21));
    expect(verdict).toMatchObject({ statut: 'aucun', motif: 'Tous les jalons de ce cycle sont confirmés.' });
    expect(verdict.ancreOuvrable).toBe('T2');
  });

  it('une date d’ancre illisible NOMME l’ancre en cause', () => {
    const cassee = deuxCycles();
    cassee.cycles[1] = { ...cassee.cycles[1], dateAncre: 'pas-une-date' };
    const verdict = resoudreJalonDu(cassee, apresT0(60));
    expect(verdict.statut).toBe('aucun');
    expect(verdict.statut === 'aucun' && verdict.motif).toContain('T1');
  });
});
