import type { SanitizedError } from './types';

const MAX_DEPTH = 3;
const MAX_ENTRIES = 30;
const MAX_STRING_LENGTH = 300;

const REDACTED = '[redacted]';
const BLOCKED_KEYS = new Set([
  'token',
  'accessToken',
  'refreshToken',
  'password',
  'authorization',
  'cookie',
  'set-cookie',
  'email',
  'prenom',
  'nom',
  'phone',
  'telephone',
  'birthDate',
  'dateNaissance',
  'anamnese',
  'rawAnswers',
  'answers',
  'prompt',
  'systemPrompt',
  'narratif_patient',
  'resume_praticien',
]);

function sanitizeString(input: string): string {
  const compact = input.slice(0, MAX_STRING_LENGTH);
  return compact
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [redacted]')
    .replace(/\b(token|secret|password)=([^\s&]+)/gi, '$1=[redacted]')
    .replace(/\b([A-Za-z0-9_-]{24,})\b/g, '[id]');
}

export function sanitizeUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.origin}${url.pathname}`;
  } catch {
    return sanitizeString(rawUrl.replace(/\?.*$/, ''));
  }
}

function sanitizeAny(value: unknown, depth: number): unknown {
  if (value == null) return value;
  if (typeof value === 'string') return sanitizeString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return Number(value);

  if (Array.isArray(value)) {
    if (depth >= MAX_DEPTH) return '[truncated_array]';
    return value.slice(0, MAX_ENTRIES).map(item => sanitizeAny(item, depth + 1));
  }

  if (typeof value === 'object') {
    if (depth >= MAX_DEPTH) return '[truncated_object]';

    const out: Record<string, unknown> = {};
    const entries = Object.entries(value as Record<string, unknown>).slice(0, MAX_ENTRIES);

    for (const [key, item] of entries) {
      if (BLOCKED_KEYS.has(key)) {
        out[key] = REDACTED;
        continue;
      }
      out[key] = sanitizeAny(item, depth + 1);
    }

    return out;
  }

  return '[unsupported_type]';
}

export function sanitizeMetadata(metadata: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!metadata) return undefined;
  return sanitizeAny(metadata, 0) as Record<string, unknown>;
}

export function sanitizeError(error: unknown): SanitizedError {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string };
    return {
      type: error.name || 'Error',
      code: typeof errorWithCode.code === 'string' ? sanitizeString(errorWithCode.code) : undefined,
      message: sanitizeString(error.message || 'Erreur inconnue'),
    };
  }

  return {
    type: 'UnknownError',
    message: sanitizeString(String(error ?? 'Erreur inconnue')),
  };
}
