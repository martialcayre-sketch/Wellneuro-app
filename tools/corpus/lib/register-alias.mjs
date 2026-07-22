// Enregistre le hook d'alias `@/` avant tout import. À charger via
// `node --import ./tools/corpus/lib/register-alias.mjs …`.

import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

register('./alias-hooks.mjs', pathToFileURL(`${import.meta.dirname}/`));
