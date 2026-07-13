import { describe, expect, it } from 'vitest';
import { createRequestContext, finalizeLogContext, withCorrelationHeader } from './requestContext';

describe('requestContext', () => {
  it('crée un correlationId WellNeuro', () => {
    const req = new Request('https://app.wellneuro.fr/api/praticien/metrics', {
      method: 'GET',
      headers: { 'x-request-id': 'req_123' },
    });
    const ctx = createRequestContext(req);

    expect(ctx.correlationId.startsWith('cor_')).toBe(true);
    expect(ctx.requestId).toBe('req_123');
  });

  it('finalise le contexte avec durée et statut', () => {
    const req = new Request('https://app.wellneuro.fr/api/praticien/metrics', { method: 'GET' });
    const ctx = createRequestContext(req);
    const out = finalizeLogContext(ctx, { statusCode: 500, retryable: true });

    expect(typeof out.durationMs).toBe('number');
    expect(out.statusCode).toBe(500);
    expect(out.retryable).toBe(true);
  });

  it('injecte le header de corrélation dans la réponse', () => {
    const req = new Request('https://app.wellneuro.fr/api/praticien/metrics', { method: 'GET' });
    const ctx = createRequestContext(req);
    const response = withCorrelationHeader(new Response('ok'), ctx);

    expect(response.headers.get('X-WellNeuro-Correlation-Id')).toBe(ctx.correlationId);
  });
});
