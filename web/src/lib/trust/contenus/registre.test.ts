import { describe, expect, it } from 'vitest';
import { canonicalSha256 } from '@/lib/clinical-engine/canonical';
import {
  getDocumentCourant,
  getVersion,
  REGISTRE_DOCUMENTS_TRUST,
  VERSION_CONSENTEMENT_COURANTE,
} from './registre';

describe('registre des documents TRUST', () => {
  it('verrouille le hash de chaque version publiée — modifier un texte sans créer de version casse ce test', () => {
    for (const doc of REGISTRE_DOCUMENTS_TRUST) {
      const recalcule = canonicalSha256({
        key: doc.key,
        version: doc.version,
        titre: doc.titre,
        resume: doc.resume,
        sections: doc.sections,
      });
      expect(recalcule, `${doc.key}@${doc.version}`).toBe(doc.hash);
    }
  });

  it('expose les six documents v1 attendus', () => {
    const cles = REGISTRE_DOCUMENTS_TRUST.map(d => `${d.key}@${d.version}`);
    expect(cles).toEqual([
      'cadre_accompagnement@v1',
      'limites_securite@v1',
      'donnees_confidentialite@v1',
      'usage_ia@v1',
      'droits_patient@v1',
      'consentement_suivi@v2',
    ]);
  });

  it('chaque version porte un résumé, au moins une section et une date de publication', () => {
    for (const doc of REGISTRE_DOCUMENTS_TRUST) {
      expect(doc.resume.length).toBeGreaterThan(10);
      expect(doc.sections.length).toBeGreaterThan(0);
      expect(doc.publieLe).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('getDocumentCourant retourne la version la plus récemment publiée et getVersion retrouve une version exacte', () => {
    expect(getDocumentCourant('consentement_suivi').version).toBe('v2');
    expect(getVersion('consentement_suivi', 'v2')?.hash).toBe(
      getDocumentCourant('consentement_suivi').hash,
    );
    expect(getVersion('consentement_suivi', 'v99')).toBeNull();
    expect(() => getDocumentCourant('inconnu' as never)).toThrow();
  });

  it('la version de consentement courante est celle du document consentement_suivi', () => {
    expect(VERSION_CONSENTEMENT_COURANTE).toBe('v2');
  });

  it("aucun document n'utilise le lexique interdit ni ne promet une surveillance", () => {
    const texte = JSON.stringify(REGISTRE_DOCUMENTS_TRUST).toLowerCase();
    for (const interdit of ['ordonnance', 'prescription', 'diagnostic médical établi', 'neuroscore', 'surveillance 24']) {
      expect(texte).not.toContain(interdit);
    }
    // « diagnostic » n'apparaît que dans des négations (« hors diagnostic », « pas de diagnostic »).
    const occurrences = texte.match(/[^«»]{30}diagnostic/g) ?? [];
    for (const contexte of occurrences) {
      expect(/n['’]établit pas|hors diagnostic|pas un diagnostic|ne constitue pas/.test(contexte)).toBe(true);
    }
  });
});
