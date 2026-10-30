import type { ProtocolAction } from '@/lib/clinical-engine/types';

// DEUX ACTIONS EN DOUBLE DANS UNE VERSION ([[D-394]]).
//
// Constat du 2026-10-28 (D/55) : une version portait deux actions « food »
// sous le même intitulé, servies au patient en deux cartes. Le responsable a
// tranché le 2026-10-29 : la version se REFUSE, et le doublon a deux critères —
// même type et même intitulé, OU même fiche d'assiette.
//
// L'INTITULÉ SE COMPARE SANS LA CASSE NI LES ESPACES (bords, suites d'espaces) :
// un critère technique de saisie, pas un seuil. Les accents comptent, mais un
// « é » composé et un « e » suivi de l'accent combinant sont le même texte
// (forme NFC). Un intitulé vide n'est pas comparé — l'absence d'intitulé a son
// propre refus, plus loin dans le moteur.
//
// UNE PAIRE QUI RÉPOND AUX DEUX CRITÈRES rend le texte de l'intitulé, le
// premier. Les paires se lisent dans l'ordre de la soumission.

function intituleCompare(action: ProtocolAction): string {
  return (action.title ?? '').normalize('NFC').trim().replace(/\s+/g, ' ').toLocaleLowerCase('fr-FR');
}

function codeAssiette(action: ProtocolAction): string | null {
  const code = action.recommendedPlateRef?.plateCode;
  return typeof code === 'string' && code !== '' ? code : null;
}

/** Le texte du refus, ou `null` si aucune paire d'actions n'est en double. */
export function refusActionsEnDouble(actions: readonly ProtocolAction[]): string | null {
  for (let i = 0; i < actions.length; i += 1) {
    for (let j = i + 1; j < actions.length; j += 1) {
      const a = actions[i];
      const b = actions[j];
      const intitule = intituleCompare(a);
      if (intitule !== '' && a.type === b.type && intitule === intituleCompare(b)) {
        return `Deux actions portent le même intitulé, « ${(a.title ?? '').trim()} », et le même type. `
          + 'Retirez-en une, ou changez son intitulé, puis enregistrez.';
      }
      const assiette = codeAssiette(a);
      if (assiette !== null && assiette === codeAssiette(b)) {
        return `Les actions « ${(a.title ?? '').trim()} » et « ${(b.title ?? '').trim()} » indiquent la même assiette. `
          + 'Retirez-en une, ou changez son assiette, puis enregistrez.';
      }
    }
  }
  return null;
}
