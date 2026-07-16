import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { orienterEffetIndesirable } from '@/lib/trust/securite';
import { notifierPraticienSignalement } from '@/lib/trust/notification';
import type {
  ActionPriseDeclaree,
  CategorieIncidentConfidentialite,
  SeveriteDeclaree,
  TypeDemandeDroit,
} from '@/lib/trust/types';

export type TrustSignalementResponse =
  | { ok: true; messagePatient?: string }
  | { ok: false; reason: string; error: string };

type PayloadEffetIndesirable = {
  categorie: 'effet_indesirable';
  produitLibelle?: string;
  doseDeclaree?: string;
  debutPrise?: string;
  symptomes?: string;
  debutSymptomes?: string;
  produitsConcomitants?: string;
  actionPrise?: string;
  severiteDeclaree?: string;
};
type PayloadIncident = {
  categorie: 'incident_confidentialite';
  categorieIncident?: string;
  description?: string;
};
type PayloadDroit = {
  categorie: 'demande_droit';
  typeDemande?: string;
  description?: string;
};
type Payload = { token?: string } & (PayloadEffetIndesirable | PayloadIncident | PayloadDroit);

const SEVERITES: SeveriteDeclaree[] = ['legere', 'moderee', 'severe', 'incertaine'];
const ACTIONS: ActionPriseDeclaree[] = ['aucune', 'reduit', 'arrete', 'ne_sait_pas'];
const CATEGORIES_INCIDENT: CategorieIncidentConfidentialite[] = [
  'connexion_non_reconnue',
  'document_dun_autre_patient',
  'information_incorrecte',
  'appareil_perdu',
  'partage_incorrect',
  'autre',
];
const TYPES_DROIT: TypeDemandeDroit[] = [
  'acces',
  'rectification',
  'effacement',
  'limitation',
  'opposition',
  'portabilite',
  'retrait_choix',
  'information',
];

const tronque = (valeur: string | undefined, max: number): string =>
  (valeur ?? '').trim().slice(0, max);

// POST /api/portail/trust/signalement — trois parcours structurés (jamais de
// texte libre clinique ouvert) : effet indésirable suspecté (orientation par
// règle déterministe versionnée, sans déduction de causalité), incident de
// confidentialité, demande d'exercice de droits. Chaque dépôt déclenche une
// notification praticien générique (aucune donnée sensible dans l'email).
export async function POST(req: Request): Promise<NextResponse<TrustSignalementResponse>> {
  let payload: Payload;
  try {
    payload = (await req.json()) as Payload;
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'JSON invalide.' }, { status: 400 });
  }

  const auth = await authentifierPatientPortail(req, payload.token ?? null);
  if (auth.erreur) return auth.erreur as NextResponse<TrustSignalementResponse>;
  const { patient } = auth;

  try {
    if (payload.categorie === 'effet_indesirable') {
      const produitLibelle = tronque(payload.produitLibelle, 200);
      const symptomes = tronque(payload.symptomes, 2000);
      const severite = payload.severiteDeclaree as SeveriteDeclaree;
      const actionPrise = (payload.actionPrise ?? 'ne_sait_pas') as ActionPriseDeclaree;
      if (!produitLibelle || !symptomes || !SEVERITES.includes(severite) || !ACTIONS.includes(actionPrise)) {
        return NextResponse.json(
          { ok: false, reason: 'invalid_payload', error: 'Produit, symptômes et sévérité sont requis.' },
          { status: 400 },
        );
      }
      const orientation = orienterEffetIndesirable(severite);
      await prisma.trustAdverseEffectReport.create({
        data: {
          idPatient: patient.idPatient,
          produitLibelle,
          doseDeclaree: tronque(payload.doseDeclaree, 200) || null,
          debutPrise: tronque(payload.debutPrise, 100) || null,
          symptomes,
          debutSymptomes: tronque(payload.debutSymptomes, 100) || null,
          produitsConcomitants: tronque(payload.produitsConcomitants, 500) || null,
          actionPrise,
          severiteDeclaree: severite,
          orientation: orientation.orientation,
          regleId: orientation.regleId,
          regleVersion: orientation.regleVersion,
        },
      });
      void notifierPraticienSignalement(patient.praticienEmail);
      return NextResponse.json({ ok: true, messagePatient: orientation.messagePatient });
    }

    if (payload.categorie === 'incident_confidentialite') {
      const categorieIncident = payload.categorieIncident as CategorieIncidentConfidentialite;
      const description = tronque(payload.description, 2000);
      if (!CATEGORIES_INCIDENT.includes(categorieIncident) || !description) {
        return NextResponse.json(
          { ok: false, reason: 'invalid_payload', error: 'Catégorie et description sont requises.' },
          { status: 400 },
        );
      }
      await prisma.trustPrivacyIncident.create({
        data: { idPatient: patient.idPatient, categorie: categorieIncident, description },
      });
      void notifierPraticienSignalement(patient.praticienEmail);
      return NextResponse.json({ ok: true });
    }

    if (payload.categorie === 'demande_droit') {
      const typeDemande = payload.typeDemande as TypeDemandeDroit;
      if (!TYPES_DROIT.includes(typeDemande)) {
        return NextResponse.json(
          { ok: false, reason: 'invalid_payload', error: 'Type de demande inconnu.' },
          { status: 400 },
        );
      }
      await prisma.trustRightsRequest.create({
        data: {
          idPatient: patient.idPatient,
          type: typeDemande,
          description: tronque(payload.description, 2000) || null,
        },
      });
      void notifierPraticienSignalement(patient.praticienEmail);
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Catégorie inconnue.' }, { status: 400 });
  } catch (err) {
    console.error('[trust/signalement POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
