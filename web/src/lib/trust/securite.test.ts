import { describe, expect, it } from 'vitest';
import { orienterEffetIndesirable, projeterChoixCourants, REGLE_ORIENTATION_EI } from './securite';

describe('règle d’orientation effet indésirable v2 (G-TRUST-05, D-278 §1)', () => {
  it('mappe la sévérité déclarée vers une orientation fixe', () => {
    expect(orienterEffetIndesirable('severe').orientation).toBe('urgence_conseillee');
    expect(orienterEffetIndesirable('moderee').orientation).toBe('contact_medical_conseille');
    expect(orienterEffetIndesirable('legere').orientation).toBe('revue_praticien');
    expect(orienterEffetIndesirable('incertaine').orientation).toBe('urgence_ou_contact_conseille');
  });

  it('D-278 §1 : « incertaine » ne reçoit jamais le message le moins protecteur', () => {
    const incertaine = orienterEffetIndesirable('incertaine').messagePatient;
    expect(incertaine).not.toBe(orienterEffetIndesirable('legere').messagePatient);
    expect(incertaine).not.toContain('prochaine revue');
    expect(incertaine).toContain('15 (SAMU) ou le 112');
    expect(incertaine).toContain('parlez-en rapidement à votre médecin traitant ou à votre praticien');
    expect(incertaine).toContain('sans garantie de délai');
  });

  it('D-278 §1 : le texte signé de « incertaine » est servi mot pour mot', () => {
    expect(orienterEffetIndesirable('incertaine').messagePatient).toBe(
      'Votre signalement a bien été enregistré. Si vous ressentez en ce moment des symptômes graves ' +
        'ou inquiétants, contactez immédiatement le 15 (SAMU) ou le 112. Sinon, parlez-en rapidement à ' +
        'votre médecin traitant ou à votre praticien, et ne modifiez pas un traitement prescrit sans ' +
        'l’accord du prescripteur. Wellneuro n’est pas un service d’urgence : votre signalement sera ' +
        'examiné par votre praticien, sans garantie de délai.',
    );
  });

  it('trace la règle et sa version sur chaque orientation', () => {
    const resultat = orienterEffetIndesirable('severe');
    expect(resultat.regleId).toBe(REGLE_ORIENTATION_EI.id);
    expect(resultat.regleVersion).toBe('v2');
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
