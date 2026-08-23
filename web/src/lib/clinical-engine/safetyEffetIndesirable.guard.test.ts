import { afterEach, describe, expect, it } from 'vitest';

import {
  REGLE_SECURITE_EFFET_INDESIRABLE,
  SAFETY_EI_METADATA,
  SAFETY_EI_SHA256,
  associationEffetIndesirableDisponible,
  interruptionEffetIndesirableActive,
  tableEffetIndesirableSignee,
} from '@/lib/clinical/safetyEffetIndesirableV1';
import { construireSafetyFindings, type EffetIndesirableRuntime } from './safetyFindings';

// LOT-05 « Doctrine exécutable » — le banc du SECOND producteur de l'objet de
// sécurité ([[D-101]], `DC-42`). Quatre propriétés, chacune avec sa
// contre-épreuve :
//
//   1. table non signée ⇒ aucun constat, et la règle jointe en `candidate` —
//      c'est l'état LIVRÉ, et la production ne change pas au merge ;
//   2. un signalement RATTACHÉ et non traité produit un constat qui inhibe ;
//   3. un signalement non traité SANS rattachement n'inhibe pas, mais se DIT
//      (`DC-35`) — la machine ne devine pas à quel protocole il se rapporte ;
//   4. le constat ne transporte AUCUN mot du patient, et aucune gravité.
//
// La table est livrée NON SIGNÉE : les propriétés 2 à 4 seraient inatteignables
// sans simulation. La signature est donc simulée puis restaurée, exactement
// comme le banc de la chaîne C1 simule celle des priorités.

const ETAT_LIVRE = { ...SAFETY_EI_METADATA };

afterEach(() => {
  Object.assign(SAFETY_EI_METADATA, ETAT_LIVRE);
  delete process.env.WN_EI_INTERRUPTION;
});

function simulerSignature(): void {
  SAFETY_EI_METADATA.validationExterne = true;
  SAFETY_EI_METADATA.dateValidation = '2026-08-23T00:00:00.000Z';
  SAFETY_EI_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
  SAFETY_EI_METADATA.shaPerimetre = SAFETY_EI_SHA256;
}

const RATTACHE: EffetIndesirableRuntime = {
  id: 'AER-1',
  protocolDraftId: 'DRAFT-1',
  statutTraitement: 'recu',
};
const SANS_RATTACHEMENT: EffetIndesirableRuntime = {
  id: 'AER-2',
  protocolDraftId: null,
  statutTraitement: 'en_cours',
};
const CLOS: EffetIndesirableRuntime = {
  id: 'AER-3',
  protocolDraftId: 'DRAFT-1',
  statutTraitement: 'clos',
};

describe('état LIVRÉ — la production ne change pas au merge', () => {
  it('la table n’est pas signée et le drapeau est absent', () => {
    expect(tableEffetIndesirableSignee()).toBe(false);
    expect(associationEffetIndesirableDisponible()).toBe(false);
    expect(interruptionEffetIndesirableActive()).toBe(false);
  });

  it('non signée, aucun constat n’est produit — même sur un signalement rattaché', () => {
    const { findings, rules } = construireSafetyFindings([], [RATTACHE]);
    expect(findings.filter(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)).toHaveLength(0);
    const regle = rules.find(r => r.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE);
    expect(regle?.lifecycle).toBe('candidate');
  });

  // CONTRE-ÉPREUVE DU VERROU. Les cinq termes doivent tenir ENSEMBLE : un
  // `validationExterne: true` posé seul ne suffit pas à ouvrir.
  it('un booléen de signature posé seul n’ouvre pas le verrou', () => {
    SAFETY_EI_METADATA.validationExterne = true;
    expect(tableEffetIndesirableSignee()).toBe(false);
  });

  it('une conduite retouchée après signature referme le verrou SEULE', () => {
    simulerSignature();
    expect(tableEffetIndesirableSignee()).toBe(true);
    SAFETY_EI_METADATA.shaPerimetre = 'a'.repeat(64);
    expect(tableEffetIndesirableSignee()).toBe(false);
  });
});

describe('l’ordre des deux gestes — capturer avant d’inhiber', () => {
  it('le drapeau seul ouvre la CAPTURE, jamais l’interruption', () => {
    process.env.WN_EI_INTERRUPTION = '1';
    expect(associationEffetIndesirableDisponible()).toBe(true);
    expect(interruptionEffetIndesirableActive()).toBe(false);
  });

  it('la signature seule n’ouvre rien sans le drapeau', () => {
    simulerSignature();
    expect(interruptionEffetIndesirableActive()).toBe(false);
  });

  it.each(['', '0', 'true', 'oui', 'TRUE'])(
    'le drapeau à %o laisse le dispositif éteint',
    (valeur) => {
      process.env.WN_EI_INTERRUPTION = valeur;
      simulerSignature();
      expect(interruptionEffetIndesirableActive()).toBe(false);
    },
  );
});

describe('table signée — l’interruption mord, et elle parle', () => {
  it('un signalement rattaché et non traité produit un constat qui inhibe', () => {
    simulerSignature();
    const { findings } = construireSafetyFindings([], [RATTACHE]);
    const constat = findings.find(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE);
    expect(constat).toBeDefined();
    // `disposition` est ce que `decisionCard` lit pour bloquer : un constat de
    // sécurité présent suffit, quel qu'il soit.
    expect(constat?.disposition).toBe('requires_practitioner_review');
    expect(findings.length).toBeGreaterThan(0);
  });

  it('un signalement CLOS n’inhibe rien', () => {
    simulerSignature();
    const { findings, limitations } = construireSafetyFindings([], [CLOS]);
    expect(findings.filter(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)).toHaveLength(0);
    expect(limitations).toHaveLength(0);
  });

  // `DC-35` — LE CŒUR DU CAS. Sans rattachement, la machine ne peut pas
  // conclure ; se taire ferait disparaître un signalement OUVERT de la vue du
  // praticien, et deviner un protocole serait l'inférence interdite.
  it('un signalement non rattaché n’inhibe pas, mais se dit', () => {
    simulerSignature();
    const { findings, limitations } = construireSafetyFindings([], [SANS_RATTACHEMENT]);
    expect(findings.filter(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)).toHaveLength(0);
    expect(limitations.join(' ')).toMatch(/rattachés à aucun/);
  });

  it('le compte annoncé est celui des signalements OUVERTS non rattachés', () => {
    simulerSignature();
    const { limitations } = construireSafetyFindings([], [
      SANS_RATTACHEMENT,
      { id: 'AER-4', protocolDraftId: null, statutTraitement: 'recu' },
      { id: 'AER-5', protocolDraftId: null, statutTraitement: 'clos' },
    ]);
    expect(limitations.join(' ')).toContain('2 signalement(s)');
  });

  // DÉTERMINISME : deux ordres de lecture doivent produire les mêmes constats,
  // sans quoi la carte recalculée diverge de la carte émise (409).
  it('l’ordre des signalements ne change pas les constats produits', () => {
    simulerSignature();
    const deux = [RATTACHE, { ...RATTACHE, id: 'AER-0' }];
    const ordreA = construireSafetyFindings([], deux).findings.map(f => f.findingId);
    const ordreB = construireSafetyFindings([], [...deux].reverse()).findings.map(f => f.findingId);
    expect(ordreA).toEqual(ordreB);
  });
});

describe('le constat ne transporte ni les mots du patient, ni de gravité', () => {
  // LA GARDE EST STRUCTURELLE : `EffetIndesirableRuntime` ne porte NI
  // `produitLibelle`, NI `symptomes`. Le banc le dit à la compilation en
  // refusant de construire un objet qui les porterait — ce que la ligne
  // ci-dessous vérifie à l'exécution sur l'objet réellement produit.
  it('aucun champ du constat ne cite un texte libre du signalement', () => {
    simulerSignature();
    const { findings } = construireSafetyFindings([], [RATTACHE]);
    const constat = findings.find(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)!;
    const serialise = JSON.stringify(constat);
    expect(serialise).toContain('AER-1');
    expect(serialise).not.toContain('DRAFT-1');
  });

  it('`confidence` est FIGÉ et ne varie avec rien (`DC-23`)', () => {
    simulerSignature();
    const un = construireSafetyFindings([], [RATTACHE]).findings;
    const trois = construireSafetyFindings([], [
      RATTACHE,
      { ...RATTACHE, id: 'AER-6' },
      { ...RATTACHE, id: 'AER-7' },
    ]).findings;
    for (const constat of [...un, ...trois]) expect(constat.confidence).toBe('à_documenter');
  });

  it('aucun constat ne porte de champ numérique de gravité, sous quelque nom', () => {
    simulerSignature();
    const { findings } = construireSafetyFindings([], [RATTACHE]);
    for (const constat of findings) {
      for (const valeur of Object.values(constat as unknown as Record<string, unknown>)) {
        expect(typeof valeur).not.toBe('number');
      }
    }
  });
});
