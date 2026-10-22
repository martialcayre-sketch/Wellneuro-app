// @vitest-environment jsdom
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LIBELLE_MINEUR_EN_ATTENTE, PatientRow, type PatientRowData } from './PatientRow';

// D-342 §2 : le praticien est prévenu d'un mineur en attente de l'accord
// parental, sur la liste des patients — même règle que l'écran du portail :
// dossier en suivi, date qui dit moins de 18 ans.

const BASE: PatientRowData = {
  idPatient: 'PAT_SOPHIE',
  prenom: 'Sophie',
  nom: 'Nicola',
  email: 'sophie.nicola@example.test',
  telephone: '',
  actif: 'OUI',
  suiviClotureLe: null,
  accesRevoque: false,
};

function rendre(patient: PatientRowData) {
  render(
    <table>
      <tbody>
        <PatientRow patient={patient} onEdit={() => {}} onAction={() => {}} />
      </tbody>
    </table>,
  );
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-22T10:00:00Z'));
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('PatientRow — repère du mineur en attente (D-342 §2)', () => {
  it('un dossier en suivi né en 2010 porte le repère', () => {
    rendre({ ...BASE, dateNaissance: '2010-05-01' });
    expect(screen.getByText(LIBELLE_MINEUR_EN_ATTENTE)).toBeTruthy();
  });

  it('la veille des 18 ans, le repère tient ; le jour même, il tombe', () => {
    rendre({ ...BASE, dateNaissance: '2008-10-23' });
    expect(screen.getByText(LIBELLE_MINEUR_EN_ATTENTE)).toBeTruthy();
    cleanup();
    rendre({ ...BASE, dateNaissance: '2008-10-22' });
    expect(screen.queryByText(LIBELLE_MINEUR_EN_ATTENTE)).toBeNull();
  });

  it.each([
    ['majeur', { dateNaissance: '1985-03-12' }],
    ['date manquante', { dateNaissance: null }],
    ['date illisible', { dateNaissance: '2010-02-31' }],
    ['date non servie', {}],
    ['mineur au suivi clôturé', { dateNaissance: '2010-05-01', suiviClotureLe: '2026-09-01T00:00:00.000Z' }],
    ['mineur au dossier désactivé', { dateNaissance: '2010-05-01', actif: 'NON' as const }],
  ])('%s : aucun repère', (_cas, champs) => {
    rendre({ ...BASE, ...champs });
    expect(screen.queryByText(LIBELLE_MINEUR_EN_ATTENTE)).toBeNull();
  });

  it('la liste des patients passe la date servie par la route à la ligne', () => {
    const panneau = readFileSync(join(__dirname, '../dossier/RayonPatientsPanel.tsx'), 'utf8');
    expect(panneau).toMatch(/<PatientRow\s+key=\{p\.idPatient\}\s+patient=\{\{ \.\.\.p,/);
  });
});
