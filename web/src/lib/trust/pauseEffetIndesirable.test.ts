import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { actionOrientation } from '@/lib/clinical-engine/orientationAdressage';
import {
  TEXTE_PAUSE_COMPLEMENTS,
  TEXTE_PAUSE_ELEMENT,
  elementsDesignables,
  elementsEnPause,
  versionProgramme,
  type SignalementRattache,
  type VerdictEffetIndesirable,
} from './pauseEffetIndesirable';

// LA PAUSE SUR EFFET INDÉSIRABLE ([[D-281]], étape 3).

const ORIENTATION = actionOrientation(true);
// Une orientation ÉCRITE PAR LE PRATICIEN : même type, identifiant positionnel.
const ORIENTATION_PRATICIEN = { actionId: 'action-5', type: 'medical_referral', title: 'Voir votre gastro-entérologue' };
const BILAN = { actionId: 'action-6', type: 'biological_exploration', title: 'Prise de sang' };
const MAGNESIUM = { actionId: 'a-magnesium', type: 'supplement_exploration', title: 'Magnésium le soir' };
const OMEGA = { actionId: 'a-omega', type: 'supplement_exploration', title: 'Oméga-3 au déjeuner' };
const MARCHE = { actionId: 'a-marche', type: 'gentle_activity', title: 'Marche de vingt minutes' };
const ACTIONS = [ORIENTATION, ORIENTATION_PRATICIEN, BILAN, MAGNESIUM, OMEGA, MARCHE];
const DRAFT = 'draft-1';

const signalement = (over: Partial<SignalementRattache> = {}): SignalementRattache => ({
  id: 's1', rattachement: 'element', elementActionId: MAGNESIUM.actionId, protocolDraftId: DRAFT, ...over,
});
const verdict = (over: Partial<VerdictEffetIndesirable> = {}): VerdictEffetIndesirable => ({
  id: 'v1', reportId: 's1', verdict: 'non_implique', elementActionId: null, supersedesVerdictId: null, ...over,
});
const enPause = (
  signalements: SignalementRattache[],
  verdicts: VerdictEffetIndesirable[] = [],
  actions: { actionId: string; type: string; title: string }[] = ACTIONS,
) => elementsEnPause({ signalements, verdicts, protocolDraftId: DRAFT, actions });

describe('textes signés de la pause', () => {
  // RECOPIE AU CARACTÈRE PRÈS : le banc relit la décision signée.
  it('sont ceux de D-281 §4, mot pour mot', () => {
    const decisions = readFileSync(path.join(process.cwd(), '..', 'docs', 'DECISIONS.md'), 'utf8');
    const section = decisions.slice(decisions.indexOf('### D-281'), decisions.indexOf('### D-280'));
    const aplati = section.replace(/\n>\s?/g, ' ').replace(/\s+/g, ' ');
    expect(aplati).toContain(TEXTE_PAUSE_ELEMENT);
    expect(aplati).toContain(TEXTE_PAUSE_COMPLEMENTS);
  });
});

describe('elementsDesignables', () => {
  it('exclut toute orientation vers le médecin et toute prise de sang (arbitrages du 2026-10-14)', () => {
    expect(elementsDesignables(ACTIONS)).toEqual([
      { actionId: MAGNESIUM.actionId, title: MAGNESIUM.title },
      { actionId: OMEGA.actionId, title: OMEGA.title },
      { actionId: MARCHE.actionId, title: MARCHE.title },
    ]);
  });
});

it('versionProgramme : une empreinte courte et stable de la version', () => {
  expect(versionProgramme('abcdef0123456789ffff')).toBe('abcdef0123456789');
});

describe('elementsEnPause', () => {
  it('sans signalement, rien n’est en pause', () => {
    expect(enPause([])).toEqual([]);
  });

  it('sans verdict, l’élément désigné est en pause, et lui seul', () => {
    expect(enPause([signalement()])).toEqual([{ actionId: MAGNESIUM.actionId, texte: 'element' }]);
  });

  it.each(['ne_sait_pas', 'autre_produit'] as const)('« %s » met en pause tous les compléments, rien d’autre', (rattachement) => {
    expect(enPause([signalement({ rattachement, elementActionId: null })])).toEqual([
      { actionId: MAGNESIUM.actionId, texte: 'complements' },
      { actionId: OMEGA.actionId, texte: 'complements' },
    ]);
  });

  it('« Je ne sais pas » sans complément au programme : rien n’est en pause', () => {
    expect(enPause([signalement({ rattachement: 'ne_sait_pas', elementActionId: null })], [], [ORIENTATION, MARCHE]))
      .toEqual([]);
  });

  it('le verdict « non impliqué » lève la pause', () => {
    expect(enPause([signalement()], [verdict()])).toEqual([]);
  });

  it('le verdict « impliqué » garde en pause l’élément que désigne le praticien, sans le texte de l’attente', () => {
    expect(enPause(
      [signalement({ rattachement: 'ne_sait_pas', elementActionId: null })],
      [verdict({ verdict: 'implique', elementActionId: OMEGA.actionId })],
    )).toEqual([{ actionId: OMEGA.actionId, texte: 'avis_rendu' }]);
  });

  it('un verdict corrigé : la tête de la chaîne fait foi', () => {
    const verdicts = [
      verdict({ id: 'v1', verdict: 'non_implique' }),
      verdict({ id: 'v2', verdict: 'implique', elementActionId: MAGNESIUM.actionId, supersedesVerdictId: 'v1' }),
    ];
    expect(enPause([signalement()], verdicts)).toEqual([{ actionId: MAGNESIUM.actionId, texte: 'avis_rendu' }]);
  });

  it('une chaîne à deux têtes n’élit aucun verdict : la pause tient', () => {
    expect(enPause([signalement()], [verdict({ id: 'v1' }), verdict({ id: 'v2' })]))
      .toEqual([{ actionId: MAGNESIUM.actionId, texte: 'element' }]);
  });

  // LES IDENTIFIANTS SONT POSITIONNELS : `action-2` d'une version n'est pas
  // `action-2` de la suivante. Seule la version visée est mise en pause.
  it('un signalement d’une autre version ne met rien en pause dans la version courante', () => {
    expect(enPause([signalement({ protocolDraftId: 'draft-0' })])).toEqual([]);
    expect(enPause(
      [signalement({ protocolDraftId: 'draft-0' })],
      [verdict({ verdict: 'implique', elementActionId: MAGNESIUM.actionId })],
    )).toEqual([]);
  });

  it('un signalement sans programme (dossier effacé) ne met rien en pause', () => {
    expect(enPause([signalement({ protocolDraftId: null })])).toEqual([]);
  });

  it('un élément absent de la version courante n’a rien à mettre en pause', () => {
    expect(enPause([signalement()], [], [ORIENTATION, MARCHE])).toEqual([]);
  });

  it.each([ORIENTATION, ORIENTATION_PRATICIEN, BILAN])('« $title » n’est jamais en pause', (action) => {
    expect(enPause([signalement({ elementActionId: action.actionId })])).toEqual([]);
    expect(enPause([signalement()], [verdict({ verdict: 'implique', elementActionId: action.actionId })])).toEqual([]);
  });

  it('une attente l’emporte sur un avis rendu, et l’élément désigné sur les compléments', () => {
    expect(enPause(
      [
        signalement({ id: 's1', rattachement: 'ne_sait_pas', elementActionId: null }),
        signalement({ id: 's2' }),
        signalement({ id: 's3', elementActionId: OMEGA.actionId }),
      ],
      [verdict({ reportId: 's3', verdict: 'implique', elementActionId: OMEGA.actionId })],
    )).toEqual([
      { actionId: MAGNESIUM.actionId, texte: 'element' },
      { actionId: OMEGA.actionId, texte: 'complements' },
    ]);
  });
});
