import { describe, expect, it, vi } from 'vitest';

// Le chargeur importe Prisma par ses modules ; ces bancs n'en lisent rien.
vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import type { DecisionCard } from '@/lib/clinical-engine/types';
import type { JalonMomentum } from '@/lib/equilibre/types';
import type { Trajectoire } from '@/lib/protocol/trajectoire';
import {
  agregerComptesCabinet,
  electionDuJalon,
  etapeDuDossier,
  resumerAssignations,
  type LecteursDossier,
  type LectureCockpit,
  type LigneComptes,
} from './comptesCabinet';

const JOUR = 86_400_000;
const MAINTENANT = new Date('2026-10-29T12:00:00.000Z');
const ilYa = (jours: number) => new Date(MAINTENANT.getTime() - jours * JOUR).toISOString();

function carte(): DecisionCard {
  return {
    decisionCardId: 'runtime-decision-fixture', snapshotId: 's', snapshotInputHash: 'sh',
    reviewId: 'r', reviewInputHash: 'rh', createdAt: '2026-01-01T00:00:00.000Z',
    version: 'c1-decision-card-v1', status: 'draft',
    priorityCandidates: [{ candidateId: 'p1', origin: 'engine', label: 'Priorité', rank: 1, confidence: 'à_documenter', ruleId: 'R', rationale: 'Fixture.', provenance: { responseIds: [], needIds: [], clinicalObjectCodes: [] }, limitationsRegleSignee: [], limitationsPerimetreClassement: [], limitations: [] }],
    proposedMainPriorityId: 'p1', selectedMainPriority: { candidateId: 'p1', selectedAt: '2026-01-01T00:00:00.000Z', selectedBy: 'practitioner', rationale: 'Fixture.' },
    counterfactuals: [], missingDataFindingIds: [], discordanceFindingIds: [], safetyFindingIds: [],
    abstention: { status: 'not_required', ruleIds: ['R'], limitations: [] }, limitations: [], inputHash: 'hash',
  };
}

function cycle(ancre: string, dateAncre: string, jourZero: string | null, j21Mesure: boolean) {
  return {
    cycleId: `ep_${ancre}`,
    ancre,
    dateAncre,
    jourZero,
    versionScore: 'v1',
    jalons: [
      { jalon: ancre, mesure: true, valeur: 40, date: dateAncre },
      { jalon: 'J21', mesure: j21Mesure, valeur: j21Mesure ? 50 : null, date: j21Mesure ? ilYa(5) : null },
      { jalon: 'J42', mesure: false, valeur: null, date: null },
      { jalon: 'J90', mesure: false, valeur: null, date: null },
    ],
    momentum: null,
    momentumParBesoin: [],
  };
}

function trajectoire(cycles: ReturnType<typeof cycle>[]): Trajectoire {
  return {
    index: cycles.flatMap(c => c.jalons.filter(j => j.mesure && j.date).map(j => ({ milestone: j.jalon, date: j.date }))),
    cycles,
    comparaison: { disponible: false, raison: 'un_seul_cycle' },
    discordanceOrdreCycles: false,
  } as unknown as Trajectoire;
}

function lecteurs(
  cockpit: Partial<Record<JalonMomentum, LectureCockpit>>,
  autres: Partial<Omit<LecteursDossier, 'lireCockpit'>> = {},
) {
  const demandes: JalonMomentum[] = [];
  const l: LecteursDossier = {
    lireCockpit: async jalon => {
      demandes.push(jalon);
      const lue = cockpit[jalon];
      if (!lue) throw new Error(`jalon ${jalon} non prévu`);
      return lue;
    },
    diffusionApprouvee: async () => true,
    compterVersions: async () => 1,
    compterPointsRenseignes: async () => 1,
    ...autres,
  };
  return { lecteurs: l, demandes };
}

const PHASE3_FAITE = { objectifsActifs: 1, synthesePubliee: true, demandesCorrectionEnAttente: 0 };

describe('agregerComptesCabinet — « sous cinq » par tableau (D-298, D-385 §2 et §6)', () => {
  const lignes = (n: number, ligne: LigneComptes) => Array.from({ length: n }, () => ligne);

  it('trois dossiers : effectif affiché, les deux répartitions masquées, zéros compris', () => {
    const comptes = agregerComptesCabinet(lignes(3, { etape: 'decision', protocole: 'sans_protocole' }));
    for (const t of [comptes.prochaineEtape, comptes.protocole]) {
      expect(t.effectif).toBe(3);
      expect(t.repartitionMasquee).toBe(true);
      // Un zéro affiché à côté d'une ligne masquée dirait où sont les trois.
      expect(t.lignes.every(l => l.compte === 'masqué')).toBe(true);
    }
  });

  it('chaque tableau se masque pour lui-même : une ligne à 1-4 masque son tableau, pas l’autre', () => {
    const comptes = agregerComptesCabinet([
      ...lignes(8, { etape: 'decision', protocole: 'sans_protocole' }),
      ...lignes(2, { etape: 'actions', protocole: 'sans_protocole' }),
    ]);
    expect(comptes.prochaineEtape.effectif).toBe(10);
    expect(comptes.prochaineEtape.repartitionMasquee).toBe(true);
    expect(comptes.prochaineEtape.lignes.every(l => l.compte === 'masqué')).toBe(true);
    // Sinon la ligne « actions » se déduirait : 10 - 8.
    expect(comptes.protocole.repartitionMasquee).toBe(false);
    expect(comptes.protocole.lignes).toEqual([
      { cle: 'sans_protocole', compte: 10 },
      { cle: 'cycle_en_cours', compte: 0 },
      { cle: 'fin_de_cycle', compte: 0 },
      { cle: 'indetermine', compte: 0 },
    ]);
  });

  it('cinq et plus partout : la répartition s’affiche, zéros compris, dans l’ordre du rail', () => {
    const comptes = agregerComptesCabinet([
      ...lignes(5, { etape: 'patient', protocole: 'cycle_en_cours' }),
      ...lignes(6, { etape: 'rien_n_attend', protocole: 'fin_de_cycle' }),
    ]);
    expect(comptes.prochaineEtape.repartitionMasquee).toBe(false);
    expect(comptes.prochaineEtape.lignes.map(l => l.cle)).toEqual([
      'patient', 'donnees', 'comprehension', 'decision', 'actions', 'suivi', 'reevaluation', 'rien_n_attend', 'indetermine',
    ]);
    expect(comptes.prochaineEtape.lignes[0].compte).toBe(5);
    expect(comptes.prochaineEtape.lignes[1].compte).toBe(0);
    expect(comptes.prochaineEtape.lignes[7].compte).toBe(6);
    expect(comptes.protocole.lignes.map(l => l.compte)).toEqual([0, 5, 6, 0]);
  });

  it('« indéterminé » compte comme une ligne : sous cinq, il masque aussi', () => {
    const comptes = agregerComptesCabinet([
      ...lignes(9, { etape: 'decision', protocole: 'sans_protocole' }),
      { etape: 'indetermine', protocole: 'sans_protocole' },
    ]);
    expect(comptes.prochaineEtape.repartitionMasquee).toBe(true);
  });

  it('le seuil est un paramètre ; un cabinet vide ne masque rien', () => {
    expect(agregerComptesCabinet(lignes(3, { etape: 'decision', protocole: 'sans_protocole' }), 3).prochaineEtape.repartitionMasquee).toBe(false);
    const vide = agregerComptesCabinet([]);
    expect(vide.prochaineEtape.effectif).toBe(0);
    expect(vide.prochaineEtape.repartitionMasquee).toBe(false);
  });

  it('l’agrégat ne porte aucun identifiant de dossier', () => {
    const json = JSON.stringify(agregerComptesCabinet(lignes(6, { etape: 'suivi', protocole: 'cycle_en_cours' })));
    expect(json).not.toMatch(/idPatient|PAT_/);
  });
});

describe('resumerAssignations — comme la fiche', () => {
  it('envois = rendus + en attente, annulés exclus ; corrections = modification demandée', () => {
    expect(
      resumerAssignations([
        { statut: 'Complété', statutReponses: 'verrouille' },
        { statut: 'En attente', statutReponses: 'non_rempli' },
        { statut: 'Annulée', statutReponses: 'non_rempli' },
        { statut: 'Complété', statutReponses: 'modification_demandee' },
      ]),
    ).toEqual({ correctionsEnAttente: 1, envoisAssignes: 3 });
  });
});

describe('electionDuJalon — l’élection de la fiche', () => {
  it('sans cycle, le T0 seul', async () => {
    const { lecteurs: l, demandes } = lecteurs({ T0: { statut: 'proposal_required', preconditions: undefined } });
    await electionDuJalon(trajectoire([]), l, MAINTENANT);
    expect(demandes).toEqual(['T0']);
  });

  it('J21 dû sur un cycle T1 : la carte d’ancre T1 d’abord, puis le J21 si sa diffusion est approuvée', async () => {
    const { lecteurs: l, demandes } = lecteurs({
      T0: { statut: 'ready', carte: carte() },
      T1: { statut: 'ready', carte: carte() },
      J21: { statut: 'proposal_required', preconditions: undefined },
    });
    const traj = trajectoire([cycle('T0', ilYa(120), ilYa(118), true), cycle('T1', ilYa(25), ilYa(21), false)]);
    const lue = await electionDuJalon(traj, l, MAINTENANT);
    expect(demandes).toEqual(['T0', 'T1', 'J21']);
    expect(lue.statut).toBe('proposal_required');
  });

  it('diffusion non approuvée : le suivi est retenu sur la carte d’ancre', async () => {
    const { lecteurs: l, demandes } = lecteurs(
      { T0: { statut: 'ready', carte: carte() } },
      { diffusionApprouvee: async () => false },
    );
    const lue = await electionDuJalon(trajectoire([cycle('T0', ilYa(25), ilYa(21), false)]), l, MAINTENANT);
    expect(demandes).toEqual(['T0']);
    expect(lue.statut).toBe('ready');
  });

  it('carte d’ancre non rejouée : rien ne retient le suivi, la fiche avance au J21', async () => {
    const diffusion = vi.fn(async () => false);
    const { lecteurs: l, demandes } = lecteurs(
      {
        T0: { statut: 'proposal_required', preconditions: undefined },
        J21: { statut: 'proposal_required', preconditions: undefined },
      },
      { diffusionApprouvee: diffusion },
    );
    await electionDuJalon(trajectoire([cycle('T0', ilYa(25), ilYa(21), false)]), l, MAINTENANT);
    expect(demandes).toEqual(['T0', 'J21']);
    expect(diffusion).not.toHaveBeenCalled();
  });

  it('le temps vient du paramètre : la même trajectoire, lue trente jours plus tôt, ne rend aucun J21 dû', async () => {
    const { lecteurs: l, demandes } = lecteurs({ T0: { statut: 'ready', carte: carte() } });
    await electionDuJalon(
      trajectoire([cycle('T0', ilYa(25), ilYa(21), false)]),
      l,
      new Date(MAINTENANT.getTime() - 30 * JOUR),
    );
    expect(demandes).toEqual(['T0']);
  });
});

describe('etapeDuDossier — rien n’attend, ou indéterminé', () => {
  const groupees = (traj: Trajectoire, envoisAssignes = 4) => ({
    trajectoire: traj,
    correctionsEnAttente: 0,
    envoisAssignes,
    phase3: PHASE3_FAITE,
  });

  it('toutes les phases renseignées : « rien n’attend »', async () => {
    const { lecteurs: l } = lecteurs({ T0: { statut: 'ready', carte: carte() } });
    // J21 mesuré et sa fenêtre passée, J42 pas encore ouvert : aucun jalon dû.
    const traj = trajectoire([cycle('T0', ilYa(34), ilYa(32), true)]);
    expect(await etapeDuDossier(groupees(traj), l, MAINTENANT)).toBe('rien_n_attend');
  });

  it('aucune phase due mais des statuts inconnus : « indéterminé », jamais « rien n’attend » (DC-24)', async () => {
    // Le J21 du cycle T1 est servi en proposition : sans carte, décision,
    // actions et suivi sont inconnus ; la réévaluation est faite (J21 du T0).
    const { lecteurs: l } = lecteurs({
      T0: { statut: 'ready', carte: carte() },
      T1: { statut: 'ready', carte: carte() },
      J21: { statut: 'proposal_required', preconditions: undefined },
    });
    const traj = trajectoire([cycle('T0', ilYa(120), ilYa(118), true), cycle('T1', ilYa(25), ilYa(21), false)]);
    expect(await etapeDuDossier(groupees(traj), l, MAINTENANT)).toBe('indetermine');
  });

  it('une phase due se compte sous elle, même si un autre statut reste inconnu', async () => {
    const { lecteurs: l } = lecteurs({
      T0: { statut: 'ready', carte: carte() },
      T1: { statut: 'ready', carte: carte() },
      J21: { statut: 'proposal_required', preconditions: undefined },
    });
    const traj = trajectoire([cycle('T0', ilYa(120), ilYa(118), true), cycle('T1', ilYa(25), ilYa(21), false)]);
    const etape = await etapeDuDossier(
      { ...groupees(traj), phase3: { ...PHASE3_FAITE, synthesePubliee: false } },
      l,
      MAINTENANT,
    );
    expect(etape).toBe('comprehension');
  });

  it('ÉCART ACCEPTÉ (2026-10-27) : au-delà de 40 envois, la page ne tronque pas', async () => {
    // La fiche lit 40 envois au plus et rendrait « Données fiables »
    // indéterminée ; la page lit la liste entière et range le dossier.
    const { lecteurs: l } = lecteurs({ T0: { statut: 'ready', carte: carte() } });
    const traj = trajectoire([cycle('T0', ilYa(34), ilYa(32), true)]);
    expect(await etapeDuDossier(groupees(traj, 45), l, MAINTENANT)).toBe('rien_n_attend');
  });

  it('versions et check-ins ne se lisent que pour une carte servie', async () => {
    const versions = vi.fn(async () => 0);
    const points = vi.fn(async () => 0);
    const { lecteurs: l } = lecteurs(
      { T0: { statut: 'proposal_required', preconditions: undefined } },
      { compterVersions: versions, compterPointsRenseignes: points },
    );
    await etapeDuDossier(groupees(trajectoire([])), l, MAINTENANT);
    expect(versions).not.toHaveBeenCalled();
    expect(points).not.toHaveBeenCalled();
  });
});
