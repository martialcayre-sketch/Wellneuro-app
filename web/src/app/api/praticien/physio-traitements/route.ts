import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dateJourParis } from '@/lib/dateParis';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { statutAge } from '@/lib/patient/gardeAge';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { estConflitConcurrent, estRefusDeLaBase } from '@/lib/bio-parcours/constats/erreurs';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { declarationsAnamnese, estDiscordant, type DeclarationAnamnese } from '@/lib/physio-traitements/anamnese';
import { lireDemandePhysio, lireDemandeTraitement } from '@/lib/physio-traitements/demande';
import { ecrirePhysio, ecrireTraitement, RefusLigne } from '@/lib/physio-traitements/ecriture';
import { garderPhysioTraitements } from '@/lib/physio-traitements/garde';
import { lireDonneesDuDossier, type CritereLu, type FilTraitementLu } from '@/lib/physio-traitements/lecture';
import { MESSAGES_REFUS_PRATICIEN } from '@/lib/physio-traitements/messages';

// LES DONNÉES PHYSIOLOGIQUES ET LES TRAITEMENTS EN COURS, AU COCKPIT
// ([[D-335]], BP-13).
//
// GET : par critère, la ligne en vigueur, son historique et, pour grossesse,
// allaitement, taille et poids, ce que l'anamnèse déclare (« déclaré à
// l'anamnèse du … ») avec la discordance s'il y en a une — montrée, jamais
// résolue (DC-30) ; par traitement, son fil. Lecture de données de santé
// nommées : l'accès se journalise (GD-1).
//
// POST : poser une ligne (première, confirmation, correction, arrêt d'un
// traitement) ou retirer la tête. La base fait foi (`ecriture.ts`) ; la route
// dit le refus avant, nommé. Les refus que la base rend malgré tout — une
// course perdue — sont reconnus à leur CODE, jamais à leur message.
//
// DRAPEAU `WN_PHYSIO_TRAITEMENTS`, éteint, fail-closed ([[D-081]]) : il passe
// avant la session. Un dossier mineur est refusé à l'écriture ([[D-335]] §6),
// un dossier clos aussi, comme les autres gestes du dossier.
//
// PAS de journal d'accès à l'écriture : dispense `GD-1` ([[D-118]]), comme les
// gestes de biologie — la ligne porte son auteur et sa date.

const ROUTE_JOURNAL = '/api/praticien/physio-traitements';

export type CritereAuCockpit = CritereLu & {
  /** Ce que l'anamnèse déclare, pour les critères qui y ont une question. */
  anamnese: DeclarationAnamnese | null;
  discordant: boolean;
};

export type PhysioTraitementsGetResponse =
  | {
      ok: true;
      criteres: CritereAuCockpit[];
      traitements: FilTraitementLu[];
      /** La date de validation de l'anamnèse lue (ISO), ou `null` s'il n'y en a pas. */
      anamneseDu: string | null;
      /** Un dossier mineur ne reçoit aucune ligne ([[D-335]] §6). */
      mineur: boolean;
      aujourdhui: string;
    }
  | { ok: false; reason: string; error: string };

export type PhysioTraitementsPostResponse = { ok: true; id: string } | { ok: false; reason: string; error: string };

function echec(reason: string, status: number, error = MESSAGES_REFUS_PRATICIEN[reason] ?? 'Erreur technique.') {
  return NextResponse.json({ ok: false as const, reason, error }, { status });
}

export async function GET(req: Request) {
  try {
    const idPatient = new URL(req.url).searchParams.get('idPatient')?.trim() ?? '';
    const garde = await garderPhysioTraitements(idPatient, { route: ROUTE_JOURNAL, methode: 'GET' });
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);

    const [donnees, consultation, patient] = await Promise.all([
      lireDonneesDuDossier(prisma, idPatient),
      prisma.consultation.findFirst({
        where: whereConsultationPorteuse(idPatient),
        orderBy: ORDRE_CONSULTATION_PORTEUSE,
        select: { anamnese: true, dateValidation: true },
      }),
      prisma.patient.findUnique({ where: { idPatient }, select: { dateNaissance: true } }),
    ]);
    const declarations = consultation ? declarationsAnamnese(consultation.anamnese) : {};
    const criteres = donnees.criteres.map(c => {
      const anamnese = declarations[c.critere] ?? null;
      return {
        ...c,
        anamnese,
        discordant: estDiscordant(c.critere, c.tete?.reponse ?? null, anamnese?.valeur ?? null),
      };
    });
    return NextResponse.json<PhysioTraitementsGetResponse>({
      ok: true,
      criteres,
      traitements: donnees.traitements,
      anamneseDu: consultation?.dateValidation ? consultation.dateValidation.toISOString() : null,
      mineur: statutAge(patient?.dateNaissance ?? null, Date.now()) === 'mineur',
      aujourdhui: dateJourParis(),
    });
  } catch (err) {
    // JAMAIS `err.message` : il porterait des identifiants du dossier.
    console.error('[praticien/physio-traitements GET] échec :', ...classeEtCode(err));
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
    const garde = await garderPhysioTraitements(idPatient);
    if (!garde.ok) return echec(garde.reason, garde.status, garde.error);
    if (brut === null) return echec('acte_invalide', 400);

    const patient = await prisma.patient.findUnique({
      where: { idPatient },
      select: { actif: true, suiviClotureLe: true, dateNaissance: true },
    });
    if (!patient || !accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS);
    if (statutAge(patient.dateNaissance, Date.now()) === 'mineur') return echec('dossier_mineur', 409);

    const auteur = { source: 'praticien' as const, email: garde.email };
    const aujourdhui = dateJourParis();
    if (brut.objet === 'physio') {
      const lu = lireDemandePhysio(brut, 'praticien', aujourdhui);
      if (!lu.ok) return echec(lu.raison, 400);
      const ecrit = await prisma.$transaction(tx => ecrirePhysio(tx, idPatient, lu.demande, auteur));
      return NextResponse.json<PhysioTraitementsPostResponse>({ ok: true, id: ecrit.id }, { status: 201 });
    }
    if (brut.objet === 'traitement') {
      const lu = lireDemandeTraitement(brut, aujourdhui);
      if (!lu.ok) return echec(lu.raison, 400);
      const ecrit = await prisma.$transaction(tx => ecrireTraitement(tx, idPatient, lu.demande, auteur));
      return NextResponse.json<PhysioTraitementsPostResponse>({ ok: true, id: ecrit.id }, { status: 201 });
    }
    return echec('objet_invalide', 400);
  } catch (err) {
    if (err instanceof RefusLigne) {
      return err.raison === RAISON_DOSSIER_CLOS ? echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS) : echec(err.raison, 409);
    }
    if (estConflitConcurrent(err)) return echec('conflit_concurrent', 409);
    if (estRefusDeLaBase(err)) {
      console.error('[praticien/physio-traitements POST] refus de la base :', ...classeEtCode(err));
      return echec('refus_base', 409);
    }
    console.error('[praticien/physio-traitements POST] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}
