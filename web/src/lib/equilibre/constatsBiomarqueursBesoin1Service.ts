import { prisma } from '@/lib/prisma';
import { annulationsActives, derniersResultatsParAnalyte, isCbResultsEnabled } from '@/lib/biology-library/publie';
import {
  ANALYTES_LUS_BESOIN_1,
  constatsBiomarqueursBesoin1,
  type ConstatBiomarqueur,
  type ResultatLu,
} from './constatsBiomarqueursBesoin1';

/**
 * LA LECTURE EN BASE DES DEUX BIOMARQUEURS DU BESOIN 1 ([[D-548]] §2.2,
 * [[D-516]] §5.2) — le dernier résultat qui fait foi de l'HbA1c et de l'index
 * oméga-3, rien d'autre.
 *
 * Même élection que partout : le fil de correction, les annulations actives, puis
 * le prélèvement le plus récent (`derniersResultatsParAnalyte`). Le requête ne
 * nomme que les deux analytes lus ; le troisième biomarqueur du guide n'est jamais demandé ([[D-516]] §5.3).
 *
 * `null` = pas de lecture (rayon des résultats fermé, ou lecture en échec) : le
 * cockpit n'affiche alors rien, et ne conclut pas à une absence de résultat.
 */
export async function lireConstatsBiomarqueursBesoin1(idPatient: string): Promise<ConstatBiomarqueur[] | null> {
  if (!isCbResultsEnabled()) return null;
  try {
    const resultats = await prisma.resultatBiologique.findMany({
      where: { idPatient, analyteCode: { in: [...ANALYTES_LUS_BESOIN_1] } },
      select: {
        id: true,
        analyteCode: true,
        valeur: true,
        unite: true,
        preleveLe: true,
        source: true,
        saisiLe: true,
        supersedesResultatId: true,
      },
    });
    const annulations = await annulationsActives(
      prisma,
      idPatient,
      resultats.map(r => r.id),
    );
    const derniers = derniersResultatsParAnalyte(
      resultats.map(r => ({
        id: r.id,
        analyteCode: r.analyteCode,
        valeur: r.valeur.toString(),
        unite: r.unite,
        preleveLe: r.preleveLe.toISOString(),
        source: r.source,
        saisiLe: r.saisiLe.toISOString(),
        supersedesResultatId: r.supersedesResultatId,
      })),
      annulations,
    );
    const lus = new Map<string, ResultatLu>(
      [...derniers.entries()].map(([code, d]) => [code, { valeur: d.valeur, unite: d.unite, preleveLe: d.preleveLe }]),
    );
    return constatsBiomarqueursBesoin1(lus);
  } catch (err) {
    // Le nom de l'erreur seul : jamais son message, qui peut porter une valeur de santé.
    console.error('[constatsBiomarqueursBesoin1] lecture en échec', err instanceof Error ? err.name : 'inconnue');
    return null;
  }
}
