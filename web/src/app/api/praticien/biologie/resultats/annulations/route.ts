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
import { estMotifAnnulation, estMotifRevocation } from '@/lib/biology-library/annulationMotifs';
import { MESSAGES_REFUS_ANNULATION, signature } from '@/lib/biology-library/saisieMessages';

// ANNULER UN RÉSULTAT SAISI PAR ERREUR, OU RÉVOQUER CETTE ANNULATION
// ([[D-294]], BP-09) — deux actes en ajout seul dans
// `annulations_resultats_biologiques`. Rien ne s'efface : le résultat reste
// lisible sur la fiche du praticien, marqué « annulé » ; il sort de tout
// calcul (élection, derniers résultats, portes, contrôles de doublon).
//
// LA BASE FAIT FOI. Le trigger `annulations_resultats_biologiques_avant_insertion`
// refuse tout ce que cette route refuse — résultat d'un autre dossier, auteur
// autre que le praticien du dossier, cible déjà corrigée, fil déjà annulé,
// révocation d'une annulation d'un autre résultat, place reprise — et un index
// unique partiel tient « une révocation par annulation ». La route le DIT
// avant, sous les MÊMES verrous (le dossier, puis la clé), pour que le refus
// rendu soit le sien, nommé, et non une 500.
//
// L'AUTEUR EST L'E-MAIL DE SESSION ; l'instant et l'ordre sont posés par la
// base, inantidatables. Aucun texte libre : le motif est pris dans une liste
// fermée (`annulationMotifs.ts`, recopie des CHECK).
//
// PAS de journal d'accès : dispense d'écriture `GD-1` ([[D-118]]), comme la
// saisie — l'acte porte son auteur et sa date. Les lectures du fil servent la
// garde ; rien n'en est rendu.

type Body = {
  idPatient?: unknown;
  acte?: unknown;
  /** Annulation : le résultat visé (tête du fil). */
  idResultat?: unknown;
  /** Révocation : l'annulation révoquée. */
  idAnnulation?: unknown;
  motif?: unknown;
};

export type AnnulationsPostResponse = { ok: true } | { ok: false; reason: string; error: string };

function echec(reason: string, status: number, error = MESSAGES_REFUS_ANNULATION[reason]) {
  return NextResponse.json<AnnulationsPostResponse>({ ok: false, reason, error }, { status });
}

/** Un identifiant borné, ou `''` — même discipline que `supersedesResultatId`. */
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

/** Le fil de la clé du résultat, lu SOUS les verrous. */
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
      return NextResponse.json<AnnulationsPostResponse>(
        { ok: false, reason: garde.reason, error: garde.error },
        { status: garde.status },
      );
    }

    // Même règle que la saisie et la correction : un dossier clos ne reçoit
    // plus d'écriture.
    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS);
    }

    if (body.acte === 'annulation') {
      const idResultat = identifiant(body.idResultat);
      if (!idResultat) return echec('cible_invalide', 400);
      const motif = body.motif;
      if (!estMotifAnnulation(motif)) return echec('motif_invalide', 400);

      await prisma.$transaction(async tx => {
        if (!(await verrouillerCleDuResultat(tx, idPatient, idResultat))) {
          throw new Refus('annulation_cible_inconnue');
        }
        const fil = await lireFil(tx, idPatient, idResultat);
        if (!fil) throw new Refus('annulation_cible_inconnue');
        // Tête de fil DÉFINIE COMME À LA LECTURE : sur une fourche, la base
        // admet l'une ou l'autre branche ; la route n'annule que celle qui fait
        // foi, celle que la fiche montre courante.
        if (correctionsParLigne(fil.maillons).has(idResultat)) throw new Refus('annulation_pas_tete');
        if (fil.annulees.has(idResultat)) throw new Refus('annulation_deja_active');
        await tx.annulationResultatBiologique.create({
          data: {
            idPatient,
            idResultat,
            acte: 'annulation',
            motifAnnulation: motif,
            praticienEmail: garde.email,
          },
          select: { id: true },
        });
      });
      return NextResponse.json<AnnulationsPostResponse>({ ok: true }, { status: 201 });
    }

    if (body.acte === 'revocation') {
      const idAnnulation = identifiant(body.idAnnulation);
      if (!idAnnulation) return echec('cible_invalide', 400);
      const motif = body.motif;
      if (!estMotifRevocation(motif)) return echec('motif_invalide', 400);

      // `where { id, idPatient }` : une annulation d'un autre dossier est
      // « introuvable », rien ne fuite de son existence.
      const annulation = await prisma.annulationResultatBiologique.findFirst({
        where: { id: idAnnulation, idPatient, acte: 'annulation' },
        select: { id: true, idResultat: true },
      });
      if (!annulation) return echec('revocation_cible_inconnue', 409);

      await prisma.$transaction(async tx => {
        if (!(await verrouillerCleDuResultat(tx, idPatient, annulation.idResultat))) {
          throw new Refus('revocation_cible_inconnue');
        }
        const deja = await tx.annulationResultatBiologique.count({
          where: { idAnnulationRevoquee: annulation.id, acte: 'revocation' },
        });
        if (deja > 0) throw new Refus('revocation_deja_faite');
        // LA PLACE REPRISE ([[D-294]] §3) : une autre racine VIVANTE sur la
        // clé ferait, le fil revenu, deux mesures courantes pour un même
        // analyte à une même date.
        const fil = await lireFil(tx, idPatient, annulation.idResultat);
        if (!fil) throw new Refus('revocation_cible_inconnue');
        const lignesDuFil = new Set(
          fil.maillons.filter(m => fil.annulees.get(m.id)?.id === annulation.id).map(m => m.id),
        );
        const reprise = fil.maillons.some(
          m => m.supersedesResultatId === null && !lignesDuFil.has(m.id) && !fil.annulees.has(m.id),
        );
        if (reprise) throw new Refus('revocation_place_reprise');
        await tx.annulationResultatBiologique.create({
          data: {
            idPatient,
            idResultat: annulation.idResultat,
            acte: 'revocation',
            idAnnulationRevoquee: annulation.id,
            motifRevocation: motif,
            praticienEmail: garde.email,
          },
          select: { id: true },
        });
      });
      return NextResponse.json<AnnulationsPostResponse>({ ok: true }, { status: 201 });
    }

    return echec('acte_invalide', 400);
  } catch (err) {
    if (err instanceof Refus) return echec(err.raison, 409);
    // L'index unique partiel « une révocation par annulation » : filet d'une
    // course que les verrous ferment déjà.
    if ((err as { code?: string } | null)?.code === 'P2002') return echec('revocation_deja_faite', 409);
    // JAMAIS `err.message` : il porterait des identifiants du dossier.
    console.error('[praticien/biologie/resultats/annulations POST] refus :', signature(err));
    return NextResponse.json<AnnulationsPostResponse>(
      { ok: false, reason: 'server_error', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
