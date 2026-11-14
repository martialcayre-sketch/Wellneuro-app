// Banc du superviseur rejoué (lot L2) et du manifeste d'export — fixtures
// fictives, aucune ligne réelle : un export des registres et un instantané
// GitHub ne se committent jamais. Sans réseau ; les CLI se jouent sur des
// dossiers temporaires.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  INSTANTANE_PERIME_MIN,
  conditionsObservees,
  derniereDeclaration,
  lireInstantane,
  numeroDePr,
  prochaineEcheance,
  superviser,
  surTete,
} from './lib/superviseur.mjs';
import { SORTIE_ACTIONS, SORTIE_ANOMALIES, SORTIE_RIEN, SORTIE_USAGE, analyserArguments, controler } from './wn-superviseur.mjs';
import { controler as controlerRegistres, lireExport, lireManifeste } from './wn-registres.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const T0 = Date.parse('2026-01-10T12:00:00Z');
const H = 3600 * 1000;
const iso = (ms) => new Date(ms).toISOString();
const TETE = 'a'.repeat(40);
const AUTRE = 'b'.repeat(40);

const message = (extra = {}) => ({ id: '20260110-1300-a', de: 'A', auteur: 'File A (worktree exemple)', a: 'integrateur', objet: 'prete', ref: '#101', texte: 'PR prête.', etat: 'emis', emis_le: iso(T0), relances: 0, ...extra });
const lot = (extra = {}) => ({ id: 'h00-1', file: 'A', titre: 'Lot fictif', fiche: 'H00', inscrit_par: 'File A (worktree exemple)', inscrit_le: iso(T0 - 24 * H), ordre: 10, apres: '', etat: 'pris', questions: [], pris_le: iso(T0), tenu_le: iso(T0), pr: '', ...extra });
const question = (extra = {}) => ({ id: '20260110-1200-a', file: 'A', nature: 'ordinaire', statut: 'repondue', options: [{ lib: 'x' }, { lib: 'y' }], arrivee: iso(T0 - H), reponse: 'x', reponse_le: iso(T0), reponse_par: 'responsable', decision: '', pr: '#101', merge_le: '', ...extra });
const declaration = (extra = {}) => ({ auteur: 'compte-exemple', association: 'OWNER', cree_le: iso(T0), sha: TETE, sur_tete: true, handoffs: [], ...extra });
const prOuverte = (extra = {}) => ({
  numero: 101,
  etat: 'open',
  auteur: 'compte-exemple',
  brouillon: false,
  tete: TETE,
  meme_depot: true,
  base: 'main',
  fichiers: ['scripts/a.mjs', 'docs/x.md'],
  checks: { total: 3, succes: 3, echecs: [], en_cours: [], requis: { verify: 'success' } },
  declarations: [declaration()],
  revue_pr_agent: { code: 0 },
  sonde_release_db: { code: 0 },
  ...extra,
});
const instantane = (prs, extra = {}) => ({ schema: 1, pris_le: iso(T0), depot: 'exemple/depot', tete_main: AUTRE, sondes: true, prs, erreurs: [], ...extra });
const lu = (extra = {}) => ({ messages: [], lots: [], questions: [], absentes: [], illisibles: [], plusAncien: T0, ...extra });
const types = (r) => r.actions.map((a) => a.type);

test('numeroDePr : #N, nombre nu, ambiguïté refusée', () => {
  assert.equal(numeroDePr('#2093'), 2093);
  assert.equal(numeroDePr('2093'), 2093);
  assert.equal(numeroDePr(2093), 2093);
  assert.equal(numeroDePr('lot h00 · #2093 @abc'), 2093);
  assert.equal(numeroDePr('#12 puis #13'), null, 'deux PR : rien ne se croise');
  assert.equal(numeroDePr(''), null);
  assert.equal(numeroDePr('#0'), null);
});

test('surTete : préfixe de sept caractères au moins', () => {
  assert.ok(surTete(TETE, TETE));
  assert.ok(surTete(TETE.slice(0, 7), TETE));
  assert.ok(!surTete(TETE.slice(0, 6), TETE));
  assert.ok(!surTete(AUTRE, TETE));
  assert.ok(!surTete(TETE, null));
});

test('instantané : absent, hors contrat, futur, périmé, partiel — mode dégradé, jamais un faux statut', () => {
  assert.equal(lireInstantane(null, T0).prs.size, 0);
  assert.match(lireInstantane(null, T0).degrade[0], /absent ou illisible/);
  assert.match(lireInstantane({ schema: 2, prs: [] }, T0).degrade[0], /hors contrat/);
  assert.match(lireInstantane(instantane([], { pris_le: 'hier' }), T0).degrade[0], /heure de prise/);
  assert.match(lireInstantane(instantane([prOuverte()], { pris_le: iso(T0 + H) }), T0).degrade[0], /futur/);
  assert.equal(lireInstantane(instantane([prOuverte()], { pris_le: iso(T0 + H) }), T0).prs.size, 0);
  const perime = lireInstantane(instantane([prOuverte()]), T0 + (INSTANTANE_PERIME_MIN + 1) * 60000);
  assert.equal(perime.prs.size, 1, 'périmé : croisé, mais dit');
  assert.match(perime.degrade[0], /vieux de 31 min/);
  assert.match(lireInstantane(instantane([prOuverte()], { erreurs: [{ pr: 101 }] }), T0).degrade[0], /1 lecture/);
  assert.match(lireInstantane(instantane([prOuverte()], { erreurs: undefined }), T0).degrade[0], /hors contrat/, 'constat 5 : `erreurs` requis');
  assert.match(lireInstantane(instantane([prOuverte()], { sondes: false }), T0).degrade[0], /sans les sondes/);
  assert.match(lireInstantane(instantane([prOuverte(), { numero: '102' }, prOuverte()]), T0).degrade[0], /2 entrée\(s\)/, 'chaîne et doublon écartés, dits');
  assert.deepEqual(lireInstantane(instantane([prOuverte()]), T0 + 60000).degrade, []);
});

test('conditions observées : les six, une à une', () => {
  assert.ok(conditionsObservees(prOuverte()).every((c) => c.ok));
  const ko = (extra) => conditionsObservees(prOuverte(extra)).filter((c) => !c.ok).map((c) => c.id);
  assert.deepEqual(ko({ declarations: [] }), ['declaration']);
  assert.deepEqual(ko({ declarations: [declaration({ sha: AUTRE })] }), ['declaration']);
  assert.deepEqual(ko({ meme_depot: false }), ['origine']);
  assert.deepEqual(ko({ brouillon: true }), ['brouillon']);
  assert.deepEqual(ko({ brouillon: undefined }), ['brouillon'], 'un état illisible ne vaut pas « prête à la revue »');
  assert.deepEqual(ko({ checks: null }), ['ci']);
  assert.deepEqual(ko({ checks: { total: 0, echecs: [], en_cours: [] } }), ['ci']);
  assert.deepEqual(ko({ checks: { total: 1, echecs: [], en_cours: [], requis: {} } }), ['ci'], 'constat 1 : un check vert sans `verify` n\'est pas un CI');
  assert.deepEqual(ko({ checks: { total: 2, echecs: [], en_cours: [], requis: { verify: 'skipped' } } }), ['ci'], '`verify` sauté : pas un CI');
  assert.deepEqual(ko({ meme_depot: undefined }), ['origine']);
  assert.deepEqual(ko({ base: 'autre-branche' }), ['base'], 'constat 8 : PR empilée');
  assert.deepEqual(ko({ checks: { total: 3, echecs: ['verify'], en_cours: [] } }), ['ci']);
  assert.deepEqual(ko({ checks: { total: 3, echecs: [], en_cours: ['verify'] } }), ['ci']);
  assert.deepEqual(ko({ revue_pr_agent: { code: 2 } }), ['revue'], 'lecture impossible : jamais un 0');
  assert.deepEqual(ko({ revue_pr_agent: null }), ['revue']);
  assert.deepEqual(ko({ sonde_release_db: { code: 1 } }), ['release-db']);
});

test('dernière déclaration : la plus récente fait foi', () => {
  const pr = prOuverte({ declarations: [declaration({ cree_le: iso(T0), sha: AUTRE }), declaration({ cree_le: iso(T0 + H), sha: TETE }), declaration({ cree_le: 'illisible' })] });
  assert.equal(derniereDeclaration(pr).sha, TETE);
  assert.equal(derniereDeclaration({}), null);
});

test('prête au registre, PR examinable : merge_a_examiner, avec ce qu\'il faut confronter', () => {
  const r = superviser(lu({ messages: [message()] }), instantane([prOuverte()]), T0 + 60000);
  const a = r.actions.find((x) => x.type === 'merge_a_examiner');
  assert.ok(a);
  assert.equal(a.cible, 'integrateur');
  assert.equal(a.observe.tete, TETE);
  assert.equal(a.observe.instantane_le, '2026-01-10T12:00:00Z');
  assert.ok(a.a_confronter.some((c) => c.includes('wn-revue-pr-agent.mjs 101')));
  assert.ok(a.a_confronter.some((c) => c.includes('wn-sonde-release-db.mjs 101')));
  assert.ok(a.a_confronter.some((c) => c.includes('7 bis')));
  assert.deepEqual(r.anomalies, []);
});

test('scénario 4 : la tête avance après la déclaration → prête périmée, rendue à la file', () => {
  const r = superviser(lu({ messages: [message()] }), instantane([prOuverte({ tete: AUTRE })]), T0 + 60000);
  assert.ok(types(r).includes('prete_perimee'));
  assert.ok(!types(r).includes('merge_a_examiner'));
  assert.equal(r.actions.find((x) => x.type === 'prete_perimee').cible, 'A');
});

test('PR déclarée mais pas examinable : les conditions manquantes sont dites', () => {
  const r = superviser(lu({ messages: [message()] }), instantane([prOuverte({ revue_pr_agent: { code: 1 }, checks: { total: 2, echecs: [], en_cours: ['verify'] } })]), T0 + 60000);
  const a = r.actions.find((x) => x.type === 'prete_en_attente');
  assert.match(a.detail, /ci \(1 check\(s\) en cours\)/);
  assert.match(a.detail, /revue \(wn-revue-pr-agent → 1\)/);
});

test('scénario 12 : merge_fait manquant ; PR fermée sans merge ; PR hors instantané', () => {
  const merged = superviser(lu({ messages: [message()] }), instantane([{ numero: 101, etat: 'merged', tete: TETE, merge_le: iso(T0) }]), T0 + 60000);
  assert.deepEqual(types(merged).filter((t) => t !== 'message_a_relancer'), ['merge_fait_manquant']);
  const fermee = superviser(lu({ messages: [message()] }), instantane([{ numero: 101, etat: 'closed', tete: TETE }]), T0 + 60000);
  assert.ok(types(fermee).includes('prete_sur_pr_fermee'));
  const ailleurs = superviser(lu({ messages: [message()] }), instantane([prOuverte({ numero: 202, declarations: [] })]), T0 + 60000);
  assert.ok(types(ailleurs).includes('prete_hors_instantane'));
  const traitee = superviser(lu({ messages: [message({ etat: 'traite', traite_le: iso(T0) })] }), instantane([{ numero: 101, etat: 'merged', tete: TETE }]), T0 + 60000);
  assert.deepEqual(types(traitee), []);
});

test('une ligne prête qui ne nomme pas une PR unique : anomalie, rien n\'est croisé', () => {
  const r = superviser(lu({ messages: [message({ ref: '#101 et #102' })] }), instantane([prOuverte()]), T0 + 60000);
  assert.ok(r.anomalies.some((a) => a.regle === 'prete'));
});

test('origine : tête hors du dépôt, déclaration d\'un auteur sans accès — anomalies', () => {
  const fork = superviser(lu(), instantane([prOuverte({ meme_depot: false })]), T0 + 60000);
  assert.ok(fork.anomalies.some((a) => a.regle === 'origine' && /fork/.test(a.detail)));
  const tiers = superviser(lu(), instantane([prOuverte({ declarations: [declaration({ association: 'CONTRIBUTOR' })] })]), T0 + 60000);
  assert.ok(tiers.anomalies.some((a) => a.regle === 'origine' && /sans accès/.test(a.detail)));
});

test('déclaration GitHub sur la tête sans ligne prête au registre : signalée, sauf registre absent', () => {
  const r = superviser(lu(), instantane([prOuverte()]), T0 + 60000);
  assert.deepEqual(types(r), ['declaration_sans_message']);
  const sansMessages = superviser(lu({ absentes: ['messages'] }), instantane([prOuverte()]), T0 + 60000);
  assert.ok(!types(sansMessages).includes('declaration_sans_message'), 'sans le registre, rien ne dit que la ligne manque');
});

test('scénario 15 : chevauchement de code signalé, documents ignorés, ordre inchangé', () => {
  const voisine = prOuverte({ numero: 102, declarations: [], fichiers: ['scripts/a.mjs', 'scripts/a.mjs', 'docs/x.md'] });
  const r = superviser(lu({ messages: [message()] }), instantane([prOuverte(), voisine]), T0 + 60000);
  const a = r.actions.find((x) => x.type === 'chevauchement_signale');
  assert.match(a.detail, /#102 \(1\)/, 'un chemin compté une fois, le document à part');
  assert.ok(types(r).includes('merge_a_examiner'), 'le signal ne retire pas l\'examen');
  const docs = superviser(lu({ messages: [message()] }), instantane([prOuverte({ fichiers: ['docs/x.md'] }), voisine]), T0 + 60000);
  assert.ok(!types(docs).includes('chevauchement_signale'));
});

test('carnet : lot à passer fait, PR fermée sans merge, lot fait sur PR ouverte', () => {
  const merged = { numero: 101, etat: 'merged', tete: TETE, merge_le: iso(T0) };
  assert.ok(types(superviser(lu({ lots: [lot({ pr: '#101' })] }), instantane([merged]), T0 + 60000)).includes('lot_a_passer_fait'));
  assert.ok(!types(superviser(lu({ lots: [lot({ pr: '#101', etat: 'fait', fait_le: iso(T0) })] }), instantane([merged]), T0 + 60000)).includes('lot_a_passer_fait'));
  const fermee = superviser(lu({ lots: [lot({ pr: '101' })] }), instantane([{ numero: 101, etat: 'closed', tete: TETE }]), T0 + 60000);
  assert.equal(fermee.actions.find((x) => x.type === 'lot_pr_fermee').cible, 'A');
  const ouverte = superviser(lu({ lots: [lot({ pr: '#101', etat: 'fait', fait_le: iso(T0) })] }), instantane([prOuverte()]), T0 + 60000);
  assert.ok(ouverte.anomalies.some((a) => a.regle === 'carnet'));
});

test('question répondue dont la PR est mergée : à clore, et l\'action des registres seuls est remplacée', () => {
  const seuls = superviser(lu({ questions: [question()] }), null, T0 + 60000);
  assert.ok(types(seuls).includes('question_merge_a_constater'));
  const r = superviser(lu({ questions: [question()] }), instantane([{ numero: 101, etat: 'merged', tete: TETE, merge_le: iso(T0) }]), T0 + 60000);
  assert.ok(types(r).includes('question_a_clore'));
  assert.ok(!types(r).includes('question_merge_a_constater'));
  const ouverte = superviser(lu({ questions: [question()] }), instantane([prOuverte({ declarations: [] })]), T0 + 60000);
  assert.ok(types(ouverte).includes('question_merge_a_constater'), 'PR encore ouverte : rien de plus que les registres');
});

test('sans instantané : les registres seuls, chaque action porte sa relecture', () => {
  const r = superviser(lu({ messages: [message()] }), null, T0 + 60000);
  assert.deepEqual(types(r), ['message_a_relancer']);
  assert.match(r.actions[0].a_confronter[0], /^ArtifactData get messages\/20260110-1300-a/);
  assert.equal(r.degrade.length, 1);
});

test('aucun texte libre recopié : texte de message, motif de lot, titre de PR', () => {
  const secret = 'TEXTE-LIBRE-A-NE-PAS-RECOPIER';
  const r = superviser(
    lu({ messages: [message({ texte: secret })], lots: [lot({ pr: '#101', motif: secret, titre: secret })] }),
    instantane([{ ...prOuverte(), titre: secret, corps: { longueur: 3, empreinte: 'x', handoffs: [] } }]),
    T0 + 60000,
  );
  assert.doesNotMatch(JSON.stringify({ a: r.actions, n: r.anomalies }), new RegExp(secret));
});

test('prochaine échéance : la plus proche à venir', () => {
  const e = prochaineEcheance({ lots: [lot({ tenu_le: iso(T0) })], questions: [question({ statut: 'ouverte', date_utile: '2026-01-10' })] }, { priseLe: T0, maintenant: T0 + 60000 });
  assert.deepEqual(e, { quand: '2026-01-10T12:30:00Z', objet: 'instantane_perime', ref: 'instantané' });
  const sansInstantane = prochaineEcheance({ lots: [lot({ tenu_le: iso(T0) })] }, { maintenant: T0 + 60000 });
  assert.equal(sansInstantane.objet, 'lot_sans_nouvelles');
  assert.equal(sansInstantane.quand, '2026-01-10T16:00:00Z');
  assert.equal(prochaineEcheance({ lots: [lot({ tenu_le: iso(T0) })] }, { maintenant: T0 + 5 * H }), null);
});

// ── Les quatre faux verts de la relecture adverse (avant push) ─────────────

test('cas a : instantané utilisable mais vide — la ligne prête sort hors instantané, jamais un silence', () => {
  const r = superviser(lu({ messages: [message({ etat: 'lu', lu_le: iso(T0), lu_par: 'integrateur' })] }), instantane([]), T0 + 60000);
  assert.deepEqual(types(r), ['prete_hors_instantane']);
});

test('cas b : état de PR hors énumération — anomalie, aucun examen', () => {
  for (const etat of [null, undefined, 'OPEN']) {
    const r = superviser(lu({ messages: [message()] }), instantane([prOuverte({ etat })]), T0 + 60000);
    assert.ok(!types(r).includes('merge_a_examiner'), String(etat));
    assert.ok(r.anomalies.some((a) => a.regle === 'etat'), String(etat));
  }
});

test('cas c : la déclaration d\'un tiers sur la tête ne vaut rien', () => {
  const pr = prOuverte({ tete: AUTRE, declarations: [declaration({ sha: TETE, cree_le: iso(T0 - 60000) }), declaration({ sha: AUTRE, association: 'NONE', cree_le: iso(T0) })] });
  const r = superviser(lu({ messages: [message()] }), instantane([pr]), T0 + 60000);
  assert.ok(types(r).includes('prete_perimee'), 'la déclaration du dépôt, sur l\'ancienne tête, fait foi');
  assert.ok(!types(r).includes('merge_a_examiner'));
  assert.ok(r.anomalies.some((a) => a.regle === 'origine'));
  const seul = superviser(lu(), instantane([prOuverte({ declarations: [declaration({ association: 'CONTRIBUTOR' })] })]), T0 + 60000);
  assert.ok(!types(seul).includes('declaration_sans_message'), 'un tiers ne fait pas réclamer de ligne');
});

test('cas d : ligne traitée puis déclaration neuve sans ligne — signalée', () => {
  const traitee = message({ etat: 'traite', lu_le: iso(T0), traite_le: iso(T0), emis_le: iso(T0 - 2 * 60000) });
  const pr = prOuverte({ declarations: [declaration({ cree_le: iso(T0) })] });
  assert.ok(types(superviser(lu({ messages: [traitee] }), instantane([pr]), T0 + 60000)).includes('declaration_sans_message'));
  const apres = message({ etat: 'traite', lu_le: iso(T0), traite_le: iso(T0), emis_le: iso(T0) });
  assert.ok(!types(superviser(lu({ messages: [apres] }), instantane([pr]), T0 + 60000)).includes('declaration_sans_message'));
});

test('constat 7 : ligne prête émise après la prise de l\'instantané — en attente, pas examinée', () => {
  const r = superviser(lu({ messages: [message({ emis_le: iso(T0 + 60000) })] }), instantane([prOuverte()]), T0 + 2 * 60000);
  const a = r.actions.find((x) => x.type === 'prete_en_attente');
  assert.match(a.detail, /émise après la prise/);
  assert.ok(!types(r).includes('merge_a_examiner'));
});

// ── Manifeste d'export (wn-registres) ───────────────────────────────────────

function dossierExport() {
  const dossier = mkdtempSync(join(tmpdir(), 'wn-superviseur-'));
  const poser = (collection, ligne) => {
    mkdirSync(join(dossier, collection), { recursive: true });
    const { id, ...donnees } = ligne;
    const chemin = join(dossier, collection, `${id}.json`);
    writeFileSync(chemin, JSON.stringify(donnees));
    utimesSync(chemin, new Date(T0), new Date(T0));
  };
  const manifeste = (collections, extra = {}) => writeFileSync(join(dossier, 'manifeste.json'), JSON.stringify({ schema: 1, exporte_le: iso(T0), collections, ...extra }));
  return { dossier, poser, manifeste };
}
const complet = (n) => ({ lignes: n, curseur_epuise: true });

test('manifeste : absent, conforme, écarts (page oubliée, curseur, collection vide, futur)', () => {
  const { dossier, poser, manifeste } = dossierExport();
  try {
    poser('lots', lot({ id: 'h00-1', etat: 'fait', fait_le: iso(T0) }));
    poser('messages', message({ etat: 'traite', lu_le: iso(T0), traite_le: iso(T0) }));
    assert.equal(lireManifeste(dossier, lireExport(dossier)).etat, 'absent');

    manifeste({ lots: complet(1), messages: complet(1), questions: complet(0) });
    const lu1 = lireExport(dossier);
    assert.deepEqual(lu1.absentes, ['questions']);
    assert.equal(lireManifeste(dossier, lu1, T0).etat, 'conforme');
    assert.deepEqual(lu1.absentes, [], 'déclarée vide : plus absente');

    manifeste({ lots: complet(2), messages: complet(1), questions: complet(0) });
    const page = lireManifeste(dossier, lireExport(dossier), T0);
    assert.equal(page.etat, 'ecart');
    assert.match(page.ecarts[0], /lots : 1 fichier\(s\) pour 2 ligne\(s\)/);

    manifeste({ lots: { lignes: 1 }, messages: complet(1) });
    const ecarts = lireManifeste(dossier, lireExport(dossier), T0).ecarts;
    assert.ok(ecarts.some((e) => /lots : pagination non attestée/.test(e)));
    assert.ok(ecarts.some((e) => /questions : non déclarée/.test(e)));

    manifeste({ lots: complet(1), messages: complet(1), questions: complet(0) }, { exporte_le: iso(T0 + H) });
    assert.match(lireManifeste(dossier, lireExport(dossier), T0).ecarts[0], /futur/);
    for (const exporte_le of [undefined, '2026-01-10T12:00:00', 'hier']) {
      manifeste({ lots: complet(1), messages: complet(1), questions: complet(0) }, { exporte_le });
      assert.match(lireManifeste(dossier, lireExport(dossier), T0).ecarts[0], /sans fuseau/, String(exporte_le));
    }
    manifeste({ lots: complet(1), messages: complet(1), questions: complet(0) }, { exporte_le: '2026-01-10T13:00:00+01:00' });
    assert.equal(lireManifeste(dossier, lireExport(dossier), T0).etat, 'conforme');

    manifeste({ lots: complet(1), messages: complet(1), questions: { lignes: 0, curseur_epuise: false } });
    const lu12 = lireExport(dossier);
    assert.equal(lireManifeste(dossier, lu12, T0).etat, 'ecart');
    assert.deepEqual(lu12.absentes, ['questions'], 'constat 12 : curseur non épuisé, la collection reste absente');

    writeFileSync(join(dossier, 'manifeste.json'), '{');
    assert.equal(lireManifeste(dossier, lireExport(dossier)).etat, 'ecart');
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

test('wn-registres : manifeste en écart = code 2 ; absent dit en tête, code inchangé', () => {
  const { dossier, poser, manifeste } = dossierExport();
  try {
    poser('lots', lot({ id: 'h00-1', etat: 'fait', fait_le: iso(T0) }));
    const sans = controlerRegistres([dossier, '--maintenant', iso(T0 + 60000)]);
    assert.equal(sans.code, 0);
    assert.ok(sans.lignes.some((l) => /sans manifeste\.json/.test(l)));
    assert.equal(sans.lignes.at(-1), 'REGISTRES anomalies=0 avis=0 actions=0');
    manifeste({ lots: complet(2), messages: complet(0), questions: complet(0) });
    const ecart = controlerRegistres([dossier, '--maintenant', iso(T0 + 60000)]);
    assert.equal(ecart.code, 2);
    assert.equal(ecart.lignes.at(-1), 'REGISTRES anomalies=1 avis=0 actions=0 manifeste=ecart');
    manifeste({ lots: complet(1), messages: complet(0), questions: complet(0) });
    const conforme = controlerRegistres([dossier, '--maintenant', iso(T0 + 60000)]);
    assert.equal(conforme.code, 0);
    assert.equal(conforme.lignes.at(-1), 'REGISTRES anomalies=0 avis=0 actions=0 manifeste=conforme');
    assert.ok(!conforme.lignes.some((l) => /absente/.test(l)), 'collections déclarées vides : pas absentes');
    const exporte = JSON.parse(controlerRegistres([dossier, '--json', '--maintenant', iso(T0 + 60000)]).lignes[0]);
    assert.deepEqual(exporte.manifeste, { etat: 'conforme', ecarts: [] });
  } finally {
    rmSync(dossier, { recursive: true, force: true });
  }
});

// ── CLI wn-superviseur ──────────────────────────────────────────────────────

test('arguments : dossier et --instantane requis, options connues seulement', () => {
  assert.deepEqual(analyserArguments(['d', '--instantane', 'i.json']).options, { dossier: 'd', instantane: 'i.json', json: false, maintenant: null });
  for (const argv of [[], ['d'], ['d', '--instantane'], ['d', '--instantane', 'i', '--ecrire'], ['a', 'b', '--instantane', 'i'], ['d', '--instantane', 'i', '--maintenant', 'tantôt']]) {
    assert.ok(analyserArguments(argv).erreur, argv.join(' '));
  }
});

test('CLI : codes 0, 1, 2 et 3 ; mode dégradé jamais à 0 ; rien écrit', () => {
  const { dossier, poser, manifeste } = dossierExport();
  const fichier = join(dossier, '..', `${dossier.split('/').pop()}-instantane.json`);
  try {
    assert.equal(controler([dossier, '--instantane', fichier]).code, SORTIE_USAGE, 'aucune collection');
    assert.equal(controler([join(dossier, 'absent'), '--instantane', fichier]).code, SORTIE_USAGE);

    poser('lots', lot({ id: 'h00-1', etat: 'fait', fait_le: iso(T0) }));
    manifeste({ lots: complet(1), messages: complet(0), questions: complet(0) });
    writeFileSync(fichier, JSON.stringify(instantane([])));
    const rien = controler([dossier, '--instantane', fichier, '--maintenant', iso(T0 + 60000)]);
    assert.equal(rien.code, SORTIE_RIEN, rien.lignes.join('\n'));
    assert.equal(rien.lignes.at(-1), 'SUPERVISEUR anomalies=0 actions=0 degrade=0 manifeste=conforme export_min=1');

    const absent = controler([dossier, '--instantane', `${fichier}.manquant`, '--maintenant', iso(T0 + 60000)]);
    assert.equal(absent.code, SORTIE_ACTIONS, 'instantané absent : dégradé, jamais 0');
    assert.ok(absent.lignes.some((l) => /⚠ dégradé : instantané absent/.test(l)));

    rmSync(join(dossier, 'manifeste.json'));
    assert.equal(controler([dossier, '--instantane', fichier, '--maintenant', iso(T0 + 60000)]).code, SORTIE_ACTIONS, 'sans manifeste : dégradé');
    manifeste({ lots: complet(1), messages: complet(0), questions: complet(0) });
    assert.equal(controler([dossier, '--instantane', fichier, '--maintenant', iso(T0 + 2 * H)]).code, SORTIE_ACTIONS, 'export et instantané périmés');
    writeFileSync(fichier, JSON.stringify(instantane([], { pris_le: iso(T0 + 2 * H) })));
    const vieil = controler([dossier, '--instantane', fichier, '--maintenant', iso(T0 + 2 * H)]);
    assert.equal(vieil.code, SORTIE_ACTIONS, 'export périmé, instantané frais : dégradé');
    assert.ok(vieil.lignes.some((l) => /⚠ dégradé : export vieux de 120 min/.test(l)));
    writeFileSync(fichier, JSON.stringify(instantane([])));
    manifeste({ lots: complet(2), messages: complet(0), questions: complet(0) });
    assert.equal(controler([dossier, '--instantane', fichier, '--maintenant', iso(T0 + 60000)]).code, SORTIE_ANOMALIES, 'manifeste en écart : 2');

    poser('messages', message());
    manifeste({ lots: complet(1), messages: complet(1), questions: complet(0) });
    writeFileSync(fichier, JSON.stringify(instantane([prOuverte()])));
    const due = controler([dossier, '--instantane', fichier, '--maintenant', iso(T0 + 60000)]);
    assert.equal(due.code, SORTIE_ACTIONS);
    assert.ok(due.lignes.some((l) => /^ {2}merge_a_examiner messages\/20260110-1300-a → integrateur/.test(l)));
    assert.ok(due.lignes.some((l) => /^ {4}à confronter : node scripts\/wn-revue-pr-agent\.mjs 101$/.test(l)));

    writeFileSync(fichier, JSON.stringify(instantane([prOuverte({ meme_depot: false })])));
    const json = JSON.parse(controler([dossier, '--instantane', fichier, '--json', '--maintenant', iso(T0 + 60000)]).lignes[0]);
    assert.equal(json.code, SORTIE_ANOMALIES);
    assert.ok(json.anomalies.some((a) => a.regle === 'origine'));

    const processus = spawnSync(process.execPath, [join(RACINE, 'scripts', 'wn-superviseur.mjs'), dossier, '--instantane', fichier, '--maintenant', iso(T0 + 60000)], { encoding: 'utf8' });
    assert.equal(processus.status, SORTIE_ANOMALIES);
    assert.match(processus.stdout, /SUPERVISEUR anomalies=1 actions=\d+ degrade=0 manifeste=conforme export_min=1\n$/);
    const usage = spawnSync(process.execPath, [join(RACINE, 'scripts', 'wn-superviseur.mjs')], { encoding: 'utf8' });
    assert.equal(usage.status, SORTIE_USAGE);
  } finally {
    rmSync(dossier, { recursive: true, force: true });
    rmSync(fichier, { force: true });
  }
});

test('lecture seule : ni réseau, ni processus, ni écriture dans le superviseur', () => {
  for (const fichier of ['scripts/lib/superviseur.mjs', 'scripts/wn-superviseur.mjs']) {
    const source = readFileSync(join(RACINE, fichier), 'utf8');
    assert.doesNotMatch(source, /child_process|node:https?|node:net|fetch\(|writeFile|appendFile|mkdir|unlink|rmSync|rename/, fichier);
  }
});
