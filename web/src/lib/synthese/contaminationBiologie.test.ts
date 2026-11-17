import { describe, expect, it } from 'vitest';
import {
  CHAMPS_CONTROLES,
  lireTraceBlocBiologie,
  motifAffiche,
  releverFormes,
  verdictContamination,
  versionSchemaConservee,
  type TraceBlocBiologie,
} from './contaminationBiologie';

// [[D-513]] §5 et §11 : le détecteur, ses frontières, ses limites. Données
// entièrement fictives : aucune valeur n'est une lecture de dossier.

const TRACE: TraceBlocBiologie = {
  texte: '## Résultats de biologie\nFerritine — 2 prélèvements.',
  formes: {
    valeursUnites: [
      { valeur: '32', unite: 'µg/L' },
      { valeur: '4.5', unite: 'mmol/L' },
    ],
    intervalles: ['30 - 400'],
  },
};

function donnees(trace: unknown = TRACE, versionSchema: unknown = 'synthese-json-v4') {
  return { blocBiologie: trace, metadonneesPrompt: { versionSchema } };
}

function synthese(patch: Record<string, unknown> = {}) {
  return {
    resume_praticien: 'Résumé sans biologie.',
    axes_prioritaires: [{ axe: 'Sommeil', niveau_priorite: 'modere', arguments: ['PSQI'], points_a_confirmer: ['Horaires'] }],
    points_de_vigilance: ['Interaction possible avec un traitement.'],
    questions_entretien: ['Comment dormez-vous ?'],
    narratif_patient: 'Votre praticien a reçu votre bilan biologique du 12 mars 2026.',
    limites: 'Synthèse générée par IA — à valider par le praticien.',
    resume_biologie_praticien: 'Ferritine le 2026-03-12 : 32 µg/L. Intervalle imprimé par le laboratoire : 30 - 400.',
    points_de_vigilance_biologie: ['Ferritine 32 µg/L : contexte de prélèvement non recueilli.'],
    ...patch,
  };
}

describe('verdict — sans bloc, rien à chercher', () => {
  it('aucune trace : jamais suspecte, même si un champ porte une valeur et son unité', () => {
    expect(verdictContamination(synthese({ resume_praticien: '32 µg/L' }), {})).toEqual({ suspecte: false });
    expect(verdictContamination(synthese({ resume_praticien: '32 µg/L' }), { blocBiologie: null })).toEqual({ suspecte: false });
  });

  it('une trace illisible vaut aucun bloc', () => {
    expect(lireTraceBlocBiologie({ blocBiologie: 'texte' })).toBeNull();
    expect(lireTraceBlocBiologie({ blocBiologie: { texte: '  ' } })).toBeNull();
  });
});

describe('verdict — les deux champs biologiques ne sont pas contrôlés', () => {
  it('une restitution dans les champs dédiés ne rend rien suspect', () => {
    expect(verdictContamination(synthese(), donnees())).toEqual({ suspecte: false });
  });
});

describe('verdict — chacun des six champs ordinaires, limites compris', () => {
  const contamines: Record<string, unknown> = {
    resume_praticien: 'Ferritine à 32 µg/L.',
    axes_prioritaires: [{ axe: 'Fer', niveau_priorite: 'modere', arguments: ['valeur 32 µg/L'], points_a_confirmer: [] }],
    points_de_vigilance: ['Valeur de 32 µg/L.'],
    questions_entretien: ['Le 32 µg/L a-t-il été mesuré à jeun ?'],
    narratif_patient: 'Votre ferritine est de 32 µg/L.',
    limites: 'Intervalle 30 - 400 à relire.',
  };
  for (const champ of CHAMPS_CONTROLES) {
    it(`${champ} : bloque`, () => {
      const v = verdictContamination(synthese({ [champ]: contamines[champ] }), donnees());
      expect(v.suspecte).toBe(true);
      if (v.suspecte && v.motif === 'formes_relevees') expect(v.releves.map((r) => r.champ)).toEqual([champ]);
    });
  }

  it('une correction lève le blocage', () => {
    expect(verdictContamination(synthese({ limites: 'Intervalle 30 - 400.' }), donnees()).suspecte).toBe(true);
    expect(verdictContamination(synthese({ limites: 'À valider par le praticien.' }), donnees()).suspecte).toBe(false);
  });
});

describe('formes — valeur_unite', () => {
  const r = (texte: string) => releverFormes(synthese({ resume_praticien: texte }), TRACE).filter((x) => x.champ === 'resume_praticien');

  it('virgule ou point décimal', () => {
    expect(r('4,5 mmol/L')).toEqual([{ champ: 'resume_praticien', code: 'valeur_unite' }]);
    expect(r('4.5 mmol/L')).toHaveLength(1);
  });

  it('espaces facultatives ou insécables', () => {
    expect(r('32µg/L')).toHaveLength(1);
    expect(r('32 µg/L')).toHaveLength(1);
  });

  it('frontières : un autre nombre ou une autre unité ne correspond pas', () => {
    expect(r('132 µg/L')).toEqual([]);
    expect(r('1,32 µg/L')).toEqual([]);
    expect(r('32 µg/Lx')).toEqual([]);
    expect(r('45 mmol/L')).toEqual([]);
  });

  it('limites assumées : ni la valeur seule, ni un nom d’analyte, ni des toutes lettres, ni une autre graphie', () => {
    expect(r('le 32 du mois')).toEqual([]);
    expect(r('la ferritine')).toEqual([]);
    expect(r('trente-deux microgrammes par litre')).toEqual([]);
    expect(r('32 mcg/L')).toEqual([]);
  });
});

describe('formes — intervalle', () => {
  const r = (texte: string) => releverFormes(synthese({ resume_praticien: texte }), TRACE).filter((x) => x.champ === 'resume_praticien');

  it('le texte de l’intervalle, espaces normalisées', () => {
    expect(r('entre 30 - 400')).toEqual([{ champ: 'resume_praticien', code: 'intervalle' }]);
    expect(r('entre 30  - 400')).toHaveLength(1);
  });

  it('limite assumée : un intervalle reformulé ou séparé en bornes échappe', () => {
    expect(r('entre 30 et 400')).toEqual([]);
    expect(r('30-400')).toEqual([]);
  });
});

describe('anciennes synthèses — schéma conservé antérieur à v4 (D-513 §5)', () => {
  it('un bloc sous un schéma antérieur rend suspecte, même sans forme relevée', () => {
    expect(verdictContamination(synthese(), donnees(TRACE, 'synthese-json-v3'))).toEqual({
      suspecte: true, motif: 'schema_anterieur', releves: [],
    });
  });

  it('la version absente ou mal formée vaut antérieure', () => {
    expect(verdictContamination(synthese(), donnees(TRACE, null)).suspecte).toBe(true);
    expect(verdictContamination(synthese(), donnees(TRACE, 'v4')).suspecte).toBe(true);
  });

  it('la version se lit dans la trace, jamais dans le JSON normalisé', () => {
    const v = verdictContamination(synthese({ _schema_version: 'synthese-json-v4' }), donnees(TRACE, 'synthese-json-v3'));
    expect(v.suspecte).toBe(true);
    expect(versionSchemaConservee({ metadonneesPrompt: { versionSchema: 'synthese-json-v3' } })).toBe('synthese-json-v3');
  });

  it('un bloc illisible sous un schéma antérieur reste bloqué (contre-revue Codex)', () => {
    expect(verdictContamination(synthese(), donnees({ texte: '' }, 'synthese-json-v3')).suspecte).toBe(true);
    expect(verdictContamination(synthese(), donnees('illisible', 'synthese-json-v3')).suspecte).toBe(true);
    expect(verdictContamination(synthese(), donnees({ texte: '' }, 'synthese-json-v4'))).toEqual({ suspecte: false });
  });

  it('sans bloc, une ancienne synthèse n’est pas suspecte', () => {
    expect(verdictContamination(synthese(), { metadonneesPrompt: { versionSchema: 'synthese-json-v3' } })).toEqual({ suspecte: false });
  });
});

describe('motif affiché — en français, sans le texte relevé', () => {
  it('nomme les champs, jamais la valeur', () => {
    const v = verdictContamination(synthese({ narratif_patient: 'Ferritine : 32 µg/L.' }), donnees());
    if (!v.suspecte) throw new Error('attendu suspect');
    const motif = motifAffiche(v);
    expect(motif).toContain('texte patient');
    expect(motif).not.toContain('32');
  });
});

describe('limites déclarées au §5 — tenues par le banc', () => {
  it('faux positif assumé : un intervalle se relève sans frontière (« 30 - 400 » dans « 130 - 4000 »)', () => {
    const r = releverFormes(synthese({ resume_praticien: 'entre 130 - 4000' }), TRACE).filter((x) => x.champ === 'resume_praticien');
    expect(r).toEqual([{ champ: 'resume_praticien', code: 'intervalle' }]);
  });

  it('faux positif assumé : une quantité déclarée identique à une forme est signalée', () => {
    const v = verdictContamination(synthese({ narratif_patient: 'Vous déclarez 4,5 mmol/L.' }), donnees());
    expect(v.suspecte).toBe(true);
  });

  it('une trace aux caractères spéciaux ne fait jamais lever le détecteur', () => {
    const bizarre: TraceBlocBiologie = {
      texte: 'bloc',
      formes: { valeursUnites: [{ valeur: '1.5', unite: '(x)[y]{z}*+?^$|\\/' }], intervalles: ['< 5 \\ "'] },
    };
    expect(() => verdictContamination(synthese(), donnees(bizarre))).not.toThrow();
    expect(releverFormes(synthese({ limites: '1,5 (x)[y]{z}*+?^$|\\/' }), bizarre)).toEqual([{ champ: 'limites', code: 'valeur_unite' }]);
  });

  it('le motif d’une synthèse qui n’est plus un brouillon IA renvoie à une nouvelle synthèse', () => {
    const v = verdictContamination(synthese({ resume_praticien: '32 µg/L' }), donnees());
    if (!v.suspecte) throw new Error('attendu suspect');
    expect(motifAffiche(v, 'Validee_Praticien')).toContain('générez-en une nouvelle');
    expect(motifAffiche(v, 'Brouillon_IA')).toContain('Corrigez ce texte dans l’éditeur');
  });
});
