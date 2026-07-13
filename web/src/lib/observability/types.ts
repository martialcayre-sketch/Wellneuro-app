export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL' | 'SECURITY' | 'AUDIT';

export type LogDomain =
  | 'AUTH'
  | 'PORTAIL_PATIENT'
  | 'PRATICIEN'
  | 'QUESTIONNAIRE'
  | 'ASSIGNATION'
  | 'CONSULTATION'
  | 'SCORING'
  | 'SYNTHESE_IA'
  | 'BOOKLET'
  | 'EMAIL'
  | 'DATABASE'
  | 'SECURITY'
  | 'SYSTEM';

export type EventCode = `${LogDomain}.${string}`;

export type AppEnvironment = 'development' | 'preview' | 'production';

export type RequestContext = {
  correlationId: string;
  requestId: string | null;
  route: string;
  method: string;
  environment: AppEnvironment;
  release: string;
  runtime: string;
  startedAtMs: number;
};

export type LogContext = {
  environment: AppEnvironment;
  release: string;
  runtime: string;
  route?: string;
  method?: string;
  requestId?: string | null;
  correlationId?: string;
  operationId?: string;
  statusCode?: number;
  durationMs?: number;
  retryable?: boolean;
};

export type SanitizedError = {
  type: string;
  code?: string;
  message: string;
};

export type LogEvent = {
  timestamp: string;
  level: LogLevel;
  event: EventCode;
  domain: LogDomain;
  message: string;
  environment: AppEnvironment;
  release: string;
  runtime: string;
  route?: string;
  method?: string;
  requestId?: string | null;
  correlationId?: string;
  operationId?: string;
  statusCode?: number;
  durationMs?: number;
  retryable?: boolean;
  error?: SanitizedError;
  metadata?: Record<string, unknown>;
};
