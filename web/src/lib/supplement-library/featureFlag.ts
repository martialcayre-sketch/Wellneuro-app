const MESSAGE_C4_DESACTIVE = "Le rayon compléments n'est pas encore ouvert sur cet environnement. Son activation métier se fait via le flag WN_C4_ENABLED.";

export function isC4Enabled(value = process.env.WN_C4_ENABLED): boolean {
  return value === 'true';
}

export function getC4DisabledMessage(): string {
  return MESSAGE_C4_DESACTIVE;
}
