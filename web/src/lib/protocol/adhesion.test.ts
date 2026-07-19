import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { CheckinReponses, CheckinRow, PointEtape } from './checkinDomain';
import { deriverMeteoAdhesion } from './adhesion';

const reponses = (partiel: Partial<CheckinReponses> = {}): CheckinReponses => ({
  adhesion: 'plupart_des_jours',
  tolerance: 'bien',
  energie: 'stable',
  sommeil: 'stable',
  ...partiel,
});

const checkin = (
  id: string,
  pointEtape: PointEtape,
  soumisLe: string,
  partiel: Partial<CheckinReponses> = {},
  supersedesCheckinId: string | null = null,
): CheckinRow => ({
  id,
  idPatient: 'PAT_SEED_01',
  idAssignation: 'ASG_1',
  protocolDraftId: 'DRAFT_1',
  pointEtape,
  reponses: reponses(partiel),
  canal: 'portail',
  supersedesCheckinId,
  soumisLe,
});

describe('deriverMeteoAdhesion (SP-MET)', () => {
  it('aucun check-in → « indéterminée », jamais « interrompue » par défaut', () => {
    const meteo = deriverMeteoAdhesion([]);
    expect(meteo.etat).toBe('indeterminee');
    expect(meteo.pointsEtapeRenseignes).toBe(0);
    expect(meteo.faitsObserves).toEqual([]);
    expect(meteo.dateSource).toBeNull();
  });

  it('« La plupart des jours » → régulière, sourcée sur son point d’étape', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J7', '2026-01-08T10:00:00.000Z', { adhesion: 'plupart_des_jours' }),
    ]);
    expect(meteo.etat).toBe('reguliere');
    expect(meteo.pointEtapeSource).toBe('J7');
    expect(meteo.dateSource).toBe('2026-01-08T10:00:00.000Z');
    expect(meteo.faitsObserves).toContain('Action principale : « La plupart des jours »');
  });

  it('« Quelques jours » → fragile ; « Pas encore » → interrompue', () => {
    expect(
      deriverMeteoAdhesion([checkin('c1', 'J7', '2026-01-08T10:00:00.000Z', { adhesion: 'quelques_jours' })]).etat,
    ).toBe('fragile');
    expect(
      deriverMeteoAdhesion([checkin('c1', 'J7', '2026-01-08T10:00:00.000Z', { adhesion: 'pas_encore' })]).etat,
    ).toBe('interrompue');
  });

  it('« Tous les jours » → régulière (même état que « la plupart des jours »)', () => {
    expect(
      deriverMeteoAdhesion([checkin('c1', 'J7', '2026-01-08T10:00:00.000Z', { adhesion: 'tous_les_jours' })]).etat,
    ).toBe('reguliere');
  });

  it('c’est le check-in le plus récent qui fait foi', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J7', '2026-01-08T10:00:00.000Z', { adhesion: 'tous_les_jours' }),
      checkin('c2', 'J14', '2026-01-15T10:00:00.000Z', { adhesion: 'pas_encore' }),
    ]);
    expect(meteo.etat).toBe('interrompue');
    expect(meteo.pointEtapeSource).toBe('J14');
    expect(meteo.pointsEtapeRenseignes).toBe(2);
  });

  it('à date égale, le point d’étape le plus tardif l’emporte', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J7', '2026-01-15T10:00:00.000Z', { adhesion: 'tous_les_jours' }),
      checkin('c2', 'J21', '2026-01-15T10:00:00.000Z', { adhesion: 'quelques_jours' }),
    ]);
    expect(meteo.pointEtapeSource).toBe('J21');
    expect(meteo.etat).toBe('fragile');
  });

  it('une correction du patient remplace sa réponse, elle ne s’y ajoute pas', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J7', '2026-01-08T10:00:00.000Z', { adhesion: 'pas_encore' }),
      checkin('c2', 'J7', '2026-01-09T10:00:00.000Z', { adhesion: 'tous_les_jours' }, 'c1'),
    ]);
    expect(meteo.etat).toBe('reguliere');
    expect(meteo.pointsEtapeRenseignes).toBe(1);
  });

  it('la tolérance est rapportée telle quelle quand elle n’est pas « Bien », sans changer l’état', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J14', '2026-01-15T10:00:00.000Z', {
        adhesion: 'plupart_des_jours',
        tolerance: 'difficilement',
      }),
    ]);
    // L'état reste régulier : la tolérance éclaire, elle ne pondère pas.
    expect(meteo.etat).toBe('reguliere');
    expect(meteo.faitsObserves).toContain('Tolérance rapportée : « Difficilement »');
  });

  it('tolérance « Bien » → aucun fait superflu', () => {
    const meteo = deriverMeteoAdhesion([
      checkin('c1', 'J14', '2026-01-15T10:00:00.000Z', { tolerance: 'bien' }),
    ]);
    expect(meteo.faitsObserves).toHaveLength(1);
  });

  it('valeur d’adhésion inconnue → abstention, jamais un état deviné', () => {
    const brut = checkin('c1', 'J7', '2026-01-08T10:00:00.000Z');
    const meteo = deriverMeteoAdhesion([
      { ...brut, reponses: { ...brut.reponses, adhesion: 'valeur_futur_contrat' } },
    ]);
    expect(meteo.etat).toBe('indeterminee');
    expect(meteo.pointsEtapeRenseignes).toBe(1);
  });
});

// Garde-fou structurel (A8-4, A7-6) : la météo d'adhésion est PRATICIEN SEUL.
// Ce test échoue si un import apparaît un jour dans une surface patient.
describe('frontière patient : la météo d’adhésion ne fuit jamais côté patient', () => {
  const RACINE = join(__dirname, '..', '..');
  const SURFACES_PATIENT = [
    join(RACINE, 'app', 'api', 'patient'),
    join(RACINE, 'app', 'api', 'portail'),
    join(RACINE, 'app', 'patient'),
    join(RACINE, 'app', 'portail'),
    join(RACINE, 'components', 'patient'),
    join(RACINE, 'components', 'patient-companion'),
  ];

  const fichiers = (dossier: string): string[] => {
    let entrees: string[];
    try {
      entrees = readdirSync(dossier);
    } catch {
      return []; // dossier absent : rien à vérifier
    }
    return entrees.flatMap((entree) => {
      const chemin = join(dossier, entree);
      if (statSync(chemin).isDirectory()) return fichiers(chemin);
      return /\.tsx?$/.test(entree) ? [chemin] : [];
    });
  };

  it('aucune surface patient n’importe le module d’adhésion ni le panneau météo', () => {
    const coupables = SURFACES_PATIENT.flatMap(fichiers).filter((chemin) => {
      const source = readFileSync(chemin, 'utf8');
      return /from\s+['"][^'"]*protocol\/adhesion['"]/.test(source) || /MeteoAdhesionPanel/.test(source);
    });
    expect(coupables).toEqual([]);
  });
});
