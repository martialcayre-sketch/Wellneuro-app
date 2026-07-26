import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const RACINE = join(process.cwd(), 'src');

// Tous les chemins SMTP destinés au patient doivent alimenter le registre.
// `lib/trust/notification.ts` est volontairement absent : il écrit au
// praticien, pas au patient.
const CHEMINS_PATIENT = [
  'lib/consultation/email.ts',
  'app/api/patient/submit/route.ts',
  'app/api/praticien/assignations/route.ts',
  'app/api/praticien/booklet/route.ts',
  'app/api/praticien/file-envoi/envoyer/route.ts',
  'app/api/praticien/packs/assign/route.ts',
];

describe('registre transversal de correspondance patient', () => {
  it.each(CHEMINS_PATIENT)('%s journalise ses envois', (chemin) => {
    const source = readFileSync(join(RACINE, chemin), 'utf8');
    expect(source).toContain('sendMail(');
    expect(source).toContain('journaliserCorrespondancePatient');
  });
});
