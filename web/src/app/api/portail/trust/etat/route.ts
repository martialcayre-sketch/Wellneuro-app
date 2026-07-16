import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { projeterChoixCourants } from '@/lib/trust/securite';

export type AccuseEtat = {
  documentKey: string;
  documentVersion: string;
  type: string;
  date: string;
};

export type ChoixEtat = {
  finalite: string;
  statut: string;
  enregistreLe: string;
  documentVersion: string;
};

export type SignalementEtat = {
  categorie: 'effet_indesirable' | 'incident_confidentialite' | 'demande_droit';
  libelle: string;
  statutTraitement: string;
  soumisLe: string;
};

export type TrustEtatResponse =
  | {
      ok: true;
      /** La séquence « Avant de commencer » est requise tant que la version
       * courante du cadre n'a pas d'accusé « pris_connaissance ». */
      avantDeCommencerRequis: boolean;
      accuses: AccuseEtat[];
      choixCourants: ChoixEtat[];
      historiqueChoix: ChoixEtat[];
      signalements: SignalementEtat[];
    }
  | { ok: false; reason: string; error: string };

// GET /api/portail/trust/etat?token=… — état TRUST du patient de la session.
// Les documents eux-mêmes viennent du registre versionné côté client
// (lib/trust/contenus/registre.ts) ; cette route ne renvoie que l'état
// individuel (DTO patient explicite, aucune sérialisation implicite).
export async function GET(req: Request): Promise<NextResponse<TrustEtatResponse>> {
  const token = new URL(req.url).searchParams.get('token');
  const auth = await authentifierPatientPortail(req, token);
  if (auth.erreur) return auth.erreur as NextResponse<TrustEtatResponse>;
  const { patient } = auth;

  try {
    const [accuses, evenementsChoix, effets, incidents, droits] = await Promise.all([
      prisma.trustAcknowledgement.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.trustChoiceEvent.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { enregistreLe: 'asc' },
      }),
      prisma.trustAdverseEffectReport.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { soumisLe: 'desc' },
        select: { produitLibelle: true, statutTraitement: true, soumisLe: true },
      }),
      prisma.trustPrivacyIncident.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { soumisLe: 'desc' },
        select: { categorie: true, statutTraitement: true, soumisLe: true },
      }),
      prisma.trustRightsRequest.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { soumisLe: 'desc' },
        select: { type: true, statutTraitement: true, soumisLe: true },
      }),
    ]);

    const cadreCourant = getDocumentCourant('cadre_accompagnement');
    const avantDeCommencerRequis = !accuses.some(
      a =>
        a.documentKey === 'cadre_accompagnement' &&
        a.documentVersion === cadreCourant.version &&
        a.type === 'pris_connaissance',
    );

    const historiqueChoix: ChoixEtat[] = evenementsChoix.map(e => ({
      finalite: e.finalite,
      statut: e.statut,
      enregistreLe: e.enregistreLe.toISOString(),
      documentVersion: e.documentVersion,
    }));

    return NextResponse.json({
      ok: true,
      avantDeCommencerRequis,
      accuses: accuses.map(a => ({
        documentKey: a.documentKey,
        documentVersion: a.documentVersion,
        type: a.type,
        date: a.createdAt.toISOString(),
      })),
      choixCourants: [...projeterChoixCourants(historiqueChoix).values()],
      historiqueChoix,
      signalements: [
        ...effets.map(e => ({
          categorie: 'effet_indesirable' as const,
          libelle: e.produitLibelle,
          statutTraitement: e.statutTraitement,
          soumisLe: e.soumisLe.toISOString(),
        })),
        ...incidents.map(i => ({
          categorie: 'incident_confidentialite' as const,
          libelle: i.categorie,
          statutTraitement: i.statutTraitement,
          soumisLe: i.soumisLe.toISOString(),
        })),
        ...droits.map(d => ({
          categorie: 'demande_droit' as const,
          libelle: d.type,
          statutTraitement: d.statutTraitement,
          soumisLe: d.soumisLe.toISOString(),
        })),
      ].sort((a, b) => b.soumisLe.localeCompare(a.soumisLe)),
    });
  } catch (err) {
    console.error('[trust/etat GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
