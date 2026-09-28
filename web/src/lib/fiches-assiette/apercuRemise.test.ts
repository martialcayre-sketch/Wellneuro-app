import { describe, expect, it } from 'vitest';
import {
  assiettesDuProtocole,
  empreinteDeLApercu,
  fichesARemettre,
  planifierApercuFiches,
  type ActionPourApercu,
  type FaitsFiche,
} from './apercuRemise';

// L'aperçu des fiches qu'un clic « Valider pour diffusion » remettrait
// ([[D-251]] §7, lot 8). Données synthétiques : des codes et des identifiants,
// aucun texte de fiche.

const REF = {
  contractVersion: 'c5-recommended-plate-ref-v1',
  catalogVersion: 'cat',
  contentHash: 'h',
  refHash: 'r',
} as const;

function alimentation(actionId: string, plateCode: string | null, statut: ActionPourApercu['interventionStatus'] = 'active'): ActionPourApercu {
  return {
    actionId,
    type: 'food',
    interventionStatus: statut,
    ...(plateCode ? { recommendedPlateRef: { ...REF, plateCode } as ActionPourApercu['recommendedPlateRef'] } : {}),
  };
}

const FICHES: Record<string, string> = { ASSIETTE_A: 'WN-SRC-0001', ASSIETTE_B: 'WN-SRC-0002' };
const ficheDe = (plateCode: string) => FICHES[plateCode] ?? null;
const libelleDe = (plateCode: string) => `Libellé ${plateCode}`;

function faits(entrees: Record<string, FaitsFiche>): Map<string, FaitsFiche> {
  return new Map(Object.entries(entrees));
}

const V2 = { id: 'fav_2', numero: 2, contenuSha256: 'b'.repeat(64), nbAnomalies: 0 };

function planifier(actions: ActionPourApercu[], f: Map<string, FaitsFiche>, blocage: Parameters<typeof planifierApercuFiches>[0]['blocage'] = null) {
  return planifierApercuFiches({ actions, blocage, faits: f, ficheDe, libelleDe });
}

describe('assiettesDuProtocole', () => {
  it('une ligne par assiette, dans l’ordre des actions ; ni action non alimentaire, ni alimentation sans assiette', () => {
    const groupes = assiettesDuProtocole([
      { actionId: 'a0', type: 'hydration', interventionStatus: 'active' },
      alimentation('a1', 'ASSIETTE_B'),
      alimentation('a2', null),
      alimentation('a3', 'ASSIETTE_A'),
      alimentation('a4', 'ASSIETTE_B', 'differee'),
    ]);
    expect(groupes.map(g => [g.plateCode, g.actions.map(a => a.actionId)])).toEqual([
      ['ASSIETTE_B', ['a1', 'a4']],
      ['ASSIETTE_A', ['a3']],
    ]);
  });
});

describe('planifierApercuFiches', () => {
  it('une fiche validée, jamais remise, part', () => {
    const { lignes } = planifier([alimentation('a1', 'ASSIETTE_A')], faits({ 'WN-SRC-0001': { reference: V2, enCours: null } }));
    expect(lignes).toEqual([
      expect.objectContaining({
        plateCode: 'ASSIETTE_A',
        sourceId: 'WN-SRC-0001',
        actionId: 'a1',
        statut: 'part',
        idVersion: 'fav_2',
        numero: 2,
        motif: null,
        detail: 'Partira : version 2.',
      }),
    ]);
  });

  it('la même version déjà en cours ne repart pas', () => {
    const { lignes } = planifier(
      [alimentation('a1', 'ASSIETTE_A')],
      faits({ 'WN-SRC-0001': { reference: V2, enCours: { idVersion: 'fav_2', numero: 2 } } }),
    );
    expect(lignes[0]).toMatchObject({ statut: 'deja_remise', idVersion: 'fav_2', motif: null });
  });

  it('une AUTRE version en cours : la référence part, et la phrase dit laquelle elle remplace', () => {
    // Le cas tranché le 2026-09-28 : v1 remise, v2 retirée, v1 redevenue la
    // référence — ou l'inverse, v2 validée après une v1 remise.
    const { lignes } = planifier(
      [alimentation('a1', 'ASSIETTE_A')],
      faits({ 'WN-SRC-0001': { reference: V2, enCours: { idVersion: 'fav_1', numero: 1 } } }),
    );
    expect(lignes[0]).toMatchObject({ statut: 'part', idVersion: 'fav_2' });
    expect(lignes[0].detail).toBe('Partira : version 2, qui remplace la version 1 remise.');
  });

  it('aucune version validée : ne part pas, et la phrase dit où la valider', () => {
    const { lignes } = planifier([alimentation('a1', 'ASSIETTE_A')], faits({ 'WN-SRC-0001': { reference: null, enCours: null } }));
    expect(lignes[0]).toMatchObject({ statut: 'ne_part_pas', motif: 'aucune_version_validee', idVersion: null });
    expect(lignes[0].detail).toContain('Fiches conseils');
  });

  it('un fait MANQUANT ne fait jamais partir une fiche', () => {
    const { lignes } = planifier([alimentation('a1', 'ASSIETTE_A')], faits({}));
    expect(lignes[0]).toMatchObject({ statut: 'ne_part_pas', motif: 'aucune_version_validee' });
  });

  it('une référence qui ne passe plus les contrôles ne part pas — et rien ne part à sa place', () => {
    const { lignes } = planifier(
      [alimentation('a1', 'ASSIETTE_A')],
      faits({ 'WN-SRC-0001': { reference: { ...V2, nbAnomalies: 1 }, enCours: { idVersion: 'fav_1', numero: 1 } } }),
    );
    expect(lignes[0]).toMatchObject({ statut: 'ne_part_pas', motif: 'controles_echoues', idVersion: 'fav_2', numero: 2 });
    expect(lignes[0].detail).toContain('aucune version plus ancienne ne part à sa place');
  });

  it('une action non ferme ne remet pas sa fiche ; une action ferme sur la même assiette, si', () => {
    const f = faits({ 'WN-SRC-0001': { reference: V2, enCours: null } });
    expect(planifier([alimentation('a1', 'ASSIETTE_A', 'conditionnelle_biologie')], f).lignes[0]).toMatchObject({
      statut: 'ne_part_pas',
      motif: 'action_non_ferme',
      actionId: 'a1',
    });
    const mixte = planifier(
      [alimentation('a1', 'ASSIETTE_A', 'differee'), alimentation('a2', 'ASSIETTE_A', 'active')],
      f,
    ).lignes;
    expect(mixte).toHaveLength(1);
    expect(mixte[0]).toMatchObject({ statut: 'part', actionId: 'a2' });
  });

  it('une assiette sans fiche appariée ne part pas, et le dit', () => {
    const { lignes } = planifier([alimentation('a1', 'ASSIETTE_Z')], faits({}));
    expect(lignes[0]).toMatchObject({ statut: 'ne_part_pas', motif: 'sans_fiche', sourceId: null });
  });

  it('sous un blocage, AUCUNE fiche ne part, même validée et jamais remise', () => {
    const apercu = planifier(
      [alimentation('a1', 'ASSIETTE_A'), alimentation('a2', 'ASSIETTE_B')],
      faits({ 'WN-SRC-0001': { reference: V2, enCours: null } }),
      { motif: 'dossier_non_suivi', detail: 'Le dossier n’est pas en suivi : aucune fiche ne part.' },
    );
    expect(apercu.blocage?.motif).toBe('dossier_non_suivi');
    expect(apercu.lignes.map(l => [l.statut, l.motif, l.idVersion])).toEqual([
      ['ne_part_pas', 'dossier_non_suivi', null],
      ['ne_part_pas', 'dossier_non_suivi', null],
    ]);
    expect(fichesARemettre(apercu)).toBe(false);
  });
});

describe('empreinteDeLApercu — ce que le jeton résume', () => {
  const f = faits({ 'WN-SRC-0001': { reference: V2, enCours: null } });
  const base = planifier([alimentation('a1', 'ASSIETTE_A')], f);

  it('une phrase qui change ne périme pas l’aperçu', () => {
    const reformule = { ...base, lignes: base.lignes.map(l => ({ ...l, detail: 'Autre phrase.', libelle: 'Autre' })) };
    expect(empreinteDeLApercu(reformule, 'H')).toEqual(empreinteDeLApercu(base, 'H'));
  });

  it('une version, un statut, un blocage ou une version de protocole qui changent le périment', () => {
    const autreVersion = planifier([alimentation('a1', 'ASSIETTE_A')], faits({ 'WN-SRC-0001': { reference: { ...V2, id: 'fav_3', numero: 3 }, enCours: null } }));
    const dejaRemise = planifier([alimentation('a1', 'ASSIETTE_A')], faits({ 'WN-SRC-0001': { reference: V2, enCours: { idVersion: 'fav_2', numero: 2 } } }));
    const bloque = planifier([alimentation('a1', 'ASSIETTE_A')], f, { motif: 'contrat_refuse', detail: 'x' });
    const reference = JSON.stringify(empreinteDeLApercu(base, 'H'));
    for (const autre of [
      empreinteDeLApercu(autreVersion, 'H'),
      empreinteDeLApercu(dejaRemise, 'H'),
      empreinteDeLApercu(bloque, 'H'),
      empreinteDeLApercu(base, 'AUTRE_VERSION_DU_PROTOCOLE'),
    ]) {
      expect(JSON.stringify(autre)).not.toBe(reference);
    }
  });
});

describe('fichesARemettre', () => {
  it('vrai dès qu’une fiche partirait ; faux sans aperçu', () => {
    const f = faits({ 'WN-SRC-0001': { reference: V2, enCours: null } });
    expect(fichesARemettre(planifier([alimentation('a1', 'ASSIETTE_A')], f))).toBe(true);
    expect(fichesARemettre(null)).toBe(false);
  });
});
