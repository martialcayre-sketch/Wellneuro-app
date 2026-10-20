import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import type { ProtocolAction } from '@/lib/clinical-engine/types';
import {
  associationEffetIndesirableDisponible,
  interruptionEffetIndesirableActive,
} from '@/lib/clinical/safetyEffetIndesirableV1';
import { refusSaisieSantePour } from '@/lib/patient/gardeAgeServeur';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { servirAuPatient } from '@/lib/protocol/servirAuPatientServeur';
import {
  effetsNonTraites,
  elementsDesignables,
  elementsDesignablesParLePatient,
  elementsEnPause,
  recoitUnAvis,
  signalementsEnAttente,
  STATUTS_NON_TRAITES,
  type ElementEnPause,
  type Rattachement,
  type VerdictEffetIndesirable,
  versionProgramme,
} from './pauseEffetIndesirable';

// LE CÔTÉ SERVEUR DE LA PAUSE — [[D-281]], étape 3. Le calcul est dans le
// module pur ; ici, les lectures et les deux verrous.

/**
 * Le programme diffusé du patient : son identifiant, ses actions, et s'il est
 * SERVI au portail — ou `null`.
 *
 * Résolu CÔTÉ SERVEUR par `resolveProtocoleDiffuse`, comme le portail : le
 * patient ne désigne jamais un programme, il désigne un élément de celui
 * qu'on lui a transmis. Un payload dont l'intégrité ne se vérifie pas rend
 * `null` — rien à désigner plutôt qu'une liste qu'on ne sait pas garantir.
 *
 * `servi` : les deux marches du portail (`api/portail/protocole`), le rejeu de
 * la carte puis le contrat patient, composées par `servirAuPatient`
 * ([[D-200]]). Faux, le patient lit « indisponible » : aucun élément ne lui
 * est proposé, il désigne sans liste (D-281 §2, arbitrage du responsable du
 * 2026-10-16).
 *
 * UNE LECTURE EN ÉCHEC LÈVE, elle ne rend pas `servi: false` — et c'est voulu.
 * Au dépôt, l'exception mène au repli (le signalement vise le programme
 * diffusé et attend l'avis) ; « non servi » ferait refuser en 400 un élément
 * valide sur une panne passagère, et le signalement serait perdu si le
 * patient ne recommence pas. À `trust/etat`, elle rend le formulaire d'avant.
 */
export async function programmeDiffuse(
  idPatient: string,
): Promise<{ protocolDraftId: string; version: string; actions: ProtocolAction[]; servi: boolean } | null> {
  const diffuse = await resolveProtocoleDiffuse(idPatient);
  if (!diffuse) return null;
  const row = await prisma.protocolDraft.findUnique({
    where: { id: diffuse.protocolDraftId },
    select: { payload: true, inputHash: true, assessmentEpisodeId: true },
  });
  if (!row) return null;
  let draft: ReturnType<typeof reconstructProtocolDraft>;
  try {
    draft = reconstructProtocolDraft(row.payload, row.inputHash);
  } catch {
    return null;
  }
  const servi = (await servirAuPatient({
    idPatient,
    decisionCardId: diffuse.decisionCardId,
    assessmentEpisodeId: row.assessmentEpisodeId,
    protocolDraft: draft,
    approval: {
      decisionCardInputHash: diffuse.decisionCardInputHash,
      protocolDraftInputHash: diffuse.protocolDraftInputHash,
      approvedAt: diffuse.approvedAt.toISOString(),
      approvedBy: 'practitioner',
      confirmation: 'content_approved_for_diffusion',
    },
  })).ok;
  return {
    protocolDraftId: diffuse.protocolDraftId,
    version: versionProgramme(diffuse.protocolDraftInputHash),
    actions: draft.actions,
    servi,
  };
}

/**
 * Le patient peut-il désigner un élément ? Trois conditions, toutes fermées
 * par défaut : le drapeau de capture, un patient MAJEUR (D-283 §5, D-284 :
 * aucune surface neuve pour un dossier mineur ou sans date — il garde le
 * formulaire d'avant), un programme diffusé.
 */
export async function designationOuverte(idPatient: string): Promise<boolean> {
  if (!associationEffetIndesirableDisponible()) return false;
  return (await refusSaisieSantePour(idPatient)) === null;
}

/**
 * La liste servie au formulaire et la version du programme dont elle vient, ou
 * `null` quand la désignation est fermée — le formulaire d'avant.
 *
 * La liste est celle que le patient VOIT (arbitrages du responsable du
 * 2026-10-16, D-281 §2) : les interventions fermes du programme SERVI
 * (`elementsDesignablesParLePatient`). Programme non servi (« indisponible »),
 * ou aucune intervention ferme à désigner : une liste VIDE — la désignation
 * SANS LISTE, « Je ne sais pas » ou « Un autre produit », qui rattache comme
 * les autres. Un programme où le praticien lui-même n'aurait rien à désigner
 * (orientation et prise de sang seules) garde le formulaire d'avant.
 */
export async function designationPour(
  idPatient: string,
): Promise<{ version: string; elements: { actionId: string; title: string }[] } | null> {
  if (!(await designationOuverte(idPatient))) return null;
  const programme = await programmeDiffuse(idPatient);
  if (!programme || elementsDesignables(programme.actions).length === 0) return null;
  const elements = programme.servi ? elementsDesignablesParLePatient(programme.actions) : [];
  return { version: programme.version, elements };
}

/**
 * Ce qui est en pause dans les actions servies au patient — `[]` tant que la
 * règle amendée n'est pas signée (D-281 §6 : d'ici là, capture et
 * notification seulement, rien ne s'interrompt). Les seuls signalements
 * RATTACHÉS : celui du formulaire d'avant attend l'avis, mais rien n'est mis
 * en pause au portail faute d'élément désigné (D-281 §5).
 */
export async function pausesServies(
  idPatient: string,
  protocolDraftId: string,
  actions: readonly ProtocolAction[],
): Promise<ElementEnPause[]> {
  if (!interruptionEffetIndesirableActive()) return [];
  const [signalements, verdicts] = await Promise.all([
    prisma.trustAdverseEffectReport.findMany({
      where: { idPatient, rattachement: { not: null } },
      select: { id: true, rattachement: true, elementActionId: true, protocolDraftId: true },
    }),
    prisma.trustAdverseEffectVerdict.findMany({
      where: { idPatient },
      select: { id: true, reportId: true, verdict: true, elementActionId: true, supersedesVerdictId: true },
    }),
  ]);
  return elementsEnPause({
    signalements: signalements.map(s => ({
      id: s.id,
      rattachement: s.rattachement as Rattachement,
      elementActionId: s.elementActionId,
      protocolDraftId: s.protocolDraftId,
    })),
    verdicts: verdicts.map(v => ({ ...v, verdict: v.verdict as VerdictEffetIndesirable['verdict'] })),
    protocolDraftId,
    actions,
  });
}

/**
 * Les signalements du dossier qui attendent l'avis du praticien (D-281 §3) —
 * la garde de la diffusion. Le calcul est `signalementsEnAttente` ; ici, la
 * lecture. Tous les signalements du dossier qui reçoivent un avis — rattachés,
 * ou du formulaire d'avant (`recoitUnAvis`) —, QUELLE QUE SOIT la version
 * visée : un signalement survit au remplacement du programme.
 *
 * L'appelant lit le verrou `interruptionEffetIndesirableActive()` avant :
 * d'ici la signature, rien ne s'interrompt (D-281 §6).
 */
export async function signalementsEnAttenteDuDossier(
  idPatient: string,
): Promise<{ id: string; soumisLe: Date }[]> {
  const [signalements, verdicts] = await Promise.all([
    prisma.trustAdverseEffectReport.findMany({
      where: { idPatient, OR: [{ rattachement: { not: null } }, { protocolDraftId: { not: null } }] },
      select: { id: true, rattachement: true, protocolDraftId: true, soumisLe: true },
      orderBy: { soumisLe: 'asc' },
    }),
    prisma.trustAdverseEffectVerdict.findMany({
      where: { idPatient },
      select: { id: true, reportId: true, verdict: true, elementActionId: true, supersedesVerdictId: true },
    }),
  ]);
  return signalementsEnAttente(
    signalements,
    verdicts.map(v => ({ ...v, verdict: v.verdict as VerdictEffetIndesirable['verdict'] })),
  ).map(({ id, soumisLe }) => ({ id, soumisLe }));
}

/**
 * Les signalements d'effet indésirable NON TRAITÉS parmi ceux que `where`
 * retient — la lecture du Fil du jour et du prévol du copilote. La règle est
 * `effetsNonTraites`, celle du panneau TRUST ; ici, la lecture : les
 * signalements ouverts par statut, plus TOUS ceux qui reçoivent un avis, quel
 * que soit leur statut — un signalement « traité » sans verdict attend
 * toujours —, puis la chaîne des avis de ces derniers. Le plus récent d'abord.
 *
 * Aucun verrou, comme le compteur du panneau : actif dès le déploiement.
 */
export async function lireEffetsNonTraites(
  where: Prisma.TrustAdverseEffectReportWhereInput,
): Promise<{ id: string; idPatient: string; soumisLe: Date }[]> {
  const candidats = await prisma.trustAdverseEffectReport.findMany({
    where: {
      AND: [
        where,
        {
          OR: [
            { statutTraitement: { in: [...STATUTS_NON_TRAITES] } },
            { rattachement: { not: null } },
            { protocolDraftId: { not: null } },
          ],
        },
      ],
    },
    select: { id: true, idPatient: true, soumisLe: true, statutTraitement: true, rattachement: true, protocolDraftId: true },
    orderBy: { soumisLe: 'desc' },
  });
  const avecAvis = candidats.filter(recoitUnAvis);
  const verdicts = avecAvis.length === 0
    ? []
    : await prisma.trustAdverseEffectVerdict.findMany({
      where: { reportId: { in: avecAvis.map(e => e.id) } },
      select: { id: true, reportId: true, verdict: true, elementActionId: true, supersedesVerdictId: true },
    });
  return effetsNonTraites(
    candidats,
    verdicts.map(v => ({ ...v, verdict: v.verdict as VerdictEffetIndesirable['verdict'] })),
  ).map(({ id, idPatient, soumisLe }) => ({ id, idPatient, soumisLe }));
}

/**
 * Les éléments désignables de chaque programme VISÉ par un signalement — la
 * version figée avec le rattachement, pas la version en cours (D-281 §2 a) :
 * c'est sur elle que le patient a désigné, et sur elle que le praticien
 * désigne pour « Je ne sais pas » (§5). `null` pour un programme absent ou dont
 * l'intégrité ne se vérifie pas : aucun élément plutôt qu'une liste qu'on ne
 * sait pas garantir.
 */
export async function elementsDesProgrammesVises(
  protocolDraftIds: readonly string[],
): Promise<Map<string, { actionId: string; title: string }[] | null>> {
  const ids = [...new Set(protocolDraftIds)];
  const resultat = new Map<string, { actionId: string; title: string }[] | null>(ids.map(id => [id, null]));
  if (ids.length === 0) return resultat;
  const rows = await prisma.protocolDraft.findMany({
    where: { id: { in: ids } },
    select: { id: true, payload: true, inputHash: true },
  });
  for (const row of rows) {
    try {
      resultat.set(row.id, elementsDesignables(reconstructProtocolDraft(row.payload, row.inputHash).actions));
    } catch {
      resultat.set(row.id, null);
    }
  }
  return resultat;
}
