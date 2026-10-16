// QUI DÉCIDE SUR LE TEXTE DES FICHES D'USAGE — arbitrage du 2026-10-16
// (BP-12a, [[D-314]]) : le RESPONSABLE seul valide ou retire une rubrique ou un
// libellé. Les autres praticiens lisent le même écran, sans geste.
//
// L'application ne connaît qu'un rôle (toute session @wellneuro.fr est
// praticien, `auth.ts`) : la restriction tient à une liste d'adresses posée
// dans l'environnement, `WN_FICHES_USAGE_VALIDATEURS` (adresses séparées par
// des virgules, casse indifférente).
//
// FERMÉE PAR DÉFAUT : variable absente ou vide ⇒ personne ne décide. Un oubli
// de configuration rend l'écran en lecture, jamais ouvert à tous.

export const VARIABLE_VALIDATEURS = 'WN_FICHES_USAGE_VALIDATEURS';

/** Les adresses autorisées, en minuscules — vide si la variable manque. */
export function validateursFichesUsage(env: Record<string, string | undefined> = process.env): ReadonlySet<string> {
  const brut = env[VARIABLE_VALIDATEURS] ?? '';
  return new Set(
    brut
      .split(',')
      .map(a => a.trim().toLowerCase())
      .filter(a => a.length > 0),
  );
}

/** Cette adresse de session peut valider et retirer. */
export function peutDeciderFichesUsage(
  email: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (!email) return false;
  return validateursFichesUsage(env).has(email.trim().toLowerCase());
}
