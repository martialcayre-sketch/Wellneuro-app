export function isC4Enabled(value = process.env.WN_C4_ENABLED): boolean {
  return value === 'true';
}
