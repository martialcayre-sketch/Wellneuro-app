// COMPOSANTS LIVRÉS HORS DU GRAPHE DES MODULES : leurs mentions de licence
// (lot `licences-hors-graphe`, file D). Données seules, lues par
// `licences-tierces.mjs` ; figé comme lui par son empreinte
// (`resolutionImports.guard.test.ts`).
//
// Textes recopiés à l'identique (blancs de fin de ligne retirés) des fichiers
// amont, lus le 2026-11-16 aux références nommées ci-dessous.

/**
 * LE FICHIER DE POLYFILLS DE NEXT (`static/chunks/polyfills-*.js`), copié tel
 * quel par `CopyFilePlugin` depuis `next/dist/build/polyfills/
 * polyfill-nomodule.js`. Clé : l'empreinte SHA-256 du fichier servi. Ses
 * composants sont énumérés depuis la source de `@next/polyfill-nomodule`
 * (`packages/next-polyfill-nomodule/src/index.js` et `package.json` au tag
 * v15.5.25 de vercel/next.js) : core-js (`core-js/features/…`), whatwg-fetch,
 * object-assign, compilés par microbundle. Le fichier compilé porte
 * `version:"3.38.1"` (core-js) et les marques de whatwg-fetch et
 * d'object-assign. Une autre empreinte rend le build rouge : on réénumère.
 */
export const POLYFILLS_NEXT = {
  '0973c1d64c88adc8e3c950410cb58b288f72118d5965b78049438deb8f2f9683': {
    next: '15.5.25',
    composants: [
      {
        nom: 'core-js',
        version: '3.38.1',
        licence: 'MIT',
        source: 'zloirock/core-js, LICENSE au tag v3.38.1',
        texte: `Copyright (c) 2014-2024 Denis Pushkarev

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.`,
      },
      {
        nom: 'object-assign',
        version: '4.1.1',
        licence: 'MIT',
        source: 'sindresorhus/object-assign, license au tag v4.1.1',
        texte: `The MIT License (MIT)

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.`,
      },
      {
        nom: 'whatwg-fetch',
        version: '3.0.0',
        licence: 'MIT',
        source: 'JakeChampion/fetch (ex-github/fetch), LICENSE au tag v3.0.0',
        texte: `Copyright (c) 2014-2016 GitHub, Inc.

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`,
      },
    ],
  },
};

/**
 * LES POLICES SERVIES PAR `next/font/google`, par nom de famille (l'import
 * `IBM_Plex_Mono` donne « IBM Plex Mono »). Mention de droits : en-tête du
 * fichier `OFL.txt` de la famille dans google/fonts (`ofl/<dossier>/`), lu
 * le 2026-11-16. Une police absente de cette table rend le build rouge.
 */
export const POLICES_OFL = {
  'IBM Plex Mono': {
    source: 'google/fonts, ofl/ibmplexmono/OFL.txt',
    droits: `Copyright © 2017 IBM Corp. with Reserved Font Name "Plex"`,
  },
  'Instrument Sans': {
    source: 'google/fonts, ofl/instrumentsans/OFL.txt',
    droits: `Copyright 2022 The Instrument Sans Project Authors (https://github.com/Instrument/instrument-sans)`,
  },
  'Lora': {
    source: 'google/fonts, ofl/lora/OFL.txt',
    droits: `Copyright 2011 The Lora Project Authors (https://github.com/cyrealtype/Lora-Cyrillic), with Reserved Font Name "Lora".`,
  },
  'Sora': {
    source: 'google/fonts, ofl/sora/OFL.txt',
    droits: `Copyright 2019 The Sora Project Authors (https://github.com/sora-xor/sora-font)`,
  },
};

/** Le texte de la SIL Open Font License 1.1, identique dans les quatre `OFL.txt`. */
export const TEXTE_OFL = `-----------------------------------------------------------
SIL OPEN FONT LICENSE Version 1.1 - 26 February 2007
-----------------------------------------------------------

PREAMBLE
The goals of the Open Font License (OFL) are to stimulate worldwide
development of collaborative font projects, to support the font creation
efforts of academic and linguistic communities, and to provide a free and
open framework in which fonts may be shared and improved in partnership
with others.

The OFL allows the licensed fonts to be used, studied, modified and
redistributed freely as long as they are not sold by themselves. The
fonts, including any derivative works, can be bundled, embedded,
redistributed and/or sold with any software provided that any reserved
names are not used by derivative works. The fonts and derivatives,
however, cannot be released under any other type of license. The
requirement for fonts to remain under this license does not apply
to any document created using the fonts or their derivatives.

DEFINITIONS
"Font Software" refers to the set of files released by the Copyright
Holder(s) under this license and clearly marked as such. This may
include source files, build scripts and documentation.

"Reserved Font Name" refers to any names specified as such after the
copyright statement(s).

"Original Version" refers to the collection of Font Software components as
distributed by the Copyright Holder(s).

"Modified Version" refers to any derivative made by adding to, deleting,
or substituting -- in part or in whole -- any of the components of the
Original Version, by changing formats or by porting the Font Software to a
new environment.

"Author" refers to any designer, engineer, programmer, technical
writer or other person who contributed to the Font Software.

PERMISSION & CONDITIONS
Permission is hereby granted, free of charge, to any person obtaining
a copy of the Font Software, to use, study, copy, merge, embed, modify,
redistribute, and sell modified and unmodified copies of the Font
Software, subject to the following conditions:

1) Neither the Font Software nor any of its individual components,
in Original or Modified Versions, may be sold by itself.

2) Original or Modified Versions of the Font Software may be bundled,
redistributed and/or sold with any software, provided that each copy
contains the above copyright notice and this license. These can be
included either as stand-alone text files, human-readable headers or
in the appropriate machine-readable metadata fields within text or
binary files as long as those fields can be easily viewed by the user.

3) No Modified Version of the Font Software may use the Reserved Font
Name(s) unless explicit written permission is granted by the corresponding
Copyright Holder. This restriction only applies to the primary font name as
presented to the users.

4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
Software shall not be used to promote, endorse or advertise any
Modified Version, except to acknowledge the contribution(s) of the
Copyright Holder(s) and the Author(s) or with their explicit written
permission.

5) The Font Software, modified or unmodified, in part or in whole,
must be distributed entirely under this license, and must not be
distributed under any other license. The requirement for fonts to
remain under this license does not apply to any document created
using the Font Software.

TERMINATION
This license becomes null and void if any of the above conditions are
not met.

DISCLAIMER
THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
OTHER DEALINGS IN THE FONT SOFTWARE.`;

/**
 * LES COPIES QUE NEXT VEND SANS LICENCE (`next/dist/compiled/<nom>/` : un
 * `package.json` sans `license` ni `version`, aucun fichier de licence),
 * replis client de `querystring` et de `constants` (`webpack-config.js` de
 * Next). Aucune n'est livrée au navigateur aujourd'hui ; un import client qui
 * en atteindrait une rougissait le build. Clé : le nom du paquet vendu. La
 * copie est reconnue par l'empreinte SHA-256 de son fichier `fichier`, au
 * contenu identique à celui du paquet amont nommé (comparé le 2026-11-27 aux
 * archives du registre npm : l'`encode.js` de querystring-es3 0.2.1 appelle
 * `map(obj[k], …)`, celui de 0.2.0 `obj[k].map(…)` ; le `constants.json` de
 * constants-browserify 1.0.0 est identique, celui de 0.0.1 non). Version,
 * licence et droits sont ceux de ce paquet amont. Une autre empreinte rend le
 * build rouge : on réidentifie la version amont.
 */
export const COPIES_NEXT_SANS_LICENCE = {
  'querystring-es3': {
    fichier: 'index.js',
    empreinte: 'ab87d36cb40ef82c4ea4eb2738fd207155a170032a1b6877820eca6b0c3cf0f2',
    version: '0.2.1',
    licence: 'MIT',
    auteur: 'Irakli Gozalishvili',
    source: 'querystring-es3@0.2.1 (registre npm) : License.md, et en-tête de decode.js et de encode.js',
    textes: [
      {
        nom: 'License.md',
        texte: `Copyright 2012 Irakli Gozalishvili. All rights reserved.
Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to
deal in the Software without restriction, including without limitation the
rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
IN THE SOFTWARE.`,
      },
      {
        nom: 'decode.js, encode.js (en-tête)',
        texte: `Copyright Joyent, Inc. and other Node contributors.

Permission is hereby granted, free of charge, to any person obtaining a
copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to permit
persons to whom the Software is furnished to do so, subject to the
following conditions:

The above copyright notice and this permission notice shall be included
in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
USE OR OTHER DEALINGS IN THE SOFTWARE.`,
      },
    ],
  },
  'constants-browserify': {
    fichier: 'constants.json',
    empreinte: '92fbd2596dc1cb9ff728c8df2ff2002413f205a7636c50dbbd7a814531304127',
    version: '1.0.0',
    licence: 'MIT',
    auteur: 'Julian Gruber',
    source: 'constants-browserify@1.0.0 (registre npm) : licence MIT déclarée, aucun fichier de licence',
    textes: [],
  },
};
