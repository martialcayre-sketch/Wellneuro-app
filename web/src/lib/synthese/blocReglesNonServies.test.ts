import { describe, expect, it } from 'vitest';
import type { ResultatOrientation } from '@/lib/clinical/orientationService';
import {
  construireBlocReglesNonServies,
  LIGNE_ARRETS_NON_EVALUES,
  LIGNE_ARRETS_SUSPENDUS_CLAIMS,
  LIGNE_ARRETS_SUSPENDUS_VALIDITE,
  LIGNE_ORIENTATION_NON_APPLIQUEES,
  LIGNE_SOURCES_NON_VERIFIEES,
  passationsArretsNonEvalues,
  TITRE_BLOC_REGLES_NON_SERVIES,
  traceReglesNonServies,
  VIGILANCE_CONVERGENCES_NON_EVALUEES,
} from './blocReglesNonServies';

// [[D-511]], ligne t77 — le bloc des règles non appliquées par le service.

function actif(partiel: {
  reglesNonAppliquees?: unknown;
  arretsSuspendus?: unknown;
  arretsNonEvalues?: unknown;
}): ResultatOrientation {
  return {
    actif: true,
    version: 'orientation-nnpp2-v1',
    sha256: 'abc',
    recommandations: [],
    ecartees: [],
    reglesNonEvaluees: [],
    arretsNonEvalues: partiel.arretsNonEvalues ?? [],
    arret: null,
    arretsSuspendus: partiel.arretsSuspendus ?? [],
    reglesNonAppliquees: partiel.reglesNonAppliquees ?? [],
  } as unknown as ResultatOrientation;
}

const INACTIF: ResultatOrientation = {
  actif: false,
  version: 'orientation-nnpp2-v1',
  message: "L'orientation n'est pas affichée : la validité de ses sources n'a pas pu être vérifiée.",
};

const COUPLE = { claimId: '0167-023', versionClaim: 'v2' };
const NON_APPLIQUEE = { regleId: 'R2-STR-01', claims: [COUPLE] };
const SUSPENDU_CLAIMS = { stopRuleId: 'STOP-STR', motif: 'claims_non_admissibles', claims: [COUPLE] };
const SUSPENDU_VALIDITE = { stopRuleId: 'STOP-SOM', motif: 'validite_non_verifiee', claims: [] };
const PSS_PERIME = { idQuestionnaire: 'Q_STR_02', dateReponse: '2026-03-12T09:30:00.000Z', fenetreJours: 30 };
const SANS_FENETRE = { idQuestionnaire: 'Q_ZZZ_01', dateReponse: '2026-03-12T09:30:00.000Z', fenetreJours: null };
const FUTURE = {
  idQuestionnaire: 'Q_ZZZ_02',
  dateReponse: '2026-11-20T09:30:00.000Z',
  fenetreJours: 7,
  dateeApresMaintenant: true,
};

describe('construireBlocReglesNonServies — les textes validés (D-511 §2)', () => {
  it('les textes sont ceux validés mot pour mot', () => {
    expect(TITRE_BLOC_REGLES_NON_SERVIES).toBe('## Règles non appliquées par le service');
    expect(LIGNE_SOURCES_NON_VERIFIEES).toBe(
      "Sources de l'orientation non vérifiées : la validité de ses sources n'a pas pu être vérifiée. Aucune règle d'orientation n'a été appliquée : aucune exploration n'est proposée ni retirée.",
    );
    expect(LIGNE_ORIENTATION_NON_APPLIQUEES).toBe(
      "Règles d'orientation non appliquées : pour chacune des règles concernées, au moins un claim cité ne satisfait pas les critères de validité du corpus. Ces règles ne proposent aucune exploration.",
    );
    expect(LIGNE_ARRETS_SUSPENDUS_CLAIMS).toBe(
      "Règles d'arrêt suspendues : au moins un claim cité ne satisfait pas les critères de validité du corpus. Ces règles ne retirent aucune exploration.",
    );
    expect(LIGNE_ARRETS_SUSPENDUS_VALIDITE).toBe(
      "Règles d'arrêt suspendues : la validité de leurs sources n'a pas pu être vérifiée. Ces règles ne retirent aucune exploration.",
    );
    expect(LIGNE_ARRETS_NON_EVALUES).toBe("Règles d'arrêt non évaluées : ces règles ne retirent aucune exploration.");
    expect(VIGILANCE_CONVERGENCES_NON_EVALUEES).toBe(
      "Convergences non évaluées : la validité de leurs sources n'a pas pu être vérifiée.",
    );
  });

  it('les quatre catégories, dans l’ordre, une ligne par motif', () => {
    const bloc = construireBlocReglesNonServies(actif({
      reglesNonAppliquees: [NON_APPLIQUEE, { regleId: 'R2-STR-02', claims: [COUPLE] }],
      arretsSuspendus: [SUSPENDU_VALIDITE, SUSPENDU_CLAIMS],
      arretsNonEvalues: [{ stopRuleId: 'STOP-STR', passations: [PSS_PERIME, SANS_FENETRE, FUTURE] }],
    }), false);
    expect(bloc).toBe([
      TITRE_BLOC_REGLES_NON_SERVIES,
      'Version: orientation-nnpp2-v1',
      '',
      LIGNE_ORIENTATION_NON_APPLIQUEES,
      LIGNE_ARRETS_SUSPENDUS_CLAIMS,
      LIGNE_ARRETS_SUSPENDUS_VALIDITE,
      LIGNE_ARRETS_NON_EVALUES,
      "Q_STR_02 — Échelle de stress perçu (PSS-10), passation du 2026-03-12 : dépasse sa fenêtre d'arrêt de 30 jours.",
      "Q_ZZZ_01 : aucune fenêtre d'arrêt valide n'est définie.",
      'Q_ZZZ_02, passation du 2026-11-20 : datée après la date du jour.',
    ].join('\n'));
  });

  it('la date future prime sur la fenêtre (D-508 §2)', () => {
    const bloc = construireBlocReglesNonServies(actif({
      arretsNonEvalues: [{ stopRuleId: 'STOP-STR', passations: [{ ...FUTURE, fenetreJours: null }] }],
    }), false);
    expect(bloc).toContain('Q_ZZZ_02, passation du 2026-11-20 : datée après la date du jour.');
    expect(bloc).not.toContain('aucune fenêtre');
  });

  it('jamais d’identifiant de règle, ni de couple de claim, ni de nombre', () => {
    const bloc = construireBlocReglesNonServies(actif({
      reglesNonAppliquees: [NON_APPLIQUEE],
      arretsSuspendus: [SUSPENDU_CLAIMS],
      arretsNonEvalues: [{ stopRuleId: 'STOP-STR', passations: [PSS_PERIME] }],
    }), false);
    expect(bloc).not.toMatch(/R2-STR|STOP-|0167-023/);
    expect(bloc).not.toMatch(/\b[0-9]+ règles?\b/);
  });

  it('un instrument en cause dans deux arrêts n’est nommé qu’une fois, au premier rencontré', () => {
    expect(passationsArretsNonEvalues(actif({
      arretsNonEvalues: [
        { stopRuleId: 'STOP-STR', passations: [PSS_PERIME] },
        { stopRuleId: 'STOP-ANX', passations: [{ ...PSS_PERIME, dateReponse: '2025-01-01T00:00:00.000Z' }, SANS_FENETRE] },
      ],
    })).map(p => [p.idQuestionnaire, p.dateReponse])).toEqual([
      ['Q_STR_02', '2026-03-12T09:30:00.000Z'],
      ['Q_ZZZ_01', '2026-03-12T09:30:00.000Z'],
    ]);
  });
});

describe('construireBlocReglesNonServies — corpus illisible et absences', () => {
  it('sources non vérifiées : la ligne, seule, sur une orientation inactive', () => {
    expect(construireBlocReglesNonServies(INACTIF, true)).toBe([
      TITRE_BLOC_REGLES_NON_SERVIES,
      'Version: orientation-nnpp2-v1',
      '',
      LIGNE_SOURCES_NON_VERIFIEES,
    ].join('\n'));
  });

  it('orientation inactive pour une autre raison (table non signée) : aucun bloc', () => {
    expect(construireBlocReglesNonServies(INACTIF, false)).toBe('');
  });

  it('orientation indisponible (levée du service) : aucun bloc, même corpus illisible', () => {
    expect(construireBlocReglesNonServies(null, true)).toBe('');
  });

  it('orientation active sans rien de non servi : aucun bloc', () => {
    expect(construireBlocReglesNonServies(actif({}), false)).toBe('');
  });

  it('défensif : un élément malformé est ignoré, sans lever', () => {
    const bloc = construireBlocReglesNonServies(actif({
      reglesNonAppliquees: [null, { claims: [] }, 'x'],
      arretsSuspendus: [{ stopRuleId: 'STOP-STR', motif: 'inconnu', claims: [] }, 3],
      arretsNonEvalues: [
        { stopRuleId: 'STOP-STR', passations: [{ idQuestionnaire: 'Q_STR_02', dateReponse: 'pas une date', fenetreJours: 30 }] },
        { passations: [PSS_PERIME] },
      ],
    }), false);
    expect(bloc).toBe('');
    expect(construireBlocReglesNonServies(actif({ reglesNonAppliquees: 'pas une liste' }), false)).toBe('');
  });

  it('défensif : une fenêtre qui n’est pas un entier positif est malformée, jamais écrite (contre-revue Codex)', () => {
    for (const fenetreJours of [Number.NaN, Number.POSITIVE_INFINITY, 0, -7, 2.5, '30']) {
      const bloc = construireBlocReglesNonServies(actif({
        arretsNonEvalues: [{ stopRuleId: 'STOP-STR', passations: [{ ...PSS_PERIME, fenetreJours }] }],
      }), false);
      expect(bloc, String(fenetreJours)).toBe('');
    }
  });
});

describe('traceReglesNonServies — ce qui ne part pas au modèle (D-511 §5)', () => {
  it('identifiants, motifs et couples', () => {
    expect(traceReglesNonServies(actif({
      reglesNonAppliquees: [NON_APPLIQUEE],
      arretsSuspendus: [SUSPENDU_CLAIMS, SUSPENDU_VALIDITE],
      arretsNonEvalues: [{ stopRuleId: 'STOP-STR', passations: [PSS_PERIME] }],
    }))).toEqual({
      reglesNonAppliquees: [{ regleId: 'R2-STR-01', claims: [COUPLE] }],
      arretsSuspendus: [
        { stopRuleId: 'STOP-STR', motif: 'claims_non_admissibles', claims: [COUPLE] },
        { stopRuleId: 'STOP-SOM', motif: 'validite_non_verifiee', claims: [] },
      ],
      arretsNonEvalues: ['STOP-STR'],
    });
  });

  it('vide sur une orientation inactive ou indisponible', () => {
    const vide = { reglesNonAppliquees: [], arretsSuspendus: [], arretsNonEvalues: [] };
    expect(traceReglesNonServies(INACTIF)).toEqual(vide);
    expect(traceReglesNonServies(null)).toEqual(vide);
  });
});
