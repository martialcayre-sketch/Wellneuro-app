# Handoff — 2026-11-27 — Mentions tierces : code sous `vendor/` et copies de Next sans licence

Lot `licences-vendor-mentions-restantes` (file D, P2, lieu cloud), mené par la
passe de l'orchestrateur cloud `20261127-1009-orch` (`D-540`).

## Branche et état Git

- Branche `claude/clever-mayer-dpc75q`, tirée d'`origin/main` à `22161a3e`.
- Un commit de lot (plugin, table, banc, empreintes, fragment, ce handoff),
  poussé ; PR ouverte sur `main`, sortie du brouillon avant le CI.

## Objectif

Les deux restes P2 de la revue du lot `licences-tierces-bundle` (handoff
`2026-11-16-0824-licences-tierces-bundle.md`, § problèmes ouverts) : (1) du
code vendu hors `dist/compiled/` (sous `vendor/`) restait attribué à son
paquet hôte ; (2) `querystring-es3` et `constants-browserify`, vendus par
Next sans licence, rougiraient le build si un import client les atteignait.

## Décisions prises

- **(1) Attribution au dossier d'origine.** `dossierSousVendor` repère un
  segment `vendor`, `lib-vendor` ou `vendored` dans le chemin relatif au
  paquet hôte. Le dossier qui suit ce segment (`@scope/nom` compris) devient
  le composant, s'il porte un fichier de licence. Il est listé « `<nom>`
  (vendu par `<hôte>@<version>`) », avec ses textes de licence et sa NOTICE.
  L'hôte n'est plus ajouté pour ce fichier ; il reste listé pour son propre
  code. Le build rougit, en nommant les fichiers, dans deux cas : aucun
  fichier de licence dans le dossier d'origine, ou fichier posé à même
  `vendor/`. C'est la forme de `@sentry/core/build/esm/vendor/`, dont les
  droits amont (Sindre Sorhus, Sergio Xalambrí) ne vivent que dans les
  `sourcesContent` des cartes : on n'en extrait rien, on refuse.
- **(2) Mention depuis l'amont, reconnue par empreinte.** Nouvelle table
  `COPIES_NEXT_SANS_LICENCE`, dans le module de données
  `licences-hors-graphe.mjs` (littéraux seuls). Elle ne s'applique qu'à un
  paquet `sansLicence` du même nom, si l'empreinte SHA-256 de son fichier
  correspond. La copie reçoit alors la version, la licence et les droits
  amont, et une ligne de provenance. Une autre empreinte rougit le build :
  « réidentifier la version amont ». C'est le modèle des polyfills.
- **Identification amont** (archives du registre npm, par `npm pack`) :
  - querystring-es3 **0.2.1** : l'`encode.js` vendu appelle
    `map(obj[k], …)`, celui de 0.2.0 `obj[k].map(…)`. On reprend
    License.md (Irakli Gozalishvili) et l'en-tête Joyent de
    `decode.js`/`encode.js`, retiré par le minificateur.
  - constants-browserify **1.0.0** : `constants.json` est identique à
    l'amont, celui de 0.0.1 diffère. Licence MIT déclarée, aucun fichier de
    licence amont : texte type MIT et auteur Julian Gruber.
  - Les dépôts GitHub amont n'ont pas été lus : la session n'a accès qu'à
    ce dépôt.

## Fichiers modifiés

- `web/scripts/licences-tierces.mjs` : `dossierSousVendor`,
  `lireVenduSousVendor`, `completerCopieSansLicence`, deux refus nouveaux,
  option `copiesSansLicence`. `cle` et l'en-tête de `composerMentions`
  prennent en compte l'hôte et la provenance.
- `web/scripts/licences-hors-graphe.mjs` : table `COPIES_NEXT_SANS_LICENCE`.
- `web/src/lib/licencesTierces.test.ts` : quatre compilations, un banc
  `dossierSousVendor`, et la table contre la version installée de Next. Ce
  banc vérifie l'empreinte, l'absence de licence chez Next et un texte type
  disponible.
- `web/src/lib/bio-parcours/resolutionImports.guard.test.ts` : deux
  empreintes (`72e20886…` pour le plugin, `313a1a8a…` pour les données),
  ajustées après la vérification qu'exigent leurs commentaires.
- `changelog.d/2026-11-27-licences-vendor-mentions-restantes.md`, ce handoff.

## Validations exécutées

- `vitest run` sur `licencesTierces`, `resolutionImports.guard` et
  `importeurs.guard` : 3 fichiers, 34 tests verts.
- Contre-épreuve : avec la détection `vendor/` désactivée et la table
  ignorée, les 4 nouveaux cas de compilation rougissent, les 16 autres
  restent verts. Fichier restauré (`cmp` à l'identique).
- Build réel de production (`next build`, dans le conteneur cloud), avant
  puis après le changement. La compilation est verte. Le
  `public/licences-tierces.txt` est identique octet pour octet à celui
  d'avant (72 composants) : aucun fichier sous `vendor/` ni copie sans
  licence n'est livré aujourd'hui. Les deux builds échouent ensuite à la
  collecte des données de page, faute de `DATABASE_URL` dans le conteneur.
  Cause d'environnement, identique avant et après.
- T1 : `npm run check:rapide` → 0. Un premier `npm run check` complet a
  rougi sur un seul test : la parité `wn-controle-fusion.test.mjs` (« tout
  banc Vitest qui balaie une arborescence est un `guard` ou dans
  BANCS_BALAYAGE ») visait le `readdirSync` du nouveau cas. Le cas passe
  désormais par `sansLicence(lirePaquet(…))` du plugin. Rejoué : → 0.
  Ni T2 ni T3 (passe cloud, `D-540`).

## Problèmes ouverts

- `@sentry/core` vend sous `build/esm/vendor/` deux fichiers MIT dont les
  droits ne sont que dans les cartes de sources. Ils ne sont pas livrés
  aujourd'hui. S'ils l'étaient, le build rougirait : il faudrait alors une
  mention explicite (table) ou un refus motivé.
- Ligne `20261125-1300-b` de la boîte `D` (E2E instable
  `e2e/portail-rail-lateral.spec.ts:128`) : toujours `lu`, hors de ce lot.

## Prochaine action exacte

CI (`node scripts/wn-attendre-ci.mjs <N>`), revue PR-Agent
(`node scripts/wn-revue-pr-agent.mjs <N>` → 0), un verdict par remarque,
« prête @<sha> » sur la PR, ligne `prete` à la boîte `integrateur`, `pr` sur
la ligne du lot. Merge : l'intégrateur.

## Interdits encore actifs

Passe cloud : ni merge, ni release-db, ni T2/T3, ni `test:e2e`, ni lot
suivant. Aucune modification du parcours des morceaux, des exclusions ni de
`next.config.mjs`. Aucune adresse d'artefact dans le dépôt.
