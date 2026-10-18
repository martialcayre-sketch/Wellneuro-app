// Étiquetage en lot ([[D-325]], amende [[D-321]] §6) — lecture d'une liste
// collée par le praticien. Module PUR, sans Prisma : l'atelier l'importe pour
// l'aperçu, la route le rejoue sur ce qu'elle reçoit.
//
// Une ligne = un claim : `WN-CL-0001-001 ; 2 ; options`. Séparateurs admis :
// point-virgule, tabulation (copie d'un tableau) ou barre verticale (tableau
// markdown). Les besoins s'écrivent « 2 » ou « 2, 4 ». La rubrique s'écrit par
// son code (`surveillance_arret`) ou par son nom à l'écran (« Surveillance et
// arrêt »). Seules sont ignorées les lignes vides, les commentaires `#` et
// les lignes SANS AUCUN CHIFFRE (en-tête, séparateur de tableau) ; toute autre
// ligne doit se lire entière, sinon c'est une ERREUR qui bloque l'envoi —
// jamais une ligne écartée en silence, rien n'est complété.

import { estRubriqueFicheUsage, type RubriqueFicheUsage } from '@/lib/fiches-usage/vocabulaire';
import { lireClesLien } from './clesLien';

/** Borne technique d'un geste (taille d'une transaction), pas un seuil clinique. */
export const MAX_LIGNES_ETIQUETAGE_LOT = 500;

export const CLAIM_ID_RE = /^WN-CL-\d{4}-\d{3}$/;
const VERSION_RE = /^v?\d+\.\d+$/;

export type LigneEtiquetageLot = {
  claimId: string;
  /** Version visée si la liste la donne (`WN-CL-0001-001@v1.0`), sinon la version active. */
  versionClaim?: string;
  besoins: number[];
  rubrique: RubriqueFicheUsage;
};

export type ErreurLigneEtiquetage = { numero: number; texte: string; raison: string };

export type ListeEtiquetageLue = {
  lignes: LigneEtiquetageLot[];
  erreurs: ErreurLigneEtiquetage[];
};

/** Nom à l'écran ou code → code de rubrique (« Surveillance et arrêt » → `surveillance_arret`). */
export function codeRubrique(saisie: string): RubriqueFicheUsage | null {
  const code = saisie
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+d'usage$/, '')
    .replace(/\s+(et|de)\s+/g, '_')
    .trim()
    .replace(/[\s-]+/g, '_');
  return estRubriqueFicheUsage(code) ? code : null;
}

function lireBesoins(saisie: string): unknown[] | null {
  const morceaux = saisie.split(/[\s,]+/).filter(Boolean);
  if (morceaux.length === 0 || morceaux.some((m) => !/^\d+$/.test(m))) return null;
  return morceaux.map(Number);
}

export function lireListeEtiquetage(texte: string): ListeEtiquetageLue {
  const lignes: LigneEtiquetageLot[] = [];
  const erreurs: ErreurLigneEtiquetage[] = [];
  const vus = new Set<string>();

  texte.split(/\r?\n/).forEach((brute, index) => {
    const numero = index + 1;
    const ligne = brute.trim();
    if (!ligne || ligne.startsWith('#') || !/\d/.test(ligne)) return;
    const erreur = (raison: string) => erreurs.push({ numero, texte: ligne, raison });

    const champs = ligne
      .split(/[;\t|]/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (champs.length !== 3) {
      erreur('trois champs attendus : identifiant ; besoins ; rubrique');
      return;
    }
    const [identifiant, besoinsSaisis, rubriqueSaisie] = champs;
    const [claimId, versionClaim, ...reste] = identifiant.split('@');
    if (!CLAIM_ID_RE.test(claimId) || reste.length > 0 || (versionClaim !== undefined && !VERSION_RE.test(versionClaim))) {
      erreur('identifiant de claim illisible');
      return;
    }
    const rubrique = codeRubrique(rubriqueSaisie);
    if (!rubrique) {
      erreur('rubrique hors des dix des fiches d’usage');
      return;
    }
    const besoins = lireBesoins(besoinsSaisis);
    const cles = besoins ? lireClesLien(besoins, rubrique) : null;
    if (!cles) {
      erreur('besoins illisibles (entiers de 1 à 12)');
      return;
    }
    if (vus.has(claimId)) {
      erreur('claim déjà présent plus haut dans la liste');
      return;
    }
    vus.add(claimId);
    lignes.push({ claimId, ...(versionClaim ? { versionClaim } : {}), besoins: cles.besoins, rubrique: cles.rubrique });
  });

  if (lignes.length > MAX_LIGNES_ETIQUETAGE_LOT) {
    erreurs.push({
      numero: 0,
      texte: '',
      raison: `au plus ${MAX_LIGNES_ETIQUETAGE_LOT} claims par geste — scindez la liste`,
    });
  }
  return { lignes, erreurs };
}

/**
 * Validation côté serveur d'une ligne déjà structurée (corps JSON de la
 * route) : mêmes règles que la lecture du texte, rien n'est complété.
 */
export function lireLigneEtiquetage(valeur: unknown): LigneEtiquetageLot | null {
  if (!valeur || typeof valeur !== 'object' || Array.isArray(valeur)) return null;
  const v = valeur as Record<string, unknown>;
  if (typeof v.claimId !== 'string' || !CLAIM_ID_RE.test(v.claimId)) return null;
  if (v.versionClaim !== undefined && (typeof v.versionClaim !== 'string' || !VERSION_RE.test(v.versionClaim))) {
    return null;
  }
  const cles = lireClesLien(v.besoins, v.rubrique);
  if (!cles) return null;
  return {
    claimId: v.claimId,
    ...(typeof v.versionClaim === 'string' ? { versionClaim: v.versionClaim } : {}),
    besoins: cles.besoins,
    rubrique: cles.rubrique,
  };
}
