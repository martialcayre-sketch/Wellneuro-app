import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sourcesDuNotebook } from '@/lib/rag/claims/notebooks';
import { getRagClaimsHealth } from '@/lib/rag/claims/store';
import {
  compterClaimsRevue,
  estClaimStatut,
  listerClaimsRevue,
  type ClaimEnRevue,
  type ClaimStatut,
} from '@/lib/rag/claims/revue';

// Atelier corpus (D-004) — file de revue des claims, PRATICIEN SEUL.
//
// Le corpus est documentaire et global au cabinet : la garde est la session
// NextAuth (domaine @wellneuro.fr), sans notion d'appartenance patient —
// aucune donnée patient ne vit dans ces tables (CHECK patient_identifiable =
// false). La lecture directe de la table est réservée à cette revue ; la seule
// voie de récupération côté patient reste match_wellneuro_rag_claims (D-003).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SOURCE_RE = /^WN-SRC-\d{4}$/;

export type CorpusClaimsApiResponse =
  | {
      ok: true;
      statut: ClaimStatut;
      sourceId: string | null;
      total: number;
      claims: ClaimEnRevue[];
      compteurs: {
        enAttenteValidation: number;
        valide: number;
        rejete: number;
        empreintesDerivees: number;
        sourcesSupersedees: number;
      };
    }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CorpusClaimsApiResponse>({ ok: false, reason, error }, { status });
}

// GET /api/praticien/corpus/claims?statut=&source=&limit=&offset=
export async function GET(req: Request): Promise<NextResponse<CorpusClaimsApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    const { searchParams } = new URL(req.url);

    const statutBrut = (searchParams.get('statut') ?? 'EN_ATTENTE_VALIDATION').trim();
    if (!estClaimStatut(statutBrut)) {
      return echec('statut_invalide', 'Statut de revue inconnu.', 400);
    }

    const sourceBrut = (searchParams.get('source') ?? '').trim();
    if (sourceBrut && !SOURCE_RE.test(sourceBrut)) {
      return echec('source_invalide', 'Identifiant de source invalide.', 400);
    }

    // Filtre notebook (registre sanitaire) — borné pour rester un libellé.
    const notebookBrut = (searchParams.get('notebook') ?? '').trim();
    if (notebookBrut.length > 200) {
      return echec('notebook_invalide', 'Libellé de notebook invalide.', 400);
    }

    const limitBrut = Number(searchParams.get('limit') ?? '50');
    const offsetBrut = Number(searchParams.get('offset') ?? '0');
    if (!Number.isInteger(limitBrut) || !Number.isInteger(offsetBrut) || limitBrut < 1 || offsetBrut < 0) {
      return echec('pagination_invalide', 'Pagination invalide.', 400);
    }

    // Les tuiles de statut comptent sur le MÊME périmètre que la liste
    // (active = true, compterClaimsRevue) ; la santé d'ingestion ne fournit
    // que les signaux de dérive des liens.
    const [liste, tuiles, sante] = await Promise.all([
      listerClaimsRevue({
        statut: statutBrut,
        sourceId: sourceBrut || undefined,
        sourceIds: notebookBrut ? sourcesDuNotebook(notebookBrut) : undefined,
        limit: limitBrut,
        offset: offsetBrut,
      }),
      compterClaimsRevue(),
      getRagClaimsHealth(),
    ]);

    return NextResponse.json({
      ok: true,
      statut: statutBrut,
      sourceId: sourceBrut || null,
      total: liste.total,
      claims: liste.claims,
      compteurs: {
        enAttenteValidation: tuiles.EN_ATTENTE_VALIDATION,
        valide: tuiles.VALIDE,
        rejete: tuiles.REJETE,
        empreintesDerivees: sante.liens.empreintesDerivees,
        sourcesSupersedees: sante.liens.sourcesSupersedees,
      },
    });
  } catch (err) {
    console.error('[praticien/corpus/claims GET]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
