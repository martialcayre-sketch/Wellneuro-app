import { describe, expect, it } from 'vitest';
import { parseSseFrame, readEventStream, type SseEvent } from './readEventStream';

function fluxDepuis(chunks: string[]): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { headers: { 'content-type': 'text/event-stream' } });
}

describe('parseSseFrame', () => {
  it('ignore les commentaires / heartbeats', () => {
    expect(parseSseFrame(': battement')).toBeNull();
    expect(parseSseFrame('')).toBeNull();
  });

  it('extrait event + data', () => {
    expect(parseSseFrame('event: done\ndata: {"ok":true}')).toEqual({ event: 'done', data: '{"ok":true}' });
  });

  it('data sans event → « message »', () => {
    expect(parseSseFrame('data: x')).toEqual({ event: 'message', data: 'x' });
  });
});

describe('readEventStream', () => {
  it('remonte les événements nommés en ignorant les heartbeats, à travers des découpes de chunk arbitraires', async () => {
    const res = fluxDepuis([': ouverture\n\n', 'event: do', 'ne\ndata: {"idSynthese":"SYN_1"}\n', '\n']);
    const events: SseEvent[] = [];
    await readEventStream(res, e => events.push(e));
    expect(events).toEqual([{ event: 'done', data: '{"idSynthese":"SYN_1"}' }]);
  });

  it('remonte un event: error', async () => {
    const res = fluxDepuis(['event: error\ndata: {"error":"boom"}\n\n']);
    const events: SseEvent[] = [];
    await readEventStream(res, e => events.push(e));
    expect(events).toEqual([{ event: 'error', data: '{"error":"boom"}' }]);
  });

  it('flux vide (heartbeats seuls) : aucun événement nommé', async () => {
    const res = fluxDepuis([': ouverture\n\n', ': battement\n\n']);
    const events: SseEvent[] = [];
    await readEventStream(res, e => events.push(e));
    expect(events).toEqual([]);
  });
});
