// LA CONSIGNE VERSIONNÉE « fiche-assiette-v1 » ([[D-251]] §5, lot 5).
//
// Deux fichiers, lus tels quels : la consigne de rédaction et celle de la
// contre-lecture. Leur empreinte entre dans `versionConsigne`, que chaque
// brouillon déposé porte en base : la relecture du lot 6 sait ainsi sous
// quelle consigne exacte une fiche a été écrite.
//
// TOUTE MODIFICATION IMPOSE UN BUMP. L'empreinte attendue est épinglée ici, et
// `consigne.test.mjs` rougit dès qu'un octet des consignes change sans que
// `VERSION_CONSIGNE` et `EMPREINTE_ATTENDUE` changent avec lui. L'outil refuse
// aussi de tourner sur une consigne qui ne correspond pas à l'empreinte.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';

export const VERSION_CONSIGNE = 'fiche-assiette-v1';
export const EMPREINTE_ATTENDUE = 'd4d81bb3a8ae9fa5';

const DOSSIER = path.join(import.meta.dirname, '..', 'consignes');

export function lireConsignes() {
  const redaction = readFileSync(path.join(DOSSIER, 'redaction.md'), 'utf8');
  const contreLecture = readFileSync(path.join(DOSSIER, 'contre-lecture.md'), 'utf8');
  return { redaction, contreLecture };
}

/** Les 16 premiers caractères hexadécimaux du sha256 des deux consignes. */
export function empreinteConsignes({ redaction, contreLecture }) {
  return createHash('sha256').update(redaction, 'utf8').update('\n\0\n').update(contreLecture, 'utf8').digest('hex').slice(0, 16);
}

/**
 * Les consignes, et la version que porte un brouillon écrit sous elles — ou une
 * erreur si les fichiers ont changé sans que la version change.
 */
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
