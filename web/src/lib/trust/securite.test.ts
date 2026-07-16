import { describe, expect, it } from 'vitest';
import { orienterEffetIndesirable, projeterChoixCourants, REGLE_ORIENTATION_EI } from './securite';

describe('règle d’orientation effet indésirable v1 (G-TRUST-05)', () => {
  it('mappe la sévérité déclarée vers une orientation fixe', () => {
    expect(orienterEffetIndesirable('severe').orientation).toBe('urgence_conseillee');
    expect(orienterEffetIndesirable('moderee').orientation).toBe('contact_medical_conseille');
    expect(orienterEffetIndesirable('legere').orientation).toBe('revue_praticien');
    expect(orienterEffetIndesirable('incertaine').orientation).toBe('revue_praticien');
  });

  it('trace la règle et sa version sur chaque orientation', () => {
    const resultat = orienterEffetIndesirable('severe');
    expect(resultat.regleId).toBe(REGLE_ORIENTATION_EI.id);
    expect(resultat.regleVersion).toBe('v1');
  });

  it('ne promet jamais de réponse rapide et cite les urgences quand il le faut', () => {
    expect(orienterEffetIndesirable('severe').messagePatient).toContain('15');
    expect(orienterEffetIndesirable('severe').messagePatient).toContain('112');
    for (const severite of ['severe', 'moderee', 'legere', 'incertaine'] as const) {
      const message = orienterEffetIndesirable(severite).messagePatient.toLowerCase();
      expect(message).not.toContain('immédiatement pris en charge');
      expect(message).not.toContain('réponse rapide');
      expect(message).not.toContain('sous 24');
    }
  });
});

describe('projection des choix append-only', () => {
  const evenement = (finalite: string, statut: string, enregistreLe: string) => ({
    finalite,
    statut,
    enregistreLe,
  });

  it('le dernier événement par finalité fait foi, sans écraser l’historique', () => {
    const historique = [
      evenement('partage_medecin_traitant', 'accorde', '2026-07-10T10:00:00Z'),
      evenement('partage_medecin_traitant', 'retire', '2026-07-14T09:00:00Z'),
      evenement('communications_non_essentielles', 'refuse', '2026-07-10T10:01:00Z'),
    ];
    const courants = projeterChoixCourants(historique);
    expect(courants.get('partage_medecin_traitant')?.statut).toBe('retire');
    expect(courants.get('communications_non_essentielles')?.statut).toBe('refuse');
    expect(historique).toHaveLength(3);
  });

  it('l’ordre d’arrivée du tableau ne change pas la projection (tri par date)', () => {
    const desordonne = [
      evenement('partage_medecin_traitant', 'retire', '2026-07-14T09:00:00Z'),
      evenement('partage_medecin_traitant', 'accorde', '2026-07-10T10:00:00Z'),
    ];
    expect(projeterChoixCourants(desordonne).get('partage_medecin_traitant')?.statut).toBe('retire');
  });
});
