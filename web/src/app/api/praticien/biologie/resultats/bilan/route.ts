import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderResultats } from '@/lib/biology-library/gardeResultats';
import { validerDatePrelevement, validerSaisieResultat } from '@/lib/biology-library/resultats';
import { MESSAGES_REFUS_SAISIE, signature } from '@/lib/biology-library/saisieMessages';

// Saisie GROUPÉE d'un bilan (BIO-INGEST LOT-01, A1 et A3 de [[D-256]]) : une
// date de prélèvement commune, N analytes, UNE validation. Sœur de la route
// unitaire (`../route.ts`), dont elle reprend les gardes, la validation, la
// lecture d'unité et la détection de doublon — sans rien changer à celle-ci.
//
// TOUT OU RIEN (A3). Toutes les lignes passent d'abord le PRÉFLIGHT complet,
// et TOUS les refus sont collectés — pas d'arrêt à la première ligne : le
// praticien reprend son bilan en un passage, pas en dix allers-retours.
// L'écriture n'a lieu que si toutes passent, en un seul `$transaction` :
// 9 lignes valides et une 10e refusée ⇒ RIEN n'est écrit. Un best-effort
// ligne par ligne laisserait un bilan à moitié consigné, que personne ne
// saurait plus distinguer d'un bilan complet.
//
// UN BILAN NE CORRIGE RIEN. La correction ([[D-124]]) reste un geste unitaire,
// depuis la série, avec ses contrôles de fil : une ligne qui porte
// `supersedesResultatId` est REFUSÉE, jamais ignorée — l'ignorer ferait d'une
// correction voulue une mesure neuve, en silence. A fortiori, une mesure
// `import_labo` ne se corrige pas par ici.
//
// Ce que le client NE fournit PAS, exactement comme en unitaire : l'unité
// (relue sur l'analyte au catalogue), la `source` (posée serveur), l'auteur
// (la session). Aucune valeur n'est qualifiée, aucune unité n'est convertie
// ([[D-157]]).
//
// PAS de journal d'accès : même dispense d'écriture `GD-1` que le POST
// unitaire ([[D-118]]) — `saisi_par` et `saisi_le` datent et attribuent déjà
// chaque ligne. La lecture des doublons sert la garde, rien n'en est rendu.

/**
 * Plafond de lignes d'un bilan. Borne TECHNIQUE (taille d'une requête, d'une
 * transaction), sans aucune sémantique clinique : le catalogue compte une
 * cinquantaine d'analytes, un bilan réel en porte bien moins.
 */
const BILAN_MAX_LIGNES = 100;

/** Les refus qui tiennent à la FORME de la ligne — leur présence rend un 400. */
const REFUS_DE_FORME = new Set([
  'valeur_invalide',
  'valeur_hors_capacite',
  'analyte_absent',
  'analyte_en_double',
  'correction_hors_bilan',
]);

export type RefusLigneBilan = { index: number; reason: string; error: string };

export type BilanPostResponse =
  | { ok: true; nombre: number }
  | { ok: false; reason: string; error: string; lignes?: RefusLigneBilan[] };

function echec(reason: string, error: string, status: number, lignes?: RefusLigneBilan[]) {
  return NextResponse.json<BilanPostResponse>(
    lignes ? { ok: false, reason, error, lignes } : { ok: false, reason, error },
    { status },
  );
}

type LigneBrute = { analyteCode?: unknown; valeur?: unknown; supersedesResultatId?: unknown };

type BilanBody = { idPatient?: unknown; preleveLe?: unknown; lignes?: unknown };

export async function POST(req: Request) {
  try {
    let body: BilanBody;
    try {
      body = (await req.json()) as BilanBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    // `null`, `42`, `[]` sont du JSON valide : garde AVANT tout accès aux
    // champs, sinon un client anonyme fabrique des 500 pré-auth.
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    const garde = await garderResultats(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.error, garde.status);

    if (!Array.isArray(body.lignes)) {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }
    if (body.lignes.length === 0) {
      return echec('bilan_vide', MESSAGES_REFUS_SAISIE.bilan_vide, 400);
    }
    if (body.lignes.length > BILAN_MAX_LIGNES) {
      return echec('bilan_trop_long', MESSAGES_REFUS_SAISIE.bilan_trop_long, 400);
    }

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echec(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    // LA DATE EST COMMUNE : elle se juge une fois, et son refus est celui du
    // bilan entier — le répéter sur chaque ligne dirait dix fois la même faute.
    const maintenant = new Date();
    const date = validerDatePrelevement(body.preleveLe, maintenant);
    if (!date.ok) {
      return echec(date.raison, MESSAGES_REFUS_SAISIE[date.raison], 400);
    }
    const preleveLe = date.preleveLe;

    // PRÉFLIGHT, ÉTAGE 1 — la forme de chaque ligne, sans aucune lecture.
    const refus: RefusLigneBilan[] = [];
    const refuser = (index: number, reason: string) => {
      refus.push({ index, reason, error: MESSAGES_REFUS_SAISIE[reason] });
    };
    const lignes: Array<{ index: number; analyteCode: string; valeur: number }> = [];
    const indexParCode = new Map<string, number>();

    (body.lignes as unknown[]).forEach((brute, index) => {
      const ligne: LigneBrute =
        brute !== null && typeof brute === 'object' && !Array.isArray(brute) ? (brute as LigneBrute) : {};
      if (ligne.supersedesResultatId !== undefined && ligne.supersedesResultatId !== null) {
        refuser(index, 'correction_hors_bilan');
        return;
      }
      const analyteCode = typeof ligne.analyteCode === 'string' ? ligne.analyteCode.trim() : '';
      if (analyteCode === '') {
        refuser(index, 'analyte_absent');
        return;
      }
      const verdict = validerSaisieResultat({ valeur: ligne.valeur, preleveLe: body.preleveLe }, maintenant);
      if (!verdict.ok) {
        refuser(index, verdict.raison);
        return;
      }
      // Deux lignes du même analyte au même horodatage : la seconde
      // heurterait l'unicité DANS la transaction. Le préflight le dit avant.
      if (indexParCode.has(analyteCode)) {
        refuser(index, 'analyte_en_double');
        return;
      }
      indexParCode.set(analyteCode, index);
      lignes.push({ index, analyteCode, valeur: verdict.valeur });
    });

    // PRÉFLIGHT, ÉTAGE 2 — le catalogue et le dossier, en DEUX lectures pour
    // tout le bilan, jamais une par ligne.
    const codes = lignes.map(l => l.analyteCode);
    const analytes = codes.length === 0 ? [] : await prisma.biologyAnalyte.findMany({
      where: { code: { in: codes } },
      select: { code: true, unite: true, actif: true },
    });
    const analyteParCode = new Map(analytes.map(a => [a.code, a]));

    // Doublon = même clé que l'unicité partielle en base (patient, analyte,
    // horodatage, `WHERE supersedes_resultat_id IS NULL`). Le P2002 de la
    // transaction reste le filet d'une course entre deux saisies.
    const existants = codes.length === 0 ? [] : await prisma.resultatBiologique.findMany({
      where: { idPatient, preleveLe, analyteCode: { in: codes }, supersedesResultatId: null },
      select: { analyteCode: true },
    });
    const codesExistants = new Set(existants.map(e => e.analyteCode));

    const aEcrire: Array<{ analyteCode: string; valeur: number; unite: string | null }> = [];
    for (const ligne of lignes) {
      const analyte = analyteParCode.get(ligne.analyteCode);
      if (!analyte) {
        refuser(ligne.index, 'analyte_inconnu');
      } else if (!analyte.actif) {
        refuser(ligne.index, 'analyte_inactif');
      } else if (codesExistants.has(ligne.analyteCode)) {
        refuser(ligne.index, 'doublon_mesure');
      } else {
        // L'unité de l'ANALYTE, relue à l'instant de la saisie — jamais celle du client.
        aEcrire.push({ analyteCode: analyte.code, valeur: ligne.valeur, unite: analyte.unite });
      }
    }

    if (refus.length > 0) {
      refus.sort((a, b) => a.index - b.index);
      const status = refus.some(r => REFUS_DE_FORME.has(r.reason)) ? 400 : 409;
      return echec('lignes_invalides', MESSAGES_REFUS_SAISIE.lignes_invalides, status, refus);
    }

    try {
      // Forme TABLEAU : toutes les créations ou aucune.
      await prisma.$transaction(
        aEcrire.map(l =>
          prisma.resultatBiologique.create({
            data: {
              idPatient,
              analyteCode: l.analyteCode,
              valeur: l.valeur,
              unite: l.unite,
              preleveLe,
              source: 'saisie_praticien',
              saisiPar: garde.email,
              supersedesResultatId: null,
            },
            select: { id: true },
          }),
        ),
      );
      return NextResponse.json<BilanPostResponse>({ ok: true, nombre: aEcrire.length }, { status: 201 });
    } catch (err) {
      // Une saisie concurrente a pris la clé entre le préflight et l'écriture :
      // la transaction entière est annulée, rien du bilan n'est écrit.
      if ((err as { code?: string } | null)?.code === 'P2002') {
        return echec('doublon_mesure', MESSAGES_REFUS_SAISIE.doublon_mesure, 409);
      }
      console.error('[praticien/biologie/resultats/bilan POST] consignation refusée :', signature(err));
      return echec('server_error', 'Erreur technique.', 500);
    }
  } catch (err) {
    // JAMAIS `err.message` : un `PrismaClientValidationError` rend ses
    // arguments — valeurs mesurées comprises — et partirait dans les logs.
    console.error('[praticien/biologie/resultats/bilan POST] refus :', signature(err));
    return echec('server_error', 'Erreur technique.', 500);
  }
}
