import { randomUUID } from 'crypto';
import type { AppEnvironment, LogContext, RequestContext } from './types';
import { sanitizeUrl } from './sanitizeLogData';

function resolveEnvironment(): AppEnvironment {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production' || vercelEnv === 'preview' || vercelEnv === 'development') {
    return vercelEnv;
  }
  if (process.env.NODE_ENV === 'production') return 'production';
  return 'development';
}

function resolveRelease(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA ?? process.env.NEXT_PUBLIC_APP_VERSION ?? 'local';
}

function resolveRuntime(): string {
  return process.env.NEXT_RUNTIME ?? 'nodejs';
}

export function createRequestContext(req: Request): RequestContext {
  const requestId =
    req.headers.get('x-vercel-id') ??
    req.headers.get('x-request-id') ??
    req.headers.get('x-amzn-trace-id') ??
    null;

  return {
    correlationId: `cor_${randomUUID().replace(/-/g, '')}`,
    requestId,
    route: sanitizeUrl(req.url),
    method: req.method,
    environment: resolveEnvironment(),
    release: resolveRelease(),
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
