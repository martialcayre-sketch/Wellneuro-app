import { prisma } from '@/lib/prisma';
import { SUPPLEMENTS_STATUT_IMPORT } from '@/lib/supplement-library/config';
import type { SupplementFicheInput } from '@/lib/supplement-library/validation';

// Écriture des fiches produit en BROUILLONS (décision n°11 du moteur
// d'intention clinique : une source externe ne produit que des candidats en
// `statut_fiche = 'importee'`, jamais 'verifiee'/'inactive', jamais d'alerte
// ou de règle active). Miroir de web/src/lib/rag/store.ts : la logique
// d'écriture vit ici, la route ne fait qu'authentifier, valider et appeler.
//
// Idempotence + versionnage (R-1/R-2 de la migration catalogue) :
//   - `contenu_sha256` est l'empreinte déterministe de la formulation.
//   - un pointeur `supplement_product_versions_courantes` désigne LA version
//     courante d'un produit source (unicité native (provenance, identifiant)).
//   - ré-import à empreinte identique → no-op (aucune écriture).
//   - empreinte différente → nouvelle `version_formulation` + déplacement du
//     pointeur, dans LA MÊME transaction Prisma ($transaction interactive).

export type FicheIngestResult =
  | {
      sourceProvenance: string;
      sourceIdentifiant: string;
      action: 'inchangee';
      productId: string;
      versionFormulation: number;
      contenuSha256: string;
    }
  | {
      sourceProvenance: string;
      sourceIdentifiant: string;
      action: 'creee';
      productId: string;
      versionFormulation: number;
      contenuSha256: string;
    }
  | {
      sourceProvenance: string;
      sourceIdentifiant: string;
      action: 'nouvelle_version';
      productId: string;
      versionFormulation: number;
      versionPrecedente: number;
      contenuSha256: string;
    }
  | {
      sourceProvenance: string;
      sourceIdentifiant: string;
      action: 'echec';
      erreur: string;
    };

export type IngestResume = {
  total: number;
  creees: number;
  nouvellesVersions: number;
  inchangees: number;
  echecs: number;
};

export type IngestBilan = {
  ok: boolean;
  resume: IngestResume;
  resultats: FicheIngestResult[];
};

function codePrisma(error: unknown): string | null {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = (error as { code?: unknown }).code;
    return typeof code === 'string' ? code : null;
  }
  return null;
}

// Traduit les violations d'intégrité en message clair (jamais de trace Prisma
// brute renvoyée au client). P2002 : conflit d'unicité (import concurrent du
// même produit source). P2003 : FK — un `ingredientId`/`formeId` de composition
// n'existe pas dans le pivot clinique (résolution amont incomplète).
export function traduireErreurEcriture(
  error: unknown,
  cle: { sourceProvenance: string; sourceIdentifiant: string },
): string | null {
  const code = codePrisma(error);
  const ref = `${cle.sourceProvenance}::${cle.sourceIdentifiant}`;
  if (code === 'P2002') {
    return `Conflit d'unicité pour ${ref} (import concurrent du même produit source ?) — fiche ignorée, relancer.`;
  }
  if (code === 'P2003') {
    return `Référence de composition introuvable pour ${ref} : un ingrédient ou une forme n'existe pas dans le référentiel clinique.`;
  }
  return null;
}

async function ingestUneFiche(fiche: SupplementFicheInput): Promise<FicheIngestResult> {
  const cle = {
    sourceProvenance: fiche.sourceProvenance,
    sourceIdentifiant: fiche.sourceIdentifiant,
  };

  try {
    return await prisma.$transaction(async (tx) => {
      const pointeur = await tx.supplementProductVersionCourante.findUnique({
        where: { sourceProvenance_sourceIdentifiant: cle },
      });

      const courant = pointeur
        ? await tx.supplementProduct.findUnique({
            where: { id: pointeur.productId },
            select: { id: true, versionFormulation: true, contenuSha256: true },
          })
        : null;

      // Empreinte inchangée → no-op idempotent : aucune écriture.
      if (courant && courant.contenuSha256 === fiche.contenuSha256) {
        return {
          ...cle,
          action: 'inchangee' as const,
          productId: courant.id,
          versionFormulation: courant.versionFormulation,
          contenuSha256: fiche.contenuSha256,
        };
      }

      // Nouvelle version (ou première) : numéro = max existant + 1, robuste aux
      // versions historiques éventuelles (évite une collision d'unicité).
      const agg = await tx.supplementProduct.aggregate({
        where: cle,
        _max: { versionFormulation: true },
      });
      const versionFormulation = (agg._max.versionFormulation ?? 0) + 1;

      const produit = await tx.supplementProduct.create({
        data: {
          nomCommercial: fiche.nomCommercial,
          marque: fiche.marque,
          marche: fiche.marche,
          versionFormulation,
          sourceProvenance: fiche.sourceProvenance,
          sourceIdentifiant: fiche.sourceIdentifiant,
          sourceUrl: fiche.sourceUrl ?? null,
          // Statut forcé en brouillon — jamais 'verifiee'/'inactive'.
          statutFiche: SUPPLEMENTS_STATUT_IMPORT,
          niveauCompletude: fiche.niveauCompletude,
          contenuSha256: fiche.contenuSha256,
          donneesManquantes: fiche.donneesManquantes,
          incertitudes: fiche.incertitudes ?? null,
          labels: fiche.labels,
          allergenes: fiche.allergenes,
          excipients: fiche.excipients,
          // verifie_par / verifie_le / date_derniere_verification : JAMAIS
          // écrits par cette voie — laissés NULL (geste praticien signé seul).
          compositions: fiche.compositions.length
            ? {
                create: fiche.compositions.map((c, i) => ({
                  ingredientId: c.ingredientId,
                  formeId: c.formeId ?? null,
                  doseParPortion: c.doseParPortion ?? null,
                  unite: c.unite ?? null,
                  position: c.position ?? i,
                })),
              }
            : undefined,
        },
        select: { id: true, versionFormulation: true },
      });

      // Déplacement/pose du pointeur dans LA MÊME transaction que la création.
      if (courant) {
        await tx.supplementProductVersionCourante.update({
          where: { sourceProvenance_sourceIdentifiant: cle },
          data: { productId: produit.id },
        });
        return {
          ...cle,
          action: 'nouvelle_version' as const,
          productId: produit.id,
          versionFormulation: produit.versionFormulation,
          versionPrecedente: courant.versionFormulation,
          contenuSha256: fiche.contenuSha256,
        };
      }

      await tx.supplementProductVersionCourante.create({
        data: { ...cle, productId: produit.id },
      });
      return {
        ...cle,
        action: 'creee' as const,
        productId: produit.id,
        versionFormulation: produit.versionFormulation,
        contenuSha256: fiche.contenuSha256,
      };
    });
  } catch (error) {
    const message = traduireErreurEcriture(error, cle);
    if (message) {
      return { ...cle, action: 'echec' as const, erreur: message };
    }
    // Erreur inattendue (bug, indisponibilité base) : remonte pour échouer la
    // requête bruyamment plutôt que de la masquer en « echec » de fiche.
    throw error;
  }
}

export async function ingestSupplementFiches(fiches: SupplementFicheInput[]): Promise<IngestBilan> {
  const resultats: FicheIngestResult[] = [];
  for (const fiche of fiches) {
    resultats.push(await ingestUneFiche(fiche));
  }

  const resume: IngestResume = {
    total: resultats.length,
    creees: resultats.filter((r) => r.action === 'creee').length,
    nouvellesVersions: resultats.filter((r) => r.action === 'nouvelle_version').length,
    inchangees: resultats.filter((r) => r.action === 'inchangee').length,
    echecs: resultats.filter((r) => r.action === 'echec').length,
  };

  return { ok: resume.echecs === 0, resume, resultats };
}
