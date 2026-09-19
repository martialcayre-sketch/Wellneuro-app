import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { emailPraticien, verifierAppartenancePatient } from '@/lib/praticien/appartenance';
import {
  assiettesIndiqueesActives,
  evaluerAssiettesPourPatient,
  resultatAssiettesInactif,
  type AssietteIndiquee,
  type AssietteNonEvaluee,
} from '@/lib/clinical/indicationsAssiettesService';

// ASSIETTES INDIQUÉES POUR UN DOSSIER — LECTURE SEULE ([[D-237]]).
//
// Enveloppeur HTTP et rien d'autre : session, validation d'entrée,
// appartenance, traduction du résultat. L'évaluation vit dans
// `lib/clinical/indicationsAssiettesService.ts`, où le verrou fail-closed
// n'existe qu'à un seul endroit — et parce qu'un `route.ts` Next ne peut pas
// exporter de valeur.
//
// AUCUNE ÉCRITURE AU DOSSIER CLINIQUE, ET AUCUN GESTE PROPOSÉ. Pas de POST :
// rien ne s'assigne, rien ne s'attache à un protocole, rien ne part vers un
// patient. Ce que le praticien fait de l'assiette indiquée reste sa décision,
// hors de ce chemin.
//
// UNE ÉCRITURE EXISTE POURTANT, ET LA TAIRE SERAIT LE DÉFAUT — constat de revue.
// `verifierAppartenancePatient` ÉCRIT : une ligne au journal d'accès, plus une
// purge opportuniste au-delà de la rétention. C'est le journal G-TRUST-04,
// voulu, et identique à celui de toute lecture praticien. Mais « lecture seule »
// désigne le DOSSIER CLINIQUE, jamais la trace d'audit — et c'est exactement
// pourquoi le verrou est consulté AVANT l'appartenance : verrou fermé, aucune
// ligne n'est écrite pour une lecture qui n'a pas eu lieu.

const ROUTE_JOURNAL = '/api/praticien/assiettes-indiquees';

export type AssiettesIndiqueesApiResponse =
  | {
      ok: true;
      actif: false;
      message: string;
    }
  | {
      ok: true;
      actif: true;
      /** Le `shaPerimetre` littéral de la table servie. */
      shaPerimetre: string;
      indiquees: AssietteIndiquee[];
      /**
       * VIDE, JAMAIS ABSENT — même discipline que `ecartees` côté orientation.
       * Un tableau absent se lirait « on ne sait pas ce qui manque », là où la
       * réponse dit « rien ne manque ». L'écran doit pouvoir afficher le repli
       * sans distinguer les deux (`DC-24`).
       */
      nonEvaluees: AssietteNonEvaluee[];
      nonIndiquees: number;
      /**
       * Lignes PUBLIÉES que le filtre de claims a retirées du service — `0`
       * quand le corpus est illisible, sa raison étant portée par `corpusLu`.
       * Sans ce terme, une table qui rétrécit se lisait comme un dossier qui ne
       * déclenche rien (`DC-24`) — constat de revue.
       */
      retireesFauteDeClaim: number;
      corpusLu: boolean;
    }
  | {
      ok: false;
      reason: 'unauthenticated' | 'invalid' | 'patient_not_found' | 'forbidden' | 'exception';
      error: string;
    };

// GET /api/praticien/assiettes-indiquees?idPatient=PAT001
export async function GET(req: Request): Promise<NextResponse<AssiettesIndiqueesApiResponse>> {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json(
      { ok: false, reason: 'unauthenticated', error: 'Authentification requise.' },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(req.url);
  const idPatient = (searchParams.get('idPatient') ?? '').trim();
  if (!idPatient || !/^[A-Za-z0-9_-]+$/.test(idPatient) || idPatient.length > 64) {
    return NextResponse.json(
      { ok: false, reason: 'invalid', error: 'Identifiant patient invalide.' },
      { status: 400 },
    );
  }

  try {
    // VERROU AVANT L'APPARTENANCE, et ce n'est pas un ordre d'écriture :
    // `verifierAppartenancePatient` JOURNALISE l'accès au dossier. Tant que le
    // drapeau n'est pas posé ou la table pas signée, la route n'ouvre rien — et
    // ne consigne donc pas un accès qui n'a pas eu lieu.
    if (!assiettesIndiqueesActives()) {
      return NextResponse.json({ ok: true, actif: false, message: resultatAssiettesInactif().message });
    }

    const appartenance = await verifierAppartenancePatient(idPatient, emailPraticien(session), {
      route: ROUTE_JOURNAL,
      methode: 'GET',
    });
    if (appartenance === 'introuvable') {
      return NextResponse.json(
        { ok: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    if (appartenance === 'autre_praticien') {
      return NextResponse.json(
        { ok: false, reason: 'forbidden', error: 'Patient non accessible pour ce praticien.' },
        { status: 403 },
      );
    }

    const resultat = await evaluerAssiettesPourPatient(idPatient);
    if (!resultat.actif) {
      return NextResponse.json({ ok: true, actif: false, message: resultat.message });
    }

    return NextResponse.json({
      ok: true,
      actif: true,
      shaPerimetre: resultat.shaPerimetre,
      indiquees: [...resultat.indiquees],
      nonEvaluees: [...resultat.nonEvaluees],
      nonIndiquees: resultat.nonIndiquees,
      retireesFauteDeClaim: resultat.retireesFauteDeClaim,
      corpusLu: resultat.corpusLu,
    });
  } catch (err) {
    // Trace serveur seulement : le corps de réponse ne porte aucun détail
    // technique, et surtout rien du dossier.
    console.error('[praticien/assiettes-indiquees GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: "Impossible d'évaluer les indications d'assiette pour ce patient." },
      { status: 500 },
    );
  }
}
