// Export PDF du dossier patient (D-252) — l'assemblage serveur.
//
// Seul module de l'export qui lit la base : il transforme les lignes Prisma en
// entrées de sections (`modele.ts`), et masque les textes libres de la version
// « IA externe » en un seul point, avant que les sections ne les lisent.
//
// L'APPARTENANCE N'EST PAS VÉRIFIÉE ICI : la route la porte avant l'appel, et
// la journalise. Deux gardes pour une même question finissent par diverger.

import { prisma } from '@/lib/prisma';
import { AGENDA_ALI_ID, resolveJoursActifs } from '@/lib/agenda-alimentaire';
import { listJours } from '@/lib/agenda-alimentaire/persistence';
import { AGENDA_SOMMEIL_ID, listNuits, resolveNuitsActives } from '@/lib/agenda-sommeil/persistence';
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
import { QUESTIONNAIRE_CATALOGUE } from '@/lib/questions';
import { instrumentAFormeVariable } from '@/lib/questionnaires/alimentaire';
import {
  avertissementSyntheseAnterieure,
  motifNonInterpretable,
  scoresSansMesure,
} from '@/lib/scoring/passationsNonInterpretables';
import { statutExcluDuRaisonnement } from '@/lib/scoring/validite';
import { creerMasqueur, masquerConsultation, masquerPassation, masquerSynthese } from './masquage';
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
import { avertissementInstrumentCabinetModifie } from './reponsesExport';
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

type DefinitionLue = { definition: QuestionnaireDef | null; modifieeLe: Date | null };

// Rien ne fige, à la passation, la définition d'un instrument du cabinet :
// l'éditeur renumérote ses items à chaque enregistrement. Sa date de dernière
// modification est le seul repère qui dise si la lecture reste fidèle.
async function lireDefinition(idQuestionnaire: string, praticienEmail: string): Promise<DefinitionLue> {
  const definition = await resolveDefinition(idQuestionnaire, { praticienEmail, inclureNonPublies: true });
  if (!definition?.cabinet) return { definition, modifieeLe: null };
  // Propriété déjà vérifiée par `resolveDefinition` (null sinon).
  const instrument = await prisma.cabinetInstrument.findUnique({
    where: { idInstrument: idQuestionnaire },
    select: { updatedAt: true },
  });
  return { definition, modifieeLe: instrument?.updatedAt ?? null };
}

type LecteurDefinitions = (idQuestionnaire: string) => Promise<DefinitionLue>;

/** Une lecture par instrument, partagée entre passations et envois sans réponse. */
function lecteurDefinitions(praticienEmail: string): LecteurDefinitions {
  const definitions = new Map<string, Promise<DefinitionLue>>();
  return idQuestionnaire => {
    let definition = definitions.get(idQuestionnaire);
    if (!definition) {
      definition = idQuestionnaire === 'Q_PLAINTES'
        ? Promise.resolve({ definition: QUESTIONNAIRE_PLAINTES_LECTURE, modifieeLe: null })
        : lireDefinition(idQuestionnaire, praticienEmail);
      definitions.set(idQuestionnaire, definition);
    }
    return definition;
  };
}

// Le titre d'un instrument est celui de sa DÉFINITION, jamais le titre
// enregistré avec l'envoi ou la réponse : celui-là se saisit librement à
// l'envoi (« Bilan de Mme … ») et sortirait comme un texte fixe, ni masqué ni
// cité. Sans définition, l'identifiant seul.
async function titreCanonique(idQuestionnaire: string, definitionPourLecture: LecteurDefinitions): Promise<string> {
  return (await definitionPourLecture(idQuestionnaire)).definition?.titre ?? '';
}

// Une passation non interprétable ne lit pas sa définition (retirée) : son
// titre vient du catalogue statique, sans rien de la version reconstruite.
const CATALOGUE: Readonly<Record<string, { titre: string } | undefined>> = QUESTIONNAIRE_CATALOGUE;

async function lirePassations(
  lignes: LignePassation[],
  definitionPourLecture: LecteurDefinitions,
): Promise<PassationExport[]> {
  const courantes = idsPassationsCourantes(lignes);

  return Promise.all(lignes.map(async (r): Promise<PassationExport> => {
    const nonInterpretable = motifNonInterpretable(r.idQuestionnaire, r.dateReponse);
    const commun = {
      idReponse: r.idReponse,
      idQuestionnaire: r.idQuestionnaire,
      titre: nonInterpretable
        ? CATALOGUE[r.idQuestionnaire]?.titre ?? ''
        : await titreCanonique(r.idQuestionnaire, definitionPourLecture),
      dateReponse: r.dateReponse,
      statutValidite: r.statutValidite,
      invalideLe: r.invalideLe,
      motifInvalidation: r.motifInvalidation,
      courante: courantes.has(r.idReponse),
    };
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
    const { definition, modifieeLe } = await definitionPourLecture(r.idQuestionnaire);
    return {
      ...commun,
      scores: r.idQuestionnaire === 'Q_PLAINTES' ? scoresPlaintes(scores) : scores,
      scorePrincipal: r.scorePrincipal,
      interpretation: r.interpretation,
      nonInterpretable: null,
      definition,
      definitionRetiree: false,
      // Posée, la réserve suspend la traduction : codes bruts sous elle.
      avertissementLecture:
        modifieeLe && modifieeLe.getTime() > r.dateReponse.getTime()
          ? avertissementInstrumentCabinetModifie(modifieeLe)
          : null,
    };
  }));
}

type LigneAssignation = { idAssignation: string; idQuestionnaire: string };

// Le MESSAGE seul, comme la route de l'agenda : jamais l'objet d'erreur, qui
// peut porter la ligne lue. Un rejet qui n'est pas une Error n'est pas
// converti : il pourrait être la ligne elle-même, ou lever à la conversion.
function journaliserRecueilIllisible(idQuestionnaire: string, err: unknown): void {
  console.error(
    `[export-dossier] recueil ${idQuestionnaire} illisible :`,
    err instanceof Error ? err.message : 'erreur non standard',
  );
}

/**
 * Un agenda n'a de réponse qu'à sa clôture ; avant, ses nuits ou journées
 * existent sans que l'assignation change. Compte des saisies ACTIVES (têtes de
 * chaîne, comme l'écran praticien), null quand rien n'est saisi.
 */
async function recueilAgendaEnCours(
  idPatient: string,
  a: LigneAssignation,
): Promise<AssignationSansReponseExport['recueilEnCours']> {
  // Une saisie illisible ne se tait pas : l'export dit « nombre inconnu »,
  // jamais un compte amputé ni « sans réponse », et n'échoue pas en entier.
  // Même règle que la clôture, qui refuse, et que l'écran praticien, qui
  // affiche la quarantaine. Le sommeil lève sur une nuit illisible ;
  // l'alimentaire met la journée en quarantaine SANS lever (`illisibles`).
  if (a.idQuestionnaire === AGENDA_SOMMEIL_ID) {
    try {
      const saisies = resolveNuitsActives(await listNuits(idPatient, a.idAssignation)).length;
      return saisies > 0 ? { saisies, unite: 'nuit' } : null;
    } catch (err) {
      journaliserRecueilIllisible(a.idQuestionnaire, err);
      return { saisies: null, unite: 'nuit' };
    }
  }
  if (a.idQuestionnaire === AGENDA_ALI_ID) {
    try {
      const lecture = await listJours(idPatient, a.idAssignation);
      if (lecture.illisibles > 0) return { saisies: null, unite: 'journée' };
      const saisies = resolveJoursActifs(lecture.jours).length;
      return saisies > 0 ? { saisies, unite: 'journée' } : null;
    } catch (err) {
      journaliserRecueilIllisible(a.idQuestionnaire, err);
      return { saisies: null, unite: 'journée' };
    }
  }
  return null;
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

  const definitionPourLecture = lecteurDefinitions(praticienEmail);
  const passations = await lirePassations(passationsDb, definitionPourLecture);

  const assignationsRepondues = new Set(
    passationsDb.map(p => p.idAssignation).filter((id): id is string => Boolean(id)),
  );
  const sansReponse: AssignationSansReponseExport[] = await Promise.all(assignationsDb
    .filter(a => a.statut !== 'Complété' && !assignationsRepondues.has(a.idAssignation))
    .map(async a => {
      const envoi: AssignationSansReponseExport = {
        idQuestionnaire: a.idQuestionnaire,
        titre: await titreCanonique(a.idQuestionnaire, definitionPourLecture),
        statut: a.statut,
        dateAssignation: a.dateAssignation,
        dateLimite: a.dateLimite,
      };
      const recueil = await recueilAgendaEnCours(idPatient, a);
      return recueil ? { ...envoi, recueilEnCours: recueil } : envoi;
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

  // Version « IA externe » : les TEXTES LIBRES sont masqués ici, avant
  // qu'aucune section ne les lise ; les textes fixes (catalogue, consignes,
  // préambule) ne le sont jamais.
  const masquer = version === 'ia-externe' ? creerMasqueur(patient) : null;

  const titre = `Dossier patient ${patient.idPatient}`;
  return {
    titre,
    sousTitre: version === 'ia-externe'
      ? 'Version pseudonymisée pour une IA externe'
      : "Version complète — contient l'identité du patient",
    mentionPied: `${patient.idPatient} · ${version === 'ia-externe' ? 'version pseudonymisée' : 'version complète'} · exporté le ${dateHeureFr(maintenant)}`,
    metadonnees: { titre, sujet: 'Dossier de neuronutrition exporté depuis WellNeuro' },
    blocs: [
      ...sectionPerimetre(version, maintenant),
      ...sectionAdministrative(patient, version, maintenant),
      ...sectionRenseignements(
        masquer ? consultations.map(c => masquerConsultation(c, masquer)) : consultations,
        porteuse?.idConsultation ?? null,
      ),
      ...sectionQuestionnaires(masquer ? passations.map(p => masquerPassation(p, masquer)) : passations, sansReponse),
      ...sectionSynthese(synthese && masquer ? masquerSynthese(synthese, masquer) : synthese, brouillonPlusRecent),
    ],
  };
}
