import * as Sentry from '@sentry/nextjs';
import { clientDeploymentEnvLabel, clientReleaseSha } from './src/lib/observability/deploymentEnv';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: clientDeploymentEnvLabel(),
  release: clientReleaseSha(),
  sendDefaultPii: false,
  tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 0,
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
