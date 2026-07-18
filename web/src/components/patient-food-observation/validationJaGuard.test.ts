import { describe, expect, it } from 'vitest';
import { isValidationJaHarnessAvailable } from './validationJaGuard';

describe('verrou du harnais JA5-02', () => {
  it('autorise uniquement le développement local', () => {
    expect(isValidationJaHarnessAvailable('development')).toBe(true);
    expect(isValidationJaHarnessAvailable('production')).toBe(false);
    expect(isValidationJaHarnessAvailable('test')).toBe(false);
    expect(isValidationJaHarnessAvailable(undefined)).toBe(false);
  });
});
