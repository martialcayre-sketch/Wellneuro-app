import { afterEach, describe, expect, it } from 'vitest';
import {
  deploymentEnv,
  deploymentEnvLabel,
  releaseSha,
  deploymentRequestId,
} from './deploymentEnv';

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

function clear() {
  delete process.env.WN_DEPLOY_ENV;
  delete process.env.VERCEL_ENV;
  delete process.env.WN_RELEASE_SHA;
  delete process.env.VERCEL_GIT_COMMIT_SHA;
  delete process.env.NEXT_PUBLIC_APP_VERSION;
}

describe('deploymentEnv', () => {
  it('WN_DEPLOY_ENV prime sur VERCEL_ENV', () => {
    clear();
    process.env.WN_DEPLOY_ENV = 'production';
    process.env.VERCEL_ENV = 'preview';
    expect(deploymentEnv()).toBe('production');
  });

  it('repli sur VERCEL_ENV si WN absente (Vercel inchangé)', () => {
    clear();
    process.env.VERCEL_ENV = 'preview';
    expect(deploymentEnv()).toBe('preview');
  });

  it('staging Scalingo est mappé sur preview (reste dans l’union)', () => {
    clear();
    process.env.WN_DEPLOY_ENV = 'staging';
    expect(deploymentEnv()).toBe('preview');
  });

  it('défaut development quand rien n’est posé', () => {
    clear();
    expect(deploymentEnv()).toBe('development');
  });
});

describe('deploymentEnvLabel', () => {
  it('préserve staging brut (Sentry accepte une chaîne libre)', () => {
    clear();
    process.env.WN_DEPLOY_ENV = 'staging';
    expect(deploymentEnvLabel()).toBe('staging');
  });

  it('repli VERCEL_ENV si WN absente', () => {
    clear();
    process.env.VERCEL_ENV = 'production';
    expect(deploymentEnvLabel()).toBe('production');
  });
});

describe('releaseSha', () => {
  it('WN_RELEASE_SHA prime', () => {
    clear();
    process.env.WN_RELEASE_SHA = 'sha-scalingo';
    process.env.VERCEL_GIT_COMMIT_SHA = 'sha-vercel';
    expect(releaseSha()).toBe('sha-scalingo');
  });

  it('repli chaîne Vercel puis « local »', () => {
    clear();
    process.env.VERCEL_GIT_COMMIT_SHA = 'sha-vercel';
    expect(releaseSha()).toBe('sha-vercel');
    clear();
    expect(releaseSha()).toBe('local');
  });
});

describe('deploymentRequestId', () => {
  it('ordre x-vercel-id > x-request-id > x-amzn-trace-id, sinon null', () => {
    expect(deploymentRequestId(new Headers({ 'x-vercel-id': 'v', 'x-request-id': 'r' }))).toBe('v');
    expect(deploymentRequestId(new Headers({ 'x-request-id': 'r' }))).toBe('r');
    expect(deploymentRequestId(new Headers({ 'x-amzn-trace-id': 'a' }))).toBe('a');
    expect(deploymentRequestId(new Headers())).toBeNull();
  });
});
