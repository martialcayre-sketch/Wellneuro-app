// Exclusion de la recherche ([[D-490]]) — le sens d'un acte, son motif, et la
// lecture d'une liste collée par le praticien. Module PUR, sans Prisma :
// l'atelier l'importe pour l'aperçu, les routes le rejouent sur ce qu'elles
// reçoivent.
//
// Une ligne = un claim : `WN-CL-0001-001@v1.0 ; motif`. La version est
// facultative (sans elle, la version active ; plusieurs versions actives sont
// refusées par la base, jamais départagées). Le motif est la PROVENANCE — le
// dossier et son classement — et il est obligatoire. La ligne se coupe au
// PREMIER séparateur (point-virgule, tabulation ou barre verticale) : le motif
// peut en contenir d'autres. Seules sont ignorées les lignes vides, les
// commentaires `#` et les lignes SANS AUCUN CHIFFRE (en-tête, séparateur de
// tableau) ; toute autre ligne doit se lire entière, sinon c'est
// une ERREUR qui bloque l'envoi — rien n'est complété ni écarté en silence.

import { CLAIM_ID_RE, VERSION_RE } from './etiquetageLot';

export const SENS_EXCLUSION = ['exclure', 'retablir'] as const;
export type SensExclusion = (typeof SENS_EXCLUSION)[number];

export function estSensExclusion(valeur: unknown): valeur is SensExclusion {
  return typeof valeur === 'string' && (SENS_EXCLUSION as readonly string[]).includes(valeur);
}

/** Borne technique d'un geste (taille d'une transaction), pas un seuil clinique. */
export const MAX_LIGNES_EXCLUSION_LOT = 500;
/** Borne technique d'un motif, celle du motif de rejet de l'atelier. */
export const MOTIF_EXCLUSION_MAX = 4000;

/**
 * Le motif retenu, ou `null` s'il est vide. « Vide » est jugé PLUS
 * strictement que le CHECK `rag_claim_decisions_exclusion_recherche_complete`
 * (`btrim` sur les blancs ASCII, l'espace insécable, l'espace chiffre,
 * l'espace fine insécable, l'espace sans chasse et la marque d'ordre des
 * octets) : ici, tout blanc Unicode (`\s`) et l'espace sans chasse. Un motif
 * accepté ici l'est donc toujours par la base — jamais une erreur technique
 * sur un motif que l'écran a laissé passer.
 */
export function motifExclusion(valeur: unknown): string | null {
  if (typeof valeur !== 'string') return null;
  const motif = valeur.trim();
  if (motif.length > MOTIF_EXCLUSION_MAX) return null;
  // PostgreSQL refuse le caractère nul dans un texte, et `::jsonb` refuse une
  // moitié de paire de substitution isolée : sans ce refus, un tel motif
  // passerait l'écran et finirait en erreur technique.
  if (/\u0000|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/.test(motif)) return null;
  return motif.replace(/[\s​]/g, '') ? motif : null;
}

export type LigneExclusionLot = {
  claimId: string;
  /** Version visée si la liste la donne (`WN-CL-0001-001@v1.0`), sinon la version active. */
  versionClaim?: string;
  motif: string;
};

export type ErreurLigneExclusion = { numero: number; texte: string; raison: string };

export type ListeExclusionLue = {
  lignes: LigneExclusionLot[];
  erreurs: ErreurLigneExclusion[];
};

export function lireListeExclusion(texte: string): ListeExclusionLue {
  const lignes: LigneExclusionLot[] = [];
  const erreurs: ErreurLigneExclusion[] = [];
  const vus = new Set<string>();

  texte.split(/\r?\n/).forEach((brute, index) => {
    const numero = index + 1;
    const ligne = brute.trim();
    if (!ligne || ligne.startsWith('#') || !/\d/.test(ligne)) return;
    const erreur = (raison: string) => erreurs.push({ numero, texte: ligne, raison });

    // Barres extérieures d'un tableau copié retirées — la finale seulement si
    // la ligne en est une (elle commence par une barre) : un motif hors
    // tableau garde la sienne. Puis coupe au PREMIER séparateur : le motif
    // garde les siens.
    const nette = ligne.startsWith('|') ? ligne.slice(1).replace(/\|$/, '') : ligne;
    const coupe = nette.search(/[;\t|]/);
    if (coupe < 0) {
      erreur('deux champs attendus : identifiant ; motif');
      return;
    }
    const identifiant = nette.slice(0, coupe).trim();
    const [claimId, versionClaim, ...reste] = identifiant.split('@');
    if (!CLAIM_ID_RE.test(claimId) || reste.length > 0 || (versionClaim !== undefined && !VERSION_RE.test(versionClaim))) {
      erreur('identifiant de claim illisible');
      return;
    }
    const motif = motifExclusion(nette.slice(coupe + 1));
    if (!motif) {
      erreur(`motif absent ou trop long (au plus ${MOTIF_EXCLUSION_MAX} caractères)`);
      return;
    }
    if (vus.has(claimId)) {
      erreur('claim déjà présent plus haut dans la liste');
      return;
    }
    vus.add(claimId);
    lignes.push({ claimId, ...(versionClaim ? { versionClaim } : {}), motif });
  });

  if (lignes.length > MAX_LIGNES_EXCLUSION_LOT) {
    erreurs.push({
      numero: 0,
      texte: '',
      raison: `au plus ${MAX_LIGNES_EXCLUSION_LOT} claims par geste — scindez la liste`,
    });
  }
  return { lignes, erreurs };
}

/**
 * Validation côté serveur d'une ligne déjà structurée (corps JSON de la
 * route) : mêmes règles que la lecture du texte, rien n'est complété.
 */
export function lireLigneExclusion(valeur: unknown): LigneExclusionLot | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  const v = valeur as Record<string, unknown>;
  if (typeof v.claimId !== 'string' || !CLAIM_ID_RE.test(v.claimId)) return null;
  if (v.versionClaim !== undefined && (typeof v.versionClaim !== 'string' || !VERSION_RE.test(v.versionClaim))) {
    return null;
  }
  const motif = motifExclusion(v.motif);
  if (!motif) return null;
  return {
    claimId: v.claimId,
    ...(typeof v.versionClaim === 'string' ? { versionClaim: v.versionClaim } : {}),
    motif,
  };
}
