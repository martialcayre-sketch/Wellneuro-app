import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { deriveProtocolDraftId, deriveVersionId, resolveActiveVersion } from '@/lib/protocol/versioning';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { rejouerCarteDecision } from '@/lib/clinical-engine/rejeuCarteDecision';
import { vuePatientOuRefus } from '@/lib/protocol/servirAuPatient';
import { apercuContenuPatient } from '@/lib/clinical-engine/contenuPatientProtocole';
import type { ApercuPatientServi } from '@/lib/clinical-engine/contenuPatientProtocole';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import {
  DIFFUSION_CONFIRMATION,
  isApprovalStale,
  resolveActiveApproval,
  validateDiffusionApproval,
} from '@/lib/protocol/diffusion';
import type { Prisma } from '@/generated/prisma';
import type { DecisionCard } from '@/lib/clinical-engine/types';
import { accepteNouvelEnvoi, type EtatDossier } from '@/lib/patient/cycleDeVie';
import {
  TEXTE_BLOCAGE,
  type ActionPourApercu,
  type ApercuFiches,
  type BlocageFiches,
} from '@/lib/fiches-assiette/apercuRemise';
import { envoiFichesOuvert } from '@/lib/fiches-assiette/drapeau';
import { apercuFichesDuProtocole, remettreFiches } from '@/lib/fiches-assiette/remise';
import { annonceDue, annoncerDocumentRemis, type AnnonceFiches } from '@/lib/fiches-assiette/annonce';

// Validation « pour diffusion » du protocole (C2A LOT-03 Part B). Persiste
// l'approbation praticien (contrat ProtocolDiffusionApproval), distincte de la
// relecture, ANCRÉE sur une version précise (caduque dès qu'une nouvelle version
// est enregistrée). Append-only chaîné. N'entraîne AUCUN envoi de protocole au
// patient : la transmission relève d'un lot ultérieur (LOT-05).
//
// LES FICHES D'ASSIETTE ([[D-251]] §7, lot 8), sous `WN_FICHES_ASSIETTE` SEUL.
// Drapeau ouvert, le GET rend l'aperçu des fiches que le clic remettrait, et le
// POST les remet dans LA MÊME transaction que l'approbation. Le clic renvoie le
// jeton de l'aperçu qu'il a vu : un aperçu qui a changé entre-temps est un clic
// refusé, rien d'écrit, et l'aperçu à jour montré (arbitrage du 2026-09-28).
// Drapeau fermé, cette route lit et écrit exactement ce qu'elle lisait et
// écrivait avant ; seule la réponse du GET porte une clé de plus, `fiches: null`.

const ID_PATTERN = /^[A-Za-z0-9_:.#-]+$/;

// Gabarit littéral pour le journal des accès (G-TRUST-04) — jamais l'URL reçue.
const ROUTE_JOURNAL = '/api/praticien/protocoles/diffusion';

type PostBody = {
  idPatient?: string;
  decisionCardId?: string;
  protocolDraftInputHash?: string;
  /** Drapeau ouvert : le jeton de l'aperçu des fiches que le praticien a vu. */
  jetonApercuFiches?: string;
};

type PostResponse =
  | {
      ok: true;
      unchanged: boolean;
      approvalId: string;
      protocolDraftInputHash: string;
      approvedAt: string;
      /** Drapeau ouvert seulement : le nombre de fiches remises par ce clic. */
      fichesRemises?: number;
      /** Espace de lecture ouvert et fiche remise seulement : le sort de
       * l'e-mail neutre ([[D-251]] §9). Absent quand il n'était pas dû. */
      annonceFiches?: AnnonceFiches;
    }
  | { ok: false; reason: string; error: string };

/**
 * Ce qui empêche TOUTE fiche de partir (§7), et les actions de la version.
 *
 * Le dossier PRIME : un dossier clos n'accepte plus aucun envoi de suivi
 * (`cycleDeVie.ts`). Puis le contrat patient : une fiche ne part qu'avec un
 * protocole que le portail saurait servir — une carte qui ne se rejoue plus
 * (`decisionCard` nul), un payload illisible ou un contrat qui refuse bloquent
 * tout. Les actions restent listées quand elles se relisent : l'aperçu dit
 * alors, fiche par fiche, qu'aucune ne part, et pourquoi.
 *
 * L'état du dossier est LU PAR L'APPELANT : au clic, dans la transaction et
 * verrouillé en partage (`lireDossierVerrouille`) ; à la lecture du cockpit,
 * sans verrou.
 */
function blocageEtActionsDesFiches(entrees: {
  dossier: EtatDossier | null;
  decisionCard: DecisionCard | null;
  payload: unknown;
  inputHash: string;
}): { blocage: BlocageFiches | null; actions: ActionPourApercu[] } {
  let actions: ActionPourApercu[] = [];
  let contratRefuse = entrees.decisionCard === null;
  try {
    const draft = reconstructProtocolDraft(entrees.payload, entrees.inputHash);
    actions = draft.actions;
    if (entrees.decisionCard && !apercuContenuPatient({
      decisionCard: entrees.decisionCard,
      protocolDraft: draft,
      patientLimitations: [],
    }).ok) {
      contratRefuse = true;
    }
  } catch {
    contratRefuse = true;
  }
  if (!entrees.dossier || !accepteNouvelEnvoi(entrees.dossier)) {
    return { blocage: { motif: 'dossier_non_suivi', detail: TEXTE_BLOCAGE.dossier_non_suivi }, actions };
  }
  if (contratRefuse) {
    return { blocage: { motif: 'contrat_refuse', detail: TEXTE_BLOCAGE.contrat_refuse }, actions };
  }
  return { blocage: null, actions };
}

/**
 * L'état du dossier AU CLIC, verrouillé en partage jusqu'au COMMIT : une
 * clôture de suivi concurrente attend la fin du clic, au lieu de laisser partir
 * des fiches vers un dossier qu'elle vient de clore (constat de revue du
 * lot 8).
 */
async function lireDossierVerrouille(
  client: Pick<Prisma.TransactionClient, '$queryRaw'>,
  idPatient: string,
): Promise<EtatDossier | null> {
  const lignes = await client.$queryRaw<{ actif: boolean; suivi_cloture_le: Date | null }[]>`
    SELECT actif, suivi_cloture_le FROM patients WHERE id_patient = ${idPatient} FOR SHARE`;
  const ligne = lignes[0];
  return ligne ? { actif: ligne.actif, suiviClotureLe: ligne.suivi_cloture_le } : null;
}

/**
 * Au GET : une lecture des fiches qui échoue ne fait PAS tomber l'état de
 * diffusion (approbation, caducité, aperçu patient). Elle se dit, et son jeton
 * ne peut égaler aucun aperçu calculé — un clic posé dessus est refusé, puis
 * l'aperçu relu (constat de revue du lot 8).
 */
const APERCU_FICHES_ILLISIBLE: ApercuFiches = {
  jeton: 'lecture_impossible',
  blocage: { motif: 'lecture_impossible', detail: TEXTE_BLOCAGE.lecture_impossible },
  lignes: [],
};

const ERREUR_APERCU_PERIME =
  'L’aperçu des fiches d’assiette n’est plus exact : il vient d’être mis à jour. Relisez-le avant de valider.';

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
        // Lu pour les fiches seulement (actions, contrat patient) — et
        // seulement drapeau ouvert : fermé, la lecture reste celle d'avant.
        payload: envoiFichesOuvert(),
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

    // ── LES FICHES D'ASSIETTE, DRAPEAU OUVERT ([[D-251]] §7) ─────────────────
    //
    // UNE SEULE TRANSACTION pour l'approbation et les remises : un clic dont
    // l'approbation passerait sans ses fiches — ou l'inverse — serait un geste
    // à moitié fait, que personne ne verrait. L'aperçu y est RECALCULÉ sous le
    // verrou de chaque fiche, puis comparé au jeton que l'écran a montré.
    //
    // UN CLIC SUR UNE VERSION DÉJÀ APPROUVÉE N'EST PAS UN NO-OP ici : c'est « le
    // geste explicite qui remet une fiche validée depuis » (§7). L'approbation
    // active est reprise telle quelle, et seules les fiches changent.
    if (envoiFichesOuvert()) {
      const jeton = body.jetonApercuFiches;
      if (!isNonEmptyString(jeton)) {
        return NextResponse.json(
          { ok: false, reason: 'apercu_fiches_perime', error: ERREUR_APERCU_PERIME },
          { status: 409 },
        );
      }
      const issue = await prisma.$transaction(async tx => {
        // UN VERROU PAR CHAÎNE D'APPROBATIONS, pris EN PREMIER (revue Copilot
        // de #1245). Sans lui, deux clics concurrents sur un protocole sans
        // fiche — aucun verrou de fiche n'est alors pris — liraient tous deux
        // une chaîne vide et créeraient deux têtes. Pris avant les verrous de
        // fiche, toujours dans cet ordre : la décision du responsable ne prend
        // qu'un verrou de fiche, et n'attend jamais celui-ci.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`protocol_diffusion_approvals:${idPatient}:${version.decisionCardInputHash}`}))`;
        const { blocage, actions } = blocageEtActionsDesFiches({
          dossier: await lireDossierVerrouille(tx, idPatient),
          decisionCard: rejeu.decisionCard,
          payload: version.payload,
          inputHash: version.inputHash,
        });
        const apercu = await apercuFichesDuProtocole(
          tx,
          { idPatient, protocolDraftInputHash, actions, blocage },
          { verrouiller: true },
        );
        if (apercu.jeton !== jeton) return { perime: true as const };

        const approbations = await tx.protocolDiffusionApproval.findMany({
          where: { idPatient, decisionCardInputHash: version.decisionCardInputHash },
          select: { id: true, protocolDraftInputHash: true, supersedesApprovalId: true, createdAt: true },
        });
        const active = resolveActiveApproval(approbations);
        let approvalId: string;
        let unchanged: boolean;
        if (active && active.protocolDraftInputHash === protocolDraftInputHash) {
          approvalId = active.id;
          unchanged = true;
        } else {
          const cree = await tx.protocolDiffusionApproval.create({
            data: {
              idPatient,
              protocolDraftId: versionId,
              decisionCardInputHash: version.decisionCardInputHash,
              protocolDraftInputHash,
              approvedAt: new Date(approvedAt),
              approvedBy: 'practitioner',
              confirmation: DIFFUSION_CONFIRMATION,
              supersedesApprovalId: active?.id ?? null,
            },
            select: { id: true },
          });
          approvalId = cree.id;
          unchanged = false;
        }
        const fichesRemises = await remettreFiches(tx, apercu, { idPatient, idApprobation: approvalId });
        return { perime: false as const, approvalId, unchanged, fichesRemises };
      }, { timeout: 20_000 });

      if (issue.perime) {
        return NextResponse.json(
          { ok: false, reason: 'apercu_fiches_perime', error: ERREUR_APERCU_PERIME },
          { status: 409 },
        );
      }
      // L'E-MAIL NEUTRE, APRÈS LE COMMIT ([[D-251]] §9, lot 11) : un par clic
      // qui a remis au moins une fiche, espace de lecture ouvert. Il ne lève
      // jamais — les fiches sont remises, l'e-mail n'y change rien.
      const annonceFiches = annonceDue(issue.fichesRemises) ? await annoncerDocumentRemis(idPatient) : undefined;
      return NextResponse.json({
        ok: true,
        unchanged: issue.unchanged,
        approvalId: issue.approvalId,
        protocolDraftInputHash,
        approvedAt,
        fichesRemises: issue.fichesRemises,
        ...(annonceFiches ? { annonceFiches } : {}),
      });
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
      /**
       * CE QUE LE PATIENT LIRA, AVANT QUE LE PRATICIEN NE DIFFUSE ([[D-200]]
       * dette 1). Porte sur la version ACTIVE — celle que « Valider pour
       * diffusion » approuverait —, pas sur celle déjà approuvée : un aperçu
       * qui montre l'ancienne version est un aperçu qui ment sur le geste à
       * venir.
       *
       * Projeté par le contrat patient lui-même, jamais recomposé : c'est la
       * seule façon qu'une intervention suspendue s'y lise comme telle. Un
       * refus porte son motif — le praticien a quelque chose à lever, et un
       * aperçu vide ne le lui dirait pas.
       *
       * `null` quand aucune version n'existe encore.
       */
      apercu: ApercuPatientServi | null;
      /**
       * LES FICHES D'ASSIETTE QUE LE CLIC REMETTRAIT ([[D-251]] §7), sur la
       * version ACTIVE comme `apercu` : celles qui partiront, celles déjà
       * remises, et celles qui ne partiront pas, avec leur motif. Son `jeton`
       * revient avec le clic.
       *
       * `null` drapeau fermé, ou sans version : rien ne partira, et l'écran n'en
       * dit rien.
       */
      fiches: ApercuFiches | null;
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
      return NextResponse.json({ ok: true, approval: null, stale: false, servieAuPatient: null, apercu: null, fiches: null });
    }
    const decisionCardInputHash = versions[0].decisionCardInputHash;
    const activeVersion = resolveActiveVersion(versions);

    // Le rejeu de la carte est une LECTURE DE DOSSIER, et deux versions du même
    // protocole s'ancrent presque toujours sur la même — mémoïser évite de la
    // refaire pour l'aperçu quand la version active est celle qui est approuvée.
    // La clé porte les deux entrées qui font varier le résultat.
    const rejeux = new Map<string, Awaited<ReturnType<typeof rejouerCarteDecision>>>();
    const rejeuDe = async (version: { assessmentEpisodeId: string | null; decisionCardInputHash: string }) => {
      const cle = `${version.assessmentEpisodeId}\u0000${version.decisionCardInputHash}`;
      const connu = rejeux.get(cle);
      if (connu) return connu;
      const rejeu = await rejouerCarteDecision({
        idPatient,
        decisionCardId,
        assessmentEpisodeId: version.assessmentEpisodeId,
        decisionCardInputHash: version.decisionCardInputHash,
      });
      rejeux.set(cle, rejeu);
      return rejeu;
    };

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
        const rejeu = await rejeuDe(versionApprouvee);
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

    // ── L'APERÇU DE CE QUE LE PATIENT LIRA ([[D-200]] dette 1) ───────────────
    //
    // LE DÉFAUT QUE CE BLOC FERME. Le seul aperçu patient du cockpit vivait dans
    // `ProtocolConsultationPanel`, alimenté par une fixture et débranché hors
    // d'elle : sur un dossier RÉEL, le praticien validait pour diffusion sans
    // avoir jamais vu une ligne de ce que son patient allait lire. La garde du
    // booklet à nouveau — une surface qui existe et ne sert nulle part se mesure
    // à zéro.
    //
    // SUR LA VERSION ACTIVE, PAS SUR L'APPROUVÉE. `servieAuPatient`, juste
    // au-dessus, dit ce qui est servi AUJOURD'HUI ; celui-ci montre ce qui le
    // sera APRÈS le geste. Les deux se répondent, et confondre les deux ferait
    // valider une version en en lisant une autre.
    //
    // AUCUNE ATTESTATION N'EST FABRIQUÉE ICI. Le contrat de diffusion exige une
    // approbation praticien et la signe ; un aperçu n'en a pas et n'en invente
    // pas. Seul le CONTENU est projeté, par le même code — un statut
    // d'intervention non ferme y porte donc sa phrase d'attente, et un contenu
    // que le contrat refuse dit pourquoi au lieu de se taire.
    let apercu: ApercuPatientServi | null = null;
    if (activeVersion) {
      const rejeuActif = await rejeuDe(activeVersion);
      if (!rejeuActif.ok) {
        apercu = {
          ok: false,
          motif: 'carte_non_rejouable',
          detail: 'La décision derrière ce protocole ne se recalcule plus sur ce dossier. '
            + 'Rechargez le cockpit et relisez la version active.',
        };
      } else {
        try {
          const draftActif = reconstructProtocolDraft(activeVersion.payload, activeVersion.inputHash);
          apercu = apercuContenuPatient({
            decisionCard: rejeuActif.decisionCard,
            protocolDraft: draftActif,
            // AUCUNE LIMITATION PATIENT AUJOURD'HUI — la route du portail n'en
            // sert aucune non plus. Un aperçu qui en montrerait serait faux.
            patientLimitations: [],
          });
        } catch (erreur) {
          // Payload illisible ⇒ pas d'aperçu, jamais une exception qui emporte
          // le GET : le reste de l'état de diffusion reste servi.
          console.warn(
            '[praticien/protocoles/diffusion GET] version active illisible :',
            erreur instanceof Error ? erreur.message : String(erreur),
          );
          apercu = {
            ok: false,
            motif: 'payload_illisible',
            detail: 'Le contenu de la version active ne se relit pas : aucun aperçu ne peut être montré.',
          };
        }
      }
    }

    // ── LES FICHES QUE LE CLIC REMETTRAIT, DRAPEAU OUVERT ([[D-251]] §7) ─────
    //
    // Même version que l'aperçu, même rejeu. SANS VERROU : cette lecture
    // n'écrit rien, et le clic recalcule l'aperçu sous verrou avant d'écrire —
    // c'est le jeton qui dit si ce que le praticien a vu tient encore.
    let fiches: ApercuFiches | null = null;
    if (envoiFichesOuvert() && activeVersion) {
      try {
        const rejeuActif = await rejeuDe(activeVersion);
        const { blocage, actions } = blocageEtActionsDesFiches({
          dossier: await prisma.patient.findUnique({
            where: { idPatient },
            select: { actif: true, suiviClotureLe: true },
          }),
          decisionCard: rejeuActif.ok ? rejeuActif.decisionCard : null,
          payload: activeVersion.payload,
          inputHash: activeVersion.inputHash,
        });
        fiches = await apercuFichesDuProtocole(
          prisma,
          { idPatient, protocolDraftInputHash: activeVersion.inputHash, actions, blocage },
          { verrouiller: false },
        );
      } catch (erreur) {
        console.warn(
          '[praticien/protocoles/diffusion GET] aperçu des fiches illisible :',
          erreur instanceof Error ? erreur.message : String(erreur),
        );
        fiches = APERCU_FICHES_ILLISIBLE;
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
      apercu,
      fiches,
    });
  } catch (err) {
    console.error('[praticien/protocoles/diffusion GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
