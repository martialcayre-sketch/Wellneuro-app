import { describe, expect, it } from 'vitest';
import { jalonsSansDecision, type CheckinJ21Row } from './jalonsJ21';

// Réponses de check-in lisibles minimales (le domaine ne lit que `adhesion`).
const reponses = (adhesion: string) => ({
  adhesion,
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'stable',
});

const ACTIFS = new Set(['P-SOPHIE', 'P-MICHEL']);

describe('jalonsSansDecision', () => {
  it('retient le patient avec check-in J21 mais sans épisode J21 consigné', () => {
    const checkins: CheckinJ21Row[] = [
      { id: 'CHK_1', idPatient: 'P-SOPHIE', reponses: reponses('tous_les_jours'), soumisLe: new Date('2026-07-14T08:00:00.000Z') },
    ];
    const jalons = jalonsSansDecision(checkins, new Set(), ACTIFS);
    expect(jalons).toHaveLength(1);
    expect(jalons[0].idCheckin).toBe('CHK_1');
    expect(jalons[0].idPatient).toBe('P-SOPHIE');
    // L'action principale observée est citée (factuelle, jamais un score).
    expect(jalons[0].adhesion).toBeTruthy();
  });

  it('écarte le patient dont la décision J21 est déjà consignée', () => {
    const checkins: CheckinJ21Row[] = [
      { id: 'CHK_1', idPatient: 'P-SOPHIE', reponses: reponses('tous_les_jours'), soumisLe: new Date('2026-07-14T08:00:00.000Z') },
    ];
    const jalons = jalonsSansDecision(checkins, new Set(['P-SOPHIE']), ACTIFS);
    expect(jalons).toEqual([]);
  });

  it('ancre le refus sur le check-in J21 le plus récent (une correction fait revenir la carte)', () => {
    const checkins: CheckinJ21Row[] = [
      { id: 'CHK_ANCIEN', idPatient: 'P-MICHEL', reponses: reponses('quelques_jours'), soumisLe: new Date('2026-07-10T08:00:00.000Z') },
      { id: 'CHK_RECENT', idPatient: 'P-MICHEL', reponses: reponses('tous_les_jours'), soumisLe: new Date('2026-07-15T08:00:00.000Z') },
    ];
    const jalons = jalonsSansDecision(checkins, new Set(), ACTIFS);
    expect(jalons).toHaveLength(1);
    expect(jalons[0].idCheckin).toBe('CHK_RECENT');
  });

  it('un check-in illisible n’invente rien : l’adhésion reste absente, la carte demeure', () => {
    const checkins: CheckinJ21Row[] = [
      { id: 'CHK_1', idPatient: 'P-SOPHIE', reponses: { corrompu: true }, soumisLe: new Date('2026-07-14T08:00:00.000Z') },
    ];
    const jalons = jalonsSansDecision(checkins, new Set(), ACTIFS);
    expect(jalons).toHaveLength(1);
    expect(jalons[0].adhesion).toBeNull();
  });

  it('ignore un patient hors de la patientèle active', () => {
    const checkins: CheckinJ21Row[] = [
      { id: 'CHK_1', idPatient: 'P-AUTRE', reponses: reponses('tous_les_jours'), soumisLe: new Date('2026-07-14T08:00:00.000Z') },
    ];
    expect(jalonsSansDecision(checkins, new Set(), ACTIFS)).toEqual([]);
  });
});
