import { prisma } from '@/lib/prisma';
import { isCbResultsEnabled } from '@/lib/biology-library/featureFlag';
import { derniersResultatsParAnalyte } from '@/lib/biology-library/derniersResultats';
import { getRecommendedPlate } from '@/lib/food-compass/plates';
import { claimsValidesAuCorpus } from '@/lib/rag/claims/validite';
import { cleClaim, type ClaimRef } from './catalogueConduitesV1';
import {
  PORTES_BIOLOGIQUES_ASSIETTES_METADATA,
  PORTES_BIOLOGIQUES_ASSIETTES_V1,
  lignesPortesBiologiquesServables,
  portesBiologiquesSignees,
} from './portesBiologiquesAssiettesV1';

// CE QUE LES SOURCES DISENT, ET CE QUE LE DOSSIER MESURE — côte à côte, jamais
// comparés ([[D-245]], LOT-03 du chantier 6 ; table signée par [[D-246]]).
//
// CE SERVICE NE REND AUCUN VERDICT. Pas de « au-dessus », pas de « élevé », pas
// de tri par la valeur, et aucune assiette n'en sort « indiquée ». Il rend deux
// listes que l'écran pose l'une à côté de l'autre : les claims, cités ENTIERS
// depuis le corpus, et le dernier résultat du dossier pour chaque marqueur
// qu'ils nomment. Le rapprochement est le geste du praticien ([[D-157]]), qui
// porte le contexte que `DC-46` exige et qu'aucune ligne de code ne connaît.
//
// LA VALEUR VOYAGE EN TEXTE. `valeur` est un `numeric` en base ; la convertir
// en `number` JSON l'arrondirait silencieusement (dette « exactitude décimale »
// nommée à la contre-revue de [[D-122]]). Elle sort telle que la base la porte.

const MESSAGE_INACTIF = 'Lecture biologique des assiettes non activée.';

/**
 * TROIS TERMES, ET CHACUN FERME. Le drapeau de la carte (`WN_ASSIETTES_INDIQUEES`,
 * posé en production le 2026-09-20), celui des résultats (`isCbResultsEnabled`,
 * qui exige aussi le rayon — [[D-081]]), et la signature de la table. Sans le
 * second, la section lirait des résultats que le cabinet n'a pas ouverts.
 */
export function portesBiologiquesActives(): boolean {
  return process.env.WN_ASSIETTES_INDIQUEES === 'true' && isCbResultsEnabled() && portesBiologiquesSignees();
}

export type ClaimCite = { claimId: string; versionClaim: string; texte: string };

export type DernierResultat = {
  /** Telle que la base la porte — jamais arrondie ni convertie. */
  valeur: string;
  unite: string | null;
  /** Date de prélèvement, ISO. */
  preleveLe: string;
  source: string;
};

export type MarqueurLu = {
  analyteCode: string;
  libelle: string;
  /** `null` = aucun résultat au dossier pour ce marqueur — jamais une valeur par défaut. */
  dernier: DernierResultat | null;
};

export type PorteBiologiqueLue = {
  ligneId: string;
  plateCode: string;
  libelle: string;
  claims: ClaimCite[];
  marqueurs: MarqueurLu[];
};

export type ResultatPortesBiologiques =
  | { actif: false; message: string }
  | {
      actif: true;
      shaPerimetre: string;
      corpusLu: boolean;
      /** Lignes publiées retirées faute d'un claim valide — `0` si le corpus est illisible. */
      retireesFauteDeClaim: number;
      portes: PorteBiologiqueLue[];
    };

function referencesCitees(): ClaimRef[] {
  const uniques = new Map<string, ClaimRef>();
  for (const ligne of PORTES_BIOLOGIQUES_ASSIETTES_V1) {
    for (const claim of ligne.claims) uniques.set(cleClaim(claim), claim);
  }
  return [...uniques.values()];
}

/** Le texte ENTIER de chaque claim servi — mêmes conditions que la validité. */
async function textesDesClaims(references: readonly ClaimRef[]): Promise<Map<string, string>> {
  if (references.length === 0) return new Map();
  const ids = references.map(r => r.claimId);
  const versions = references.map(r => r.versionClaim);
  const lignes = await prisma.$queryRaw<Array<{ claim_id: string; version_claim: string; texte_normalise: string }>>`
    SELECT c.claim_id, c.version_claim, c.texte_normalise
    FROM public.rag_corpus_claims AS c
    JOIN unnest(${ids}::text[], ${versions}::text[])
      AS demande(claim_id, version_claim)
      ON demande.claim_id = c.claim_id
     AND demande.version_claim = c.version_claim
    WHERE c.active = true
      AND c.statut = 'VALIDE'
  `;
  return new Map(
    lignes.map(l => [cleClaim({ claimId: l.claim_id, versionClaim: l.version_claim }), l.texte_normalise]),
  );
}

/**
 * L'ORDRE DES LECTURES EST CELUI DU COÛT CROISSANT DE L'ERREUR — même patron que
 * `evaluerAssiettesPourPatient` : le verrou (aucune base), le corpus (aucun
 * dossier), le dossier en dernier.
 */
export async function evaluerPortesBiologiquesPourPatient(idPatient: string): Promise<ResultatPortesBiologiques> {
  if (!portesBiologiquesActives()) return { actif: false, message: MESSAGE_INACTIF };

  let claimsValides: ReadonlySet<string> | null = null;
  try {
    claimsValides = await claimsValidesAuCorpus(referencesCitees());
  } catch (err) {
    console.error('[portesBiologiquesService] corpus illisible', err instanceof Error ? err.message : String(err));
    claimsValides = null;
  }

  const servables = lignesPortesBiologiquesServables(claimsValides);
  const publiees = PORTES_BIOLOGIQUES_ASSIETTES_V1.filter(l => l.statut === 'publiee').length;
  const socle = {
    actif: true as const,
    shaPerimetre: PORTES_BIOLOGIQUES_ASSIETTES_METADATA.shaPerimetre ?? '',
    corpusLu: claimsValides !== null,
    retireesFauteDeClaim: claimsValides === null ? 0 : publiees - servables.length,
  };
  if (servables.length === 0) return { ...socle, portes: [] };

  // UN TEXTE MANQUANT RETIRE SA LIGNE, comme un claim invalide : citer une porte
  // sans la phrase qui la fonde serait montrer un marqueur sans sa source.
  const textes = await textesDesClaims(referencesCitees().filter(r => claimsValides?.has(cleClaim(r))));
  const avecTextes = servables.filter(l => l.claims.every(c => textes.has(cleClaim(c))));

  const codes = [...new Set(avecTextes.flatMap(l => l.analyteCodes))];
  const [analytes, resultats] = await Promise.all([
    prisma.biologyAnalyte.findMany({ where: { code: { in: codes } }, select: { code: true, libelle: true } }),
    prisma.resultatBiologique.findMany({
      where: { idPatient, analyteCode: { in: codes } },
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
    }),
  ]);
  const libelles = new Map(analytes.map(a => [a.code, a.libelle]));
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
  );

  const portes: PorteBiologiqueLue[] = avecTextes.map(ligne => ({
    ligneId: ligne.id,
    plateCode: ligne.plateCode,
    libelle: getRecommendedPlate(ligne.plateCode)?.label ?? ligne.plateCode,
    claims: ligne.claims.map(c => ({ ...c, texte: textes.get(cleClaim(c)) ?? '' })),
    marqueurs: ligne.analyteCodes.map(code => {
      const dernier = derniers.get(code);
      return {
        analyteCode: code,
        libelle: libelles.get(code) ?? code,
        dernier: dernier
          ? { valeur: dernier.valeur, unite: dernier.unite, preleveLe: dernier.preleveLe, source: dernier.source }
          : null,
      };
    }),
  }));

  return { ...socle, retireesFauteDeClaim: socle.retireesFauteDeClaim + (servables.length - avecTextes.length), portes };
}
