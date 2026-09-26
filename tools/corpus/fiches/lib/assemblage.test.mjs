// Bancs de l'assemblage après contre-lecture (lot 5 de D-251). Texte
// SYNTHÉTIQUE uniquement : le dépôt est public.
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  adresseDIngestion,
  appliquerRelecture,
  appliquerVerdicts,
  cheminVoisin,
  enParallele,
  ErreurOutil,
  erreurSansTexte,
  parseJsonLache,
  resumeSansTexte,
  sectionsARelire,
  unitesAContreLire,
} from './assemblage.mjs';

const CONTENU = {
  titre: 'Titre synthétique',
  precautions: [{ texte: 'Précaution synthétique.', claims: ['WN-CL-9999-001::v1.0'] }],
  sections: [
    {
      titre: 'Section A',
      blocs: [
        { texte: 'Bloc A1.', provenance: { type: 'verbatim' } },
        { texte: 'Bloc A2.', provenance: { type: 'claims', claims: ['WN-CL-9999-002::v1.0'] } },
      ],
    },
    { titre: 'Section B', blocs: [{ texte: 'Bloc B1.', provenance: { type: 'verbatim' } }] },
  ],
};

function tousFideles(sauf = {}) {
  return new Map(unitesAContreLire(CONTENU).map(u => [u.id, sauf[u.id] ?? { fidele: true, raison: '' }]));
}

test('les éléments à contre-lire portent des identifiants stables, leurs claims et leur contexte', () => {
  const unites = unitesAContreLire(CONTENU);
  assert.deepEqual(
    unites.map(u => u.id),
    ['titre', 'precaution:1', 'section:1', 'bloc:1:1', 'bloc:1:2', 'section:2', 'bloc:2:1'],
  );
  assert.deepEqual(unites.find(u => u.id === 'bloc:1:2').claims, ['WN-CL-9999-002::v1.0']);
  assert.deepEqual(unites.find(u => u.id === 'bloc:1:1').claims, []);
  // Un bloc se lit sous son titre ; un titre, avec ses blocs (constat de revue).
  assert.match(unites.find(u => u.id === 'bloc:2:1').contexte, /Section B/);
  assert.match(unites.find(u => u.id === 'section:1').contexte, /Bloc A1\.[\s\S]*Bloc A2\./);
  assert.match(unites.find(u => u.id === 'titre').contexte, /Section A[\s\S]*Section B/);
});

test('tout fidèle : la fiche est retenue telle quelle, rien à relire', () => {
  const r = appliquerVerdicts(CONTENU, tousFideles());
  assert.equal(r.issue, 'retenue');
  assert.deepEqual(r.contenu, CONTENU);
  assert.deepEqual(r.exclusions, []);
  assert.deepEqual(r.aRelire, []);
});

test('un bloc refusé est exclu, sans repêchage — et sa section est à relire entière', () => {
  const r = appliquerVerdicts(CONTENU, tousFideles({ 'bloc:1:2': { fidele: false, raison: 'point 5' } }));
  assert.equal(r.issue, 'retenue');
  assert.deepEqual(r.contenu.sections[0].blocs.map(b => b.texte), ['Bloc A1.']);
  assert.deepEqual(r.exclusions, [{ id: 'bloc:1:2', raison: 'point 5' }]);
  assert.deepEqual(r.aRelire, [0]);
});

test('une section que ses exclusions vident est exclue aussi', () => {
  const r = appliquerVerdicts(CONTENU, tousFideles({ 'bloc:2:1': { fidele: false, raison: 'point 2' } }));
  assert.deepEqual(r.contenu.sections.map(s => s.titre), ['Section A']);
  assert.ok(r.exclusions.some(e => e.id === 'section:2'));
});

test('un titre de section refusé exclut la section entière', () => {
  const r = appliquerVerdicts(CONTENU, tousFideles({ 'section:1': { fidele: false, raison: 'point 8' } }));
  assert.deepEqual(r.contenu.sections.map(s => s.titre), ['Section B']);
});

test('une précaution refusée fait ÉCHOUER la fiche : une réserve ne part jamais tronquée ni absente', () => {
  const r = appliquerVerdicts(CONTENU, tousFideles({ 'precaution:1': { fidele: false, raison: 'point 6' } }));
  assert.equal(r.issue, 'echec');
  assert.equal(r.motif, 'precaution_refusee');
});

test('le titre de la fiche refusé la fait échouer', () => {
  assert.equal(appliquerVerdicts(CONTENU, tousFideles({ titre: { fidele: false, raison: '' } })).motif, 'titre_refuse');
});

test('plus aucune section : échec', () => {
  const r = appliquerVerdicts(
    CONTENU,
    tousFideles({ 'section:1': { fidele: false, raison: '' }, 'section:2': { fidele: false, raison: '' } }),
  );
  assert.equal(r.motif, 'aucune_section');
});

// Constat de revue : exclure sur une panne produisait une fiche amputée,
// déposable comme si un relecteur l'avait voulue.
test('un élément sans verdict, ou en échec technique, fait ÉCHOUER la fiche — ni accord, ni refus', () => {
  const sansVerdict = tousFideles();
  sansVerdict.delete('bloc:1:1');
  assert.deepEqual(appliquerVerdicts(CONTENU, sansVerdict), {
    issue: 'echec',
    motif: 'contre_lecture_incomplete',
    exclusions: [{ id: 'bloc:1:1', raison: 'aucun verdict de contre-lecture' }],
  });
  const panne = tousFideles({ 'bloc:2:1': { fidele: false, technique: true, raison: 'contre-lecture en échec : Error (429)' } });
  assert.equal(appliquerVerdicts(CONTENU, panne).motif, 'contre_lecture_incomplete');
});

test('un verdict « fidele » autre que true est un refus', () => {
  const r = appliquerVerdicts(CONTENU, tousFideles({ 'bloc:1:1': { fidele: 'true', raison: '' } }));
  assert.ok(r.exclusions.some(e => e.id === 'bloc:1:1'));
});

test('la seconde passe relit chaque section amputée comme un tout, et exclut celle qu’elle refuse', () => {
  const r = appliquerVerdicts(CONTENU, tousFideles({ 'bloc:1:2': { fidele: false, raison: 'point 5' } }));
  const relues = sectionsARelire(r.contenu, r.aRelire);
  assert.deepEqual(relues.map(u => u.id), ['relue:1']);
  assert.equal(relues[0].texte, 'Section A\nBloc A1.');

  const gardee = appliquerRelecture(r, new Map([['relue:1', { fidele: true, raison: '' }]]));
  assert.deepEqual(gardee.contenu.sections.map(s => s.titre), ['Section A', 'Section B']);

  const refusee = appliquerRelecture(r, new Map([['relue:1', { fidele: false, raison: 'point 15' }]]));
  assert.equal(refusee.issue, 'retenue');
  assert.deepEqual(refusee.contenu.sections.map(s => s.titre), ['Section B']);
  assert.ok(refusee.exclusions.some(e => e.id === 'relue:1' && e.raison === 'point 15'));

  assert.equal(appliquerRelecture(r, new Map()).motif, 'contre_lecture_incomplete');
});

test('le résumé imprimable ne porte que des comptes', () => {
  const resume = resumeSansTexte(CONTENU);
  assert.deepEqual(resume, { precautions: 1, sections: 2, blocs: 3 });
  assert.ok(!JSON.stringify(resume).includes('synthétique'));
});

test('une erreur s’imprime par son nom et son code — le message seulement pour une ErreurOutil', () => {
  let erreur;
  try {
    JSON.parse('{ texte propriétaire');
  } catch (e) {
    erreur = e;
  }
  assert.equal(erreurSansTexte(erreur), 'SyntaxError');
  const sdk = Object.assign(new Error('requête recopiée : texte propriétaire'), { status: 429 });
  assert.equal(erreurSansTexte(sdk), 'Error (429)');
  assert.equal(erreurSansTexte(new ErreurOutil('WN-SRC-9999 : absent du manifeste.')), 'WN-SRC-9999 : absent du manifeste.');
});

test('un rapport ne prend jamais le chemin de son brouillon, quel que soit le nom de celui-ci', () => {
  assert.equal(cheminVoisin('/x/a-brouillon.json', 'refus'), '/x/a-brouillon-refus.json');
  assert.equal(cheminVoisin('/x/a-brouillon.JSON', 'refus'), '/x/a-brouillon-refus.json');
  assert.equal(cheminVoisin('/x/a-brouillon', 'controles'), '/x/a-brouillon-controles.json');
  for (const f of ['/x/a.json', '/x/a', '/x/a-refus.json', '/x/.json', '/x/a.b.c']) {
    assert.notEqual(cheminVoisin(f, 'refus'), f);
  }
});

test('enParallele rend les résultats dans l’ordre, sans dépasser la limite', async () => {
  let enCours = 0;
  let pic = 0;
  const r = await enParallele([30, 5, 20, 1, 10], 2, async (ms, i) => {
    enCours++;
    pic = Math.max(pic, enCours);
    await new Promise(fin => setTimeout(fin, ms));
    enCours--;
    return i;
  });
  assert.deepEqual(r, [0, 1, 2, 3, 4]);
  assert.equal(pic, 2);
});

test('parseJsonLache tolère une clôture de code et un préambule', () => {
  assert.deepEqual(parseJsonLache('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(parseJsonLache('Voici : {"fidele": true}'), { fidele: true });
});

test('la cible s’écrit en toutes lettres, https hors de la machine locale', () => {
  assert.throws(() => adresseDIngestion(undefined), /obligatoire/);
  assert.throws(() => adresseDIngestion('http://app.exemple.fr'), /https exigé/);
  assert.deepEqual(adresseDIngestion('https://app.exemple.fr'), {
    hote: 'app.exemple.fr',
    adresse: 'https://app.exemple.fr/api/internal/fiches-assiette/ingest',
  });
  assert.equal(adresseDIngestion('http://localhost:3000').adresse, 'http://localhost:3000/api/internal/fiches-assiette/ingest');
});
