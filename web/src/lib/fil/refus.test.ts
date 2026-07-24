import { describe, expect, it } from 'vitest';
import type { CarteFil } from './cartes';
import { cleCarteValide, clesRefusees, filtrerCartesRefusees, refusCourant } from './refus';

const ligne = (
  id: string,
  carteCle: string,
  refusee: boolean,
  refuseLe: string,
  supersedesRejectionId: string | null = null,
) => ({ id, carteCle, refusee, refuseLe: new Date(refuseLe), supersedesRejectionId });

const CLE_A = 'assignation_en_retard:ASG_A';
const CLE_B = 'synthese_a_valider:SYN_B';

const carte = (cle: string): CarteFil => ({
  type: 'assignation_en_retard',
  idPatient: 'PAT_SEED_01',
  patient: 'Sophie Nicola',
  titre: 'Questionnaire en retard',
  pourquoi: 'Échéance dépassée',
  date: '2026-07-17T10:00:00.000Z',
  href: '/dashboard/patients/PAT_SEED_01',
  actionLabel: 'Ouvrir la fiche',
  cle,
});

describe('refus des cartes du Fil (G1)', () => {
  it('aucune ligne ⇒ aucune carte refusée : l’état d’avant le gate n’a rien à écrire', () => {
    expect(clesRefusees([])).toEqual(new Set());
    expect(refusCourant([], CLE_A)).toBeNull();
  });

  it('un refus persiste : la carte ne revient pas au chargement suivant', () => {
    const lignes = [ligne('r1', CLE_A, true, '2026-07-20T10:00:00.000Z')];
    expect(clesRefusees(lignes).has(CLE_A)).toBe(true);
    expect(filtrerCartesRefusees([carte(CLE_A), carte(CLE_B)], clesRefusees(lignes))).toEqual([carte(CLE_B)]);
  });

  it('l’annulation fait revenir la carte, sans rien effacer', () => {
    const lignes = [
      ligne('r1', CLE_A, true, '2026-07-20T10:00:00.000Z'),
      ligne('r2', CLE_A, false, '2026-07-20T10:05:00.000Z', 'r1'),
    ];
    expect(clesRefusees(lignes).has(CLE_A)).toBe(false);
    // La ligne de refus initiale est toujours là : annuler chaîne, n'efface pas.
    expect(lignes).toHaveLength(2);
    expect(refusCourant(lignes, CLE_A)?.id).toBe('r2');
  });

  it('un refus après annulation refuse de nouveau', () => {
    const lignes = [
      ligne('r1', CLE_A, true, '2026-07-20T10:00:00.000Z'),
      ligne('r2', CLE_A, false, '2026-07-20T10:05:00.000Z', 'r1'),
      ligne('r3', CLE_A, true, '2026-07-20T10:09:00.000Z', 'r2'),
    ];
    expect(clesRefusees(lignes).has(CLE_A)).toBe(true);
  });

  it('le refus d’une carte n’affecte pas les autres', () => {
    const lignes = [ligne('r1', CLE_A, true, '2026-07-20T10:00:00.000Z')];
    const restantes = filtrerCartesRefusees([carte(CLE_A), carte(CLE_B)], clesRefusees(lignes));
    expect(restantes.map(c => c.cle)).toEqual([CLE_B]);
  });

  it('deux chaînes de clés distinctes ne se contaminent pas', () => {
    const lignes = [
      ligne('r1', CLE_A, true, '2026-07-20T10:00:00.000Z'),
      ligne('r2', CLE_B, true, '2026-07-20T10:01:00.000Z'),
      ligne('r3', CLE_B, false, '2026-07-20T10:02:00.000Z', 'r2'),
    ];
    expect(clesRefusees(lignes)).toEqual(new Set([CLE_A]));
  });

  it('à instant égal, la tête de chaîne reste déterminée', () => {
    const lignes = [
      ligne('r1', CLE_A, true, '2026-07-20T10:00:00.000Z'),
      ligne('r2', CLE_A, false, '2026-07-20T10:00:00.000Z', 'r1'),
    ];
    expect(refusCourant(lignes, CLE_A)?.id).toBe('r2');
  });
});

describe('cleCarteValide', () => {
  it('accepte une clé portant le préfixe d’un type connu', () => {
    expect(cleCarteValide('assignation_en_retard:ASG_1')).toBe(true);
    expect(cleCarteValide('reprise:PAT_1:2026-01-01T00:00:00.000Z')).toBe(true);
    expect(cleCarteValide('signalement_trust:effet_indesirable:SIG_1')).toBe(true);
  });

  it('refuse une clé arbitraire, tronquée ou démesurée', () => {
    // Sans ce contrôle, la table se remplirait de clés inertes mais
    // indistinguables plus tard d'un refus réel.
    expect(cleCarteValide('n_importe_quoi:1')).toBe(false);
    expect(cleCarteValide('synthese_a_valider:')).toBe(false);
    expect(cleCarteValide('synthese_a_valider')).toBe(false);
    expect(cleCarteValide('')).toBe(false);
    expect(cleCarteValide(null)).toBe(false);
    expect(cleCarteValide(42)).toBe(false);
    expect(cleCarteValide(`synthese_a_valider:${'x'.repeat(300)}`)).toBe(false);
  });

  it('refuse le préfixe d’un type retiré : `reponse_recente` est désormais inerte', () => {
    // Le type a migré vers l'inbox (accueil-observatoire LOT-02). Un client qui
    // rejouerait une ancienne clé ne peut plus créer de refus.
    expect(cleCarteValide('reponse_recente:REP_1')).toBe(false);
  });
});
