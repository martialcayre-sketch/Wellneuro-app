// Banc de `scripts/lib/focus-areas-pr-agent.mjs` (lot `autonomie-pieges-
// restes`, partie 14). Les corps reprennent la forme du commentaire
// persistant de PR-Agent v0.49.0 (constatée sur #2209, #2215, #2251), avec
// des titres et des textes fabriqués.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { SECTION_FOCUS, normaliser, titresAffiches, titresBloc, titresFocus, titresNonCites } from './focus-areas-pr-agent.mjs';

const zone = (titre, { lien = true } = {}) =>
  `<details><summary>${lien ? "<a href='https://github.com/o/d/pull/1/files#diff-abcR1-R2'>" : ''}<strong>${titre}</strong>${lien ? '</a>' : ''}

Explication du constat, avec un <strong>gras</strong> qui n'est pas un titre.
</summary>

\`\`\`typescript
const x = 1;
\`\`\`

</details>`;

const corps = (...zones) => `## PR Reviewer Guide 🔍

<!-- pr-agent:review:full -->

Here are some key observations to aid the review process:

<table>
<tr><td>🧪&nbsp;<strong>PR contains tests</strong></td></tr>
<tr><td>🔒&nbsp;<strong>No security concerns identified</strong></td></tr>
<tr><td>⚡&nbsp;<strong>${SECTION_FOCUS}</strong><br><br>

${zones.join('\n\n')}

</td></tr>
</table>`;

const SANS_ZONE = `## PR Reviewer Guide 🔍

<!-- pr-agent:review:full -->

<table>
<tr><td>🧪&nbsp;<strong>PR contains tests</strong></td></tr>
<tr><td>🔒&nbsp;<strong>No security concerns identified</strong></td></tr>
<tr><td>⚡&nbsp;<strong>No major issues detected</strong></td></tr>
</table>`;

// ── Lecture des titres ─────────────────────────────────────────────────────

test('titres : « No major issues detected » → aucun titre', () => {
  assert.deepEqual(titresFocus(SANS_ZONE), []);
  assert.deepEqual(titresFocus(''), []);
  assert.deepEqual(titresFocus(undefined), []);
});

test('titres : une zone, avec lien — le titre seul, pas le gras de l\'explication', () => {
  assert.deepEqual(titresFocus(corps(zone('Garde affaiblie'))), ['Garde affaiblie']);
});

test('titres : plusieurs zones, dans l\'ordre ; un résumé sans lien se lit aussi', () => {
  assert.deepEqual(titresFocus(corps(zone('Garde fail-open'), zone('`limites` non corrigeable', { lien: false }), zone('Fragment changelog absent'))), [
    'Garde fail-open',
    '`limites` non corrigeable',
    'Fragment changelog absent',
  ]);
});

test('titres : entités HTML décodées, balises internes retirées', () => {
  assert.deepEqual(titresFocus(corps(zone('Cas d&#39;arrêt &amp; <code>repli</code>'))), ["Cas d'arrêt & repli"]);
});

test('titres : un titre répété ne compte qu\'une fois', () => {
  assert.deepEqual(titresFocus(corps(zone('Possible Issue'), zone('Possible Issue'))), ['Possible Issue']);
});

test('titres : section présente mais gabarit inconnu → null, jamais « aucune »', () => {
  assert.equal(titresFocus(`⚡ <strong>${SECTION_FOCUS}</strong>\n\n- Garde affaiblie : explication`), null);
  assert.equal(titresFocus(corps('<details><summary>Garde affaiblie</summary></details>')), null);
});

test('titres : un <strong> avant la section n\'est pas une focus area', () => {
  const avant = '<details><summary><strong>Leurre</strong></summary></details>\n';
  assert.deepEqual(titresFocus(avant + corps(zone('Vrai titre'))), ['Vrai titre']);
});

// ── Bloc d'état : les remarques des têtes précédentes ──────────────────────

const bloc = (findings) => `\n\n<!-- pr-agent-review-state:v1\n${JSON.stringify({ findings, last_run: { head_sha: 'a'.repeat(40), excluded_files: [] }, schema_version: 1 })}\n-->`;
const remarque = (titre, state = 'ACTIVE') => ({ body: `**${titre}**\n\nExplication.`, finding_id: titre.length.toString(16), state });

test('bloc : sans bloc → [] ; titres de toutes les remarques, quel que soit leur état', () => {
  assert.deepEqual(titresBloc(SANS_ZONE), []);
  assert.deepEqual(titresBloc(SANS_ZONE + bloc([remarque('Contrôle contournable', 'RESOLVED'), remarque('Faux négatif possible')])), [
    'Contrôle contournable',
    'Faux négatif possible',
  ]);
});

test('bloc : marqueur mal délimité (CRLF) ou deux blocs → null, jamais []', () => {
  const b = bloc([remarque('Contrôle contournable')]);
  assert.equal(titresBloc(b.replace(/\n/g, '\r\n')), null);
  assert.equal(titresBloc(b + b), null);
  assert.equal(titresBloc(`${SANS_ZONE}\n<!-- pr-agent-review-state:v1 {"findings":[]} -->`), null);
});

test('bloc : JSON illisible, findings absent ou remarque sans titre → null', () => {
  assert.equal(titresBloc('<!-- pr-agent-review-state:v1\n{pas du json\n-->'), null);
  assert.equal(titresBloc(bloc(null).replace('"findings":null', '"autre":1')), null);
  assert.equal(titresBloc(bloc([{ body: 'Sans gras.', state: 'ACTIVE' }])), null);
});

test('tous : affichées d\'abord, puis celles du bloc que l\'affichage ne porte plus, sans doublon', () => {
  const c = corps(zone('Faux négatif possible')) + bloc([remarque('Contrôle contournable', 'RESOLVED'), remarque('Faux négatif possible')]);
  assert.deepEqual(titresFocus(c), ['Faux négatif possible', 'Contrôle contournable']);
});

test('tous : une remarque résolue seule, sans section affichée, attend encore son verdict', () => {
  assert.deepEqual(titresFocus(SANS_ZONE + bloc([remarque('Incohérence documentaire', 'RESOLVED')])), ['Incohérence documentaire']);
});

test('tous : un bloc illisible rend null même si la section se lit', () => {
  assert.equal(titresFocus(corps(zone('A')) + '\n<!-- pr-agent-review-state:v1\n{x\n-->'), null);
  assert.equal(titresAffiches(corps(zone('A'))).length, 1);
});

// ── Citation ───────────────────────────────────────────────────────────────

test('normaliser : gras, code, chevrons, guillemets, casse et blancs', () => {
  assert.equal(normaliser('**Contrôle `incertains`  affaibli**'), normaliser('« contrôle incertains affaibli »'));
  assert.equal(normaliser('Cas d’arrêt'), normaliser("cas d'arrêt"));
});

test('cités : un titre en gras ou entre chevrons dans un commentaire compte', () => {
  const textes = ['Verdicts :\n- **Garde affaiblie** : routée.', 'PR-Agent, focus area « Fragment changelog absent » : écarté.'];
  assert.deepEqual(titresNonCites(['Garde affaiblie', 'Fragment changelog absent'], textes), []);
});

test('non cités : un titre paraphrasé ou absent est rendu', () => {
  const textes = ['1. **Texte de la mention non vérifiable** : écarté.', 'prête @abcdef1'];
  assert.deepEqual(titresNonCites(['Texte patient/praticien non vérifiable', 'Décision D-xxx absente'], textes), [
    'Texte patient/praticien non vérifiable',
    'Décision D-xxx absente',
  ]);
});

test('non cités : « focus area » sans titre ne vaut pas citation de « Possible Issue »', () => {
  assert.deepEqual(titresNonCites(['Possible Issue'], ['Verdict sur le « focus area » de PR-Agent : écarté.']), ['Possible Issue']);
});

test('cités : un titre contenu dans un autre doit être cité pour lui-même', () => {
  const titres = ['Focus perdu', 'Focus perdu au succès'];
  assert.deepEqual(titresNonCites(titres, ['**Focus perdu au succès** : corrigé.']), ['Focus perdu']);
  assert.deepEqual(titresNonCites(titres, ['**Focus perdu au succès** : corrigé.', '**Focus perdu** : corrigé.']), []);
  assert.deepEqual(titresNonCites(titres, ['**Focus perdu au succès** : corrigé. **Focus perdu** : corrigé.']), []);
});

test('cités : un titre cité dans un autre commentaire que celui du plus long compte', () => {
  assert.deepEqual(titresNonCites(['Focus perdu', 'Focus perdu au succès'], ['**Focus perdu** : corrigé.', 'Focus perdu au succès : corrigé.']), []);
});

test('titre court : la prose de la déclaration ne le cite pas, une marque si', () => {
  const prose = ['prête @abcdef1 — Tests verts. Aucune migration ni authentification.'];
  assert.deepEqual(titresNonCites(['Migration', 'Tests'], prose), ['Migration', 'Tests']);
  for (const cite of ['**Migration** : écartée.', '« Migration » : écartée.', '"Migration" : écartée.', '`Migration` : écartée.', '« migration » : écartée.']) {
    assert.deepEqual(titresNonCites(['Migration'], [cite]), [], cite);
  }
  assert.deepEqual(titresNonCites(['Possible Issue'], ['La remarque possible issue est écartée.']), ['Possible Issue']);
  assert.deepEqual(titresNonCites(['Possible Issue'], ['**Possible Issue** : écartée.']), []);
  // Formes réelles : précision ou détail avant la marque fermante, italique.
  for (const cite of ['**Clôture déduite (BP-15)** : corrigé.', '1. **Focus perdu — `Panneau`** : corrigé.', '- *Conditions incohérentes* (D-537 §5) : corrigé.']) {
    assert.equal(titresNonCites(['Clôture déduite', 'Focus perdu', 'Conditions incohérentes'], [cite]).length, 2, cite);
  }
  // Une marque ouverte sur un mot plus long, une puce, un identifiant ne citent pas.
  assert.deepEqual(titresNonCites(['Migration'], ['**Migrations** à venir.']), ['Migration']);
  assert.deepEqual(titresNonCites(['Tests'], ['* Tests verts.', 'variable `run_tests` lue.']), ['Tests']);
});

test('titre long : cité sans marque ; les marques du titre lui-même sont facultatives', () => {
  assert.deepEqual(titresNonCites(['Fragment changelog absent'], ['Le fragment changelog absent : écarté, il est dans la PR.']), []);
  assert.deepEqual(titresNonCites(['`limites` non corrigeable'], ['limites non corrigeable : corrigé.']), []);
  assert.deepEqual(titresNonCites(['limites non corrigeable'], ['**`limites` non corrigeable** : corrigé.']), []);
});

test('ponctuation finale du titre ignorée', () => {
  assert.deepEqual(titresNonCites(['Régression possible.'], ['« Régression possible » : écartée.']), []);
});

test('apostrophes droite et courbe équivalentes', () => {
  assert.deepEqual(titresNonCites(['Cas d’arrêt manquant'], ["**Cas d'arrêt manquant** : corrigé."]), []);
});

test('non cités : aucun texte → tous rendus ; aucun titre → rien', () => {
  assert.deepEqual(titresNonCites(['A b'], []), ['A b']);
  assert.deepEqual(titresNonCites([], ['x']), []);
});
