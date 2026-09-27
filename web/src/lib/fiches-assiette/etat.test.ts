import { describe, expect, it } from 'vitest';
import { dernierActe, derniereVersionValidee, etatDeLaVersion, jetonDernierActe, serialiserActe, type ActeLu } from './etat';

const SHA = 'a'.repeat(64);
const LE = new Date('2026-09-27T10:00:00.000Z');

function acte(ordre: bigint, over: Partial<ActeLu> = {}): ActeLu {
  return {
    ordre,
    acte: 'validee',
    contenuSha256: SHA,
    validateur: 'praticien@exemple.fr',
    relectureIntegrale: true,
    motif: null,
    le: LE,
    ...over,
  };
}

describe('etatDeLaVersion — l’état d’une version est son dernier acte (D-251, lot 6)', () => {
  it('sans acte : à valider', () => {
    expect(etatDeLaVersion({ contenuSha256: SHA }, [])).toEqual({ etat: 'a_valider' });
  });

  it('le dernier acte se lit par ORDRE, jamais par l’horodatage — deux actes ex æquo sur `le` sont départagés', () => {
    const retrait = acte(BigInt('8'), { acte: 'retiree', motif: 'Motif synthétique.', relectureIntegrale: false });
    const validation = acte(BigInt('7'));
    // Même `le` (même transaction), l’ordre fait foi, quel que soit le rang dans la liste.
    expect(etatDeLaVersion({ contenuSha256: SHA }, [retrait, validation]).etat).toBe('retiree');
    expect(etatDeLaVersion({ contenuSha256: SHA }, [validation, retrait]).etat).toBe('retiree');
    expect(dernierActe([validation, retrait])).toBe(retrait);
  });

  it('validée : ordre en chaîne exacte, horodatage ISO, validateur', () => {
    expect(etatDeLaVersion({ contenuSha256: SHA }, [acte(BigInt('9007199254740993'))])).toEqual({
      etat: 'validee',
      ordre: '9007199254740993',
      le: LE.toISOString(),
      validateur: 'praticien@exemple.fr',
    });
  });

  it('retirée : avec son motif', () => {
    const etat = etatDeLaVersion({ contenuSha256: SHA }, [acte(BigInt('3'), { acte: 'retiree', motif: 'Motif synthétique.' })]);
    expect(etat).toMatchObject({ etat: 'retiree', motif: 'Motif synthétique.' });
  });

  // DC-24 : ce qui ne se lit pas ne devient jamais « à valider ».
  it('un acte inconnu, une empreinte d’acte divergente, un retrait sans motif : ILLISIBLE, nommé comme tel', () => {
    expect(etatDeLaVersion({ contenuSha256: SHA }, [acte(BigInt('1'), { acte: 'publiee' })])).toEqual({ etat: 'illisible', raison: 'acte_inconnu' });
    expect(etatDeLaVersion({ contenuSha256: SHA }, [acte(BigInt('1'), { contenuSha256: 'b'.repeat(64) })])).toEqual({
      etat: 'illisible',
      raison: 'empreinte_acte_divergente',
    });
    expect(etatDeLaVersion({ contenuSha256: SHA }, [acte(BigInt('1'), { acte: 'retiree', motif: ' \t' })])).toEqual({
      etat: 'illisible',
      raison: 'retrait_sans_motif',
    });
  });

  it('le jeton du dernier acte est son ordre en chaîne, ou null', () => {
    expect(jetonDernierActe([])).toBeNull();
    expect(jetonDernierActe([acte(BigInt('2')), acte(BigInt('12')), acte(BigInt('5'))])).toBe('12');
  });

  it('un acte se sérialise sans BigInt ni Date — NextResponse.json refuserait un BigInt brut', () => {
    const s = serialiserActe(acte(BigInt('42')));
    expect(s.ordre).toBe('42');
    expect(s.le).toBe(LE.toISOString());
    expect(() => JSON.stringify(s)).not.toThrow();
  });
});

describe('derniereVersionValidee — la version servie', () => {
  const validee = { etat: 'validee', ordre: '1', le: LE.toISOString(), validateur: 'x' } as const;
  it('la plus récente AU SENS DU NUMÉRO parmi les validées', () => {
    const versions = [
      { numero: 3, etat: { etat: 'a_valider' } as const },
      { numero: 2, etat: validee },
      { numero: 1, etat: validee },
    ];
    expect(derniereVersionValidee(versions)?.numero).toBe(2);
    expect(derniereVersionValidee([{ numero: 1, etat: { etat: 'a_valider' } as const }])).toBeNull();
  });
});
