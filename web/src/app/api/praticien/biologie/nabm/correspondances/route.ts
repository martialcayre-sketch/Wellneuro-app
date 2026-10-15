import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPractitionerCbAccess } from '@/lib/biology-library/access';
import {
  CODE_ACTE_RE,
  CODE_ANALYTE_RE,
  deciderCorrespondance,
  estEtatCorrespondance,
  lireCorrespondancesAnalyte,
  type CandidatsNabmAffiches,
  type CorrespondanceAffichee,
  type DeciderCorrespondanceResultat,
  type RaisonRefusCorrespondance,
} from '@/lib/biology-library/correspondancesNabm';
import { emailPraticien } from '@/lib/praticien/appartenance';
import { signature } from '@/lib/biology-library/saisieMessages';

// Correspondances analyte ↔ acte NABM (M-3, F54) — PRATICIEN SEUL, derrière
// WN_CB_ENABLED. C'est LA route qui pose la signature des correspondances,
// patron de /api/praticien/corpus/claims/decision : signataire = e-mail de
// session, date posée par le serveur, décision prise sur l'état vu à l'écran
// (`etatAttendu`) — un état qui a bougé entre-temps n'écrit rien.
//
// Le référentiel est global au cabinet : aucune donnée patient derrière cette
// garde (étage 1 documentaire, verrou HDS).

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export type CorrespondancesNabmApiResponse =
  | {
      ok: true;
      millesime: string | null;
      correspondances: CorrespondanceAffichee[];
      candidats: CandidatsNabmAffiches | null;
    }
  | { ok: false; reason: string; error: string };

export type DecisionCorrespondanceNabmApiResponse =
  | { ok: true; correspondance: Extract<DeciderCorrespondanceResultat, { ok: true }>['correspondance'] }
  | { ok: false; reason: string; error: string };

const MESSAGES_REFUS: Record<RaisonRefusCorrespondance, { message: string; status: number }> = {
  transition_invalide: { message: 'Ce geste n’est pas permis sur cette correspondance.', status: 409 },
  nature_requise: {
    message: 'Choisissez la nature de la correspondance : acte isolé, groupe imposé ou groupe au choix.',
    status: 422,
  },
  analyte_inconnu: { message: 'Cet analyte n’existe pas au catalogue.', status: 404 },
  analyte_inactif: { message: 'Cet analyte est inactif au catalogue : rien à signer.', status: 409 },
  millesime_absent: {
    message: 'La nomenclature n’est pas importée : aucune correspondance ne peut être signée.',
    status: 409,
  },
  acte_introuvable: {
    message: 'Ce code d’acte n’existe pas dans le millésime courant de la nomenclature.',
    status: 404,
  },
  acte_inactif: {
    message: 'Cet acte est inactif dans le millésime courant : la correspondance ne rembourserait rien.',
    status: 409,
  },
  etat_divergent: {
    message: 'La correspondance a changé depuis l’affichage — rechargez la fiche.',
    status: 409,
  },
};

function echec<T>(reason: string, error: string, status: number) {
  return NextResponse.json<T>({ ok: false, reason, error } as T, { status });
}

// GET /api/praticien/biologie/nabm/correspondances?analyte=BIO_FERRITINE
export async function GET(req: Request): Promise<NextResponse<CorrespondancesNabmApiResponse>> {
  try {
    const access = getPractitionerCbAccess(await getServerSession(authOptions));
    if (!access.ok) {
      return echec<CorrespondancesNabmApiResponse>(access.reason, access.error, access.status);
    }

    const analyte = (new URL(req.url).searchParams.get('analyte') ?? '').trim();
    if (!CODE_ANALYTE_RE.test(analyte)) {
      return echec<CorrespondancesNabmApiResponse>('analyte_invalide', 'Code d’analyte invalide.', 400);
    }

    const resultat = await lireCorrespondancesAnalyte(analyte);
    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec<CorrespondancesNabmApiResponse>(resultat.raison, refus.message, refus.status);
    }
    return NextResponse.json({
      ok: true,
      millesime: resultat.millesime,
      correspondances: resultat.correspondances,
      candidats: resultat.candidats,
    });
  } catch (err) {
    console.error('[praticien/biologie/nabm/correspondances GET]', signature(err));
    return echec<CorrespondancesNabmApiResponse>('exception', 'Erreur technique.', 500);
  }
}

type PostBody = {
  analyteCode?: unknown;
  codeActe?: unknown;
  decision?: unknown;
  etatAttendu?: unknown;
  nature?: unknown;
  verifieLeVu?: unknown;
};

const texte = (valeur: unknown) => (typeof valeur === 'string' ? valeur.trim() : '');

// POST /api/praticien/biologie/nabm/correspondances
//   { analyteCode, codeActe, decision: 'signer' | 'retirer', etatAttendu, nature?, verifieLeVu? }
// `verifieLeVu` (date ISO de la signature affichée) est exigé pour un retrait.
export async function POST(req: Request): Promise<NextResponse<DecisionCorrespondanceNabmApiResponse>> {
  type R = DecisionCorrespondanceNabmApiResponse;
  try {
    const session = await getServerSession(authOptions);
    const access = getPractitionerCbAccess(session);
    if (!access.ok) return echec<R>(access.reason, access.error, access.status);

    // La signature exige une identité : la garde l'a déjà vérifiée, on la lit
    // ici pour l'écrire — jamais un signataire reçu du client.
    const praticien = emailPraticien(access.session);
    if (!praticien) return echec<R>('unauthenticated', 'Session praticien sans e-mail.', 401);

    let body: PostBody;
    try {
      body = (await req.json()) as PostBody;
    } catch {
      return echec<R>('invalid', 'Corps de requête illisible.', 400);
    }

    const analyteCode = texte(body.analyteCode);
    const codeActe = texte(body.codeActe);
    const decision = texte(body.decision);
    const etatAttendu = texte(body.etatAttendu);
    const nature = texte(body.nature);

    if (!CODE_ANALYTE_RE.test(analyteCode)) {
      return echec<R>('analyte_invalide', 'Code d’analyte invalide.', 400);
    }
    if (!CODE_ACTE_RE.test(codeActe)) {
      return echec<R>('code_invalide', 'Un code d’acte compte quatre chiffres.', 400);
    }
    if ((decision !== 'signer' && decision !== 'retirer') || !estEtatCorrespondance(etatAttendu)) {
      return echec<R>('decision_invalide', 'Décision ou état attendu inconnu.', 400);
    }

    let verifieLeVu: Date | undefined;
    if (decision === 'retirer') {
      verifieLeVu = new Date(texte(body.verifieLeVu));
      if (Number.isNaN(verifieLeVu.getTime())) {
        return echec<R>('signature_vue_invalide', 'La signature à retirer est mal désignée — rechargez la fiche.', 400);
      }
    }

    const resultat = await deciderCorrespondance({
      analyteCode,
      codeActe,
      decision,
      etatAttendu,
      nature: nature || undefined,
      verifieLeVu,
      praticien,
    });
    if (!resultat.ok) {
      const refus = MESSAGES_REFUS[resultat.raison];
      return echec<R>(resultat.raison, refus.message, refus.status);
    }
    return NextResponse.json({ ok: true, correspondance: resultat.correspondance });
  } catch (err) {
    console.error('[praticien/biologie/nabm/correspondances POST]', signature(err));
    return echec<R>('exception', 'Erreur technique.', 500);
  }
}
