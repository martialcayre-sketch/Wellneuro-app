import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import type { StatutTraitementSignalement } from '@/lib/trust/types';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import { interruptionEffetIndesirableActive } from '@/lib/clinical/safetyEffetIndesirableV1';
import {
  effetsNonTraites,
  type Rattachement,
  recoitUnAvis,
  STATUTS_NON_TRAITES,
  verdictCourant,
  type VerdictEffetIndesirable,
} from '@/lib/trust/pauseEffetIndesirable';
import { elementsDesProgrammesVises } from '@/lib/trust/pauseEffetIndesirableServeur';
import { avisSansElementOuvert } from '@/lib/trust/verdictEffetIndesirable';

/**
 * Ce que le praticien lit pour rendre son avis sur un signalement RATTACHÉ, ou
 * du formulaire d'avant ([[D-281]] §5) — absent d'un signalement qui ne reçoit
 * aucun avis (`recoitUnAvis`).
 */
export type ValidationEffetIndesirable = {
  /** `null` : le formulaire d'avant, « oui » au programme sans élément désigné. */
  rattachement: Rattachement | null;
  /** L'élément que le patient a désigné, avec son intitulé quand le programme visé se lit. */
  elementDesigne: { actionId: string; title: string | null } | null;
  /** Les éléments que le praticien peut désigner pour « Je ne sais pas » ; `null` si le programme ne se lit pas. */
  elements: { actionId: string; title: string }[] | null;
  /** L'avis « impliqué, élément non identifiable » est ouvert (`avisSansElementOuvert`) : programme visé illisible. */
  avisSansElement: boolean;
  /** La chaîne entière, dans l'ordre où elle a été rendue — l'avis corrigé reste lisible. */
  verdicts: {
    id: string;
    verdict: VerdictEffetIndesirable['verdict'];
    elementActionId: string | null;
    amenagement: string | null;
    renduPar: string;
    renduLe: string;
    supersedesVerdictId: string | null;
  }[];
  /** L'avis qui fait foi : la tête de chaîne, ou `null` si rien n'est rendu. */
  verdictCourantId: string | null;
};

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
  /** Les deux dates déclarées, affichées au praticien (D-281 §2 : aucune borne entre elles). */
  debutPriseLe?: string | null;
  debutSymptomesLe?: string | null;
  validation?: ValidationEffetIndesirable;
  /** Demande de droit seulement : texte de la réponse envoyée (D-295 §3). */
  reponse?: string | null;
};

/** Refus du passage à « Traité » d'une demande de droit sans réponse écrite (D-295 §3). */
const ERREUR_TRAITE_SANS_REPONSE =
  'Une réponse écrite est requise avant de passer une demande de droit à « Traité ».';

export type TrustPraticienResponse =
  | {
    ok: true;
    signalements: SignalementPraticien[];
    nonTraites: number;
    /** La pause est-elle servie au portail ? Faux tant que la règle amendée n'est pas signée (D-281 §6). */
    pauseServie: boolean;
  }
  | { ok: false; error: string };

// GET /api/praticien/trust — files des signalements et demandes (TRUST).
export async function GET(): Promise<NextResponse<TrustPraticienResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    // Les trois files de signalements sont scopées par la relation patient : le
    // filtre s'applique AVANT le `take`, sinon une file d'un autre praticien
    // pourrait évincer les signalements du praticien connecté.
    const duPraticien = { patient: filtrePatientsDuPraticien(emailSession) };
    const [effets, incidents, droits, patients] = await Promise.all([
      prisma.trustAdverseEffectReport.findMany({ where: duPraticien, orderBy: { soumisLe: 'desc' }, take: 100 }),
      prisma.trustPrivacyIncident.findMany({ where: duPraticien, orderBy: { soumisLe: 'desc' }, take: 100 }),
      prisma.trustRightsRequest.findMany({ where: duPraticien, orderBy: { soumisLe: 'desc' }, take: 100 }),
      prisma.patient.findMany({
        where: filtrePatientsDuPraticien(emailSession),
        select: { idPatient: true, prenom: true, nom: true },
      }),
    ]);
    // LA VALIDATION, pour les seuls signalements qui reçoivent un avis —
    // rattachés, ou du formulaire d'avant : la chaîne des avis et les éléments
    // du programme visé — la version figée, pas la courante.
    const rattaches = effets.filter(recoitUnAvis);
    const [verdicts, programmes] = await Promise.all([
      rattaches.length === 0
        ? Promise.resolve([])
        : prisma.trustAdverseEffectVerdict.findMany({
          where: { reportId: { in: rattaches.map(e => e.id) } },
          orderBy: { renduLe: 'asc' },
          select: {
            id: true, reportId: true, verdict: true, elementActionId: true, amenagement: true,
            renduPar: true, renduLe: true, supersedesVerdictId: true,
          },
        }),
      elementsDesProgrammesVises(rattaches.flatMap(e => (e.protocolDraftId ? [e.protocolDraftId] : []))),
    ]);
    const validationDe = (e: (typeof effets)[number]): ValidationEffetIndesirable | undefined => {
      if (!recoitUnAvis(e)) return undefined;
      const chaine = verdicts
        .filter(v => v.reportId === e.id)
        .map(v => ({ ...v, verdict: v.verdict as VerdictEffetIndesirable['verdict'] }));
      const elements = e.protocolDraftId ? programmes.get(e.protocolDraftId) ?? null : null;
      return {
        rattachement: e.rattachement as Rattachement | null,
        elementDesigne: e.elementActionId
          ? { actionId: e.elementActionId, title: elements?.find(x => x.actionId === e.elementActionId)?.title ?? null }
          : null,
        elements,
        avisSansElement: avisSansElementOuvert(
          { rattachement: e.rattachement as Rattachement | null, protocolDraftId: e.protocolDraftId },
          elements,
        ),
        verdicts: chaine.map(v => ({
          id: v.id,
          verdict: v.verdict,
          elementActionId: v.elementActionId,
          amenagement: v.amenagement,
          renduPar: v.renduPar,
          renduLe: v.renduLe.toISOString(),
          supersedesVerdictId: v.supersedesVerdictId,
        })),
        verdictCourantId: verdictCourant(e.id, chaine)?.id ?? null,
      };
    };

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
        debutPriseLe: e.debutPriseLe?.toISOString() ?? null,
        debutSymptomesLe: e.debutSymptomesLe?.toISOString() ?? null,
        validation: validationDe(e),
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
        reponse: d.reponse ?? null,
      })),
    ].sort((a, b) => b.soumisLe.localeCompare(a.soumisLe));

    // NON TRAITÉ : un signalement qui reçoit un avis — rattaché, ou du
    // formulaire d'avant — l'est tant qu'il l'attend, quel que soit son statut :
    // passé à « traité » sans verdict, il attend toujours (D-281 §5, « le statut
    // ne lève rien »). Les autres signalements et les demandes se comptent par
    // statut. La règle est `effetsNonTraites`, la même au Fil et au prévol.
    const effetsOuverts = new Set(effetsNonTraites(effets, verdicts.map(v => ({
      ...v, verdict: v.verdict as VerdictEffetIndesirable['verdict'],
    }))).map(e => e.id));
    const nonTraite = (s: SignalementPraticien) => (s.kind === 'effet_indesirable'
      ? effetsOuverts.has(s.id)
      : (STATUTS_NON_TRAITES as readonly string[]).includes(s.statutTraitement));

    return NextResponse.json({
      ok: true,
      signalements,
      nonTraites: signalements.filter(nonTraite).length,
      pauseServie: interruptionEffetIndesirableActive(),
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
  if (payload.reponse !== undefined && typeof payload.reponse !== 'string') {
    return NextResponse.json({ ok: false, error: 'Paramètres invalides.' }, { status: 400 });
  }
  const statutTraitement = payload.statutTraitement as StatutTraitementSignalement;
  if (!id || !STATUTS.includes(statutTraitement)) {
    return NextResponse.json({ ok: false, error: 'Paramètres invalides.' }, { status: 400 });
  }

  const emailSession = emailPraticien(session);
  if (!emailSession) {
    return NextResponse.json({ ok: false, error: 'Non authentifié.' }, { status: 401 });
  }

  try {
    // `updateMany` plutôt que `update` : il accepte un filtre sur la relation
    // patient, là où `update` exige une clé unique seule. Le compte de lignes
    // touchées vaut donc garde — zéro signifie « pas à ce praticien », et se
    // présente comme un signalement introuvable.
    const donnees = { statutTraitement, examineLe: new Date() };
    const duPraticien = { patient: filtrePatientsDuPraticien(emailSession) };
    let touchees: number;
    if (kind === 'effet_indesirable') {
      ({ count: touchees } = await prisma.trustAdverseEffectReport.updateMany({
        where: { id, ...duPraticien }, data: donnees,
      }));
    } else if (kind === 'incident_confidentialite') {
      ({ count: touchees } = await prisma.trustPrivacyIncident.updateMany({
        where: { id, ...duPraticien }, data: donnees,
      }));
    } else if (kind === 'demande_droit') {
      const reponse = (payload.reponse ?? '').trim().slice(0, 2000);
      // « Traité » exige une réponse écrite (D-295 §3) : celle de la requête,
      // ou celle déjà enregistrée lors d'un passage précédent.
      if (statutTraitement === 'traite' && !reponse) {
        const existante = await prisma.trustRightsRequest.findFirst({
          where: { id, ...duPraticien },
          select: { reponse: true },
        });
        if (!existante) {
          return NextResponse.json({ ok: false, error: 'Signalement introuvable.' }, { status: 404 });
        }
        if (!existante.reponse?.trim()) {
          return NextResponse.json({ ok: false, error: ERREUR_TRAITE_SANS_REPONSE }, { status: 400 });
        }
      }
      ({ count: touchees } = await prisma.trustRightsRequest.updateMany({
        where: { id, ...duPraticien },
        data: { ...donnees, reponse: reponse || undefined },
      }));
    } else {
      return NextResponse.json({ ok: false, error: 'Type inconnu.' }, { status: 400 });
    }
    if (touchees === 0) {
      return NextResponse.json({ ok: false, error: 'Signalement introuvable.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[praticien/trust PATCH]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, error: 'Erreur technique.' }, { status: 500 });
  }
}
