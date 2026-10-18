import { prisma } from '@/lib/prisma';
import { PRIORITY_RULES_V1 } from '@/lib/clinical/priorityRulesV1';
import { estIdentifiantPrioriteLibre } from '@/lib/clinical-engine/prioriteLibre';

// LE LIBELLÉ DE LA PRIORITÉ RETENUE, pour la minute d'après — SERVEUR SEUL.
//
// La version de protocole ne garde que l'identifiant (`selectedPriorityId`) ;
// l'écran l'affichait tel quel (« priority:PRIO-PON-01 », « libre:sommeil:… »).
// Le libellé se relit à sa source, sans rien recalculer :
//   - candidat du moteur (`priority:<id de règle>`) : le libellé de la règle au
//     registre signé — celui que la carte de décision a montré (`chaineC1.ts`) ;
//   - priorité posée par le praticien ([[D-279]], `libre:<domaine>:<empreinte>`) :
//     le libellé qu'il a écrit, sur la sélection qui porte CET identifiant. Pas
//     la tête du fil des sélections : le praticien a pu choisir autre chose
//     depuis, et l'écran parle de la version enregistrée. L'empreinte entre
//     dans l'identifiant, donc toute ligne qui le porte a le même libellé.
// Rien de lisible : `null`, et l'écran garde l'identifiant plutôt qu'un vide.

const PREFIXE_PRIORITE_MOTEUR = 'priority:';

/** Libellé d'un candidat du moteur au registre signé, ou `null` — fonction PURE. */
export function libellePrioriteMoteur(selectedPriorityId: string): string | null {
  if (!selectedPriorityId.startsWith(PREFIXE_PRIORITE_MOTEUR)) return null;
  const idRegle = selectedPriorityId.slice(PREFIXE_PRIORITE_MOTEUR.length);
  return PRIORITY_RULES_V1.find(regle => regle.id === idRegle)?.libelle ?? null;
}

export async function lireLibellePrioriteRetenue(entree: {
  idPatient: string;
  decisionCardId: string;
  selectedPriorityId: string;
}): Promise<string | null> {
  const { idPatient, decisionCardId, selectedPriorityId } = entree;
  if (!estIdentifiantPrioriteLibre(selectedPriorityId)) return libellePrioriteMoteur(selectedPriorityId);
  const selection = await prisma.decisionPrioritySelection.findFirst({
    where: { idPatient, decisionCardId, candidateId: selectedPriorityId, libelleLibre: { not: null } },
    select: { libelleLibre: true },
  });
  return selection?.libelleLibre ?? null;
}
