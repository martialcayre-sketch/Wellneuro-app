// Garde du dossier d'arbitrage des droits — 2026-07-29.
//
// POURQUOI CE BANC EXISTE. Un dossier d'arbitrage est de la prose : rien ne
// relie ses chiffres au registre dont ils sont tirés. La première rédaction du
// dossier des 42 en portait six faux, dont deux qui changeaient la décision —
// « 16 instruments dépendent de la déclaration » là où le registre en porte 35,
// et « 54 sur 64 bloqués » là où aucune lecture du registre ne donne 54. Une
// revue adversariale les a trouvés ; un script de dix lignes les aurait tous
// pris. C'est ce script, et il a attrapé un septième à sa première exécution.
//
// Il ne juge pas le dossier : il recompte depuis `instrument_registry.json` les
// grandeurs que le dossier cite, et exige que le texte porte exactement ces
// nombres. Le registre bouge ⇒ le banc rougit ⇒ le dossier doit être remis à
// jour, au lieu de vieillir en silence à côté de la donnée qu'il commente.
//
// PROCÉDURE DE RETRAIT — à lire avant de « réparer » un échec.
// Ce banc verrouille un instantané, et c'est voulu : le dossier est DATÉ, il
// rend compte d'un état à une date. Le jour où le praticien tranche — fermer les
// 25 non utilisés, dégager des droits — le registre bougera et ce banc rougira.
// Le geste attendu n'est alors NI d'antidater le dossier, NI de supprimer le
// banc en silence : c'est d'archiver le dossier avec sa date, de retirer ce
// fichier ET son étape de CI (`.github/workflows/ci.yml`, « Dossier des droits »)
// dans la même PR que la décision, et d'écrire dans le changelog que
// l'instantané a été consommé. Un dossier d'arbitrage périmé qu'on rafistole
// pour faire passer le CI est pire que pas de dossier du tout.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import assert from 'node:assert/strict';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const registre = JSON.parse(
  readFileSync(join(RACINE, 'docs/claude/corpus/instrument_registry.json'), 'utf8'));
const DOSSIER = join(RACINE,
  'docs/claude/propositions/2026-07-29-certification-montee/droits-42-instruments.md');
const texte = readFileSync(DOSSIER, 'utf8');

const tous = registre.instruments;
const av = tous.filter(i => i.droits?.statut === 'a_verifier');
const ids = l => l.map(i => i.questionnaireId).sort();
const detail = i => i.droits?.detail ?? '';

const EN_LETTRES = {
  2: 'deux', 3: 'trois', 4: 'quatre', 5: 'cinq', 7: 'sept', 11: 'onze',
  14: 'quatorze', 16: 'seize',
};

/**
 * Le dossier cite ce nombre — en chiffres, ou en toutes lettres quand la forme
 * existe. Le motif est volontairement large ; ce sont les `deepEqual` sur les
 * identifiants qui font le gros du travail. La contre-revue a montré qu'un
 * `citeLeNombre(5)` était satisfait par « Q_GEO_06 (5 mots) » : d'où la forme en
 * lettres, et d'où le fait qu'aucune assertion ne repose sur ce helper SEUL.
 */
function citeLeNombre(n, quoi) {
  const chiffres = new RegExp(`(^|[^0-9])${n}([^0-9]|$)`).test(texte);
  const lettres = EN_LETTRES[n]
    ? new RegExp(EN_LETTRES[n], 'i').test(texte)
    : false;
  assert.ok(chiffres || lettres, `le dossier ne cite pas ${n} — ${quoi}`);
}

/** Le dossier nomme cet identifiant quelque part. */
function citeLId(id, quoi) {
  assert.ok(texte.includes(id), `le dossier ne nomme pas ${id} — ${quoi}`);
}

test('le nombre d’entrées a_verifier est celui du registre', () => {
  assert.equal(av.length, 42, 'nombre d’entrées droits.statut = a_verifier');
  citeLeNombre(42, 'entrées a_verifier');
});

test('l’exposition aux déclarations du praticien est celle du registre', () => {
  // Le défaut le plus grave de la première rédaction : elle restreignait la
  // conséquence à un seul des trois groupes (16), laissant lire que les 26
  // autres pourraient relever de la déclaration. Le registre dit l'inverse.
  const avecReserve = av.filter(i =>
    detail(i).includes('2026-07-29')
    && detail(i).includes("N'EST PAS un questionnaire du référentiel SIIN"));
  assert.equal(avecReserve.length, 35, 'entrées portant la déclaration du 2026-07-29 et sa réserve');
  citeLeNombre(35, 'entrées portant la réserve du 2026-07-29');

  // Sept portent l'autre déclaration, celle du 2026-07-26, et ont été
  // rétrogradées de `permission_obtenue` le 2026-07-29 : DEUX déclarations
  // vivantes, de périmètres différents, et non une seule.
  const retrogradees = av.filter(i => detail(i).includes('CORRECTION DU 2026-07-29'));
  assert.deepEqual(ids(retrogradees),
    ['Q_ALI_03', 'Q_FIB_01', 'Q_FIB_02', 'Q_GEO_01', 'Q_GEO_03', 'Q_GEO_06', 'Q_NEU_01'],
    'entrées rétrogradées de permission_obtenue le 2026-07-29');
  assert.equal(av.filter(i => detail(i).includes('2026-07-26')).length, 7,
    'entrées relevant de la déclaration du 2026-07-26');
  for (const i of retrogradees) citeLId(i.questionnaireId, 'rétrogradé le 2026-07-29');
  // 35 + 7 = 42 : aucune des 42 n'échappe à l'une ou l'autre déclaration.
  assert.equal(avecReserve.length + retrogradees.length, av.length,
    'les deux déclarations doivent couvrir les 42 sans recouvrement');
});

test('les cinq mentions antérieures sont celles du registre', () => {
  const avecMention = av.filter(i => /Mention antérieure au dossier/.test(detail(i)));
  assert.deepEqual(ids(avecMention),
    ['Q_GEO_05', 'Q_NEU_07', 'Q_SOM_01', 'Q_STR_02', 'Q_STR_04'],
    'entrées portant une mention de droits antérieure');
  for (const i of avecMention) citeLId(i.questionnaireId, 'mention antérieure');
  citeLeNombre(5, 'mentions antérieures');
});

test('aucune des 42 ne porte de propriétaire de droits ni de date de vérification', () => {
  // C'est ce qui interdit à toutes de franchir `droits_verifies`, et ce qui rend
  // toute affirmation de titularité non sourçable au registre.
  assert.deepEqual(ids(av.filter(i => i.instrument?.proprietaireDroits)), [],
    'aucune des 42 ne doit porter de proprietaireDroits');
  assert.deepEqual(ids(av.filter(i => i.droits?.dateVerification)), [],
    'aucune des 42 ne doit porter de droits.dateVerification');
});

test('le nombre d’instruments dont le registre nomme des auteurs est celui du registre', () => {
  // La première rédaction opposait « 14 engageables » à « 28 à rechercher », en
  // ignorant `instrument.auteurs`, renseigné sur la grande majorité.
  const sansAuteurs = av.filter(i => !i.instrument?.auteurs);
  assert.deepEqual(ids(sansAuteurs), ['Q_FIB_03', 'Q_NEU_12', 'Q_PNE_01', 'Q_TAB_04'],
    'entrées sans instrument.auteurs au registre');
  assert.equal(av.length - sansAuteurs.length, 38, 'entrées dont le registre nomme des auteurs');
  citeLeNombre(38, 'entrées dont le registre nomme des auteurs');
  citeLeNombre(4, 'entrées sans aucun nom au registre');
  // `Q_NEU_12` est le cas intéressant : la SOURCE le nomme (Terman & Williams),
  // le REGISTRE non. Les deux champs ne se recouvrent pas, et un dossier qui
  // compterait sur l'un pour l'autre se tromperait dans les deux sens.
  assert.ok(sansAuteurs.some(i => i.questionnaireId === 'Q_NEU_12'),
    'Q_NEU_12 doit rester le cas « nommé par la source, pas par le registre »');
});

test('le contenu et les divergences critiques sont ceux du registre', () => {
  assert.equal(av.filter(i => i.versionServie?.statutContenu === 'a_auditer').length, 42,
    'les 42 doivent être en statutContenu a_auditer');
  const critiques = av.filter(i => (i.verdictScoring?.divergencesCritiques ?? 0) > 0);
  assert.equal(critiques.length, 15, 'entrées portant au moins une divergence critique');
  assert.equal(av.length - critiques.length, 27, 'entrées sans divergence critique');
  citeLeNombre(15, 'entrées portant une divergence critique');
  citeLeNombre(27, 'entrées sans divergence critique');

  // La DISTRIBUTION, et pas seulement le cardinal : le dossier cite nommément
  // les trois qui dépassent 1. Une redistribution à total constant laissait le
  // banc vert et le dossier faux — relevé en contre-revue, joué pour le prouver.
  const auDessusDeUn = Object.fromEntries(critiques
    .filter(i => i.verdictScoring.divergencesCritiques > 1)
    .map(i => [i.questionnaireId, i.verdictScoring.divergencesCritiques]));
  assert.deepEqual(auDessusDeUn, { Q_SOM_07: 3, Q_FIB_03: 2, Q_URO_01: 2 },
    'instruments portant PLUS d’une divergence critique');
  assert.equal(critiques.length - Object.keys(auDessusDeUn).length, 12,
    'instruments portant exactement une divergence critique');
});

test('l’état de l’échelle de certification est celui du registre', () => {
  // « 54 sur 64 » de la première rédaction ne correspondait à AUCUNE lecture :
  // c'était 64 − 10, soit « n'ont pas atteint scoring_verifie », le CINQUIÈME
  // barreau, présenté comme le deuxième.
  const par = t => tous.filter(i => i.statutCertification === t).length;
  assert.equal(tous.length, 64, 'instruments au registre');
  assert.equal(par('repere') + par('source_obtenue'), 45, 'au deuxième barreau ou en deçà');
  assert.equal(par('suspendu'), 7, 'instruments en état terminal suspendu');
  assert.equal(64 - par('droits_verifies') - par('contenu_verrouille') - par('scoring_verifie'), 52,
    'instruments n’ayant pas franchi droits_verifies');
  citeLeNombre(45, 'instruments au deuxième barreau ou en deçà');
  citeLeNombre(52, 'instruments n’ayant pas franchi droits_verifies');
  citeLeNombre(7, 'instruments en état terminal suspendu');
});

test('les instruments hors échelle sont nommés comme tels', () => {
  // `Q_SOM_07` et `Q_FIB_03` sont `suspendu`, un état TERMINAL : ils ne sont pas
  // « au deuxième barreau » et ne peuvent franchir aucun barreau tant qu'ils
  // sont inactifs. La première rédaction n'annotait que le premier.
  const suspendus = ids(av.filter(i => i.statutCertification === 'suspendu'));
  assert.deepEqual(suspendus, ['Q_FIB_03', 'Q_SOM_07'], 'les 42 en état suspendu');
  for (const id of suspendus) {
    assert.ok(new RegExp(`${id}[^\\n]*\\*\\*suspendu\\*\\*`).test(texte),
      `${id} est suspendu et le dossier ne le dit pas en gras sur sa ligne`);
  }
});

// ── La composition des groupes ──────────────────────────────────────────────
//
// Les trois groupes du dossier dérivent des rapports du banc de certification,
// qui vivent HORS DÉPÔT (`~/.wellneuro/corpus/certify/`) parce qu'ils citent le
// verbatim des sources. Le CI ne peut donc pas les recalculer. À défaut, on fige
// ici la partition et on exige que le dossier nomme chaque membre : ça attrape
// un instrument déplacé de groupe, disparu d'un tableau, ou ajouté au registre
// sans être classé. La contre-revue a montré la dérive : sans ces listes, un
// `statutBibliographique` qui se complète laissait le banc vert et le dossier
// faux.
const GROUPES = {
  nommante: ['Q_FIB_01', 'Q_FIB_02', 'Q_GAS_03', 'Q_GEO_01', 'Q_GEO_03', 'Q_GEO_05',
    'Q_GEO_06', 'Q_NEU_01', 'Q_NEU_12', 'Q_PED_01', 'Q_STR_05', 'Q_STR_06',
    'Q_TAB_01', 'Q_TAB_03'],
  piedDePage: ['Q_ALI_03', 'Q_GAS_02', 'Q_GEO_02', 'Q_NEU_03', 'Q_NEU_07', 'Q_NEU_09',
    'Q_NEU_10', 'Q_PNE_01', 'Q_SOM_01', 'Q_SOM_03', 'Q_SOM_05', 'Q_SOM_07',
    'Q_TAB_02', 'Q_TAB_04', 'Q_URO_01', 'Q_URO_02'],
  muette: ['Q_FIB_03', 'Q_NEU_02', 'Q_NEU_04', 'Q_NEU_05', 'Q_NEU_08', 'Q_SOM_04',
    'Q_SOM_06', 'Q_STR_02', 'Q_STR_03', 'Q_STR_04', 'Q_STR_08', 'Q_TAB_05'],
};

test('les trois groupes partitionnent exactement les 42, et le dossier les nomme tous', () => {
  const reunis = [...GROUPES.nommante, ...GROUPES.piedDePage, ...GROUPES.muette];
  assert.equal(new Set(reunis).size, reunis.length, 'aucun instrument dans deux groupes');
  assert.deepEqual(reunis.slice().sort(), ids(av),
    'les trois groupes doivent partitionner exactement les entrées a_verifier');
  assert.equal(GROUPES.nommante.length, 14, 'groupe « source nommante »');
  assert.equal(GROUPES.piedDePage.length, 16, 'groupe « pied de page seul »');
  assert.equal(GROUPES.muette.length, 12, 'groupe « source muette »');
  for (const id of reunis) citeLId(id, 'membre d’un groupe');
  citeLeNombre(14, 'groupe à source nommante');
  citeLeNombre(16, 'groupe à pied de page seul');
  citeLeNombre(11, 'complétude bibliographique du groupe à pied de page');
});

test('la complétude bibliographique du groupe à pied de page est celle du registre', () => {
  // Le dossier affirme « 11 en reference_identifiee, 5 en a_completer », et
  // nomme les cinq. La complétion bibliographique est un travail EN COURS : ce
  // chiffre bougera, et il doit alors faire rougir plutôt que mentir.
  const par = new Map(tous.map(i => [i.questionnaireId, i.statutBibliographique]));
  const aCompleter = GROUPES.piedDePage.filter(id => par.get(id) === 'a_completer');
  assert.deepEqual(aCompleter.slice().sort(),
    ['Q_ALI_03', 'Q_NEU_03', 'Q_PNE_01', 'Q_TAB_04', 'Q_URO_02'],
    'membres du groupe « pied de page » en statutBibliographique a_completer');
  assert.equal(GROUPES.piedDePage.length - aCompleter.length, 11,
    'membres du groupe « pied de page » en reference_identifiee');
});

test('le dossier ne date pas de la veille ce qui a eu lieu le même jour', () => {
  // #460 a été mergée le 2026-07-29 à 14 h, le jour même de ce dossier. La
  // première rédaction écrivait deux fois « hier ».
  assert.ok(!/\bhier\b/i.test(texte), 'le dossier écrit « hier » pour le 2026-07-29');
});
