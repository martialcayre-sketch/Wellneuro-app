import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { PDFDocument } from 'pdf-lib';

// Assemblage serveur de l'export (D-252). La base est simulée : ce banc juge
// les LECTURES (par idPatient, jamais par e-mail), la préparation des entrées
// de section (définition retirée, passation courante, Q_PLAINTES, envois sans
// réponse, synthèse validée) et la pseudonymisation : textes libres masqués au
// point d'entrée, textes du catalogue intacts. Le rendu de chaque section est
// jugé par son propre banc.
const { prisma } = vi.hoisted(() => ({
  prisma: {
    patient: { findUnique: vi.fn() },
    consultation: { findMany: vi.fn(), findFirst: vi.fn() },
    questionnaireReponse: { findMany: vi.fn() },
    assignation: { findMany: vi.fn() },
    syntheseIA: { findFirst: vi.fn() },
    // Lus par les fonctions du domaine (listNuits, listJours) et pour les
    // instruments du cabinet — voir « lectures des agendas et du cabinet ».
    agendaSommeilNuit: { findMany: vi.fn() },
    agendaAlimentaireJour: { findMany: vi.fn() },
    cabinetInstrument: { findUnique: vi.fn() },
  },
}));

vi.mock('@/lib/prisma', () => ({ prisma }));
vi.mock('@/lib/instruments', async importOriginal => {
  const reel = await importOriginal<typeof import('@/lib/instruments')>();
  return { ...reel, resolveDefinition: vi.fn() };
});
vi.mock('./sectionRenseignements', async importOriginal => {
  const reel = await importOriginal<typeof import('./sectionRenseignements')>();
  return { sectionRenseignements: vi.fn(reel.sectionRenseignements) };
});
vi.mock('./sectionQuestionnaires', async importOriginal => {
  const reel = await importOriginal<typeof import('./sectionQuestionnaires')>();
  return { sectionQuestionnaires: vi.fn(reel.sectionQuestionnaires) };
});
vi.mock('./sectionSynthese', async importOriginal => {
  const reel = await importOriginal<typeof import('./sectionSynthese')>();
  return { sectionSynthese: vi.fn(reel.sectionSynthese) };
});

import { AGENDA_ALI_CONTRACT_VERSION } from '@/lib/agenda-alimentaire/types';
import { AGENDA_CONTRACT_VERSION } from '@/lib/agenda-sommeil/types';
import { ORDRE_CONSULTATION_PORTEUSE, whereConsultationPorteuse } from '@/lib/consultation/consultationPorteuse';
import { resolveDefinition } from '@/lib/instruments';
import { QUESTIONNAIRE_PLAINTES_LECTURE } from '@/lib/plaintes';
import type { QuestionnaireDef } from '@/lib/questionnaire-types';
import { AVERTISSEMENT_SYNTHESE_ANTERIEURE } from '@/lib/scoring/passationsNonInterpretables';
import { assemblerDossierExport, nomFichierExport } from './assembler';
import { creerMasqueur, MARQUE_MASQUE } from './masquage';
import type { DocumentExport, PassationExport, VersionExport } from './modele';
import { planifierPages, rendrePdf } from './pdf';
import { avertissementInstrumentCabinetModifie } from './reponsesExport';
import { sectionQuestionnaires } from './sectionQuestionnaires';
import { sectionRenseignements } from './sectionRenseignements';
import { sectionSynthese } from './sectionSynthese';

const espionRenseignements = vi.mocked(sectionRenseignements);
const espionQuestionnaires = vi.mocked(sectionQuestionnaires);
const espionSynthese = vi.mocked(sectionSynthese);
const espionDefinition = vi.mocked(resolveDefinition);

const MAINTENANT = new Date('2026-09-26T08:05:00.000Z');
const PRATICIEN = 'praticien@wellneuro.fr';

// Identité de fixture (CLAUDE.md) — aucune donnée réelle.
const PATIENT = {
  idPatient: 'PAT030',
  prenom: 'Sophie',
  nom: 'Nicola',
  dateNaissance: '1985-03-14',
  email: 'sophie.nicola@example.test',
  telephone: '06 12 34 56 78',
  adresse: '12 rue des Lilas, 69003 Lyon',
  nir: '299999999999999',
  medecinTraitantNom: 'Dr Jennifer Martin',
  medecinTraitantCoordonnees: 'Cabinet des Tilleuls, 04 78 00 00 00',
  actif: true,
  suiviClotureLe: null,
  accessTokenRevoked: false,
  createdAt: new Date('2026-08-01T09:00:00.000Z'),
};

const CONSULTATIONS = [
  {
    idConsultation: 'CONS_2',
    statut: 'en_cours',
    motif: null,
    createdAt: new Date('2026-09-05T09:00:00.000Z'),
    dateValidation: null,
    consentement: 'non_donne',
    consentementHorodatage: null,
    consentementVersion: null,
    finaliteConsentement: null,
    ficheSignaletique: null,
    anamnese: null,
  },
  {
    idConsultation: 'CONS_1',
    statut: 'validee',
    motif: 'fatigue',
    createdAt: new Date('2026-08-01T09:00:00.000Z'),
    dateValidation: new Date('2026-08-02T09:00:00.000Z'),
    consentement: 'donne',
    consentementHorodatage: new Date('2026-08-01T09:05:00.000Z'),
    consentementVersion: 'v1',
    finaliteConsentement: 'Suivi en neuronutrition',
    ficheSignaletique: {
      profession: 'Enseignante',
      particularites: 'Ma fille dit « Sophie Nicola » quand elle me gronde.',
      champ_inconnu: 'ne doit pas sortir',
    },
    anamnese: {
      motif_principal:
        'Je suis Sophie Nicola, née le 14/03/1985, fatiguée depuis mon arrivée au 12 rue des Lilas, 69003 Lyon.',
      declencheur: 'Le Dr Martin (Cabinet des Tilleuls) m’a écrit à sophie.nicola@example.test ; rappel au 0612345678.',
    },
  },
];

const DEFINITION_FICTIVE: QuestionnaireDef = {
  id: 'Q_FICTIF',
  titre: 'Questionnaire fictif',
  sections: [
    {
      id: 'A',
      titre: 'Humeur',
      questions: [
        {
          id: 'H1',
          texte: 'Vous sentez-vous triste ?',
          type: 'likert',
          options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Parfois' }, { v: 2, l: 'Souvent' }],
        },
      ],
    },
  ],
};

type LigneDb = {
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

function ligne(partielle: Partial<LigneDb> & Pick<LigneDb, 'idReponse' | 'idQuestionnaire' | 'dateReponse'>): LigneDb {
  return {
    idAssignation: null,
    titre: partielle.idQuestionnaire,
    scoresJson: {},
    scorePrincipal: null,
    interpretation: null,
    statutValidite: 'VALID',
    invalideLe: null,
    motifInvalidation: null,
    ...partielle,
  };
}

// Ordre de la base : `dateReponse` décroissante.
const PASSATIONS: LigneDb[] = [
  ligne({
    idReponse: 'R_PLAINTES',
    idQuestionnaire: 'Q_PLAINTES',
    titre: 'Plaintes',
    idAssignation: 'A_PLAINTES',
    dateReponse: new Date('2026-09-20T09:00:00.000Z'),
    scoresJson: { error: 'Questionnaire introuvable', rawAnswers: { fatigue: 7 } },
  }),
  ligne({
    idReponse: 'R_ALI_2',
    idQuestionnaire: 'Q_ALI_01',
    dateReponse: new Date('2026-09-18T09:00:00.000Z'),
    scoresJson: { rawAnswers: {} },
  }),
  ligne({
    idReponse: 'R_ALI_1',
    idQuestionnaire: 'Q_ALI_01',
    dateReponse: new Date('2026-09-02T09:00:00.000Z'),
    scoresJson: { rawAnswers: {} },
  }),
  ligne({
    idReponse: 'R_FICTIF_2',
    idQuestionnaire: 'Q_FICTIF',
    titre: 'Questionnaire fictif',
    idAssignation: 'A_FICTIF_2',
    dateReponse: new Date('2026-09-10T09:00:00.000Z'),
    scoresJson: {
      type: 'sum',
      total: 2,
      maxTotal: 2,
      rawAnswers: { H1: 2, COMMENTAIRE: 'Sophie Nicola, joignable au 06.12.34.56.78' },
    },
    scorePrincipal: 2,
    interpretation: 'Élevé',
    statutValidite: 'INVALID',
    invalideLe: new Date('2026-09-11T09:00:00.000Z'),
    motifInvalidation: 'Doublon saisi par Mme Nicola',
  }),
  ligne({
    idReponse: 'R_FICTIF_1',
    idQuestionnaire: 'Q_FICTIF',
    titre: 'Questionnaire fictif',
    dateReponse: new Date('2026-09-01T09:00:00.000Z'),
    scoresJson: { type: 'sum', total: 1, maxTotal: 2, rawAnswers: { H1: 1 } },
    scorePrincipal: 1,
    interpretation: 'Modéré',
  }),
  // Q_SOM_07 avant sa reconstruction (2026-07-31) : non interprétable.
  ligne({
    idReponse: 'R_MFI',
    idQuestionnaire: 'Q_SOM_07',
    titre: 'MFI-20',
    dateReponse: new Date('2026-07-21T08:00:00.000Z'),
    scoresJson: {
      type: 'sum',
      total: 45,
      maxTotal: 80,
      interpretation: { label: 'Fatigue notable' },
      rawAnswers: { M1: 2 },
    },
    scorePrincipal: 45,
    interpretation: 'Fatigue notable',
  }),
];

const ASSIGNATIONS = [
  {
    idAssignation: 'A_ATTENTE',
    idQuestionnaire: 'Q_SOM_03',
    titre: 'Questionnaire de Berlin',
    statut: 'En attente',
    dateAssignation: new Date('2026-09-21T09:00:00.000Z'),
    dateLimite: '2026-10-01',
  },
  {
    idAssignation: 'A_PLAINTES',
    idQuestionnaire: 'Q_PLAINTES',
    titre: 'Plaintes',
    statut: 'Complété',
    dateAssignation: new Date('2026-09-19T09:00:00.000Z'),
    dateLimite: null,
  },
  {
    // Statut resté « En attente » mais une passation la porte : pas « sans réponse ».
    idAssignation: 'A_FICTIF_2',
    idQuestionnaire: 'Q_FICTIF',
    titre: 'Questionnaire fictif',
    statut: 'En attente',
    dateAssignation: new Date('2026-09-09T09:00:00.000Z'),
    dateLimite: null,
  },
  {
    idAssignation: 'A_ANNULEE',
    idQuestionnaire: 'Q_DIG_01',
    titre: 'Questionnaire digestif',
    statut: 'Annulée',
    dateAssignation: new Date('2026-08-20T09:00:00.000Z'),
    dateLimite: null,
  },
];

const SYNTHESE_VALIDEE = {
  idSynthese: 'SYN_1',
  statut: 'Corrigee_Praticien',
  dateGeneration: new Date('2026-09-15T09:00:00.000Z'),
  dateValidation: new Date('2026-09-16T09:00:00.000Z'),
  modele: 'modele-ia-fictif',
  syntheseJson: {
    resume_praticien: 'Mme Nicola décrit une fatigue installée depuis son déménagement.',
    axes_prioritaires: [
      {
        axe: 'Sommeil',
        niveau_priorite: 'eleve',
        arguments: ['Réveils nocturnes rapportés par Sophie'],
        points_a_confirmer: ['Horaires de coucher'],
      },
    ],
    points_de_vigilance: ['Fatigue persistante'],
    questions_entretien: ['Depuis quand Sophie Nicola se réveille-t-elle la nuit ?'],
    narratif_patient: 'Sophie, votre fatigue mérite une attention particulière.',
    limites: 'Synthèse fondée sur les seules réponses déposées.',
  },
  notesPraticien: 'Rappeler Sophie Nicola au 06 12 34 56 78 ou écrire à sophie.nicola@example.test.',
};

const BROUILLON = { statut: 'Brouillon_IA', dateGeneration: new Date('2026-09-22T09:00:00.000Z') };

type WhereSynthese = { where: { statut: { in: string[] } } };

function brancherBase(options: { validee?: typeof SYNTHESE_VALIDEE | null; brouillon?: typeof BROUILLON | null } = {}) {
  const validee = options.validee === undefined ? SYNTHESE_VALIDEE : options.validee;
  const brouillon = options.brouillon === undefined ? BROUILLON : options.brouillon;
  prisma.patient.findUnique.mockResolvedValue(PATIENT);
  prisma.consultation.findMany.mockResolvedValue(CONSULTATIONS);
  prisma.consultation.findFirst.mockResolvedValue({ idConsultation: 'CONS_1' });
  prisma.questionnaireReponse.findMany.mockResolvedValue(PASSATIONS);
  prisma.assignation.findMany.mockResolvedValue(ASSIGNATIONS);
  prisma.syntheseIA.findFirst.mockImplementation(async (args: WhereSynthese) =>
    args.where.statut.in.includes('Validee_Praticien') ? validee : brouillon,
  );
}

function assembler(version: VersionExport): Promise<DocumentExport | null> {
  return assemblerDossierExport({ idPatient: 'PAT030', praticienEmail: PRATICIEN, version, maintenant: MAINTENANT });
}

async function assemblerOuEchouer(version: VersionExport): Promise<DocumentExport> {
  const doc = await assembler(version);
  if (!doc) throw new Error('document attendu');
  return doc;
}

/** Tous les textes du document, sans exception : en-tête, pied, métadonnées, blocs. */
function textes(doc: DocumentExport): string[] {
  const tous = [doc.titre, doc.sousTitre, doc.mentionPied, doc.metadonnees.titre, doc.metadonnees.sujet];
  for (const bloc of doc.blocs) {
    switch (bloc.type) {
      case 'titre':
      case 'paragraphe':
        tous.push(bloc.texte);
        break;
      case 'champ':
        tous.push(bloc.libelle, bloc.valeur);
        break;
      case 'liste':
        tous.push(...bloc.elements);
        break;
      case 'espace':
        break;
    }
  }
  return tous;
}

function sansAccents(texte: string): string {
  return texte.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

/** Occurrence en mot entier, casse et accents indifférents. */
function contientMot(texte: string, mot: string): boolean {
  const echappe = sansAccents(mot).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}\\p{N}])${echappe}(?![\\p{L}\\p{N}])`, 'u').test(sansAccents(texte));
}

function chiffres(texte: string): string {
  return texte.replace(/[\s.\-]/g, '');
}

function passationsTransmises(): PassationExport[] {
  expect(espionQuestionnaires).toHaveBeenCalledTimes(1);
  return espionQuestionnaires.mock.calls[0][0];
}

function passation(idReponse: string): PassationExport {
  const trouvee = passationsTransmises().find(p => p.idReponse === idReponse);
  if (!trouvee) throw new Error(`passation ${idReponse} absente`);
  return trouvee;
}

describe('assemblerDossierExport — lectures', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    espionDefinition.mockResolvedValue({ ...DEFINITION_FICTIVE, cabinet: false });
    brancherBase();
  });

  it('patient introuvable : null, et rien d’autre n’est lu', async () => {
    prisma.patient.findUnique.mockResolvedValue(null);
    expect(await assembler('ia-externe')).toBeNull();
    expect(prisma.questionnaireReponse.findMany).not.toHaveBeenCalled();
    expect(prisma.consultation.findMany).not.toHaveBeenCalled();
    expect(prisma.syntheseIA.findFirst).not.toHaveBeenCalled();
  });

  it('lit tout par idPatient — jamais par e-mail, jamais par praticien', async () => {
    await assembler('complete');
    expect(prisma.patient.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT030' } }),
    );
    expect(prisma.questionnaireReponse.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT030' }, orderBy: { dateReponse: 'desc' } }),
    );
    expect(prisma.consultation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT030' }, orderBy: { createdAt: 'desc' } }),
    );
    expect(prisma.assignation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { idPatient: 'PAT030' }, orderBy: { dateAssignation: 'desc' } }),
    );
  });

  it('la consultation qui fait foi passe par la sélection partagée', async () => {
    await assembler('complete');
    expect(prisma.consultation.findFirst).toHaveBeenCalledWith({
      where: whereConsultationPorteuse('PAT030'),
      orderBy: ORDRE_CONSULTATION_PORTEUSE,
      select: { idConsultation: true },
    });
    const [consultations, porteuse] = espionRenseignements.mock.calls[0];
    expect(porteuse).toBe('CONS_1');
    expect(consultations.map(c => c.idConsultation)).toEqual(['CONS_2', 'CONS_1']);
  });

  it('fiche et anamnèse : normalisées quand elles existent, null quand rien n’a été déposé', async () => {
    await assembler('complete');
    const [consultations] = espionRenseignements.mock.calls[0];
    expect(consultations[0].ficheSignaletique).toBeNull();
    expect(consultations[0].anamnese).toBeNull();
    // `normaliserFiche` ne garde que les champs connus.
    expect(consultations[1].ficheSignaletique).toEqual({
      profession: 'Enseignante',
      particularites: 'Ma fille dit « Sophie Nicola » quand elle me gronde.',
    });
    expect(consultations[1].anamnese).toMatchObject({ motif_principal: expect.stringContaining('fatiguée') });
  });
});

describe('assemblerDossierExport — passations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    espionDefinition.mockResolvedValue({ ...DEFINITION_FICTIVE, cabinet: false });
    brancherBase();
  });

  it('transmet toutes les passations, dans l’ordre de la base', async () => {
    await assembler('complete');
    expect(passationsTransmises().map(p => p.idReponse)).toEqual(PASSATIONS.map(p => p.idReponse));
  });

  it('passation non interprétable : définition retirée, scores réduits aux réponses brutes', async () => {
    await assembler('complete');
    expect(passation('R_MFI')).toMatchObject({
      scores: { rawAnswers: { M1: 2 } },
      scorePrincipal: null,
      interpretation: null,
      definition: null,
      definitionRetiree: true,
      nonInterpretable: expect.any(String),
    });
    // Aucune définition résolue pour elle : les libellés reconstruits ne se
    // plaquent pas sur d'anciennes réponses.
    expect(espionDefinition.mock.calls.map(appel => appel[0])).not.toContain('Q_SOM_07');
  });

  it('passation interprétable : scores, score principal et interprétation intacts', async () => {
    await assembler('complete');
    expect(passation('R_FICTIF_1')).toMatchObject({
      scores: { type: 'sum', total: 1, maxTotal: 2, rawAnswers: { H1: 1 } },
      scorePrincipal: 1,
      interpretation: 'Modéré',
      nonInterpretable: null,
      definitionRetiree: false,
      definition: expect.objectContaining({ id: 'Q_FICTIF' }),
    });
    expect(passation('R_FICTIF_2')).toMatchObject({
      statutValidite: 'INVALID',
      invalideLe: new Date('2026-09-11T09:00:00.000Z'),
      motifInvalidation: 'Doublon saisi par Mme Nicola',
    });
  });

  it('Q_PLAINTES : lue par sa définition d’affichage, sans la clé « error » de la soumission', async () => {
    const doc = await assemblerOuEchouer('complete');
    const plaintes = passation('R_PLAINTES');
    expect(plaintes.definition).toBe(QUESTIONNAIRE_PLAINTES_LECTURE);
    expect(plaintes.scores).toEqual({ rawAnswers: { fatigue: 7 } });
    expect(espionDefinition.mock.calls.map(appel => appel[0])).not.toContain('Q_PLAINTES');
    expect(textes(doc).join('\n')).not.toContain('Questionnaire introuvable');
  });

  it('résout chaque définition une seule fois, côté praticien, brouillons du cabinet compris', async () => {
    await assembler('complete');
    const pourFictif = espionDefinition.mock.calls.filter(appel => appel[0] === 'Q_FICTIF');
    expect(pourFictif).toEqual([['Q_FICTIF', { praticienEmail: PRATICIEN, inclureNonPublies: true }]]);
  });

  it('passation courante : la plus récente NON écartée, jamais une passation invalidée', async () => {
    await assembler('complete');
    expect(passation('R_FICTIF_2').courante).toBe(false);
    expect(passation('R_FICTIF_1').courante).toBe(true);
    expect(passation('R_PLAINTES').courante).toBe(true);
    expect(passation('R_MFI').courante).toBe(true);
  });

  it('instrument à forme variable avec plusieurs passations exploitables : aucune n’est courante', async () => {
    await assembler('complete');
    expect(passation('R_ALI_2').courante).toBe(false);
    expect(passation('R_ALI_1').courante).toBe(false);
  });

  it('forme variable dont une seule passation reste exploitable : celle-là est courante', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue(
      PASSATIONS.map(p => (p.idReponse === 'R_ALI_2' ? { ...p, statutValidite: 'SUPERSEDED' } : p)),
    );
    await assembler('complete');
    expect(passation('R_ALI_2').courante).toBe(false);
    expect(passation('R_ALI_1').courante).toBe(true);
  });

  it('envois sans réponse : ni complétés, ni déjà rattachés à une passation', async () => {
    await assembler('complete');
    const [, sansReponse] = espionQuestionnaires.mock.calls[0];
    expect(sansReponse).toEqual([
      {
        idQuestionnaire: 'Q_SOM_03',
        titre: 'Questionnaire de Berlin',
        statut: 'En attente',
        dateAssignation: new Date('2026-09-21T09:00:00.000Z'),
        dateLimite: '2026-10-01',
      },
      {
        idQuestionnaire: 'Q_DIG_01',
        titre: 'Questionnaire digestif',
        statut: 'Annulée',
        dateAssignation: new Date('2026-08-20T09:00:00.000Z'),
        dateLimite: null,
      },
    ]);
  });
});

describe('assemblerDossierExport — lectures des agendas et du cabinet', () => {
  const NUIT = { heureCoucher: '23:00', heureLever: '07:00', latence: 'lt15', qualite: 4 };
  const JOUR = {
    prises: [{ heure: '07:30', nature: 'repas' }, { heure: '19:30', nature: 'repas' }],
    premierePriseProteines: true,
    legumesDeuxPrises: true,
    fruitsOuOleagineux: false,
    ultraTransformes: false,
  };

  function nuit(id: string, dateNuit: string, supersedesNuitId: string | null = null) {
    return {
      id,
      idPatient: 'PAT030',
      idAssignation: 'A_SOM',
      dateNuit,
      reponses: { contractVersion: AGENDA_CONTRACT_VERSION, ...NUIT },
      canal: 'portail',
      supersedesNuitId,
      soumisLe: new Date(`${dateNuit}T07:00:00.000Z`),
    };
  }

  function jour(
    id: string,
    dateJour: string,
    options: { contractVersion?: string; supersedesJourId?: string | null } = {},
  ) {
    return {
      id,
      idPatient: 'PAT030',
      idAssignation: 'A_ALI',
      dateJour,
      reponses: { contractVersion: options.contractVersion ?? AGENDA_ALI_CONTRACT_VERSION, ...JOUR },
      canal: 'portail',
      supersedesJourId: options.supersedesJourId ?? null,
      soumisLe: new Date(`${dateJour}T20:00:00.000Z`),
    };
  }

  /** Journée écrite sous un contrat que la lecture ne connaît pas (ex. après un rollback) : `listJours` la met en quarantaine. */
  const CONTRAT_INCONNU = 'agenda-alimentaire-v9';

  const NUITS = [
    nuit('N1', '2026-09-06'),
    nuit('N2', '2026-09-07'),
    // Correction de la nuit du 07 : une seule nuit active pour cette date.
    nuit('N3', '2026-09-07', 'N2'),
  ];
  const JOURS = [
    jour('J1', '2026-09-08'),
    jour('J2', '2026-09-09'),
    // Correction de la journée du 09 : une seule journée active pour cette date.
    jour('J3', '2026-09-09', { supersedesJourId: 'J2' }),
  ];

  const ENVOI = { statut: 'En attente', dateLimite: null };
  const AGENDAS = [
    { ...ENVOI, idAssignation: 'A_SOM', idQuestionnaire: 'Q_SOM_09', titre: 'Agenda du sommeil — 21 nuits', dateAssignation: new Date('2026-09-05T09:00:00.000Z') },
    { ...ENVOI, idAssignation: 'A_ALI', idQuestionnaire: 'Q_ALI_09', titre: 'Agenda alimentaire — 21 jours', dateAssignation: new Date('2026-09-07T09:00:00.000Z') },
    { ...ENVOI, idAssignation: 'A_SOM_VIDE', idQuestionnaire: 'Q_SOM_09', titre: 'Agenda du sommeil — 21 nuits', dateAssignation: new Date('2026-09-04T09:00:00.000Z') },
    { ...ENVOI, idAssignation: 'A_SOM_CLOS', idQuestionnaire: 'Q_SOM_09', titre: 'Agenda du sommeil — 21 nuits', statut: 'Complété', dateAssignation: new Date('2026-08-01T09:00:00.000Z') },
  ];

  type WhereAgenda = { where: { idPatient: string; idAssignation?: string } };

  const DEF_CAB: QuestionnaireDef = {
    id: 'CAB_TEST',
    titre: 'Instrument du cabinet',
    sections: [
      {
        id: 'S1',
        questions: [
          { id: 'Q1', texte: 'Troubles du sommeil', type: 'likert', options: [{ v: 0, l: 'Jamais' }, { v: 3, l: 'Toujours' }] },
        ],
      },
    ],
  };
  const PASSATIONS_CAB = [
    ligne({ idReponse: 'R_CAB_2', idQuestionnaire: 'CAB_TEST', dateReponse: new Date('2026-09-12T09:00:00.000Z'), scoresJson: { rawAnswers: { Q1: 0 } } }),
    ligne({ idReponse: 'R_CAB_1', idQuestionnaire: 'CAB_TEST', dateReponse: new Date('2026-09-03T09:00:00.000Z'), scoresJson: { rawAnswers: { Q1: 3 } } }),
  ];

  let espionErreur: MockInstance<typeof console.error>;

  afterEach(() => {
    espionErreur.mockRestore();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    espionErreur = vi.spyOn(console, 'error').mockImplementation(() => {});
    espionDefinition.mockImplementation(async (id: string) =>
      id === 'CAB_TEST' ? { ...DEF_CAB, cabinet: true } : { ...DEFINITION_FICTIVE, cabinet: false },
    );
    brancherBase();
    prisma.assignation.findMany.mockResolvedValue([...AGENDAS, ...ASSIGNATIONS]);
    prisma.agendaSommeilNuit.findMany.mockImplementation(async ({ where }: WhereAgenda) =>
      NUITS.filter(n => n.idPatient === where.idPatient && n.idAssignation === where.idAssignation),
    );
    prisma.agendaAlimentaireJour.findMany.mockImplementation(async ({ where }: WhereAgenda) =>
      JOURS.filter(j => j.idPatient === where.idPatient && j.idAssignation === where.idAssignation),
    );
    prisma.cabinetInstrument.findUnique.mockResolvedValue({ updatedAt: new Date('2026-09-08T09:00:00.000Z') });
  });

  it('agenda en cours : les saisies ACTIVES sont comptées, bornées au patient et à l’assignation (constat 11)', async () => {
    await assembler('complete');
    const [, sansReponse] = espionQuestionnaires.mock.calls[0];
    const agendas = sansReponse.filter(a => a.idQuestionnaire === 'Q_SOM_09' || a.idQuestionnaire === 'Q_ALI_09');
    expect(agendas).toEqual([
      { ...ENVOI, idQuestionnaire: 'Q_SOM_09', titre: 'Agenda du sommeil — 21 nuits', dateAssignation: AGENDAS[0].dateAssignation, recueilEnCours: { saisies: 2, unite: 'nuit' } },
      { ...ENVOI, idQuestionnaire: 'Q_ALI_09', titre: 'Agenda alimentaire — 21 jours', dateAssignation: AGENDAS[1].dateAssignation, recueilEnCours: { saisies: 2, unite: 'journée' } },
      // Rien de saisi : un envoi sans réponse ordinaire.
      { ...ENVOI, idQuestionnaire: 'Q_SOM_09', titre: 'Agenda du sommeil — 21 nuits', dateAssignation: AGENDAS[2].dateAssignation },
    ]);
    const lecturesNuits = prisma.agendaSommeilNuit.findMany.mock.calls.map(([args]) => (args as WhereAgenda).where);
    expect(lecturesNuits).toEqual([
      { idPatient: 'PAT030', idAssignation: 'A_SOM' },
      { idPatient: 'PAT030', idAssignation: 'A_SOM_VIDE' },
    ]);
    expect(prisma.agendaAlimentaireJour.findMany.mock.calls.map(([args]) => (args as WhereAgenda).where)).toEqual([
      { idPatient: 'PAT030', idAssignation: 'A_ALI' },
    ]);
  });

  /** Lignes « envoyés et non soumis » d'un instrument. */
  function lignesEnvoi(doc: DocumentExport, idQuestionnaire: string): string[] {
    return textes(doc).filter(t => t.includes(`(${idQuestionnaire}) — `));
  }

  const ALI_INCONNU =
    'Agenda alimentaire — 21 jours (Q_ALI_09) — recueil en cours : journées saisies en nombre inconnu (lecture impossible), agenda non clôturé — envoyé le 07/09/2026';
  const SOM_INCONNU =
    'Agenda du sommeil — 21 nuits (Q_SOM_09) — recueil en cours : nuits saisies en nombre inconnu (lecture impossible), agenda non clôturé — envoyé le 05/09/2026';

  it('agenda alimentaire dont une journée est en quarantaine : nombre inconnu, jamais un compte amputé (NF3, N7)', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue([
      ...JOURS,
      jour('J4', '2026-09-10', { contractVersion: CONTRAT_INCONNU }),
    ]);
    const doc = await assemblerOuEchouer('complete');
    const [, sansReponse] = espionQuestionnaires.mock.calls[0];
    expect(sansReponse.find(a => a.idQuestionnaire === 'Q_ALI_09')?.recueilEnCours).toEqual({ saisies: null, unite: 'journée' });
    expect(lignesEnvoi(doc, 'Q_ALI_09')).toEqual([ALI_INCONNU]);
    // `listJours` ne lève pas sur une journée illisible : c'est son compte
    // `illisibles` qui est lu, pas une erreur rattrapée.
    expect(espionErreur).not.toHaveBeenCalled();
  });

  it('agenda alimentaire dont TOUTES les journées sont illisibles : « nombre inconnu », jamais « En attente » (N14)', async () => {
    prisma.agendaAlimentaireJour.findMany.mockResolvedValue(
      JOURS.map(j => ({ ...j, reponses: { ...j.reponses, contractVersion: CONTRAT_INCONNU } })),
    );
    const doc = await assemblerOuEchouer('complete');
    expect(lignesEnvoi(doc, 'Q_ALI_09')).toEqual([ALI_INCONNU]);
    expect(textes(doc).join('\n')).not.toContain('Agenda alimentaire — 21 jours (Q_ALI_09) — En attente');
  });

  it('nuit du sommeil au contenu illisible (réponses rejetées à la relecture) : nombre inconnu, message seul journalisé', async () => {
    const illisible = { ...nuit('N4', '2026-09-08'), reponses: { contractVersion: AGENDA_CONTRACT_VERSION, ...NUIT, qualite: 42 } };
    prisma.agendaSommeilNuit.findMany.mockImplementation(async ({ where }: WhereAgenda) =>
      [...NUITS, illisible].filter(n => n.idPatient === where.idPatient && n.idAssignation === where.idAssignation),
    );
    const doc = await assemblerOuEchouer('complete');
    const [, sansReponse] = espionQuestionnaires.mock.calls[0];
    expect(sansReponse.find(a => a.idQuestionnaire === 'Q_SOM_09')?.recueilEnCours).toEqual({ saisies: null, unite: 'nuit' });
    expect(lignesEnvoi(doc, 'Q_SOM_09')).toContain(SOM_INCONNU);
    expect(espionErreur.mock.calls).toEqual([
      ['[export-dossier] recueil Q_SOM_09 illisible :', 'Valeur invalide pour « qualité de la nuit ».'],
    ]);
  });

  it('base indisponible pendant la lecture des agendas (requête rejetée) : nombre inconnu, message seul journalisé, export maintenu', async () => {
    prisma.agendaSommeilNuit.findMany.mockRejectedValue(new Error('base indisponible'));
    prisma.agendaAlimentaireJour.findMany.mockRejectedValue(new Error('base indisponible'));
    const doc = await assemblerOuEchouer('complete');
    const [, sansReponse] = espionQuestionnaires.mock.calls[0];
    expect(sansReponse.find(a => a.idQuestionnaire === 'Q_SOM_09')?.recueilEnCours).toEqual({ saisies: null, unite: 'nuit' });
    expect(sansReponse.find(a => a.idQuestionnaire === 'Q_ALI_09')?.recueilEnCours).toEqual({ saisies: null, unite: 'journée' });
    expect(lignesEnvoi(doc, 'Q_SOM_09')).toContain(SOM_INCONNU);
    expect(lignesEnvoi(doc, 'Q_ALI_09')).toEqual([ALI_INCONNU]);
    // Le MESSAGE seul, jamais l'objet d'erreur : une ligne par lecture rejetée.
    expect(espionErreur.mock.calls.map(appel => appel.join(' ')).sort()).toEqual([
      '[export-dossier] recueil Q_ALI_09 illisible : base indisponible',
      '[export-dossier] recueil Q_SOM_09 illisible : base indisponible',
      '[export-dossier] recueil Q_SOM_09 illisible : base indisponible',
    ]);
    expect(espionErreur.mock.calls.flat().every(argument => typeof argument === 'string')).toBe(true);
  });

  it('rejet qui n’est pas une Error (chaîne, objet sans prototype) : rien de son contenu journalisé, export maintenu', async () => {
    prisma.agendaSommeilNuit.findMany.mockRejectedValue('texte Sophie Nicola 06 12 34 56 78');
    prisma.agendaAlimentaireJour.findMany.mockRejectedValue(Object.create(null));
    const doc = await assemblerOuEchouer('complete');
    expect(lignesEnvoi(doc, 'Q_SOM_09')).toContain(SOM_INCONNU);
    expect(lignesEnvoi(doc, 'Q_ALI_09')).toEqual([ALI_INCONNU]);
    const journal = espionErreur.mock.calls.map(appel => appel.join(' '));
    expect(journal.length).toBeGreaterThan(0);
    for (const ligne of journal) expect(ligne).toMatch(/illisible : erreur non standard$/);
  });

  it('agenda en cours : le document ne le dit jamais « sans réponse »', async () => {
    const doc = await assemblerOuEchouer('complete');
    const joint = textes(doc).join('\n');
    expect(joint).toContain(
      'Agenda du sommeil — 21 nuits (Q_SOM_09) — recueil en cours : 2 nuits saisies, agenda non clôturé — envoyé le 05/09/2026',
    );
    expect(joint).toContain('Agenda alimentaire — 21 jours (Q_ALI_09) — recueil en cours : 2 journées saisies, agenda non clôturé');
    expect(joint).not.toContain('Questionnaires envoyés sans réponse');
    expect(joint).toContain("les saisies d'un agenda non clôturé ne figurent pas dans ce document.");
  });

  it('instrument du cabinet modifié APRÈS une passation : réserve de lecture sur celle-là seulement (constat 12)', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([...PASSATIONS_CAB, ...PASSATIONS]);
    const doc = await assemblerOuEchouer('complete');
    const reserve = avertissementInstrumentCabinetModifie(new Date('2026-09-08T09:00:00.000Z'));
    expect(passation('R_CAB_1').avertissementLecture).toBe(reserve);
    expect(passation('R_CAB_2').avertissementLecture).toBeNull();
    // Une seule lecture par instrument, par sa clé unique, après la garde de propriété de `resolveDefinition`.
    expect(prisma.cabinetInstrument.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.cabinetInstrument.findUnique).toHaveBeenCalledWith({
      where: { idInstrument: 'CAB_TEST' },
      select: { updatedAt: true },
    });
    expect(textes(doc)).toContain(reserve);
  });

  it('instrument du cabinet modifié APRÈS une passation : ses réponses ne sont pas traduites par la définition actuelle (NF4)', async () => {
    prisma.questionnaireReponse.findMany.mockResolvedValue([...PASSATIONS_CAB, ...PASSATIONS]);
    const reserve = avertissementInstrumentCabinetModifie(new Date('2026-09-08T09:00:00.000Z'));
    for (const version of ['complete', 'ia-externe'] as const) {
      const { blocs } = await assemblerOuEchouer(version);
      // Codes bruts sous la réserve — jamais « Toujours » sous « Troubles du sommeil ».
      const i = blocs.findIndex(b => b.type === 'paragraphe' && b.texte === reserve);
      expect(blocs[i + 1], version).toEqual({ type: 'liste', elements: ['« Q1 » : 3'] });
      expect(blocs, version).not.toContainEqual({ type: 'champ', libelle: 'Troubles du sommeil', valeur: 'Toujours' });
      // La passation postérieure à la modification se lit par la définition actuelle.
      expect(blocs, version).toContainEqual({ type: 'champ', libelle: 'Troubles du sommeil', valeur: 'Jamais' });
    }
  });

  it('instrument du catalogue : aucune lecture du cabinet, aucune réserve', async () => {
    await assembler('complete');
    expect(prisma.cabinetInstrument.findUnique).not.toHaveBeenCalled();
    expect(passationsTransmises().every(p => !p.avertissementLecture)).toBe(true);
  });

  it('instrument du cabinet introuvable pour ce praticien : ni lecture de date, ni réserve inventée', async () => {
    espionDefinition.mockResolvedValue(null);
    prisma.questionnaireReponse.findMany.mockResolvedValue(PASSATIONS_CAB);
    await assembler('complete');
    expect(prisma.cabinetInstrument.findUnique).not.toHaveBeenCalled();
    expect(passation('R_CAB_1')).toMatchObject({ definition: null, avertissementLecture: null });
  });
});

describe('assemblerDossierExport — synthèse', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    espionDefinition.mockResolvedValue({ ...DEFINITION_FICTIVE, cabinet: false });
  });

  it('prend la dernière synthèse VALIDÉE, triée par validation (nulls en dernier) puis génération', async () => {
    brancherBase();
    await assembler('complete');
    expect(prisma.syntheseIA.findFirst).toHaveBeenNthCalledWith(1, {
      where: { idPatient: 'PAT030', statut: { in: ['Validee_Praticien', 'Corrigee_Praticien'] } },
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
    });
    const [synthese] = espionSynthese.mock.calls[0];
    expect(synthese).toEqual({ ...SYNTHESE_VALIDEE, avertissementMesureRetiree: null });
  });

  it('signale un brouillon PLUS RÉCENT que la synthèse validée', async () => {
    brancherBase();
    await assembler('complete');
    expect(prisma.syntheseIA.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        idPatient: 'PAT030',
        statut: { in: ['Brouillon_IA', 'Brouillon_Praticien'] },
        dateGeneration: { gt: SYNTHESE_VALIDEE.dateGeneration },
      },
      orderBy: { dateGeneration: 'desc' },
      select: { statut: true, dateGeneration: true },
    });
    const [, brouillon] = espionSynthese.mock.calls[0];
    expect(brouillon).toEqual(BROUILLON);
  });

  it('synthèse rédigée avant le retrait d’une mesure du dossier : avertissement transmis', async () => {
    brancherBase({ validee: { ...SYNTHESE_VALIDEE, dateGeneration: new Date('2026-07-20T09:00:00.000Z') } });
    await assembler('complete');
    const [synthese] = espionSynthese.mock.calls[0];
    expect(synthese?.avertissementMesureRetiree).toBe(AVERTISSEMENT_SYNTHESE_ANTERIEURE);
  });

  it('aucune synthèse validée : brouillon cherché sans borne de date, section sans synthèse', async () => {
    brancherBase({ validee: null });
    const doc = await assemblerOuEchouer('complete');
    expect(prisma.syntheseIA.findFirst).toHaveBeenNthCalledWith(2, {
      where: { idPatient: 'PAT030', statut: { in: ['Brouillon_IA', 'Brouillon_Praticien'] } },
      orderBy: { dateGeneration: 'desc' },
      select: { statut: true, dateGeneration: true },
    });
    expect(espionSynthese).toHaveBeenCalledWith(null, BROUILLON);
    expect(textes(doc)).toContain("Aucune synthèse n'a encore été validée par le praticien.");
  });

  it('aucune synthèse du tout : ni validée ni brouillon', async () => {
    brancherBase({ validee: null, brouillon: null });
    await assembler('complete');
    expect(espionSynthese).toHaveBeenCalledWith(null, null);
  });
});

describe('assemblerDossierExport — document', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    espionDefinition.mockResolvedValue({ ...DEFINITION_FICTIVE, cabinet: false });
    brancherBase();
  });

  it('les quatre sections suivent le préambule, dans l’ordre', async () => {
    const doc = await assemblerOuEchouer('complete');
    const titres1 = doc.blocs.flatMap(b => (b.type === 'titre' && b.niveau === 1 ? [b.texte] : []));
    expect(titres1).toEqual([
      "À lire avant d'utiliser ce document",
      '1. Renseignements administratifs',
      '2. Fiche signalétique et anamnèse',
      '3. Réponses aux questionnaires',
      '4. Dernière synthèse validée',
    ]);
  });

  it('version ia-externe : en-tête, pied et métadonnées sans identité', async () => {
    const doc = await assemblerOuEchouer('ia-externe');
    expect(doc.titre).toBe('Dossier patient PAT030');
    expect(doc.sousTitre).toBe('Version pseudonymisée pour une IA externe');
    expect(doc.mentionPied).toBe('PAT030 · version pseudonymisée · exporté le 26/09/2026 à 10:05');
    expect(doc.metadonnees).toEqual({
      titre: 'Dossier patient PAT030',
      sujet: 'Dossier de neuronutrition exporté depuis WellNeuro',
    });
  });

  it('version complete : en-tête et pied annoncent la version complète', async () => {
    const doc = await assemblerOuEchouer('complete');
    expect(doc.titre).toBe('Dossier patient PAT030');
    expect(doc.sousTitre).toBe("Version complète — contient l'identité du patient");
    expect(doc.mentionPied).toBe('PAT030 · version complète · exporté le 26/09/2026 à 10:05');
  });

  it('version ia-externe : AUCUNE valeur identifiante dans AUCUN texte du document', async () => {
    const doc = await assemblerOuEchouer('ia-externe');
    const tous = textes(doc);
    const fautifs: string[] = [];
    for (const texte of tous) {
      for (const mot of ['Sophie', 'Nicola', 'Jennifer', 'Martin', 'Lilas', 'Tilleuls']) {
        if (contientMot(texte, mot)) fautifs.push(`« ${mot} » dans : ${texte}`);
      }
      for (const valeur of [
        'sophie.nicola@example.test',
        '12 rue des Lilas, 69003 Lyon',
        '69003',
        '14/03/1985',
        '1985-03-14',
      ]) {
        if (sansAccents(texte).includes(sansAccents(valeur))) fautifs.push(`« ${valeur} » dans : ${texte}`);
      }
      for (const suite of ['0612345678', '299999999999999', '0478000000']) {
        if (chiffres(texte).includes(suite)) fautifs.push(`« ${suite} » dans : ${texte}`);
      }
    }
    expect(fautifs).toEqual([]);

    // Le masquage a bien mordu (anti-vacuité) : l'anamnèse, la note, la réponse
    // libre et le motif d'invalidation portaient tous l'identité.
    expect(tous.filter(texte => texte.includes(MARQUE_MASQUE)).length).toBeGreaterThanOrEqual(5);
    // L'identifiant, lui, reste : c'est la clé que le praticien retrouve.
    expect(tous.some(texte => texte.includes('PAT030'))).toBe(true);
  });

  it('version complete : les valeurs identifiantes sont présentes, rien n’est masqué', async () => {
    const doc = await assemblerOuEchouer('complete');
    const joint = textes(doc).join('\n');
    for (const valeur of [
      'Sophie',
      'Nicola',
      'sophie.nicola@example.test',
      '06 12 34 56 78',
      '299999999999999',
      '12 rue des Lilas, 69003 Lyon',
      '14/03/1985',
      'Dr Jennifer Martin',
      'Cabinet des Tilleuls, 04 78 00 00 00',
    ]) {
      expect(joint, valeur).toContain(valeur);
    }
    expect(joint).not.toContain(MARQUE_MASQUE);
  });

  it('le document assemblé se rend en PDF valide, dans les deux versions', async () => {
    for (const version of ['ia-externe', 'complete'] as const) {
      const doc = await assemblerOuEchouer(version);
      const octets = await rendrePdf(doc, { maintenant: MAINTENANT });
      expect(new TextDecoder('latin1').decode(octets.slice(0, 5))).toBe('%PDF-');
      const relu = await PDFDocument.load(octets);
      expect(relu.getTitle()).toBe('Dossier patient PAT030');
      expect(relu.getPageCount()).toBeGreaterThan(1);
    }
  });

  it('le texte mis en page de la version ia-externe ne porte aucun nom', async () => {
    const doc = await assemblerOuEchouer('ia-externe');
    const lignes = (await planifierPages(doc)).flat().map(l => l.texte).join('\n');
    expect(lignes).toContain('PAT030');
    for (const mot of ['Sophie', 'Nicola', 'Jennifer', 'Martin']) {
      expect(contientMot(lignes, mot), mot).toBe(false);
    }
  });
});

describe('assemblerDossierExport — masquage des textes libres', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    espionDefinition.mockResolvedValue({ ...DEFINITION_FICTIVE, cabinet: false });
    brancherBase();
  });

  // Patiente de fixture Jennifer Martin : une option du catalogue porte son nom.
  const DEFINITION_OISEAUX: QuestionnaireDef = {
    id: 'Q_FICTIF',
    titre: 'Questionnaire fictif',
    sections: [
      {
        id: 'A',
        titre: 'Oiseaux',
        questions: [
          {
            id: 'O1',
            texte: 'Quel oiseau avez-vous observé ?',
            type: 'likert',
            options: [{ v: 1, l: 'Martin-pêcheur' }, { v: 2, l: 'Merle' }],
          },
          { id: 'O2', texte: 'Combien de martins-pêcheurs ?', type: 'number' },
        ],
      },
    ],
  };

  it('un libellé du catalogue qui porte le nom reste intact ; le même nom dans un texte libre est masqué', async () => {
    const jennifer = {
      ...PATIENT,
      prenom: 'Jennifer',
      nom: 'Martin',
      email: 'jennifer.martin@example.test',
      medecinTraitantNom: 'Dr Michel Dogné',
    };
    prisma.patient.findUnique.mockResolvedValue(jennifer);
    prisma.consultation.findMany.mockResolvedValue([
      { ...CONSULTATIONS[1], ficheSignaletique: null, anamnese: { motif_principal: 'Mme Martin dort mal.' } },
    ]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      ligne({
        idReponse: 'R_OISEAU',
        idQuestionnaire: 'Q_FICTIF',
        titre: 'Questionnaire fictif',
        dateReponse: new Date('2026-09-10T09:00:00.000Z'),
        scoresJson: { rawAnswers: { O1: 1, REMARQUE: 'Vu avec Jennifer Martin' } },
      }),
    ]);
    espionDefinition.mockResolvedValue({ ...DEFINITION_OISEAUX, cabinet: false });
    // Témoin : appliqué au libellé, le masqueur l'effacerait.
    expect(creerMasqueur(jennifer)('Martin-pêcheur')).not.toBe('Martin-pêcheur');

    const doc = await assemblerOuEchouer('ia-externe');
    expect(doc.blocs).toContainEqual({ type: 'champ', libelle: 'Quel oiseau avez-vous observé ?', valeur: 'Martin-pêcheur' });
    expect(doc.blocs).toContainEqual(expect.objectContaining({ type: 'champ', libelle: 'Combien de martins-pêcheurs ?' }));
    const joint = textes(doc).join('\n');
    expect(joint).toContain(`Mme ${MARQUE_MASQUE} dort mal.`);
    expect(joint).toContain(`Vu avec ${MARQUE_MASQUE} ${MARQUE_MASQUE}`);
    expect(joint).not.toContain('Mme Martin');
    expect(joint).not.toContain('Jennifer');
  });

  // Noms D'EMPRUNT, fictifs, choisis pour leurs lettres : aucun ne désigne un patient.
  const pleineChasse = (texte: string) =>
    texte.replace(/[A-Za-z]/g, lettre => String.fromCharCode(lettre.charCodeAt(0) + 0xfee0));
  const sansDiacritique = (texte: string) =>
    texte.normalize('NFD').replace(/\p{M}/gu, '').replace(/ł/g, 'l').replace(/Ł/g, 'L');
  const formes = (texte: string) => [
    texte.normalize('NFC'),
    texte.normalize('NFD'),
    sansDiacritique(texte),
    texte.normalize('NFC').toUpperCase(),
    // Césure conditionnelle, espace sans chasse, ligatures.
    texte.replace(/(\p{L}{2})(\p{L})/gu, '$1\u{AD}$2'),
    texte.replace(/(\p{L}{3})(\p{L})/gu, '$1\u{200B}$2'),
    texte.replace(/ff/g, '\u{FB00}').replace(/fi/g, '\u{FB01}'),
    pleineChasse(sansDiacritique(texte)),
  ];

  it.each([
    ['Ana', 'Petrović', ['petrovic']],
    ['Thị Hương', 'Nguyễn', ['huong', 'nguyen']],
    ['Mirela', 'Kovačević', ['mirela', 'kovacevic']],
    ['Ioana', 'Stănescu', ['ioana', 'stanescu']],
    ['Łukasz', 'Dvořák-Černý', ['ukasz', 'dvorak', 'cerny']],
    ['Joffrey', 'Lafitte', ['joffrey', 'lafitte']],
  ])('%s %s, sous toutes ses formes : rien ne ressort des lignes du PDF', async (prenom, nom, temoins) => {
    prisma.patient.findUnique.mockResolvedValue({ ...PATIENT, prenom, nom });
    const cite = formes(`${prenom} ${nom}`).join(' ; ');
    prisma.consultation.findMany.mockResolvedValue([
      { ...CONSULTATIONS[1], ficheSignaletique: { particularites: cite }, anamnese: { motif_principal: cite } },
    ]);
    prisma.questionnaireReponse.findMany.mockResolvedValue([
      ligne({
        idReponse: 'R_X',
        idQuestionnaire: 'Q_FICTIF',
        titre: 'Questionnaire fictif',
        dateReponse: new Date('2026-09-10T09:00:00.000Z'),
        scoresJson: { rawAnswers: { H1: 1, COMMENTAIRE: cite } },
        statutValidite: 'INVALID',
        motifInvalidation: cite,
      }),
    ]);
    brancherSynthese({
      ...SYNTHESE_VALIDEE,
      syntheseJson: { ...SYNTHESE_VALIDEE.syntheseJson, resume_praticien: cite },
      notesPraticien: cite,
    });

    const lire = async (version: VersionExport) =>
      sansAccents((await planifierPages(await assemblerOuEchouer(version))).flat().map(l => l.texte).join('\n'));
    // Témoin : la version complète imprime bien chaque forme.
    const complete = await lire('complete');
    for (const temoin of temoins) expect(complete, temoin).toContain(temoin);
    const pseudonymisee = await lire('ia-externe');
    for (const temoin of temoins) expect(pseudonymisee, temoin).not.toContain(temoin);
    expect(pseudonymisee).toContain('pat030');
  });

  function brancherSynthese(validee: typeof SYNTHESE_VALIDEE) {
    prisma.syntheseIA.findFirst.mockImplementation(async (args: WhereSynthese) =>
      args.where.statut.in.includes('Validee_Praticien') ? validee : null,
    );
  }
});

describe('nomFichierExport', () => {
  it('porte l’identifiant, la version et la date de Paris — jamais le nom du patient', () => {
    expect(nomFichierExport('PAT030', 'ia-externe', MAINTENANT)).toBe('dossier-PAT030-ia-externe-2026-09-26.pdf');
    expect(nomFichierExport('PAT030', 'complete', MAINTENANT)).toBe('dossier-PAT030-complet-2026-09-26.pdf');
  });

  it('la date suit le fuseau de Paris, pas celui du serveur', () => {
    // 23:30 UTC le 31/12 = 00:30 le 01/01 à Paris.
    expect(nomFichierExport('PAT030', 'complete', new Date('2026-12-31T23:30:00.000Z'))).toBe(
      'dossier-PAT030-complet-2027-01-01.pdf',
    );
  });
});
