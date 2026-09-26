import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { assiettesParIndication, assiettesParMomentDeRepas } from '@/lib/food-compass/plates';
import { INDICATIONS_ASSIETTES_V1 } from '@/lib/clinical/indicationsAssiettesV1';
import { FICHE_MY_PAR_ASSIETTE, ficheSourceDeLAssiette } from './appariement';

// BANC DE GARDE DE L'APPARIEMENT ASSIETTE → FICHE MY ([[D-251]]).
//
// CE QU'IL DOIT EMPÊCHER : qu'une assiette remette au patient la fiche d'une
// AUTRE assiette. L'appariement n'était écrit qu'en prose ; une paire fausse
// ici serait une fiche d'éviction remise à qui on a proposé une assiette
// protéinée. D'où trois épreuves indépendantes : la règle du registre
// (`sourceProtocole + 12`), les titres, et le statut de support patient.

type Notice = {
  sourceId: string;
  title: string;
  documentType: string;
  prescriptive: boolean;
  audienceOriginal?: string;
};

const REGISTRE: Notice[] = JSON.parse(
  readFileSync(join(__dirname, '../../../../docs/claude/corpus/source_registry.json'), 'utf8'),
);
const notice = (sourceId: string) => REGISTRE.find(n => n.sourceId === sourceId);

/** « protocole assiette dépargne digestive def.pdf » → « dargnedigestive »… sans accents ni bruit. */
function sujetDuTitre(titre: string): string {
  const apres = titre.toLowerCase().split('assiette ')[1] ?? '';
  return apres
    .replace(/\.pdf$/u, '')
    .replace(/\b(def|docx)\b/gu, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-z0-9]/gu, '');
}

describe('appariement assiette → Fiche MY', () => {
  it('couvre EXACTEMENT les assiettes d’indication du catalogue — ni plus, ni moins', () => {
    const indication = assiettesParIndication().map(p => p.plateCode).sort();
    expect(Object.keys(FICHE_MY_PAR_ASSIETTE).sort()).toEqual(indication);
    expect(indication).toHaveLength(12);
  });

  it('chaque fiche est celle du protocole de l’assiette : la règle du registre, paire par paire', () => {
    for (const plate of assiettesParIndication()) {
      const numero = Number(/^WN-SRC-(\d{4})$/.exec(plate.sourceProtocole ?? '')?.[1]);
      expect(Number.isInteger(numero)).toBe(true);
      expect(FICHE_MY_PAR_ASSIETTE[plate.plateCode]).toBe(`WN-SRC-${String(numero + 12).padStart(4, '0')}`);
    }
  });

  it('les titres concordent : le protocole et sa fiche parlent de la même assiette', () => {
    for (const plate of assiettesParIndication()) {
      const protocole = notice(plate.sourceProtocole ?? '');
      const fiche = notice(FICHE_MY_PAR_ASSIETTE[plate.plateCode]);
      expect(protocole?.title.toLowerCase()).toContain('protocole assiette');
      expect(fiche?.title).toMatch(/^Fiche MY assiette /u);
      expect(sujetDuTitre(fiche?.title ?? '')).toBe(sujetDuTitre(protocole?.title ?? ''));
    }
  });

  it('chaque fiche est un SUPPORT PATIENT, non prescriptif ([[D-216]])', () => {
    for (const sourceId of Object.values(FICHE_MY_PAR_ASSIETTE)) {
      const fiche = notice(sourceId);
      expect(fiche?.documentType).toBe('Support patient');
      expect(fiche?.prescriptive).toBe(false);
      expect(fiche?.audienceOriginal).toBe('Patient');
    }
  });

  it('CONTRE-ÉPREUVE : une fiche ne fonde jamais une règle', () => {
    const fiches = new Set(Object.values(FICHE_MY_PAR_ASSIETTE));
    // Jamais le protocole source d'une assiette…
    for (const plate of assiettesParIndication()) expect(fiches.has(plate.sourceProtocole ?? '')).toBe(false);
    // … ni un claim d'indication ou de sécurité d'une ligne signée.
    const numeros = new Set([...fiches].map(id => id.slice('WN-SRC-'.length)));
    for (const ligne of INDICATIONS_ASSIETTES_V1) {
      for (const claim of [...ligne.claimsIndication, ...ligne.claimsSecurite]) {
        expect(numeros.has(claim.claimId.slice('WN-CL-'.length, 'WN-CL-'.length + 4))).toBe(false);
      }
    }
    // La fiche anti-douleur n'a pas de protocole apparié : elle n'entre pas.
    expect(fiches.has('WN-SRC-0354')).toBe(false);
  });

  it('un repère de moment de repas, un code inconnu ou une clé d’objet n’ont pas de fiche', () => {
    for (const plate of assiettesParMomentDeRepas()) expect(ficheSourceDeLAssiette(plate.plateCode)).toBeNull();
    expect(ficheSourceDeLAssiette('ASSIETTE_INCONNUE')).toBeNull();
    expect(ficheSourceDeLAssiette('toString')).toBeNull();
    expect(ficheSourceDeLAssiette('__proto__')).toBeNull();
    expect(ficheSourceDeLAssiette('ASSIETTE_PROTEINEE')).toBe('WN-SRC-0300');
  });
});
