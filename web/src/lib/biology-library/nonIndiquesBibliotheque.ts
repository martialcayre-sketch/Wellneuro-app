// Les explorations « non indiquées actuellement » sur la fiche d'analyte de la
// Bibliothèque (D-320 §3). Depuis que le rayon ne montre plus les bilans
// (D-320 §2), les deux règles `non_indique_actuellement` de la table signée
// — magnésium plasmatique, cortisol matinal isolé — n'avaient plus d'écran :
// leurs bilans ne portent aucun analyte. Elles s'affichent sur la fiche de
// l'exploration que leur motif désigne comme pertinente.
//
// Le motif est la lecture signée du claim, reproduite mot pour mot de la table
// (D-389 §1) : ce n'est pas une citation du claim, qui est cité à part par son
// identifiant et sa version. Le rattachement ci-dessous est le seul texte
// écrit ici. Le motif, le claim et sa version viennent tels quels de la table
// signée (`indicationsBiologieV1.ts`, jamais reformulés), et rien ne s'affiche
// si sa signature ne tient plus. Une règle non indiquée ajoutée à la table
// sans rattachement fait rougir le banc.
import {
  INDICATIONS_BIOLOGIE_METADATA,
  INDICATIONS_BIOLOGIE_V1,
  signatureIndicationsValide,
  type RegleIndicationPanel,
} from './indicationsBiologieV1';

/** Règle non indiquée → analyte que son motif nomme comme l'exploration
 *  pertinente (D-320 §3). */
export const ANALYTE_ALTERNATIF_NON_INDIQUE: Readonly<Record<string, string>> = {
  // « L'exploration pertinente est le magnésium érythrocytaire. »
  'BIO-NIA-01': 'BIO_MAGNESIUM_ERYTHROCYTAIRE',
  // « l'exploration pertinente est le cortisol awakening response »
  'BIO-NIA-02': 'BIO_CAR',
};

export type ExplorationNonIndiquee = {
  /** Libellé du bilan visé par la règle (« Magnésium plasmatique »). */
  exploration: string;
  /** Motif de la table signée, reproduit mot pour mot : lecture signée du
   *  responsable, pas une citation du claim (D-389 §1). */
  motif: string;
  /** Claim cité à part, par son identifiant et sa version (D-389 §3). */
  claimId: string;
  versionClaim: string;
};

/** Les règles non indiquées publiées de la table signée. */
export function reglesNonIndiquees(
  regles: readonly RegleIndicationPanel[] = INDICATIONS_BIOLOGIE_V1,
): RegleIndicationPanel[] {
  return regles.filter(
    regle => regle.statut === 'publiee' && regle.mode === 'non_indique_actuellement',
  );
}

/**
 * Les explorations non indiquées à afficher, par code d'analyte. `libellesBilans`
 * donne le libellé des bilans ACTIFS (code → libellé) : un bilan retiré du
 * catalogue n'a plus rien à dire. Table non signée ⇒ rien (fail-closed, comme
 * le moteur de proposition).
 */
export function explorationsNonIndiqueesParAnalyte(
  libellesBilans: ReadonlyMap<string, string>,
  regles: readonly RegleIndicationPanel[] = INDICATIONS_BIOLOGIE_V1,
  signee: boolean = signatureIndicationsValide(INDICATIONS_BIOLOGIE_METADATA),
): Map<string, ExplorationNonIndiquee[]> {
  const parAnalyte = new Map<string, ExplorationNonIndiquee[]>();
  if (!signee) return parAnalyte;
  for (const regle of reglesNonIndiquees(regles)) {
    const analyteCode = ANALYTE_ALTERNATIF_NON_INDIQUE[regle.id];
    const exploration = libellesBilans.get(regle.panelCode);
    const claim = regle.justificationClaims[0];
    if (!analyteCode || !exploration || !regle.motif || !claim?.claimId || !claim.versionClaim) {
      continue;
    }
    const liste = parAnalyte.get(analyteCode) ?? [];
    liste.push({
      exploration,
      motif: regle.motif,
      claimId: claim.claimId,
      versionClaim: claim.versionClaim,
    });
    parAnalyte.set(analyteCode, liste);
  }
  return parAnalyte;
}
