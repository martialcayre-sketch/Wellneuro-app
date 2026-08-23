import { prisma } from '../prisma';
import { interruptionEffetIndesirableActive } from '../clinical/safetyEffetIndesirableV1';
import type { EffetIndesirableRuntime } from './safetyFindings';

// LECTURE DES SIGNALEMENTS D'EFFET INDÉSIRABLE — [[D-101]], LOT-05, `DC-42`.
//
// MODULE À PART, ET LE MOTIF EST STRUCTUREL, pas esthétique. `runtimeFromPrisma`
// ne touche pas la base malgré son nom : il TRADUIT des lignes déjà lues, et
// c'est ce qui permet à `jalonDu.test.ts` et à son propre banc de l'importer
// sans `DATABASE_URL`. Y poser un `import { prisma }` casse ces bancs au
// chargement du module, avant toute assertion. Même séparation que
// `preconditionsT0.ts` / `preconditionsT0Prisma.ts`, déjà en place.
//
// LA LECTURE EST PARTAGÉE, et c'est l'autre moitié du motif : le cockpit émet
// la carte, `verifierChaineC1` la recalcule, et deux lectures divergentes
// rendraient 409 sur une carte honnête. Une requête recopiée dans la route et
// dans le vérificateur finirait par diverger — c'est la dette exacte que
// `consultationPorteuse.ts` vient de fermer ailleurs.

/**
 * Les signalements du dossier, ou `undefined` quand le dispositif est éteint.
 *
 * `undefined` NE DIT PAS « aucun signalement » : il dit qu'aucune lecture n'a eu
 * lieu. La distinction compte parce que les trois colonnes lues ici arrivent par
 * une migration que le déploiement du code PRÉCÈDE ([[D-087]]) — les interroger
 * trop tôt ferait échouer la construction de la carte, c'est-à-dire le cockpit
 * entier.
 *
 * NI `produitLibelle`, NI `symptomes`, NI `doseDeclaree` ne sont sélectionnés :
 * ces mots sont ceux du patient, et ils n'ont pas à traverser un objet haché
 * puis servi hors du dossier. Le `select` EST la garde, pas une convenance.
 */
export async function lireEffetsIndesirables(
  idPatient: string,
): Promise<EffetIndesirableRuntime[] | undefined> {
  if (!interruptionEffetIndesirableActive()) return undefined;
  return prisma.trustAdverseEffectReport.findMany({
    where: { idPatient },
    select: { id: true, protocolDraftId: true, statutTraitement: true },
    orderBy: { id: 'asc' },
  });
}
