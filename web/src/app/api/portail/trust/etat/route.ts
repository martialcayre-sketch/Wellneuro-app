import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { associationEffetIndesirableDisponible } from '@/lib/clinical/safetyEffetIndesirableV1';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { avantDeCommencerRequis as calculerAvantDeCommencerRequis } from '@/lib/trust/avantDeCommencer';
import { projeterChoixCourants } from '@/lib/trust/securite';

export type AccuseEtat = {
  documentKey: string;
  documentVersion: string;
  type: string;
  date: string;
};

export type ChoixEtat = {
  finalite: string;
  statut: string;
  enregistreLe: string;
  documentVersion: string;
};

export type SignalementEtat = {
  categorie: 'effet_indesirable' | 'incident_confidentialite' | 'demande_droit';
  libelle: string;
  statutTraitement: string;
  soumisLe: string;
};

export type TrustEtatResponse =
  | {
      ok: true;
      /** La séquence « Avant de commencer » est requise tant qu'UN document
       * exigeant un accusé n'en a pas un, de type « pris_connaissance », sur sa
       * version COURANTE. Ce n'est plus le seul cadre d'accompagnement depuis
       * le 2026-09-16 : la liste est `documentsRequerantAccuse()`, et c'est la
       * même que la séquence lit pour savoir quels accusés poser. */
      avantDeCommencerRequis: boolean;
      accuses: AccuseEtat[];
      choixCourants: ChoixEtat[];
      historiqueChoix: ChoixEtat[];
      signalements: SignalementEtat[];
      /**
       * Le formulaire d'effet indésirable peut-il demander le rattachement au
       * programme et les dates de prise ? ([[D-101]], `DC-42`)
       *
       * SERVI PLUTÔT QUE SUPPOSÉ, et pour une raison qui n'est pas technique :
       * les trois colonnes arrivent par une migration que le déploiement du
       * code précède ([[D-087]]). Poser les questions avant l'ouverture ferait
       * répondre le patient — « oui, ce produit fait partie de mon
       * programme » — et **jetterait sa réponse en silence**. Demander une
       * déclaration qu'on ne conserve pas est exactement ce que ce lot existe
       * pour empêcher ailleurs.
       */
      associationEffetIndesirable: boolean;
    }
  | { ok: false; reason: string; error: string };

// GET /api/portail/trust/etat — état TRUST du patient de la session (cookie).
// Les documents eux-mêmes viennent du registre versionné côté client
// (lib/trust/contenus/registre.ts) ; cette route ne renvoie que l'état
// individuel (DTO patient explicite, aucune sérialisation implicite).
export async function GET(req: Request): Promise<NextResponse<TrustEtatResponse>> {
  const auth = await authentifierPatientPortail(req);
  if (auth.erreur) return auth.erreur as NextResponse<TrustEtatResponse>;
  const { patient } = auth;

  try {
    const [accuses, evenementsChoix, effets, incidents, droits] = await Promise.all([
      prisma.trustAcknowledgement.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.trustChoiceEvent.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { enregistreLe: 'asc' },
        // MÊME RAISON QUE LE `create` DE `trust/choix` : un `findMany` nu
        // sélectionne tous les scalaires, `formulation_version` comprise, et
        // casserait la LECTURE de l'espace TRUST tant que la migration n'est pas
        // appliquée. Les quatre champs ci-dessous sont les seuls consommés.
        select: {
          finalite: true,
          statut: true,
          enregistreLe: true,
          documentVersion: true,
        },
      }),
      prisma.trustAdverseEffectReport.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { soumisLe: 'desc' },
        select: { produitLibelle: true, statutTraitement: true, soumisLe: true },
      }),
      prisma.trustPrivacyIncident.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { soumisLe: 'desc' },
        select: { categorie: true, statutTraitement: true, soumisLe: true },
      }),
      prisma.trustRightsRequest.findMany({
        where: { idPatient: patient.idPatient },
        orderBy: { soumisLe: 'desc' },
        select: { type: true, statutTraitement: true, soumisLe: true },
      }),
    ]);

    // LA PORTE NE REGARDE PLUS UN SEUL DOCUMENT ÉCRIT EN DUR (2026-09-16).
    //
    // Elle lisait la version courante de `cadre_accompagnement`, et rien
    // d'autre : `requiresAcknowledgement` était un champ MORT, posé sur les
    // treize documents du registre et lu par aucun code. Un document qui
    // réclamait un accusé ne le réclamait qu'en paroles — et c'est la v8 de
    // « Vos données personnelles », qui déclare trois renseignements NOUVEAUX,
    // qui l'a mis au jour.
    //
    // La liste vit dans `lib/trust/avantDeCommencer.ts`, avec la fonction que
    // la SÉQUENCE lit pour savoir quels accusés poser. Une seule liste pour les
    // deux : si la porte exigeait un accusé que la séquence n'enregistre pas,
    // le patient boucherait sans fin sur les quatre écrans.
    const avantDeCommencerRequis = calculerAvantDeCommencerRequis(accuses);

    const historiqueChoix: ChoixEtat[] = evenementsChoix.map(e => ({
      finalite: e.finalite,
      statut: e.statut,
      enregistreLe: e.enregistreLe.toISOString(),
      documentVersion: e.documentVersion,
    }));

    return NextResponse.json({
      ok: true,
      associationEffetIndesirable: associationEffetIndesirableDisponible(),
      avantDeCommencerRequis,
      accuses: accuses.map(a => ({
        documentKey: a.documentKey,
        documentVersion: a.documentVersion,
        type: a.type,
        date: a.createdAt.toISOString(),
      })),
      choixCourants: [...projeterChoixCourants(historiqueChoix).values()],
      historiqueChoix,
      signalements: [
        ...effets.map(e => ({
          categorie: 'effet_indesirable' as const,
          libelle: e.produitLibelle,
          statutTraitement: e.statutTraitement,
          soumisLe: e.soumisLe.toISOString(),
        })),
        ...incidents.map(i => ({
          categorie: 'incident_confidentialite' as const,
          libelle: i.categorie,
          statutTraitement: i.statutTraitement,
          soumisLe: i.soumisLe.toISOString(),
        })),
        ...droits.map(d => ({
          categorie: 'demande_droit' as const,
          libelle: d.type,
          statutTraitement: d.statutTraitement,
          soumisLe: d.soumisLe.toISOString(),
        })),
      ].sort((a, b) => b.soumisLe.localeCompare(a.soumisLe)),
    });
  } catch (err) {
    console.error('[trust/etat GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json(
      { ok: false, reason: 'exception', error: 'Erreur technique.' },
      { status: 500 },
    );
  }
}
