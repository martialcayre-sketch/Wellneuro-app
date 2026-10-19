import { prisma } from '@/lib/prisma';
import { filtrePatientsDuPraticien } from '@/lib/praticien/appartenance';
import {
  ORDRE_CONSULTATION_PORTEUSE,
  whereConsultationsPorteuses,
} from '@/lib/consultation/consultationPorteuse';
import {
  constatsSecuriteOuverts,
  findingIdQuestionnaire,
  reponsesSecuriteDeclarees,
  signauxDeclares,
  type PassationSecuriteRow,
  type ReponseSecurite,
} from '@/lib/clinical-engine/safetyFindings';
import { estFindingAnamnese, estFindingQuestionnaire } from '@/lib/clinical-engine/safetyFindingSource';
import type { SafetyFinding } from '@/lib/clinical-engine/types';
import { QUESTIONNAIRES_SECURITE } from '@/lib/clinical/safetyQuestionnaireV1';
import { lireCouverturesAdressageGroupees } from '@/lib/clinical-engine/adressagesSignalAlertePrisma';
import type { SignalSecuriteRow } from './cartes';

// SIGNAUX DE SÉCURITÉ OUVERTS DE LA PATIENTÈLE — [[D-275]] §3.
//
// LES MÊMES ENTRÉES QUE LA CHAÎNE C1, LUES EN GROUPE. La chaîne lit, par
// dossier, l'anamnèse de la consultation porteuse, les couvertures d'adressage
// posées sur CETTE consultation et les réponses aux questions sur le suicide
// ([[D-275]] §2) ; puis `construireSafetyFindings` et
// `partitionnerConstatsAdresses` disent ce qui reste ouvert. Les signalements
// d'effet indésirable n'en sont plus une source (D-281 §5, t29) : ils se
// comptent sur leur propre carte. Ce module lit les mêmes trois sources pour tous les dossiers
// à la fois et passe par `constatsSecuriteOuverts`, la composition de ces deux
// fonctions : aucune règle n'est réécrite ici.
//
// PORTÉE : dossiers actifs du praticien dont le suivi est OUVERT. Un dossier
// clos ne peut plus recevoir de lettre d'adressage (`accepteNouvelEnvoi`), et
// une carte que rien ne peut éteindre ne serait que du bruit. Un dossier sans
// consultation porteuse n'a pas d'anamnèse qui fasse foi, donc aucun signal
// déclaré — mais ses réponses aux questions sur le suicide sont lues quand
// même, comme le fait le cockpit.

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

  const [couvertures, passations] = await Promise.all([
    lireCouverturesAdressageGroupees(
      new Map([...porteuses].map(([idPatient, porteuse]) => [idPatient, porteuse.id])),
    ),
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
    ...passationsParDossier.keys(),
  ])].sort();
  for (const idPatient of idPatients) {
    const porteuse = porteuses.get(idPatient);
    const passationsDuDossier = passationsParDossier.get(idPatient) ?? [];
    const reponses = reponsesSecuriteDeclarees(passationsDuDossier);
    const ouverts = constatsSecuriteOuverts(
      // Sans porteuse, aucune anamnèse ne fait foi : `signauxDeclares(null)`
      // rend `[]`, exactement ce que la chaîne reçoit.
      signauxDeclares(porteuse?.anamnese ?? null),
      reponses,
      couvertures ? couvertures.get(idPatient) ?? [] : undefined,
    );
    if (ouverts.length === 0) continue;
    lignes.push({
      idPatient,
      findingIds: ouverts.map(constat => constat.findingId).sort(),
      depuis: depuisLePlusAncien(ouverts, reponses, passationsDuDossier, porteuse?.dateValidation ?? null),
    });
  }
  return lignes;
}

// DEPUIS QUAND LE DOSSIER ATTEND — reste de [[D-275]] (P2-4, dette t05). La
// date de la carte était celle de l'anamnèse porteuse, même quand seule une
// réponse aux questions sur le suicide était ouverte : un « oui » d'hier
// s'affichait à la date d'une validation vieille de plusieurs mois, et le tri
// « le plus ancien d'abord » le reléguait derrière lui. Chaque constat ouvert
// porte désormais SA date — la passation pour une réponse, la validation de
// la porteuse pour un signal déclaré — et la carte prend la plus ancienne.
// Aucun constat n'est ajouté ni retiré : seule la date affichée change.
function depuisLePlusAncien(
  ouverts: readonly SafetyFinding[],
  reponses: readonly ReponseSecurite[],
  passations: readonly PassationSecuriteRow[],
  validationPorteuse: Date | null,
): Date | null {
  const dateParReponse = new Map(passations.map(passation => [passation.idReponse, passation.dateReponse]));
  const dateParConstat = new Map(
    reponses.map(reponse => [findingIdQuestionnaire(reponse), dateParReponse.get(reponse.idReponse) ?? null]),
  );
  let plusAncienne: Date | null = null;
  for (const constat of ouverts) {
    const date = estFindingQuestionnaire(constat.findingId)
      ? dateParConstat.get(constat.findingId) ?? null
      : estFindingAnamnese(constat.findingId) ? validationPorteuse : null;
    if (date && (!plusAncienne || date < plusAncienne)) plusAncienne = date;
  }
  return plusAncienne;
}
