import { describe, expect, it } from 'vitest';
import { familleDuFil, filsDeLaVersion, revisionEnVigueur, sequenceIncomplete, type DecisionLue } from './fils';

// Les fils des décisions de parcours ([[D-343]] §3) : une révision, un fil
// par version ; choix et mise en œuvre, un fil par événement. Une séquence
// lacunaire se dit, rien n'est complété (DC-30).

const V = 'proto_fixture#abc';
let ordre = 0;
function ligne(partiel: Partial<DecisionLue> & Pick<DecisionLue, 'id'>): DecisionLue {
  ordre += 1;
  return {
    ordre: String(ordre),
    acte: 'pose',
    idVersion: V,
    idAction: null,
    nature: 'debut',
    issue: null,
    motif: null,
    note: null,
    evenementLe: null,
    evenementInconnu: true,
    source: 'rapporte_par_patient',
    idVersionSuivante: null,
    idLigneRemplacee: null,
    praticienEmail: 'praticien@example.test',
    acteLe: '2026-10-22T08:00:00.000Z',
    ...partiel,
  };
}

describe('décisions de parcours — fils', () => {
  it('un fil par événement ; une correction prolonge son fil ; une autre version est ailleurs', () => {
    const lignes = [
      ligne({ id: 'd1', nature: 'debut' }),
      ligne({ id: 'i1', nature: 'interruption', motif: 'contrainte_pratique' }),
      ligne({ id: 'i2', nature: 'arret', motif: 'contrainte_pratique', idLigneRemplacee: 'i1' }),
      ligne({ id: 'x1', idVersion: 'proto_autre#def' }),
    ];
    const fils = filsDeLaVersion(lignes, V);
    expect(fils.map(f => f.racine.id)).toEqual(['d1', 'i1']);
    expect(fils[1].tete?.id).toBe('i2');
    expect(fils[1].historique.map(l => l.id)).toEqual(['i1', 'i2']);
    expect(fils.map(familleDuFil)).toEqual(['mise_en_oeuvre', 'mise_en_oeuvre']);
  });

  it('la révision en vigueur est la tête de son fil ; retirée, il n’y en a plus', () => {
    const r1 = ligne({ id: 'r1', nature: 'revision', issue: 'maintenir', source: null, evenementInconnu: null });
    const r2 = ligne({
      id: 'r2', nature: 'revision', issue: 'ajuster', motif: 'nouvelle_donnee_au_dossier', source: null,
      evenementInconnu: null, idLigneRemplacee: 'r1',
    });
    expect(revisionEnVigueur(filsDeLaVersion([r1, r2], V))?.id).toBe('r2');
    const retrait = ligne({ id: 'r3', acte: 'retrait', nature: null, source: null, idLigneRemplacee: 'r2' });
    expect(revisionEnVigueur(filsDeLaVersion([r1, r2, retrait], V))).toBeNull();
    expect(revisionEnVigueur(filsDeLaVersion([ligne({ id: 'p1', nature: 'refus' })], V))).toBeNull();
  });

  it('une séquence lacunaire se dit, par portée ; une séquence complète, non', () => {
    const sansDebut = filsDeLaVersion([ligne({ id: 'a', nature: 'interruption', motif: 'autre', note: 'n' })], V);
    expect(sequenceIncomplete(sansDebut, null)).toBe(true);

    const repriseSeule = filsDeLaVersion([ligne({ id: 'b', nature: 'debut' }), ligne({ id: 'c', nature: 'reprise' })], V);
    expect(sequenceIncomplete(repriseSeule, null)).toBe(true);

    const complete = filsDeLaVersion([
      ligne({ id: 'd', nature: 'debut' }),
      ligne({ id: 'e', nature: 'interruption', motif: 'contrainte_pratique' }),
      ligne({ id: 'f', nature: 'reprise' }),
      ligne({ id: 'g', nature: 'arret', motif: 'choix_du_patient' }),
    ], V);
    expect(sequenceIncomplete(complete, null)).toBe(false);

    // La portée : un début sur le protocole entier ne complète pas une action.
    const parAction = filsDeLaVersion([
      ligne({ id: 'h', nature: 'debut' }),
      ligne({ id: 'i', nature: 'arret', motif: 'choix_du_patient', idAction: 'act_1' }),
    ], V);
    expect(sequenceIncomplete(parAction, null)).toBe(false);
    expect(sequenceIncomplete(parAction, 'act_1')).toBe(true);
  });

  it('un début retiré ne compte plus : la séquence redevient lacunaire', () => {
    const fils = filsDeLaVersion([
      ligne({ id: 'd', nature: 'debut' }),
      ligne({ id: 'e', nature: 'interruption', motif: 'contrainte_pratique' }),
      ligne({ id: 'r', acte: 'retrait', nature: null, source: null, idLigneRemplacee: 'd' }),
    ], V);
    expect(sequenceIncomplete(fils, null)).toBe(true);
  });
});
