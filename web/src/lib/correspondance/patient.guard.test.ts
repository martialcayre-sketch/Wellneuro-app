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

// La relance de l'agenda écrit le registre par un `create` DIRECT, et c'est
// délibéré : `journaliserCorrespondancePatient` avale ses exceptions, ce qui
// rendrait décorative la contrainte `@@unique([sourceType, sourceId])` sur
// laquelle repose son idempotence. Elle doit donc alimenter le registre
// comme les autres, mais par l'autre porte.
const CHEMINS_PATIENT_ECRITURE_DIRECTE = ['app/api/praticien/agenda-sommeil/relance/route.ts'];

describe('registre transversal de correspondance patient', () => {
  it.each(CHEMINS_PATIENT)('%s journalise ses envois', (chemin) => {
    const source = readFileSync(join(RACINE, chemin), 'utf8');
    expect(source).toContain('sendMail(');
    expect(source).toContain('journaliserCorrespondancePatient');
  });

  it.each(CHEMINS_PATIENT_ECRITURE_DIRECTE)(
    '%s alimente le registre par écriture directe (idempotence)',
    (chemin) => {
      const source = readFileSync(join(RACINE, chemin), 'utf8');
      expect(source).toContain('sendMail(');
      expect(source).toContain('prisma.correspondancePatient.create');
      // Et la réservation précède l'envoi : sinon l'unicité ne bloque rien.
      expect(source.indexOf('correspondancePatient.create')).toBeLessThan(
        source.indexOf('sendMail('),
      );
    },
  );
});
