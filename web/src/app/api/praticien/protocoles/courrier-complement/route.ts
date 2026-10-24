import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { reconstructProtocolDraft } from '@/lib/protocol/fromPrisma';
import { preparerCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import { lireEntreesGardeComplement } from '@/lib/clinical/entreesGardeComplement';
import { courrierComplementRequis } from '@/lib/clinical/gardeComplementCible';
import { DECLENCHEURS_COMPLEMENT_METADATA } from '@/lib/clinical/declencheursComplementCibleV1';
import {
  complementsCibles,
  listeComplementsCibles,
  MOTIFS_REFUS_LISTE,
} from '@/lib/correspondance/courrierComplementListe';
import {
  genererCourrierComplement,
  PREFIXE_ANCRAGE_COMPLEMENT,
  type LigneComplement,
} from '@/lib/correspondance/courrierComplement';
import { courrierComplementOuvert } from '@/lib/correspondance/courrierComplementRemise';
import { consignerCourrierComplement } from '@/lib/correspondance/courrierComplementConsignation';
import { classeEtCode } from '@/lib/observability/classeEtCode';

// LE COURRIER COMPLÉMENT, PRÉPARÉ ET CONSIGNÉ — [[D-345]] §4-§7, J3-12h, lot 3
// (G4 de la fiche de cadrage). Le praticien le prépare AVANT le clic
// « Valider pour diffusion », qui le remet au patient.
//
// LE TEXTE EST GÉNÉRÉ CÔTÉ SERVEUR, JAMAIS REÇU DU CLIENT (patron du courrier
// biologie) : il passe la garde non prescriptive avant d'être consigné. Le
// praticien ne fournit que la version visée et le destinataire.
//
// LA LISTE EST CELLE DE LA VERSION PERSISTÉE (obligation du lot 2) : relue en
// base par son identifiant, jamais le payload d'une requête. Ses refus — format
// d'identifiant, référence catalogue nulle, contrat — se disent en clair avant
// toute insertion.
//
// LE COURRIER ET SA LISTE, OU RIEN (obligation du lot 2) :
// `consignerCourrierComplement`, une seule transaction, accord relu sous
// verrou. Un courrier sans liste ne se remettrait jamais ; une liste refusée
// par la base annule le courrier.
//
// LA GARDE EST RELUE ICI : on ne prépare un courrier que s'il est requis. Un
// mineur, une date de naissance absente, un état à établir ou un accord de
// partage absent (régime fermé, D-345 §6) refusent avant toute génération ;
// l'accord est relu sous verrou juste avant l'insertion (patron biologie).

const ROUTE_JOURNAL = '/api/praticien/protocoles/courrier-complement';
const ID_PATTERN = /^[A-Za-z0-9_:.#-]+$/;

const MESSAGE_FERME = 'Le courrier avant un complément ciblé n’est pas ouvert sur ce déploiement.';

export type CourrierComplementApiResponse =
  | { ok: true; idCorrespondance: string; texte: string; html: string }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS_COURRIER: Record<string, string> = {
  aucun_complement: 'La version ne porte aucun complément ciblé : aucun courrier n’est à préparer.',
  terme_prescriptif:
    'Le courrier n’a pas pu être rendu : un intitulé de complément porte un terme prescriptif. Rien n’est consigné.',
  bloc_non_diffuse: 'Le rendu médecin n’est pas diffusable : rien n’est consigné.',
};

const MESSAGES_REFUS_CONSIGNATION: Record<string, string> = {
  medecin_libelle_vide: 'Le destinataire du courrier est requis.',
  medecin_libelle_email: 'Indiquez le nom du destinataire, pas une adresse e-mail.',
  medecin_libelle_trop_long: 'Le nom du destinataire est trop long (200 caractères maximum).',
  texte_vide: 'Le courrier généré est vide : rien n’est consigné.',
  texte_trop_long: 'Le courrier généré dépasse la longueur consignable : rien n’est consigné.',
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<CourrierComplementApiResponse>({ ok: false, reason, error }, { status });
}

type PostBody = { idPatient?: unknown; protocolDraftId?: unknown; medecinLibelle?: unknown };

/** Une ligne par complément ciblé, dans l'ordre du protocole, sans doublon d'identité. */
async function lignesDuCourrier(
  actions: ReturnType<typeof complementsCibles>,
): Promise<LigneComplement[]> {
  const ingredientIds = [...new Set(actions
    .map(action => action.supplementCatalogRef?.ingredientId)
    .filter((id): id is string => typeof id === 'string'))];
  const ingredients = ingredientIds.length === 0
    ? []
    : await prisma.supplementIngredient.findMany({
      where: { id: { in: ingredientIds } },
      select: { id: true, nomFr: true },
    });
  const nomDe = new Map(ingredients.map(ingredient => [ingredient.id, ingredient.nomFr]));
  const vues = new Set<string>();
  const lignes: LigneComplement[] = [];
  for (const action of actions) {
    const ingredientId = action.supplementCatalogRef?.ingredientId ?? null;
    const cle = `${action.actionId}\u0000${action.title}\u0000${ingredientId ?? ''}`;
    if (vues.has(cle)) continue;
    vues.add(cle);
    lignes.push({ intitule: action.title, ingredient: ingredientId ? nomDe.get(ingredientId) ?? null : null });
  }
  return lignes;
}

export async function POST(req: Request) {
  try {
    // LE DRAPEAU D'ABORD : un geste fermé ne laisse aucune trace de dossier.
    if (!courrierComplementOuvert()) return echec('feature_disabled', MESSAGE_FERME, 503);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const session = await getServerSession(authOptions);
    if (!session) return echec('unauthenticated', 'Authentification requise.', 401);

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    const protocolDraftId = typeof body.protocolDraftId === 'string' ? body.protocolDraftId.trim() : '';
    if (!idPatient || idPatient.length > 64 || !ID_PATTERN.test(idPatient)) {
      return echec('invalid', 'Identifiant patient invalide.', 400);
    }
    if (!protocolDraftId || protocolDraftId.length > 300 || !ID_PATTERN.test(protocolDraftId)) {
      return echec('invalid', 'Version de protocole invalide.', 400);
    }

    const email = emailPraticien(session);
    // `acces` EST fourni : la route lit l'âge, la fiche physiologique et
    // l'anamnèse d'un dossier NOMMÉ (G-TRUST-04).
    const appartenance = await verifierAppartenancePatient(idPatient, email, { route: ROUTE_JOURNAL, methode: 'POST' });
    if (appartenance === 'introuvable') return echec('patient_not_found', 'Patient introuvable.', 404);
    if (appartenance === 'autre_praticien' || !email) {
      return echec('forbidden', 'Patient non accessible pour ce praticien.', 403);
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      // Le nom entre dans l'en-tête du HTML rendu, jamais dans le texte consigné ni dans un log.
      select: { actif: true, suiviClotureLe: true, prenom: true, nom: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);

    // LA VERSION PERSISTÉE, de ce dossier.
    const version = await prisma.protocolDraft.findUnique({
      where: { id: protocolDraftId },
      select: { idPatient: true, payload: true, inputHash: true, contractVersion: true },
    });
    if (!version || version.idPatient !== idPatient) {
      return echec('not_found', 'Version de protocole introuvable.', 404);
    }
    let actions;
    try {
      actions = reconstructProtocolDraft(version.payload, version.inputHash).actions;
    } catch {
      return echec('version_illisible', 'La version ne se relit pas : aucun courrier ne peut être préparé.', 409);
    }

    // LA GARDE : un courrier ne se prépare que s'il est requis.
    const maintenant = new Date();
    const entrees = await lireEntreesGardeComplement(prisma, idPatient, actions, maintenant.getTime());
    if (!entrees) return echec('patient_not_found', 'Patient introuvable.', 404);
    const verdict = courrierComplementRequis(entrees);
    if (verdict.statut !== 'requis') return echec(`garde_${verdict.statut}`, verdict.motif, 409);

    const liste = listeComplementsCibles(actions, version.contractVersion);
    if (!liste.ok) return echec(liste.raison, MOTIFS_REFUS_LISTE[liste.raison], 409);

    const shaTable = DECLENCHEURS_COMPLEMENT_METADATA.shaPerimetre;
    if (!shaTable) return echec('garde_table_non_signee', 'La table des déclencheurs n’est pas signée.', 409);
    const genere = genererCourrierComplement({
      patientId: idPatient,
      lignes: await lignesDuCourrier(complementsCibles(actions)),
      ancrage: { version: `${PREFIXE_ANCRAGE_COMPLEMENT}${shaTable}`, sha256: shaTable },
      dateCourrier: maintenant.toISOString(),
      patientNom: `${patient.prenom} ${patient.nom}`.trim(),
    });
    if (!genere.ok) {
      return echec(genere.raison, MESSAGES_REFUS_COURRIER[genere.raison] ?? 'Courrier indisponible.', 409);
    }
    // L'ancre vient du bloc EFFECTIVEMENT RENDU (patron biologie, [[D-073]] §2).
    const provenance = genere.courrier.document.blocs[0]?.provenance;
    if (!provenance) return echec('provenance_absente', 'Courrier sans provenance : rien n’est consigné.', 500);

    const preparation = preparerCorrespondance({
      idPatient,
      praticienEmail: email,
      sens: 'sortant',
      medecinLibelle: body.medecinLibelle,
      texte: genere.courrier.texte,
    });
    if (!preparation.ok) {
      const refusServeur = preparation.raison === 'texte_vide' || preparation.raison === 'texte_trop_long';
      return echec(
        preparation.raison,
        MESSAGES_REFUS_CONSIGNATION[preparation.raison] ?? 'Consignation refusée.',
        refusServeur ? 409 : 400,
      );
    }

    let issue;
    try {
      issue = await consignerCourrierComplement(prisma, {
        idPatient,
        donnees: preparation.donnees,
        ancrage: { sha256: provenance.ancrageHash, version: provenance.version },
        liste,
      });
    } catch (err) {
      // JAMAIS `err.message` : il peut recopier le texte du courrier.
      console.error('[praticien/protocoles/courrier-complement POST] consignation refusée :', ...classeEtCode(err));
      return echec('server_error', 'Erreur technique : rien n’est consigné.', 500);
    }
    if (!issue.ok) return echec(issue.raison, issue.message, 409);

    return NextResponse.json<CourrierComplementApiResponse>(
      { ok: true, idCorrespondance: issue.idCorrespondance, texte: genere.courrier.texte, html: genere.courrier.html },
      { status: 201 },
    );
  } catch (err) {
    console.error('[praticien/protocoles/courrier-complement POST]', ...classeEtCode(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
