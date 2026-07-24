import { randomUUID } from 'crypto';
import type { LogContext, RequestContext } from './types';
import { deploymentEnv, deploymentRequestId, releaseSha } from './deploymentEnv';
import { sanitizeUrl } from './sanitizeLogData';

function resolveRuntime(): string {
  return process.env.NEXT_RUNTIME ?? 'nodejs';
}

export function createRequestContext(req: Request): RequestContext {
  return {
    correlationId: `cor_${randomUUID().replace(/-/g, '')}`,
    requestId: deploymentRequestId(req.headers),
    route: sanitizeUrl(req.url),
    method: req.method,
    environment: deploymentEnv(),
    release: releaseSha(),
    runtime: resolveRuntime(),
    startedAtMs: Date.now(),
  };
}

export function finalizeLogContext(
  context: RequestContext,
  extra?: Omit<LogContext, 'environment' | 'release' | 'runtime' | 'route' | 'method' | 'requestId' | 'correlationId' | 'durationMs'>
): LogContext {
  return {
    environment: context.environment,
    release: context.release,
    runtime: context.runtime,
    route: context.route,
    method: context.method,
    requestId: context.requestId,
    correlationId: context.correlationId,
    durationMs: Date.now() - context.startedAtMs,
    ...extra,
  };
}

export function withCorrelationHeader<T extends Response>(response: T, context: RequestContext): T {
  response.headers.set('X-WellNeuro-Correlation-Id', context.correlationId);
  return response;
}
