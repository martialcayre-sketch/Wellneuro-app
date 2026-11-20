// Bancs de la décision de passe (`D-540` §10 (2), amendée le 2026-11-20).
// Fixtures neutres : identifiants de lots inventés, aucune donnée de registre
// réelle.

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  aParis,
  analyserArguments,
  decider,
  lireExport,
  principal,
  PLAFOND_JOUR,
  SORTIE_ARRET,
  SORTIE_PRENDRE,
  SORTIE_RIEN,
  SORTIE_USAGE,
} from './wn-orchestrateur-passe.mjs';

// 2026-11-20 à 10:00 à Paris (UTC+1).
const MAINTENANT = Date.parse('2026-11-20T09:00:00Z');
const ilYa = (min) => new Date(MAINTENANT - min * 60000).toISOString();

const lot = (id, extra = {}) => ({ id, file: 'D', etat: 'pret', ordre: 10, apres: '', lieu: 'cloud', nature: 'ordinaire', risque: 'P2', branche: '', handoff: '', pr: '', ...extra });
const etat = (extra = {}) => ({ lots: [], intentions: [], journal: [], arret: { arret: false }, lectureSure: true, ...extra });
const d = (e, t = MAINTENANT, o = {}) => decider(e, t, o);

test('lot neuf sans branche ni handoff : il est pris', () => {
  const r = d(etat({ lots: [lot('lot-a')] }));
  assert.equal(r.sortie, SORTIE_PRENDRE);
  assert.equal(r.lot, 'lot-a');
});

test('ordre du carnet et `apres` respectés', () => {
  const lots = [lot('lot-b', { ordre: 20 }), lot('lot-a', { ordre: 10, apres: 'lot-z' }), lot('lot-z', { etat: 'pris', lieu: 'mac', pr: '#1' })];
  assert.equal(d(etat({ lots })).lot, 'lot-b', 'lot-a attend lot-z, qui n’est pas fait');
  lots[2].etat = 'fait';
  assert.equal(d(etat({ lots })).lot, 'lot-a');
});

test('interrupteur : seul le booléen false ouvre', () => {
  for (const arret of [undefined, null, {}, { arret: 'false' }, { arret: null }, { arret: 0 }, { arret: true }]) {
    const r = d(etat({ lots: [lot('lot-a')], arret }));
    assert.equal(r.sortie, SORTIE_ARRET, JSON.stringify(arret));
    assert.equal(r.code, 'interrupteur_ferme');
    assert.deepEqual(r.signalements, [], 'interrupteur fermé : aucun signal');
  }
});

test('lecture douteuse : arrêt, rien de pris', () => {
  const r = d(etat({ lots: [lot('lot-a')], lectureSure: false }));
  assert.equal(r.sortie, SORTIE_ARRET);
  assert.equal(r.code, 'lecture_douteuse');
  for (const i of [{ lot: 'lot-x', etat: 'echeance', cree_le: ilYa(60) }, { lot: 'lot-x', etat: 'prise', cree_le: 'hier' }]) {
    const x = d(etat({ lots: [lot('lot-a')], intentions: [i] }));
    assert.equal(x.code, 'lecture_douteuse', 'intention d’état inconnu ou sans heure lisible');
  }
});

test('voie Mac : lieu, nature, risque, champ malformé — dans le doute, le Mac', () => {
  const cas = [
    [lot('lot-a', { lieu: undefined }), 'lieu'],
    [lot('lot-a', { lieu: 'Cloud' }), 'lieu'],
    [lot('lot-a', { nature: 'clinique' }), 'nature'],
    [lot('lot-a', { nature: undefined }), 'nature'],
    [lot('lot-a', { risque: 'P0' }), 'risque'],
    [lot('lot-a', { risque: undefined }), 'risque'],
    [lot('lot-a', { branche: 'Mauvaise Branche' }), 'controle_branche'],
    [lot('lot-a', { handoff: '../../etc/passwd' }), 'controle_handoff'],
    [lot('Lot_A'), 'controle_identifiant'],
  ];
  for (const [l, motif] of cas) {
    const r = d(etat({ lots: [l] }));
    assert.equal(r.sortie, SORTIE_RIEN, motif);
    assert.equal(r.code, 'aucun_lot_lancable');
    assert.deepEqual(r.motifs, [{ lot: l.id, motif }]);
    assert.deepEqual(r.signalements.map((s) => s.motif), ['voie_mac']);
  }
});

test('lot clinique `pret` déclaré cloud : jamais pris, signalé une seule fois', () => {
  const lots = [lot('lot-clinique', { nature: 'clinique' }), lot('lot-b', { ordre: 20 })];
  const r1 = d(etat({ lots }));
  assert.equal(r1.lot, 'lot-b', 'la passe saute le lot de la voie Mac');
  assert.deepEqual(r1.signalements, [{ lot: 'lot-clinique', file: 'D', motif: 'voie_mac', detail: 'nature' }]);
  const r2 = d(etat({ lots, journal: [{ debut: ilYa(60), signalements: r1.signalements }] }));
  assert.deepEqual(r2.signalements, [], 'déjà signalé au journal');
});

test('contrôles Git : branche refusée par check-ref-format, handoff absent', () => {
  const l = lot('lot-a', { branche: 'docs/x', handoff: 'docs/claude/handoffs/2026-11-20-1000-x.md' });
  assert.equal(d(etat({ lots: [l] })).lot, 'lot-a');
  assert.equal(d(etat({ lots: [l] }), MAINTENANT, { controles: { refBrancheValide: () => false } }).motifs[0].motif, 'controle_branche');
  assert.equal(d(etat({ lots: [l] }), MAINTENANT, { controles: { handoffPresent: () => false } }).motifs[0].motif, 'controle_handoff');
});

test('garde de tête : un lot cloud pris sans PR arrête la passe', () => {
  const lots = [lot('lot-pris', { etat: 'pris', tenu_le: ilYa(30) }), lot('lot-b', { ordre: 20 })];
  const r = d(etat({ lots }));
  assert.equal(r.sortie, SORTIE_RIEN);
  assert.equal(r.code, 'file_occupee');
  assert.equal(r.lot, null);
  lots[0].pr = '#12';
  assert.equal(d(etat({ lots })).lot, 'lot-b', '« prête » libère la file');
});

test('un lot de la voie Mac pris au Mac ne bloque pas la passe', () => {
  const lots = [lot('lot-mac', { lieu: 'mac', etat: 'pris', tenu_le: ilYa(30) }), lot('lot-b', { ordre: 20 })];
  assert.equal(d(etat({ lots })).lot, 'lot-b');
});

test('lot orphelin ou renvoyé : signalé une fois, la file reste occupée', () => {
  const lots = [lot('lot-orphelin', { etat: 'pris', tenu_le: ilYa(5 * 60), pr: '' }), lot('lot-b', { ordre: 20 })];
  const r = d(etat({ lots }));
  assert.equal(r.code, 'orphelin');
  assert.deepEqual(r.orphelins, ['lot-orphelin']);
  assert.deepEqual(r.signalements, [{ lot: 'lot-orphelin', file: 'D', motif: 'orphelin' }]);
  const r2 = d(etat({ lots, journal: [{ debut: ilYa(60), signalements: r.signalements }] }));
  assert.deepEqual(r2.signalements, []);
  assert.equal(r2.lot, null);
});

test('lot passé à `fait` sans PR : ne bloque pas, n’est pas repris', () => {
  const lots = [lot('lot-fait', { etat: 'fait', pr: '' }), lot('lot-b', { ordre: 20 })];
  const r = d(etat({ lots, intentions: [{ id: 'lot-fait--v3', lot: 'lot-fait', etat: 'prise', cree_le: ilYa(120) }] }));
  assert.equal(r.lot, 'lot-b');
});

test('double passe, double lancement : un lot déjà tenté ne repart pas, deux prises sur un lot arrêtent', () => {
  const lots = [lot('lot-a'), lot('lot-b', { ordre: 20 })];
  const enVol = d(etat({ lots, intentions: [{ id: 'lot-a--v2', lot: 'lot-a', etat: 'intention', cree_le: ilYa(5) }] }));
  assert.equal(enVol.lot, null, 'une passe concurrente est entre son intention et sa prise');
  assert.equal(enVol.code, 'file_occupee');
  const tente = d(etat({ lots, intentions: [{ id: 'lot-a--v2', lot: 'lot-a', etat: 'intention', cree_le: ilYa(45) }] }));
  assert.equal(tente.lot, 'lot-b');
  assert.deepEqual(tente.motifs, [{ lot: 'lot-a', motif: 'deja_tente' }]);
  const sansChamp = d(etat({ lots, intentions: [{ id: 'lot-a--v2', etat: 'refusee', cree_le: ilYa(45) }] }));
  assert.deepEqual(sansChamp.motifs, [{ lot: 'lot-a', motif: 'deja_tente' }], 'retrouvé par l’identifiant de la ligne');
  const double = d(etat({
    lots,
    intentions: [
      { id: 'lot-a--v2', lot: 'lot-a', etat: 'prise', cree_le: ilYa(50) },
      { id: 'lot-a--v3', lot: 'lot-a', etat: 'prise', cree_le: ilYa(40) },
    ],
  }));
  assert.equal(double.sortie, SORTIE_ARRET);
  assert.equal(double.code, 'deux_sessions_un_lot');
});

test('lancement sans prise qui expire, prise tardive : trois dans la journée arrêtent', () => {
  const lots = [lot('lot-d', { ordre: 40 })];
  const sansPrise = (n, age) => ({ id: `lot-${n}--v1`, lot: `lot-${n}`, etat: 'intention', cree_le: ilYa(age) });
  const deux = d(etat({ lots, intentions: [sansPrise('x', 45), { id: 'lot-y--v1', lot: 'lot-y', etat: 'refusee', cree_le: ilYa(90) }] }));
  assert.equal(deux.compteurs.sans_prise_du_jour, 2);
  assert.equal(deux.lot, 'lot-d');
  const recente = d(etat({ lots, intentions: [sansPrise('x', 45), sansPrise('y', 50), sansPrise('z', 10)] }));
  assert.equal(recente.compteurs.sans_prise_du_jour, 2, 'une intention de dix minutes n’a pas encore expiré');
  const trois = d(etat({ lots, intentions: [sansPrise('x', 45), sansPrise('y', 50), sansPrise('z', 31)] }));
  assert.equal(trois.sortie, SORTIE_ARRET);
  assert.equal(trois.code, 'sans_prise_repetes');
  assert.equal(trois.arretASignaler, true, 'première fois du jour : une ligne à la boîte D');
  const encore = d(etat({ lots, intentions: [sansPrise('x', 45), sansPrise('y', 50), sansPrise('z', 31)], journal: [{ debut: ilYa(60), code: 'sans_prise_repetes' }] }));
  assert.equal(encore.arretASignaler, false, 'déjà signalé aujourd’hui');
  assert.equal(d(etat({ arret: { arret: true } })).arretASignaler, false, 'interrupteur fermé : aucune ligne');
});

test('plafond quotidien : quatre prises dans la journée de Paris', () => {
  const lots = [lot('lot-e', { ordre: 50 })];
  const prises = (n, iso) => Array.from({ length: n }, (_, k) => ({ id: `lot-p${k}--v1`, lot: `lot-p${k}`, etat: 'prise', cree_le: iso }));
  assert.equal(d(etat({ lots, intentions: prises(PLAFOND_JOUR, ilYa(60)) })).code, 'plafond');
  assert.equal(d(etat({ lots, intentions: prises(PLAFOND_JOUR - 1, ilYa(60)) })).lot, 'lot-e');
  // 23:30 UTC le 19 = 00:30 à Paris le 20 ; 22:30 UTC le 19 = 23:30 à Paris le 19.
  assert.equal(d(etat({ lots, intentions: prises(PLAFOND_JOUR, '2026-11-19T22:30:00Z') })).lot, 'lot-e', 'la veille à Paris ne compte pas');
});

test('plage horaire : de 7 h à 23 h 59, heure de Paris', () => {
  const lots = [lot('lot-a')];
  assert.equal(d(etat({ lots }), Date.parse('2026-11-20T05:30:00Z')).code, 'hors_plage', '6 h 30 à Paris');
  assert.equal(d(etat({ lots }), Date.parse('2026-11-20T06:00:00Z')).lot, 'lot-a', '7 h à Paris');
  assert.equal(d(etat({ lots }), Date.parse('2026-11-20T22:59:00Z')).lot, 'lot-a', '23 h 59 à Paris');
  assert.equal(d(etat({ lots }), Date.parse('2026-11-20T23:00:00Z')).code, 'hors_plage', 'minuit à Paris');
});

test('hygiène : due tant qu’aucune passe du jour ne l’a jouée', () => {
  assert.equal(d(etat()).hygieneDue, true);
  assert.equal(d(etat({ journal: [{ debut: ilYa(60), hygiene: 'jouee' }] })).hygieneDue, false);
  assert.equal(d(etat({ journal: [{ debut: '2026-11-19T20:00:00Z', hygiene: 'jouee' }] })).hygieneDue, true);
});

test('aParis : identifiant de journal à l’heure de Paris', () => {
  assert.deepEqual(aParis(MAINTENANT), { jour: '2026-11-20', heure: 10, minute: 0, id: '20261120-1000' });
  assert.equal(aParis(Date.parse('2026-07-01T22:15:00Z')).id, '20260702-0015', 'heure d’été');
});

function exporter(dossier, { lots = [], manifeste = true, curseur = true, arret = { arret: false } } = {}) {
  mkdirSync(join(dossier, 'lots'), { recursive: true });
  for (const l of lots) writeFileSync(join(dossier, 'lots', `${l.id}.json`), JSON.stringify({ ...l, id: undefined }));
  if (arret !== null) {
    mkdirSync(join(dossier, 'orchestrateur'), { recursive: true });
    writeFileSync(join(dossier, 'orchestrateur', 'arret.json'), JSON.stringify(arret));
  }
  if (manifeste) {
    writeFileSync(join(dossier, 'manifeste.json'), JSON.stringify({
      schema: 1,
      exporte_le: new Date(MAINTENANT).toISOString(),
      collections: {
        lots: { lignes: lots.length, curseur_epuise: curseur },
        orchestrateur_lancements: { lignes: 0, curseur_epuise: true },
        orchestrateur_journal: { lignes: 0, curseur_epuise: true },
      },
    }));
  }
}

test('lecture paginée incomplète : lecture douteuse, arrêt', (t) => {
  const dossier = mkdtempSync(join(tmpdir(), 'wn-passe-'));
  t.after(() => rmSync(dossier, { recursive: true, force: true }));
  exporter(dossier, { lots: [lot('lot-a')], curseur: false });
  const { etat: e, ecarts } = lireExport(dossier);
  assert.equal(e.lectureSure, false);
  assert.match(ecarts.join(' '), /lots : non attestée complète/);
  assert.equal(principal([dossier, '--maintenant', new Date(MAINTENANT).toISOString()]), SORTIE_ARRET);
});

test('CLI : export complet, lot pris, ligne de journal écrite sans texte libre', (t) => {
  const dossier = mkdtempSync(join(tmpdir(), 'wn-passe-'));
  t.after(() => rmSync(dossier, { recursive: true, force: true }));
  exporter(dossier, { lots: [lot('lot-a', { titre: 'TEXTE LIBRE À NE PAS RECOPIER' })] });
  const sortie = join(dossier, 'journal.json');
  assert.equal(principal([dossier, '--maintenant', new Date(MAINTENANT).toISOString(), '--journal-sortie', sortie]), SORTIE_PRENDRE);
  const j = readFileSync(sortie, 'utf8');
  assert.doesNotMatch(j, /TEXTE LIBRE/);
  assert.equal(JSON.parse(j).lot, 'lot-a');
  assert.equal(JSON.parse(j).interrupteur, 'ouvert');
});

test('CLI : sans manifeste, ou interrupteur absent, arrêt', (t) => {
  const a = mkdtempSync(join(tmpdir(), 'wn-passe-'));
  const b = mkdtempSync(join(tmpdir(), 'wn-passe-'));
  t.after(() => [a, b].forEach((x) => rmSync(x, { recursive: true, force: true })));
  exporter(a, { lots: [lot('lot-a')], manifeste: false });
  exporter(b, { lots: [lot('lot-a')], arret: null });
  const iso = new Date(MAINTENANT).toISOString();
  assert.equal(principal([a, '--maintenant', iso]), SORTIE_ARRET);
  assert.equal(principal([b, '--maintenant', iso]), SORTIE_ARRET);
});

test('arguments : erreurs d’usage', () => {
  assert.match(analyserArguments([]).erreur, /dossier/);
  assert.match(analyserArguments(['x', '--files', 'Z']).erreur, /--files/);
  assert.match(analyserArguments(['x', '--maintenant', '2026-11-20 10:00']).erreur, /fuseau/);
  assert.match(analyserArguments(['x', '--inconnu']).erreur, /inconnue/);
  assert.equal(principal(['/chemin/qui/n/existe/pas']), SORTIE_USAGE);
});
