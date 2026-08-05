// Banc des gardes de troncature.
//
//   node --test tools/corpus/certify/lib/troncature.test.mjs
//
// Ce que ces cas prouvent : le garde MORD quand la réponse est coupée, et se
// tait quand elle ne l'est pas. Les deux sens comptent autant l'un que l'autre
// — un garde qui lèverait toujours serait vert pour une mauvaise raison, et le
// dépôt en porte déjà trois précédents.
//
// Le message d'erreur est lui aussi sous test : c'est lui qui a manqué le
// 2026-07-30, quand une troncature s'est présentée comme un défaut de JSON.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifierReponseClaude, verifierReponseGpt } from './troncature.mjs';

// ── Lecture B (Claude, API Messages) ───────────────────────────────────────

test('Claude — une réponse complète passe sans lever', () => {
  assert.doesNotThrow(() => verifierReponseClaude({ stop_reason: 'end_turn' }));
});

test('Claude — une réponse coupée par le plafond lève', () => {
  assert.throws(() => verifierReponseClaude({ stop_reason: 'max_tokens' }), /tronquée/);
});

test('Claude — le message nomme le lecteur et la cause, pas le symptôme', () => {
  try {
    verifierReponseClaude({ stop_reason: 'max_tokens' });
    assert.fail('le garde aurait dû lever');
  } catch (e) {
    assert.match(e.message, /lecture B/);
    assert.match(e.message, /max_tokens/);
    assert.doesNotMatch(e.message, /JSON/i, 'la troncature ne doit jamais se présenter comme un défaut de parse');
  }
});

test('Claude — un arrêt sur séquence d’arrêt n’est pas une troncature', () => {
  assert.doesNotThrow(() => verifierReponseClaude({ stop_reason: 'stop_sequence' }));
});

// ── Lecture C (GPT, API Responses) ─────────────────────────────────────────

test('GPT — une réponse complète passe sans lever', () => {
  assert.doesNotThrow(() => verifierReponseGpt({ status: 'completed' }));
});

test('GPT — `status: incomplete` lève, motif rendu par l’API', () => {
  assert.throws(
    () => verifierReponseGpt({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }),
    /max_output_tokens/,
  );
});

test('GPT — le message nomme le lecteur et la cause, pas le symptôme', () => {
  try {
    verifierReponseGpt({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } });
    assert.fail('le garde aurait dû lever');
  } catch (e) {
    assert.match(e.message, /lecture C/);
    assert.match(e.message, /tronquée/);
    assert.doesNotMatch(e.message, /JSON/i, 'la troncature ne doit jamais se présenter comme un défaut de parse');
  }
});

test('GPT — `incomplete_details` absent : le garde mord quand même, sans planter', () => {
  // Vu sur le vrai chemin d'appel : lire `.reason` sur `undefined` remplacerait
  // une troncature diagnostiquée par un TypeError, donc par rien du tout.
  assert.throws(() => verifierReponseGpt({ status: 'incomplete' }), /tronquée/);
  assert.throws(() => verifierReponseGpt({ status: 'incomplete', incomplete_details: null }), /tronquée/);
});

test('GPT — un filtrage de contenu est signalé comme tel, pas comme un plafond', () => {
  assert.throws(
    () => verifierReponseGpt({ status: 'incomplete', incomplete_details: { reason: 'content_filter' } }),
    /content_filter/,
  );
});

test('GPT — un statut `failed` lève, et n’est pas présenté comme une troncature', () => {
  // Le SDK ne lève pas sur `failed` : il résout avec l'objet, `output_text`
  // vide. Sans ce cas, l'échec ressortirait en « aucun objet JSON ».
  assert.throws(
    () => verifierReponseGpt({ status: 'failed', error: { code: 'server_error' } }),
    /non aboutie.*server_error/s,
  );
});

test('GPT — un statut `cancelled` lève même sans détail d’erreur', () => {
  assert.throws(() => verifierReponseGpt({ status: 'cancelled' }), /non aboutie/);
});

test('GPT — aucun statut rendu : le garde se tait plutôt que d’inventer un échec', () => {
  assert.doesNotThrow(() => verifierReponseGpt({ output_text: '{"items":[]}' }));
});

test('Claude — un refus lève, et se nomme refus et non troncature', () => {
  assert.throws(() => verifierReponseClaude({ stop_reason: 'refusal' }), /refusée/);
  assert.doesNotThrow(() => verifierReponseClaude({ stop_reason: 'tool_use' }));
});

test('GPT — `finish_reason` n’est PAS le signal de cette API', () => {
  // Piège d'API : `finish_reason: 'length'` appartient à Chat Completions.
  // Sur Responses, il n'existe pas — un garde qui le guetterait ne verrait
  // jamais rien. Ce cas fige le fait qu'on ne s'y fie pas.
  assert.doesNotThrow(() => verifierReponseGpt({ status: 'completed', finish_reason: 'length' }));
});

// ── Les deux lecteurs ──────────────────────────────────────────────────────

test('un objet vide ou absent ne fait pas planter les gardes', () => {
  for (const garde of [verifierReponseClaude, verifierReponseGpt]) {
    assert.doesNotThrow(() => garde({}));
    assert.doesNotThrow(() => garde(null));
    assert.doesNotThrow(() => garde(undefined));
  }
});
