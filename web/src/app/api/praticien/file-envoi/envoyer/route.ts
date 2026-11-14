import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createPublicId } from '@/lib/ids';
import { creerTransportSmtp } from '@/lib/email/transportSmtp';
import { getGabarit, rendreGabarit, rendreSegment } from '@/lib/correspondance/registreGabarits';
import { estInstrumentCabinet, idsAssignablesPour, resolveDefinition } from '@/lib/instruments';
import {
  cabinetEnvoyable,
  copieDesignationSuicide,
  declarationSuicideCabinetActive,
  type DesignationSuicideCopiee,
} from '@/lib/securite/declarationSuicideCabinet';
import { buildGoogleConnexionUrl } from '@/lib/consultation/email';
import { emailPraticien, filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import {
  RAISON_DOSSIER_DESACTIVE,
  accepteNouvelEnvoi,
  refusDossierFerme,
} from '@/lib/patient/cycleDeVie';
import {
  journaliserCorrespondancePatient,
  TYPES_CORRESPONDANCE_PATIENT,
} from '@/lib/correspondance/patient';
import {
  MESSAGE_DEJA_ASSIGNE,
  RAISON_DEJA_ASSIGNE,
  qidsDejaOuverts,
  verrouillerPatient,
} from '@/lib/assignations/dedup';
import { logger } from '@/lib/observability/logger';
import { EVENT_CODES } from '@/lib/observability/eventCodes';
import { createRequestContext, finalizeLogContext } from '@/lib/observability/requestContext';

// « Préparer les envois » — l'envoi au clic d'un brouillon de la file
// (arbitrage 2026-07-23). Patron packs/assign : N assignations créées dans une
// transaction, puis UN mail récapitulatif vers la page de connexion. Le
// brouillon passe à `parti` dans la même transaction (claim atomique).

export type EnvoyerFileResponse = {
  success: boolean;
  count?: number;
  error?: string;
  reason?:
    | 'unauthenticated'
    | 'invalid_payload'
    | 'not_found'
    | 'patient_not_found'
    | 'portal_revoked'
    | 'dossier_cloture'
    | typeof RAISON_DOSSIER_DESACTIVE
    | 'deja_envoye'
    | 'deja_assigne'
    | 'exception';
};

// Levée quand le brouillon a déjà été réclamé par un envoi concurrent :
// la transaction est annulée, aucune assignation ni mail ne part en double.
class BrouillonDejaParti extends Error {}

// Levée quand tous les questionnaires du brouillon portent déjà une
// assignation ouverte : la transaction est annulée, le brouillon reste
// en l'état, aucun mail ne part.
class ToutDejaAssigne extends Error {}

// NF-7, P2-3 : levée quand, sous verrou, plus aucun questionnaire du
// brouillon n'est envoyable (instruments du cabinet devenus inéligibles
// entre la lecture et la transaction). La transaction est annulée, le
// brouillon reste en l'état, aucun mail ne part.
class RienDEnvoyable extends Error {}

export async function POST(request: Request) {
  const requestContext = createRequestContext(request);
  const session = await getServerSession(authOptions);
  const emailSession = emailPraticien(session);
  if (!session || !emailSession) {
    return NextResponse.json<EnvoyerFileResponse>(
      { success: false, reason: 'unauthenticated', error: 'Session absente.' },
      { status: 401 },
    );
  }
  try {
    const body = (await request.json().catch(() => ({}))) as { idBrouillon?: unknown };
    const idBrouillon =
      typeof body.idBrouillon === 'string' ? body.idBrouillon.trim().slice(0, 50) : '';
    if (!idBrouillon) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'invalid_payload', error: 'Brouillon manquant.' },
        { status: 400 },
      );
    }
    const brouillon = await prisma.envoiBrouillon.findFirst({
      where: {
        idBrouillon,
        praticienEmail: { equals: emailSession, mode: 'insensitive' },
        statut: 'brouillon',
      },
    });
    if (!brouillon) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'not_found', error: 'Brouillon introuvable.' },
        { status: 404 },
      );
    }
    const patient = await prisma.patient.findFirst({
      where: { idPatient: brouillon.idPatient, ...filtrePatientsDuPraticien(emailSession) },
    });
    if (!patient) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'patient_not_found', error: 'Patient introuvable.' },
        { status: 404 },
      );
    }
    // Clos ou désactivé : chacun son refus ([[D-432]], qui précise [[D-427]]).
    if (!accepteNouvelEnvoi(patient)) {
      const refus = refusDossierFerme(patient);
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: refus.raison, error: refus.message },
        { status: 409 },
      );
    }

    // Revalidation à l'envoi : assignable AUJOURD'HUI (actif + défini), pas
    // seulement au moment de l'ajout au brouillon. Un instrument du cabinet
    // repassé en brouillon entre l'ajout et l'envoi est simplement filtré :
    // `idsAssignablesPour` ne rend que les CAB publiés, et `resolveDefinition`
    // sans options ne sert jamais un non-publié.
    const assignables = await idsAssignablesPour(emailSession);
    const aCreer: { idAssignation: string; idQuestionnaire: string; titre: string }[] = [];
    for (const idQuestionnaire of brouillon.qids) {
      if (!assignables.has(idQuestionnaire)) continue;
      const def = await resolveDefinition(idQuestionnaire);
      if (!def) continue;
      aCreer.push({
        idAssignation: createPublicId('ASS'),
        idQuestionnaire,
        titre: def.titre || idQuestionnaire,
      });
    }
    if (aCreer.length === 0) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'invalid_payload', error: 'Aucun questionnaire valide dans ce brouillon.' },
        { status: 400 },
      );
    }

    // Sans note du praticien, rien : l'ancien défaut « Envoi groupé —
    // bibliothèque » s'affichait comme sa note dans l'espace patient (D/52).
    const notesEnvoi = brouillon.notes?.trim() || null;

    // L'accès portail de ce patient ne doit pas être révoqué (LOT-04 — plus de
    // jeton ni de verrou de ligne ; une révocation concurrente est bénigne, un
    // patient révoqué ne peut de toute façon pas entrer).
    if (patient.accessTokenRevoked) {
      return NextResponse.json<EnvoyerFileResponse>(
        { success: false, reason: 'portal_revoked', error: 'Accès portail révoqué pour ce patient.' },
        { status: 409 },
      );
    }

    let retenus: typeof aCreer = [];
    try {
      retenus = await prisma.$transaction(async (tx) => {
        // Claim atomique : ce updateMany gardé sur le statut fait qu'un second
        // envoi (double-clic, second onglet, retry) trouve count=0 et abandonne
        // sans créer d'assignation ni envoyer de mail.
        const claim = await tx.envoiBrouillon.updateMany({
          where: { idBrouillon, statut: 'brouillon' },
          data: { statut: 'parti', dateEnvoi: new Date() },
        });
        if (claim.count === 0) {
          throw new BrouillonDejaParti();
        }
        // Dédup sous verrou patient : un qid déjà porté par une assignation
        // ouverte est écarté ; si tout le brouillon l'est, la transaction est
        // annulée et le brouillon reste éditable.
        await verrouillerPatient(tx, patient.idPatient);
        const ouvertes = await qidsDejaOuverts(tx, patient.idPatient, aCreer.map(i => i.idQuestionnaire));
        const aInserer = aCreer.filter(item => !ouvertes.has(item.idQuestionnaire));
        // L'amputation sans trace serait invisible : le praticien lirait
        // « N questionnaires envoyés » sans savoir lequel manque ni pourquoi.
        if (ouvertes.size > 0) {
          logger.warn({
            event: EVENT_CODES.ASSIGNATION_DEJA_ASSIGNE_ECARTE,
            domain: 'ASSIGNATION',
            message: `Questionnaires déjà assignés (ouverts) écartés de l'envoi groupé : ${[...ouvertes].sort().join(', ')}`,
            context: finalizeLogContext(requestContext, { retryable: false }),
          });
        }
        if (aInserer.length === 0) {
          throw new ToutDejaAssigne();
        }
        // NF-7 ([[D-303]] §3, réponse 20261111-0027-a) : la déclaration
        // « question sur le suicide » d'un instrument du cabinet est COPIÉE sur
        // l'assignation à l'envoi. L'écran patient lit cette copie, jamais la
        // déclaration courante de l'instrument. Drapeau éteint, ou instrument
        // du catalogue : rien n'est écrit, rien n'est verrouillé.
        //
        // P2-3 (arbitrage du 2026-11-12) : l'éligibilité (actif, publié,
        // déclaré) et la déclaration copiée restent vraies JUSQU'AU COMMIT.
        // Le verrou `FOR SHARE` sur les lignes des instruments du cabinet fait
        // ATTENDRE toute publication, modification, déclaration ou
        // désactivation concurrente (chacune écrit la ligne) jusqu'à la fin de
        // cette transaction, sans bloquer un autre envoi du même instrument.
        // Attendre ne suffit pas pour une modification du contenu : elle
        // recompte les envois sous son propre `FOR UPDATE` avant d'écrire, et
        // voit donc celui-ci (`api/praticien/instruments`, édition).
        // Ordre fixe (`ORDER BY`) : deux envois ne s'interbloquent pas. Un
        // instrument devenu inéligible depuis la lecture d'`idsAssignablesPour`
        // est écarté avec sa trace ; si rien ne reste, tout est annulé.
        //
        // [[D-515]] §4 : sous « oui », la DÉSIGNATION en vigueur est copiée
        // avec la déclaration, lue sous le même verrou — une modification du
        // contenu, qui l'efface, attend donc la fin de cet envoi. Introuvable
        // ou incohérente, elle n'est pas copiée : les trois colonnes restent
        // vides, et la désignation est inconnue ([[D-515]] §7).
        const copierDeclaration = declarationSuicideCabinetActive();
        const declarations = new Map<string, boolean>();
        const designations = new Map<string, DesignationSuicideCopiee>();
        let retenusEnvoi = aInserer;
        const idsCabinet = copierDeclaration
          ? aInserer.map(i => i.idQuestionnaire).filter(estInstrumentCabinet).sort()
          : [];
        if (idsCabinet.length > 0) {
          const lignes = await tx.$queryRaw<
            {
              id_instrument: string;
              actif: boolean;
              statut_relecture: string;
              pose_question_suicide: boolean | null;
              titre: string;
              definition_json: unknown;
              question_suicide_id: string | null;
              question_suicide_option_non: number | null;
            }[]
          >`SELECT id_instrument, actif, statut_relecture, pose_question_suicide,
                   titre, definition_json, question_suicide_id, question_suicide_option_non
              FROM cabinet_instruments
             WHERE id_instrument = ANY(${idsCabinet}::text[])
               AND lower(praticien_email) = lower(${emailSession})
             ORDER BY id_instrument
               FOR SHARE`;
          for (const ligne of lignes) {
            const etat = {
              actif: ligne.actif,
              statutRelecture: ligne.statut_relecture,
              poseQuestionSuicide: ligne.pose_question_suicide,
            };
            if (cabinetEnvoyable(etat) && etat.poseQuestionSuicide !== null) {
              declarations.set(ligne.id_instrument, etat.poseQuestionSuicide);
              if (etat.poseQuestionSuicide === true) {
                const designation = copieDesignationSuicide({
                  titre: ligne.titre,
                  definitionJson: ligne.definition_json,
                  questionSuicideId: ligne.question_suicide_id,
                  questionSuicideOptionNon: ligne.question_suicide_option_non,
                });
                if (designation) {
                  designations.set(ligne.id_instrument, designation);
                } else {
                  logger.warn({
                    event: EVENT_CODES.ASSIGNATION_DESIGNATION_SUICIDE_INCONNUE,
                    domain: 'ASSIGNATION',
                    message: `Instrument du cabinet déclaré « oui » sans désignation lisible : copie vide (${ligne.id_instrument})`,
                    context: finalizeLogContext(requestContext, { retryable: false }),
                  });
                }
              }
            }
          }
          const ecartes = idsCabinet.filter(id => !declarations.has(id));
          if (ecartes.length > 0) {
            logger.warn({
              event: EVENT_CODES.ASSIGNATION_INSTRUMENT_INELIGIBLE_ECARTE,
              domain: 'ASSIGNATION',
              message: `Instruments du cabinet devenus non envoyables écartés de l'envoi groupé : ${ecartes.join(', ')}`,
              context: finalizeLogContext(requestContext, { retryable: false }),
            });
            retenusEnvoi = aInserer.filter(item => !ecartes.includes(item.idQuestionnaire));
          }
          if (retenusEnvoi.length === 0) {
            throw new RienDEnvoyable();
          }
        }
        for (const item of retenusEnvoi) {
          // Désignation absente : les trois colonnes ne sont pas écrites, donc
          // NULL en base (jamais `Prisma.JsonNull`, que le CHECK refuserait).
          const declaration =
            copierDeclaration && estInstrumentCabinet(item.idQuestionnaire)
              ? {
                poseQuestionSuicide: declarations.get(item.idQuestionnaire),
                ...designations.get(item.idQuestionnaire),
              }
              : {};
          await tx.assignation.create({
            data: {
              ...item,
              ...declaration,
              idPatient: patient.idPatient,
              emailPatient: patient.email,
              dateAssignation: new Date(),
              dateLimite: brouillon.dateLimite || null,
              statut: 'En attente',
              notes: notesEnvoi,
            },
          });
        }
        return retenusEnvoi;
      });
    } catch (err) {
      if (err instanceof BrouillonDejaParti) {
        return NextResponse.json<EnvoyerFileResponse>(
          { success: false, reason: 'deja_envoye', error: 'Ce brouillon a déjà été envoyé.' },
          { status: 409 },
        );
      }
      if (err instanceof RienDEnvoyable) {
        // Même refus que lorsqu'aucun questionnaire n'est assignable avant la
        // transaction : le brouillon reste en l'état, aucun mail ne part.
        return NextResponse.json<EnvoyerFileResponse>(
          { success: false, reason: 'invalid_payload', error: 'Aucun questionnaire valide dans ce brouillon.' },
          { status: 400 },
        );
      }
      if (err instanceof ToutDejaAssigne) {
        return NextResponse.json<EnvoyerFileResponse>(
          { success: false, reason: RAISON_DEJA_ASSIGNE, error: MESSAGE_DEJA_ASSIGNE },
          { status: 409 },
        );
      }
      throw err;
    }

    const portalUrl = buildGoogleConnexionUrl();

    // En serverless, on attend explicitement l'envoi (patron assignations).
    await sendFileEnvoiEmail({
      idPatient: patient.idPatient,
      idBrouillon,
      emailPatient: patient.email,
      dateLimite: brouillon.dateLimite,
      portalUrl,
    }).catch(() => {
      // Best-effort : le lien portail reste récupérable côté praticien.
    });

    return NextResponse.json<EnvoyerFileResponse>({ success: true, count: retenus.length });
  } catch {
    return NextResponse.json<EnvoyerFileResponse>(
      { success: false, reason: 'exception', error: 'Erreur inattendue.' },
      { status: 500 },
    );
  }
}

async function sendFileEnvoiEmail({
  idPatient,
  idBrouillon,
  emailPatient,
  dateLimite,
  portalUrl,
}: {
  idPatient: string;
  idBrouillon: string;
  emailPatient: string;
  dateLimite: string | null;
  portalUrl: string;
}) {
  const smtpUrl = process.env.SMTP_URL;
  const trace = {
    idPatient,
    type: TYPES_CORRESPONDANCE_PATIENT.questionnaires,
    objet: 'Invitation à compléter plusieurs questionnaires',
    referenceType: 'envoi_brouillon',
    referenceId: idBrouillon,
    sourceType: 'envoi_brouillon',
    sourceId: idBrouillon,
  } as const;
  if (!smtpUrl) {
    await journaliserCorrespondancePatient({ ...trace, statut: 'Non_envoye' });
    return;
  }
  // Transport et gabarit DANS le bloc qui consigne l'échec ([[D-398]] §1,
  // Q4) : une exception à leur préparation s'écrit « Erreur », comme un refus
  // SMTP, au lieu de ne laisser aucune trace.
  try {
    const transporter = creerTransportSmtp(smtpUrl);
    // Texte au registre des gabarits (Socle LOT-03, DC-26). La v2 ne porte
    // plus ni titre ni note (2026-10-23) : l'échéance et l'adresse seules.
    const gabarit = rendreGabarit(getGabarit('file_envoi'), {
      dateInfo: rendreSegment('dateLimite', dateLimite),
      portalUrl,
    });
    await transporter.sendMail({
      from: '"Wellneuro" <noreply@wellneuro.fr>',
      to: emailPatient,
      subject: gabarit.sujet,
      text: gabarit.corps,
    });
    await journaliserCorrespondancePatient({ ...trace, statut: 'Envoye' });
  } catch (erreur) {
    await journaliserCorrespondancePatient({ ...trace, statut: 'Erreur', erreur });
    throw erreur;
  }
}
