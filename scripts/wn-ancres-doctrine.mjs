#!/usr/bin/env node
// Contrôle des ANCRES TEXTUELLES du corpus doctrinal — [[D-100]], LOT-10.
//
// CE QU'IL VÉRIFIE, ET CE QU'IL NE FERA JAMAIS. Il vérifie qu'un texte cité
// existe encore dans le fichier cité. Il ne fait AUCUNE arithmétique de ligne,
// et c'est le point de tout le lot : le contrôle qu'on écrirait spontanément —
// « le fichier existe, la ligne est dans les bornes » — a été mesuré le
// 2026-08-23 sur les 236 citations `fichier:ligne` du corpus. Il rendait 0
// introuvable et 2 hors bornes, et surtout : les huit citations que le LOT-09
// avait faussées en décalant un fichier de onze lignes étaient TOUTES dans les
// bornes. Ce contrôle-là garde contre la suppression d'un fichier, jamais
// contre la dérive — c'est-à-dire contre le seul défaut réellement observé.
//
// POURQUOI UN LIEN, ET PAS UN VERBATIM POSÉ À CÔTÉ. La première mesure du
// LOT-10 attribuait chaque verbatim à l'ancre la plus proche à sa gauche. Elle
// a ainsi déclaré morte `drapeauxAnamnese.ts:28` en lui imputant le libellé
// « Difficultés à avaler » — qui appartient à l'ancre VOISINE
// (`anamnese.ts:110-119`) et s'y trouve toujours. Une détection par proximité
// invente des morts. La convention lie donc l'ancre et son texte dans un SEUL
// jeton syntaxique — un lien markdown —, où l'attribution ne se devine pas.
//
// CE QUI EST GRANDFATHERED, ET LE DIT. Une citation de l'ancienne forme
// (`chemin:ligne` en code span) n'est pas fautive : elle n'est simplement pas
// ancrée. Le contrôle la COMPTE et ne la juge pas. Réécrire les 236 coûterait
// plus que le trou, et noierait sous du diff de doc le contrôle qui les
// accompagne.
//
// Usage : node scripts/wn-ancres-doctrine.mjs [--json]

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Les fichiers dont les citations sont contrôlées.
 *
 * Le périmètre est celui que la convention déclare — corpus doctrinal et
 * registre des décisions. L'élargir sans écrire la convention ailleurs ferait
 * rougir sur des documents dont personne n'a accepté la règle.
 */
const PERIMETRE = ['docs/claude/doctrine', 'docs/DECISIONS.md'];

/** Longueur minimale d'un verbatim : en dessous, il n'ancre rien. */
const VERBATIM_MINIMUM = 3;

/** Marques d'élision : un texte élidé ne se vérifie pas littéralement. */
const ELISIONS = ['[…]', '[...]', '…', '...'];

function fichiersMarkdown(racine, chemin) {
  const absolu = join(racine, chemin);
  let infos;
  try {
    infos = statSync(absolu);
  } catch {
    return [];
  }
  if (infos.isFile()) return chemin.endsWith('.md') ? [chemin] : [];
  return readdirSync(absolu, { withFileTypes: true }).flatMap(e => (
    e.isDirectory()
      ? fichiersMarkdown(racine, join(chemin, e.name))
      : e.name.endsWith('.md') ? [join(chemin, e.name)] : []
  ));
}

/**
 * Le texte d'une ancre, débarrassé de sa décoration de rendu.
 *
 * Guillemets français, code spans et emphase markdown ne font pas partie de ce
 * qui est cité : ils habillent la citation. Les retirer est ce qui permet
 * d'écrire une ancre lisible sans la rendre invérifiable — c'est précisément
 * le faux positif qu'a produit la mesure du 2026-08-23 sur [[D-097]], dont la
 * citation portait du gras.
 */
export function texteAncre(brut) {
  let texte = brut.trim();
  // Emphase d'abord : elle peut envelopper les guillemets aussi bien que
  // l'inverse, et deux passes suffisent à couvrir les deux ordres.
  for (let i = 0; i < 2; i++) {
    texte = texte.trim();
    for (const [ouvre, ferme] of [['«', '»'], ['**', '**'], ['*', '*'], ['_', '_'], ['`', '`']]) {
      if (texte.length > ouvre.length + ferme.length
        && texte.startsWith(ouvre) && texte.endsWith(ferme)) {
        texte = texte.slice(ouvre.length, texte.length - ferme.length);
      }
    }
  }
  return texte.trim();
}

/** Le chemin visé, sans son ancre de ligne décorative (`#L769`). */
export function cibleSansLigne(cible) {
  return cible.replace(/#L\d+(-L?\d+)?$/, '');
}

/**
 * Le source, ses blocs de code clôturés vidés de leur contenu.
 *
 * UN DOCUMENT QUI EXPLIQUE LA RÈGLE NE DOIT PAS ÊTRE JUGÉ PAR ELLE : la
 * convention, dans le README de ce dossier, MONTRE la forme d'une ancre sur un
 * exemple. Sans cette neutralisation, ces exemples étaient contrôlés — et
 * rougissaient, puisqu'ils citent « le texte exact, recopié », qui n'existe
 * évidemment dans aucun fichier. Trouvé au premier passage du contrôle sur le
 * corpus réel.
 *
 * Le contenu est remplacé par des espaces, pas supprimé : les décalages sont
 * préservés, donc les numéros de ligne rapportés restent justes.
 */
export function neutraliserBlocsDeCode(source) {
  return source.replace(/^```[^\n]*\n[\s\S]*?^```/gm, bloc => (
    bloc.split('\n').map((ligne, i, lignes) => (
      i === 0 || i === lignes.length - 1 ? ligne : ' '.repeat(ligne.length)
    )).join('\n')
  ));
}

/**
 * Les constats d'un fichier markdown.
 *
 * `conformes` : ancres vérifiées et justes. `violations` : ancres de la
 * convention qui ne tiennent plus, ou qu'on ne peut pas vérifier. `heritees` :
 * citations `chemin:ligne` de l'ancienne forme — comptées, jamais jugées.
 */
export function analyser(racine, chemin, lire = p => readFileSync(join(racine, p), 'utf8')) {
  const source = neutraliserBlocsDeCode(lire(chemin));
  const conformes = [];
  const violations = [];

  // Un lien markdown dont la cible ressemble à un chemin du dépôt.
  //
  // LE TEXTE ADMET LES DEUX JETONS D'ÉLISION, ET RIEN D'AUTRE ENTRE CROCHETS.
  // Deux rédactions ont échoué avant celle-ci, chacune corrigée par le banc :
  //
  //   1. `[^\]]+` — le lien `[« début […] fin »](…)` n'était pas reconnu, donc
  //      pas contrôlé, donc silencieusement dispensé. Il suffisait d'élider une
  //      citation fausse pour échapper au contrôle censé refuser les élisions.
  //   2. `(?:[^\]]|\](?!\())+` — en admettant tout `]`, le texte franchissait
  //      les renvois `[[D-xxx]]` et avalait des paragraphes entiers jusqu'au
  //      prochain `](chemin)`. Sur le corpus réel : une « ancre » de 51 000
  //      caractères, et un rapport JSON de 400 Ko.
  //
  // La forme retenue n'ouvre que ce qu'il fallait ouvrir, et interdit le saut
  // de ligne — un texte d'ancre tient sur une ligne.
  const liens = source.matchAll(
    /\[((?:[^\]\n]|\[…\]|\[\.\.\.\])+)\]\(((?:web|scripts|prisma|docs|\.claude)\/[^)\s]+)\)/g,
  );

  for (const lien of liens) {
    const [, brut, cibleBrute] = lien;
    const cible = cibleSansLigne(cibleBrute);
    // TEXTE ÉGAL À LA CIBLE : ce n'est pas une ancre, c'est une référence de
    // fichier. Le corpus en compte 48 et elles sont légitimes ; les contrôler
    // reviendrait à chercher le chemin DANS le fichier.
    if (brut.trim() === cibleBrute || brut.trim() === cible) continue;

    const ligne = source.slice(0, lien.index).split('\n').length;
    const situe = `${chemin}:${ligne}`;
    const texte = texteAncre(brut);

    if (ELISIONS.some(marque => texte.includes(marque))) {
      violations.push({ situe, cible, texte: brut, motif: 'verbatim élidé : une citation coupée ne se vérifie pas' });
      continue;
    }
    if (texte.length < VERBATIM_MINIMUM) {
      violations.push({ situe, cible, texte: brut, motif: `verbatim trop court (< ${VERBATIM_MINIMUM} caractères) : il n’ancre rien` });
      continue;
    }

    let contenu;
    try {
      contenu = lire(cible);
    } catch {
      violations.push({ situe, cible, texte, motif: 'fichier cité introuvable' });
      continue;
    }
    if (contenu.includes(texte)) conformes.push({ situe, cible, texte });
    else violations.push({ situe, cible, texte, motif: 'le texte cité n’existe plus dans le fichier cité' });
  }

  // L'ancienne forme, comptée pour que le grandfathering soit un CHIFFRE et
  // non une intention : `chemin.ext:12` ou `chemin.ext:12-18`, en code span.
  const heritees = [...source.matchAll(/`[A-Za-z0-9_./-]+\.[a-z]+:\d+(?:-\d+)?`/g)].length;

  return { conformes, violations, heritees };
}

function principal() {
  const racine = process.cwd();
  const json = process.argv.includes('--json');
  const fichiers = PERIMETRE.flatMap(p => fichiersMarkdown(racine, p));

  let conformes = 0;
  let heritees = 0;
  const violations = [];
  for (const fichier of fichiers) {
    const r = analyser(racine, fichier);
    conformes += r.conformes.length;
    heritees += r.heritees;
    violations.push(...r.violations);
  }

  if (json) {
    process.stdout.write(`${JSON.stringify({ conformes, heritees, violations }, null, 2)}\n`);
    return violations.length === 0 ? 0 : 1;
  }

  if (violations.length === 0) {
    process.stdout.write(
      `OK : ${conformes} ancre(s) textuelle(s) vérifiée(s), ${heritees} citation(s) de l’ancienne forme non jugée(s).\n`,
    );
    return 0;
  }

  process.stderr.write(`\nANCRES ROMPUES : ${violations.length}\n`);
  for (const v of violations) {
    process.stderr.write(`  ✗ ${v.situe} → ${v.cible}\n      ${v.motif}\n      texte : ${v.texte}\n`);
  }
  process.stderr.write(
    '\nUne ancre se répare en corrigeant le TEXTE cité, jamais en effaçant la\n'
    + 'citation : si le texte a disparu du fichier, c’est le fait que la\n'
    + 'citation rapportait qui a changé, et cela se relit avant de se réécrire.\n\n',
  );
  return 1;
}

// Exécuté directement, jamais à l'import — le banc importe les fonctions pures.
if (process.argv[1] && process.argv[1].endsWith('wn-ancres-doctrine.mjs')) {
  process.exit(principal());
}
