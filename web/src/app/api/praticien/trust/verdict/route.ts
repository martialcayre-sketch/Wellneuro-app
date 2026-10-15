import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { type Rattachement, recoitUnAvis, type VerdictEffetIndesirable } from '@/lib/trust/pauseEffetIndesirable';
import { elementsDesProgrammesVises } from '@/lib/trust/pauseEffetIndesirableServeur';
import { type DemandeVerdict, validerDemandeVerdict } from '@/lib/trust/verdictEffetIndesirable';

export type VerdictResponse = { ok: true; id: string } | { ok: false; error: string };

// POST /api/praticien/trust/verdict — le praticien rend son avis sur
// l'implication de l'élément désigné ([[D-281]] §5, étape 4) : « impliqué »
// avec l'aménagement, ou « non impliqué ». Le formulaire d'avant (« oui » au
// programme, sans élément) reçoit le même avis : le praticien y désigne
// l'élément en cause, ou aucun. Un avis se CORRIGE par un nouvel
// avis qui le supplante ; l'ancien reste lisible. Rien ne se modifie ni ne se
// supprime ici.
//
// DATÉ ET NOMINATIF : `renduPar` est l'e-mail de SESSION, posé côté serveur,
// jamais lu dans le corps de la requête.
export async function POST(req: Request): Promise<NextResponse<VerdictResponse>> {
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }

  let demande: DemandeVerdict & { reportId?: unknown };
  try {
    demande = (await req.json()) as DemandeVerdict & { reportId?: unknown };
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide.' }, { status: 400 });
  }
  if (!demande || typeof demande.reportId !== 'string' || demande.reportId.length === 0) {
    return NextResponse.json({ ok: false, error: 'Paramètres invalides.' }, { status: 400 });
  }

  try {
    // Scopé par la relation patient : un signalement d'un autre praticien se
    // présente comme introuvable.
    const signalement = await prisma.trustAdverseEffectReport.findFirst({
      where: { id: demande.reportId, patient: filtrePatientsDuPraticien(emailSession) },
      select: { id: true, idPatient: true, rattachement: true, elementActionId: true, protocolDraftId: true },
    });
    if (!signalement) {
      return NextResponse.json({ ok: false, error: 'Signalement introuvable.' }, { status: 404 });
    }
    if (!recoitUnAvis(signalement)) {
      return NextResponse.json(
        { ok: false, error: 'Ce signalement n’est rattaché à aucun programme : il ne reçoit pas d’avis d’implication.' },
        { status: 409 },
      );
    }

    const [verdicts, programmes] = await Promise.all([
      prisma.trustAdverseEffectVerdict.findMany({
        where: { reportId: signalement.id },
        select: { id: true, reportId: true, verdict: true, elementActionId: true, amenagement: true, supersedesVerdictId: true },
      }),
      elementsDesProgrammesVises(signalement.protocolDraftId ? [signalement.protocolDraftId] : []),
    ]);

    const resultat = validerDemandeVerdict({
      signalement: {
        id: signalement.id,
        rattachement: signalement.rattachement as Rattachement | null,
        elementActionId: signalement.elementActionId,
      },
      verdicts: verdicts.map(v => ({ ...v, verdict: v.verdict as VerdictEffetIndesirable['verdict'] })),
      elements: signalement.protocolDraftId ? programmes.get(signalement.protocolDraftId) ?? null : null,
      demande,
    });
    if (!resultat.ok) {
      return NextResponse.json({ ok: false, error: resultat.error }, { status: resultat.status });
    }

    const cree = await prisma.trustAdverseEffectVerdict.create({
      data: {
        idPatient: signalement.idPatient,
        reportId: signalement.id,
        ...resultat.aEcrire,
        renduPar: emailSession,
      },
      select: { id: true },
    });
    return NextResponse.json({ ok: true, id: cree.id });
  } catch (err) {
    // Deux avis concurrents : la base refuse le second (une racine par
    // signalement, un successeur par avis) plutôt que d'élire.
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { ok: false, error: 'Un avis a été rendu ou corrigé entre-temps sur ce signalement. Rechargez avant de le corriger.' },
        { status: 409 },
      );
    }
    console.error('[praticien/trust/verdict POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: 'Erreur technique.' }, { status: 500 });
  }
}
