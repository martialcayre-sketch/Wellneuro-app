import * as Sentry from '@sentry/nextjs';
import { deploymentEnvLabel, releaseSha } from './src/lib/observability/deploymentEnv';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: deploymentEnvLabel(),
  release: releaseSha(),
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  beforeSend(event) {
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers;
      delete event.request.data;
      if (event.request.url) {
        event.request.url = event.request.url.split('?')[0];
      }
    }
    return event;
  },
});
