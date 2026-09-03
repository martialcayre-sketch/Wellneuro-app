import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  accepteNouvelEnvoi,
  MESSAGE_DOSSIER_CLOS,
  RAISON_DOSSIER_CLOS,
} from '@/lib/patient/cycleDeVie';
import { garderResultats, type VerdictGardeResultats } from '@/lib/biology-library/gardeResultats';
import { validerSaisieResultat } from '@/lib/biology-library/resultats';

// Résultats biologiques réels du dossier (étage 2, CB-09, [[D-122]] §2) —
// derrière `isCbResultsEnabled` (posé AVEC ce code, geste daté `D-081`).
//
// L'UNITÉ N'EST JAMAIS FOURNIE PAR LE CLIENT : elle est relue sur l'analyte
// au catalogue au moment de la saisie et consignée avec la mesure — la
// concordance unité résultat ↔ unité analyte (frontière tracée à la PR #838)
// tient PAR CONSTRUCTION, et le vocabulaire partagé (CHECK migration) n'a
// rien à re-juger. Un analyte sans unité au catalogue donne un résultat sans
// unité : on n'en invente pas.
//
// `source` est posée SERVEUR : cette surface est la saisie praticien —
// `import_labo`, l'autre origine de la décision, attend son propre chemin.
//
// PAS DE ROUTE DE CORRECTION EN V1 : l'unicité (patient, analyte, horodatage)
// refuse le doublon exact, et corriger une valeur saisie de travers est un
// geste qui mérite son propre arbitrage (trace de l'erreur comprise, esprit
// DC-30) — il n'existe pas encore, et c'est dit ici plutôt qu'improvisé.

const ROUTE_JOURNAL = '/api/praticien/biologie/resultats';

export type ResultatConsigne = {
  id: string;
  analyteCode: string;
  analyteLibelle: string;
  valeur: number;
  unite: string | null;
  preleveLe: string;
  source: string;
};

export type ResultatsGetResponse =
  | { ok: true; resultats: ResultatConsigne[] }
  | { ok: false; reason: string; error: string };

export type ResultatsPostResponse =
  | { ok: true; resultat: ResultatConsigne }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS_SAISIE: Record<string, string> = {
  valeur_invalide: 'La valeur mesurée doit être un nombre.',
  valeur_hors_capacite:
    'La valeur dépasse la capacité de stockage (35 chiffres) : vérifiez la saisie.',
  date_invalide: 'La date de prélèvement est illisible.',
  date_future: 'La date de prélèvement est dans le futur : un prélèvement n’anticipe pas.',
  analyte_inconnu: 'Cet analyte n’existe pas au catalogue.',
  analyte_inactif: 'Cet analyte est inactif au catalogue : pas de nouvelle mesure.',
  doublon_mesure:
    'Une mesure de cet analyte existe déjà pour ce patient à cet horodatage exact. '
    + 'Deux prélèvements du même jour se distinguent par l’heure.',
};

function echecGet(reason: string, error: string, status: number) {
  return NextResponse.json<ResultatsGetResponse>({ ok: false, reason, error }, { status });
}

function echecPost(reason: string, error: string, status: number) {
  return NextResponse.json<ResultatsPostResponse>({ ok: false, reason, error }, { status });
}

function depuisVerdictGet(verdict: Exclude<VerdictGardeResultats, { ok: true }>) {
  return echecGet(verdict.reason, verdict.error, verdict.status);
}

function depuisVerdictPost(verdict: Exclude<VerdictGardeResultats, { ok: true }>) {
  return echecPost(verdict.reason, verdict.error, verdict.status);
}

function versConsigne(ligne: {
  id: string;
  analyteCode: string;
  /** `Decimal` du client Prisma — `Number()` le lit ; typé par sa capacité. */
  valeur: number | { toString(): string };
  unite: string | null;
  preleveLe: Date;
  source: string;
  analyte: { libelle: string };
}): ResultatConsigne {
  return {
    id: ligne.id,
    analyteCode: ligne.analyteCode,
    analyteLibelle: ligne.analyte.libelle,
    valeur: Number(ligne.valeur),
    unite: ligne.unite,
    preleveLe: ligne.preleveLe.toISOString(),
    source: ligne.source,
  };
}

export async function GET(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    // Lecture de données de santé nommées : l'accès se journalise (GD-1).
    const garde = await garderResultats(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return depuisVerdictGet(garde);

    const lignes = await prisma.resultatBiologique.findMany({
      where: { idPatient },
      orderBy: [{ analyteCode: 'asc' }, { preleveLe: 'asc' }],
      select: {
        id: true,
        analyteCode: true,
        valeur: true,
        unite: true,
        preleveLe: true,
        source: true,
        analyte: { select: { libelle: true } },
      },
    });

    return NextResponse.json<ResultatsGetResponse>({
      ok: true,
      resultats: lignes.map(versConsigne),
    });
  } catch (err) {
    console.error('[praticien/biologie/resultats GET]', err instanceof Error ? err.message : String(err));
    return echecGet('server_error', 'Erreur technique.', 500);
  }
}

type PostBody = { idPatient?: unknown; analyteCode?: unknown; valeur?: unknown; preleveLe?: unknown };

export async function POST(req: Request) {
  try {
    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echecPost('invalid', 'Corps de requête illisible.', 400);
    }
    // `null`, `42`, `[]` sont du JSON valide : garde AVANT tout accès aux
    // champs, sinon un client anonyme fabrique des 500 pré-auth.
    if (body === null || typeof body !== 'object' || Array.isArray(body)) {
      return echecPost('invalid', 'Corps de requête illisible.', 400);
    }

    const idPatient = typeof body.idPatient === 'string' ? body.idPatient.trim() : '';
    // PAS d'`acces` ici : ce POST ne LIT rien du dossier (contrairement aux
    // POST courrier/document patient, qui dérivent la proposition entière) —
    // journaliser une lecture qui n'a pas eu lieu fausserait la piste d'audit
    // GD-1 (même motif que l'ordre des gardes dans `gardeProposition`).
    // L'écriture, elle, est tracée par la ligne consignée (saisi_par, saisi_le).
    const garde = await garderResultats(idPatient);
    if (!garde.ok) return depuisVerdictPost(garde);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) {
      return echecPost(RAISON_DOSSIER_CLOS, MESSAGE_DOSSIER_CLOS, 409);
    }

    const analyteCode = typeof body.analyteCode === 'string' ? body.analyteCode.trim() : '';
    const analyte = analyteCode
      ? await prisma.biologyAnalyte.findUnique({
          where: { code: analyteCode },
          select: { code: true, libelle: true, unite: true, actif: true },
        })
      : null;
    if (!analyte) {
      return echecPost('analyte_inconnu', MESSAGES_REFUS_SAISIE.analyte_inconnu, 409);
    }
    if (!analyte.actif) {
      return echecPost('analyte_inactif', MESSAGES_REFUS_SAISIE.analyte_inactif, 409);
    }

    const verdict = validerSaisieResultat(
      { valeur: body.valeur, preleveLe: body.preleveLe },
      new Date(),
    );
    if (!verdict.ok) {
      // Refus de FORME : la faute est au corps de requête, 400.
      return echecPost(verdict.raison, MESSAGES_REFUS_SAISIE[verdict.raison], 400);
    }

    try {
      const ligne = await prisma.resultatBiologique.create({
        data: {
          idPatient,
          analyteCode: analyte.code,
          // La valeur transite en `number` JSON (flottant IEEE 754) : pour
          // une saisie manuelle à quelques chiffres significatifs, la
          // précision est exacte ; l'exactitude décimale de bout en bout
          // (chaîne → numeric) viendra avec l'import laboratoire si sa
          // source l'exige.
          valeur: verdict.valeur,
          // L'unité de l'ANALYTE, relue à l'instant de la saisie — jamais
          // celle du client.
          unite: analyte.unite,
          preleveLe: verdict.preleveLe,
          source: 'saisie_praticien',
          saisiPar: garde.email,
        },
        select: {
          id: true,
          analyteCode: true,
          valeur: true,
          unite: true,
          preleveLe: true,
          source: true,
          analyte: { select: { libelle: true } },
        },
      });
      return NextResponse.json<ResultatsPostResponse>(
        { ok: true, resultat: versConsigne(ligne) },
        { status: 201 },
      );
    } catch (err) {
      // Duck-typing P2002 (convention du dépôt, cf. api/portail/trust/lecture) :
      // la contrainte unique (patient, analyte, horodatage) a mordu.
      if ((err as { code?: string }).code === 'P2002') {
        return echecPost('doublon_mesure', MESSAGES_REFUS_SAISIE.doublon_mesure, 409);
      }
      // JAMAIS `err.message` : un PrismaClientValidationError rend ses
      // arguments — valeur mesurée comprise — et partirait dans les logs.
      console.error(
        '[praticien/biologie/resultats POST] consignation refusée :',
        err instanceof Error ? err.name : 'inconnue',
      );
      return echecPost('server_error', 'Erreur technique.', 500);
    }
  } catch (err) {
    console.error('[praticien/biologie/resultats POST]', err instanceof Error ? err.message : String(err));
    return echecPost('server_error', 'Erreur technique.', 500);
  }
}
