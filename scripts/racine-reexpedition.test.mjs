import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { test } from 'node:test';

// LE package.json DE LA RACINE EST UN RÉEXPÉDITEUR, ET RIEN D'AUTRE.
//
// POURQUOI CE FICHIER EXISTE. Les paliers de validation ne sont définis que dans
// `web/package.json`. Lancés depuis la racine du dépôt — le répertoire courant
// habituel d'une session en worktree —, ils rendaient 254 avec « missing
// script », et une tâche de fond a rapporté ce 254 comme « exit code 0 ». La
// règle « T2 se lance depuis web/ » était écrite depuis des semaines : elle a
// mordu trois fois en deux jours, dont une à l'intérieur du handoff qui la
// décrivait. Une règle oubliée deux fois doit devenir exécutable.
//
// CE QUE CE BANC GARDE, ET POURQUOI CHAQUE POINT COMPTE :
//
// 1. AUCUNE DÉPENDANCE, AUCUN WORKSPACE. Une seule dépendance déclarée ici
//    ferait naître un `package-lock.json` à la racine au premier `npm install`,
//    et Next.js infère sa racine de traçage depuis le lockfile le plus proche :
//    le build changerait de périmètre sans que rien ne le dise. Un champ
//    `workspaces` ferait pire, en faisant gérer `web/` par la racine.
// 2. CHAQUE SCRIPT RÉEXPÉDIÉ EXISTE À DESTINATION. Un réexpéditeur qui pointe
//    vers un script supprimé rend « missing script » — exactement le défaut
//    qu'il est censé supprimer, déplacé d'un cran.
// 3. LA COMMANDE EST EXACTEMENT LA RÉEXPÉDITION, `--` FINAL COMPRIS. Sans ce
//    séparateur, `npm run test:worktree -- --fast` lancé à la racine devient
//    `npm --prefix web run test:worktree --fast` : npm AVALE le drapeau au lieu
//    de le transmettre, et la séquence COMPLÈTE tourne à la place de la rapide.
//    Le palier passe, mais pas celui qu'on a demandé — constaté le 2026-09-19,
//    et seul le libellé du journal le trahissait. Sans cette assertion, un
//    script de la racine pourrait aussi diverger de son homologue et faire
//    croire qu'on a lancé T1 quand on a lancé le lint. Un réexpéditeur qui ment
//    est pire que pas de réexpéditeur.

const ici = dirname(fileURLToPath(import.meta.url));
const racine = join(ici, '..');
const lire = chemin => JSON.parse(readFileSync(join(racine, chemin), 'utf8'));

const RACINE = lire('package.json');
const WEB = lire('web/package.json');

test('la racine ne déclare ni dépendance ni workspace', () => {
  assert.equal(RACINE.private, true, 'le paquet racine doit être privé');
  for (const champ of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies', 'workspaces']) {
    assert.equal(
      RACINE[champ],
      undefined,
      `le package.json racine ne doit porter aucun \`${champ}\` : un lockfile y naîtrait et Next.js changerait de racine de traçage`,
    );
  }
});

test('chaque script réexpédié existe dans web/package.json', () => {
  const scripts = Object.keys(RACINE.scripts ?? {});
  assert.ok(scripts.length > 0, 'le réexpéditeur doit porter au moins un script');
  for (const nom of scripts) {
    assert.ok(
      WEB.scripts?.[nom],
      `\`${nom}\` est réexpédié depuis la racine mais n'existe pas dans web/package.json`,
    );
  }
});

test('chaque script de la racine est EXACTEMENT une réexpédition, sans logique propre', () => {
  for (const [nom, commande] of Object.entries(RACINE.scripts ?? {})) {
    assert.equal(
      commande,
      `npm --prefix web run ${nom} --`,
      `\`${nom}\` doit réexpédier à l'identique : un script racine qui diverge de son homologue ferait croire qu'on a lancé le palier alors qu'on en a lancé un autre`,
    );
  }
});
