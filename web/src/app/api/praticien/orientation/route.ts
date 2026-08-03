import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  ORIENTATION_METADATA,
  ORIENTATION_RULES_SHA256,
  ORIENTATION_RULES_V1,
} from '@/lib/clinical/orientationRulesV1';
import { evaluerOrientation, type RecommandationExploration } from '@/lib/clinical/orientationEngine';
import { idBaseDepuisPackId, packIdDepuisIdBase, type PackId } from '@/lib/questionnaires-functional';
import { estAdministrableParLaRoute } from '@/lib/bibliotheque';

// Orientation des explorations NNPP2 (campagne certification corpus, lot 7) —
// LECTURE SEULE. Évalue la table de règles signée sur les scores déjà stockés
// du patient et propose des packs d'exploration au praticien. Rien n'est
// jamais auto-assigné : l'assignation reste le geste manuel existant.
//
// Double verrou fail-closed (patron CORPUS_CLINIQUE_ACTIF de lib/anthropic.ts) :
// le flag d'environnement ET la signature praticien de la table
// (`validationExterne`). Table vide + flag absent = réponse « en cours de
// constitution », jamais une erreur (patron rayon corpus C4).

const ROUTE_JOURNAL = '/api/praticien/orientation';

// Verrou auto-portant : `validationExterne` seul serait un booléen qu'un flip
// isolé suffirait à ouvrir. Une table réellement signée porte aussi sa date de
// validation et les claims qui la fondent.
function tableSignee(): boolean {
  return ORIENTATION_METADATA.validationExterne
    && ORIENTATION_METADATA.dateValidation !== null
    && ORIENTATION_METADATA.claimsSource.length > 0;
}

function orientationActive(): boolean {
  return process.env.WN_ENABLE_ORIENTATION_NNPP2 === '1' && tableSignee();
}

/**
 * Une recommandation servie, augmentée de l'`id_pack` de la base pour les
 * cibles de type pack.
 *
 * Le moteur raisonne en `PackId` de doctrine ; le seul point d'assignation
 * (`POST /api/praticien/packs/assign`) attend un `id_pack`. Sans ce champ, un
 * client devrait refaire la jointure lui-même — ou, plus probablement, envoyer
 * le slug et récolter un `pack_not_found`. La route donne donc les deux.
 */
export type RecommandationServie = RecommandationExploration & { idPackBase?: string };

export type OrientationApiResponse =
  | {
      ok: true;
      actif: false;
      version: string;
      message: string;
    }
  | {
      ok: true;
      actif: true;
      version: string;
      sha256: string;
      recommandations: RecommandationServie[];
    }
  | { ok: false; reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception'; error: string };

// GET /api/praticien/orientation?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<OrientationApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ ok: false, reason: 'unauthenticated', error: 'Authentification requise.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' }, { status: 400 });
  }

  try {
    // Verrou avant toute lecture de données cliniques : tant que la table
    // n'est pas signée et le flag posé, la route ne lit pas le dossier (et ne
    // journalise donc pas un accès qui n'a pas eu lieu).
    if (!orientationActive()) {
      return NextResponse.json({
        ok: true,
        actif: false,
        version: ORIENTATION_METADATA.version,
        message: "Orientation en cours de constitution — les règles NNPP2 ne sont pas encore validées.",
      });
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json({ ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' }, { status: 404 });
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json({ ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' }, { status: 403 });
    }

    const [reponses, assignations, packs] = await Promise.all([
      prisma.questionnaireReponse.findMany({
        where: { idPatient },
        select: { idReponse: true, idQuestionnaire: true, dateReponse: true, scoresJson: true },
        orderBy: { dateReponse: 'desc' },
      }),
      prisma.assignation.findMany({
        where: { idPatient },
        select: { idQuestionnaire: true },
      }),
      prisma.pack.findMany({
        where: { actif: true },
        select: { idPack: true, qids: true },
      }),
    ]);

    // Traduire AVANT de comparer. `pack.idPack` vient de la base
    // (`PACK_SOCLE_INIT`), les règles parlent en slugs de doctrine
    // (`pack_socle_initial_neuronutrition`) : les deux espaces de noms sont
    // disjoints. Comparer directement ne rend jamais rien — c'est ce qui rendait
    // toute recommandation de pack impossible avant le LOT-03 du 2026-08-03.
    //
    // Un pack sans correspondance de doctrine (pack composé par le praticien)
    // n'entre pas : il n'est pas une cible d'orientation.
    const compositionPacks: Partial<Record<PackId, string[]>> = {};
    for (const pack of packs) {
      const packId = packIdDepuisIdBase(pack.idPack);
      if (packId === null) continue;
      compositionPacks[packId] = pack.qids;
    }

    const recommandations = evaluerOrientation({
      reponses: reponses.map(reponse => ({
        idQuestionnaire: reponse.idQuestionnaire,
        dateReponse: reponse.dateReponse.toISOString(),
        idReponse: reponse.idReponse,
        scores: reponse.scoresJson as Record<string, unknown>,
      })),
      idsQuestionnairesAssignes: assignations.map(assignation => assignation.idQuestionnaire),
      regles: ORIENTATION_RULES_V1,
      compositionPacks,
      estAdministrable: estAdministrableParLaRoute,
    });

    // Fail-closed explicite : sans composition de pack, on n'affirme aucune
    // recommandation pack administrable.
    const recommandationsFiltrees = recommandations.filter(recommandation => {
      if (recommandation.cible.type === 'questionnaire') {
        return estAdministrableParLaRoute(recommandation.cible.questionnaireId);
      }
      const qids = compositionPacks[recommandation.cible.packId as PackId];
      if (!Array.isArray(qids) || qids.length === 0) return false;
      return qids.every(qid => estAdministrableParLaRoute(qid));
    });

    // Chemin retour : la cible pack repart avec l'`id_pack` que
    // `/api/praticien/packs/assign` attend. Un pack qui a franchi le filtre a
    // forcément une correspondance — il vient de `compositionPacks`, construit
    // par traduction — mais on ne le suppose pas : sans `idPackBase`, le champ
    // reste absent plutôt que faux.
    const recommandationsServies: RecommandationServie[] = recommandationsFiltrees.map(recommandation => {
      if (recommandation.cible.type !== 'pack') return recommandation;
      const idPackBase = idBaseDepuisPackId(recommandation.cible.packId);
      return idPackBase === null ? recommandation : { ...recommandation, idPackBase };
    });

    return NextResponse.json({
      ok: true,
      actif: true,
      version: ORIENTATION_METADATA.version,
      sha256: ORIENTATION_RULES_SHA256,
      recommandations: recommandationsServies,
    });
  } catch (err) {
    // Trace serveur seulement (patron de la route trajectoire) : le corps de
    // réponse ne porte aucun détail technique.
    console.error('[praticien/orientation GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: "Impossible d'évaluer l'orientation pour ce patient." },
      { status: 500 }
    );
  }
}
