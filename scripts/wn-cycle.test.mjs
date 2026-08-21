// Banc de `scripts/wn-cycle.mjs`.
//
// Les faits sont injectés : aucun réseau, et — à l'exception assumée de la
// section « Mode --local » (rev-parse en lecture seule) — aucun appel git.
// Ce qui est vérifié ici est la seule chose que le script décide vraiment —
// dans quelle phase du cycle on se trouve, et si la fenêtre de clôture est
// passée. Le cas qui a motivé le script est `apres-merge` sans clôture
// embarquée : c'est lui qui doit sortir en échec, pas en simple constat.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  analyserArguments,
  cheminsDuPorcelain,
  diagnostiquer,
  estFragmentDeHandoff,
  extraireDecisionsRecentes,
  rendre,
  reparer,
  synchroniserOrigin,
  SORTIE_OK,
  SORTIE_FENETRE_RATEE,
  SORTIE_PRECONDITION,
} from './wn-cycle.mjs';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');
const SESSION_LOG = 'docs/claude/SESSION_LOG.md';
// Un handoff est désormais un fragment daté du dossier, jamais un chemin
// littéral partagé : c'est ce créneau unique qui produisait un conflit de merge
// par lot parallèle, et deux handoffs perdus le 2026-08-04.
const HANDOFF = 'docs/claude/handoffs/2026-08-04-1254-agenda-alimentaire-l4a.md';

function faits(surcharge = {}) {
  return {
    dansUnDepot: true,
    branche: 'wn/lot-06',
    brancheParDefaut: 'main',
    arbrePropre: true,
    fichiersDuLot: ['web/src/lib/questions.ts'],
    prOuverte: null,
    prMergee: null,
    ghDisponible: true,
    ...surcharge,
  };
}

test('hors dépôt git : précondition absente, aucun verdict', () => {
  const v = diagnostiquer({ dansUnDepot: false });
  assert.equal(v.phase, 'hors-depot');
  assert.equal(v.sortie, SORTIE_PRECONDITION);
});

test('sur la branche par défaut : hors-lot', () => {
  const v = diagnostiquer(faits({ branche: 'main', fichiersDuLot: [] }));
  assert.equal(v.phase, 'hors-lot');
  assert.equal(v.sortie, SORTIE_OK);
});

test('branche de lot sans clôture ni PR : travail, la clôture est annoncée avant la PR', () => {
  const v = diagnostiquer(faits());
  assert.equal(v.phase, 'travail');
  assert.deepEqual(v.cloture, { sessionLog: false, handoff: false });
  assert.equal(v.sortie, SORTIE_OK);
  assert.ok(v.suivant.some((l) => l.includes('/wn-handoff write')));
});

test('SESSION_LOG seul ne suffit pas : le handoff manquant maintient la phase travail', () => {
  const v = diagnostiquer(faits({ fichiersDuLot: ['web/src/lib/questions.ts', SESSION_LOG] }));
  assert.equal(v.phase, 'travail');
  assert.deepEqual(v.cloture, { sessionLog: true, handoff: false });
});

test('clôture complète sur la branche, aucune PR : pret-pr', () => {
  const v = diagnostiquer(faits({ fichiersDuLot: ['web/src/lib/questions.ts', SESSION_LOG, HANDOFF] }));
  assert.equal(v.phase, 'pret-pr');
  assert.equal(v.sortie, SORTIE_OK);
  assert.ok(v.suivant.some((l) => l.includes('/wn-pr apply')));
});

test('PR ouverte avec la clôture embarquée : pr-ouverte, cap sur le merge', () => {
  const v = diagnostiquer(
    faits({ fichiersDuLot: [SESSION_LOG, HANDOFF], prOuverte: { numero: 545 } }),
  );
  assert.equal(v.phase, 'pr-ouverte');
  assert.ok(v.suivant.some((l) => l.includes('/wn-merge apply')));
});

test('PR ouverte sans la clôture : dernière fenêtre, la clôture est réclamée avant le merge', () => {
  const v = diagnostiquer(faits({ prOuverte: { numero: 545 } }));
  assert.equal(v.phase, 'pr-ouverte');
  assert.equal(v.fenetreRatee, false);
  assert.ok(v.suivant.some((l) => l.includes('/wn-finish')));
  assert.ok(v.suivant.some((l) => l.includes('fenêtre')));
});

test('PR mergée avec la clôture embarquée : rien à reprendre', () => {
  const v = diagnostiquer(
    faits({ prMergee: { numero: 545, fichiers: ['web/src/lib/questions.ts', SESSION_LOG, HANDOFF] } }),
  );
  assert.equal(v.phase, 'apres-merge');
  assert.equal(v.fenetreRatee, false);
  assert.equal(v.sortie, SORTIE_OK);
});

test('PR mergée sans la clôture : fenêtre ratée, sortie en échec', () => {
  const v = diagnostiquer(faits({ prMergee: { numero: 545, fichiers: ['web/src/lib/questions.ts'] } }));
  assert.equal(v.phase, 'apres-merge');
  assert.equal(v.fenetreRatee, true);
  assert.equal(v.sortie, SORTIE_FENETRE_RATEE);
  assert.ok(v.suivant.some((l) => l.includes('depuis `main`')));
  assert.ok(v.suivant.some((l) => l.includes('Ne pas rebrancher')));
});

test('PR mergée aux fichiers inconnus : on ne conclut pas à la fenêtre ratée', () => {
  const v = diagnostiquer(faits({ prMergee: { numero: 545, fichiers: null } }));
  assert.equal(v.phase, 'apres-merge');
  assert.equal(v.fenetreRatee, false);
  assert.equal(v.sortie, SORTIE_OK);
});

test('la preuve de merge prime sur le diff local : une branche squashée reste apres-merge', () => {
  // Sous squash-merge la branche locale survit intacte ; rien dans git seul ne
  // la distingue d'une branche de travail. Si le diff décidait, on rendrait
  // « travail » et le skill écrirait dans le vide.
  const v = diagnostiquer(
    faits({
      fichiersDuLot: ['web/src/lib/questions.ts'],
      prMergee: { numero: 545, fichiers: ['web/src/lib/questions.ts'] },
    }),
  );
  assert.equal(v.phase, 'apres-merge');
});

test('gh indisponible : verdict partiel rendu, jamais une erreur', () => {
  const v = diagnostiquer(faits({ ghDisponible: false }));
  assert.equal(v.phase, 'travail');
  assert.equal(v.sortie, SORTIE_OK);
});

// `/wn-finish` et `/wn-handoff` écrivent avant le commit : si seul le diff
// committé comptait, la clôture serait déclarée absente une seconde après
// avoir été écrite, et le verdict renverrait sur lui-même.
test('porcelain : un fichier écrit mais non committé compte', () => {
  const chemins = cheminsDuPorcelain(` M web/src/lib/questions.ts\n?? ${HANDOFF}\nA  ${SESSION_LOG}`);
  assert.deepEqual(chemins, ['web/src/lib/questions.ts', HANDOFF, SESSION_LOG]);
});

// Régression du 2026-08-03, trouvée par le script sur lui-même : le wrapper git
// appliquait un `.trim()` global, qui mange l'espace de tête de la PREMIÈRE
// ligne (` M chemin`). Le découpage par position emportait alors le premier
// caractère du chemin — `docs/…` devenait `ocs/…` — et la clôture disparaissait
// du verdict, en silence et sur la seule première ligne.
test('porcelain : une première ligne dont l’espace de tête a été rogné reste intacte', () => {
  assert.deepEqual(cheminsDuPorcelain(`M ${HANDOFF}\n M ${SESSION_LOG}`), [HANDOFF, SESSION_LOG]);
});

test('porcelain : un renommage compte par sa destination', () => {
  assert.deepEqual(cheminsDuPorcelain('R  docs/vieux.md -> docs/neuf.md'), ['docs/neuf.md']);
});

test('porcelain vide ou nul : aucun chemin', () => {
  assert.deepEqual(cheminsDuPorcelain(''), []);
  assert.deepEqual(cheminsDuPorcelain(null), []);
});

// ── Le handoff n'est plus un chemin, c'est un fragment ──────────────────────
//
// Ce que ces cas protègent : le contrôle doit reconnaître **n'importe quel**
// fragment daté, sinon on aurait juste déplacé le créneau unique d'un cran.

test('un fragment de handoff, quel que soit son nom, clôt la fenêtre', () => {
  const v = diagnostiquer(
    faits({
      fichiersDuLot: [SESSION_LOG, 'docs/claude/handoffs/2027-01-09-0803-un-autre-lot.md'],
    }),
  );
  assert.equal(v.cloture.handoff, true);
  assert.equal(v.phase, 'pret-pr');
});

test('le README du dossier n’est pas un handoff : la fenêtre reste ouverte', () => {
  const v = diagnostiquer(faits({ fichiersDuLot: [SESSION_LOG, 'docs/claude/handoffs/README.md'] }));
  assert.equal(v.cloture.handoff, false);
  assert.equal(v.phase, 'travail');
});

// `git status --porcelain` sans `-uall` collapse un répertoire entièrement non
// suivi en une seule ligne. Le dossier ne doit alors PAS passer pour un
// fragment : c'est le collecteur qui demande `--untracked-files=all`, et si un
// jour il l'oubliait, le verdict doit dire « handoff absent » plutôt que de
// compter un dossier vide pour une clôture.
test('un répertoire collapsé par porcelain ne vaut pas un fragment', () => {
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/'), false);
  const v = diagnostiquer(faits({ fichiersDuLot: [SESSION_LOG, 'docs/claude/handoffs/'] }));
  assert.equal(v.cloture.handoff, false);
});

test('l’ancien créneau unique ne compte plus pour un handoff', () => {
  assert.equal(estFragmentDeHandoff('docs/claude/HANDOFF_CURRENT.md'), false);
});

test('estFragmentDeHandoff : ni sous-dossier, ni non-markdown, ni voisin de nom', () => {
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/2026-08-04-0150-l3.md'), true);
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/archive/2026-01-01-x.md'), false);
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/notes.txt'), false);
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/'), false);
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs-archives/2026-08-04-x.md'), false);
});

// ── MORSURE — la règle « le plus récent = le dernier au tri » ───────────────
//
// Le README du dossier désigne le handoff courant par un `ls … | tail -1`.
// Cette règle n'est vraie que si TOUT fichier accepté porte un horodatage :
// en tri C, les lettres passent après les chiffres, donc un `notes.md` déposé
// là serait à la fois accepté comme handoff et désigné comme le plus récent.
test('estFragmentDeHandoff : un nom sans horodatage est refusé', () => {
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/notes.md'), false);
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/brouillon-lot-07.md'), false);
  // La date seule ne suffit pas : c'est l'heure qui ordonne les lots d'un même
  // jour, et le 2026-08-04 en a porté quatre.
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/2026-08-04-l3.md'), false);
  assert.equal(estFragmentDeHandoff('docs/claude/handoffs/2026-08-04-0150-l3.md'), true);
});

test('les fragments réellement présents dans le dépôt passent le motif', () => {
  // Un motif qui refuserait les fichiers existants ferait échouer la clôture
  // du lot suivant, et se découvrirait au pire moment.
  const dossier = 'docs/claude/handoffs';
  for (const nom of readdirSync(join(RACINE, dossier))) {
    if (nom === 'README.md') continue;
    assert.equal(estFragmentDeHandoff(`${dossier}/${nom}`), true, nom);
  }
});

test('PR mergée avec un fragment de handoff embarqué : rien à reprendre', () => {
  const v = diagnostiquer(
    faits({
      prMergee: {
        numero: 562,
        fichiers: ['web/src/lib/questions.ts', SESSION_LOG, 'docs/claude/handoffs/2026-08-04-1254-x.md'],
      },
    }),
  );
  assert.equal(v.fenetreRatee, false);
  assert.equal(v.sortie, SORTIE_OK);
});

test('PR mergée avec le SESSION_LOG mais aucun fragment : fenêtre ratée', () => {
  const v = diagnostiquer(faits({ prMergee: { numero: 562, fichiers: [SESSION_LOG] } }));
  assert.equal(v.fenetreRatee, true);
  assert.equal(v.sortie, SORTIE_FENETRE_RATEE);
});

// ── Sync origin : le verdict s'enrichit, il ne change jamais de code ─────────

test('sans fait de sync : verdict inchangé, aucun avertissement', () => {
  const v = diagnostiquer(faits());
  assert.equal(v.sync, null);
  assert.deepEqual(v.avertissements, []);
});

test('origin frais et aligné : sync présente, silencieuse', () => {
  const v = diagnostiquer(faits({ sync: { fetchOk: true, ahead: 0, behind: 0 } }));
  assert.equal(v.sync.desynchronise, false);
  assert.deepEqual(v.avertissements, []);
  assert.equal(v.sortie, SORTIE_OK);
});

test('défaut local en retard sur origin : signalé, sans changer la sortie', () => {
  const v = diagnostiquer(faits({ sync: { fetchOk: true, ahead: 0, behind: 51 } }));
  assert.equal(v.sync.desynchronise, true);
  assert.ok(v.avertissements.some((l) => l.includes('behind 51')));
  assert.equal(v.sortie, SORTIE_OK);
});

test('défaut divergent (ahead ET behind) : signalé, la réconciliation reste humaine', () => {
  const v = diagnostiquer(faits({ sync: { fetchOk: true, ahead: 50, behind: 51 } }));
  assert.equal(v.sync.desynchronise, true);
  assert.ok(v.avertissements.some((l) => l.includes('arbitrage humain')));
});

test('fetch échoué : hors-ligne signalé, le verdict de phase est rendu quand même', () => {
  const v = diagnostiquer(faits({ sync: { fetchOk: false, ahead: null, behind: null } }));
  assert.equal(v.phase, 'travail');
  assert.equal(v.sortie, SORTIE_OK);
  assert.ok(v.avertissements.some((l) => l.includes('hors-ligne')));
  assert.equal(v.sync.desynchronise, false);
});

test('fenêtre ratée et sync dégradée se cumulent sans se masquer', () => {
  const v = diagnostiquer(
    faits({
      prMergee: { numero: 562, fichiers: [SESSION_LOG] },
      sync: { fetchOk: true, ahead: 2, behind: 0 },
    }),
  );
  assert.equal(v.sortie, SORTIE_FENETRE_RATEE);
  assert.equal(v.sync.desynchronise, true);
  assert.equal(v.avertissements.length, 1);
});

// ── Décisions récentes : extraction depuis le registre append-en-tête ────────

test('extraireDecisionsRecentes : les premières entrées du registre, dans leur ordre', () => {
  const registre = [
    '# Registre des décisions',
    '## Décisions actives',
    '### D-031 — Une porte posée par une règle',
    'prose',
    '### D-030 — Un seul pack actif',
    '### D-029 — Autre',
    '### D-028 — Autre',
    '### D-027 — Autre',
    '### D-026 — Autre',
  ].join('\n');
  assert.deepEqual(extraireDecisionsRecentes(registre), ['D-031', 'D-030', 'D-029', 'D-028', 'D-027']);
});

test('extraireDecisionsRecentes : un D-NNN cité dans la prose ne compte pas', () => {
  const registre = '### D-031 — Titre\nvoir [[D-018]] et D-025 en réserve\n';
  assert.deepEqual(extraireDecisionsRecentes(registre), ['D-031']);
});

test('extraireDecisionsRecentes : registre vide ou absent', () => {
  assert.deepEqual(extraireDecisionsRecentes(''), []);
  assert.deepEqual(extraireDecisionsRecentes(null), []);
});

// ── Arguments CLI : `--local` saute réseau et gh, il doit être reconnu ───────
//
// `--local` est consommé par les préambules de `/wn-finish` et `/wn-handoff`,
// qui ne lisent que les faits de clôture : un drapeau mal analysé referait le
// fetch et les appels gh en silence — exactement ce que le mode existe pour
// éviter.

test('analyserArguments : --local, --appliquer et l’aide sont reconnus, sans ordre imposé', () => {
  assert.deepEqual(analyserArguments([]), { local: false, appliquer: false, aide: false });
  assert.deepEqual(analyserArguments(['--local']), { local: true, appliquer: false, aide: false });
  assert.deepEqual(analyserArguments(['--appliquer', '--local']), {
    local: true,
    appliquer: true,
    aide: false,
  });
  assert.equal(analyserArguments(['--help']).aide, true);
  assert.equal(analyserArguments(['--aide']).aide, true);
  assert.equal(analyserArguments(['--locale']).local, false);
});

// ── Mode --local : ce qui n'a pas été vérifié se dit tel quel ────────────────
//
// Le contrat du drapeau est négatif : aucun réseau, aucun gh. Ce qu'il faut
// alors empêcher, c'est un rendu qui AFFIRME — « aucune PR », « origin
// rafraîchi » — là où rien n'a été interrogé. Pas d'injection d'exécuteur de
// commandes ici : `git()`, `gh()`, `fetchRecent()` et le fetch appellent
// `execFileSync` en closures de module, l'injecter exigerait de fileter un
// paramètre à travers toute la collecte — une restructuration, pas un test.
// On teste donc les fonctions du verdict et du rendu sur faits injectés, plus
// `synchroniserOrigin` en vrai (rev-parse en lecture seule, jamais de réseau).

test('mode local : la ligne PR dit « non vérifiée », jamais un faux « aucune »', () => {
  const f = faits({ modeLocal: true, sync: { fetchOk: null, ahead: null, behind: null } });
  const lignePr = rendre(f, diagnostiquer(f))
    .split('\n')
    .find((l) => l.startsWith('PR '));
  assert.ok(lignePr.includes('non vérifiée (mode local)'), lignePr);
  assert.ok(!lignePr.includes('aucune'), lignePr);
});

test('mode local sur la branche par défaut : gh n’est jamais interrogé, le rendu normal reste juste', () => {
  const f = faits({
    branche: 'main',
    fichiersDuLot: [],
    modeLocal: true,
    sync: { fetchOk: null, ahead: null, behind: null },
  });
  const lignePr = rendre(f, diagnostiquer(f))
    .split('\n')
    .find((l) => l.startsWith('PR '));
  assert.ok(lignePr.includes('aucune'), lignePr);
});

test('fetchOk null (non tenté) : ni « origin rafraîchi », ni l’avertissement hors-ligne', () => {
  const f = faits({ modeLocal: true, sync: { fetchOk: null, ahead: null, behind: null } });
  const v = diagnostiquer(f);
  assert.equal(v.sync.desynchronise, false);
  assert.deepEqual(v.avertissements, []);
  const texte = rendre(f, v);
  assert.ok(texte.includes('fetch non tenté'), texte);
  assert.ok(!texte.includes('origin rafraîchi'), texte);
});

test('synchroniserOrigin en mode local : fetchOk vaut null, même si un fetch récent existe', () => {
  // `local` doit être jugé AVANT `fetchRecent()` : un FETCH_HEAD frais (posé
  // par un autre outil de la même fenêtre) rendait `fetchOk = true` et le
  // rendu affirmait « origin rafraîchi » sans qu'aucun fetch soit parti.
  const { sync } = synchroniserOrigin('main', { local: true });
  assert.equal(sync.fetchOk, null);
});

// ── `reparer()` : ce qu'il écrit, et surtout ce qu'il n'écrit plus ───────────
//
// La fonction n'était ni exportée ni couverte : c'est elle qui écrivait le bloc
// `git`, dont `dirty` valait toujours `true` par construction (`--appliquer`
// tourne AVANT le commit) — donc toujours à côté de la réalité.
// Ces cas fixent le contrat après son retrait.

function racineTemporaire(etatInitial) {
  const racine = mkdtempSync(join(tmpdir(), 'wn-cycle-reparer-'));
  mkdirSync(join(racine, '.wn'), { recursive: true });
  writeFileSync(join(racine, '.wn', 'state.json'), `${JSON.stringify(etatInitial, null, 2)}\n`, 'utf8');
  return racine;
}

function etatDe(racine) {
  return JSON.parse(readFileSync(join(racine, '.wn', 'state.json'), 'utf8'));
}

test('reparer : le bloc git est retiré, jamais réécrit', () => {
  const racine = racineTemporaire({
    schema_version: 2,
    active_campaign: 'demo',
    git: { branch: 'worktree-mort', last_commit: 'deadbee', dirty: true },
  });
  reparer(racine, { maintenant: '2026-08-07T18:00:00.000Z' });
  const etat = etatDe(racine);
  assert.equal('git' in etat, false);
  assert.equal(etat.active_campaign, 'demo');
});

test('reparer : un état sans bloc git reste sans bloc git', () => {
  const racine = racineTemporaire({ schema_version: 2, active_campaign: 'demo' });
  reparer(racine, { maintenant: '2026-08-07T18:00:00.000Z' });
  assert.equal('git' in etatDe(racine), false);
});

test('reparer : updated_at est renseigné, sans millisecondes', () => {
  const racine = racineTemporaire({ schema_version: 2 });
  reparer(racine, { maintenant: '2026-08-07T18:00:00.000Z' });
  assert.equal(etatDe(racine).updated_at, '2026-08-07T18:00:00Z');
});

test('reparer : les champs de campagne ne sont jamais touchés', () => {
  const racine = racineTemporaire({
    schema_version: 2,
    active_campaign: 'demo',
    active_lot: 'LOT-03',
    next_action: ['première ligne', 'seconde ligne'],
    blocking_issues: ['un blocage'],
  });
  reparer(racine, { maintenant: '2026-08-07T18:00:00.000Z' });
  const etat = etatDe(racine);
  assert.equal(etat.active_lot, 'LOT-03');
  assert.deepEqual(etat.next_action, ['première ligne', 'seconde ligne']);
  assert.deepEqual(etat.blocking_issues, ['un blocage']);
});

test('reparer : deux appels successifs rendent le même état (idempotence)', () => {
  const racine = racineTemporaire({
    schema_version: 2,
    active_campaign: 'demo',
    git: { branch: 'x', last_commit: 'y', dirty: true },
  });
  reparer(racine, { maintenant: '2026-08-07T18:00:00.000Z' });
  const premier = etatDe(racine);
  reparer(racine, { maintenant: '2026-08-07T18:00:00.000Z' });
  assert.deepEqual(etatDe(racine), premier);
});
