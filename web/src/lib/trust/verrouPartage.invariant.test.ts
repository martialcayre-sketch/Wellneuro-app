import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * L'INVARIANT CROISÉ DU VERROU, et il ne tient dans aucun des trois bancs de
 * route.
 *
 * Un verrou ne retient que les parties qui le prennent. Ici, elles sont TROIS :
 * l'écrivain du consentement au portail, et les deux écrivains du fil médecin.
 * Si l'une cessait de le prendre, les deux autres verrouilleraient le vide —
 * et leurs propres bancs resteraient verts, puisque chacun ne voit que sa route.
 *
 * C'est exactement ce qui s'est passé pendant la revue du 2026-09-17 : le verrou
 * a d'abord été posé du seul côté praticien, où il ne sérialisait rien.
 */
const ROUTES_QUI_DOIVENT_VERROUILLER = [
  'src/app/api/portail/trust/choix/route.ts',
  'src/app/api/praticien/biologie/proposition/courrier/route.ts',
  'src/app/api/praticien/correspondance-medecin/route.ts',
];

describe('le verrou de dossier est pris par TOUS les écrivains du périmètre', () => {
  it.each(ROUTES_QUI_DOIVENT_VERROUILLER)('★ %s prend le verrou de ligne', async (chemin) => {
    const source = await readFile(new URL(`../../../${chemin}`, import.meta.url), 'utf8');
    expect(source).toContain('FOR UPDATE');
    expect(source).toContain('$transaction');
  });

  it('★ les trois verrouillent la MÊME chose — `patients`, par `id_patient`', async () => {
    // Deux verrous sur deux objets différents ne se rencontrent jamais. Ce cas
    // ferme la variante silencieuse du défaut : chacun verrouille, personne ne
    // se croise.
    for (const chemin of ROUTES_QUI_DOIVENT_VERROUILLER) {
      const source = await readFile(new URL(`../../../${chemin}`, import.meta.url), 'utf8');
      expect(source, chemin).toMatch(/SELECT id FROM patients WHERE id_patient = \$\{[^}]+\} FOR UPDATE/);
    }
  });
});
