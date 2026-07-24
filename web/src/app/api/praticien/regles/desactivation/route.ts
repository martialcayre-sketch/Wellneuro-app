import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { prisma } from '@/lib/prisma';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';
import {
  RAISON_MAX,
  SELECTION_REGLE,
  serialiserRegle,
  statutRegle,
  estStatutRegle,
} from '@/lib/supplement-library/gouvernance';
import type { RegleAtelier } from '@/lib/supplement-library/gouvernance';

// Désactivation d'une règle (C4, LOT-03b) — retrait d'un brouillon ou d'une
// version validée : actif = false, état terminal de la LIGNE (la lignée
// continue par révision d'une autre ligne). La seule écriture est le drapeau
// actif — le contenu et la signature restent intacts (append-only, audit).
//
// La raison est OBLIGATOIRE : une désactivation est un acte clinique, pas un
// ménage. Le schéma V1 de `clinical_rules` n'a AUCUN champ pour la porter
// (dette documentée) : elle est exigée ici pour matérialiser l'acte réfléchi
// et journalisée dans les logs serveur ; sa trace DURABLE attendue vit dans la
// justification de la version qui remplace la règle (révision). Écrire la
// raison dans la ligne désactivée serait une édition en place — interdite.
//
// `statutAttendu` (motif corpus) : la décision est prise sur un état vu à
// l'écran. La désactivation elle-même est un updateMany conditionnel (id +
// actif + état de signature attendu) — divergence = 409, jamais d'écrasement.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type RegleDesactivationApiResponse =
  | { ok: true; regle: RegleAtelier }
  | { ok: false; reason: string; error: string };

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

type PostBody = { regleId?: unknown; statutAttendu?: unknown; raison?: unknown };

// POST /api/praticien/regles/desactivation — { regleId, statutAttendu, raison }
export async function POST(req: Request): Promise<NextResponse<RegleDesactivationApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);
    const acteur = emailPraticien(session);
    if (!acteur) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

    if (!isC4Enabled()) {
      return echec('flag_eteint', 'Atelier de règles indisponible (rayon compléments désactivé).', 404);
    }

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const regleId = typeof body.regleId === 'string' ? body.regleId.trim() : '';
    const statutAttendu = typeof body.statutAttendu === 'string' ? body.statutAttendu.trim() : '';
    if (!regleId || !estStatutRegle(statutAttendu)) {
      return echec('champs_requis', 'Identifiant de règle et statut attendu obligatoires.', 400);
    }
    if (statutAttendu === 'desactivee') {
      return echec('transition_invalide', 'Cette règle est déjà désactivée.', 409);
    }

    const raison = typeof body.raison === 'string' ? body.raison.trim() : '';
    if (raison.length === 0 || raison.length > RAISON_MAX) {
      return echec(
        'raison_requise',
        `Une désactivation exige une raison (${RAISON_MAX} caractères au plus).`,
        422,
      );
    }

    // Écriture conditionnelle : ne désactive que si la ligne est ENCORE dans
    // l'état vu à l'écran (brouillon = signature nulle, validée = signée).
    const filtreEtat =
      statutAttendu === 'brouillon' ? { validePar: null } : { validePar: { not: null } };
    const maj = await prisma.clinicalRule.updateMany({
      where: { id: regleId, actif: true, ...filtreEtat },
      data: { actif: false },
    });

    if (maj.count !== 1) {
      const ligne = await prisma.clinicalRule.findUnique({
        where: { id: regleId },
        select: { id: true, actif: true, validePar: true, valideLe: true },
      });
      if (!ligne) return echec('regle_introuvable', 'Règle introuvable.', 404);
      return echec(
        'etat_divergent',
        'Le statut de la règle a changé depuis l’affichage — rechargez la liste.',
        409,
      );
    }

    // Journal serveur de l'acte — la raison n'a pas de champ en base (V1).
    console.log(
      '[praticien/regles/desactivation]',
      JSON.stringify({ regleId, statutAvant: statutAttendu, par: acteur, raison }),
    );

    const regle = await prisma.clinicalRule.findUnique({
      where: { id: regleId },
      select: SELECTION_REGLE,
    });
    if (!regle || statutRegle(regle) !== 'desactivee') {
      return echec('exception', 'Erreur technique.', 500);
    }
    return NextResponse.json({ ok: true, regle: serialiserRegle(regle, []) });
  } catch (err) {
    console.error(
      '[praticien/regles/desactivation POST]',
      err instanceof Error ? err.message : String(err),
    );
    return echec('exception', 'Erreur technique.', 500);
  }
}
