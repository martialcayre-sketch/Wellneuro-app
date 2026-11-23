// Banc de `scripts/wn-one-off-logs.mjs` : la sortie d'un one-off Scalingo
// ne se lit que pour SON conteneur, jamais pour un ancien porteur du même
// numéro (lot `autonomie-pieges-restes`, partie 12).
//
//   node --test scripts/wn-one-off-logs.test.mjs
//
// Journaux synthétiques, au format de `scalingo logs` relevé le 2026-11-23 ;
// aucune ligne de production.
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  SORTIE_ABSENT,
  SORTIE_AMBIGU,
  SORTIE_ARRETE,
  SORTIE_EN_COURS,
  SORTIE_USAGE,
  analyserArguments,
  executer,
  extraireExecution,
  instantDeLigne,
  lireManager,
} from './wn-one-off-logs.mjs';

const demarre = (h, c, id, cmd) => `2026-11-23 ${h} +0100 CET [manager] container [${c}] (${id}) started with the command '${cmd}'`;
const arrete = (h, c, id) => `2026-11-23 ${h} +0100 CET [manager] container [${c}] (${id}) has stopped`;
const sortie = (h, c, texte) => `2026-11-23 ${h} +0100 CET [${c}] ${texte}`;

// L'ancien porteur du numéro : démarré, sentinelle, arrêté — AVANT --depuis.
const ANCIEN = [
  demarre('06:00:00.100000000', 'one-off-635', 'aaa111', 'bash scripts/release-db-statut.sh'),
  sortie('06:00:05.000000000', 'one-off-635', 'WN_STATUT_DB_OK id=ancien'),
  arrete('06:00:09.000000000', 'one-off-635', 'aaa111'),
];
// Un voisin dont le nom commence pareil : le filtre de Scalingo l'attrape.
const VOISIN = [
  demarre('08:10:00.000000000', 'one-off-6351', 'ccc333', 'npm run tache'),
  sortie('08:10:02.000000000', 'one-off-6351', 'sortie du voisin'),
  arrete('08:10:04.000000000', 'one-off-6351', 'ccc333'),
];
const NOUVEAU_DEBUT = [
  demarre('08:10:01.000000000', 'one-off-635', 'bbb222', 'npx prisma migrate status'),
  sortie('08:10:03.500000000', 'one-off-635', 'Database schema is up to date!'),
];
const NOUVEAU_FIN = [arrete('08:10:06.000000000', 'one-off-635', 'bbb222')];
// --depuis lu avant le lancement : 08:09:30 à Paris = 07:09:30Z.
const DEPUIS = Date.parse('2026-11-23T07:09:30Z');
// Horloge des cas `--attendre` : bien après l'arrêt (délai de grâce échu).
const T0 = Date.parse('2026-11-23T08:00:00Z');
const journal = (...blocs) => blocs.flat().join('\n');
// Un réemploi du numéro APRÈS le nôtre, sous une autre commande.
const REEMPLOI = [
  demarre('09:00:00.000000000', 'one-off-635', 'fff666', 'npm run tache'),
  sortie('09:00:02.000000000', 'one-off-635', 'SORTIE_ETRANGERE'),
];

test('revue : un réemploi postérieur sous une autre commande borne la fenêtre, --commande compris', () => {
  const r = extraireExecution(journal(NOUVEAU_DEBUT, NOUVEAU_FIN, REEMPLOI), {
    conteneur: 'one-off-635',
    depuis: DEPUIS,
    commande: 'npx prisma migrate status',
  });
  assert.equal(r.etat, 'arrete');
  assert.deepEqual(r.lignes, [...NOUVEAU_DEBUT, ...NOUVEAU_FIN]);
});

test('revue : un réemploi dans la seconde qui suit notre arrêt est borné, malgré la tolérance', () => {
  const proche = [
    demarre('08:10:06.500000000', 'one-off-635', 'fff666', 'npm run tache'),
    sortie('08:10:06.800000000', 'one-off-635', 'SORTIE_ETRANGERE'),
  ];
  const r = extraireExecution(journal(NOUVEAU_DEBUT, NOUVEAU_FIN, proche), {
    conteneur: 'one-off-635',
    depuis: DEPUIS,
    commande: 'npx prisma migrate status',
  });
  assert.equal(r.etat, 'arrete');
  assert.deepEqual(r.lignes, [...NOUVEAU_DEBUT, ...NOUVEAU_FIN]);
});

test('revue : un réemploi postérieur sans arrêt lu du nôtre est ambigu', () => {
  const r = extraireExecution(journal(NOUVEAU_DEBUT, REEMPLOI), {
    conteneur: 'one-off-635',
    depuis: DEPUIS,
    commande: 'npx prisma migrate status',
  });
  assert.equal(r.etat, 'ambigu');
  assert.deepEqual(r.lignes, []);
});

test('revue : une sortie datée entre --depuis et le démarrage est comptée, jamais rendue', () => {
  const tot = sortie('08:10:00.999000000', 'one-off-635', 'ligne avant le démarrage');
  const r = extraireExecution(journal(tot, NOUVEAU_DEBUT, NOUVEAU_FIN), { conteneur: 'one-off-635', depuis: DEPUIS });
  assert.equal(r.etat, 'arrete');
  assert.equal(r.avantDemarrage, 1);
  assert.ok(!r.lignes.includes(tot));
});

test('revue : une ligne du même nom datée plus d’1 s après l’arrêt est écartée et comptée', () => {
  // Cas B (désordre à la frontière) et C (démarrage étranger illisible).
  const etrangere = sortie('08:59:59.900000000', 'one-off-635', 'SORTIE_ETRANGERE');
  const tardive = sortie('08:10:06.500000000', 'one-off-635', 'dernière ligne, tolérée');
  const illisible = '2026-11-23 09:00:00.000000000 +0100 CET [manager] container [one-off-635] (ZZZ) started with the command';
  const r = extraireExecution(journal(NOUVEAU_DEBUT, NOUVEAU_FIN, tardive, etrangere, illisible), {
    conteneur: 'one-off-635',
    depuis: DEPUIS,
  });
  assert.equal(r.etat, 'arrete');
  assert.ok(r.lignes.includes(tardive));
  assert.ok(!r.lignes.includes(etrangere));
  assert.equal(r.apresArret, 1);
});

test('revue : un arrêt de moins de 10 s ne vaut pas encore « complet »', () => {
  const arret = Date.parse('2026-11-23T07:10:06Z');
  const lire = (maintenant) =>
    extraireExecution(journal(NOUVEAU_DEBUT, NOUVEAU_FIN), { conteneur: 'one-off-635', depuis: DEPUIS, maintenant }).etat;
  assert.equal(lire(arret + 5_000), 'arret_recent');
  assert.equal(lire(arret + 10_000), 'arrete');
});

test('horodatage : fuseau de la ligne appliqué, fraction tronquée à la milliseconde', () => {
  assert.equal(instantDeLigne(sortie('08:10:03.500999999', 'one-off-1', 'x')), Date.parse('2026-11-23T07:10:03.500Z'));
  assert.equal(instantDeLigne('! Your Scalingo client is out-of-date'), null);
});

test('ligne [manager] : identifiant, événement et commande lus', () => {
  assert.deepEqual(lireManager(demarre('08:00:00.0', 'one-off-7', 'abc', "npm run x -- 'a'")), {
    conteneur: 'one-off-7',
    id: 'abc',
    evenement: 'demarrage',
    commande: "npm run x -- 'a'",
  });
  assert.equal(lireManager(arrete('08:00:00.0', 'one-off-7', 'abc')).evenement, 'arret');
  assert.equal(lireManager(sortie('08:00:00.0', 'one-off-7', '[manager] container [one-off-7] (abc) has stopped')), null);
});

test('le piège : seul l’ancien porteur du numéro est dans la fenêtre — rien n’est rendu', () => {
  const r = extraireExecution(journal(ANCIEN), { conteneur: 'one-off-635', depuis: DEPUIS });
  assert.equal(r.etat, 'absent');
  assert.deepEqual(r.lignes, []);
  assert.equal(r.ecartees, 3);
});

test('ancien porteur, voisin de préfixe et nouveau conteneur : seul le nouveau est rendu', () => {
  const r = extraireExecution(journal(ANCIEN, VOISIN, NOUVEAU_DEBUT, NOUVEAU_FIN), { conteneur: 'one-off-635', depuis: DEPUIS });
  assert.equal(r.etat, 'arrete');
  assert.equal(r.id, 'bbb222');
  assert.deepEqual(r.lignes, [...NOUVEAU_DEBUT, ...NOUVEAU_FIN]);
  assert.ok(!r.lignes.some((l) => l.includes('ancien') || l.includes('voisin')));
});

test('démarré sans arrêt : en cours, sortie partielle', () => {
  const r = extraireExecution(journal(ANCIEN, NOUVEAU_DEBUT), { conteneur: 'one-off-635', depuis: DEPUIS });
  assert.equal(r.etat, 'en_cours');
  assert.deepEqual(r.lignes, NOUVEAU_DEBUT);
});

test('l’arrêt d’un autre identifiant au même numéro ne clôt pas le conteneur retenu', () => {
  const faux = arrete('08:10:05.000000000', 'one-off-635', 'ddd444');
  const r = extraireExecution(journal(NOUVEAU_DEBUT, faux), { conteneur: 'one-off-635', depuis: DEPUIS });
  assert.equal(r.etat, 'en_cours');
  assert.ok(!r.lignes.includes(faux));
});

test('deux démarrages du numéro depuis --depuis : ambigu, rien rendu', () => {
  const second = demarre('08:20:00.000000000', 'one-off-635', 'eee555', 'npx prisma migrate status');
  const r = extraireExecution(journal(NOUVEAU_DEBUT, NOUVEAU_FIN, second), { conteneur: 'one-off-635', depuis: DEPUIS });
  assert.equal(r.etat, 'ambigu');
  assert.deepEqual(r.lignes, []);
});

test('--commande : un démarrage d’une autre commande est écarté, et ses lignes avec', () => {
  // --depuis pris trop tôt : l'ancien porteur tombe dans la fenêtre.
  const tot = Date.parse('2026-11-23T04:00:00Z');
  const sans = extraireExecution(journal(ANCIEN, NOUVEAU_DEBUT, NOUVEAU_FIN), { conteneur: 'one-off-635', depuis: tot });
  assert.equal(sans.etat, 'ambigu');
  const avec = extraireExecution(journal(ANCIEN, NOUVEAU_DEBUT, NOUVEAU_FIN), {
    conteneur: 'one-off-635',
    depuis: tot,
    commande: 'npx prisma migrate status',
  });
  assert.equal(avec.etat, 'arrete');
  assert.deepEqual(avec.lignes, [...NOUVEAU_DEBUT, ...NOUVEAU_FIN]);
  const autre = extraireExecution(journal(ANCIEN), { conteneur: 'one-off-635', depuis: tot, commande: 'npx prisma migrate status' });
  assert.equal(autre.etat, 'absent');
  assert.match(autre.motif, /autre commande/);
});

test('arguments : --depuis obligatoire, avec fuseau ; conteneur au format one-off-N', () => {
  assert.match(analyserArguments(['one-off-1']).erreur, /--depuis est obligatoire/);
  assert.match(analyserArguments(['one-off-1', '--depuis', '2026-11-23T08:00:00']).erreur, /fuseau/);
  assert.match(analyserArguments(['web-1', '--depuis', '2026-11-23T08:00:00Z']).erreur, /one-off-N/);
  assert.match(analyserArguments(['one-off-1', '--depuis', '2026-11-23T08:00:00Z', '--inconnu']).erreur, /inconnu/);
  assert.match(analyserArguments(['one-off-1', '--depuis', '2026-11-23T08:00:00Z', '-n', '0']).erreur, /-n/);
  const { options } = analyserArguments(['one-off-1', '--depuis', '2026-11-23T09:00:00+01:00', '--commande', '--version']);
  assert.equal(options.depuisMs, Date.parse('2026-11-23T08:00:00Z'));
  assert.equal(options.commande, '--version');
});

test('CLI : codes de sortie sur un journal lu par --entree', async () => {
  const dossier = mkdtempSync(join(tmpdir(), 'wn-one-off-logs-'));
  const ecrire = (nom, texte) => {
    const f = join(dossier, nom);
    writeFileSync(f, texte);
    return f;
  };
  const base = ['one-off-635', '--depuis', '2026-11-23T07:09:30Z', '--entree'];
  const cas = [
    [journal(ANCIEN, VOISIN, NOUVEAU_DEBUT, NOUVEAU_FIN), SORTIE_ARRETE],
    [journal(ANCIEN, NOUVEAU_DEBUT), SORTIE_EN_COURS],
    [journal(ANCIEN), SORTIE_ABSENT],
    [journal(NOUVEAU_DEBUT, demarre('08:30:00.0', 'one-off-635', 'fff', 'x')), SORTIE_AMBIGU],
  ];
  for (const [i, [texte, attendu]] of cas.entries()) {
    const { code, lignes } = await executer([...base, ecrire(`j${i}.log`, texte)]);
    assert.equal(code, attendu, lignes.join('\n'));
    assert.ok(!lignes.some((l) => l.includes('WN_STATUT_DB_OK id=ancien')), 'jamais la sortie de l’ancien porteur');
  }
  assert.equal((await executer(['one-off-635', '--depuis', 'hier'])).code, SORTIE_USAGE);
  assert.equal((await executer([...base, join(dossier, 'absent.log')])).code, SORTIE_USAGE);
});

test('--attendre : relit jusqu’à l’arrêt, puis rend la sortie complète', async () => {
  const lectures = [journal(ANCIEN), journal(ANCIEN, NOUVEAU_DEBUT), journal(ANCIEN, NOUVEAU_DEBUT, NOUVEAU_FIN)];
  let n = 0;
  let horloge = 0;
  const { code, lignes } = await executer(['one-off-635', '--depuis', '2026-11-23T07:09:30Z', '--attendre', '60'], {
    lire: () => lectures[Math.min(n++, lectures.length - 1)],
    pause: async (ms) => {
      horloge += ms;
    },
    maintenant: () => T0 + horloge,
  });
  assert.equal(code, SORTIE_ARRETE);
  assert.equal(n, 3);
  assert.ok(lignes.includes(NOUVEAU_FIN[0]));
});

test('--attendre échu sans démarrage : absent, rien rendu', async () => {
  let horloge = 0;
  const { code } = await executer(['one-off-635', '--depuis', '2026-11-23T07:09:30Z', '--attendre', '30'], {
    lire: () => journal(ANCIEN),
    pause: async (ms) => {
      horloge += ms;
    },
    maintenant: () => T0 + horloge,
  });
  assert.equal(code, SORTIE_ABSENT);
});
