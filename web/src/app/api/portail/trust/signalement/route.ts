import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { associationEffetIndesirableDisponible } from '@/lib/clinical/safetyEffetIndesirableV1';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
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
  /**
   * Le patient déclare-t-il que ce produit fait partie du programme qui lui a
   * été transmis ? ([[D-101]], `DC-42`)
   *
   * C'EST UNE DÉCLARATION, PAS UNE DÉSIGNATION. Le patient dit « oui, ça fait
   * partie de mon programme » ; c'est le SERVEUR qui résout de quel protocole
   * il s'agit, par `resolveProtocoleDiffuse` — la V1 est mono-protocole, il n'y
   * a rien à choisir. Faire pointer le patient sur un identifiant lui
   * demanderait de connaître une clé technique, et faire deviner à la machine
   * quelle LIGNE du protocole correspond au produit serait la déduction que le
   * lot interdit.
   */
  rattacheAuProgramme?: string;
  /** Dates TYPÉES, à côté des deux champs libres qui restent. */
  debutPriseLe?: string;
  debutSymptomesLe?: string;
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
type Payload = PayloadEffetIndesirable | PayloadIncident | PayloadDroit;

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

/**
 * Une date déclarée par le patient, ou `null` — jamais une date approchée.
 *
 * `null` DIT « pas de date », et c'est la seule chose honnête à faire d'une
 * saisie qu'on ne sait pas lire : deviner un format, ou retomber sur la date du
 * jour, poserait un fait que le patient n'a pas déclaré. Une date future est
 * refusée pour la même raison — un symptôme qui n'a pas encore eu lieu n'est
 * pas un symptôme déclaré.
 */
function dateDeclaree(valeur: string | undefined): Date | null {
  const brut = (valeur ?? '').trim();
  if (!brut) return null;
  const date = new Date(brut);
  if (Number.isNaN(date.getTime())) return null;
  if (date.getTime() > Date.now()) return null;
  return date;
}

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

  const auth = await authentifierPatientPortail(req);
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
      // L'ASSOCIATION À UNE INTERVENTION ([[D-101]], `DC-42`), et rien de ce
      // bloc n'existe tant que le drapeau est absent : les trois colonnes
      // arrivent par une migration que le déploiement du code précède
      // ([[D-087]]), et les écrire plus tôt ferait échouer le dépôt d'un
      // signalement — c'est-à-dire fermer au patient la surface même qui sert à
      // signaler un effet indésirable.
      let association: {
        protocolDraftId?: string | null;
        debutPriseLe?: Date | null;
        debutSymptomesLe?: Date | null;
      } = {};
      if (associationEffetIndesirableDisponible()) {
        const debutPriseLe = dateDeclaree(payload.debutPriseLe);
        const debutSymptomesLe = dateDeclaree(payload.debutSymptomesLe);
        // Le même invariant que le CHECK SQL, refusé ICI avec un message
        // français : laisser la base rejeter aurait rendu une erreur technique
        // à un patient en train de signaler un effet indésirable.
        if (debutPriseLe && debutSymptomesLe && debutSymptomesLe < debutPriseLe) {
          return NextResponse.json(
            {
              ok: false,
              reason: 'invalid_payload',
              error: 'La date d’apparition des symptômes ne peut pas précéder le début de la prise.',
            },
            { status: 400 },
          );
        }
        // `resolveProtocoleDiffuse` rend `null` quand aucun protocole n'est
        // diffusé : le patient a beau déclarer « oui », il n'y a rien à
        // rattacher, et inventer un identifiant serait pire que l'absence.
        const diffuse = payload.rattacheAuProgramme === 'oui'
          ? await resolveProtocoleDiffuse(patient.idPatient)
          : null;
        association = {
          protocolDraftId: diffuse?.protocolDraftId ?? null,
          debutPriseLe,
          debutSymptomesLe,
        };
      }
      const orientation = orienterEffetIndesirable(severite);
      await prisma.trustAdverseEffectReport.create({
        data: {
          idPatient: patient.idPatient,
          produitLibelle,
          doseDeclaree: tronque(payload.doseDeclaree, 200) || null,
          // Les deux champs LIBRES restent, et ils ne sont pas redondants : le
          // patient peut écrire « il y a trois semaines environ », que rien ne
          // convertit en date. Les colonnes typées ajoutent, elles ne
          // remplacent pas.
          debutPrise: tronque(payload.debutPrise, 100) || null,
          symptomes,
          debutSymptomes: tronque(payload.debutSymptomes, 100) || null,
          produitsConcomitants: tronque(payload.produitsConcomitants, 500) || null,
          actionPrise,
          severiteDeclaree: severite,
          orientation: orientation.orientation,
          regleId: orientation.regleId,
          regleVersion: orientation.regleVersion,
          ...association,
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
