import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { dateJourParis } from '@/lib/dateParis';
import { accepteNouvelEnvoi, MESSAGE_DOSSIER_CLOS, RAISON_DOSSIER_CLOS } from '@/lib/patient/cycleDeVie';
import { refusSaisieSante, statutAge } from '@/lib/patient/gardeAge';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { cadenceAtteinte, MESSAGE_CADENCE_PATIENT } from '@/lib/securite/cadenceEcritures';
import { classeEtCode } from '@/lib/observability/classeEtCode';
import { estConflitConcurrent, estRefusDeLaBase } from '@/lib/bio-parcours/constats/erreurs';
import { isPhysioTraitementsEnabled } from '@/lib/physio-traitements/drapeau';
import { lireDemandePhysio, lireDemandeTraitement } from '@/lib/physio-traitements/demande';
import { ecrirePhysio, ecrireTraitement, RefusLigne } from '@/lib/physio-traitements/ecriture';
import { lireDonneesDuDossier, pourLePatient, type DonneesDuPatient } from '@/lib/physio-traitements/lecture';
import { MESSAGES_REFUS_PATIENT } from '@/lib/physio-traitements/messages';

// LE SEXE DÉCLARÉ, LE STATUT MENSTRUEL ET LES TRAITEMENTS EN COURS, AU PORTAIL
// ([[D-335]] §2-§6, BP-13). Route de classe AUTH : le drapeau d'abord, puis
// la session, avant tout le reste.
//
// GET : ses propres lignes — la tête du sexe déclaré, du statut menstruel et
// de chaque traitement, sans l'e-mail du praticien. `?interrupteur=1` ne rend
// que « ouvert » (le lien du hub), sans aucune donnée du dossier.
//
// POST : une ligne par geste — poser (déclarer, déclarer un changement,
// arrêter un traitement) ou retirer une ligne qu'il a lui-même déclarée. La
// base fait foi ; la route le dit avant, nommé. `idPatient` VIENT DE LA
// SESSION, jamais du corps.
//
// La garde d'âge de [[D-284]] s'applique (§6), comme à la biologie : date de
// naissance manquante ou dossier mineur, la saisie est refusée. Un dossier
// clos ne reçoit plus de ligne. La cadence des écritures du patient
// ([[D-327]]) borne les deux tables ensemble.

export type PortailPhysioTraitementsResponse =
  | { ok: true; ouvert: true }
  | { ok: true; ouvert: true; saisieOuverte: boolean; donnees: DonneesDuPatient; aujourdhui: string }
  | { ok: true; id: string }
  | { ok: false; reason: string; error: string };

/** Borne technique de transport (pas un seuil) : une ligne pèse quelques kilooctets au plus. */
const TAILLE_CORPS_MAX_OCTETS = 16 * 1024;

function echec(reason: string, status: number, error = MESSAGES_REFUS_PATIENT[reason] ?? 'Erreur technique.') {
  return NextResponse.json<PortailPhysioTraitementsResponse>({ ok: false, reason, error }, { status });
}

function surfaceFermee() {
  return echec('physio_desactive', 503);
}

export async function GET(req: Request) {
  if (!isPhysioTraitementsEnabled()) return surfaceFermee();
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailPhysioTraitementsResponse>;
    if (new URL(req.url).searchParams.get('interrupteur') === '1') {
      return NextResponse.json<PortailPhysioTraitementsResponse>({ ok: true, ouvert: true });
    }
    const { patient } = auth;
    const donnees = pourLePatient(await lireDonneesDuDossier(prisma, patient.idPatient));
    const saisieOuverte = accepteNouvelEnvoi(patient)
      && refusSaisieSante(statutAge(patient.dateNaissance, Date.now())) === null;
    return NextResponse.json<PortailPhysioTraitementsResponse>({
      ok: true,
      ouvert: true,
      saisieOuverte,
      donnees,
      aujourdhui: dateJourParis(),
    });
  } catch (err) {
    console.error('[portail/physio-traitements GET] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}

export async function POST(req: Request) {
  if (!isPhysioTraitementsEnabled()) return surfaceFermee();
  try {
    const auth = await authentifierPatientPortail(req);
    if (auth.erreur) return auth.erreur as NextResponse<PortailPhysioTraitementsResponse>;
    const { patient } = auth;
    const { idPatient } = patient;

    if (!accepteNouvelEnvoi(patient)) return echec(RAISON_DOSSIER_CLOS, 409, MESSAGE_DOSSIER_CLOS);
    const refusAge = refusSaisieSante(statutAge(patient.dateNaissance, Date.now()));
    if (refusAge) return echec(refusAge.reason, 409, refusAge.error);

    if (await cadenceAtteinte('portail', async depuis => {
      const where = { idPatient, source: 'patient', acteLe: { gte: depuis } };
      const [physio, traitements] = await Promise.all([
        prisma.donneePhysiologique.count({ where }),
        prisma.traitementEnCours.count({ where }),
      ]);
      return physio + traitements;
    })) {
      return echec('cadence', 429, MESSAGE_CADENCE_PATIENT);
    }

    const annonce = Number(req.headers.get('content-length'));
    if (Number.isFinite(annonce) && annonce > TAILLE_CORPS_MAX_OCTETS) return echec('acte_invalide', 400);
    const texte = await req.text();
    if (texte.length > TAILLE_CORPS_MAX_OCTETS) return echec('acte_invalide', 400);
    let corps: unknown;
    try {
      corps = JSON.parse(texte);
    } catch {
      return echec('acte_invalide', 400);
    }
    if (corps === null || typeof corps !== 'object' || Array.isArray(corps)) return echec('acte_invalide', 400);
    const brut = corps as Record<string, unknown>;

    const auteur = { source: 'patient' as const };
    const aujourdhui = dateJourParis();
    if (brut.objet === 'physio') {
      const lu = lireDemandePhysio(brut, 'patient', aujourdhui);
      if (!lu.ok) return echec(lu.raison, 400);
      const ecrit = await prisma.$transaction(tx => ecrirePhysio(tx, idPatient, lu.demande, auteur));
      return NextResponse.json<PortailPhysioTraitementsResponse>({ ok: true, id: ecrit.id }, { status: 201 });
    }
    if (brut.objet === 'traitement') {
      const lu = lireDemandeTraitement(brut, aujourdhui);
      if (!lu.ok) return echec(lu.raison, 400);
      const ecrit = await prisma.$transaction(tx => ecrireTraitement(tx, idPatient, lu.demande, auteur));
      return NextResponse.json<PortailPhysioTraitementsResponse>({ ok: true, id: ecrit.id }, { status: 201 });
    }
    return echec('objet_invalide', 400);
  } catch (err) {
    if (err instanceof RefusLigne) return echec(err.raison, 409);
    if (estConflitConcurrent(err)) return echec('conflit_concurrent', 409);
    if (estRefusDeLaBase(err)) {
      console.error('[portail/physio-traitements POST] refus de la base :', ...classeEtCode(err));
      return echec('refus_base', 409);
    }
    // JAMAIS `err.message` : une erreur Prisma recopie les arguments, donc le texte déclaré.
    console.error('[portail/physio-traitements POST] échec :', ...classeEtCode(err));
    return echec('server_error', 500, 'Erreur technique.');
  }
}
