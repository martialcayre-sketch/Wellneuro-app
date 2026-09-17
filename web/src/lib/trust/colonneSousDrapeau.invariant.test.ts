import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

/**
 * AUCUN APPEL NU À `trustChoiceEvent` EN PRODUCTION, tant que
 * `formulation_version` vit sous drapeau.
 *
 * LE DÉFAUT QUE CE BANC FERME, et il a failli partir en production. Le drapeau
 * `WN_TRACE_FORMULATION_CHOIX` garde ce qui ENTRE dans `data` — il ne garde pas
 * ce que Prisma REND. Un `create` ou un `findMany` sans `select` porte tous les
 * scalaires du modèle dans son `RETURNING`/`SELECT`, colonne comprise : entre le
 * merge et l'application de la migration, l'espace TRUST du patient tombait en
 * 42703 « column does not exist », À L'ÉCRITURE COMME À LA LECTURE, drapeau
 * éteint compris.
 *
 * Deux sites sur dix étaient nus, et c'étaient les deux routes PATIENT.
 * Constat d'une session pair en relecture, vérifié ligne à ligne.
 *
 * LA MUTATION QUI DOIT FAIRE ROUGIR CE BANC : retirer un `select`, ou ajouter un
 * appel nu ailleurs.
 */
const FICHIERS = [
  'src/app/api/portail/trust/choix/route.ts',
  'src/app/api/portail/trust/etat/route.ts',
  'src/app/api/praticien/biologie/proposition/route.ts',
  'src/app/api/praticien/biologie/proposition/courrier/route.ts',
  'src/app/api/praticien/correspondance-medecin/route.ts',
];

/** Le bloc d'appel, du nom du modèle jusqu'à sa parenthèse fermante approximative. */
function appels(source: string): string[] {
  const blocs: string[] = [];
  const motif = /trustChoiceEvent\.(findMany|findFirst|create|update)\(\{/g;
  let m: RegExpExecArray | null;
  while ((m = motif.exec(source)) !== null) {
    // Jusqu'à la fermeture de l'appel : `});` en début de ligne, quelle que
    // soit l'indentation. Une fenêtre de taille fixe se faisait piéger par les
    // commentaires longs — et ce dépôt en écrit.
    const reste = source.slice(m.index);
    // `});` OU `}),` : dans un `Promise.all([...])` l'appel se ferme par une
    // virgule. Ce banc est né vert sur cette seule omission — la mutation de
    // contrôle (retirer un `select`) ne le faisait pas rougir, parce que le bloc
    // avalait tout le fichier et y trouvait le `select` d'un autre appel.
    const fin = reste.search(/\n\s*\}\)[;,]/);
    blocs.push(fin === -1 ? reste : reste.slice(0, fin));
  }
  return blocs;
}

describe('la colonne sous drapeau ne fuit par aucun RETURNING', () => {
  it.each(FICHIERS)('★ %s : chaque appel à trustChoiceEvent porte un select', async (chemin) => {
    const source = await readFile(new URL(`../../../${chemin}`, import.meta.url), 'utf8');
    const blocs = appels(source);
    expect(blocs.length, `aucun appel trouvé dans ${chemin} — le banc s'est éteint`).toBeGreaterThan(0);
    for (const bloc of blocs) {
      expect(bloc, `appel sans select dans ${chemin} :\n${bloc.slice(0, 200)}`).toContain('select:');
    }
  });

  it('★ aucun select ne nomme formulationVersion — la colonne ne se lit pas encore', async () => {
    // Le drapeau garde l'ÉCRITURE. Rien ne doit la LIRE tant que la migration
    // n'est pas appliquée et constatée : une lecture casserait de la même façon.
    for (const chemin of FICHIERS) {
      const source = await readFile(new URL(`../../../${chemin}`, import.meta.url), 'utf8');
      for (const bloc of appels(source)) {
        expect(bloc, chemin).not.toContain('formulationVersion: true');
      }
    }
  });
});
