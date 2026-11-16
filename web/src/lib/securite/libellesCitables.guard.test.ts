import { readFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/prisma', () => ({ prisma: {} }));

import { genererCourrierAdressage } from '@/lib/clinical/courrierAdressage';
import { SAFETY_QUESTIONNAIRE_CABINET_METADATA, SAFETY_QUESTIONNAIRE_CABINET_SHA256 } from '@/lib/clinical/safetyQuestionnaireCabinetV1';
import { SAFETY_SIGNALS_SHA256 } from '@/lib/clinical/safetySignalsV1';
import { reponsesSecuriteDeclarees } from '@/lib/clinical-engine/safetyFindings';
import { RACINES_PRESCRIPTIVES } from '@/lib/documents/vocabulaire';
import {
  ERREURS_LIBELLE_CITABLE,
  copieDesignationSuicide,
  libellesCitablesRefuses,
} from './declarationSuicideCabinet';

// Réponse 20261114-1217-a — la garde des libellés citables À LA PUBLICATION
// est la garde du rendu médecin DE LA LETTRE, ni plus large ni plus étroite.
//
// Le banc suit le chemin réel : instrument → copie figée à l'envoi
// (`copieDesignationSuicide`) → passation → réponses lues par `SAF-QUEST-02`
// → `genererCourrierAdressage`, qui refuse en `terme_prescriptif` quand son
// rendu médecin lève. Pour chaque racine de `vocabulaire.ts` et chaque
// libellé citable, la publication refuse SI ET SEULEMENT SI la lettre
// refuserait. Une racine ajoutée à la liste entre d'office dans le banc.
//
// L'option « non » n'est jamais citée (une réponse « non » ne fait pas de
// constat) ; l'arbitrage la juge quand même, avec toutes les options de la
// question désignée. C'est le seul écart, voulu, et le banc l'écrit.

const ETAT_LIVRE = { ...SAFETY_QUESTIONNAIRE_CABINET_METADATA };

beforeEach(() => {
  // La lettre ne cite une réponse du cabinet que table signée : signature
  // simulée, jamais servie en production.
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.validationExterne = true;
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.dateValidation = '2026-11-14T00:00:00.000Z';
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
  SAFETY_QUESTIONNAIRE_CABINET_METADATA.shaPerimetre = SAFETY_QUESTIONNAIRE_CABINET_SHA256;
});

afterEach(() => {
  Object.assign(SAFETY_QUESTIONNAIRE_CABINET_METADATA, ETAT_LIVRE);
});

type Libelles = { titre: string; enonce: string; non: string; positive: string };

const PROPRES: Libelles = {
  titre: 'Humeur du cabinet',
  enonce: 'Avez-vous eu des idées de mort ?',
  non: 'Jamais',
  positive: 'Souvent',
};

function instrument(l: Libelles) {
  return {
    titre: l.titre,
    questionSuicideId: 'Q2',
    questionSuicideOptionNon: 0,
    definitionJson: {
      sections: [
        {
          id: 'S1',
          questions: [
            { id: 'Q1', texte: 'Je dors bien.', type: 'likert', options: [{ v: 0, l: 'Jamais' }, { v: 1, l: 'Souvent' }] },
            { id: 'Q2', texte: l.enonce, type: 'likert', options: [{ v: 0, l: l.non }, { v: 3, l: l.positive }] },
          ],
        },
      ],
    },
  };
}

/** La lettre d'une passation qui répond la valeur `v` à la question désignée, sur la copie de cet instrument. */
function lettre(l: Libelles, v: number) {
  const source = instrument(l);
  const copie = copieDesignationSuicide(source);
  if (!copie) throw new Error('copie impossible');
  return genererCourrierAdressage({
    patientId: 'PAT-FIXTURE',
    signaux: [],
    reponses: reponsesSecuriteDeclarees([
      {
        idReponse: 'REP-1',
        idQuestionnaire: 'CAB_HUMEUR',
        dateReponse: new Date('2026-11-10T09:00:00.000Z'),
        scoresJson: { rawAnswers: { Q1: 0, Q2: v } },
        statutValidite: 'VALID',
        designationCabinet: { poseQuestionSuicide: true, titreAssignation: l.titre, ...copie },
      },
    ]),
    tableSha256: SAFETY_SIGNALS_SHA256,
    dateCourrier: '2026-11-14T10:00:00.000Z',
  });
}

function lettreRefusee(l: Libelles): boolean {
  const sortie = lettre(l, 3);
  if (sortie.ok) return false;
  expect(sortie.raison).toBe('terme_prescriptif');
  return true;
}

// Variantes d'écriture d'une racine : casse, apostrophe typographique,
// caractères que le rendu échappe en HTML.
function variantes(racine: string): string[] {
  return [
    `Selon ${racine}`,
    racine.toUpperCase(),
    `l’${racine} & « suite »`,
    `<${racine}>`,
  ];
}

describe('libellés citables — témoin sans terme', () => {
  it('libellés propres : la publication passe et la lettre se rend', () => {
    expect(libellesCitablesRefuses(instrument(PROPRES))).toEqual([]);
    expect(lettre(PROPRES, 3).ok).toBe(true);
  });
});

describe('libellés citables — publication refusée ⇔ lettre refusée, par racine et par champ', () => {
  for (const racine of RACINES_PRESCRIPTIVES) {
    for (const texte of variantes(racine)) {
      for (const champ of ['titre', 'enonce', 'positive'] as const) {
        it(`${champ} « ${texte} »`, () => {
          const l = { ...PROPRES, [champ]: texte };
          const refuses = libellesCitablesRefuses(instrument(l));
          expect(refuses.length > 0).toBe(lettreRefusee(l));
          expect(refuses.length).toBe(1);
          expect(refuses[0]).toBe(
            champ === 'titre'
              ? ERREURS_LIBELLE_CITABLE.instrument
              : champ === 'enonce'
                ? ERREURS_LIBELLE_CITABLE.enonce
                : ERREURS_LIBELLE_CITABLE.option(texte),
          );
        });
      }
    }
  }

  it('l’option « non », jamais citée, est jugée quand même (arbitrage) : seul écart, voulu', () => {
    const l = { ...PROPRES, non: 'Pas de posologie' };
    expect(libellesCitablesRefuses(instrument(l))).toEqual([ERREURS_LIBELLE_CITABLE.option('Pas de posologie')]);
    expect(lettre(l, 3).ok).toBe(true);
  });

  it('plusieurs champs fautifs : un motif par champ, dans l’ordre nom, énoncé, réponses', () => {
    const l = { titre: 'Ordonnance', enonce: 'Dosage ?', non: 'Prescrit', positive: 'Posologie' };
    expect(libellesCitablesRefuses(instrument(l))).toEqual([
      ERREURS_LIBELLE_CITABLE.instrument,
      ERREURS_LIBELLE_CITABLE.enonce,
      ERREURS_LIBELLE_CITABLE.option('Prescrit'),
      ERREURS_LIBELLE_CITABLE.option('Posologie'),
    ]);
  });

  it('deux options au même libellé fautif : deux motifs, rien n’est fusionné', () => {
    const l = { ...PROPRES, non: 'Dosage', positive: 'Dosage' };
    expect(libellesCitablesRefuses(instrument(l))).toEqual([
      ERREURS_LIBELLE_CITABLE.option('Dosage'),
      ERREURS_LIBELLE_CITABLE.option('Dosage'),
    ]);
  });

  it('les autres questions de l’instrument ne sont pas citées, donc pas jugées', () => {
    const source = instrument(PROPRES);
    source.definitionJson.sections[0].questions[0].texte = 'Une ordonnance en cours ?';
    expect(libellesCitablesRefuses(source)).toEqual([]);
  });

  it('un énoncé absent se cite par l’identifiant de la question : c’est lui qui est jugé', () => {
    const source = instrument(PROPRES);
    const q2 = source.definitionJson.sections[0].questions[1] as { id: string; texte?: string };
    q2.id = 'dosage';
    delete q2.texte;
    expect(libellesCitablesRefuses({ ...source, questionSuicideId: 'dosage' })).toEqual([ERREURS_LIBELLE_CITABLE.enonce]);
  });

  it('une désignation introuvable : rien à juger ici (refus de `lireDeclarationSuicide`)', () => {
    expect(libellesCitablesRefuses({ ...instrument({ ...PROPRES, titre: 'Ordonnance' }), questionSuicideId: 'Q9' })).toEqual([]);
  });
});

describe('libellés citables — une seule garde, pas de liste parallèle', () => {
  it('le module juge par `contientTermePrescriptif` de `vocabulaire.ts`, et ne nomme aucune racine', () => {
    const source = readFileSync(path.join(__dirname, 'declarationSuicideCabinet.ts'), 'utf8');
    expect(source).toMatch(/import \{ contientTermePrescriptif \} from '@\/lib\/documents\/vocabulaire';/);
    for (const racine of RACINES_PRESCRIPTIVES) {
      expect(source.toLowerCase()).not.toContain(`'${racine}'`);
    }
    expect(source).not.toMatch(/RACINES_PRESCRIPTIVES/);
  });

  it('le rendu médecin de la lettre lève par cette même fonction', () => {
    const vocabulaire = readFileSync(path.join(__dirname, '../documents/vocabulaire.ts'), 'utf8');
    expect(vocabulaire).toMatch(/export function assertRenduMedecinNonPrescriptif\(texte: string\): void \{\s*if \(contientTermePrescriptif\(texte\)\)/);
    const rendu = readFileSync(path.join(__dirname, '../documents/rendu.ts'), 'utf8');
    expect(rendu).toMatch(/if \(destinataire === 'medecin'\) \{\s*assertRenduMedecinNonPrescriptif\(corps\);/);
  });
});
