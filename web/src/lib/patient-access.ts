export function isDeadlineExpired(dateLimite: string | null | undefined, now = new Date()): boolean {
  if (!dateLimite) return false;

  const deadline = new Date(`${dateLimite}T23:59:59.999`);
  if (Number.isNaN(deadline.getTime())) return false;

  return now.getTime() > deadline.getTime();
}
