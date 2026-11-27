### Mentions tierces : code vendu sous `vendor/` et copies de Next sans licence (2026-11-27)

Deux restes P2 de la revue du lot `licences-tierces-bundle` reçoivent un sort
explicite dans `PluginLicencesTierces` (`web/scripts/licences-tierces.mjs`) :

- **Code vendu sous `vendor/`, `lib-vendor/` ou `vendored/`** d'un paquet hôte
  (forme de `victory-vendor/lib-vendor/d3-scale/`) : il est attribué au dossier
  d'origine qui porte son fichier de licence, et listé « `<nom>` (vendu par
  `<hôte>@<version>`) » avec ce texte, au lieu de se fondre dans l'hôte. Sans
  fichier de licence dans ce dossier, ou posé à même `vendor/` (forme de
  `@sentry/core/build/esm/vendor/`), le build rougit en nommant les fichiers.
  Constat du 2026-11-27 : aucun de ces fichiers ne part aujourd'hui au
  navigateur (d3 y arrive par ses propres paquets) ; le build réel reste vert.
- **`querystring-es3` et `constants-browserify`**, vendus par Next sous
  `next/dist/compiled/` sans licence ni version : nouvelle table
  `COPIES_NEXT_SANS_LICENCE` (`web/scripts/licences-hors-graphe.mjs`). Chaque
  copie y est reconnue par l'empreinte SHA-256 de son fichier, identique au
  paquet amont du registre npm (querystring-es3 0.2.1, constants-browserify
  1.0.0), dont elle reçoit la version, la licence MIT et les droits
  (License.md et en-tête Joyent de querystring-es3 ; texte type MIT et
  auteur pour constants-browserify, qui ne fournit aucun fichier). Une autre
  empreinte rougit le build : on réidentifie la version amont. Ni l'une ni
  l'autre n'est livrée aujourd'hui.

Banc `web/src/lib/licencesTierces.test.ts` : quatre compilations (attribution
sous `lib-vendor/`, refus sous `vendor/`, copie reconnue, copie altérée),
`dossierSousVendor`, et la table contre la version installée de Next. Les
empreintes du plugin et du module de données, figées par
`resolutionImports.guard.test.ts`, sont ajustées : aucun crochet de
résolution, ni `normalModuleFactory`, ni `contextModuleFactory`, ni
`compiler.options` touché ; le module de données n'exporte que des littéraux.
Hors périmètre : le parcours des morceaux et modules, les exclusions,
`next.config.mjs`, les polices et polyfills.
