/**
 * L'attente elle-même, isolée dans son module.
 *
 * Le *combien* est une fonction pure (`delaiAvantReponse`, testée pour
 * elle-même) ; il reste le *fait d'attendre*, qui ne se teste qu'en dormant
 * vraiment. L'isoler ici permet aux tests de route de le remplacer et de
 * vérifier qu'il est bien appelé, sans passer une seconde et demie par cas.
 */
export function attendre(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resoudre) => setTimeout(resoudre, ms));
}
