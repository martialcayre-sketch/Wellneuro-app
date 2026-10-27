import { describe, expect, it } from 'vitest';
import { contientTermePrescriptif } from '@/lib/documents/vocabulaire';
import { GOUVERNANCE_TRUST } from '@/lib/trust/gouvernance';
import { INFORMATION_MEDECIN } from './informationMedecin';

// [[D-377]] §1 : la phrase validée mot pour mot le 2026-10-26, apostrophes
// typographiques comme le reste des lettres.
describe('INFORMATION_MEDECIN — la phrase de D-377', () => {
  it('rend exactement la phrase validée, adresse des droits comprise', () => {
    expect(INFORMATION_MEDECIN).toBe(
      'Vos coordonnées professionnelles m’ont été communiquées par notre patient commun. '
      + 'Je les conserve dans son dossier, le temps de son accompagnement, pour vous adresser ce type de courrier. '
      + 'Vous pouvez y accéder, les faire rectifier ou effacer, ou vous opposer à leur usage, en m’écrivant à '
      + 'martialcayre@wellneuro.fr.',
    );
  });

  it('l’adresse est celle des droits, lue et non recopiée (D-377 §2)', () => {
    expect(INFORMATION_MEDECIN.endsWith(`${GOUVERNANCE_TRUST.contactDroits}.`)).toBe(true);
  });

  it('ne porte aucun terme prescriptif : elle passe la garde du rendu médecin', () => {
    expect(contientTermePrescriptif(INFORMATION_MEDECIN)).toBe(false);
  });
});
