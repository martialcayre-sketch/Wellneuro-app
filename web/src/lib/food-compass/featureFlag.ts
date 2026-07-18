export function isC5Enabled(value = process.env.WN_C5_ENABLED): boolean {
  return value === 'true';
}
