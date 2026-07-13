import { sanitizeError, sanitizeMetadata } from './sanitizeLogData';
import type { EventCode, LogContext, LogDomain, LogEvent, LogLevel } from './types';

type LogPayload = {
  event: EventCode;
  domain: LogDomain;
  message: string;
  context: LogContext;
  metadata?: Record<string, unknown>;
  error?: unknown;
};

function shouldSkipDebug(level: LogLevel): boolean {
  return level === 'DEBUG' && process.env.NODE_ENV === 'production';
}

function serialize(level: LogLevel, payload: LogPayload): string {
  const event: LogEvent = {
    timestamp: new Date().toISOString(),
    level,
    event: payload.event,
    domain: payload.domain,
    message: payload.message,
    environment: payload.context.environment,
    release: payload.context.release,
    runtime: payload.context.runtime,
    route: payload.context.route,
    method: payload.context.method,
    requestId: payload.context.requestId,
    correlationId: payload.context.correlationId,
    operationId: payload.context.operationId,
    statusCode: payload.context.statusCode,
    durationMs: payload.context.durationMs,
    retryable: payload.context.retryable,
    metadata: sanitizeMetadata(payload.metadata),
    error: payload.error ? sanitizeError(payload.error) : undefined,
  };

  return JSON.stringify(event);
}

function emit(level: LogLevel, payload: LogPayload): void {
  if (shouldSkipDebug(level)) return;

  const line = serialize(level, payload);

  if (level === 'WARN') {
    console.warn(line);
    return;
  }

  if (level === 'ERROR' || level === 'FATAL' || level === 'SECURITY') {
    console.error(line);
    return;
  }

  console.log(line);
}

export const logger = {
  debug(payload: LogPayload): void {
    emit('DEBUG', payload);
  },
  info(payload: LogPayload): void {
    emit('INFO', payload);
  },
  warn(payload: LogPayload): void {
    emit('WARN', payload);
  },
  error(payload: LogPayload): void {
    emit('ERROR', payload);
  },
  fatal(payload: LogPayload): void {
    emit('FATAL', payload);
  },
  security(payload: LogPayload): void {
    emit('SECURITY', payload);
  },
  audit(payload: LogPayload): void {
    emit('AUDIT', payload);
  },
};
