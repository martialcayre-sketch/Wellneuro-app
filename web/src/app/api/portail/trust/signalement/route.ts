import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { associationEffetIndesirableDisponible } from '@/lib/clinical/safetyEffetIndesirableV1';
import { resolveProtocoleDiffuse } from '@/lib/protocol/portailProtocol';
import { authentifierPatientPortail } from '@/lib/trust/portailAuth';
import { orienterEffetIndesirable } from '@/lib/trust/securite';
import { notifierPraticienSignalement, premierSignalementDeLHeure } from '@/lib/trust/notification';
import { RATTACHEMENTS, elementsDesignablesParLePatient, type Rattachement } from '@/lib/trust/pauseEffetIndesirable';
import { designationOuverte, programmeDiffuse } from '@/lib/trust/pauseEffetIndesirableServeur';
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
  /**
   * LA DÉSIGNATION ([[D-281]] §2) : le patient attribue l'effet à UN élément
   * du programme diffusé (`elementActionId`), ou répond « Je ne sais pas », ou
   * « un autre produit ». Le programme, lui, reste résolu par le serveur.
   * Absente, la route suit le chemin d'avant (`rattacheAuProgramme`) — celui
   * d'un dossier mineur ou sans date, qui garde le formulaire d'avant.
   */
  rattachement?: string;
  elementActionId?: string;
  /** La version du programme sur laquelle le patient a choisi (servie par `etat`). */
  versionProgramme?: string;
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
        rattachement?: Rattachement | null;
        elementActionId?: string | null;
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
        // Les lectures de la désignation ne font JAMAIS perdre un signalement.
        //
        // LE REPLI ([[D-281]] §5, arbitrage du responsable du 2026-10-16) : une
        // désignation illisible — lecture en échec, ou programme diffusé dont
        // l'intégrité ne se vérifie pas — vise quand même le programme
        // diffusé, relu seul, comme le formulaire d'avant. Le signalement
        // attend alors l'avis du praticien, qui désigne l'élément en cause ou
        // aucun — sur un programme lui-même illisible, « impliqué, élément non
        // identifiable » (arbitrage du 2026-10-16) ;
        // le choix du patient, lui, n'est pas conservé. Sans programme
        // diffusé, ou cette lecture en échec aussi, il est capturé sans
        // programme : rien ne bloque, il se compte par son statut.
        const repli = async () => {
          let diffuse: Awaited<ReturnType<typeof resolveProtocoleDiffuse>> = null;
          try {
            diffuse = await resolveProtocoleDiffuse(patient.idPatient);
          } catch (err) {
            console.warn('[trust/signalement POST] programme diffusé illisible, capture sans programme :',
              err instanceof Error ? err.message : String(err));
          }
          return { protocolDraftId: diffuse?.protocolDraftId ?? null, debutPriseLe, debutSymptomesLe };
        };
        let ouverte = false;
        let programme: Awaited<ReturnType<typeof programmeDiffuse>> = null;
        let lectureEchouee = false;
        if (payload.rattachement !== undefined) {
          try {
            ouverte = await designationOuverte(patient.idPatient);
            if (ouverte) programme = await programmeDiffuse(patient.idPatient);
          } catch (err) {
            console.warn('[trust/signalement POST] désignation illisible, repli sur le programme diffusé :',
              err instanceof Error ? err.message : String(err));
            lectureEchouee = true;
          }
        }
        if (lectureEchouee) {
          association = await repli();
        } else if (ouverte) {
          // LA DÉSIGNATION ([[D-281]] §2), vérifiée ICI avant la base : son
          // trigger refuserait un élément absent, mais en rendant une erreur
          // technique à un patient en train de signaler un effet indésirable.
          const rattachement = payload.rattachement as Rattachement;
          if (!RATTACHEMENTS.includes(rattachement)) {
            return NextResponse.json(
              { ok: false, reason: 'invalid_payload', error: 'Indiquez à quoi vous associez cet effet.' },
              { status: 400 },
            );
          }
          const elementActionId = rattachement === 'element' ? tronque(payload.elementActionId, 200) : '';
          // Un ÉLÉMENT choisi, deux refus, un seul message. (1) La version : les
          // identifiants d'action sont positionnels, un choix fait sur une
          // version remplacée désignerait une autre action de la nouvelle.
          // (2) L'élément : hors de la liste que le patient voit — absent,
          // d'un type non désignable (orientation, prise de sang : arbitrages
          // du 2026-10-14), intervention non ferme, ou programme non servi au
          // portail, où la désignation se fait sans liste (arbitrages du
          // 2026-10-16). « Je ne sais pas » et « un autre produit » ne nomment
          // aucune action : ils se rattachent au programme courant, sans refus.
          if (programme && rattachement === 'element' && (
            payload.versionProgramme !== programme.version
            || !programme.servi
            || !elementsDesignablesParLePatient(programme.actions).some(e => e.actionId === elementActionId)
          )) {
            return NextResponse.json(
              {
                ok: false,
                reason: 'invalid_payload',
                error: 'Cet élément ne figure plus dans votre programme. Rechargez la page et choisissez de nouveau.',
              },
              { status: 400 },
            );
          }
          // Sans programme lisible, rien ne se rattache (§2) : le repli vise le
          // programme diffusé s'il en est un, sans rattachement.
          association = programme
            ? {
                protocolDraftId: programme.protocolDraftId,
                rattachement,
                elementActionId: rattachement === 'element' ? elementActionId : null,
                debutPriseLe,
                debutSymptomesLe,
              }
            : await repli();
        } else {
          // `resolveProtocoleDiffuse` rend `null` quand aucun protocole n'est
          // diffusé : le patient a beau déclarer « oui », il n'y a rien à
          // rattacher, et inventer un identifiant serait pire que l'absence.
          // La lecture passe par le repli, protégée comme lui : en échec, le
          // signalement est capturé sans programme, jamais perdu.
          association = payload.rattacheAuProgramme === 'oui'
            ? await repli()
            : { protocolDraftId: null, debutPriseLe, debutSymptomesLe };
        }
      }
      const orientation = orienterEffetIndesirable(severite);
      // Un effet indésirable orienté vers un avis médical ou l'urgence prévient
      // TOUJOURS le praticien ([[D-328]] §2) : la limite d'un e-mail par heure ne
      // vaut que pour une gêne légère (« revue praticien »).
      const prevenir = orientation.orientation !== 'revue_praticien'
        || await premierSignalementDeLHeure(patient.idPatient);
      const rapport = await prisma.trustAdverseEffectReport.create({
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
      if (prevenir) {
        void notifierPraticienSignalement({
          idPatient: patient.idPatient,
          praticienEmail: patient.praticienEmail,
          signalement: { categorie: 'effet_indesirable', id: rapport.id },
        });
      }
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
      const prevenir = await premierSignalementDeLHeure(patient.idPatient);
      const incident = await prisma.trustPrivacyIncident.create({
        data: { idPatient: patient.idPatient, categorie: categorieIncident, description },
      });
      if (prevenir) {
        void notifierPraticienSignalement({
          idPatient: patient.idPatient,
          praticienEmail: patient.praticienEmail,
          signalement: { categorie: 'incident_confidentialite', id: incident.id },
        });
      }
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
      const prevenir = await premierSignalementDeLHeure(patient.idPatient);
      const demande = await prisma.trustRightsRequest.create({
        data: {
          idPatient: patient.idPatient,
          type: typeDemande,
          description: tronque(payload.description, 2000) || null,
        },
      });
      if (prevenir) {
        void notifierPraticienSignalement({
          idPatient: patient.idPatient,
          praticienEmail: patient.praticienEmail,
          signalement: { categorie: 'demande_droit', id: demande.id },
        });
      }
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, reason: 'invalid_payload', error: 'Catégorie inconnue.' }, { status: 400 });
  } catch (err) {
    console.error('[trust/signalement POST]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
