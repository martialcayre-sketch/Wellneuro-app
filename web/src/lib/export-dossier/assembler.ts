// Export PDF du dossier patient (D-252) — l'assemblage serveur.
//
// Seul module de l'export qui lit la base : il transforme les lignes Prisma en
// entrées de sections (`modele.ts`), puis applique le masquage de la version
// « IA externe » au document ENTIER, en un seul point.
//
// L'APPARTENANCE N'EST PAS VÉRIFIÉE ICI : la route la porte avant l'appel, et
// la journalise. Deux gardes pour une même question finissent par diverger.

import { prisma } from '@/lib/prisma';
import { derniereReponseParQuestionnaire, type ReponseOrientation } from '@/lib/clinical/orientationEngine';
import { normaliserAnamnese } from '@/lib/consultation/anamnese';
import {
  ORDRE_CONSULTATION_PORTEUSE,
  whereConsultationPorteuse,
} from '@/lib/consultation/consultationPorteuse';
import { normaliserFiche } from '@/lib/consultation/fiche';
import { dateJourParis } from '@/lib/dateParis';
import { STATUTS_SYNTHESE_VALIDES } from '@/lib/documents/types';
import { resolveDefinition } from '@/lib/instruments';
import { QUESTIONNAIRE_PLAINTES_LECTURE } from '@/lib/plaintes';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { instrumentAFormeVariable } from '@/lib/questionnaires/alimentaire';
import {
  avertissementSyntheseAnterieure,
  motifNonInterpretable,
  scoresSansMesure,
} from '@/lib/scoring/passationsNonInterpretables';
import { statutExcluDuRaisonnement } from '@/lib/scoring/validite';
import { creerMasqueur, masquerDocument } from './masquage';
import {
  dateHeureFr,
  type AssignationSansReponseExport,
  type ConsultationExport,
  type DocumentExport,
  type PassationExport,
  type PatientExport,
  type SyntheseExport,
  type VersionExport,
} from './modele';
import { sectionAdministrative } from './sectionAdministrative';
import { sectionPerimetre } from './sectionPerimetre';
import { sectionQuestionnaires } from './sectionQuestionnaires';
import { sectionRenseignements } from './sectionRenseignements';
import { sectionSynthese } from './sectionSynthese';

const STATUTS_BROUILLON = ['Brouillon_IA', 'Brouillon_Praticien'];

type LignePassation = {
  idReponse: string;
  idAssignation: string | null;
  idQuestionnaire: string;
  titre: string;
  dateReponse: Date;
  scoresJson: unknown;
  scorePrincipal: number | null;
  interpretation: string | null;
  statutValidite: string;
  invalideLe: Date | null;
  motifInvalidation: string | null;
};

function objetOuNull(valeur: unknown): Record<string, unknown> | null {
  return typeof valeur === 'object' && valeur !== null && !Array.isArray(valeur)
    ? (valeur as Record<string, unknown>)
    : null;
}

// Q_PLAINTES n'a pas de définition de scoring : la soumission a stocké
// `{ error: 'Questionnaire introuvable', rawAnswers }`. Cette erreur n'est pas
// un résultat, et le lecteur de l'export ne doit pas la prendre pour un.
function scoresPlaintes(scores: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!scores || !('error' in scores)) return scores;
  const copie = { ...scores };
  delete copie.error;
  return copie;
}

/**
 * Passation courante par instrument — même sélection que la génération de
 * synthèse (`synthese/generation.ts`) : jamais une passation écartée, et aucune
 * pour un identifiant à forme variable qui en porte plusieurs exploitables.
 */
function idsPassationsCourantes(lignes: LignePassation[]): Set<string> {
  const exploitables = lignes.filter(r => !statutExcluDuRaisonnement(r.statutValidite));
  const courantes = derniereReponseParQuestionnaire(
    exploitables.map(r => ({
      idQuestionnaire: r.idQuestionnaire,
      dateReponse: r.dateReponse.toISOString(),
      idReponse: r.idReponse,
      scores: (r.scoresJson ?? {}) as ReponseOrientation['scores'],
    })),
  );
  const nombreExploitables = new Map<string, number>();
  for (const r of exploitables) {
    nombreExploitables.set(r.idQuestionnaire, (nombreExploitables.get(r.idQuestionnaire) ?? 0) + 1);
  }
  const ids = new Set<string>();
  for (const [idQuestionnaire, reponse] of courantes) {
    const ambigu = instrumentAFormeVariable(idQuestionnaire)
      && (nombreExploitables.get(idQuestionnaire) ?? 0) > 1;
    if (!ambigu && reponse.idReponse) ids.add(reponse.idReponse);
  }
  return ids;
}

async function lirePassations(
  lignes: LignePassation[],
  praticienEmail: string,
): Promise<PassationExport[]> {
  const definitions = new Map<string, Promise<QuestionnaireDef | null>>();
  const definitionPourLecture = (idQuestionnaire: string): Promise<QuestionnaireDef | null> => {
    let definition = definitions.get(idQuestionnaire);
    if (!definition) {
      definition = idQuestionnaire === 'Q_PLAINTES'
        ? Promise.resolve(QUESTIONNAIRE_PLAINTES_LECTURE)
        : resolveDefinition(idQuestionnaire, { praticienEmail, inclureNonPublies: true });
      definitions.set(idQuestionnaire, definition);
    }
    return definition;
  };
  const courantes = idsPassationsCourantes(lignes);

  return Promise.all(lignes.map(async (r): Promise<PassationExport> => {
    const commun = {
      idReponse: r.idReponse,
      idQuestionnaire: r.idQuestionnaire,
      titre: r.titre,
      dateReponse: r.dateReponse,
      statutValidite: r.statutValidite,
      invalideLe: r.invalideLe,
      motifInvalidation: r.motifInvalidation,
      courante: courantes.has(r.idReponse),
    };
    const nonInterpretable = motifNonInterpretable(r.idQuestionnaire, r.dateReponse);
    if (nonInterpretable) {
      // Même retrait que la fiche et l'inbox : sans définition, pas de
      // libellés de la version reconstruite plaqués sur d'anciennes réponses.
      return {
        ...commun,
        scores: scoresSansMesure(r.scoresJson),
        scorePrincipal: null,
        interpretation: null,
        nonInterpretable,
        definition: null,
        definitionRetiree: true,
      };
    }
    const scores = objetOuNull(r.scoresJson);
    return {
      ...commun,
      scores: r.idQuestionnaire === 'Q_PLAINTES' ? scoresPlaintes(scores) : scores,
      scorePrincipal: r.scorePrincipal,
      interpretation: r.interpretation,
      nonInterpretable: null,
      definition: await definitionPourLecture(r.idQuestionnaire),
      definitionRetiree: false,
    };
  }));
}

export function nomFichierExport(idPatient: string, version: VersionExport, maintenant: Date): string {
  return `dossier-${idPatient}-${version === 'ia-externe' ? 'ia-externe' : 'complet'}-${dateJourParis(maintenant)}.pdf`;
}

export async function assemblerDossierExport(params: {
  idPatient: string;
  praticienEmail: string;
  version: VersionExport;
  maintenant: Date;
}): Promise<DocumentExport | null> {
  const { idPatient, praticienEmail, version, maintenant } = params;

  const patient: PatientExport | null = await prisma.patient.findUnique({
    where: { idPatient },
    select: {
      idPatient: true,
      prenom: true,
      nom: true,
      dateNaissance: true,
      email: true,
      telephone: true,
      adresse: true,
      nir: true,
      medecinTraitantNom: true,
      medecinTraitantCoordonnees: true,
      actif: true,
      suiviClotureLe: true,
      accessTokenRevoked: true,
      createdAt: true,
    },
  });
  if (!patient) return null;

  const [consultationsDb, porteuse, passationsDb, assignationsDb, validee] = await Promise.all([
    prisma.consultation.findMany({
      where: { idPatient },
      orderBy: { createdAt: 'desc' },
      select: {
        idConsultation: true,
        statut: true,
        motif: true,
        createdAt: true,
        dateValidation: true,
        consentement: true,
        consentementHorodatage: true,
        consentementVersion: true,
        finaliteConsentement: true,
        ficheSignaletique: true,
        anamnese: true,
      },
    }),
    prisma.consultation.findFirst({
      where: whereConsultationPorteuse(idPatient),
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
      select: { idConsultation: true },
    }),
    // Par idPatient, jamais par e-mail : l'e-mail d'un patient peut changer.
    prisma.questionnaireReponse.findMany({
      where: { idPatient },
      orderBy: { dateReponse: 'desc' },
      select: {
        idReponse: true,
        idAssignation: true,
        idQuestionnaire: true,
        titre: true,
        dateReponse: true,
        scoresJson: true,
        scorePrincipal: true,
        interpretation: true,
        statutValidite: true,
        invalideLe: true,
        motifInvalidation: true,
      },
    }),
    prisma.assignation.findMany({
      where: { idPatient },
      orderBy: { dateAssignation: 'desc' },
      select: {
        idAssignation: true,
        idQuestionnaire: true,
        titre: true,
        statut: true,
        dateAssignation: true,
        dateLimite: true,
      },
    }),
    prisma.syntheseIA.findFirst({
      where: { idPatient, statut: { in: [...STATUTS_SYNTHESE_VALIDES] } },
      orderBy: [{ dateValidation: { sort: 'desc', nulls: 'last' } }, { dateGeneration: 'desc' }],
      select: {
        idSynthese: true,
        statut: true,
        dateGeneration: true,
        dateValidation: true,
        modele: true,
        syntheseJson: true,
        notesPraticien: true,
      },
    }),
  ]);

  const brouillonPlusRecent = await prisma.syntheseIA.findFirst({
    where: {
      idPatient,
      statut: { in: STATUTS_BROUILLON },
      ...(validee ? { dateGeneration: { gt: validee.dateGeneration } } : {}),
    },
    orderBy: { dateGeneration: 'desc' },
    select: { statut: true, dateGeneration: true },
  });

  const consultations: ConsultationExport[] = consultationsDb.map(c => ({
    ...c,
    ficheSignaletique: c.ficheSignaletique == null ? null : normaliserFiche(c.ficheSignaletique),
    anamnese: c.anamnese == null ? null : normaliserAnamnese(c.anamnese),
  }));

  const passations = await lirePassations(passationsDb, praticienEmail);

  const assignationsRepondues = new Set(
    passationsDb.map(p => p.idAssignation).filter((id): id is string => Boolean(id)),
  );
  const sansReponse: AssignationSansReponseExport[] = assignationsDb
    .filter(a => a.statut !== 'Complété' && !assignationsRepondues.has(a.idAssignation))
    .map(a => ({
      idQuestionnaire: a.idQuestionnaire,
      titre: a.titre,
      statut: a.statut,
      dateAssignation: a.dateAssignation,
      dateLimite: a.dateLimite,
    }));

  const synthese: SyntheseExport | null = validee
    ? {
        ...validee,
        avertissementMesureRetiree: avertissementSyntheseAnterieure(
          [...new Set(passationsDb.map(p => p.idQuestionnaire))],
          validee.dateGeneration,
        ),
      }
    : null;

  const titre = `Dossier patient ${patient.idPatient}`;
  const document: DocumentExport = {
    titre,
    sousTitre: version === 'ia-externe'
      ? 'Version pseudonymisée pour une IA externe'
      : "Version complète — contient l'identité du patient",
    mentionPied: `${patient.idPatient} · ${version === 'ia-externe' ? 'version pseudonymisée' : 'version complète'} · exporté le ${dateHeureFr(maintenant)}`,
    metadonnees: { titre, sujet: 'Dossier de neuronutrition exporté depuis WellNeuro' },
    blocs: [
      ...sectionPerimetre(version, maintenant),
      ...sectionAdministrative(patient, version, maintenant),
      ...sectionRenseignements(consultations, porteuse?.idConsultation ?? null),
      ...sectionQuestionnaires(passations, sansReponse),
      ...sectionSynthese(synthese, brouillonPlusRecent),
    ],
  };

  return version === 'ia-externe' ? masquerDocument(document, creerMasqueur(patient)) : document;
}
