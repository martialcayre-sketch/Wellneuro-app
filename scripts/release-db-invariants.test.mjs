// Invariants de sûreté du workflow `release-db` — le SEUL chemin d'écriture de la
// base de production.
//
// POURQUOI CE BANC. Depuis que le workflow est PROPOSÉ AUTOMATIQUEMENT (déclencheur
// `push` sur une migration mergée), il ne reste plus qu'UNE barrière entre un merge
// et une écriture en production : l'environnement protégé `release-db`. Avant, il en
// fallait deux — qu'un humain clique « Run workflow », ET que l'environnement gate.
// Un `environment:` retiré par mégarde était alors inoffensif tant que personne ne
// déclenchait ; il ne l'est plus.
//
// Ce banc ne remplace pas la configuration côté GitHub (required reviewers, politique
// de branches), qu'un test ne peut pas voir. Il verrouille ce qui vit dans le dépôt,
// c'est-à-dire ce qu'une PR peut casser en silence.
//
// Il travaille sur le TEXTE et non sur un objet YAML : aucun parseur n'est résolvable
// depuis la racine du dépôt, et ce sont de toute façon des propriétés de forme —
// « ce job ne porte pas telle clé » — qu'un objet reconstruit rendrait plus flou.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const CHEMIN = join(RACINE, '.github/workflows/release-db.yml');
const SOURCE = readFileSync(CHEMIN, 'utf8');

/**
 * Découpe la section `jobs:` en blocs, un par job. Un job commence à une ligne
 * `  <nom>:` en indentation 2 et court jusqu'au job suivant.
 */
function blocsDeJobs(source) {
  const lignes = source.split('\n');
  const debutJobs = lignes.findIndex((l) => l === 'jobs:');
  assert.notEqual(debutJobs, -1, 'section `jobs:` introuvable');

  const blocs = new Map();
  let courant = null;
  for (const ligne of lignes.slice(debutJobs + 1)) {
    const entete = /^ {2}([A-Za-z][\w-]*):\s*$/.exec(ligne);
    if (entete) {
      courant = entete[1];
      blocs.set(courant, []);
      continue;
    }
    if (courant) blocs.get(courant).push(ligne);
  }
  return new Map([...blocs].map(([nom, l]) => [nom, l.join('\n')]));
}

const JOBS = blocsDeJobs(SOURCE);

test('les trois jobs attendus existent', () => {
  assert.deepEqual([...JOBS.keys()].sort(), ['ref-refusee', 'release', 'resume']);
});

test('`release` est le seul job à porter `environment: release-db`', () => {
  const porteurs = [...JOBS].filter(([, bloc]) => /^\s+environment:\s*release-db\s*$/m.test(bloc));
  assert.deepEqual(
    porteurs.map(([nom]) => nom),
    ['release'],
    "l'environnement protégé doit être porté par `release`, et par lui seul",
  );
});

test('`release` reste borné à main', () => {
  assert.match(
    JOBS.get('release'),
    /^\s+if:\s*github\.ref == 'refs\/heads\/main'\s*$/m,
    'le garde de ref de `release` a disparu — un dispatch depuis une branche écrirait en production',
  );
});

test('`ref-refusee` porte toujours la condition inverse et échoue', () => {
  const bloc = JOBS.get('ref-refusee');
  assert.match(bloc, /^\s+if:\s*github\.ref != 'refs\/heads\/main'\s*$/m);
  assert.match(bloc, /exit 1/, 'une ref refusée doit échouer bruyamment, pas être *skipped*');
});

// L'INVARIANT A ÉTÉ RESSERRÉ, PAS LEVÉ, le 2026-09-13. Il interdisait TOUT
// `secrets.` dans `resume`. Le résumé borne désormais sa plage au dernier run
// `release-db` réussi — ce qui demande de lire les métadonnées des runs, donc le
// `GITHUB_TOKEN` automatique. Une exception nommée vaut mieux qu'une garde levée :
// ce banc liste maintenant ce qui est admis, et tout AUTRE secret rougit. Ce qui
// est protégé reste ce que D-087 construit — le jeton SCALINGO, celui qui écrit en
// production, n'est atteignable que derrière l'approbation humaine.
const SECRETS_ADMIS_DANS_RESUME = Object.freeze(['GITHUB_TOKEN']);

test('`resume` ne porte aucun environnement et aucun secret hors exception nommée', () => {
  const bloc = JOBS.get('resume');
  assert.doesNotMatch(
    bloc,
    /^\s+environment:/m,
    "`resume` doit rester HORS du gate : c'est ce qui lui permet de s'exécuter AVANT l'approbation",
  );
  const cites = [...bloc.matchAll(/secrets\.([A-Za-z0-9_]+)/g)].map(([, nom]) => nom);
  const interdits = cites.filter((nom) => !SECRETS_ADMIS_DANS_RESUME.includes(nom));
  assert.deepEqual(
    interdits,
    [],
    "`resume` s'exécute sans approbation humaine : hors `GITHUB_TOKEN`, aucun secret ne doit y être en portée",
  );
  // Le jeton admis ne vaut que borné. Sans bloc `permissions:` propre au job, il
  // héritait des permissions du workflow — et un élargissement futur au niveau
  // workflow lui rendrait silencieusement des droits d'écriture.
  if (cites.includes('GITHUB_TOKEN')) {
    const permissions = bloc.match(/^\s+permissions:\n((?:\s+\w+:\s*\w+\n)+)/m);
    assert.ok(permissions, '`resume` porte un jeton : il doit porter son propre bloc `permissions:`');
    assert.doesNotMatch(
      permissions[1],
      /:\s*write\b/,
      '`resume` tourne avant l’approbation : aucune permission d’ÉCRITURE ne doit y être posée',
    );
  }
});

test('`release` dépend de `resume`, pour que le résumé précède la demande', () => {
  assert.match(JOBS.get('release'), /^\s+needs:\s*resume\s*$/m);
});

// Depuis le cutover du 2026-08-22 (D-080/D-087), le mode import-cb est HORS
// SERVICE : il visait Supabase. Le refus doit être EXPLICITE (une garde qui
// échoue en le disant), jamais un mode qui « tombe en marche » sur une base
// décommissionnée — et il doit rester la SEULE étape qui mentionne import-cb :
// une étape d'import réapparue à côté du refus serait le retour silencieux du
// mode, refus maintenu en façade.
test('le mode import-cb est refusé explicitement, et rien d’autre ne le porte', () => {
  const lignesImport = SOURCE.split('\n').filter(
    (l) => /^\s+if:/.test(l) && l.includes('import-cb'),
  );
  assert.equal(
    lignesImport.length,
    1,
    `une seule garde import-cb attendue (le refus), trouvé ${lignesImport.length}`,
  );
  assert.match(
    lignesImport[0],
    /github\.event_name == 'workflow_dispatch'/,
    "le refus ne concerne que le dispatch : un push n'a pas de mode",
  );
  assert.match(
    JOBS.get('release'),
    /import-cb hors service[\s\S]*?exit 1/,
    'le refus doit se dire hors service et échouer bruyamment',
  );
});

// La leçon de l'incident du 2026-08-22 : le workflow appliquait ses migrations
// sur Supabase parce qu'un secret d'URL (MIGRATE_ + DATABASE_URL) était resté
// pointé dessus au cutover. Depuis D-087, AUCUNE URL de base ne transite par
// GitHub — le one-off tourne là où l'add-on injecte l'URL. Ce banc interdit le
// retour du motif jusque dans les commentaires : si une URL de base redevient
// nécessaire ici, c'est le MODÈLE qui change (décision), pas une variable
// qu'on ajoute.
test('aucune URL de base ne transite par le workflow', () => {
  assert.doesNotMatch(SOURCE, /DATABASE_URL/, 'aucune variable *DATABASE_URL ne doit réapparaître');
  assert.doesNotMatch(SOURCE, /postgres(ql)?:\/\//, 'aucune URL de connexion ne doit réapparaître');
});

// Une sentinelle non liée au run est un faux vert en attente : `logs --filter`
// est un MOTIF, et un WN_RELEASE_DB_OK laissé par un one-off antérieur dans la
// fenêtre de logs passerait pour le succès du run courant — sur le chemin
// d'écriture du schéma HDS.
test('les sentinelles des one-offs sont liées au run courant', () => {
  const bloc = JOBS.get('release');
  assert.match(
    bloc,
    /WN_RELEASE_ID: \$\{\{ github\.run_id \}\}-\$\{\{ github\.run_attempt \}\}/,
    'l’identifiant de run doit exister et inclure la tentative',
  );
  for (const sentinelle of ['WN_RELEASE_DB_OK', 'WN_RELEASE_DB_ECHEC', 'WN_STATUT_DB_OK', 'WN_STATUT_DB_ECHEC']) {
    assert.match(
      bloc,
      new RegExp(`${sentinelle} id=\\$WN_RELEASE_ID`),
      `le grep de ${sentinelle} doit exiger l'id du run, pas le mot seul`,
    );
  }
});

// Les deux calculs d'empreinte — runner (commit approuvé) et conteneur (image
// déployée) — ne se comparent qu'à condition d'être LE MÊME calcul. Une
// divergence future (un côté modifié sans l'autre) rendrait toute release
// impossible, sans que rien ne l'ait signalé avant la production : la tenir
// ici, à l'octet près, au `cd web && ` près.
test('les deux calculs d’empreinte des migrations sont identiques', () => {
  const script = readFileSync(join(RACINE, 'web/scripts/release-db-scalingo.sh'), 'utf8');
  const duWorkflow = /EMPREINTE=\$\(cd web && (.+)\)/.exec(SOURCE);
  const duConteneur = /EMPREINTE_IMAGE=\$\((.+)\)/.exec(script);
  assert.ok(duWorkflow, "calcul d'empreinte introuvable dans le workflow");
  assert.ok(duConteneur, "calcul d'empreinte introuvable dans le script du one-off");
  assert.equal(
    duWorkflow[1],
    duConteneur[1],
    'les deux expressions doivent rester identiques — sinon toute release échoue sur empreinte_migrations',
  );
});

// Leçon de la première répétition générale (run 32578782755, 2026-08-22) : le
// CLI Scalingo n'authentifie PAS par la variable d'environnement — sans
// `login --api-token`, chaque appel échoue, et un échec d'API muet se lit
// exactement comme « drapeau absent ». Le login doit exister, et venir AVANT
// le premier appel qui parle à l'app.
test('le CLI se connecte explicitement avant le premier appel à l’app', () => {
  const bloc = JOBS.get('release');
  const login = bloc.indexOf('scalingo login --api-token');
  const premierAppel = bloc.indexOf('env-get WN_MIGRATIONS_PAR_RELEASE_DB');
  assert.ok(login > -1, "l'étape de login a disparu — aucun appel Scalingo ne réussit sans elle");
  assert.ok(premierAppel > -1, 'la garde du drapeau a disparu');
  assert.ok(login < premierAppel, "le login doit précéder le premier appel à l'app");
});

// Le jeton d'API est une créance PLEINE sur l'app (one-offs, environnement,
// tunnels) : en portée de job, il serait visible de TOUTES les étapes — dont
// l'installation du CLI, qui exécute du contenu téléchargé.
test('le jeton API est borné aux étapes qui parlent à Scalingo', () => {
  const bloc = JOBS.get('release');
  const avantSteps = bloc.slice(0, bloc.indexOf('    steps:'));
  assert.ok(avantSteps.length > 0, 'section steps introuvable dans release');
  assert.doesNotMatch(
    avantSteps,
    /SCALINGO_API_TOKEN:/,
    'le jeton ne doit pas être en portée de job',
  );
});

// L'installeur « dernière version » du domaine de téléchargement mettait du
// contenu non épinglé sur le chemin d'écriture de la production. Version figée
// + empreinte vérifiée : une mise à jour du CLI est une PR, pas un aléa.
test('le CLI Scalingo est épinglé par version et empreinte', () => {
  const bloc = JOBS.get('release');
  assert.match(bloc, /github\.com\/Scalingo\/cli\/releases\/download\//, 'archive de release épinglée attendue');
  assert.match(bloc, /sha256sum -c/, "l'archive doit être vérifiée par empreinte");
  assert.doesNotMatch(bloc, /cli-dl\.scalingo\.com/, "l'installeur « dernière version » ne doit pas revenir");
});

// Toute la gouvernance tient à une variable d'app : si le drapeau saute, le
// postdeploy migre en silence À CÔTÉ de la porte. Le constater à chaque
// release, par `env-get` (jamais `env`, qui déverserait les secrets de l'app).
test('le drapeau de gouvernance est constaté, pas cru', () => {
  assert.match(JOBS.get('release'), /env-get WN_MIGRATIONS_PAR_RELEASE_DB/);
});

// D-102 — la release DÉCLENCHE le déploiement qu'elle attend. Sans ce
// déclenchement, l'étape d'attente redevient l'interblocage : Scalingo attend
// que tous les checks du commit concluent, `release-db` en est un, et il
// attend le déploiement. Trois refus le 2026-08-23 avant que la cause soit
// nommée.
test('la release déclenche le déploiement avant de l’attendre', () => {
  const bloc = JOBS.get('release');
  // L'INVOCATION, pas la prose : un commentaire cite la commande plus haut
  // dans la même étape, et un `indexOf` nu ancrait ce banc sur lui.
  const declenche = bloc.indexOf('integration-link-manual-deploy main');
  const attend = bloc.indexOf('jamais déployé en success');
  assert.ok(declenche > -1, 'le déclenchement du déploiement a disparu — l’interblocage revient');
  assert.ok(attend > -1, "l'attente du déploiement a disparu");
  assert.ok(declenche < attend, "le déclenchement doit précéder l'attente, sinon il ne sert à rien");
});

// `integration-link-manual-deploy` déploie une BRANCHE. Si la tête de `main`
// n'est plus le commit approuvé, tout dépend de CE qui est arrivé : des
// migrations nouvelles, que personne n'a approuvées — exactement ce que tout
// ce workflow existe pour empêcher — ou aucune, auquel cas l'ensemble à
// écrire est identique à l'approuvé. Le refus aveugle d'origine a échoué le
// 2026-09-06 (run 33966114073) sur un push DOCUMENTAIRE, après 20 h
// d'attente d'approbation : une garde qui refuse à tort quand elle peut
// trancher n'est pas une garde, c'est un bruit.
test('le déclenchement exige que la tête de main soit le commit approuvé', () => {
  const bloc = JOBS.get('release');
  const debut = bloc.indexOf('Déclenchement du déploiement');
  const fin = bloc.indexOf('integration-link-manual-deploy main');
  // Sans ces deux ancres, `slice` rendrait une tranche arbitraire où les
  // assertions ci-dessous passeraient pour de mauvaises raisons — constaté en
  // mutation : l'invocation retirée, ce banc restait vert.
  assert.ok(debut > -1 && fin > debut, 'les ancres de l’étape de déclenchement ont bougé');
  const etape = bloc.slice(debut, fin);
  assert.match(etape, /git rev-parse origin\/main/, 'la tête de main doit être constatée');
  assert.match(
    etape,
    /!=\s*"\$GITHUB_SHA"/,
    'une tête différente du commit approuvé doit être jugée',
  );
  assert.match(
    etape,
    /merge-base --is-ancestor "\$GITHUB_SHA" "\$TETE"/,
    'une tête hors de la ligne du commit approuvé (force-push) doit arrêter le déclenchement',
  );
  assert.match(
    etape,
    /git diff --quiet "\$GITHUB_SHA" "\$TETE" -- web\/prisma\/migrations\//,
    'une tête apportant des migrations nouvelles doit arrêter le déclenchement — elles sont non approuvées',
  );
  assert.match(etape, /exit 1/, 'le refus doit être franc, pas un avertissement');
});

// Quand la tête acceptée n'est pas le commit approuvé, c'est ELLE que le
// build déploie : sans repointage, la garde suivante attendrait 20 minutes
// un déploiement du commit approuvé qui ne viendra jamais.
//
// CE BANC ÉPINGLAIT LE MÉCANISME DÉFECTUEUX, et son intention était juste — c'est
// ce qu'il exigeait qui ne marchait pas. Il demandait la présence de
// `GITHUB_SHA="$TETE"` : une affectation de variable SHELL, qui meurt avec le
// processus de l'étape. L'étape suivante gardait donc l'ancien SHA et pouvait
// refuser (cas « SAUTÉ ») un déploiement qu'elle venait de déclencher. Corrigé le
// 2026-09-13 : le report passe par `$GITHUB_ENV`, sous un nom propre plutôt qu'en
// écrasant `GITHUB_SHA` — deux faits distincts (le commit approuvé, le SHA
// attendu) méritent deux noms. Le banc épingle désormais le CANAL, seul capable de
// traverser la frontière d'étape, et son absence.
test('la tête acceptée est reportée vers l’étape suivante, par $GITHUB_ENV', () => {
  const bloc = JOBS.get('release');
  const debut = bloc.indexOf('Déclenchement du déploiement');
  const fin = bloc.indexOf('Release en one-off');
  assert.ok(debut > -1 && fin > debut, 'les ancres du déploiement ont bougé');
  const etape = bloc.slice(debut, fin);
  assert.match(
    etape,
    /SHA_ATTENDU="\$TETE"/,
    'la tête acceptée doit devenir le SHA attendu, pas rester le commit qu’elle a dépassé',
  );
  assert.match(
    etape,
    /echo "WN_SHA_ATTENDU=\$SHA_ATTENDU" >> "\$GITHUB_ENV"/,
    'sans écriture dans $GITHUB_ENV, le report meurt avec le processus de l’étape',
  );
  // Le chemin de sortie anticipée doit reporter AUSSI, sinon l'étape suivante
  // n'aurait aucune valeur à lire quand un déploiement existait déjà.
  const reports = etape.match(/WN_SHA_ATTENDU=\$SHA_ATTENDU" >> "\$GITHUB_ENV"/g) ?? [];
  assert.ok(
    reports.length >= 2,
    'chaque sortie de l’étape doit reporter le SHA attendu — y compris le `exit 0` anticipé',
  );
  // L'ORDRE, ET PAS SEULEMENT LA PRÉSENCE — trou mesuré le 2026-09-13 : déplacer
  // le report d'une ligne, AVANT le repointage, laissait ce banc vert alors que le
  // défaut rapporté était revenu à l'identique (le report écrivait le commit
  // approuvé, le repointage était perdu). Le dernier report de l'étape doit suivre
  // le repointage.
  assert.ok(
    etape.lastIndexOf('SHA_ATTENDU="$TETE"')
      < etape.lastIndexOf('echo "WN_SHA_ATTENDU=$SHA_ATTENDU" >> "$GITHUB_ENV"'),
    'le report doit suivre le repointage : posé avant, il écrit le commit approuvé et perd la tête',
  );
  // Et la garde suivante doit le LIRE, avec repli strict sur le commit approuvé.
  const garde = bloc.slice(bloc.indexOf('Garde — le commit attendu'));
  assert.match(
    garde,
    /ATTENDU="\$\{WN_SHA_ATTENDU:-\$GITHUB_SHA\}"/,
    'la garde doit lire le SHA attendu, et retomber sur le commit approuvé — jamais plus permissive',
  );
  // La comparaison elle-même doit porter sur le SHA ATTENDU. Sans ce cas, lire
  // `WN_SHA_ATTENDU` puis continuer à comparer `$GITHUB_SHA` passerait le banc.
  assert.match(
    garde,
    /\[ "\$DERNIER" = "\$ATTENDU" \]/,
    'la garde doit comparer le dernier déploiement au SHA ATTENDU',
  );
  assert.doesNotMatch(
    garde,
    /\[ "\$DERNIER" = "\$GITHUB_SHA" \]/,
    'la garde ne doit plus comparer le dernier déploiement au commit approuvé',
  );
});

// LE point de sûreté de D-102 : le pouvoir de déployer reste DERRIÈRE le gate
// humain. Déplacer ce déclenchement dans `resume` ferait gagner cinq minutes
// de build — et rendrait le jeton Scalingo atteignable sans approbation, ce
// que D-087 a précisément construit pour l'empêcher.
test('aucun job hors du gate ne déclenche de déploiement', () => {
  for (const [nom, bloc] of JOBS) {
    if (nom === 'release') continue;
    assert.doesNotMatch(
      bloc,
      /integration-link-manual-deploy|scalingo deploy/,
      `le job \`${nom}\` déclenche un déploiement hors de l'environnement protégé`,
    );
  }
});

// Les trois boucles d'attente cumulent ~35 minutes ; sans borne, un run
// suspendu occuperait le groupe de concurrence — et donc TOUTE release
// suivante — indéfiniment.
test('le job release est borné dans le temps', () => {
  assert.match(JOBS.get('release'), /^\s+timeout-minutes:\s*\d+\s*$/m);
});

// D-044 a élargi ce filtre, DÉLIBÉRÉMENT et à un seul chemin de plus. La borne
// n'a pas disparu, elle a changé de valeur : ce banc la tient à sa nouvelle
// valeur exacte. Élargir encore reste une décision, pas un geste de passage —
// chaque chemin ajouté fait proposer une release, donc demande une approbation
// humaine, à chaque push qui le touche.
test('le déclencheur automatique est borné à main et aux deux chemins décidés', () => {
  const bloc = /^on:\n([\s\S]*?)^concurrency:/m.exec(SOURCE);
  assert.ok(bloc, 'section `on:` introuvable');
  const declencheurs = bloc[1];
  assert.match(declencheurs, /^ {2}push:\s*$/m, 'le déclencheur `push` a disparu');
  assert.match(declencheurs, /^ {4}branches:\s*\[main\]\s*$/m, '`push` doit être borné à `main`');
  assert.match(
    declencheurs,
    /^ {6}- 'web\/prisma\/migrations\/\*\*'\s*$/m,
    'le filtre `paths` doit viser les migrations, seul chemin légitime de leur registre canonique',
  );
  // Sans ce chemin, le contrat de fraîcheur des claims — qui n'a de sens que
  // contre la production — ne démarrerait jamais seul : le LOT-01 ne porte
  // aucune migration. C'est le précédent D-015 (rejeu promis, jamais câblé).
  assert.match(
    declencheurs,
    /^ {6}- 'web\/src\/lib\/clinical\/\*\*'\s*$/m,
    "le filtre `paths` doit viser les tables de règles cliniques (D-044), sans quoi le contrat de fraîcheur des claims ne se rejoue jamais",
  );
  const chemins = declencheurs.match(/^ {6}- '.*'$/gm) ?? [];
  assert.equal(chemins.length, 2, `deux chemins attendus dans \`paths\`, trouvé ${chemins.length}`);
});

// Le commentaire de la section `on:` explique au relecteur ce que le filtre laisse
// passer. S'il nomme un autre chemin que celui réellement appliqué, il enseigne le
// faux à la seule personne qui relira ce fichier avant d'approuver une écriture en
// production. C'est arrivé dès la première rédaction : le commentaire disait
// `prisma/migrations/**` quand le filtre visait `web/prisma/migrations/**`.
test('le commentaire du déclencheur nomme le chemin réellement filtré', () => {
  const bloc = /^on:\n([\s\S]*?)^concurrency:/m.exec(SOURCE);
  const declencheurs = bloc[1];
  const chemins = [...declencheurs.matchAll(/^ {6}- '(.+)'$/gm)].map((m) => m[1]);
  assert.ok(chemins.length > 0, 'aucun chemin lisible dans `paths`');

  // Les spans sont relevés LIGNE PAR LIGNE : sur le texte entier, une regex
  // apparie la backtick fermante d'une citation avec l'ouvrante de la suivante et
  // capture la prose qui les sépare. Première rédaction de ce banc, et il rougissait
  // sur un fichier sain.
  // Depuis D-044 le filtre porte DEUX chemins : une citation doit être l'un
  // d'eux, pas « le » chemin. Un commentaire qui citerait un glob voisin mais
  // faux — `migrations/**` pour `web/prisma/migrations/**` — enseignerait le
  // faux à la seule personne qui relira ce fichier avant d'approuver une
  // écriture en production.
  const cites = declencheurs
    .split('\n')
    .filter((l) => /^\s*#/.test(l))
    .flatMap((l) => l.match(/`[^`]+`/g) ?? [])
    .filter((c) => c.includes('/**`'));

  assert.ok(cites.length > 0, 'le commentaire doit citer les chemins filtrés, pour que le relecteur sache');
  for (const cite of cites) {
    assert.ok(
      chemins.includes(cite.slice(1, -1)),
      `le commentaire cite ${cite}, qui n'est pas un des chemins filtrés (${chemins.join(', ')})`,
    );
  }

  // Chaque chemin réellement filtré est expliqué quelque part dans le
  // commentaire : en ajouter un en silence est précisément ce qu'un relecteur
  // ne doit pas avoir à découvrir en lisant le YAML.
  for (const chemin of chemins) {
    assert.ok(
      cites.includes(`\`${chemin}\``),
      `le chemin filtré \`${chemin}\` n'est expliqué par aucun commentaire`,
    );
  }
});

// ── GARDES AJOUTÉES LE 2026-09-13, APRÈS REVUE ──────────────────────────────
//
// Elles ferment ce qui restait VERT sous mutation. Chacune a été mesurée : la
// mutation correspondante fait rougir ce fichier, et ne le faisait pas avant.

// Un secret se cite AUSSI par `secrets['X']` et par `toJSON(secrets)`. La garde
// ne lisait que la forme pointée : `secrets['SCALINGO_API_TOKEN']` dans `resume`
// passait — et le contrôle des permissions, conditionné à la détection d'un
// jeton, était sauté par la même occasion. Le jeton qui écrit en production se
// serait retrouvé dans le job qui tourne AVANT l'approbation, banc vert.
test('`resume` : aucune forme de citation de secret n’échappe à la garde', () => {
  const bloc = JOBS.get('resume');
  assert.doesNotMatch(
    bloc,
    /secrets\s*\[/,
    "`resume` ne doit pas citer un secret par index (`secrets['X']`) — forme qui contournait la garde",
  );
  assert.doesNotMatch(
    bloc,
    /toJSON\s*\(\s*secrets/,
    '`toJSON(secrets)` verserait TOUS les secrets dans un job qui tourne avant l’approbation',
  );
  // INCONDITIONNEL, et c'est le point : le contrôle des permissions ne doit pas
  // dépendre de la détection d'un jeton, sans quoi une forme de citation non
  // reconnue désarmerait les deux gardes d'un seul coup.
  const permissions = bloc.match(/^\s+permissions:\n((?:\s+#[^\n]*\n|\s+\w+:\s*\S+\n)+)/m);
  assert.ok(
    permissions,
    '`resume` tourne avant l’approbation : il doit porter son propre bloc `permissions:`, pour ne pas hériter du workflow',
  );
  assert.doesNotMatch(
    permissions[1],
    /:\s*write\b|write-all/,
    '`resume` tourne avant l’approbation : aucune permission d’ÉCRITURE ne doit y être posée',
  );
});

// Le bloc de tête gouverne le job qui DÉTIENT le jeton Scalingo et lance des
// one-offs arbitraires en production. Un `contents: write` posé là lui donnerait
// un `GITHUB_TOKEN` capable d'écrire dans le dépôt et de piloter les runs — et le
// bloc propre de `resume` ne l'aurait pas empêché.
test('les permissions du WORKFLOW ne portent aucune écriture', () => {
  const tete = SOURCE.slice(0, SOURCE.indexOf('\njobs:'));
  const bloc = tete.match(/^permissions:\n((?:\s+#[^\n]*\n|\s+\w+:\s*\S+\n)+)/m);
  assert.ok(bloc, 'le workflow doit déclarer explicitement ses permissions, jamais hériter du défaut du dépôt');
  assert.doesNotMatch(
    bloc[1],
    /:\s*write\b|write-all/,
    'le job qui détient le jeton Scalingo hérite de ce bloc : aucune écriture ne doit y être posée',
  );
});

// Un accent grave dans une chaîne entre GUILLEMETS est une substitution de
// commande : `echo "… <accent>env-get<accent> …"` exécute `env-get`, et le message
// part mutilé. `bash -n` ne voit rien — la syntaxe est valide. Défaut réellement
// introduit puis corrigé le 2026-09-13, dans le message de la garde du drapeau.
test('aucun `echo "…"` ne contient d’accent grave non échappé', () => {
  const fautives = SOURCE.split('\n').filter((ligne) => {
    const m = ligne.match(/^\s*echo "(.*)"/);
    if (!m) return false;
    return /(^|[^\\])`/.test(m[1]);
  });
  assert.deepEqual(
    fautives,
    [],
    'accent grave non échappé dans un echo entre guillemets : bash y verrait une substitution de commande',
  );
});

// LA FORME DE LA REQUÊTE DE BORNE. Élargie à un autre workflow ou à une autre
// branche, la borne devient fausse et le résumé MENSONGER — et il affirme
// désormais « voici ce qui va partir », ce qui fait approuver.
test('la borne du résumé est cherchée sur CE workflow, sur main, et sur un run réussi', () => {
  const bloc = JOBS.get('resume');
  const requete = bloc.match(/"\/repos\/\$DEPOT\/actions\/workflows\/([^"]+)"/);
  assert.ok(requete, 'la requête de borne a disparu ou changé de forme');
  const cible = requete[1];
  assert.match(cible, /^release-db\.yml\/runs\?/, 'la borne doit venir des runs de CE workflow');
  assert.match(cible, /(^|[?&])status=success(&|$)/, 'une borne prise sur un run non réussi ne borne rien');
  assert.match(cible, /(^|[?&])branch=main(&|$)/, 'un run d’une autre branche ne dit rien de ce qui est appliqué');
  // Le repli EXISTE et doit rester : une borne illisible se dit, elle ne se devine pas.
  assert.match(bloc, /Borne inconnue/, 'le cas « borne illisible » doit rester dit à l’approbateur');
});

// LA GARDE CENTRALE DE D-087 côté déclenchement : une tête apportant des
// migrations que personne n'a approuvées doit ARRÊTER le déclenchement. Le banc
// d'origine vérifiait la présence de la comparaison, et un `exit 1` quelque part
// dans la tranche — satisfait par les autres refus. Remplacer CE refus par un
// `echo` laissait donc le banc vert.
test('la garde des migrations non approuvées porte son propre refus', () => {
  const bloc = JOBS.get('release');
  const debut = bloc.indexOf('Déclenchement du déploiement');
  const etape = bloc.slice(debut, bloc.indexOf('Release en one-off'));
  const garde = etape.indexOf('git diff --quiet "$GITHUB_SHA" "$TETE" -- web/prisma/migrations/');
  assert.ok(garde > -1, 'la comparaison des dossiers de migrations a disparu');
  // La tranche qui suit la comparaison, jusqu'au `fi` qui la ferme : le refus doit
  // vivre LÀ, pas ailleurs dans l'étape.
  const suite = etape.slice(garde, etape.indexOf('\n          fi', garde));
  assert.match(
    suite,
    /exit 1/,
    'une tête apportant des migrations non approuvées doit ARRÊTER le déclenchement, pas seulement le signaler',
  );
});
