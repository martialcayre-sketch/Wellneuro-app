import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { StatutTraitementSignalement } from '@/lib/trust/types';

export type SignalementPraticien = {
  kind: 'effet_indesirable' | 'incident_confidentialite' | 'demande_droit';
  id: string;
  idPatient: string;
  patient: string;
  resume: string;
  detail: string;
  orientation?: string;
  statutTraitement: string;
  soumisLe: string;
  examineLe: string | null;
};

export type TrustPraticienResponse =
  | { ok: true; signalements: SignalementPraticien[]; nonTraites: number }
  | { ok: false; error: string };

// GET /api/praticien/trust — files des signalements et demandes (TRUST).
export async function GET(): Promise<NextResponse<TrustPraticienResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    const [effets, incidents, droits, patients] = await Promise.all([
      prisma.trustAdverseEffectReport.findMany({ orderBy: { soumisLe: 'desc' }, take: 100 }),
      prisma.trustPrivacyIncident.findMany({ orderBy: { soumisLe: 'desc' }, take: 100 }),
      prisma.trustRightsRequest.findMany({ orderBy: { soumisLe: 'desc' }, take: 100 }),
      prisma.patient.findMany({ select: { idPatient: true, prenom: true, nom: true } }),
    ]);
    const noms = new Map(patients.map(p => [p.idPatient, `${p.prenom} ${p.nom}`.trim()]));
    const nom = (idPatient: string) => noms.get(idPatient) ?? 'Patient';

    const signalements: SignalementPraticien[] = [
      ...effets.map(e => ({
        kind: 'effet_indesirable' as const,
        id: e.id,
        idPatient: e.idPatient,
        patient: nom(e.idPatient),
        resume: `Effet indésirable suspecté — ${e.produitLibelle} (sévérité déclarée : ${e.severiteDeclaree})`,
        detail: `Symptômes : ${e.symptomes}${e.doseDeclaree ? ` · Dose : ${e.doseDeclaree}` : ''}${e.actionPrise !== 'ne_sait_pas' ? ` · Action prise : ${e.actionPrise}` : ''}${e.produitsConcomitants ? ` · Concomitants : ${e.produitsConcomitants}` : ''}`,
        orientation: `${e.orientation} (règle ${e.regleId} ${e.regleVersion})`,
        statutTraitement: e.statutTraitement,
        soumisLe: e.soumisLe.toISOString(),
        examineLe: e.examineLe?.toISOString() ?? null,
      })),
      ...incidents.map(i => ({
        kind: 'incident_confidentialite' as const,
        id: i.id,
        idPatient: i.idPatient,
        patient: nom(i.idPatient),
        resume: `Incident de confidentialité — ${i.categorie}`,
        detail: i.description,
        statutTraitement: i.statutTraitement,
        soumisLe: i.soumisLe.toISOString(),
        examineLe: i.examineLe?.toISOString() ?? null,
      })),
      ...droits.map(d => ({
        kind: 'demande_droit' as const,
        id: d.id,
        idPatient: d.idPatient,
        patient: nom(d.idPatient),
        resume: `Demande d'exercice de droit — ${d.type}`,
        detail: d.description ?? '',
        statutTraitement: d.statutTraitement,
        soumisLe: d.soumisLe.toISOString(),
        examineLe: d.examineLe?.toISOString() ?? null,
      })),
    ].sort((a, b) => b.soumisLe.localeCompare(a.soumisLe));

    return NextResponse.json({
      ok: true,
      signalements,
      nonTraites: signalements.filter(s => s.statutTraitement === 'recu' || s.statutTraitement === 'en_cours').length,
    });
  } catch (err) {
    console.error('[praticien/trust GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: 'Erreur technique.' }, { status: 500 });
  }
}

export type TrustPatchResponse = { ok: true } | { ok: false; error: string };

type PatchPayload = { kind?: string; id?: string; statutTraitement?: string; reponse?: string };

const STATUTS: StatutTraitementSignalement[] = ['recu', 'en_cours', 'traite', 'clos'];

// PATCH /api/praticien/trust — fait évoluer le statut de traitement d'un
// signalement (jamais de suppression : les événements restent immuables).
export async function PATCH(req: Request): Promise<NextResponse<TrustPatchResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }

  let payload: PatchPayload;
  try {
    payload = (await req.json()) as PatchPayload;
  } catch {
    return NextResponse.json({ ok: false, error: 'JSON invalide.' }, { status: 400 });
  }

  const { kind, id } = payload;
  const statutTraitement = payload.statutTraitement as StatutTraitementSignalement;
  if (!id || !STATUTS.includes(statutTraitement)) {
    return NextResponse.json({ ok: false, error: 'Paramètres invalides.' }, { status: 400 });
  }

  try {
    const donnees = { statutTraitement, examineLe: new Date() };
    if (kind === 'effet_indesirable') {
      await prisma.trustAdverseEffectReport.update({ where: { id }, data: donnees });
    } else if (kind === 'incident_confidentialite') {
      await prisma.trustPrivacyIncident.update({ where: { id }, data: donnees });
    } else if (kind === 'demande_droit') {
      await prisma.trustRightsRequest.update({
        where: { id },
        data: { ...donnees, reponse: (payload.reponse ?? '').trim().slice(0, 2000) || undefined },
      });
    } else {
      return NextResponse.json({ ok: false, error: 'Type inconnu.' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[praticien/trust PATCH]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: 'Erreur technique.' }, { status: 500 });
  }
}
