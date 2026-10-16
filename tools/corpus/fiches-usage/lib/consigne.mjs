// LA CONSIGNE VERSIONNÉE « fiche-usage-v1 » ([[D-314]] §4) — patron de
// `tools/corpus/fiches/lib/consigne.mjs`.
//
// Deux fichiers, lus tels quels : la consigne de rédaction et celle de la
// contre-lecture. Leur empreinte entre dans `versionConsigne`, que chaque
// brouillon déposé porte en base : la relecture sait sous quelle consigne
// exacte un texte a été écrit.
//
// TOUTE MODIFICATION IMPOSE UN BUMP : `consigne.test.mjs` rougit dès qu'un
// octet change sans que `VERSION_CONSIGNE` et `EMPREINTE_ATTENDUE` changent
// avec lui, et l'outil refuse de tourner.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { empreinteConsignes } from '../../fiches/lib/consigne.mjs';

export const VERSION_CONSIGNE = 'fiche-usage-v1';
export const EMPREINTE_ATTENDUE = '9fdb36e79613519c';

const DOSSIER = path.join(import.meta.dirname, '..', 'consignes');

export function lireConsignes() {
  const redaction = readFileSync(path.join(DOSSIER, 'redaction.md'), 'utf8');
  const contreLecture = readFileSync(path.join(DOSSIER, 'contre-lecture.md'), 'utf8');
  return { redaction, contreLecture };
}

export { empreinteConsignes };

export function consignesVerifiees() {
  const consignes = lireConsignes();
  const empreinte = empreinteConsignes(consignes);
  if (empreinte !== EMPREINTE_ATTENDUE) {
    throw new Error(
      `Consignes modifiées (empreinte ${empreinte}, attendue ${EMPREINTE_ATTENDUE}) : ` +
        'augmenter VERSION_CONSIGNE et épingler la nouvelle empreinte dans lib/consigne.mjs.',
    );
  }
  return { ...consignes, versionConsigne: `${VERSION_CONSIGNE}+${empreinte}` };
}
