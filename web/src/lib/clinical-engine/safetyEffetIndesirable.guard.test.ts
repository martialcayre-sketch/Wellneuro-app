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
import { construireSafetyFindings, type EffetIndesirableRuntime } from './safetyFindings';

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

const RATTACHE: EffetIndesirableRuntime = {
  id: 'AER-1',
  protocolDraftId: 'DRAFT-1',
  rattachement: 'element',
  statutTraitement: 'recu',
};
const SANS_RATTACHEMENT: EffetIndesirableRuntime = {
  id: 'AER-2',
  protocolDraftId: null,
  rattachement: null,
  statutTraitement: 'en_cours',
};
// Le formulaire d'avant (dossier mineur ou sans date, ou ancien formulaire) :
// le patient a répondu « oui » au programme, sans désigner d'élément. Il
// bloquera la diffusion une fois l'avis ouvert par migration (D-281 §5) ; ce
// producteur, lui, n'en fait jamais un constat.
const FORMULAIRE_D_AVANT: EffetIndesirableRuntime = {
  id: 'AER-3',
  protocolDraftId: 'DRAFT-1',
  rattachement: null,
  statutTraitement: 'recu',
};

const constatsEI = (effets: EffetIndesirableRuntime[]) =>
  construireSafetyFindings([], effets, []).findings.filter(f => f.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE);

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
    const regle = construireSafetyFindings([], [], []).rules
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
    const { findings, rules, limitations } = construireSafetyFindings([], [RATTACHE, SANS_RATTACHEMENT], []);
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

describe('table signée — la règle amendée ne retire plus rien de la carte', () => {
  // LE CŒUR DE L'AMENDEMENT (D-281 §1, §3). La règle livrée faisait de ce
  // signalement un constat qui inhibait tout le dossier ; la garde est
  // désormais à la diffusion, et la carte reste entière.
  it.each(['recu', 'en_cours', 'traite', 'clos'])(
    'un signalement rattaché (statut %o) ne produit aucun constat',
    (statutTraitement) => {
      simulerSignature();
      expect(constatsEI([{ ...RATTACHE, statutTraitement }])).toHaveLength(0);
    },
  );

  it.each(['ne_sait_pas', 'autre_produit'])(
    '« %s » ne produit aucun constat',
    (rattachement) => {
      simulerSignature();
      expect(constatsEI([{ ...RATTACHE, rattachement }])).toHaveLength(0);
    },
  );

  it('la règle validée est jointe à la revue', () => {
    simulerSignature();
    const { rules } = construireSafetyFindings([], [RATTACHE], []);
    expect(rules.find(r => r.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)?.lifecycle).toBe('clinically_validated');
  });

  // D-281 §5, arbitrage du 2026-10-17. La limitation des signalements hors
  // règle entrait dans l'empreinte : un « non » au programme, ou son passage à
  // « traité », faisait dériver la carte servie et éteignait le programme au
  // portail. Ils restent comptés au panneau, au Fil et au prévol, hors de
  // l'empreinte (`effetsNonTraites`).
  it.each([
    ['rattaché', RATTACHE],
    ['sans rattachement ni programme', SANS_RATTACHEMENT],
    ['formulaire d’avant', FORMULAIRE_D_AVANT],
  ])('un signalement %s n’ajoute aucune limitation à la revue', (_cas, signalement) => {
    simulerSignature();
    expect(construireSafetyFindings([], [signalement], []).limitations).toHaveLength(0);
  });

  // LA PROPRIÉTÉ QUI FERME LA DÉRIVE : la sortie est la même avec ou sans
  // signalement, quels que soient leur nombre, leur rattachement et leur
  // statut. Ce qui ne bouge pas la sortie ne bouge pas l'empreinte.
  it('la sortie ne dépend d’aucun signalement — ni de leur nombre, ni de leur statut', () => {
    simulerSignature();
    const sans = construireSafetyFindings([], [], []);
    for (const effets of [
      [SANS_RATTACHEMENT],
      [{ ...SANS_RATTACHEMENT, statutTraitement: 'traite' }],
      [SANS_RATTACHEMENT, { ...SANS_RATTACHEMENT, id: 'AER-6', statutTraitement: 'recu' }],
      [RATTACHE, SANS_RATTACHEMENT, FORMULAIRE_D_AVANT, { ...SANS_RATTACHEMENT, id: 'AER-5', statutTraitement: 'clos' }],
    ]) {
      expect(construireSafetyFindings([], effets, [])).toEqual(sans);
    }
  });
});
