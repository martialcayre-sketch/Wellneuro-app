import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// LA BORNE D'UNE EXTRACTION SE PROUVE SUR LE VRAI CLIENT DU SDK. L'option
// `timeout` du SDK n'arme son minuteur qu'autour du `fetch` : il tombe dès les
// en-têtes reçus, et la lecture du flux qui suit n'est bornée par rien
// (`@anthropic-ai/sdk` 0.107.0, `client.js`, `timedFetch`). Un double de
// `messages.stream` ne peut pas le voir : ici seul le `fetch` est simulé, et il
// se comporte comme celui de Node (un abandon fait échouer le corps en cours).

const { faux } = vi.hoisted(() => ({ faux: { fetch: (() => {}) as unknown as typeof fetch } }));
vi.mock('@/lib/anthropic', async () => {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  return { anthropic: new Anthropic({ apiKey: 'cle-de-test', fetch: (url, init) => faux.fetch(url, init) }) };
});

import { DUREE_TOTALE_EXTRACTION_MS, extraireCompteRendu } from './extraction';
import { PEREMPTION_EN_COURS_MS } from './verrou';

const encodeur = new TextEncoder();
const evenement = (type: string, data: object) => encodeur.encode(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
const DEBUT = evenement('message_start', {
  message: {
    id: 'msg_fixture', type: 'message', role: 'assistant', model: 'claude-sonnet-5-5', content: [],
    stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
  },
});

function erreurAbandon(): Error {
  const err = new Error('This operation was aborted');
  err.name = 'AbortError';
  return err;
}

/** En-têtes reçus, un premier événement, puis plus rien — sans jamais finir. */
function fluxSansFin(): typeof fetch {
  return (async (_url: unknown, init?: RequestInit) => {
    const corps = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(DEBUT);
        init?.signal?.addEventListener('abort', () => c.error(erreurAbandon()), { once: true });
      },
    });
    return new Response(corps, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
}

/** Aucun en-tête, jamais. */
function sansEnTetes(): typeof fetch {
  return ((_url: unknown, init?: RequestInit) =>
    new Promise<Response>((_, rejeter) => {
      init?.signal?.addEventListener('abort', () => rejeter(erreurAbandon()), { once: true });
    })) as typeof fetch;
}

/** Un flux complet qui se termine normalement. */
function fluxComplet(texte: string): typeof fetch {
  return (async () => {
    const corps = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(DEBUT);
        c.enqueue(evenement('content_block_start', { index: 0, content_block: { type: 'text', text: '' } }));
        c.enqueue(evenement('content_block_delta', { index: 0, delta: { type: 'text_delta', text: texte } }));
        c.enqueue(evenement('content_block_stop', { index: 0 }));
        c.enqueue(evenement('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 10 } }));
        c.enqueue(evenement('message_stop', {}));
        c.close();
      },
    });
    return new Response(corps, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }) as typeof fetch;
}

const EN_ATTENTE = Symbol('en_attente');

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('extraireCompteRendu — borne totale, sur le vrai client du SDK', () => {
  it('un flux dont le corps ne finit jamais est clos `delai_depasse` avant la péremption', async () => {
    faux.fetch = fluxSansFin();
    const issue = extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf');
    await vi.advanceTimersByTimeAsync(PEREMPTION_EN_COURS_MS);
    expect(await Promise.race([issue, Promise.resolve(EN_ATTENTE)])).toEqual({ ok: false, motif: 'delai_depasse' });
  });

  it('la borne tombe à `DUREE_TOTALE_EXTRACTION_MS`, ni avant ni après', async () => {
    faux.fetch = fluxSansFin();
    const issue = extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf');
    await vi.advanceTimersByTimeAsync(DUREE_TOTALE_EXTRACTION_MS - 1);
    expect(await Promise.race([issue, Promise.resolve(EN_ATTENTE)])).toBe(EN_ATTENTE);
    await vi.advanceTimersByTimeAsync(1);
    expect(await Promise.race([issue, Promise.resolve(EN_ATTENTE)])).toEqual({ ok: false, motif: 'delai_depasse' });
  });

  it('un fournisseur muet (aucun en-tête) est clos `delai_depasse` avant la péremption', async () => {
    faux.fetch = sansEnTetes();
    const issue = extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf');
    await vi.advanceTimersByTimeAsync(PEREMPTION_EN_COURS_MS);
    expect(await Promise.race([issue, Promise.resolve(EN_ATTENTE)])).toEqual({ ok: false, motif: 'delai_depasse' });
  });

  it('un flux complet est lu, et aucun minuteur ne lui survit', async () => {
    faux.fetch = fluxComplet(JSON.stringify({ lisible: true, laboratoire: null, lignes: [] }));
    const issue = extraireCompteRendu(Buffer.from('%PDF-'), 'application/pdf');
    await vi.advanceTimersByTimeAsync(0);
    expect(await issue).toEqual({ ok: true, laboratoire: null, lignes: [] });
    expect(vi.getTimerCount()).toBe(0);
  });
});
