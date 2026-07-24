import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { prisma } from '@/lib/prisma';
import { isC4Enabled } from '@/lib/supplement-library/featureFlag';
import {
  SELECTION_REGLE,
  cleLigneeRegle,
  serialiserRegle,
  statutRegle,
  estStatutRegle,
} from '@/lib/supplement-library/gouvernance';
import type { RegleAtelier } from '@/lib/supplement-library/gouvernance';

// Validation d'une règle (C4, LOT-03b) — C'EST LA ROUTE QUI POSE LA SIGNATURE.
//
// brouillon → validée : validePar = e-mail praticien de session, valideLe =
// présent. Dans la MÊME transaction, les versions VALIDÉES antérieures de la
// lignée passent actif = false — jamais deux versions validées actives dans
// une même lignée après une validation. Les brouillons parallèles ne sont pas
// touchés (ils restent invisibles de la résolution par défaut, et leur tour
// de validation appliquera ses propres gardes).
//
// Gardes de concurrence (motif `statutAttendu` de l'Atelier corpus) :
//  - `statutAttendu` obligatoire et = 'brouillon' : la décision est prise SUR
//    un état vu à l'écran ; s'il a bougé (autre onglet, replay), 409
//    etat_divergent et rien n'est écrit ;
//  - la signature elle-même est un updateMany conditionnel (id + actif +
//    signature nulle) : deux validations simultanées ne peuvent pas signer
//    deux fois ;
//  - si une version validée active PLUS RÉCENTE ou égale existe déjà dans la
//    lignée, 409 version_depassee : valider un vieux brouillon ne doit jamais
//    rétrograder silencieusement la lignée.

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type RegleValidationApiResponse =
  | { ok: true; regle: RegleAtelier; versionsDesactivees: number }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<string, { message: string; status: number }> = {
  regle_introuvable: { message: 'Règle introuvable.', status: 404 },
  etat_divergent: {
    message: 'Le statut de la règle a changé depuis l’affichage — rechargez la liste.',
    status: 409,
  },
  version_depassee: {
    message:
      'Une version au moins aussi récente de cette lignée est déjà validée — repartez d’une révision.',
    status: 409,
  },
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

type PostBody = { regleId?: unknown; statutAttendu?: unknown };

type ResultatTransaction =
  | { ok: true; regle: NonNullable<Parameters<typeof serialiserRegle>[0]>; versionsDesactivees: number }
  | { ok: false; raison: keyof typeof MESSAGES_REFUS };

// POST /api/praticien/regles/validation — { regleId, statutAttendu: 'brouillon' }
export async function POST(req: Request): Promise<NextResponse<RegleValidationApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    // La signature exige une identité : session sans e-mail = refus, jamais un
    // validateur vide en base.
    const validateur = emailPraticien(session);
    if (!validateur) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

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
    // Seule transition entrante : brouillon → validée.
    if (statutAttendu !== 'brouillon') {
      return echec('transition_invalide', 'Seul un brouillon peut être validé.', 409);
    }

    const resultat: ResultatTransaction = await prisma.$transaction(async (tx) => {
      const ligne = await tx.clinicalRule.findUnique({
        where: { id: regleId },
        select: {
          id: true,
          actif: true,
          validePar: true,
          valideLe: true,
          intentTagId: true,
          ingredientId: true,
          typeRegle: true,
          versionRegle: true,
        },
      });
      if (!ligne) return { ok: false, raison: 'regle_introuvable' };
      if (statutRegle(ligne) !== 'brouillon') return { ok: false, raison: 'etat_divergent' };

      const lignee = {
        intentTagId: ligne.intentTagId,
        ingredientId: ligne.ingredientId,
        typeRegle: ligne.typeRegle,
      };

      const validationPlusRecente = await tx.clinicalRule.findFirst({
        where: {
          ...lignee,
          id: { not: regleId },
          actif: true,
          validePar: { not: null },
          versionRegle: { gte: ligne.versionRegle },
        },
        select: { id: true },
      });
      if (validationPlusRecente) return { ok: false, raison: 'version_depassee' };

      // Signature conditionnelle : n'aboutit que si la ligne est ENCORE un
      // brouillon actif à l'instant de l'écriture — anti-écrasement atomique.
      const signature = await tx.clinicalRule.updateMany({
        where: { id: regleId, actif: true, validePar: null, valideLe: null },
        data: { validePar: validateur, valideLe: new Date() },
      });
      if (signature.count !== 1) return { ok: false, raison: 'etat_divergent' };

      // Même transaction : les versions VALIDÉES encore actives de la lignée
      // (nécessairement antérieures — garde version_depassee ci-dessus)
      // passent actif = false. Leur signature n'est PAS effacée : une version
      // supersédée reste auditable, validateur et date compris.
      const desactivees = await tx.clinicalRule.updateMany({
        where: { ...lignee, id: { not: regleId }, actif: true, validePar: { not: null } },
        data: { actif: false },
      });

      const regle = await tx.clinicalRule.findUnique({
        where: { id: regleId },
        select: SELECTION_REGLE,
      });
      if (!regle) return { ok: false, raison: 'regle_introuvable' };
      return { ok: true, regle, versionsDesactivees: desactivees.count };
    });

    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec(resultat.raison, refus.message, refus.status);
    }

    // La lignée rechargée hors transaction — lecture seule, pour la réponse.
    const lignee = await prisma.clinicalRule.findMany({
      where: {
        intentTagId: resultat.regle.intentTagId,
        ingredientId: resultat.regle.ingredientId,
        typeRegle: resultat.regle.typeRegle,
      },
      select: {
        id: true,
        versionRegle: true,
        gradePreuveScientifique: true,
        justification: true,
        validePar: true,
        valideLe: true,
        creeLe: true,
        actif: true,
        intentTagId: true,
        ingredientId: true,
        typeRegle: true,
      },
    });

    return NextResponse.json({
      ok: true,
      regle: serialiserRegle(
        resultat.regle,
        lignee.filter((version) => cleLigneeRegle(version) === cleLigneeRegle(resultat.regle)),
      ),
      versionsDesactivees: resultat.versionsDesactivees,
    });
  } catch (err) {
    console.error('[praticien/regles/validation POST]', err instanceof Error ? err.message : String(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
