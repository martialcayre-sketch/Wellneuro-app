import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

// LA VERSION DE CONSIGNE ÉCRITE DANS LES DOCUMENTS DOIT ÊTRE CELLE QUI EST
// LIVRÉE — et rien ne le vérifiait.
//
// POURQUOI CE BANC EXISTE, littéralement. Le couple version/empreinte est
// verrouillé DANS LE CODE depuis longtemps (`promptAlimentaire.guard.test.ts`) :
// toute édition de la consigne fait rougir tant que `VERSION_PROMPT_SYNTHESE` et
// l'empreinte n'ont pas été reportés ensemble. Ce garde-là tient.
//
// Ce qu'il ne voit pas, c'est le TEXTE OPPOSABLE : `docs/DECISIONS.md` et les
// fragments `changelog.d/`. Le 2026-08-12, la consigne a été reprise quatre fois
// dans un même lot ; à chaque reprise, la version citée dans les documents est
// restée derrière. Trois revues successives ont relevé le même défaut, sous
// trois formes : un fragment nommé d'après une version périmée, puis une
// empreinte qui ne correspondait à aucun texte du dépôt, puis deux fragments du
// même lot qui se contredisaient pendant qu'une entrée de registre citait
// encore l'avant-dernière version.
//
// Une règle oubliée deux fois doit devenir exécutable ; celle-ci l'a été trois.
// La réécrire une quatrième fois dans un handoff ne la ferait pas tenir.
//
// CE QUE CE BANC NE FAIT PAS : il ne contrôle pas les archives. Un handoff ou
// une entrée de registre ancienne qui cite `synthese-v19` dit vrai — elle décrit
// ce qui était livré ce jour-là. Seuls sont contrôlés les fragments
// `changelog.d/` NON PUBLIÉS (ce qui part dans la prochaine version) et les
// entrées de registre qui se donnent elles-mêmes pour la description du livré.

const ICI = path.dirname(fileURLToPath(import.meta.url));
const RACINE = path.resolve(ICI, '..');

const SOURCE_VERSION = path.join(RACINE, 'web/src/lib/anthropic.ts');
const DOSSIER_FRAGMENTS = path.join(RACINE, 'changelog.d');
const GARDE_EMPREINTE = path.join(
  RACINE,
  'web/src/app/api/praticien/synthese/promptAlimentaire.guard.test.ts',
);

function versionLivree() {
  const source = fs.readFileSync(SOURCE_VERSION, 'utf8');
  const trouve = source.match(/^export const VERSION_PROMPT_SYNTHESE = '(synthese-v\d+)';/m);
  assert.ok(trouve, 'VERSION_PROMPT_SYNTHESE introuvable — ce banc ne lit plus la bonne source.');
  return trouve[1];
}

/** L'empreinte que le garde du couple épingle aujourd'hui. */
function empreinteEpinglee() {
  const source = fs.readFileSync(GARDE_EMPREINTE, 'utf8');
  const trouve = source.match(/^const EMPREINTE_V\d+ = '([0-9a-f]{16})';/m);
  assert.ok(trouve, 'constante d’empreinte introuvable — ce banc ne lit plus la bonne source.');
  return trouve[1];
}

/** Les fragments non publiés, hors README de convention. */
function fragments() {
  if (!fs.existsSync(DOSSIER_FRAGMENTS)) return [];
  return fs
    .readdirSync(DOSSIER_FRAGMENTS)
    .filter(nom => nom.endsWith('.md') && nom !== 'README.md')
    .map(nom => ({ nom, texte: fs.readFileSync(path.join(DOSSIER_FRAGMENTS, nom), 'utf8') }));
}

const numero = version => Number(version.replace('synthese-v', ''));

/**
 * La version la plus haute citée dans un texte, ou `null`.
 *
 * POURQUOI LE MAXIMUM, ET NON CHAQUE OCCURRENCE. Citer une version antérieure
 * est légitime et fréquent : « la v21 s'était contredite », « bump depuis la
 * v22 » — c'est même ce qui rend un fragment lisible. Les fragments des lots
 * précédents, eux, citent la version de leur époque et disent vrai.
 *
 * Ce qui ne peut pas être vrai, c'est qu'un document DOCUMENTE un bump et que
 * la plus haute version qu'il nomme soit inférieure à celle qui est livrée : le
 * document décrit alors un état que le code a dépassé. C'est exactement la
 * forme des trois oublis du 2026-08-12.
 */
function versionMaxCitee(texte) {
  const citees = texte.match(/synthese-v\d+/g) ?? [];
  if (citees.length === 0) return null;
  return citees.reduce((haute, c) => (numero(c) > numero(haute) ? c : haute));
}

/**
 * Les fragments du lot en cours : ceux qui portent la date la plus récente.
 *
 * POURQUOI CE BORNAGE. `changelog.d/` accumule tout ce qui n'est pas encore
 * parti en version — des fragments du 2026-07-28 y côtoient ceux du jour. Un
 * fragment de juillet qui écrit « `synthese-v8`, empreinte … » dit VRAI : il
 * décrit ce qui était livré ce jour-là, et le réécrire à chaque bump
 * falsifierait l'histoire. Ce qui doit être à jour, c'est ce que le lot en
 * cours affirme de lui-même.
 *
 * Limite assumée, et nommée : un lot qui s'étale sur deux jours ne voit
 * contrôler que les fragments du second. Le cas ne s'est pas présenté, et
 * élargir la fenêtre reviendrait à recontrôler des fragments anciens.
 */
function fragmentsDuJour() {
  const tous = fragments()
    .map(f => ({ ...f, date: f.nom.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '' }))
    .filter(f => f.date !== '');
  const plusRecente = tous.map(f => f.date).sort().at(-1) ?? '';
  return tous.filter(f => f.date === plusRecente);
}

test('un fragment du jour ne reste pas derrière la version de consigne livrée', () => {
  const livree = versionLivree();
  const fautifs = [];
  for (const { nom, texte } of fragmentsDuJour()) {
    const max = versionMaxCitee(texte);
    // Un fragment qui ne parle pas du tout de la consigne n'a rien à dire ici ;
    // un fragment qui en parle et dont le maximum est sous la version livrée
    // décrit un état que le code a dépassé. Le départage : se donne-t-il pour
    // la description du livré ?
    if (max === null || numero(max) >= numero(livree)) continue;
    const parleDeLivraison = texte
      .split('\n')
      .filter(l => l.includes(max))
      .some(l => /empreinte|livré|livrée|version servie|couple/i.test(l));
    if (parleDeLivraison) fautifs.push(`${nom} → ${max} (livrée : ${livree})`);
  }
  assert.deepEqual(
    fautifs,
    [],
    'fragment(s) présentant une version de consigne périmée comme celle qui est livrée — '
      + 'reporter la version ET l’empreinte, comme le couple l’exige déjà dans le code.',
  );
});

test('une empreinte citée à côté de la version livrée est la bonne', () => {
  // Le cas exact du 2026-08-12 : `d8c2285272df3ab6` est resté écrit dans un
  // fragment alors qu'aucun texte du dépôt ne rend cette empreinte. Une
  // empreinte fausse est pire qu'absente — elle donne la traçabilité pour
  // acquise au moment précis où on en a besoin.
  //
  // Bornage : seules comptent les empreintes citées AVEC la version livrée. Un
  // fragment ancien porte l'empreinte de son époque et dit vrai.
  const livree = versionLivree();
  const attendue = empreinteEpinglee();
  const fautifs = [];
  for (const { nom, texte } of fragments()) {
    for (const bloc of texte.split(/\n\s*\n/)) {
      if (!bloc.includes(livree)) continue;
      for (const citee of new Set(bloc.match(/\b[0-9a-f]{16}\b/g) ?? [])) {
        if (citee !== attendue) fautifs.push(`${nom} → ${citee} (épinglée : ${attendue})`);
      }
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    'fragment(s) citant, à côté de la version livrée, une empreinte qui ne correspond à '
      + 'aucun texte du dépôt.',
  );
});

test('les décisions du jour ne citent pas une version de consigne périmée', () => {
  // Bornage aux entrées DU JOUR — celles qui portent la date la plus récente du
  // registre. Le registre est append-only : une entrée ancienne qui cite
  // `synthese-v15` décrit ce qui était livré ce jour-là et dit vrai. Une entrée
  // écrite aujourd'hui, en revanche, décrit le livré d'aujourd'hui, et c'est
  // elle qui est opposable (`DC-17`, `DC-18`).
  const livree = versionLivree();
  const registre = fs.readFileSync(path.join(RACINE, 'docs/DECISIONS.md'), 'utf8');

  const entrees = [];
  const titres = [...registre.matchAll(/^### (D-\d{3}) — .*$/gm)];
  for (let i = 0; i < titres.length; i += 1) {
    const debut = titres[i].index;
    const fin = i + 1 < titres.length ? titres[i + 1].index : registre.length;
    const corps = registre.slice(debut, fin);
    const date = corps.match(/^- Date : (\d{4}-\d{2}-\d{2})/m)?.[1] ?? '';
    entrees.push({ id: titres[i][1], corps, date });
  }
  const plusRecente = entrees.map(e => e.date).sort().at(-1) ?? '';

  const fautifs = [];
  for (const { id, corps, date } of entrees) {
    if (date !== plusRecente) continue;
    const max = versionMaxCitee(corps);
    if (max !== null && numero(max) < numero(livree)) {
      fautifs.push(`${id} → ${max} (livrée : ${livree})`);
    }
  }
  assert.deepEqual(
    fautifs,
    [],
    'décision(s) du jour citant une version de consigne périmée — le registre est ce qui '
      + 'est opposable, il ne peut pas être en retard sur le code.',
  );
});

test('ce banc peut rougir — la détection ne dépend pas d’un fichier absent', () => {
  // Garde d'anti-inertie : les trois tests ci-dessus passent trivialement si
  // `changelog.d/` est vide ou si les regex ne matchent plus rien. On vérifie
  // donc que les deux sources existent et que la version a bien la forme
  // attendue.
  assert.match(versionLivree(), /^synthese-v\d+$/);
  assert.match(empreinteEpinglee(), /^[0-9a-f]{16}$/);
});
