import { afterEach, describe, expect, it } from 'vitest';

import {
  CONDUITE_EFFET_INDESIRABLE,
  REGLE_SECURITE_EFFET_INDESIRABLE,
  SAFETY_EI_METADATA,
  SAFETY_EI_SHA256,
  associationEffetIndesirableDisponible,
  interruptionEffetIndesirableActive,
  tableEffetIndesirableSignee,
} from '@/lib/clinical/safetyEffetIndesirableV1';
import { sha256 } from '@/lib/clinical/corpusSyntheseV1';
import {
  TEXTE_PAUSE_AVIS_RENDU,
  TEXTE_PAUSE_COMPLEMENTS,
  TEXTE_PAUSE_ELEMENT,
} from '@/lib/trust/pauseEffetIndesirable';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { construireSafetyFindings } from './safetyFindings';

// Le banc du SECOND producteur de l'objet de sécurité ([[D-101]] amendée par
// [[D-281]], `DC-42`). Quatre propriétés, chacune avec sa contre-épreuve :
//
//   1. table non signée ⇒ aucun constat, et la règle jointe en `candidate` —
//      c'est l'état LIVRÉ, et la production ne change pas au merge ;
//   2. table signée ⇒ AUCUN constat non plus : un signalement rattaché ne
//      retire plus les candidats du dossier — la règle amendée bloque la
//      diffusion seule, et sa garde vit dans la route de diffusion (D-281 §3) ;
//   3. aucune sortie ne dépend des signalements : un signalement HORS RÈGLE
//      (sans rattachement ni programme) n'entre plus dans la revue, donc ne
//      fait plus dériver la carte servie (D-281 §5, arbitrage du 2026-10-17) ;
//   4. le verrou couvre la conduite et les trois textes patient signés.
//
// La table est SIGNÉE depuis le 2026-10-17 (M-1, D-281 §6). La branche non
// signée reste gardée : elle est simulée puis restaurée, comme le banc de la
// chaîne C1 simule l'état fermé des priorités.

const ETAT_LIVRE = { ...SAFETY_EI_METADATA };

afterEach(() => {
  Object.assign(SAFETY_EI_METADATA, ETAT_LIVRE);
  delete process.env.WN_EI_INTERRUPTION;
});

function simulerNonSignature(): void {
  SAFETY_EI_METADATA.validationExterne = false;
  SAFETY_EI_METADATA.dateValidation = null;
  SAFETY_EI_METADATA.sourceReference = '';
  SAFETY_EI_METADATA.shaPerimetre = null;
}

function simulerSignature(): void {
  SAFETY_EI_METADATA.validationExterne = true;
  SAFETY_EI_METADATA.dateValidation = '2026-08-23T00:00:00.000Z';
  SAFETY_EI_METADATA.sourceReference = 'Signature simulée par le banc — jamais servie en production.';
  SAFETY_EI_METADATA.shaPerimetre = SAFETY_EI_SHA256;
}

describe('état SIGNÉ (M-1, 2026-10-17) — et la branche non signée, simulée', () => {
  // LA SIGNATURE TELLE QUE LE DÉPÔT LA PORTE : la v2 amendée, la source de
  // D-281 §6, et une empreinte littérale égale à celle du périmètre servi.
  it('la table est signée sur son périmètre ; sans drapeau, rien ne s’interrompt', () => {
    expect(tableEffetIndesirableSignee()).toBe(true);
    expect(SAFETY_EI_METADATA.version).toBe('safety-effet-indesirable-nnpp2-v2');
    expect(SAFETY_EI_METADATA.sourceReference)
      .toBe('Constitution clinique DC-42 ; arbitrage du praticien consigné en D-281 du 2026-10-12');
    expect(SAFETY_EI_METADATA.shaPerimetre).toBe(SAFETY_EI_SHA256);
    expect(associationEffetIndesirableDisponible()).toBe(false);
    expect(interruptionEffetIndesirableActive()).toBe(false);
  });

  // SANS SIMULATION : la règle que la revue reçoit, telle que la production la
  // joindra au déploiement.
  it('signée : la règle sort validée, en v2, avec sa source et sa date', () => {
    const regle = construireSafetyFindings([], []).rules
      .find(r => r.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE);
    expect(regle).toEqual({
      ruleId: REGLE_SECURITE_EFFET_INDESIRABLE,
      version: 'safety-effet-indesirable-nnpp2-v2',
      lifecycle: 'clinically_validated',
      validation: {
        validatedAt: '2026-10-17T00:00:00.000Z',
        validatorRole: 'practitioner',
        sourceReference: 'Constitution clinique DC-42 ; arbitrage du praticien consigné en D-281 du 2026-10-12',
      },
    });
  });

  it('non signée : aucun constat, la règle en `candidate`, aucune limitation', () => {
    simulerNonSignature();
    const { findings, rules, limitations } = construireSafetyFindings([], []);
    expect(findings).toHaveLength(0);
    expect(rules.find(r => r.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)?.lifecycle).toBe('candidate');
    expect(limitations).toHaveLength(0);
  });

  // CONTRE-ÉPREUVE DU VERROU. Les cinq termes doivent tenir ENSEMBLE : un
  // `validationExterne: true` posé seul ne suffit pas à ouvrir.
  it('un booléen de signature posé seul n’ouvre pas le verrou', () => {
    simulerNonSignature();
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

describe('le périmètre signé — la conduite et les trois textes patient', () => {
  // Le SHA est recalculé ici depuis les textes servis : un texte retouché au
  // portail sans nouvelle signature changerait l'empreinte, donc fermerait le
  // verrou — le patient ne lit jamais un texte que le praticien n'a pas signé.
  it('l’empreinte couvre la conduite et les textes de D-281 §4, et rien d’autre', () => {
    expect(SAFETY_EI_SHA256).toBe(sha256(JSON.stringify({
      conduite: CONDUITE_EFFET_INDESIRABLE,
      textes: [TEXTE_PAUSE_ELEMENT, TEXTE_PAUSE_COMPLEMENTS, TEXTE_PAUSE_AVIS_RENDU],
    })));
  });

  it('la conduite dit le blocage de la diffusion et que le statut ne lève rien', () => {
    expect(CONDUITE_EFFET_INDESIRABLE).toMatch(/aucun programme ne se diffuse/);
    expect(CONDUITE_EFFET_INDESIRABLE).toMatch(/Le statut ne lève rien/);
  });
});

describe('l’ordre des deux gestes — capturer avant d’interrompre', () => {
  it('le drapeau seul ouvre la CAPTURE, jamais l’interruption', () => {
    simulerNonSignature();
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

describe('table signée — aucun signalement n’entre dans la chaîne C1', () => {
  // LE CŒUR DE L'AMENDEMENT (D-281 §1, §3, §5). La règle livrée faisait d'un
  // signalement rattaché un constat qui inhibait tout le dossier ; la garde est
  // désormais à la diffusion, et la carte reste entière. Depuis t27, aucune
  // sortie ne dépendait plus des signalements ; depuis t29, la chaîne ne les
  // reçoit plus : la propriété tient par construction, et ce banc la garde.
  // Ils restent comptés au panneau, au Fil et au prévol, hors de l'empreinte.
  it('la règle validée est jointe à la revue', () => {
    simulerSignature();
    const { rules, findings, limitations } = construireSafetyFindings([], []);
    expect(rules.find(r => r.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)?.lifecycle).toBe('clinically_validated');
    expect(findings.filter(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)).toEqual([]);
    expect(limitations).toHaveLength(0);
  });

  it('ni le producteur ni l’entrée de la chaîne ne portent de signalement', () => {
    // Deux paramètres : les signaux de l'anamnèse et les réponses aux questions
    // sur le suicide. Un troisième rouvrirait la dérive de la carte (t27).
    expect(construireSafetyFindings.length).toBe(2);
    const chaine = readFileSync(path.join(process.cwd(), 'src/lib/clinical-engine/chaineC1.ts'), 'utf8');
    expect(chaine).not.toMatch(/effetsIndesirables/);
  });
});
