// Banc du contrôle des registres de coordination — fixtures fictives, aucune
// ligne réelle : un export des registres ne se committe jamais. Sans réseau ;
// le CLI se joue sur un dossier temporaire.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ACCORD_CODEX,
  BOITES_FILES,
  BOITES_FIXES,
  LIEUX_LOT,
  NATURES_LOT,
  RISQUES_LOT,
  ETATS_LOT,
  ETATS_MESSAGE,
  ETATS_REPONSE,
  NATURES_QUESTION,
  OBJETS_MESSAGE,
  REPONSE_PAR_COCKPIT,
  SOURCE_REPONSE,
  STATUTS_QUESTION,
  actionsDues,
  analyser,
  boite,
  controlerLots,
  controlerMessages,
  controlerQuestions,
  controlerReponses,
  court,
  instant,
  lotsSuivants,
  normaliserBoite,
} from './registres.mjs';
import { SORTIE_ACTIONS, SORTIE_ANOMALIES, SORTIE_CONFORME, SORTIE_USAGE, analyserArguments, codeDeSortie, controler, lireExport, lireManifeste, rendre } from '../wn-registres.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const T0 = Date.parse('2026-01-10T12:00:00Z');
const H = 3600 * 1000;
const iso = (ms) => new Date(ms).toISOString();

const message = (extra = {}) => ({
  id: '20260110-1300-a',
  de: 'A',
  auteur: 'File A (worktree exemple)',
  a: 'integrateur',
  objet: 'prete',
  ref: '#101',
  texte: 'PR prête.',
  etat: 'emis',
  emis_le: iso(T0),
  relances: 0,
  ...extra,
});

const lot = (extra = {}) => ({
  id: 'h00-1',
  file: 'A',
  titre: 'Lot fictif',
  fiche: 'H00',
  ordre: 10,
  apres: '',
  etat: 'pret',
  motif: '',
  questions: [],
  pris_par: '',
  pris_le: '',
  tenu_le: '',
  branche: '',
  handoff: '',
  pr: '',
  fait_le: '',
  inscrit_par: 'File A (worktree exemple)',
  inscrit_le: iso(T0 - 24 * H),
  reprises: 0,
  ...extra,
});

const question = (extra = {}) => ({
  id: '20260110-0900-a',
  file: 'A',
  lot: 'h00-1',
  question: 'Question fictive ?',
  faits: 'Faits fictifs.',
  nature: 'ordinaire',
  statut: 'ouverte',
  arrivee: iso(T0 - 3 * H),
  date_utile: '2026-01-12',
  options: [
    { lib: 'a', consequence: 'conséquence a', recommandee: true },
    { lib: 'b', consequence: 'conséquence b' },
  ],
  ...extra,
});

const reponse = (extra = {}) => ({
  id: '20260110-0900-a--20260110T120000-ab12',
  question: '20260110-0900-a',
  file: 'A',
  lot: 'h00-1',
  nature: 'ordinaire',
  reponse: 'a',
  note: '',
  le: iso(T0),
  par: 'u_compte_fictif',
  source: 'cockpit',
  etat: 'envoyee',
  ...extra,
});

const regles = (constats, gravite = 'anomalie') => constats.filter((c) => c.gravite === gravite).map((c) => c.regle);

test('énumérations : celles de docs/ROLES_MACHINES.md, mot pour mot', () => {
  const regle = readFileSync(join(RACINE, 'docs', 'ROLES_MACHINES.md'), 'utf8').replace(/\s+/g, ' ');
  const cite = (valeurs) => valeurs.map((v) => `\`${v}\``);
  for (const v of cite(BOITES_FIXES)) assert.ok(regle.includes(v), `boîte ${v}`);
  assert.ok(regle.includes(`\`lieu\` (${cite(LIEUX_LOT).join(', ')})`), 'lieux du carnet');
  assert.ok(regle.includes(`\`nature\` (${cite(NATURES_LOT).join(', ')})`), 'natures du carnet');
  assert.ok(regle.includes(`\`risque\` (${cite(RISQUES_LOT).join(', ')})`), 'risques du carnet');
  assert.ok(regle.includes(`Objets : ${cite(OBJETS_MESSAGE).join(', ')}.`), 'objets du registre');
  assert.ok(regle.includes(`\`etat\` (${cite(ETATS_MESSAGE).join(', ')})`), 'états du registre');
  assert.ok(regle.includes(`\`etat\` (${cite(ETATS_LOT).join(', ')})`), 'états du carnet');
  assert.ok(regle.includes(`la nature : ${cite(NATURES_QUESTION).slice(0, 2).join(', ')} ou ${cite(NATURES_QUESTION)[2]}`), 'natures');
  assert.ok(regle.includes(`le statut : ${cite(STATUTS_QUESTION).slice(0, 3).join(', ')} ou ${cite(STATUTS_QUESTION)[3]}`), 'statuts');
  assert.ok(regle.includes(`\`${ACCORD_CODEX}\``), 'mention de l\'accord D-505');
  assert.ok(regle.includes(`\`source\` (\`${SOURCE_REPONSE}\`) et \`etat\` : \`${ETATS_REPONSE[0]}\`, puis \`${ETATS_REPONSE[1]}\` ou \`${ETATS_REPONSE[2]}\``), 'source et états des réponses du cockpit');
  assert.ok(regle.includes(`\`reponse_par: ${REPONSE_PAR_COCKPIT}\``), 'mention du report depuis le cockpit');
  assert.ok(regle.includes('a plus de quatre heures'), 'délai sans nouvelles');
  assert.ok(regle.includes('une heure après son émission'), 'délai de reprise');
});

test('outils : boîte normalisée, valeur courte sans contrôle, horodatage', () => {
  assert.equal(normaliserBoite('A bis'), 'a-bis');
  assert.equal(normaliserBoite('Intégrateur'), 'integrateur');
  assert.equal(normaliserBoite(' export ia-externe '), 'export-ia-externe');
  assert.equal(normaliserBoite(undefined), '');
  assert.equal(court('a\u001b[31mb\nc'), 'a [31mb c');
  assert.equal(court('x'.repeat(50), 10), `${'x'.repeat(10)}…`);
  assert.equal(instant('2026-01-10T12:00:00Z'), T0);
  assert.equal(instant('demain'), null);
  assert.equal(instant(''), null);
  assert.equal(instant(12), null);
});

test('messages : une ligne conforme ne lève rien', () => {
  assert.deepEqual(controlerMessages([message(), message({ id: '20260110-1300-a-2', etat: 'traite', lu_le: iso(T0), traite_le: iso(T0) })]), []);
});

test('messages : identifiant, objet, état, accusés, relances, prete', () => {
  const c = controlerMessages([
    message({ id: '20260110-1300-A' }),
    message({ id: '20261340-2500-a' }),
    message({ id: '20261131-1200-a' }),
    message({ id: '20260110-1301-a', objet: 'renvoi' }),
    message({ id: '20260110-1302-a', etat: 'recu' }),
    message({ id: '20260110-1303-a', etat: 'lu' }),
    message({ id: '20260110-1304-a', etat: 'traite' }),
    message({ id: '20260110-1305-a', lu_le: iso(T0) }),
    message({ id: '20260110-1306-a', relances: 2 }),
    message({ id: '20260110-1307-a', relances: -1 }),
    message({ id: '20260110-1308-a', a: 'D' }),
    message({ id: '20260110-1309-a', ref: 'la PR' }),
    message({ id: '20260110-1310-a', emis_le: 'hier soir' }),
    message({ id: '20260110-1311-a', auteur: '' }),
    message({ id: '20260110-1312-a', objet: 'merge_fait', a: 'A', de: 'integrateur', ref: '' }),
  ]);
  assert.deepEqual(regles(c), ['identifiant', 'identifiant', 'identifiant', 'objet', 'etat', 'accuse', 'accuse', 'accuse', 'relances', 'relances', 'prete', 'prete', 'horodatage', 'champ', 'merge_fait']);
  assert.deepEqual(
    c.filter((x) => x.gravite === 'avis').map((x) => [x.id, x.regle]),
    [['20260110-1312-a', 'identifiant']],
  );
});

test('messages : le suffixe de l\'identifiant suit la boîte émettrice, rang compris', () => {
  const c = controlerMessages([
    message({ id: '20260110-1300-a-bis', de: 'A bis' }),
    message({ id: '20260110-1300-a-bis-3', de: 'A bis' }),
    message({ id: '20260110-1300-pra3b', de: 'PRA-3b' }),
    message({ id: '20260110-1300-autonomie-2', de: 'autonomie des sessions' }),
    message({ id: '20260110-1300-d-2', de: 'D' }),
    message({ id: '20260110-1300-b', de: 'A' }),
  ]);
  assert.deepEqual(c.map((x) => [x.id, x.gravite, x.regle]), [['20260110-1300-b', 'avis', 'identifiant']]);
});

test('contenu interdit : signalé par champ, la valeur n\'est jamais recopiée', () => {
  const adresse = ['sophie.nicola', 'exemple.test'].join('@');
  const jeton = `gh${'p'}_${'a1B2'.repeat(9)}`;
  const c = controlerMessages([message({ texte: `écrire à ${adresse}`, ref: `#101 ${jeton}` })]);
  assert.equal(c.length, 2);
  assert.ok(c.every((x) => x.gravite === 'avis' && x.regle === 'contenu'));
  assert.match(c.map((x) => x.detail).join(' '), /`ref`.*jeton ou clé/);
  assert.match(c.map((x) => x.detail).join(' '), /`texte`.*adresse e-mail/);
  assert.ok(!JSON.stringify(c).includes(adresse) && !JSON.stringify(c).includes(jeton));
  // Une valeur citée par une autre règle (`de`, `objet`, `etat`, `file`, `apres`…) est masquée, et le nom d'un
  // champ, écrit par une autre session, sort assaini et borné.
  const cles = `x\n\u001b[31m${'y'.repeat(120)}`;
  const autres = [
    ...controlerMessages([message({ id: '20260110-1300-a', de: adresse, objet: jeton, etat: adresse })]),
    ...controlerLots([lot({ file: jeton, etat: adresse, apres: adresse })]),
    ...controlerMessages([message({ [cles]: adresse })]),
  ];
  const sortie = JSON.stringify(autres);
  assert.ok(autres.length >= 6 && !sortie.includes(adresse) && !sortie.includes(jeton) && !sortie.includes('y'.repeat(61)));
  assert.ok(autres.every((x) => !/[\u0000-\u001f\u007f-\u009f]/.test(x.detail)));
  const uuid = controlerLots([lot({ motif: 'dossier 0f8fad5b-d9cb-469f-a165-70867728950e' })]);
  assert.deepEqual(regles(uuid, 'avis'), ['contenu']);
  assert.deepEqual(controlerLots([lot({ motif: 'commit 24d8641d8959aa00bb11cc22dd33ee44ff556677' })]), [], 'un sha n\'est pas un identifiant de dossier');
  assert.deepEqual(controlerLots([lot({ motif: 'renvoi `WN-CL-NNNN-NNN@vN.M` ou `x@v1.2`' })]), [], 'une référence versionnée n\'est pas une adresse');
});

test('carnet : lieu, nature et risque de la voie cloud (D-540 §3)', () => {
  assert.deepEqual(controlerLots([lot({ lieu: 'cloud', nature: 'ordinaire', risque: 'P2' })]), []);
  assert.deepEqual(controlerLots([lot({ lieu: 'mac', nature: 'reservee', risque: 'P0' })]), []);
  assert.deepEqual(controlerLots([lot()]), [], 'champs facultatifs : absents, voie Mac');
  assert.deepEqual(regles(controlerLots([lot({ lieu: 'nuage' })])), ['lieu']);
  assert.deepEqual(regles(controlerLots([lot({ risque: 'P3' })])), ['risque']);
  assert.deepEqual(regles(controlerLots([lot({ lieu: 'cloud', nature: 'reservee', risque: 'P2' })])), ['lieu']);
  assert.deepEqual(regles(controlerLots([lot({ lieu: 'cloud', nature: 'ordinaire', risque: 'P0' })])), ['lieu']);
});

test('lots : une ligne conforme ne lève rien, à chaque état', () => {
  const lignes = [
    lot(),
    lot({ id: 'h00-2', etat: 'pris', pris_par: 'File A', pris_le: iso(T0), tenu_le: iso(T0), branche: 'feat/h00-2', apres: 'h00-1' }),
    lot({ id: 'h00-3', etat: 'bloque', motif: 'question', questions: ['20260110-0900-a'] }),
    lot({ id: 'h00-4', etat: 'fait', fait_le: iso(T0) }),
  ];
  assert.deepEqual(controlerLots(lignes, [question()]), []);
});

test('lots : file, état, préalable, champs d\'état, un lot par session', () => {
  const tenu = { etat: 'pris', pris_par: 'File A', pris_le: iso(T0), tenu_le: iso(T0), branche: 'x' };
  const c = controlerLots(
    [
      lot({ id: 'H00_1' }),
      lot({ id: 'h00-2', file: 'B bis' }),
      lot({ id: 'h00-3', etat: 'en cours' }),
      lot({ id: 'h00-4', apres: 'h99-1' }),
      lot({ id: 'h00-5', apres: 'h00-5' }),
      lot({ id: 'h00-6', etat: 'bloque' }),
      lot({ id: 'h00-7', etat: 'pris', pris_par: 'File C' }),
      lot({ id: 'h00-8', etat: 'fait' }),
      lot({ id: 'h00-9', ordre: '10' }),
      lot({ id: 'h00-10', ...tenu }),
      lot({ id: 'h00-11', ...tenu, pris_par: ' file  a ' }),
      lot({ id: 'h00-12', ...tenu, pr: '#12' }),
      lot({ id: 'h00-13', etat: 'bloque', motif: 'question', questions: ['20260101-0000-z'] }),
      lot({ id: 'sans-rang' }),
    ],
    [question()],
  );
  assert.deepEqual(regles(c), ['identifiant', 'file', 'etat', 'apres', 'apres', 'bloque', 'pris', 'pris', 'pris', 'fait', 'ordre', 'un_lot_par_session']);
  assert.deepEqual(
    c.filter((x) => x.gravite === 'avis').map((x) => [x.id, x.regle]),
    [['h00-13', 'questions']],
  );
  assert.match(c.find((x) => x.regle === 'un_lot_par_session').detail, /h00-10, h00-11\)/);
});

test('questions : conforme, puis nature, statut, options, réponse, autorité', () => {
  const repondue = { statut: 'repondue', reponse: 'a', reponse_le: iso(T0), reponse_par: 'responsable' };
  assert.deepEqual(controlerQuestions([question(), question({ id: '20260110-0901-a', ...repondue, nature: 'clinique' })]), []);
  const c = controlerQuestions([
    question({ id: 'q-1' }),
    question({ id: '20260110-0902-a', nature: 'produit' }),
    question({ id: '20260110-0903-a', statut: 'fermee' }),
    question({ id: '20260110-0904-a', options: [{ lib: 'a', consequence: 'x' }] }),
    question({ id: '20260110-0905-a', options: [{ lib: 'a', consequence: 'x' }, { lib: 'b' }] }),
    question({ id: '20260110-0906-a', statut: 'repondue' }),
    question({ id: '20260110-0907-a', ...repondue, nature: 'clinique', reponse_par: ACCORD_CODEX }),
    question({ id: '20260110-0908-a', ...repondue, nature: 'migration', reponse_par: 'page' }),
    question({ id: '20260110-0909-a', ...repondue, reponse_le: '', repondu_le: iso(T0) }),
    question({ id: '20260110-0910-a', date_utile: '' }),
  ]);
  assert.deepEqual(regles(c), ['identifiant', 'nature', 'statut', 'options', 'options', 'reponse', 'horodatage', 'autorite']);
  assert.deepEqual(
    c.filter((x) => x.gravite === 'avis').map((x) => [x.id, x.regle]),
    [
      ['20260110-0907-a', 'autorite'],
      ['20260110-0908-a', 'autorite'],
      ['20260110-0909-a', 'horodatage'],
      ['20260110-0910-a', 'date_utile'],
    ],
  );
});

test('actions : les lignes `emis` de toutes les boîtes se relancent, les autres non', () => {
  const a = actionsDues(
    { messages: [message(), message({ id: '20260110-1301-a', a: 'guichet', objet: 'autre', relances: 1, relance_le: iso(T0) }), message({ id: '20260110-1302-a', etat: 'lu', lu_le: iso(T0) })] },
    T0 + 2 * H,
  );
  assert.deepEqual(a.map((x) => [x.type, x.id, x.cible, x.age_h]), [
    ['message_a_relancer', '20260110-1300-a', 'integrateur', 2],
    ['message_a_relancer', '20260110-1301-a', 'guichet', 2],
  ]);
});

test('actions : lot sans nouvelles — au-delà de quatre heures, sans `pr`, puis sonné, puis reprise', () => {
  const tenu = (extra) => lot({ id: 'h00-2', etat: 'pris', pris_par: 'File A', pris_le: iso(T0), tenu_le: iso(T0), branche: 'x', ...extra });
  const types = (entree, t) => actionsDues(entree, t).filter((x) => x.collection === 'lots').map((x) => x.type);
  assert.deepEqual(types({ lots: [tenu()] }, T0 + 4 * H), [], 'quatre heures pile : pas encore');
  assert.deepEqual(types({ lots: [tenu()] }, T0 + 4 * H + 1), ['lot_sans_nouvelles']);
  assert.deepEqual(types({ lots: [tenu({ pr: '#12' })] }, T0 + 9 * H), [], 'une PR déclarée attend l\'intégrateur');
  assert.deepEqual(types({ lots: [tenu({ tenu_le: 'illisible' })] }, T0 + 9 * H), [], 'illisible : l\'anomalie le dit, pas l\'action');
  const sonnerie = (extra) => message({ id: '20260110-1800-a', objet: 'autre', a: 'A', ref: 'lot h00-2', emis_le: iso(T0 + 5 * H), ...extra });
  assert.deepEqual(types({ lots: [tenu()], messages: [sonnerie()] }, T0 + 5 * H + 30 * 60000), [], 'sonné depuis moins d\'une heure : on attend');
  assert.deepEqual(types({ lots: [tenu()], messages: [sonnerie()] }, T0 + 6 * H + 1), ['lot_reprise_possible']);
  assert.deepEqual(types({ lots: [tenu()], messages: [sonnerie({ etat: 'lu', lu_le: iso(T0 + 5 * H) })] }, T0 + 9 * H), [], 'sonnerie lue : la session a des nouvelles');
  assert.deepEqual(types({ lots: [tenu()], messages: [sonnerie({ emis_le: iso(T0 - H) })] }, T0 + 9 * H), ['lot_sans_nouvelles'], 'une sonnerie d\'avant le dernier `tenu_le` ne compte pas');
  assert.deepEqual(types({ lots: [tenu()], messages: [sonnerie({ a: 'B' })] }, T0 + 9 * H), ['lot_sans_nouvelles'], 'sonnerie d\'une autre boîte');
  assert.deepEqual(types({ lots: [tenu()], messages: [sonnerie({ ref: 'lot h00-21' })] }, T0 + 9 * H), ['lot_sans_nouvelles'], 'la sonnerie d\'un autre lot, dont l\'identifiant commence pareil, ne compte pas');
  assert.deepEqual(types({ lots: [tenu()], messages: [sonnerie({ ref: 'reprise de h00-2, file A' })] }, T0 + 6 * H + 1), ['lot_reprise_possible'], 'identifiant entier dans `ref`');
  const lue = sonnerie({ etat: 'lu', lu_le: iso(T0 + 5 * H) });
  assert.deepEqual(types({ lots: [tenu()], messages: [lue] }, T0 + 9 * H + 1), ['lot_sans_nouvelles'], 'sonnerie lue depuis plus de quatre heures, `tenu_le` inchangé : de nouveau sans nouvelles');
  assert.deepEqual(types({ lots: [tenu()], messages: [], absentes: ['messages'] }, T0 + 9 * H), ['lot_silence_a_verifier'], 'registre des messages absent : ni sonnerie ni reprise affirmée');
  assert.deepEqual(types({ lots: [tenu()], absentes: ['questions'] }, T0 + 9 * H), ['lot_sans_nouvelles']);
});

test('actions : lot `bloque` à relire quand toutes ses questions ont une réponse — jamais « repasser à pret »', () => {
  const bloque = lot({ id: 'h00-3', etat: 'bloque', motif: 'question', questions: ['20260110-0900-a', '20260110-0901-a'] });
  const q2 = (extra) => question({ id: '20260110-0901-a', nature: 'clinique', ...extra });
  const types = (questions) => actionsDues({ lots: [bloque], questions }, T0).filter((x) => x.collection === 'lots');
  assert.deepEqual(types([question(), q2({ statut: 'close' })]), [], 'une question encore ouverte');
  assert.deepEqual(types([question({ statut: 'repondue' })]), [], 'une question absente de l\'export');
  const a = types([question({ statut: 'repondue' }), q2({ statut: 'close' })]);
  assert.deepEqual(a.map((x) => x.type), ['lot_bloque_a_relire']);
  assert.match(a[0].detail, /relire la source de chaque réponse et son autorité \(clinique : responsable dans la session qui agit ou par le cockpit, ou décision mergée ; migration : responsable dans la session qui agit, ou décision mergée\)/);
  assert.deepEqual(actionsDues({ lots: [lot({ id: 'h00-4', etat: 'bloque', motif: 'geste du responsable' })] }, T0), [], 'bloqué sans question : rien de calculable');
});

test('actions : questions ouvertes par destinataire, répondues par suite due', () => {
  const repondue = { statut: 'repondue', reponse: 'a', reponse_le: iso(T0) };
  const a = actionsDues(
    {
      questions: [
        question(),
        question({ id: '20260110-0901-a', nature: 'clinique', statut: 'en_seance', date_utile: '2026-01-08' }),
        question({ id: '20260110-0902-a', nature: 'produit' }),
        question({ id: '20260110-0903-a', ...repondue, merge_le: iso(T0) }),
        question({ id: '20260110-0904-a', ...repondue, reponse_par: ACCORD_CODEX }),
        question({ id: '20260110-0905-a', ...repondue }),
        question({ id: '20260110-0906-a', ...repondue, pr: 12 }),
        question({ id: '20260110-0907-a', statut: 'close' }),
      ],
    },
    T0,
  );
  assert.deepEqual(a.map((x) => [x.type, x.cible]), [
    ['question_ouverte', 'guichet'],
    ['question_ouverte', 'responsable'],
    ['question_ouverte', 'responsable'],
    ['question_a_clore', 'A'],
    ['question_a_presenter', 'guichet'],
    ['question_sans_suite', 'A'],
    ['question_merge_a_constater', 'A'],
  ]);
  assert.equal(a[0].age_h, 3);
  assert.match(a[1].detail, /date utile dépassée/);
  assert.doesNotMatch(a[0].detail, /dépassée/);
});

test('réponses du cockpit : une ligne conforme ne lève rien, à chaque état', () => {
  const repondue = question({ statut: 'repondue', reponse: 'a', reponse_le: iso(T0), reponse_par: REPONSE_PAR_COCKPIT });
  assert.deepEqual(controlerReponses([reponse()], [question()]), []);
  assert.deepEqual(controlerReponses([reponse({ etat: 'reportee', reportee_le: iso(T0 + H), reportee_par: 'File A' })], [repondue]), []);
  assert.deepEqual(controlerReponses([reponse({ etat: 'ecartee', motif: 'question déjà close', par: '', source: 'autre' })], [repondue]), []);
  assert.deepEqual(controlerReponses([reponse({ id: '20260110-0900-g--20260110T120000123Z-x', question: '20260110-0900-g', file: 'guichet' })]), [], 'file guichet, horodatage en millisecondes');
});

test('réponses du cockpit : identifiant, champs, énumérations, report fautif', () => {
  const r = (extra, questions = null) => regles(controlerReponses([reponse(extra)], questions));
  assert.deepEqual(r({ id: '20260110-0900-a-ab12' }), ['identifiant']);
  assert.deepEqual(r({ id: '20260110-0901-a--20260110T120000-ab12' }), ['identifiant'], 'la question de l\'identifiant est celle du champ');
  assert.deepEqual(r({ id: '20261131-0900-a--20260110T120000-ab12', question: '20261131-0900-a' }), ['identifiant'], 'une date qui n\'existe pas');
  assert.deepEqual(r({ reponse: '', le: '' }), ['champ', 'champ']);
  assert.deepEqual(r({ file: 'E', nature: 'produit', etat: 'lue' }), ['file', 'nature', 'etat']);
  assert.deepEqual(r({ le: 'hier' }), ['horodatage']);
  const reportee = { etat: 'reportee', reportee_le: iso(T0 + H), reportee_par: 'File A' };
  assert.deepEqual(r({ ...reportee, reportee_le: '', reportee_par: '' }), ['report', 'report']);
  assert.deepEqual(r({ ...reportee, source: 'page' }), ['source']);
  assert.deepEqual(r({ ...reportee, par: '' }), ['source']);
  assert.deepEqual(r({ ...reportee, nature: 'migration' }), ['report']);
  assert.deepEqual(r(reportee, [question({ nature: 'migration', statut: 'repondue', reponse: 'a', reponse_le: iso(T0) })]), ['report'], 'nature lue sur la question');
  assert.deepEqual(r(reportee, [question({ statut: 'en_seance' })]), ['report'], 'reportée, question encore ouverte');
  assert.deepEqual(r({ etat: 'envoyee', par: '', source: 'page' }), [], 'une ligne envoyée à écarter est une action, pas une anomalie');
  const avis = (extra, questions = null) => regles(controlerReponses([reponse(extra)], questions), 'avis');
  assert.deepEqual(avis({ etat: 'ecartee', motif: '' }), ['ecartee']);
  assert.deepEqual(avis({}, [question({ id: '20260110-0959-a' })]), ['question']);
  assert.deepEqual(avis({}), [], 'sans liste commune exportée, la question n\'est pas recherchée');
  const contenu = controlerReponses([reponse({ note: 'écrire à nom.prenom@exemple.fr' })]);
  assert.deepEqual(regles(contenu, 'avis'), ['contenu']);
  assert.ok(!JSON.stringify(contenu).includes('exemple.fr'));
});

test('actions : réponse envoyée sans report — la plus récente l\'emporte, le reste se remplace ou s\'écarte', () => {
  const qid = (n) => `20260110-090${n}-a`;
  const rid = (n, h) => `${qid(n)}--20260110T1${h}0000-x${n}`;
  const repondue = { statut: 'repondue', reponse: 'a', reponse_le: iso(T0), reponse_par: REPONSE_PAR_COCKPIT };
  const questions = [
    question({ id: qid(1) }),
    question({ id: qid(2), nature: 'clinique', statut: 'en_seance' }),
    question({ id: qid(3), ...repondue }),
    question({ id: qid(4), ...repondue, reponse: 'b' }),
    question({ id: qid(5), nature: 'migration' }),
    question({ id: qid(6), statut: 'close', reponse: 'a', reponse_le: iso(T0), reponse_par: 'responsable, en session' }),
  ];
  const reponses = [
    reponse({ id: rid(1, 1), question: qid(1), le: iso(T0 - H) }),
    reponse({ id: rid(1, 2), question: qid(1), le: iso(T0) }),
    reponse({ id: rid(2, 2), question: qid(2), nature: 'clinique' }),
    reponse({ id: rid(3, 2), question: qid(3) }),
    reponse({ id: rid(4, 2), question: qid(4) }),
    reponse({ id: rid(5, 2), question: qid(5) }),
    reponse({ id: rid(6, 2), question: qid(6) }),
    reponse({ id: rid(7, 2), question: qid(7) }),
    reponse({ id: rid(8, 2), question: qid(8), par: '' }),
    reponse({ id: rid(9, 2), question: qid(9), source: 'page' }),
    reponse({ id: rid(1, 0), question: qid(1), etat: 'reportee', reportee_le: iso(T0), reportee_par: 'File A' }),
    reponse({ id: rid(4, 0), question: qid(4), etat: 'ecartee', motif: 'm' }),
  ];
  const a = actionsDues({ questions, reponses }, T0 + 2 * H).filter((x) => x.collection === 'reponses');
  assert.deepEqual(a.map((x) => [x.type, x.id]), [
    ['reponse_a_ecarter', rid(8, 2)],
    ['reponse_a_ecarter', rid(9, 2)],
    ['reponse_sans_report', rid(1, 2)],
    ['reponse_remplacee', rid(1, 1)],
    ['reponse_sans_report', rid(2, 2)],
    ['reponse_reportee_non_marquee', rid(3, 2)],
    ['reponse_a_ecarter', rid(4, 2)],
    ['reponse_a_ecarter', rid(5, 2)],
    ['reponse_a_ecarter', rid(6, 2)],
    ['reponse_a_verifier', rid(7, 2)],
  ]);
  assert.equal(a[2].cible, 'A');
  assert.equal(a[2].age_h, 2);
  assert.match(a[2].detail, /reponse_par: responsable, par le cockpit/);
  assert.doesNotMatch(a[2].detail, /profiles/);
  assert.match(a[4].detail, /`profiles`.*`D-xxx`/, 'clinique : compte du responsable vérifié, puis décision avant tout code');
  assert.match(a[6].detail, /déjà `repondue`/);
  assert.match(a[7].detail, /migration/);
  assert.match(a[9].detail, /pas dans la liste commune/);

  const autreHeure = actionsDues({ questions: [question({ ...repondue, reponse_le: iso(T0 - H) })], reponses: [reponse()] }, T0);
  assert.deepEqual(autreHeure.filter((x) => x.collection === 'reponses').map((x) => x.type), ['reponse_a_ecarter'], 'même texte, autre heure : la question reflète une autre réponse');
  const sansListe = actionsDues({ reponses: [reponse()], absentes: ['questions'] }, T0);
  assert.deepEqual(sansListe.map((x) => x.type), ['reponse_a_verifier']);
  assert.match(sansListe[0].detail, /refaire l'export/);
  const nonReportable = actionsDues({ questions: [question({ nature: 'migration' })], reponses: [reponse({ id: rid(0, 1), le: iso(T0 - H) }), reponse()] }, T0);
  assert.deepEqual(nonReportable.filter((x) => x.collection === 'reponses').map((x) => x.type), ['reponse_a_ecarter', 'reponse_a_verifier'], 'une ligne plus ancienne ne se remplace que par une ligne reportable');
});

test('lot suivant : `pret` au plus petit ordre, dont le préalable est `fait`', () => {
  const s = lotsSuivants([
    lot({ id: 'h00-1', ordre: 30 }),
    lot({ id: 'h00-2', ordre: 10, apres: 'h00-3' }),
    lot({ id: 'h00-3', ordre: 5, etat: 'pris' }),
    lot({ id: 'h01-1', ordre: 20 }),
    lot({ id: 'c00-1', file: 'C', ordre: 1, apres: 'c00-0' }),
    lot({ id: 'c00-0', file: 'C', ordre: 0, etat: 'fait', fait_le: iso(T0) }),
    lot({ id: 'd00-1', file: 'D', etat: 'bloque', motif: 'x' }),
  ]);
  assert.deepEqual(s, { A: 'h01-1', 'A bis': null, B: null, C: 'c00-1', D: null });
});

test('boîte : lignes non traitées de la boîte, casse et accents indifférents, sans texte libre', () => {
  const lignes = boite(
    [
      message({ id: '20260110-1302-d', a: 'Intégrateur', emis_le: iso(T0 + H) }),
      message({ id: '20260110-1300-a', etat: 'lu', lu_le: iso(T0) }),
      message({ id: '20260110-1301-a', etat: 'traite', lu_le: iso(T0), traite_le: iso(T0) }),
      message({ id: '20260110-1303-a', a: 'D' }),
    ],
    'integrateur',
  );
  assert.deepEqual(lignes.map((m) => [m.id, m.etat]), [
    ['20260110-1300-a', 'lu'],
    ['20260110-1302-d', 'emis'],
  ]);
  assert.ok(!('texte' in lignes[0]));
  // `ref` et `de` sont libres : seules leurs formes reconnues sortent.
  const jeton = `ghp_${'a'.repeat(36)}`;
  const [l1, l2, l3] = boite(
    [
      message({ id: '20260110-1300-a', ref: `#101 ${jeton}`, de: 'A bis' }),
      message({ id: '20260110-1301-a', ref: 'voir 20260110-1250-d, merci', de: 'quelqu.un@exemple.fr' }),
      message({ id: '20260110-1302-a', ref: 'la PR de la file' }),
    ],
    'integrateur',
  );
  assert.deepEqual([l1.ref, l1.de], ['#101', 'a-bis']);
  assert.deepEqual([l2.ref, l2.de], ['20260110-1250-d', '(masqué)']);
  assert.equal(l3.ref, '(hors forme)');
  assert.ok(![l1, l2, l3].some((l) => JSON.stringify(l).includes(jeton) || JSON.stringify(l).includes('@')));
});

test('analyse et rendu : comptes, ligne machine, aucun texte libre en sortie', () => {
  const secret = 'TEXTE-LIBRE-A-NE-JAMAIS-RECOPIER';
  const analyse = analyser(
    {
      messages: [message({ texte: secret }), message({ id: '20260110-1301-a', objet: 'renvoi', texte: secret })],
      lots: [lot({ titre: secret, motif: secret })],
      questions: [question({ question: secret, faits: secret, reponse: secret })],
      reponses: [reponse({ reponse: secret, note: secret, lot: secret, etat: 'ecartee', motif: secret })],
    },
    T0 + H,
  );
  assert.deepEqual(analyse.comptes.messages, { total: 2, par: { emis: 2 } });
  assert.deepEqual(analyse.comptes.reponses, { total: 1, par: { ecartee: 1 } });
  assert.deepEqual(analyser({}, T0).comptes.reponses, { total: 0, par: {} });
  const pieges = analyser({ lots: [lot({ etat: 'total' }), lot({ id: 'h00-2', etat: '' }), lot({ id: 'h00-3', etat: '__proto__' })] }, T0).comptes.lots;
  assert.equal(pieges.total, 3, 'une valeur d\'état ne peut pas écraser le total');
  assert.deepEqual(Object.entries(pieges.par), [['total', 1], ['(vide)', 1], ['__proto__', 1]]);
  assert.equal(analyse.anomalies.length, 1);
  assert.equal(analyse.actions.length, 3);
  const lignes = rendre(analyse, { ageExportMin: 45, boiteNom: 'integrateur', lignesBoite: boite([message()], 'integrateur') });
  assert.match(lignes[0], /^⚠ export vieux de 45 min/);
  assert.equal(lignes.at(-1), 'REGISTRES anomalies=1 avis=0 actions=3 boite=1');
  assert.ok(!lignes.join('\n').includes(secret) && !JSON.stringify(analyse).includes(secret));
  // Un identifiant est un nom de fichier d'export : assaini à l'entrée, il ne
  // porte en sortie ni saut de ligne, ni séquence d'échappement, ni phrase entière.
  const piege = `20260110-1300-a\n\u001b[31m${'x'.repeat(200)}`;
  const sale = analyser({ messages: [message({ id: piege })], lots: [lot({ id: piege, etat: 'pris', pr: '', tenu_le: iso(T0 - 5 * H) })] }, T0);
  const rendu = rendre(sale, { ageExportMin: 1, boiteNom: 'integrateur', lignesBoite: boite([message({ id: piege })], 'integrateur') });
  assert.ok(sale.anomalies.some((a) => a.collection === 'messages' && a.regle === 'identifiant'), 'un identifiant altéré reste hors format');
  assert.ok(rendu.every((ligne) => !/[\u0000-\u001f\u007f-\u009f]/.test(ligne) && !ligne.includes('x'.repeat(81))));
  assert.equal(codeDeSortie(analyse), SORTIE_ANOMALIES);
  assert.equal(codeDeSortie({ anomalies: [], actions: [{}] }), SORTIE_ACTIONS);
  assert.equal(codeDeSortie({ anomalies: [], actions: [] }), SORTIE_CONFORME);
  assert.equal(codeDeSortie({ anomalies: [], actions: [] }, ['lots/x.json']), SORTIE_ANOMALIES);
});

test('arguments : dossier requis, options connues seulement', () => {
  assert.deepEqual(analyserArguments(['d', '--json', '--boite', 'D']).options, { dossier: 'd', boite: 'D', json: true, maintenant: null });
  assert.equal(analyserArguments(['d', '--maintenant', '2026-01-10T12:00:00Z']).options.maintenant, T0);
  for (const argv of [[], ['a', 'b'], ['d', '--boite'], ['d', '--boite', '--json'], ['d', '--maintenant', 'tantôt'], ['d', '--ecrire']]) {
    assert.ok(analyserArguments(argv).erreur, argv.join(' '));
  }
});

test('CLI : lit un export sur disque, codes 0, 1, 2 et 3, sans rien écrire', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'wn-registres-'));
  try {
    const poser = (collection, ligne) => {
      mkdirSync(join(dossier, collection), { recursive: true });
      const { id, ...donnees } = ligne;
      const chemin = join(dossier, collection, `${id}.json`);
      writeFileSync(chemin, JSON.stringify(donnees));
      utimesSync(chemin, new Date(T0), new Date(T0));
    };
    assert.equal(controler([dossier]).code, SORTIE_USAGE, 'aucune collection');
    assert.equal(controler([join(dossier, 'absent')]).code, SORTIE_USAGE);
    assert.equal(controler([]).code, SORTIE_USAGE);

    poser('lots', lot({ id: 'h00-4', etat: 'fait', fait_le: iso(T0) }));
    const conforme = controler([dossier, '--maintenant', iso(T0 + 60000)]);
    assert.equal(conforme.code, SORTIE_CONFORME);
    assert.match(conforme.lignes.join('\n'), /collection\(s\) absente\(s\) de l'export, non contrôlée\(s\) : messages, questions/);
    assert.equal(conforme.lignes.at(-1), 'REGISTRES anomalies=0 avis=0 actions=0');

    poser('messages', message());
    const due = controler([dossier, '--boite', 'integrateur', '--maintenant', iso(T0 + 2 * H)]);
    assert.equal(due.code, SORTIE_ACTIONS);
    assert.match(due.lignes[0], /^⚠ export vieux de 120 min/);
    assert.equal(due.lignes.at(-1), 'REGISTRES anomalies=0 avis=0 actions=1 boite=1');

    assert.equal(lireExport(dossier).plusAncien, T0);
    const recent = join(dossier, 'messages', '20260110-1300-a.json');
    utimesSync(recent, new Date(T0 + 2 * H), new Date(T0 + 2 * H));
    assert.equal(lireExport(dossier).plusAncien, T0, 'un export refait en partie a l\'âge de son fichier le plus ancien');
    assert.match(controler([dossier, '--maintenant', iso(T0 + 2 * H)]).lignes[0], /^⚠ export vieux de 120 min/);
    utimesSync(recent, new Date(T0), new Date(T0));

    poser('questions', question({ nature: 'produit' }));
    writeFileSync(join(dossier, 'lots', 'casse.json'), '{');
    const lu = lireExport(dossier);
    assert.deepEqual(lu.illisibles, ['lots/casse.json']);
    assert.deepEqual([lu.messages.length, lu.lots.length, lu.questions.length], [1, 1, 1]);
    const json = controler([dossier, '--json', '--maintenant', iso(T0 + 60000)]);
    assert.equal(json.code, SORTIE_ANOMALIES);
    const sortie = JSON.parse(json.lignes[0]);
    assert.equal(sortie.code, SORTIE_ANOMALIES);
    assert.deepEqual(sortie.illisibles, ['lots/casse.json']);
    assert.deepEqual(sortie.anomalies.map((x) => x.regle), ['nature']);

    const processus = spawnSync(process.execPath, [join(RACINE, 'scripts', 'wn-registres.mjs'), dossier, '--maintenant', iso(T0 + 60000)], { encoding: 'utf8' });
    assert.equal(processus.status, SORTIE_ANOMALIES);
    assert.match(processus.stdout, /REGISTRES anomalies=2 avis=0 actions=2\n$/);
    const usage = spawnSync(process.execPath, [join(RACINE, 'scripts', 'wn-registres.mjs')], { encoding: 'utf8' });
    assert.equal(usage.status, SORTIE_USAGE);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('CLI : `reponses` facultative — lue si exportée, jamais exigée, confrontée au manifeste qui la déclare', () => {
  const dossier = mkdtempSync(join(tmpdir(), 'wn-registres-'));
  try {
    const poser = (collection, ligne) => {
      mkdirSync(join(dossier, collection), { recursive: true });
      const { id, ...donnees } = ligne;
      writeFileSync(join(dossier, collection, `${id}.json`), JSON.stringify(donnees));
    };
    const manifeste = (collections) => writeFileSync(join(dossier, 'manifeste.json'), JSON.stringify({ schema: 1, exporte_le: iso(T0), collections }));
    const declare = (lignes) => ({ lignes, curseur_epuise: true });
    const maintenant = ['--maintenant', iso(T0 + 60000)];
    poser('lots', lot({ id: 'h00-4', etat: 'fait', fait_le: iso(T0) }));
    poser('questions', question({ statut: 'close', reponse: 'a', reponse_le: iso(T0) }));
    poser('messages', message({ etat: 'traite', lu_le: iso(T0), traite_le: iso(T0) }));

    const ancien = controler([dossier, ...maintenant]);
    assert.equal(ancien.code, SORTIE_CONFORME, 'un export sans `reponses` reste conforme');
    assert.match(ancien.lignes.join('\n'), /facultative\(s\) non exportée\(s\), non contrôlée\(s\) : reponses/);
    assert.doesNotMatch(ancien.lignes.join('\n'), /absente\(s\) de l'export/);
    assert.deepEqual(lireExport(dossier).absentes, [], '`reponses` n\'entre jamais dans `absentes`');
    manifeste({ messages: declare(1), lots: declare(1), questions: declare(1) });
    assert.equal(controler([dossier, ...maintenant]).code, SORTIE_CONFORME, 'manifeste d\'avant, sans `reponses` : aucun écart');
    manifeste({ messages: declare(1), lots: declare(1), questions: declare(1), reponses: declare(0) });
    const vide = lireExport(dossier);
    assert.equal(lireManifeste(dossier, vide, T0).etat, 'conforme');
    assert.deepEqual(vide.nonExportees, [], 'déclarée vide : exportée');

    poser('reponses', reponse({ question: '20260110-0900-a' }));
    const json = JSON.parse(controler([dossier, '--json', ...maintenant]).lignes[0]);
    assert.equal(json.code, SORTIE_ANOMALIES, 'un fichier pour zéro ligne déclarée');
    assert.deepEqual(json.manifeste.ecarts, ['reponses : 1 fichier(s) pour 0 ligne(s) déclarée(s)']);
    manifeste({ messages: declare(1), lots: declare(1), questions: declare(1) });
    assert.deepEqual(lireManifeste(dossier, lireExport(dossier), T0).ecarts, ['reponses : exportée, non déclarée au manifeste']);
    manifeste({ messages: declare(1), lots: declare(1), questions: declare(1), reponses: { lignes: 1 } });
    assert.match(lireManifeste(dossier, lireExport(dossier), T0).ecarts[0], /reponses : pagination non attestée/);

    manifeste({ messages: declare(1), lots: declare(1), questions: declare(1), reponses: declare(1) });
    const due = controler([dossier, ...maintenant]);
    assert.equal(due.code, SORTIE_ACTIONS, 'réponse envoyée sur une question close : à écarter');
    assert.match(due.lignes.join('\n'), /· reponses : 1 ligne\(s\) \(envoyee 1\)/);
    assert.match(due.lignes.join('\n'), /reponse_a_ecarter reponses\/20260110-0900-a--20260110T120000-ab12 → A/);
    assert.equal(due.lignes.at(-1), 'REGISTRES anomalies=0 avis=0 actions=1 manifeste=conforme');
    assert.deepEqual(JSON.parse(controler([dossier, '--json', ...maintenant]).lignes[0]).non_exportees, []);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('lecture seule : ni réseau, ni processus, ni écriture dans les deux modules', () => {
  for (const fichier of ['scripts/lib/registres.mjs', 'scripts/wn-registres.mjs']) {
    const source = readFileSync(join(RACINE, fichier), 'utf8');
    assert.doesNotMatch(source, /child_process|node:https?|node:net|fetch\(|writeFile|appendFile|mkdir|unlink|rmSync|rename/, fichier);
  }
});
