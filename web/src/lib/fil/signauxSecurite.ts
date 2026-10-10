import { prisma } from '@/lib/prisma';
import { filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import {
  ORDRE_CONSULTATION_PORTEUSE,
  whereConsultationsPorteuses,
} from '@/lib/consultation/consultationPorteuse';
import {
  constatsSecuriteOuverts,
  reponsesSecuriteDeclarees,
  signauxDeclares,
  type PassationSecuriteRow,
} from '@/lib/clinical-engine/safetyFindings';
import { QUESTIONNAIRES_SECURITE } from '@/lib/clinical/safetyQuestionnaireV1';
import { lireCouverturesAdressageGroupees } from '@/lib/clinical-engine/adressagesSignalAlertePrisma';
import { lireEffetsIndesirablesGroupes } from '@/lib/clinical-engine/effetsIndesirablesPrisma';
import type { SignalSecuriteRow } from './cartes';

// SIGNAUX DE SÉCURITÉ OUVERTS DE LA PATIENTÈLE — [[D-275]] §3.
//
// LES MÊMES ENTRÉES QUE LA CHAÎNE C1, LUES EN GROUPE. La chaîne lit, par
// dossier, l'anamnèse de la consultation porteuse, les couvertures d'adressage
// posées sur CETTE consultation, les signalements d'effet indésirable et les
// réponses aux questions sur le suicide ([[D-275]] §2) ; puis
// `construireSafetyFindings` et `partitionnerConstatsAdresses` disent ce qui
// reste ouvert. Ce module lit les mêmes quatre sources pour tous les dossiers
// à la fois et passe par `constatsSecuriteOuverts`, la composition de ces deux
// fonctions : aucune règle n'est réécrite ici.
//
// PORTÉE : dossiers actifs du praticien dont le suivi est OUVERT. Un dossier
// clos ne peut plus recevoir de lettre d'adressage (`accepteNouvelEnvoi`), et
// une carte que rien ne peut éteindre ne serait que du bruit. Un dossier sans
// consultation porteuse n'a pas d'anamnèse qui fasse foi, donc aucun signal
// déclaré — mais ses signalements d'effet indésirable sont lus quand même,
// comme le fait le cockpit.

export async function lireSignauxSecuriteOuverts(email: string): Promise<SignalSecuriteRow[]> {
  const dossiers = { actif: true, suiviClotureLe: null, ...filtrePatientsDuPraticien(email) };
  const consultations = await prisma.consultation.findMany({
    where: whereConsultationsPorteuses(dossiers),
    select: { id: true, idPatient: true, anamnese: true, dateValidation: true },
    orderBy: ORDRE_CONSULTATION_PORTEUSE,
  });
  // Trié par `ORDRE_CONSULTATION_PORTEUSE` : la première ligne d'un dossier est
  // celle que `whereConsultationPorteuse` lui aurait rendue.
  const porteuses = new Map<string, (typeof consultations)[number]>();
  for (const consultation of consultations) {
    if (!porteuses.has(consultation.idPatient)) porteuses.set(consultation.idPatient, consultation);
  }

  const [couvertures, effets, passations] = await Promise.all([
    lireCouverturesAdressageGroupees(
      new Map([...porteuses].map(([idPatient, porteuse]) => [idPatient, porteuse.id])),
    ),
    lireEffetsIndesirablesGroupes(dossiers),
    // Les seuls questionnaires que la table lit : la sélection est celle de la
    // chaîne, et `reponsesSecuriteDeclarees` applique le même filtre de validité.
    prisma.questionnaireReponse.findMany({
      where: { idQuestionnaire: { in: [...QUESTIONNAIRES_SECURITE] }, patient: dossiers },
      select: {
        idPatient: true,
        idReponse: true,
        idQuestionnaire: true,
        dateReponse: true,
        scoresJson: true,
        statutValidite: true,
      },
    }),
  ]);
  const passationsParDossier = new Map<string, PassationSecuriteRow[]>();
  for (const passation of passations) {
    const liste = passationsParDossier.get(passation.idPatient);
    if (liste) liste.push(passation);
    else passationsParDossier.set(passation.idPatient, [passation]);
  }

  const lignes: SignalSecuriteRow[] = [];
  const idPatients = [...new Set([
    ...porteuses.keys(),
    ...(effets?.keys() ?? []),
    ...passationsParDossier.keys(),
  ])].sort();
  for (const idPatient of idPatients) {
    const porteuse = porteuses.get(idPatient);
    const ouverts = constatsSecuriteOuverts(
      // Sans porteuse, aucune anamnèse ne fait foi : `signauxDeclares(null)`
      // rend `[]`, exactement ce que la chaîne reçoit.
      signauxDeclares(porteuse?.anamnese ?? null),
      // `undefined` garde son sens d'un bout à l'autre : dispositif éteint,
      // aucune lecture. Une lecture qui a eu lieu sans ligne rend `[]`.
      effets ? effets.get(idPatient) ?? [] : undefined,
      reponsesSecuriteDeclarees(passationsParDossier.get(idPatient) ?? []),
      couvertures ? couvertures.get(idPatient) ?? [] : undefined,
    );
    if (ouverts.length === 0) continue;
    lignes.push({
      idPatient,
      findingIds: ouverts.map(constat => constat.findingId).sort(),
      depuis: porteuse?.dateValidation ?? null,
    });
  }
  return lignes;
}
