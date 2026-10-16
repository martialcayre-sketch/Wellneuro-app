import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPractitionerCbAccess } from '@/lib/biology-library/access';
import {
  CODE_ANALYTE_RE,
  deciderConstat,
  type DeciderConstatResultat,
  type RaisonRefusConstat,
} from '@/lib/biology-library/correspondancesNabm';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { signature } from '@/lib/biology-library/saisieMessages';

// Constat signé « aucun acte dans la nomenclature » (M-3c, F54) — PRATICIEN
// SEUL, derrière WN_CB_ENABLED, même garde que la route des correspondances.
// Signataire = e-mail de session, date posée par la base ; le constat se pose
// sur le millésime VU à l'écran et se retire sur la date VUE — un état qui a
// bougé entre-temps n'écrit rien. Chaque geste écrit sa ligne de journal dans
// la même transaction (`correspondancesNabm.ts`).
//
// Le référentiel est global au cabinet : aucune donnée patient derrière cette
// garde (étage 1 documentaire, verrou HDS).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type DecisionConstatNabmApiResponse =
  | { ok: true; constat: Extract<DeciderConstatResultat, { ok: true }>['constat'] }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<RaisonRefusConstat, { message: string; status: number }> = {
  constat_non_permis: {
    message: 'Ce constat ne se pose que pour un analyte qu’aucun acte de la nomenclature ne nomme.',
    status: 409,
  },
  analyte_inconnu: { message: 'Cet analyte n’existe pas au catalogue.', status: 404 },
  analyte_inactif: { message: 'Cet analyte est inactif au catalogue : rien à constater.', status: 409 },
  millesime_absent: {
    message: 'La nomenclature n’est pas importée : aucun constat ne peut être posé.',
    status: 409,
  },
  import_en_cours: {
    message: 'Un import de la nomenclature est en cours : rien n’a été enregistré, réessayez dans quelques minutes.',
    status: 409,
  },
  signature_presente: {
    message: 'Cet analyte porte une correspondance signée : retirez-la d’abord.',
    status: 409,
  },
  etat_divergent: {
    message: 'Le constat ou la nomenclature ont changé depuis l’affichage — rechargez la fiche.',
    status: 409,
  },
};

function echec(reason: string, error: string, status: number) {
  return NextResponse.json<DecisionConstatNabmApiResponse>({ ok: false, reason, error }, { status });
}

type PostBody = {
  analyteCode?: unknown;
  decision?: unknown;
  millesimeVu?: unknown;
  verifieLeVu?: unknown;
};

const texte = (valeur: unknown) => (typeof valeur === 'string' ? valeur.trim() : '');

// POST /api/praticien/biologie/nabm/constats
//   { analyteCode, decision: 'constater', millesimeVu }
//   { analyteCode, decision: 'retirer', verifieLeVu }
export async function POST(req: Request): Promise<NextResponse<DecisionConstatNabmApiResponse>> {
  try {
    const session = await getServerSession(authOptions);
    const access = getPractitionerCbAccess(session);
    if (!access.ok) return echec(access.reason, access.error, access.status);

    // Le constat exige une identité : la garde l'a déjà vérifiée, on la lit
    // ici pour l'écrire — jamais un signataire reçu du client.
    const praticien = emailPraticien(access.session);
    if (!praticien) return echec('unauthenticated', 'Session praticien sans e-mail.', 401);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec('invalid', 'Corps de requête illisible.', 400);
    }

    const analyteCode = texte(body.analyteCode);
    const decision = texte(body.decision);
    if (!CODE_ANALYTE_RE.test(analyteCode)) {
      return echec('analyte_invalide', 'Code d’analyte invalide.', 400);
    }
    if (decision !== 'constater' && decision !== 'retirer') {
      return echec('decision_invalide', 'Décision inconnue.', 400);
    }

    let millesimeVu: string | undefined;
    let verifieLeVu: Date | undefined;
    if (decision === 'constater') {
      millesimeVu = texte(body.millesimeVu);
      if (!millesimeVu) {
        return echec('millesime_vu_invalide', 'Le millésime affiché manque — rechargez la fiche.', 400);
      }
    } else {
      verifieLeVu = new Date(texte(body.verifieLeVu));
      if (Number.isNaN(verifieLeVu.getTime())) {
        return echec('constat_vu_invalide', 'Le constat à retirer est mal désigné — rechargez la fiche.', 400);
      }
    }

    const resultat = await deciderConstat({ analyteCode, decision, millesimeVu, verifieLeVu, praticien });
    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec(resultat.raison, refus.message, refus.status);
    }
    return NextResponse.json({ ok: true, constat: resultat.constat });
  } catch (err) {
    console.error('[praticien/biologie/nabm/constats POST]', signature(err));
    return echec('exception', 'Erreur technique.', 500);
  }
}
