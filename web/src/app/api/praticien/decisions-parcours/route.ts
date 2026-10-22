import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dateJourParis } from '@/lib/dateParis';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { statutAge } from '@/lib/patient/gardeAge';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { estConflitConcurrent, estRefusDeLaBase } from '@/lib/bio-parcours/constats/erreurs';
import { lireDemande } from '@/lib/decisions-parcours/demande';
import { ecrireDecision, RefusDecision } from '@/lib/decisions-parcours/ecriture';
import type { DecisionLue, VersionLue } from '@/lib/decisions-parcours/fils';
import { garderDecisionsParcours } from '@/lib/decisions-parcours/garde';
import { lireDecisionsDuDossier, lireVersionsDuDossier } from '@/lib/decisions-parcours/lecture';
import { MESSAGES_REFUS } from '@/lib/decisions-parcours/messages';

// LES DÉCISIONS DE PARCOURS, AU COCKPIT ([[D-343]], BP-15).
//
// GET : les versions du protocole du dossier (diffusée ou non, et leurs
// actions) et toutes les décisions de parcours du dossier ; le panneau en
// dérive les fils (`decisions-parcours/fils.ts`). Lecture de données de santé
// nommées : l'accès se journalise (GD-1).
//
// POST : poser une décision (choix, événement de mise en œuvre, révision),
// la corriger par remplacement de la tête, ou retirer la tête. La base fait
// foi (`ecriture.ts`) ; la route dit le refus avant, nommé. Les refus que la
// base rend malgré tout — une course perdue — sont reconnus à leur CODE,
// jamais à leur message.
//
// Le praticien du dossier SEUL ; aucune surface patient (§5). DRAPEAU
// `WN_DECISIONS_PARCOURS`, éteint, fail-closed ([[D-081]]) : il passe avant
// la session. Un dossier mineur est refusé à l'écriture (§8), un dossier clos
// aussi, comme les autres gestes du dossier.
//
// PAS de journal d'accès à l'écriture : dispense `GD-1` ([[D-118]]), comme les
// gestes de biologie — la ligne porte son auteur et sa date.
//
// JOURNAL : la classe et le code d'une erreur (`classeEtCode`), JAMAIS
// `err.message`, qui recopierait les arguments de l'appel.

const ROUTE_JOURNAL = '/api/praticien/decisions-parcours';

export type DecisionsParcoursGetResponse =
  | {
      ok: true;
      versions: VersionLue[];
      decisions: DecisionLue[];
      /** Un dossier mineur ne reçoit aucune décision ([[D-343]] §8). */
      mineur: boolean;
      aujourdhui: string;
    }
  | { ok: false; reason: string; error: string };

export type DecisionsParcoursPostResponse = { ok: true; id: string } | { ok: false; reason: string; error: string };

function echec(reason: string, status: number, error = MESSAGES_REFUS[reason] ?? 'Erreur technique.') {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

export async function GET(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderDecisionsParcours(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);

    const [versions, decisions, patient] = await Promise.all([
      lireVersionsDuDossier(prisma, idPatient),
      lireDecisionsDuDossier(prisma, idPatient),
      prisma.patient.findUnique({ where: { idPatient }, select: { dateNaissance: true } }),
    ]);
    return NextResponse.json<DecisionsParcoursGetResponse>({
      ok: true,
      versions,
      decisions,
      mineur: statutAge(patient?.dateNaissance ?? null, Date.now()) === 'mineur',
      aujourdhui: dateJourParis(),
    });
  } catch (err) {
    console.error('[praticien/decisions-parcours GET] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}

export async function POST(req: Request) {
  try {
    let corps: unknown;
    try {
      corps = await req.json();
    } catch {
      corps = null;
    }
    const brut = corps !== null && typeof corps === 'object' && !Array.isArray(corps) ? corps as Record<string, unknown> : null;
    const idPatient = typeof brut?.idPatient === 'string' ? brut.idPatient.trim() : '';
    const garde = await garderDecisionsParcours(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);
    if (brut === null) return echec('acte_invalide', 400);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true, dateNaissance: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS);
    if (statutAge(patient.dateNaissance, Date.now()) === 'mineur') return echec('dossier_mineur', 409);

    const lu = lireDemande(brut, dateJourParis());
    if (!lu.ok) return echec(lu.raison, 400);
    const ecrit = await prisma.$transaction(tx => ecrireDecision(tx, idPatient, lu.demande, garde.email));
    return NextResponse.json<DecisionsParcoursPostResponse>({ ok: true, id: ecrit.id }, { status: 201 });
  } catch (err) {
    if (err instanceof RefusDecision) {
      return echec(err.raison, 409, err.raison === RAISON_DOSSIER_CLOS ? MESSAGE_DOSSIER_CLOS : undefined);
    }
    if (estConflitConcurrent(err)) return echec('conflit_concurrent', 409);
    if (estRefusDeLaBase(err)) {
      console.error('[praticien/decisions-parcours POST] refus de la base :', ...classeEtCode(err));
      return echec('refus_base', 409);
    }
    console.error('[praticien/decisions-parcours POST] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}
