import type { ContradictionClaimRef, ContradictionFinding } from './contradictionFinding';
import { type ConflitSourcesDeclare, CONFLITS_SOURCES_V1 } from './conflitsSourcesV1';
import { resoudreConflitDeSources } from './politiqueResolutionConflit';

// Producteur de la forme `CONFLIT_SOURCES` — `DC-54`, `DC-55`, LOT-06 de la
// campagne « Doctrine exécutable » ([[D-103]]).
//
// Fonction pure : évalue le registre des conflits déclarés contre les claims
// que les sorties de CE dossier citent. Aucun accès base, aucun appel IA,
// aucune similarité sémantique — la matière est un registre curé, pas une
// détection.
//
// LE DÉCLENCHEMENT EST « UN CLAIM CITÉ », PAS « LES DEUX ». Un dossier qui ne
// s'appuie que sur l'une des deux positions est précisément le cas qui mérite
// d'être remonté : le praticien lit une proposition fondée sur un claim
// qu'un autre claim du même corpus certifié contredit, et rien à l'écran ne le
// lui dirait. Exiger les deux aurait tu ce cas-là, qui est le dangereux.
//
// LA CORRESPONDANCE PORTE SUR LA PAIRE `(claimId, versionClaim)`, comme le
// contrat de fraîcheur. Sur `claimId` seul, un dossier citant une AUTRE version
// du claim déclencherait un conflit déclaré sur une version qu'il n'emploie
// pas — le constat citerait alors un texte que la sortie n'a pas utilisé.
//
// LE VERROU DE SIGNATURE N'EST PAS ICI. Il vit chez l'appelant
// (`conflitsSourcesPourDossier` dans `contradictionsService.ts`), sur le patron
// exact de `contradictionsActives()` : un appelant qui recevrait des constats
// et déciderait lui-même de les taire — ou de les lire registre non signé —
// finirait par se tromper de sens.

export type EntreeConflitsSources = {
  /**
   * Les claims cités par les sorties déjà produites pour ce dossier — règles
   * d'orientation atteintes, lignes de proposition de bilan, constats de
   * contradiction. Vide : aucun conflit ne peut naître, et c'est exact.
   */
  claimsCites: ContradictionClaimRef[];
  /**
   * Le registre à évaluer. Par défaut celui du dépôt — le paramètre existe pour
   * que les refus ci-dessous soient ÉPROUVABLES : le registre ne portant qu'un
   * conflit publié à deux claims, aucun des trois refus ne serait atteignable
   * par un banc. Ils seraient corrects par lecture et prouvés par rien, ce qui
   * est le défaut que cette campagne dénonce ailleurs.
   */
  conflits?: ConflitSourcesDeclare[];
};

/**
 * La phrase servie au praticien, COMPOSÉE et non rédigée.
 *
 * Deux appels rendent le même texte, et chaque position y reste attribuée à son
 * claim : sans l'attribution, le praticien lirait un désaccord sans savoir
 * lequel des deux identifiants soutient quoi — c'est-à-dire un constat qu'il ne
 * pourrait pas vérifier à la source (`DC-34`).
 *
 * Aucune causalité n'est affirmée, aucun des deux n'est présenté comme ayant
 * raison (`DC-27`, `DC-54`).
 */
export function descriptionConflit(conflit: ConflitSourcesDeclare): string {
  const [premier, second] = conflit.claims;
  const [positionPremier, positionSecond] = conflit.positions;
  return (
    'Deux claims du corpus certifié se contredisent — '
    + `${conflit.objet} `
    + `${premier.claimId} soutient que ${positionPremier}. `
    + `${second.claimId} soutient que ${positionSecond}. `
    + "Aucun des deux n'a été retenu contre l'autre."
  );
}

function citeParLeDossier(
  claim: ContradictionClaimRef,
  claimsCites: ContradictionClaimRef[],
): boolean {
  return claimsCites.some(
    cite => cite.claimId === claim.claimId && cite.versionClaim === claim.versionClaim,
  );
}

/**
 * Évalue le registre et rend les conflits constatés pour ce dossier.
 *
 * Trois raisons de ne rien produire pour un conflit, et toutes sont voulues :
 * son statut n'est pas `publiee` ; ses deux claims sont le même claim (un claim
 * ne se contredit pas lui-même, et le déclarer masquerait une erreur de
 * curation) ; aucun de ses deux claims n'est cité par une sortie de ce dossier.
 */
export function evaluerConflitsSources(entree: EntreeConflitsSources): ContradictionFinding[] {
  const constats: ContradictionFinding[] = [];

  for (const conflit of entree.conflits ?? CONFLITS_SOURCES_V1) {
    if (conflit.statut !== 'publiee') continue;

    const [premier, second] = conflit.claims;
    // UN CLAIM NE SE CONTREDIT PAS LUI-MÊME. Le type impose deux entrées, pas
    // deux entrées DISTINCTES : une curation qui recopierait deux fois le même
    // identifiant produirait un constat où le praticien lirait le même claim
    // des deux côtés d'un désaccord. Refus plutôt que constat absurde.
    if (premier.claimId === second.claimId && premier.versionClaim === second.versionClaim) {
      continue;
    }

    if (
      !citeParLeDossier(premier, entree.claimsCites)
      && !citeParLeDossier(second, entree.claimsCites)
    ) {
      continue;
    }

    constats.push({
      forme: 'CONFLIT_SOURCES',
      // Un conflit déclaré produit au plus un constat par évaluation :
      // l'identifiant du constat est celui du conflit.
      id: conflit.id,
      audience: 'praticien_seul',
      // LES DEUX CLAIMS SONT SOURCES, y compris celui que le dossier ne cite
      // pas. Ne citer que le claim retenu par une sortie rendrait le constat
      // illisible : un désaccord dont une seule partie est nommée n'est pas
      // vérifiable, et `DC-30` interdit de faire disparaître la moitié d'une
      // divergence.
      sources: [
        { type: 'claim', claim: premier },
        { type: 'claim', claim: second },
      ],
      description: descriptionConflit(conflit),
      importance: conflit.importance,
      hypotheses: conflit.hypotheses,
      actionSuggeree: conflit.actionSuggeree,
      // L'ISSUE DE LA POLITIQUE, PAS UN STATUT PAR DÉFAUT — `DC-55`. Le motif
      // est celui de `politiqueResolutionConflit.ts` : il nomme les quatre axes
      // que la politique ne compare pas et pourquoi. C'est le premier
      // producteur d'`escaladee_praticien` du dépôt ; jusqu'ici
      // `contradictionsEngine.ts:228` posait `ouverte` en dur, faute de
      // politique pour conclure autrement.
      resolution: resoudreConflitDeSources(premier, second),
      justificationClaims: [premier, second],
      regleId: conflit.id,
      limitations: conflit.limitations,
      // AUCUNE SOURCE D'INSTRUMENT ICI : l'écart entre passations est NON
      // APPLICABLE, jamais zéro. `0` dirait « les deux passations sont du même
      // jour » là où il n'y a aucune passation (`DC-24`, [[D-048]]).
      ecartJoursEntreSources: null,
    });
  }

  return constats;
}
