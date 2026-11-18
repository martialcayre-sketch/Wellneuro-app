import { prisma } from '@/lib/prisma';
import {
  annulationsActives,
  validerContextePrelevement,
  type ContextePrelevementSaisi,
} from '@/lib/biology-library/publie';
import type { TraceBlocBiologie } from '@/lib/synthese/contaminationBiologie';
import { construireBlocBiologie, type LigneBiologieSynthese } from './blocBiologieSynthese';
import { isSyntheseBiologieEnabled } from './syntheseBiologieDrapeau';

// LE LECTEUR DU BLOC DE BIOLOGIE DE LA SYNTHÈSE — [[D-513]] §2.
//
// Il lit ce que lit la fiche du praticien (`api/praticien/biologie/resultats`)
// et rien de plus, avec deux colonnes que la réponse de la fiche ne
// sélectionne pas : la version du procédé d'extraction de l'import et le
// signal `intervalleNonTranscrit` — sans elles, « non imprimé » se déduirait du
// seul champ nul, ce que le §2 interdit.
//
// CE QUI N'EST PAS LU, PAR CONSTRUCTION : le marquage et le commentaire du
// laboratoire, les plages fonctionnelles et de référence, les statuts posés,
// les constats du praticien. Ce lecteur ne peut donc pas les transmettre.
//
// SON SEUL APPELANT EST LE SECOND APPEL ([[D-539]] §2, arbitrage
// `20261117-0816-b`) : `preparerGeneration` lit le bloc, et seul
// `appelerRestitutionBiologie` le transmet, après la réussite de l'appel
// principal, qui ne le reçoit jamais.
//
// DRAPEAU ÉTEINT, AUCUNE LECTURE (§11) : `WN_SYNTHESE_BIOLOGIE_ENABLED` et
// l'étage des résultats sont jugés AVANT toute requête.

/** La tête du contexte, rejugée par la forme du module — comme la fiche. */
function contexteDeLaTete(tetes: readonly unknown[]): ContextePrelevementSaisi | null {
  const tete = tetes[0];
  if (!tete) return null;
  const verdict = validerContextePrelevement(tete);
  if (!verdict.ok) {
    // Une tête que la base a acceptée mais que le module refuse : servie « non
    // recueilli », jamais une valeur inventée. Aucune valeur au journal.
    console.error('[synthese/blocBiologie] contexte de prélèvement illisible — transmis « non recueilli »');
    return null;
  }
  return verdict.contexte;
}

/**
 * Le bloc de biologie du dossier et sa trace, ou `null` : drapeau éteint, ou
 * aucun résultat qui fasse foi. Une erreur de lecture LÈVE : l'appelant la
 * journalise et la synthèse part sans bloc (§2, « calculé au mieux »).
 */
export async function lireBlocBiologiePourSynthese(idPatient: string): Promise<TraceBlocBiologie | null> {
  if (!isSyntheseBiologieEnabled()) return null;

  const [lignes, annulations] = await Promise.all([
    prisma.resultatBiologique.findMany({
      where: { idPatient },
      orderBy: [{ analyteCode: 'asc' }, { preleveLe: 'asc' }, { saisiLe: 'asc' }],
      select: {
        id: true,
        analyteCode: true,
        valeur: true,
        unite: true,
        preleveLe: true,
        source: true,
        saisiLe: true,
        supersedesResultatId: true,
        analyte: { select: { libelle: true } },
        ligneCandidate: {
          select: {
            intervalleLu: true,
            intervalleNonTranscrit: true,
            uniteLue: true,
            valeurLue: true,
            heureLue: true,
            import: { select: { laboratoireLu: true, versionPrompt: true } },
          },
        },
        contextesPrelevement: {
          where: { remplacePar: null },
          select: {
            aJeun: true,
            supplementationArretee: true,
            traitementInterferent: true,
            episodeInflammatoire: true,
            grossesse: true,
            jourCycleEtat: true,
            jourCycle: true,
            delaiDernierePriseEtat: true,
            delaiDernierePrise: true,
            delaiDernierePriseUnite: true,
          },
        },
      },
    }),
    annulationsActives(prisma, idPatient),
  ]);

  const lues: LigneBiologieSynthese[] = lignes.map(l => ({
    id: l.id,
    supersedesResultatId: l.supersedesResultatId,
    saisiLe: l.saisiLe.toISOString(),
    analyteCode: l.analyteCode,
    analyteLibelle: l.analyte.libelle,
    preleveLe: l.preleveLe.toISOString(),
    // `toFixed()` sans argument : la notation normale EXACTE, comme la fiche.
    valeur: l.valeur.toFixed(),
    unite: l.unite,
    source: l.source,
    laboratoire: l.ligneCandidate?.import.laboratoireLu ?? null,
    contexte: contexteDeLaTete(l.contextesPrelevement),
    heureLue: l.ligneCandidate?.heureLue ?? false,
    lue: l.ligneCandidate
      ? {
          versionProcede: l.ligneCandidate.import.versionPrompt,
          intervalleLu: l.ligneCandidate.intervalleLu,
          intervalleNonTranscrit: l.ligneCandidate.intervalleNonTranscrit,
          uniteLue: l.ligneCandidate.uniteLue,
          valeurLue: l.ligneCandidate.valeurLue,
        }
      : null,
  }));

  return construireBlocBiologie(lues, annulations);
}
