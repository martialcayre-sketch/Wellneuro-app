import { NextResponse } from 'next/server';
import type { Prisma } from '@/generated/prisma';
import { prisma } from '@/lib/prisma';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderResultats } from '@/lib/biology-library/gardeResultats';
import { annulationParLigne, correctionsParLigne } from '@/lib/biology-library/filCorrection';
import { annulationsActives, verrouillerCleDuResultat } from '@/lib/biology-library/annulations';
import { estStatutPose } from '@/lib/biology-library/statutPoseListe';
import { MESSAGES_REFUS_STATUT, signature } from '@/lib/biology-library/saisieMessages';

// POSER UN STATUT PRÈS D'UNE VALEUR, OU LE RETIRER ([[D-322]], F58) — deux
// actes en ajout seul dans `statuts_poses_resultats_biologiques`. Le statut
// dit ce que le praticien fait de la valeur, jamais ce que vaut la valeur ;
// il est pris dans une liste fermée (`statutPoseListe.ts`, recopie du CHECK).
//
// LA BASE FAIT FOI. Le trigger `statuts_poses_resultats_biologiques_avant_insertion`
// refuse : résultat d'un autre dossier, auteur autre que le praticien du
// dossier, ligne déjà corrigée, pose du statut déjà actif, retrait sans statut
// posé. La route le DIT avant, sous les MÊMES verrous (ceux de BP-09 : le
// dossier, puis la clé de la ligne), pour que le refus rendu soit le sien,
// nommé, et non une 500. Elle refuse EN PLUS la pose sur un résultat annulé,
// que la base laisse passer (en-tête de la migration) : la ligne n'est plus
// à l'écran.
//
// L'AUTEUR EST L'E-MAIL DE SESSION ; l'instant et l'ordre sont posés par la
// base, inantidatables. UN ACTE PAR TRANSACTION (relecture `wn-reviewer` de
// la migration) : deux actes sur deux clés dans une même transaction
// prendraient deux verrous de clé dans un ordre que rien ne fixe.
//
// PAS de journal d'accès : dispense d'écriture `GD-1` ([[D-118]]), comme la
// saisie et l'annulation — l'acte porte son auteur et sa date.

type Body = {
  idPatient?: unknown;
  idResultat?: unknown;
  acte?: unknown;
  /** Pose : le statut posé. Retrait : absent. */
  statut?: unknown;
};

export type StatutsPostResponse = { ok: true } | { ok: false; reason: string; error: string };

function echec(reason: string, status: number, error = MESSAGES_REFUS_STATUT[reason]) {
  return NextResponse.json<StatutsPostResponse>({ ok: false, reason, error }, { status });
}

/** Un identifiant borné, ou `''` — même discipline que l'annulation. */
function identifiant(valeur: unknown): string {
  const v = typeof valeur === 'string' ? valeur.trim() : '';
  return v.length > 0 && v.length <= 64 ? v : '';
}

/** Une issue de transaction : le refus nommé, ou l'acte écrit. */
class Refus extends Error {
  constructor(readonly raison: string) {
    super(raison);
  }
}

/**
 * Le fil de la clé de la ligne visée, lu SOUS les verrous — la lecture de la
 * route des annulations, à l'identique : la tête et l'annulation se lisent
 * comme la fiche les montre.
 */
async function lireFil(
  tx: Prisma.TransactionClient,
  idPatient: string,
  idResultat: string,
) {
  const visee = await tx.resultatBiologique.findFirst({
    where: { id: idResultat, idPatient },
    select: { analyteCode: true, preleveLe: true },
  });
  if (!visee) return null;
  const lignes = await tx.resultatBiologique.findMany({
    where: { idPatient, analyteCode: visee.analyteCode, preleveLe: visee.preleveLe },
    select: { id: true, supersedesResultatId: true, saisiLe: true },
  });
  const maillons = lignes.map(l => ({
    id: l.id,
    supersedesResultatId: l.supersedesResultatId,
    saisiLe: l.saisiLe.toISOString(),
  }));
  const annulees = annulationParLigne(maillons, await annulationsActives(tx, idPatient, lignes.map(l => l.id)));
  return { maillons, annulees };
}

export async function POST(req: Request) {
  try {
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return echec('acte_invalide', 400);
    }
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('acte_invalide', 400);
    }

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    const garde = await garderResultats(idPatient);
    if (!garde.ok) {
      return NextResponse.json<StatutsPostResponse>(
        { ok: false, reason: garde.reason, error: garde.error },
        { status: garde.status },
      );
    }

    // Même règle que la saisie, la correction et l'annulation : un dossier
    // clos ne reçoit plus d'écriture.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS);
    }

    const acte = body.acte;
    if (acte !== 'pose' && acte !== 'retrait') return echec('acte_invalide', 400);
    const idResultat = identifiant(body.idResultat);
    if (!idResultat) return echec('cible_invalide', 400);
    const statut = body.statut;
    if (acte === 'pose' && !estStatutPose(statut)) return echec('statut_invalide', 400);
    if (acte === 'retrait' && statut !== undefined && statut !== null) return echec('statut_invalide', 400);

    await prisma.$transaction(async tx => {
      if (!(await verrouillerCleDuResultat(tx, idPatient, idResultat))) {
        throw new Refus('statut_cible_inconnue');
      }
      const fil = await lireFil(tx, idPatient, idResultat);
      if (!fil) throw new Refus('statut_cible_inconnue');
      // Tête de fil DÉFINIE COMME À LA LECTURE : sur une fourche, la base
      // admet l'une ou l'autre branche ; la route ne pose que sur celle que
      // la fiche montre courante.
      if (correctionsParLigne(fil.maillons).has(idResultat)) throw new Refus('statut_pas_tete');
      if (acte === 'pose' && fil.annulees.has(idResultat)) throw new Refus('statut_resultat_annule');

      // Le statut actif : celui du dernier acte de la ligne, lu sous les
      // verrous — la règle du trigger.
      const dernier = await tx.statutPoseResultatBiologique.findFirst({
        where: { idResultat },
        orderBy: { ordre: 'desc' },
        select: { statut: true },
      });
      const actif = dernier?.statut ?? null;
      if (acte === 'pose' && actif === statut) throw new Refus('statut_deja_actif');
      if (acte === 'retrait' && actif === null) throw new Refus('statut_aucun_a_retirer');

      await tx.statutPoseResultatBiologique.create({
        data: {
          idPatient,
          idResultat,
          acte,
          statut: acte === 'pose' ? (statut as string) : null,
          praticienEmail: garde.email,
        },
        select: { id: true },
      });
    });
    return NextResponse.json<StatutsPostResponse>({ ok: true }, { status: 201 });
  } catch (err) {
    if (err instanceof Refus) return echec(err.raison, 409);
    // JAMAIS `err.message` : il porterait des identifiants du dossier.
    console.error('[praticien/biologie/resultats/statuts POST] refus :', signature(err));
    return NextResponse.json<StatutsPostResponse>(
      { ok: false, reason: 'server_error', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
