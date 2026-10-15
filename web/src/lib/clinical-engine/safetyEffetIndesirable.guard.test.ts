import { afterEach, describe, expect, it } from 'vitest';

import {
  CONDUITE_EFFET_INDESIRABLE,
  REGLE_SECURITE_EFFET_INDESIRABLE,
  SAFETY_EI_METADATA,
  SAFETY_EI_SHA256,
  STATUTS_EI_NON_TRAITES,
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
//   3. un signalement ouvert HORS RÈGLE (sans rattachement) se DIT (`DC-35`) ;
//   4. le verrou couvre la conduite et les trois textes patient signés.
//
// La table est livrée NON SIGNÉE : la signature est simulée puis restaurée,
// exactement comme le banc de la chaîne C1 simule celle des priorités.

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

describe('état LIVRÉ — la production ne change pas au merge', () => {
  it('la table n’est pas signée et le drapeau est absent', () => {
    expect(tableEffetIndesirableSignee()).toBe(false);
    expect(associationEffetIndesirableDisponible()).toBe(false);
    expect(interruptionEffetIndesirableActive()).toBe(false);
  });

  it('non signée : aucun constat, la règle en `candidate`, aucune limitation', () => {
    const { findings, rules, limitations } = construireSafetyFindings([], [RATTACHE, SANS_RATTACHEMENT], []);
    expect(findings).toHaveLength(0);
    expect(rules.find(r => r.ruleId === REGLE_SECURITE_EFFET_INDESIRABLE)?.lifecycle).toBe('candidate');
    expect(limitations).toHaveLength(0);
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

describe('le périmètre signé — la conduite et les trois textes patient', () => {
  // Le SHA est recalculé ici depuis les textes servis : un texte retouché au
  // portail sans nouvelle signature changerait l'empreinte, donc fermerait le
  // verrou — le patient ne lit jamais un texte que le praticien n'a pas signé.
  it('l’empreinte couvre la conduite, les textes de D-281 §4 et les statuts ouverts, et rien d’autre', () => {
    expect(SAFETY_EI_SHA256).toBe(sha256(JSON.stringify({
      conduite: CONDUITE_EFFET_INDESIRABLE,
      textes: [TEXTE_PAUSE_ELEMENT, TEXTE_PAUSE_COMPLEMENTS, TEXTE_PAUSE_AVIS_RENDU],
      statuts: STATUTS_EI_NON_TRAITES,
    })));
  });

  it('la conduite dit le blocage de la diffusion et que le statut ne lève rien', () => {
    expect(CONDUITE_EFFET_INDESIRABLE).toMatch(/aucun programme ne se diffuse/);
    expect(CONDUITE_EFFET_INDESIRABLE).toMatch(/Le statut ne lève rien/);
  });
});

describe('l’ordre des deux gestes — capturer avant d’interrompre', () => {
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

  it('un signalement rattaché n’entre pas dans la limitation : il a sa file d’avis', () => {
    simulerSignature();
    expect(construireSafetyFindings([], [RATTACHE], []).limitations).toHaveLength(0);
  });

  // `DC-35` — hors règle, la machine ne peut rien conclure ; se taire ferait
  // disparaître un signalement ouvert de la vue du praticien.
  it('un signalement ouvert sans rattachement se dit', () => {
    simulerSignature();
    const { limitations } = construireSafetyFindings([], [SANS_RATTACHEMENT], []);
    expect(limitations.join(' ')).toMatch(/rattachés à aucun élément/);
  });

  // D-281 §5, arbitrage du 2026-10-14 : le formulaire d'avant attend l'avis et
  // bloque la diffusion. Le dire « hors règle » contredirait la garde.
  it('le formulaire d’avant (programme sans élément désigné) n’est pas hors règle : il a sa file d’avis', () => {
    simulerSignature();
    expect(constatsEI([FORMULAIRE_D_AVANT])).toHaveLength(0);
    expect(construireSafetyFindings([], [FORMULAIRE_D_AVANT], []).limitations).toHaveLength(0);
  });

  it('le compte annoncé est celui des signalements OUVERTS hors règle', () => {
    simulerSignature();
    const { limitations } = construireSafetyFindings([], [
      RATTACHE,
      SANS_RATTACHEMENT,
      FORMULAIRE_D_AVANT,
      { ...SANS_RATTACHEMENT, id: 'AER-5', statutTraitement: 'clos' },
      { ...SANS_RATTACHEMENT, id: 'AER-6' },
    ], []);
    expect(limitations.join(' ')).toContain('2 signalement(s)');
  });

  it('la limitation ne cite ni identifiant, ni programme, ni mot du patient', () => {
    simulerSignature();
    const texte = construireSafetyFindings([], [SANS_RATTACHEMENT, FORMULAIRE_D_AVANT], []).limitations.join(' ');
    expect(texte).not.toContain('AER-');
    expect(texte).not.toContain('DRAFT-1');
  });
});
