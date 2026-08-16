import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import {
  IDS_SUSPENDUS,
  MESSAGE_QUESTIONNAIRE_CONSULTATION,
  MESSAGE_QUESTIONNAIRE_SUSPENDU,
  QUESTIONNAIRES_CATALOG,
  RAISON_QUESTIONNAIRE_CONSULTATION,
  RAISON_QUESTIONNAIRE_SUSPENDU,
} from '@/lib/questionnaires-catalog';
import { IDS_PASSATION_PRATICIEN } from '@/lib/bibliotheque';
import {
  MESSAGE_QID_SANS_DEFINITION,
  QidsSansDefinitionError,
  RAISON_QID_SANS_DEFINITION,
  syncPackToRegistry,
} from '@/lib/consultation/packRegistry';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';
import type { RequestContext } from '@/lib/observability/types';

export type Pack = {
  idPack: string;
  nom: string;
  thematique: string | null;
  description: string | null;
  qids: string[];
  actif: boolean;
  parDefaut: boolean;
};

export type PacksApiResponse = {
  packs: Pack[];
  unavailable?: boolean;
  reason?: 'unauthenticated' | 'exception';
};

export type MutatePackResponse = {
  success: boolean;
  idPack?: string;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'not_found'
    | 'exception'
    | 'default_pack_protected'
    | typeof RAISON_QUESTIONNAIRE_SUSPENDU
    | typeof RAISON_QUESTIONNAIRE_CONSULTATION
    | typeof RAISON_QID_SANS_DEFINITION;
};

type CreatePackPayload = {
  nom?: string;
  thematique?: string;
  description?: string;
  qids?: unknown;
};

type PatchPackPayload = {
  idPack?: string;
  nom?: string;
  thematique?: string;
  description?: string;
  qids?: unknown;
  actif?: boolean;
  parDefaut?: boolean;
};

const catalogue = QUESTIONNAIRE_CATALOGUE as Record<string, { id: string; titre: string }>;

// Ce que l'ÉCRAN sait montrer — et donc ce que le praticien sait décocher.
// `api/praticien/questionnaires` ne sert que ce catalogue-ci ; il n'est pas le
// même que celui de `normaliserQids` ci-dessous.
const IDS_CATALOGUE_ECRAN = new Set(QUESTIONNAIRES_CATALOG.map(q => q.id));

// Ne garde que des ids de questionnaire existants, dédupliqués, bornés.
function normaliserQids(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const vus = new Set<string>();
  for (const raw of input) {
    const id = String(raw ?? '').trim().slice(0, 50);
    if (id && catalogue[id]) vus.add(id);
  }
  return Array.from(vus).slice(0, 60);
}

// Les qids suspendus (`actif: false` au catalogue) présents dans une liste
// DÉJÀ normalisée. Sert aux deux chemins de saisie (POST, PATCH).
//
// DIVERGENCE ASSUMÉE avec `praticien/bibliotheque/apercu/route.ts`, qui laisse
// passer un instrument suspendu s'il est en `PASSATION_PRATICIEN` : cette
// route-là sert une GRILLE au praticien, qui doit pouvoir l'administrer en
// consultation. Un pack, lui, est un véhicule d'ASSIGNATION au patient — un qid
// suspendu y créerait une ligne qui ne pourra jamais partir (`packs/assign`
// filtre en silence). Aucune exception `enConsultation` ici, donc, et ce n'est
// pas un oubli.
//
// Depuis [[D-066]], la suspension n'est plus le seul verrou de cette route :
// `qidsConsultation` ci-dessous refuse les instruments de consultation MÊME
// ACTIFS — la réactivation des cinq cognitifs a ouvert leur assignation
// directe, pas leur entrée en pack.
function qidsSuspendus(qids: string[]): string[] {
  return qids.filter(id => IDS_SUSPENDUS.has(id));
}

// Les qids DE CONSULTATION (`PASSATION_PRATICIEN`) présents dans une liste
// déjà normalisée. Refusés depuis [[D-066]] : la réactivation des cinq
// instruments cognitifs a rendu leur route d'assignation directe ouverte —
// c'est le geste praticien que la décision assume — mais un pack est un
// véhicule d'envoi de ROUTINE, pack de base de l'onboarding compris. Sans ce
// refus, l'invariant « l'assignation est un geste praticien, jamais un envoi
// de routine » ne serait porté par rien de structurel : un MMSE entré dans le
// pack par défaut partirait chez CHAQUE nouveau patient (relevé en revue,
// finding B3).
function qidsConsultation(qids: string[]): string[] {
  return qids.filter(id => IDS_PASSATION_PRATICIEN.has(id));
}

// ─── Garde du pack de base ───────────────────────────────────────────────────
//
// Un seul pack porte `parDefaut: true`, et c'est lui — et lui seul — que
// `resoudrePackBase` (`api/portail/valider/route.ts`) résout pour assigner le
// pack de base à CHAQUE nouveau patient. S'il n'existe plus de pack à la fois
// `parDefaut: true` et `actif: true`, tout onboarding rend 404 « Pack de base
// introuvable », pour tous les patients, et l'UI n'offre aucun chemin de
// réparation (les boutons de secours ne s'affichent que sur un pack actif).
//
// LE PRÉDICAT SE LIT SUR L'ÉTAT RÉSULTANT, JAMAIS SUR LE PAYLOAD. Ne pas le
// « simplifier » en contrôle champ par champ : deux des cinq chemins de casse
// n'ont AUCUN champ fautif pris isolément.
//   • `PATCH { autre, parDefaut: true, actif: false }` — le payload démarque le
//     porteur légitimement et marque une cible… éteinte.
//   • `PATCH { autreInactif, parDefaut: true }`, SANS champ `actif` — le pack
//     reste éteint par HÉRITAGE de l'état stocké, que le payload ne mentionne
//     pas. Un contrôle sur le payload seul ne peut pas voir ce cas.
//
// Les deux clauses sont nécessaires et non redondantes : `{ base,
// parDefaut: false }` n'est prise que par R1 (l'état résultant n'a plus de pack
// par défaut du tout), `DELETE base` n'est prise que par R2 (la marque reste,
// sur un pack éteint).
//
// TOCTOU CONNU ET ASSUMÉ : `findUnique` est lu hors transaction, deux requêtes
// concurrentes peuvent donc s'entrelacer et franchir le garde ensemble.
// Postgres ne sait pas exprimer « au moins une ligne » en contrainte — un index
// partiel unique garantit *au plus un* pack par défaut, jamais *au moins un*.
// Application à un praticien unique : on ne sur-conçoit pas.
function refusPackDeBase(
  existant: { actif: boolean; parDefaut: boolean },
  data: { actif?: boolean; parDefaut?: boolean },
): string | null {
  const actifFinal = data.actif ?? existant.actif;
  const parDefautFinal = data.parDefaut ?? existant.parDefaut;
  // R1 — retirer la marque au porteur sans la donner à personne.
  if (existant.parDefaut && !parDefautFinal) {
    return "Ce pack est le pack de base : il est assigné à chaque nouveau patient. Pour lui retirer cette marque, définissez d'abord un autre pack actif comme pack de base.";
  }
  // R2 — laisser la marque sur un pack éteint : couvre la désactivation du
  // porteur ET le marquage d'un pack inactif. Le message se scinde sur
  // `existant.actif`, parce qu'un geste nommé doit être POSSIBLE : conseiller
  // « réactivez ce pack » à qui désactive un pack actif est un contresens, et
  // aucun écran n'offre de réactivation (`PacksPanel` n'affiche la barre
  // d'actions que sur un pack actif).
  if (parDefautFinal && !actifFinal) {
    return existant.actif
      ? "Ce pack est le pack de base : il est assigné à chaque nouveau patient. Définissez d'abord un autre pack actif comme pack de base."
      : 'Ce pack est désactivé : seul un pack actif peut être le pack de base. Choisissez un pack actif.';
  }
  return null;
}

// ─── Le refus du miroir relationnel, NOMMÉ ───────────────────────────────────
//
// `syncPackToRegistry` lève désormais quand un qid n'a pas de
// `QuestionnaireDefinition` : sans ce passage, les trois `catch` de cette route
// rendraient « Erreur technique lors de la … du pack » sans rien journaliser. Le
// garde aurait alors remplacé une dérive silencieuse par un ÉCHEC silencieux, et
// le praticien n'aurait aucun moyen de savoir quoi retirer.
//
// 409, et qids nommés : exactement la forme des deux autres refus de composition
// de cette route (instrument suspendu ci-dessus, pack de base). Le payload est
// bien formé — c'est l'état résultant qui est refusé.
//
// LE MESSAGE NE PROMET PAS UN GESTE IMPOSSIBLE, et c'est pour cela qu'il se
// scinde. « Retirer du pack » n'est offert par l'écran que pour les qids du
// catalogue d'AFFICHAGE : `api/praticien/questionnaires` ne sert que
// `QUESTIONNAIRES_CATALOG` (actifs + suspendus), et `PacksPanel` n'affiche de
// case que pour ceux-là. Or `normaliserQids` filtre, lui, sur le catalogue de
// SCORING — les deux ensembles diffèrent, et `Q_NEU_12` est exactement dans
// l'écart (`backfillQuestionnaireRegistry.ts` le déclare en `EXTRA_DEFINITIONS`,
// « référencé par des packs mais absent de QUESTIONNAIRES_CATALOG »).
//
// Conseiller « retirez-le » pour un tel qid désignerait une case qui n'existe
// pas, sur un pack devenu inéditable. Le message nomme alors où vit réellement
// le geste — la recréation de la définition, hors UI.
function messageQidsSansDefinition(qids: string[]): string {
  const retirables = qids.filter(qid => IDS_CATALOGUE_ECRAN.has(qid));
  const horsEcran = qids.filter(qid => !IDS_CATALOGUE_ECRAN.has(qid));

  const phrases = [MESSAGE_QID_SANS_DEFINITION];
  if (retirables.length > 0) {
    phrases.push(`À retirer du pack : ${retirables.join(', ')}.`);
  }
  if (horsEcran.length > 0) {
    phrases.push(
      `${horsEcran.join(', ')} ne figure(nt) pas au catalogue de l'écran : leur définition doit être recréée en base avant toute modification de ce pack.`
    );
  }
  return phrases.join(' ');
}

function reponseEchecMutation(
  erreur: unknown,
  contexte: RequestContext,
  messageGenerique: string
): NextResponse<MutatePackResponse> {
  if (erreur instanceof QidsSansDefinitionError) {
    logger.warn({
      event: EVENT_CODES.PACK_REGISTRE_QID_SANS_DEFINITION,
      domain: 'ASSIGNATION',
      message: `Sauvegarde du pack ${erreur.idPack} refusée : ${erreur.qids.length} questionnaire(s) sans définition au registre relationnel. Aucune écriture.`,
      context: finalizeLogContext(contexte, { statusCode: 409, retryable: false }),
      metadata: { idPack: erreur.idPack, qids: erreur.qids },
    });
    return NextResponse.json(
      { success: false, reason: RAISON_QID_SANS_DEFINITION, error: messageQidsSansDefinition(erreur.qids) },
      { status: 409 }
    );
  }
  return NextResponse.json({ success: false, reason: 'exception', error: messageGenerique });
}

// GET /api/praticien/packs — liste des packs (récents d'abord).
export async function GET(): Promise<NextResponse<PacksApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ packs: [], unavailable: true, reason: 'unauthenticated' }, { status: 401 });
  }
  try {
    const rows = await prisma.pack.findMany({ orderBy: { createdAt: 'desc' } });
    const packs: Pack[] = rows.map(p => ({
      idPack: p.idPack,
      nom: p.nom,
      thematique: p.thematique,
      description: p.description,
      qids: p.qids,
      actif: p.actif,
      parDefaut: p.parDefaut,
    }));
    return NextResponse.json({ packs });
  } catch {
    return NextResponse.json({ packs: [], unavailable: true, reason: 'exception' }, { status: 500 });
  }
}

// POST /api/praticien/packs — création d'un pack.
export async function POST(req: Request): Promise<NextResponse<MutatePackResponse>> {
  // À L'ENTRÉE, jamais dans le `catch` : `finalizeLogContext` calcule
  // `durationMs` depuis `startedAtMs`, et un contexte créé au moment de
  // journaliser rendrait toujours 0.
  const contexte = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  let payload: CreatePackPayload;
  try {
    payload = (await req.json()) as CreatePackPayload;
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const nom = (payload.nom ?? '').trim().slice(0, 120);
  const thematique = (payload.thematique ?? '').trim().slice(0, 120);
  const description = (payload.description ?? '').trim().slice(0, 500);
  const qids = normaliserQids(payload.qids);

  if (!nom || qids.length === 0) {
    return NextResponse.json(
      { success: false, reason: 'invalid_payload', error: 'Nom et au moins un questionnaire valide requis.' },
      { status: 400 }
    );
  }

  // Composer un pack est une SAISIE, praticien devant l'écran : refus dur, et
  // qids nommés — filtrer en silence laisserait croire le pack complet.
  //
  // 409 et non 400 : le payload est bien formé, c'est la transition qui est
  // interdite. C'est le statut que rendent déjà les deux autres refus pour
  // instrument suspendu (`praticien/assignations/route.ts:141`,
  // `patient/submit/route.ts:173`, « ce n'est pas une expiration, c'est un
  // retrait ») — un troisième refus du même fait sous un autre statut se
  // lirait comme une autre cause.
  const suspendus = qidsSuspendus(qids);
  if (suspendus.length > 0) {
    return NextResponse.json(
      {
        success: false,
        reason: RAISON_QUESTIONNAIRE_SUSPENDU,
        error: `${MESSAGE_QUESTIONNAIRE_SUSPENDU} À retirer du pack : ${suspendus.join(', ')}.`,
      },
      { status: 409 }
    );
  }
  const consultation = qidsConsultation(qids);
  if (consultation.length > 0) {
    return NextResponse.json(
      {
        success: false,
        reason: RAISON_QUESTIONNAIRE_CONSULTATION,
        error: `${MESSAGE_QUESTIONNAIRE_CONSULTATION} À retirer du pack : ${consultation.join(', ')}.`,
      },
      { status: 409 }
    );
  }

  try {
    const idPack = createPublicId('PACK');
    await prisma.$transaction(async tx => {
      const created = await tx.pack.create({
        data: {
          idPack,
          nom,
          thematique: thematique || null,
          description: description || null,
          qids,
          actif: true,
        },
      });
      await syncPackToRegistry(tx, {
        idPack: created.idPack,
        nom: created.nom,
        description: created.description,
        actif: created.actif,
        qids: created.qids,
      });
    });
    return NextResponse.json({ success: true, idPack });
  } catch (erreur) {
    return reponseEchecMutation(erreur, contexte, 'Erreur technique lors de la création du pack.');
  }
}

// PATCH /api/praticien/packs — mise à jour (nom, contenu, activation).
export async function PATCH(req: Request): Promise<NextResponse<MutatePackResponse>> {
  // À L'ENTRÉE, jamais dans le `catch` : `finalizeLogContext` calcule
  // `durationMs` depuis `startedAtMs`, et un contexte créé au moment de
  // journaliser rendrait toujours 0.
  const contexte = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  let payload: PatchPackPayload;
  try {
    payload = (await req.json()) as PatchPackPayload;
  } catch {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const idPack = (payload.idPack ?? '').trim();
  if (!idPack) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant du pack requis.' }, { status: 400 });
  }

  const data: {
    nom?: string;
    thematique?: string | null;
    description?: string | null;
    qids?: string[];
    actif?: boolean;
    parDefaut?: boolean;
  } = {};
  if (payload.nom !== undefined) {
    const nom = payload.nom.trim().slice(0, 120);
    if (!nom) {
      return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Nom invalide.' }, { status: 400 });
    }
    data.nom = nom;
  }
  if (payload.thematique !== undefined) data.thematique = payload.thematique.trim().slice(0, 120) || null;
  if (payload.description !== undefined) data.description = payload.description.trim().slice(0, 500) || null;
  if (payload.qids !== undefined) {
    const qids = normaliserQids(payload.qids);
    if (qids.length === 0) {
      return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Au moins un questionnaire valide requis.' }, { status: 400 });
    }
    data.qids = qids;
  }
  if (payload.actif !== undefined) data.actif = Boolean(payload.actif);
  if (payload.parDefaut !== undefined) data.parDefaut = Boolean(payload.parDefaut);

  try {
    const existant = await prisma.pack.findUnique({ where: { idPack } });
    if (!existant) {
      return NextResponse.json({ success: false, reason: 'not_found', error: 'Pack introuvable.' }, { status: 404 });
    }
    // Garde du pack de base, AVANT la transaction : sinon la démarcation de
    // l'ancien porteur (`updateMany` ci-dessous) serait déjà écrite.
    const refus = refusPackDeBase(existant, data);
    if (refus) {
      return NextResponse.json({ success: false, reason: 'default_pack_protected', error: refus }, { status: 409 });
    }

    // Instruments suspendus : le refus porte sur les qids AJOUTÉS, jamais sur
    // l'ensemble fourni. La distinction n'est pas cosmétique — l'écran d'édition
    // renvoie TOUJOURS l'état stocké (`PacksPanel` charge `pack.qids` en entier,
    // et ne rend de case à cocher que pour les instruments actifs) : refuser sur
    // l'ensemble fourni verrouillerait tout pack portant déjà un suspendu, avec
    // un message demandant de retirer un questionnaire qu'aucune case ne permet
    // de décocher. C'est le cas du pack de base en production, qui porte
    // `Q_ALI_09` tant que l'agenda alimentaire est éteint.
    //
    // Cette lecture exige `existant`, donc elle vit ici et non près de la
    // normalisation du payload — un effet de bord voulu : un `idPack` inconnu
    // rend 404 avant d'être jugé sur ses qids.
    if (data.qids) {
      const ajoutes = data.qids.filter(id => !existant.qids.includes(id));
      const consultationAjoutes = qidsConsultation(ajoutes);
      if (consultationAjoutes.length > 0) {
        return NextResponse.json(
          {
            success: false,
            reason: RAISON_QUESTIONNAIRE_CONSULTATION,
            error: `${MESSAGE_QUESTIONNAIRE_CONSULTATION} À retirer du pack : ${consultationAjoutes.join(', ')}.`,
          },
          { status: 409 }
        );
      }
      const suspendusAjoutes = qidsSuspendus(ajoutes);
      if (suspendusAjoutes.length > 0) {
        return NextResponse.json(
          {
            success: false,
            reason: RAISON_QUESTIONNAIRE_SUSPENDU,
            error: `${MESSAGE_QUESTIONNAIRE_SUSPENDU} À retirer du pack : ${suspendusAjoutes.join(', ')}.`,
          },
          { status: 409 }
        );
      }
    }
    // Un seul pack par défaut à la fois : on démarque les autres avant de marquer celui-ci.
    await prisma.$transaction(async tx => {
      if (data.parDefaut === true) {
        await tx.pack.updateMany({ where: { parDefaut: true, NOT: { idPack } }, data: { parDefaut: false } });
      }
      const updated = await tx.pack.update({ where: { idPack }, data });
      await syncPackToRegistry(tx, {
        idPack: updated.idPack,
        nom: updated.nom,
        description: updated.description,
        actif: updated.actif,
        qids: updated.qids,
      });
    });
    return NextResponse.json({ success: true, idPack });
  } catch (erreur) {
    return reponseEchecMutation(erreur, contexte, 'Erreur technique lors de la mise à jour du pack.');
  }
}

// DELETE /api/praticien/packs?idPack=... — désactivation (soft delete).
export async function DELETE(req: Request): Promise<NextResponse<MutatePackResponse>> {
  // À L'ENTRÉE, jamais dans le `catch` : `finalizeLogContext` calcule
  // `durationMs` depuis `startedAtMs`, et un contexte créé au moment de
  // journaliser rendrait toujours 0.
  const contexte = createRequestContext(req);
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, reason: 'unauthenticated', error: 'Session absente.' }, { status: 401 });
  }

  const idPack = (new URL(req.url).searchParams.get('idPack') ?? '').trim();
  if (!idPack) {
    return NextResponse.json({ success: false, reason: 'invalid_payload', error: 'Identifiant du pack requis.' }, { status: 400 });
  }

  try {
    const existant = await prisma.pack.findUnique({ where: { idPack } });
    if (!existant) {
      return NextResponse.json({ success: false, reason: 'not_found', error: 'Pack introuvable.' }, { status: 404 });
    }
    // La désactivation est un `actif: false` : le même garde la voit, par R2.
    const refus = refusPackDeBase(existant, { actif: false });
    if (refus) {
      return NextResponse.json({ success: false, reason: 'default_pack_protected', error: refus }, { status: 409 });
    }
    // LA DÉSACTIVATION NE PROPAGE QUE `actif`, ET C'EST UN CORRECTIF DU LOT-03.
    //
    // Elle appelait `syncPackToRegistry`, qui reconstruit les ITEMS du miroir —
    // alors qu'elle ne touche pas `qids` et ne peut donc créer aucune
    // divergence. Depuis que la synchro refuse un qid sans définition, ce
    // couplage inutile avait une conséquence absurde : **le pack en dérive
    // devenait indésactivable**, donc restait actif et assignable. Le garde
    // aurait interdit de retirer le pack qu'il dénonce.
    //
    // `updateMany` et non `update` : un pack legacy peut n'avoir aucun miroir
    // (base seedée), et le geste ne doit pas échouer pour autant.
    await prisma.$transaction(async tx => {
      await tx.pack.update({ where: { idPack }, data: { actif: false } });
      await tx.questionnairePack.updateMany({ where: { packId: idPack }, data: { actif: false } });
    });
    return NextResponse.json({ success: true, idPack });
  } catch (erreur) {
    return reponseEchecMutation(erreur, contexte, 'Erreur technique lors de la suppression du pack.');
  }
}
