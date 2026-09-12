import { describe, expect, it } from 'vitest';
import { isDeadlineExpired, jourCourantLocal } from './patient-access';

/**
 * GARDE — les deux expressions de « l'échéance est dépassée » disent la même
 * chose.
 *
 * `isDeadlineExpired` décide item par item, en mémoire ; `date_limite <
 * jourCourantLocal()` décide en base, sur une colonne texte. Le portail refuse
 * la saisie selon la PREMIÈRE ; l'écran praticien liste ce qu'il peut débloquer
 * selon la SECONDE. Si elles divergent d'un jour, le praticien voit une ligne
 * que le patient peut encore remplir — ou, pire, ne voit pas celle qui est
 * bloquée.
 *
 * Elles ne sont pas dérivées l'une de l'autre : rien dans le code ne les tient
 * ensemble, c'est ce test qui le fait.
 */
describe('échéance dépassée — la règle en base égale la règle en mémoire', () => {
  // Plusieurs heures de la journée : minuit et 23 h encadrent les bascules,
  // c'est là qu'un `toISOString()` (UTC) décrocherait de l'heure locale.
  const heures = [0, 1, 8, 12, 22, 23];
  // Plusieurs mois et plusieurs jours, dont des bascules de mois et une année
  // bissextile — `padStart` sur le mois et le jour se prouve ici.
  const jours = ['2026-01-01', '2026-02-28', '2026-03-01', '2026-07-14', '2026-12-31', '2028-02-29'];

  const cas = jours.flatMap(jour =>
    heures.map(heure => {
      const [a, m, j] = jour.split('-').map(Number);
      return new Date(a, m - 1, j, heure, 30, 0);
    }),
  );

  it.each(cas.map(now => [now.toString(), now] as const))(
    'à %s, les deux règles s’accordent sur les dates encadrantes',
    (_libelle, now) => {
      const aujourdHui = jourCourantLocal(now);
      // Hier, aujourd'hui, demain — et deux bornes lointaines.
      const veille = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
      const lendemain = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const limites = [
        jourCourantLocal(veille),
        aujourdHui,
        jourCourantLocal(lendemain),
        '2020-01-01',
        '2099-12-31',
      ];
      for (const limite of limites) {
        expect(limite < aujourdHui).toBe(isDeadlineExpired(limite, now));
      }
    },
  );

  it('l’échéance du jour n’est JAMAIS dépassée — le patient a jusqu’à 23:59:59', () => {
    const now = new Date(2026, 7, 1, 23, 59, 59);
    expect(isDeadlineExpired('2026-08-01', now)).toBe(false);
    expect('2026-08-01' < jourCourantLocal(now)).toBe(false);
  });

  it('la veille est dépassée dès minuit passé', () => {
    const now = new Date(2026, 7, 2, 0, 0, 1);
    expect(isDeadlineExpired('2026-08-01', now)).toBe(true);
    expect('2026-08-01' < jourCourantLocal(now)).toBe(true);
  });

  it('aucune échéance : jamais dépassée, et le filtre en base ne la sélectionne pas', () => {
    // `null` ne se compare pas : c'est pourquoi le `where` porte AUSSI
    // `dateLimite: { not: null }` — un `lt` seul laisserait Prisma décider.
    expect(isDeadlineExpired(null)).toBe(false);
    expect(isDeadlineExpired(undefined)).toBe(false);
  });

  it('jourCourantLocal rend un AAAA-MM-JJ zéro-complété, jamais un ISO UTC', () => {
    expect(jourCourantLocal(new Date(2026, 0, 5, 9, 0, 0))).toBe('2026-01-05');
    expect(jourCourantLocal(new Date(2026, 8, 12, 0, 30, 0))).toBe('2026-09-12');
    expect(jourCourantLocal(new Date(2026, 8, 12, 23, 30, 0))).toBe('2026-09-12');
  });
});
