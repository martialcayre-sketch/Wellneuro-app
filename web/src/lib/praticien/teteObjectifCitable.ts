import { prisma } from '@/lib/prisma';
import { tetesActives, tetesDeChaine } from '@/lib/praticien/objectifNegocie';

// LA TÊTE D'OBJECTIF NÉGOCIÉ CITABLE — [[D-189]] §3, sous l'arbitrage [[D-193]].
//
// POURQUOI UNE LECTURE PARTAGÉE, ET PAS UNE TROISIÈME COPIE. `SELECTION_OBJECTIF`
// existe déjà en deux exemplaires — `portail/dossier/route.ts` et
// `praticien/objectifs/route.ts` —, et un `route.ts` Next.js ne peut pas exporter
// de valeur. Une troisième copie serait exactement le défaut que `D-191` vient de
// fermer sur la vue patient : des descriptions qui ne se voient pas.
//
// UNE SEULE TÊTE ACTIVE, OU RIEN. Deux têtes actives sont une DISCORDANCE que le
// dépôt refuse de moyenner (`DC-30`, et `portail/dossier` le dit déjà par
// `ratifiable: tetesActives(tetes).length === 1`). Citer « la plus récente » ferait
// disparaître en silence l'autre parole négociée. Zéro tête : il n'y a rien à
// citer. Dans les deux cas, `null` — et l'écran n'offre aucune source.

export type TeteObjectifCitable = {
  /** Identifiant de la VERSION citée, jamais celui de la racine de chaîne. */
  idObjectif: string;
  /** La priorité négociée, telle qu'elle est écrite. `null` si non renseignée. */
  priorite: string | null;
  /** La reformulation du praticien, telle qu'elle est écrite. */
  reformulationPraticien: string | null;
};

/**
 * NE LÈVE JAMAIS, et ce n'est pas de la prudence de style.
 *
 * Cette lecture sert une COMMODITÉ de saisie — citer plutôt que retaper. Elle est
 * appelée depuis le GET des versions, qui porte l'historique du protocole et le
 * contenu de la version active. Une erreur de base ici ferait tomber tout cet
 * historique pour une marque d'affichage : le praticien perdrait sa page parce
 * qu'un bouton « Reprendre » n'a pas pu s'afficher. Patron de
 * `constaterProvenance` ([[D-167]] §6), qui rend une provenance vide plutôt que
 * de faire échouer l'enregistrement d'un objectif.
 */
export async function lireTeteObjectifCitable(idPatient: string): Promise<TeteObjectifCitable | null> {
  try {
    return await lireTete(idPatient);
  } catch {
    return null;
  }
}

async function lireTete(idPatient: string): Promise<TeteObjectifCitable | null> {
  const [objectifs, fins] = await Promise.all([
    prisma.objectifNegocie.findMany({
      where: { idPatient },
      select: {
        id: true,
        supersedesObjectifId: true,
        creeLe: true,
        priorite: true,
        reformulationPraticien: true,
      },
      orderBy: { creeLe: 'desc' },
    }),
    prisma.finObjectif.findMany({
      where: { idPatient },
      select: {
        id: true,
        racineObjectifId: true,
        motif: true,
        voix: true,
        consigneePar: true,
        sens: true,
        creeLe: true,
      },
    }),
  ]);

  const actives = tetesActives(tetesDeChaine(objectifs, fins));
  if (actives.length !== 1) return null;

  const { ligne } = actives[0];
  return {
    idObjectif: ligne.id,
    priorite: ligne.priorite,
    reformulationPraticien: ligne.reformulationPraticien,
  };
}
