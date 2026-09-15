import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveProtocolDraftId, deriveVersionId, resolveActiveVersion } from '@/lib/protocol/versioning';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { rejouerCarteDecision } from '@/lib/clinical-engine/rejeuCarteDecision';
import { vuePatientOuRefus } from '@/lib/protocol/servirAuPatient';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import {
  DIFFUSION_CONFIRMATION,
  isApprovalStale,
  resolveActiveApproval,
  validateDiffusionApproval,
} from '@/lib/protocol/diffusion';

// Validation « pour diffusion » du protocole (C2A LOT-03 Part B). Persiste
// l'approbation praticien (contrat ProtocolDiffusionApproval), distincte de la
// relecture, ANCRÉE sur une version précise (caduque dès qu'une nouvelle version
// est enregistrée). Append-only chaîné. N'entraîne AUCUN envoi patient : la
// transmission relève d'un lot ultérieur (LOT-05).

const ID_PATTERN = /^[A-Za-z0-9_:.#-]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/protocoles/diffusion';

type PostBody = {
  idPatient?: string;
  decisionCardId?: string;
  protocolDraftInputHash?: string;
};

type PostResponse =
  | { ok: true; unchanged: boolean; approvalId: string; protocolDraftInputHash: string; approvedAt: string }
  | { ok: false; reason: string; error: string };

function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

// POST — approuve pour diffusion la version identifiée par son protocolDraftInputHash.
export async function POST(req: Request): Promise<NextResponse<PostResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Corps de requête illisible.' },
        { status: 400 },
      );
    }

    const { idPatient, decisionCardId, protocolDraftInputHash } = body;
    if (!isNonEmptyString(idPatient) || !isNonEmptyString(decisionCardId) || !isNonEmptyString(protocolDraftInputHash)) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'idPatient, decisionCardId et protocolDraftInputHash sont requis.' },
        { status: 400 },
      );
    }

    // Garde factorisée sans `acces` : une écriture laisse déjà sa propre
    // trace datée et attribuée (GD-1). Les deux verdicts non-`accessible`
    // rendent le 403 historique de cette route.
    const verdictPost = await verifierAppartenancePatient(idPatient, emailPraticien(session));
    if (verdictPost !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const versionId = deriveVersionId(deriveProtocolDraftId(decisionCardId), protocolDraftInputHash);
    const version = await prisma.protocolDraft.findUnique({
      where: { id: versionId },
      select: {
        idPatient: true,
        inputHash: true,
        decisionCardInputHash: true,
        assessmentEpisodeId: true,
        status: true,
        reviewedAt: true,
      },
    });
    if (!version || version.idPatient !== idPatient) {
      return NextResponse.json(
        { ok: false, reason: 'not_found', error: 'Version de protocole introuvable.' },
        { status: 404 },
      );
    }

    const approvedAt = new Date().toISOString();
    const approval = {
      decisionCardInputHash: version.decisionCardInputHash,
      protocolDraftInputHash,
      approvedAt,
      approvedBy: 'practitioner',
      confirmation: DIFFUSION_CONFIRMATION,
    };
    const check = validateDiffusionApproval({ version, approval });
    if (!check.ok) {
      return NextResponse.json(
        { ok: false, reason: check.reason, error: 'Approbation de diffusion invalide.' },
        { status: 400 },
      );
    }

    // ── LES BLOQUEURS DE LA CARTE, OPPOSÉS ICI ET NULLE PART AILLEURS ────────
    //
    // LE DÉFAUT QUE CE BLOC FERME ([[D-192]]). `buildPatientProtocolView` refuse
    // depuis toujours une décision sous abstention requise ou portant un constat
    // de sécurité — mais il n'avait AUCUN appelant de production jusqu'à
    // [[D-191]], et cette route-ci n'a jamais construit de carte : elle recopiait
    // `version.decisionCardInputHash` depuis la ligne du brouillon et signait.
    // Les deux refus les plus graves du moteur clinique ne mordaient donc nulle
    // part sur le chemin qui les rend opposables.
    //
    // POURQUOI À L'APPROBATION, ET PAS À LA LECTURE PATIENT. C'est ici que le
    // praticien ATTESTE un contenu pour diffusion : le refus doit tomber sous sa
    // main, au moment de son geste, avec un motif qu'il peut lever. Le même refus
    // servi plus tard au portail lui apprendrait après coup qu'il a validé
    // quelque chose d'invalide — et le patient l'apprendrait en même temps que
    // lui, par un écran vide.
    //
    // LE REJEU EST CELUI DU CHEMIN PATIENT, à la lettre : même fonction, même
    // empreinte comparée. Un protocole approuvé ici est donc un protocole que le
    // portail saura servir — deux verdicts « équivalents » finiraient par
    // diverger, et le praticien validerait alors un écran qui reste vide.
    const rejeu = await rejouerCarteDecision({
      idPatient,
      decisionCardId,
      assessmentEpisodeId: version.assessmentEpisodeId,
      decisionCardInputHash: version.decisionCardInputHash,
    });
    if (!rejeu.ok) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'carte_non_rejouable',
          error: 'La décision derrière ce protocole ne se recalcule plus sur ce dossier. '
            + 'Rechargez le cockpit et relisez la version active avant de la valider.',
        },
        { status: 409 },
      );
    }
    if (rejeu.decisionCard.abstention.status !== 'not_required') {
      return NextResponse.json(
        {
          ok: false,
          reason: 'abstention_requise',
          error: 'Ce dossier demande une abstention explicite : le protocole ne peut pas être '
            + 'validé pour diffusion tant que les bloqueurs ne sont pas levés.',
        },
        { status: 409 },
      );
    }
    if (rejeu.decisionCard.safetyFindingIds.length > 0) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'constat_securite',
          // Le NOMBRE, jamais les constats : l'écran de décision les porte déjà,
          // et les recopier ici ferait de cette route une seconde restitution
          // clinique, qu'aucune garde ne relit.
          error: `Ce dossier porte ${rejeu.decisionCard.safetyFindingIds.length} constat(s) de sécurité `
            + 'ouvert(s) : le protocole ne peut pas être validé pour diffusion. Traitez-les à la phase Décision.',
        },
        { status: 409 },
      );
    }

    // Chaînage append-only sur le fil d'approbations de cette décision.
    const rows = await prisma.protocolDiffusionApproval.findMany({
      where: { idPatient, decisionCardInputHash: version.decisionCardInputHash },
      select: { id: true, protocolDraftInputHash: true, supersedesApprovalId: true, createdAt: true },
    });
    const activeApproval = resolveActiveApproval(rows);

    // Idempotence : la version active est déjà approuvée → no-op.
    if (activeApproval && activeApproval.protocolDraftInputHash === protocolDraftInputHash) {
      return NextResponse.json({
        ok: true,
        unchanged: true,
        approvalId: activeApproval.id,
        protocolDraftInputHash,
        approvedAt,
      });
    }

    const created = await prisma.protocolDiffusionApproval.create({
      data: {
        idPatient,
        protocolDraftId: versionId,
        decisionCardInputHash: version.decisionCardInputHash,
        protocolDraftInputHash,
        approvedAt: new Date(approvedAt),
        approvedBy: 'practitioner',
        confirmation: DIFFUSION_CONFIRMATION,
        supersedesApprovalId: activeApproval?.id ?? null,
      },
      select: { id: true },
    });

    return NextResponse.json({
      ok: true,
      unchanged: false,
      approvalId: created.id,
      protocolDraftInputHash,
      approvedAt,
    });
  } catch (err) {
    console.error('[praticien/protocoles/diffusion POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}

type GetResponse =
  | {
      ok: true;
      approval: { approvalId: string; protocolDraftInputHash: string; approvedAt: string } | null;
      stale: boolean;
      /**
       * Le portail sert-il RÉELLEMENT ce protocole au patient ? `null` quand
       * rien n'est diffusé. Déclaré ici parce qu'il ne l'était pas : le constat
       * voyageait hors du contrat de sa propre route, et le retirer du serveur
       * laissait `tsc` vert des deux côtés — le défaut même que [[D-191]] a
       * fermé sur la vue patient.
       */
      servieAuPatient: boolean | null;
    }
  | { ok: false; reason: string; error: string };

// GET ?idPatient=&decisionCardId= — approbation active + indicateur de caducité.
export async function GET(req: Request): Promise<NextResponse<GetResponse>> {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json(
        { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
        { status: 401 },
      );
    }

    const { searchParams } = new URL(req.url);
    const idPatient = (searchParams.get('idPatient') ?? '').trim();
    const decisionCardId = (searchParams.get('decisionCardId') ?? '').trim();
    if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
        { status: 400 },
      );
    }
    if (!decisionCardId || !ID_PATTERN.test(decisionCardId) || decisionCardId.length > 200) {
      return NextResponse.json(
        { ok: false, reason: 'invalid', error: 'Identifiant de carte de décision invalide.' },
        { status: 400 },
      );
    }

    // Garde factorisée (G-TRUST-04) : les deux verdicts non-`accessible`
    // rendent le 403 historique de cette route.
    const verdict = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (verdict !== 'accessible') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const versions = await prisma.protocolDraft.findMany({
      where: { idPatient, decisionCardId },
      select: {
        id: true,
        inputHash: true,
        decisionCardInputHash: true,
        assessmentEpisodeId: true,
        supersedesDraftId: true,
        createdAt: true,
        // LE PAYLOAD EST LU POUR JUGER LE CONTRAT PATIENT, pas pour l'afficher :
        // sans lui, le miroir ne voyait qu'une des deux causes de refus.
        payload: true,
      },
    });
    if (versions.length === 0) {
      return NextResponse.json({ ok: true, approval: null, stale: false, servieAuPatient: null });
    }
    const decisionCardInputHash = versions[0].decisionCardInputHash;
    const activeVersion = resolveActiveVersion(versions);

    const approvals = await prisma.protocolDiffusionApproval.findMany({
      where: { idPatient, decisionCardInputHash },
      select: { id: true, protocolDraftInputHash: true, supersedesApprovalId: true, createdAt: true, approvedAt: true },
    });
    const active = resolveActiveApproval(approvals);

    // CE QUE LE PATIENT VOIT, DIT AU PRATICIEN ([[D-191]]).
    //
    // Le chemin patient recompose la carte de décision et REFUSE de servir quand
    // son empreinte n'est plus celle qui a été approuvée. Ce refus était le
    // défaut à ne pas reproduire : une garde que personne ne voit se mesure à
    // zéro — la garde du booklet était confirmable « depuis toujours » et aucun
    // écran n'envoyait la confirmation.
    //
    // Le constat est calculé PAR LA MÊME FONCTION que la route du portail, sur
    // la même version : deux verdicts « équivalents » finiraient par diverger, et
    // le praticien lirait « servi » sur un écran patient éteint.
    //
    // `null` quand rien n'est diffusé — il n'y a alors rien à servir, et
    // « non servie » serait un faux constat.
    let servieAuPatient: boolean | null = null;
    if (active) {
      // La version APPROUVÉE, pas la version active : le praticien peut avoir
      // écrit une version plus récente sans la diffuser, et c'est l'ancienne que
      // son patient lit. `stale`, juste au-dessus, dit l'écart ; ce constat-ci
      // dit ce qui est réellement servi.
      const versionApprouvee =
        versions.find(version => version.inputHash === active.protocolDraftInputHash) ?? null;
      if (versionApprouvee) {
        const rejeu = await rejouerCarteDecision({
          idPatient,
          decisionCardId,
          assessmentEpisodeId: versionApprouvee.assessmentEpisodeId,
          decisionCardInputHash: versionApprouvee.decisionCardInputHash,
        });
        // DEUX MARCHES, PAS UNE. Le portail refuse de servir sur DEUX branches :
        // le rejeu échoue, ou le contrat patient refuse le protocole. Le miroir
        // ne regardait que la première — un statut d'intervention inconnu ou une
        // action hors liste patient éteignait donc l'écran du patient pendant
        // que son praticien lisait « Validé pour diffusion ». Constaté par la
        // contre-revue adverse du 2026-09-16 ([[D-200]]).
        if (!rejeu.ok) {
          servieAuPatient = false;
        } else {
          try {
            const draftApprouve = reconstructProtocolDraft(versionApprouvee.payload, versionApprouvee.inputHash);
            servieAuPatient = vuePatientOuRefus({
              decisionCard: rejeu.decisionCard,
              protocolDraft: draftApprouve,
              approval: {
                decisionCardInputHash: versionApprouvee.decisionCardInputHash,
                protocolDraftInputHash: active.protocolDraftInputHash,
                approvedAt: (approvals.find(a => a.id === active.id)?.approvedAt ?? new Date()).toISOString(),
                approvedBy: 'practitioner',
                confirmation: 'content_approved_for_diffusion',
              },
              patientLimitations: [],
            }).ok;
          } catch (erreur) {
            // PAYLOAD ILLISIBLE ⇒ NON SERVI, jamais une exception qui emporte le
            // GET. Le portail ne saurait pas le servir non plus : le constat est
            // donc juste, et le praticien le lit au lieu d'une page en erreur.
            console.warn(
              '[praticien/protocoles/diffusion GET] protocole approuvé illisible :',
              erreur instanceof Error ? erreur.message : String(erreur),
            );
            servieAuPatient = false;
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      approval: active
        ? {
            approvalId: active.id,
            protocolDraftInputHash: active.protocolDraftInputHash,
            approvedAt: (approvals.find((a) => a.id === active.id)?.approvedAt ?? new Date()).toISOString(),
          }
        : null,
      stale: isApprovalStale(active, activeVersion?.inputHash ?? null),
      servieAuPatient,
    });
  } catch (err) {
    console.error('[praticien/protocoles/diffusion GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
