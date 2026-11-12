# Handoff — 2026-11-11 — BP-17, PR 3 : structure par références de la bibliothèque des options

## Branche et état Git

- Branche `feat/bp17-structure`, worktree `bp17-structure`, créée depuis
  `origin/main` (`68293eb1`, #1999), puis remise à niveau par merge de main
  (`32ab280b`, #2000, puis `f326f782`, #1998 et #2002).
- PR ordinaire de la file C : déclarée « prête @<sha> », mergée par
  l'intégrateur (D-373, D-454). Ni migration ni `schema.prisma`.

## Objectif

Livrer la première couche de D-480 §3 : la structure de références de la
bibliothèque des options, son format, sa signature à cinq termes et
l'empreinte des fiches d'usage, avec la structure du besoin 2 vide et non
signée.

## Décisions prises

Choix de forme de la session, tous dans le cadre de D-480 et du découpage
accepté (`20261111-1131-c`). Aucun ne touche au clinique.
- **Emplacement** : `web/src/lib/bibliotheque-options/`, hors de `clinical/`,
  sur le patron de `fiches-usage/`. Le module est distinct des fiches d'usage
  et du catalogue des conduites. Il importe la structure signée des fiches
  d'usage pour la clé et la population, et ne la modifie pas.
- **Identifiant d'option** : `^OPT_[A-Z0-9_]+$`, au plus 128 caractères. Il
  est donc conforme au CHECK `option_id ~ '^\S+$'` de la PR 2. Il est opaque.
  Pour qu'il ne soit jamais réattribué, la structure tient une liste
  `optionsRetirees` : une option qui y figure est incohérente.
- **Renvois** : chaînes `WN-CL-NNNN-NNN@vN.M` (le `v` est exigé, comme pour
  les claims épinglés), `WN-PE-NNNN@vN.M`, ou `information_manquante`. Cette
  dernière vaut pour la dose seulement, et seule dans sa rubrique.
- **Population** : une liste non vide de `POP_…` déclarés par la structure
  des fiches d'usage. Une option peut couvrir plusieurs populations. Une
  liste d'un élément reproduit le cas d'une fiche.
- **Rubriques** : les neuf de la migration, toutes présentes et aucune
  autre. Une liste de renvois vide signifie « non documentée ». Pour les
  précautions, cette PR la refuse déjà (voir plus bas). Pour les huit autres
  rubriques, ce que cela emporte relève de la PR 4.
- **Empreinte des fiches d'usage** : `shaFichesUsage` est inscrit aux
  métadonnées, recopié à la signature. Il n'entre pas dans les cinq termes :
  `etatBibliotheque()` rend `signee`, `a_relire` (fiches d'usage re-signées
  ou plus signées) ou `non_signee`.
- **Garde § 8** : banc `importeurs.guard.test.ts`, avec une liste de lecteurs
  admis vide. La PR 5 (atelier) et la PR 6 (cockpit) y ajouteront leur
  fichier, nommément.
- **Aucune option sans précautions (D-480 §5.1) entre dans cette PR**, sur
  l'arbitrage du responsable du 2026-11-12. CodeRabbit avait classé P0 son
  absence. Une option dont la rubrique `precautions` n'a aucun renvoi rend la
  structure incohérente (code `<option>:precautions`). La PR 4 garde les
  autres contrôles de §5 : deux tables au contrat de fraîcheur, contrat des
  positions citées, aucune lecture de dossier, hook DC-17, matrice de
  consommation.
- **Prédicat à consommer** (PR 5 et 6) : `etatBibliotheque(...) === 'signee'`,
  jamais `bibliothequeSignee` seul, qui ne vérifie pas que les fiches d'usage
  sont signées. C'est écrit en tête du module.
- Le verrou est ajouté au tableau `ETAT_VERROUS_SIGNATURE` et au balayage de
  `verrousSignatureDocumentes.guard.test.ts`. Sans cela, une signature
  future passerait sans que le tableau le dise.

## Fichiers modifiés

- `web/src/lib/bibliotheque-options/vocabulaire.ts` (pur),
  `bibliothequeBesoin2V1.ts`, et leurs bancs `vocabulaire.test.ts`,
  `bibliothequeBesoin2V1.test.ts`, `importeurs.guard.test.ts`.
- `web/src/lib/verrousSignatureDocumentes.guard.test.ts` : une racine
  balayée de plus.
- `docs/FEATURE_FLAGS.md` : une ligne au tableau des verrous (`false`,
  `null`).
- `changelog.d/2026-11-11-bp17-structure-bibliotheque.md`, fragment F11
  `2026-11-11-05-structure-bibliotheque-references.md`, ce handoff.

## Validations exécutées

- Bancs ciblés (module, verrous, garde « aucune phrase ») : 35 tests verts.
- T1 rapide : code 0. T1 complet (`npm run check`) : code 0.
- T3 `test:worktree`, joué sur la branche avant les merges de main : séquence
  complète verte en 11 min 35 s, code 0. Vitest : 16 856 tests réussis. E2E :
  360 réussis. Dérive schéma ↔ migrations : « No difference detected ».
  Main a ensuite apporté #2000, #1998 et #2002, sans fichier commun avec ce
  lot : le CI de la PR rejoue la séquence sur l'arbre fusionné.
- CI de #2006 sur `14c01b9e` : `wn-attendre-ci` à 0. Revue CodeRabbit
  déclenchée à la main (dépôt à moins de 10 étoiles), six remarques, verdicts
  dans la PR. Corrigés : la signature calcule l'empreinte et la cohérence
  sur la structure jugée (plus de paramètres séparés) ; le helper
  `balayageSources` balaie `.js`/`.jsx` et lit `require()` (aucun fichier ni
  appel de ce type en production : les 155 bancs de garde restent verts) ;
  le texte « à relire » est précisé (empreinte des fiches d'usage). Routés :
  « aucune option sans précautions » à la PR 4 ; forme de renvoi du registre
  des compléments, avant la transcription de la PR 7.
- Tête `58a2d1a3` : CodeRabbit à quota épuisé (une revue par heure),
  Copilot à quota épuisé (`--quota` à 1). PR-Agent est prouvé
  (`wn-revue-pr-agent` à 0) et pointe trois zones d'attention. Corrigées :
  une rubrique dont la valeur n'est pas une liste ferme le verrou ;
  `etatBibliotheque(metadata, structure, fichesUsage, fichesUsageMetadata)`
  calcule lui-même les deux signatures et l'empreinte. Écartée avec motif :
  le changement du helper partagé (155 bancs de garde verts, aucun `.js` ni
  `require()` en production).
- `wn-reviewer` (P0) sur `8bfacc95` : GO, avec 20 mutations jouées hors dépôt.
  Corrigé ensuite :
  - mutations survivantes, chacune avec son banc : fiches d'usage
    incohérentes, format des identifiants retirés, besoin 0, -1 et 2.5,
    `OPT_a` et `OPT_É`, bornes des versions de position (désormais dérivées
    de `positions-expert/vocabulaire.ts`) ;
  - banc §8 : il voit aussi un gabarit à accents graves ;
  - `estUnTest` aligné sur `.js` et `.jsx` ;
  - propriétés en trop refusées (`cles`) ;
  - commentaire §5.4 rectifié.

  Bancs de garde et `bio-parcours` : 158 fichiers verts, 2 980 tests.
- Passe Codex du responsable sur `fb80151b` : BLOQUER, deux P1 confirmés et
  toujours présents dans `eec057ad`, corrigés ensuite :
  - P1-1 : une liste de populations à trous (`new Array(1)`) se signait.
    `some` sautait la case absente. Chaque case est maintenant lue, trous
    compris, et doit être un texte déclaré. Un banc couvre `new Array(1)`,
    `[undefined]`, `[42]` et une liste mixte. Il vérifie le refus par
    `incoherencesDeBibliotheque`, `bibliothequeSignee` et `etatBibliotheque`.
  - P1-2 : le banc §8 lisait les imports dans le texte, d'où deux trous. Un
    commentaire glissé entre `import` et la chaîne (`import/**/"…"`) passait,
    et un échappement dans le chemin (`b…`) aussi. Le banc lit
    désormais les spécificateurs avec le parseur TypeScript, décodés, par
    `specificateursSyntaxiques`, nouvel export de `balayageSources`. Les
    autres bancs gardent `specificateursImportes`, sans changement. Ajouts :
    contre-épreuve des deux formes, de `import x = require`, de
    `typeof import` et du `require` en `.js`/`.jsx` ; contre-épreuve du
    filtre de balayage `.js`/`.jsx` (`estFichierSource`).

  Bancs de garde et `bio-parcours` : 158 fichiers verts, 2 981 tests.
- Contre-passe Codex sur `12009284` : BLOQUER. P1-1 est fermé. P1-2 reste
  ouvert pour les arguments constants qui ne sont pas des littéraux :
  `import(("…"))` et `import("@/lib/" + "bibliotheque-options/…")`. Le
  correctif lit chaque argument par sa valeur constante : parenthèses,
  concaténations, gabarits et assertions de type. Un `import()` ou un
  `require()` à argument non constant rend `IMPORT_NON_CONSTANT`, que le
  banc §8 traite comme un lecteur possible, car le bundler en ferait un
  module de contexte. Il n'y en a aucun en production (0 sur 1 125 fichiers).
  Contre-épreuves ajoutées pour chacune de ces formes.

  Bancs de garde, `bio-parcours` et bibliothèque : 161 fichiers verts,
  3 023 tests.
- CodeRabbit sur `748a8467` : deux remarques, toutes deux corrigées.
  `optionsRetirees` est lue case par case, trous compris : `new Array(1)`,
  `[undefined]`, `[42]` et une liste mixte sont refusés, et la structure ne
  se signe pas. Le balayage admet `.mjs`, `.cjs`, `.mts` et `.cts`. Il n'en
  existe aucun sous `web/src`, donc les autres bancs ne changent pas.
  `estUnTest` et le choix de la grammaire du parseur sont alignés.
- Contre-passe Codex sur `302b80d8` : BLOQUER. Un `require` entre
  parenthèses, `(require)("…")` ou `(require)(chemin)`, n'était pas lu. Le
  correctif déballe l'appelé (parenthèses, assertions de type, virgule) et
  admet `module.require`. Toute autre mention de `require`, comme
  `const r = require`, `require.context` ou `typeof require`, ferme le verrou.
  Il en va de même de `import.meta` hors de `.url`, par exemple
  `import.meta.webpackContext`. `new URL(x, import.meta.url)` est lu par
  son chemin. Il n'y a aucune de ces mentions en production. La seule forme
  qui touche `import.meta`, le worker de `pdfjs-dist`, est lue sans
  sentinelle. Contre-épreuves : chemin exact et sentinelle pour les deux
  formes relevées, et une contre-épreuve par forme voisine. Tests de la
  bibliothèque et du balayage : 37, verts.

  T1 complet : un seul rouge, hérité de main (#2017, D-499).
  `scripts/wn-revue-copilot.test.mjs`, test « câblage », attend encore que
  `wn-merge` nomme `wn-revue-copilot.mjs`, mais D-499 a retiré cette
  mention. Main l'a réaligné (#2029), fusionné sur la branche :
  `bancs-outillage-check` est vert, et les étapes qui n'avaient pas tourné
  derrière lui (anti-secrets) aussi.
- Contre-passe Codex sur `c847d0f5` : BLOQUER, pour deux formes voisines.
  La première est `module["require"](…)`, un accès calculé. La seconde est
  `new URL(…)` avec le constructeur ou la base entre parenthèses. Le
  correctif reconnaît un accès calculé constant à `require`, quelle que
  soit sa forme, et déballe le constructeur et la base de `new URL`.
  `import.meta` n'est plus admis que comme base d'un `new URL` reconnu.
  Toute autre mention, y compris `import.meta.url` seul ou
  `new globalThis.URL(…)`, ferme le verrou. Contre-épreuves : chemin exact
  ou sentinelle pour les quatre exemples de Codex et leurs variantes non
  constantes. T1 complet : code 0.
- PR-Agent sur `5a29983b`, constat nouveau « Verrou qui jette »
  (`bbca5e170e29`), corrigé. Une structure hors du typage faisait lever une
  exception dans `incoherencesDeBibliotheque`, `sourcesCitees` et
  `bibliothequeSignee`. C'était le cas pour `optionsRetirees` absent ou qui
  n'est pas une liste, `options` ou `renvois` d'une autre forme, et une
  structure ou des métadonnées nulles. Elle rend désormais des anomalies,
  dont `structure:option_mal_formee` pour une case d'option qui n'est pas un
  objet, et ne se signe pas. Un banc couvre neuf formes de structure et
  trois formes de métadonnées. T1 complet : code 0, joué avant la fusion de
  main (#2027, t78), qui ne touche aucun fichier du lot.
- Contre-passe Codex sur `3311087b` : P1-2a et P1-2b fermés, BLOQUER sur
  deux constats.
  - P1-3 : `id: ["OPT_SYNTH_1"]` passait pour l'identifiant par conversion
    implicite, et la structure se signait.
  - P2-1 : il restait des chemins qui faisaient lever une exception :
    `{ toString: null }` en identifiant ou en renvoi, `[null]` en claims ou
    en positions épinglés.

  Correctif : chaque valeur imbriquée est contrôlée par son type avant d'être
  convertie, interpolée ou lue. `estIdentifiantOption` et `lireRenvoi`
  exigent un texte. Un identifiant qui n'est pas un texte rend
  `structure:option_mal_formee`. La date, les claims et les positions
  épinglés sont vérifiés case par case, trous compris. Les fiches d'usage
  sont lues sans supposer leur forme. Si leur propre module ne sait pas les
  lire, elles valent « non signées », et la bibliothèque passe donc
  « à relire ». Bancs : identifiants, renvois, sources et date, fiches
  d'usage hors typage. Pour chacun, il vérifie les anomalies exactes, une
  signature refusée et l'état attendu. T1 complet : code 0.
- Revue `wn-reviewer` sur `bab68ad7` (la passe Codex était indisponible ; le
  responsable l'a remplacée par `wn-reviewer`), BLOQUER :
  - P1-1, corrigé : un `define([...], f)` AMD charge ses dépendances sans
    que le banc les voie. Le visiteur lit maintenant les éléments constants
    du tableau. Tout autre argument et toute autre mention de `define`
    ferment le verrou.
  - P1-2, corrigé : `@jsxImportSource x` fait importer `x/jsx-runtime`.
    Le pragma est lu dans le texte.
  - P1-3, corrigé : le banc balaie désormais tout `web/`, y compris les
    entrées hors de `src` et `web/scripts/` (worker, cron). Il vérifie qu'il
    voit bien ces fichiers (anti-vacuité). L'outillage de `scripts/` et
    `tools/`, qui n'est pas en production, charge des chemins calculés, ce
    qui donnerait 34 faux rouges : routé vers la PR 4.
  - P2-1, corrigé : une fonction, un `Symbol`, un BigInt ou un cycle ne font
    plus lever d'exception. L'empreinte est calculée par `empreinteSure`, qui
    rend `null` dans ces cas et ferme alors le verrou.
  - P2-2, corrigé : `hypothese` doit être un texte.
  - P2-3, corrigé : le motif du banc ignore la casse.
  - Q1, routé vers la PR 4 : les détours par la configuration (`paths`,
    `imports`, alias de `next.config`). Chacun exige de modifier un fichier
    de configuration hors de ce lot.
  - Q2, écarté : un `toJSON` posé sur un tableau de renvois n'existe que par
    cast dans du code. Du JSON lu ne peut pas en porter, et ce code serait
    visible en revue.
- Contre-passe `wn-reviewer` sur `b1524e75` : quatre correctifs sont fermés,
  et un fuzz de 10 416 appels sur JSON muté ne lève aucune exception. Elle
  rend pourtant BLOQUER sur deux constats :
  - P1-A, corrigé : `define(["require"], function (r) { r("x") })` charge
    `x`, ce que webpack confirme en compilant. Une fabrique AMD qui déclare
    des paramètres ferme désormais le verrou.
  - P1-B, corrigé : le motif du pragma s'arrête désormais avant un `*/`
    collé (`…options*/`).
  - En complément, un banc interdit tout fichier `jsx-runtime` dans le
    dossier, ce qui couvre toute autre forme de pragma.
  - P2-a, écarté : un `define` détourné vers un autre usage ferait un rouge
    à arbitrer. Il n'en existe aucun aujourd'hui, et le verrou reste fermé.
  - P2-b, routé vers la PR 4 : `module.hot.accept(x)`. Le constat a été
    compilé en production et n'embarque rien ; il ne concerne que le
    développement.
- Contre-passe `wn-reviewer` sur `7ca05b18` : P1-A et P1-B fermés. Toutes
  les formes AMD que webpack embarque sont vues. BLOQUER sur un constat :
  - P1-C, corrigé : un pragma séparé par U+0085 (NEL) passe, car SWC
    l'admet et le `\s` de JavaScript l'ignore. Le second verrou rate en
    plus un dossier `jsx-runtime/` (avec `index.ts` ou `package.json`).
  - Correctif : toute mention du pragma de source JSX ferme le verrou, quel
    que soit le séparateur. Sa valeur n'est plus lue.
  - Le banc du dossier liste désormais tous ses fichiers, et plus seulement
    ses sources. Il refuse tout `jsx-runtime`, en fichier comme en dossier.
- Contre-passe `wn-reviewer` sur `a58631d6` : **PASSER**. P1-C est fermé :
  la chaîne a été compilée, et chaque variante de pragma appliquée par SWC
  est vue. Deux P2 non bloquants :
  - fichier ignoré, ou test importé par la production : routé vers la PR 4 ;
  - prose qui ferme le verrou : voulu, donc écarté.

## Problèmes ouverts

- **Deux sources de dose de D-480 §4 sans forme de renvoi** : le registre
  des compléments et les référentiels externes ingérés. Un référentiel
  ingéré l'est en claims (cas de WN-SRC-0652), qui se citent déjà. Le
  registre des compléments n'a pas de forme. L'ajouter change le format,
  sans migration ; la question est à poser à la PR 4 ou à la transcription
  de la PR 7, quand un contenu du responsable en aura besoin.
- **« Déclarée manquante » hors de la dose** : D-480 §5.2 dit qu'une
  métadonnée de DC-11 absente « ou déclarée manquante » rend l'option non
  exécutable. Le format n'admet `information_manquante` que pour la dose
  (§4, consigne du lot). Pour les autres rubriques, une liste vide tient lieu
  de « non documentée ». À trancher à la PR 4, qui juge l'exécutabilité.
- **Passe Codex** : obligatoire pour un module clinique signé de la campagne
  BIO-PARCOURS (bibliothèque d'options), geste manuel du responsable
  (`$wellneuro-pr-review`). La première passe a rendu BLOQUER ; ses deux P1
  sont corrigés. Les contre-passes ont suivi jusqu'à `3311087b`. Ensuite,
  Codex était indisponible : le responsable l'a remplacé par `wn-reviewer`
  sur `bab68ad7`. C'est une exception à déclarer avec « prête ».
- **Les autres bancs de garde** lisent toujours les imports dans le texte
  (`specificateursImportes`). Ils restent ouverts aux deux formes de
  contournement relevées par Codex. Leur passage au parseur touche une
  quinzaine de bancs hors de ce lot ; il est routé vers la PR 4, qui pose la
  garde de consommation. Sont routés au même endroit l'outillage de
  `scripts/` et `tools/`, les détours par la configuration, `module.hot` et
  les fichiers ignorés ou de test importés par la production (`wn-reviewer`).
- Une re-signature des fiches d'usage qui RETIRE une hypothèse citée fait
  passer l'état à `non_signee` (structure incohérente), et non à `a_relire`.
  Ce sens est sûr, mais l'affichage du cockpit (PR 6) devra le distinguer
  (`wn-reviewer`, constat 4).
- Le chemin du module n'est pas encore sous le hook DC-17, au contrat de
  fraîcheur, à la matrice de consommation ni aux chemins de `release-db.yml` :
  c'est la PR 4. Tant que la structure est vide, rien n'en dépend.

## Prochaine action exacte

#2006 : CI de la tête, revue sur la tête (PR-Agent prouvé, revue exigée
depuis D-499). Les correctifs de la revue `wn-reviewer` sont posés ; la
passe Codex, indisponible, est remplacée par cette revue. Chaque remarque
reçoit son verdict, puis la PR est déclarée « prête @<sha> ».
L'intégrateur merge. La PR 4 (contrôles et garde) suit dans une nouvelle
session, puis la PR 5 (atelier), qui dépend de cette PR et de la PR 2,
constatée.

## Interdits encore actifs

- Aucune migration, aucune modification de `schema.prisma`. Aucune lecture
  ni écriture des tables de la PR 2 avant la PR 5.
- Aucune option, dose, durée, précaution, contre-indication, interaction ni
  libellé rédigé par une session (porte 23, DC-11) ; fixtures neutres
  seulement.
- Aucune signature : c'est le geste du responsable, à la PR 7.
- Aucun lecteur de `creePar` / `validePar` (D-459 §7). Aucun lecteur de la
  bibliothèque hors des bancs, de l'atelier et du cockpit (§8).
- Ne pas reposer D-480, ses trois points de forme ni le découpage ; ni les
  arbitrages BP-17, D-477, BP-14, D-459, F78 ou BP-12b.
- Production en lecture seule, par conteneur, en agrégats.
