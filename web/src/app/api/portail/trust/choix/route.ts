import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { getDocumentCourant } from '@/lib/trust/contenus/registre';
import { FORMULATION_CHOIX_VERSION, traceFormulationActive } from '@/lib/trust/finalitesChoix';
import type { FinaliteChoix, StatutChoix } from '@/lib/trust/types';

export type TrustChoixResponse = { ok: true } | { ok: false; reason: string; error: string };

type Payload = { finalite?: string; statut?: string };

const FINALITES_VALIDES: FinaliteChoix[] = [
  'partage_medecin_traitant',
  'communications_non_essentielles',
];
const STATUTS_VALIDES: StatutChoix[] = ['accorde', 'refuse', 'retire'];

// POST /api/portail/trust/choix — enregistre un événement de choix facultatif.
// Append-only : le nouvel événement supplante le précédent (supersedesEventId)
// sans jamais l'écraser. Le retrait est aussi simple que l'accord.
export async function POST(req: Request): Promise<NextResponse<TrustChoixResponse>> {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const finalite = payload.finalite as FinaliteChoix;
  const statut = payload.statut as StatutChoix;
  if (!FINALITES_VALIDES.includes(finalite) || !STATUTS_VALIDES.includes(statut)) {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Choix inconnu.' }, { status: 400 });
  }

  const auth = await authentifierPatientPortail(req);
  if (auth.erreur) return auth.erreur as NextResponse<TrustChoixResponse>;
  const { patient } = auth;

  try {
    const resultat = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM patients WHERE id_patient = ${patient.idPatient} FOR UPDATE`;
      const precedent = await tx.trustChoiceEvent.findFirst({
        where: { idPatient: patient.idPatient, finalite },
        orderBy: { enregistreLe: 'desc' },
        select: { id: true, statut: true },
      });
      // Retirer un choix jamais accordé n'a pas de sens ; on répond ok sans écrire.
      if (statut === 'retire' && (!precedent || precedent.statut !== 'accorde')) {
        return { ignore: true as const };
      }
      // DEUX VERSIONS, ET ELLES NE DISENT PAS LA MÊME CHOSE ([[D-222]] §3).
      // `documentVersion` porte `droits_patient` — le document de référence.
      // `formulationVersion` porte le texte RÉELLEMENT LU pour choisir, celui de
      // « Mes choix ». Sans la seconde, deux consentements donnés sur deux
      // formulations différentes sont indiscernables, et la correction du
      // 2026-09-17 les aurait rendus indiscernables une fois de plus.
      //
      // LE DRAPEAU PROTÈGE LA COLONNE, PAS LA FONCTION. Le code se déploie avant
      // que `release-db` ait appliqué la migration : nommer la colonne avant son
      // existence casserait l'enregistrement du choix lui-même. Éteint, on écrit
      // exactement ce qu'on écrivait hier.
      await tx.trustChoiceEvent.create({
        data: {
          idPatient: patient.idPatient,
          finalite,
          statut,
          documentVersion: getDocumentCourant('droits_patient').version,
          ...(traceFormulationActive() ? { formulationVersion: FORMULATION_CHOIX_VERSION } : {}),
          supersedesEventId: precedent?.id ?? null,
        },
        // `select` OBLIGATOIRE, ET LE DRAPEAU NE SUFFISAIT PAS SANS LUI.
        //
        // Un `create` sans `select` fait émettre à Prisma un `INSERT … RETURNING`
        // portant TOUS les scalaires du modèle — `formulation_version` comprise,
        // que `data` la nomme ou non. Le drapeau garde ce qui ENTRE ; il ne
        // gardait pas ce qui REVIENT. Entre le merge et l'application de la
        // migration, ce POST — celui qui enregistre le choix du patient — aurait
        // donc échoué en 42703 « column does not exist », drapeau éteint compris.
        //
        // Le résultat est jeté de toute façon : `{ id: true }` est le plus petit
        // `RETURNING` qui existe. Constat de la revue, vérifié ligne à ligne.
        select: { id: true },
      });
      return { ignore: false as const };
    });
    if (resultat.ignore) return NextResponse.json({ ok: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[trust/choix POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
