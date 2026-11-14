import { describe, expect, it } from 'vitest';
import { dateurRelatif } from './datesExport';
import type { BiologieExport, BlocExport } from './modele';
import { sectionBiologie } from './sectionBiologie';

// Section 5 de l'export ([[D-519]]) : des faits, aucune interprétation.

const BIOLOGIE: BiologieExport = {
  nonLues: 0,
  analytes: [{
    analyteCode: 'K',
    libelle: 'Potassium',
    mesures: [
      {
        preleveLe: new Date('2026-09-10T08:00:00.000Z'),
        valeur: '4.2',
        unite: 'mmol/L',
        intervalle: { texte: '3,5 - 5,0' },
        laboratoire: 'Laboratoire A',
        corrigee: false,
      },
      {
        preleveLe: new Date('2026-09-20T08:00:00.000Z'),
        valeur: '4.4',
        unite: null,
        intervalle: { absence: 'correction' },
        laboratoire: null,
        corrigee: true,
      },
    ],
  }],
};

function textes(blocs: BlocExport[]): string[] {
  return blocs.flatMap(b => (b.type === 'liste' ? b.elements : 'texte' in b ? [b.texte] : []));
}

describe('sectionBiologie', () => {
  it('version complète : date, valeur, intervalle cité, laboratoire', () => {
    const blocs = sectionBiologie(BIOLOGIE);
    expect(blocs[0]).toEqual({ type: 'titre', niveau: 1, texte: '5. Résultats de biologie' });
    expect(blocs).toContainEqual({ type: 'titre', niveau: 2, texte: 'Potassium' });
    expect(blocs).toContainEqual({
      type: 'liste',
      elements: [
        '10/09/2026 : 4.2 mmol/L — intervalle imprimé par le laboratoire : « 3,5 - 5,0 » — laboratoire : « Laboratoire A »',
        '20/09/2026 : 4.4 (valeur corrigée par le praticien) — intervalle du laboratoire : non repris (valeur corrigée par le praticien) — laboratoire non identifié',
      ],
    });
  });

  it('jamais une qualification de la valeur, sur aucune ligne de mesure', () => {
    const tout = sectionBiologie(BIOLOGIE).flatMap(b => (b.type === 'liste' ? b.elements : [])).join('\n');
    expect(tout).not.toMatch(/\b(élevé|bas|haut|normal|anormal|optimal|carence)\b/i);
  });

  it('version relative : jours relatifs, aucun laboratoire, le retrait est dit', () => {
    const dateur = dateurRelatif({ jour: '2026-09-01', repere: 'consultation' });
    const tout = textes(sectionBiologie(BIOLOGIE, dateur));
    expect(tout).toContain(
      'J+9 : 4.2 mmol/L — intervalle imprimé par le laboratoire : « 3,5 - 5,0 »',
    );
    expect(tout.join('\n')).not.toMatch(/— laboratoire|laboratoire non identifié|\d{2}\/\d{2}\/\d{4}/);
    expect(tout).toContain('Le nom du laboratoire est retiré de cette version : il peut situer le patient.');
  });

  it('mesures non lues : la phrase d’alerte les compte ; dossier vide : dit tel quel', () => {
    const blocs = sectionBiologie({ analytes: [], nonLues: 3 });
    expect(blocs).toContainEqual({
      type: 'paragraphe',
      texte: "3 résultats validés depuis un compte rendu dont la lecture n'est pas consignée ne figurent pas dans ce document.",
      ton: 'alerte',
    });
    expect(blocs).toContainEqual({ type: 'paragraphe', texte: 'Aucun résultat de biologie du dossier ne remplit ces conditions.' });
  });
});
