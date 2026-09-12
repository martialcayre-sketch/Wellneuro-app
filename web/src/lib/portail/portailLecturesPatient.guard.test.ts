import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

/*
 * GARDES DE DÉPÔT DE `portail_lectures_patient` (LOT-08).
 *
 * Ce fichier tient les deux promesses que le contrat SQL ne peut PAS tenir.
 * Une garde de dépôt se contourne — elle ne protège pas la base, elle protège
 * la relecture. Il faut la lire comme telle, et ne pas la citer comme une
 * impossibilité structurelle.
 */

const SRC = join(process.cwd(), 'src');

function fichiersSource(racine: string): string[] {
  const trouves: string[] = [];
  const parcourir = (chemin: string) => {
    for (const entree of readdirSync(chemin)) {
      const complet = join(chemin, entree);
      if (statSync(complet).isDirectory()) {
        // `src/generated` est le client Prisma : il nomme forcément tous les
        // modèles, et l'y chercher rendrait toute garde muette.
        if (entree === 'generated' || entree === 'node_modules') continue;
        parcourir(complet);
        continue;
      }
      if (/\.tsx?$/.test(entree)) trouves.push(complet);
    }
  };
  parcourir(racine);
  return trouves;
}

describe('la table des lectures n’alimente que l’écran du PATIENT', () => {
  /*
   * Pourquoi cette garde. `portail_lectures_patient` répond à « ce patient
   * a-t-il ouvert ce document ». Lue depuis une surface praticien, elle
   * deviendrait un indicateur d'assiduité — « il n'a pas ouvert son bilan » —,
   * c'est-à-dire un constat sur la personne (`DC-19`/`DC-20`). La migration
   * l'écrit, mais le SQL ne peut rien contre un SELECT : c'est ici que ça tient.
   *
   * ELLE PASSE AUJOURD'HUI SANS RIEN MORDRE, et c'est délibéré : elle est posée
   * AVANT le code qui consommera la table, pour qu'une première lecture
   * praticien ne puisse pas arriver inaperçue.
   */
  const INTERDITS = [
    join(SRC, 'app', 'api', 'praticien'),
    join(SRC, 'components', 'patient-cockpit'),
  ];

  it.each(INTERDITS)('aucune référence sous %s', racine => {
    const coupables = fichiersSource(racine).filter(f => {
      const code = readFileSync(f, 'utf8');
      return code.includes('portailLecturePatient') || code.includes('portail_lectures_patient');
    });
    expect(coupables.map(f => f.replace(`${SRC}/`, ''))).toEqual([]);
  });
});

describe('la prémisse de la migration : l’identifiant EST la version', () => {
  /*
   * `portail_lectures_patient` N'A PAS DE COLONNE DE VERSION, et c'est justifié
   * par un fait vérifié le 2026-09-12 : une synthèse et un envoi de bilan sont
   * APPEND-ONLY. Une republication est une LIGNE NEUVE, donc un autre
   * `id_objet`, donc une lecture ancienne qui ne l'acquitte pas et une tâche
   * qui reparaît au fil du jour.
   *
   * LE JOUR OÙ CETTE PRÉMISSE TOMBE, LA TABLE MENT EN SILENCE : un `publiee_le`
   * réécrit sur la même ligne ferait disparaître la lecture d'un texte que le
   * patient n'a jamais lu. Aucun test de la table ne peut voir ça — le défaut
   * est dans l'AUTRE modèle. D'où cette garde-ci.
   *
   * `syntheseComprehension` est déjà gardé par
   * `lib/objectif/matiereComprehension.guard.test.ts`, pour ses propres
   * raisons. Il est re-gardé ICI parce que le motif diffère : si cette
   * garde-là était un jour relâchée pour un motif de compréhension, la prémisse
   * de CETTE migration tomberait sans que personne ne fasse le lien.
   */
  const APPEND_ONLY = ['syntheseComprehension', 'bookletEnvoi'];
  const ECRITURES_EN_PLACE = ['update', 'updateMany', 'upsert', 'updateManyAndReturn'];

  it.each(APPEND_ONLY)('%s ne connaît aucune écriture EN PLACE', modele => {
    const coupables: string[] = [];
    for (const fichier of fichiersSource(SRC)) {
      // Les bancs NOMMENT ces appels pour affirmer qu'ils n'ont pas lieu
      // (`expect(...).not.toHaveBeenCalled()`) : les inclure ferait rougir la
      // garde sur les tests qui la confirment.
      if (/\.test\.tsx?$/.test(fichier)) continue;
      const code = readFileSync(fichier, 'utf8');
      for (const verbe of ECRITURES_EN_PLACE) {
        if (code.includes(`${modele}.${verbe}(`)) {
          coupables.push(`${fichier.replace(`${SRC}/`, '')} → ${modele}.${verbe}`);
        }
      }
    }
    expect(coupables).toEqual([]);
  });
});
