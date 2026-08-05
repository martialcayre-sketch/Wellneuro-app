import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resolveDefinition } from '@/lib/instruments';
import { isDeadlineExpired } from '@/lib/patient-access';
import { isSessionAuthorizedForAssignment, readPatientSession } from '@/lib/patient-session';
import { getRendererPourDefinition, type DefinitionServie, type RendererProfile } from '@/lib/questionnaire-display';

export type PatientQuestionnaireResponse =
  // `renderer` est décidé ICI, sur la définition réellement servie : le client
  // ne voit pas les variables d'environnement, et `Q_ALI_01` a deux formes.
  //
  // `consentementPossible` est décidé ici POUR LA MÊME RAISON DE FOND, mais
  // celle-ci tient au FUSEAU et non au drapeau : voir le calcul plus bas.
  | {
      ok: true;
      assignation: AssignationInfo;
      questionnaire: unknown;
      renderer: RendererProfile;
      /**
       * Le patient peut-il ENCORE enregistrer son consentement sur cette
       * assignation ? Un verdict, pas une donnée dérivable côté client.
       *
       * Miroir exact du refus 410 de `api/patient/consentement` (route.ts:71) :
       * l'écran qui affiche le `ConsentScreen` sait donc, AVANT de le proposer,
       * si le geste aboutira.
       */
      consentementPossible: boolean;
    }
  | { ok: false; reason: 'not_found' | 'expired' | 'invalid' | 'annulee' | 'exception'; error: string };

export type AssignationInfo = {
  idAssignation: string;
  idPatient: string;
  emailPatient: string;
  idQuestionnaire: string;
  titre: string;
  dateLimite: string | null;
  notes: string | null;
  statut: string;
  consentement: string;
  statutReponses: string;
};

// GET /api/patient/questionnaire?id=ASS...&email=...
export async function GET(req: Request): Promise<NextResponse<PatientQuestionnaireResponse>> {
  try {
    const { searchParams } = new URL(req.url);
    const idAssignation = (searchParams.get('id') ?? '').trim();
    // Identité : cookie de session portail en priorité, sinon email en query
    // (compat liens email legacy /patient/[idAssignation]).
    const patientSession = readPatientSession(req);
    const emailRaw = (patientSession?.email ?? searchParams.get('email') ?? '').trim().toLowerCase();

    if (!idAssignation || !/^[A-Za-z0-9_-]+$/.test(idAssignation) || idAssignation.length > 64) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Identifiant invalide.' }, { status: 400 });
    }
    if (!emailRaw || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailRaw)) {
      return NextResponse.json({ ok: false, reason: 'invalid', error: 'Email invalide.' }, { status: 400 });
    }

    const ass = await prisma.assignation.findUnique({ where: { idAssignation } });

    if (!ass) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Questionnaire introuvable. Vérifiez votre lien.' }, { status: 404 });
    }
    const accessAllowed = patientSession
      ? await isSessionAuthorizedForAssignment(patientSession, ass)
      : ass.emailPatient.toLowerCase() === emailRaw;
    if (!accessAllowed) {
      return NextResponse.json({ ok: false, reason: 'not_found', error: 'Adresse email non reconnue pour ce questionnaire.' }, { status: 404 });
    }
    // Assignation annulée par le praticien (Fil A) : indisponible. Refus dans la
    // route, pas seulement dans l'écran — un chemin patient oublié laisserait une
    // annulée remplissable (leçon des trois chemins d'assignation).
    if (ass.statut === 'Annulée') {
      return NextResponse.json({ ok: false, reason: 'annulee', error: 'Ce questionnaire a été annulé par votre praticien.' }, { status: 410 });
    }
    // La date limite ne bloque que le remplissage/modification, pas la consultation
    // des réponses déjà verrouillées (droit de consultation permanent, R8-lite).
    //
    // ── QUATRE PORTES, UNE SEULE RÈGLE — ET CELLE-CI OUVRE LES TROIS AUTRES ──
    // `deverrouille` est EXEMPTÉ ici comme il l'est dans
    // `api/patient/consentement` (route.ts:71), `api/patient/submit`
    // (route.ts:145) et la barrière « 7 bis » de
    // `lib/agenda-alimentaire/portail.ts`. Le bouton « déverrouiller » du
    // praticien repositionne `statutReponses` sans toucher à `dateLimite` : une
    // assignation délibérément rouverte après la date limite doit redevenir
    // remplissable, sinon le geste praticien ne produit rien.
    //
    // Cette porte-ci est la PREMIÈRE : c'est elle que l'écran appelle avant tout
    // le reste. Tant qu'elle refusait, l'exemption des trois autres était
    // INATTEIGNABLE DEPUIS L'UI — le hub affichait « Corriger », le clic rendait
    // 410, et personne n'atteignait jamais le consentement ni la soumission.
    // Elle décide donc de ce que les trois autres verront jamais : les quatre
    // doivent rester d'accord, et une exemption ajoutée à l'une seule d'entre
    // elles ne change rien tant qu'elle n'est pas ajoutée ICI.
    const bloqueParDeadline =
      ass.statutReponses !== 'verrouille'
      && ass.statutReponses !== 'modification_demandee'
      && ass.statutReponses !== 'deverrouille';
    if (bloqueParDeadline && isDeadlineExpired(ass.dateLimite)) {
      return NextResponse.json({ ok: false, reason: 'expired', error: 'Ce lien de questionnaire a expiré.' }, { status: 410 });
    }

    // Resolver commun catalogue/cabinet en mode passation : l'assignation
    // fait autorité — un instrument CAB_ déjà envoyé reste rendu même s'il a
    // été désactivé ou dépublié entre-temps. Un id sans définition (ligne
    // absente) rend null : l'écran « pas encore disponible » fait le reste.
    const questionnaire = await resolveDefinition(ass.idQuestionnaire, { pourPassation: true });

    const assignationInfo: AssignationInfo = {
      idAssignation: ass.idAssignation,
      idPatient: ass.idPatient,
      emailPatient: ass.emailPatient,
      idQuestionnaire: ass.idQuestionnaire,
      titre: ass.titre,
      dateLimite: ass.dateLimite ?? null,
      notes: ass.notes ?? null,
      statut: ass.statut,
      consentement: ass.consentement,
      statutReponses: ass.statutReponses,
    };

    // Le discriminant de la levée de gate est `scoring.maxTotal` — le barème
    // servi, et non un compte d'items : c'est lui qui porte déjà l'étiquette de
    // version du score et le `max` du besoin 1, donc une dérive y devient un
    // test rouge existant plutôt qu'un renderer qui change d'avis en silence.
    const renderer = getRendererPourDefinition(
      ass.idQuestionnaire,
      questionnaire as DefinitionServie,
    );

    // ── L'EXPIRATION SE CALCULE CÔTÉ SERVEUR, JAMAIS DANS L'ÉCRAN ────────────
    // `isDeadlineExpired` construit `new Date(`${dateLimite}T23:59:59.999`)
    // SANS fuseau : la chaîne est interprétée dans le fuseau de l'environnement
    // qui l'évalue. Évaluée par un composant `'use client'`, elle se lisait donc
    // dans le fuseau du NAVIGATEUR — à Paris l'été le client déclarait
    // l'expiration ~2 h avant le serveur, à l'ouest d'UTC plusieurs heures
    // après. Le TEXTE de la condition était bien celui de la route ; son
    // ÉVALUATION ne l'était pas, et c'est l'évaluation qui décide.
    //
    // Le champ dit ce qu'il DÉCIDE (le consentement est-il encore
    // enregistrable), pas ce dont il dérive (une date limite, un statut) :
    // l'écran n'a plus à recomposer la règle, donc plus à la faire diverger.
    // UN SEUL champ, délibérément — chaque booléen de plus est une règle de plus
    // à tenir d'accord entre la route et l'écran.
    const consentementPossible =
      ass.statutReponses === 'deverrouille' || !isDeadlineExpired(ass.dateLimite);

    return NextResponse.json({ ok: true, assignation: assignationInfo, questionnaire, renderer, consentementPossible });
  } catch (err) {
    console.error('[patient/questionnaire GET]', err instanceof Error ? err.message : String(err));
    return NextResponse.json({ ok: false, reason: 'exception', error: 'Erreur technique.' }, { status: 500 });
  }
}
