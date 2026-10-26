import { describe, expect, it } from 'vitest';
import { contientTermePrescriptif } from '@/lib/documents/vocabulaire';
import { SIGNATURE_PRATICIEN } from './signature';
import { genererCourrierComplement, PREFIXE_ANCRAGE_COMPLEMENT } from './courrierComplement';

const ANCRAGE = { version: `${PREFIXE_ANCRAGE_COMPLEMENT}${'a'.repeat(64)}`, sha256: 'a'.repeat(64) };

function generer(lignes: { intitule: string }[], patientNom = 'Sophie Nicola') {
  return genererCourrierComplement({
    patientId: 'pat-fixture',
    lignes,
    ancrage: ANCRAGE,
    dateCourrier: '2026-10-24T09:30:00.000Z',
    patientNom,
  });
}

describe('genererCourrierComplement — le texte validé du 2026-10-24 (D-345 §7), lignes revalidées le 2026-10-26 (D-381)', () => {
  it('rend exactement le texte validé, liste comprise', () => {
    const genere = generer([
      { intitule: 'Explorer un apport ciblé' },
      { intitule: 'Seconde intention' },
    ]);
    expect(genere.ok).toBe(true);
    if (!genere.ok) return;
    expect(genere.courrier.texte).toBe([
      'Docteur,',
      'Dans le cadre d’un accompagnement en neuronutrition, j’envisage de proposer à la personne que vous suivez '
        + 'les compléments alimentaires ci-dessous. Sa situation justifie que vous en soyez informé avant qu’ils '
        + 'n’entrent à son programme : je vous les transmets pour votre appréciation, la décision médicale vous '
        + 'appartenant pleinement.',
      '- Explorer un apport ciblé.\n- Seconde intention.',
      'Ce courrier vous est remis par la personne elle-même. Vos observations éventuelles seront les bienvenues ; '
        + 'il ne remplace pas une consultation sans délai si son état le demande.',
      'Avec mes remerciements pour votre lecture. Courrier préparé le 2026-10-24.',
      SIGNATURE_PRATICIEN,
    ].join('\n\n'));
  });

  it('le nom du patient est dans l’en-tête du rendu, jamais dans le texte consigné', () => {
    const genere = generer([{ intitule: 'Intention' }]);
    expect(genere.ok).toBe(true);
    if (!genere.ok) return;
    expect(genere.courrier.texte).not.toContain('Sophie');
    expect(genere.courrier.html).toContain('Sophie Nicola');
  });

  it('ne nomme ni population ni situation (forme opaque), et passe la garde non prescriptive', () => {
    const genere = generer([{ intitule: 'Intention' }]);
    expect(genere.ok).toBe(true);
    if (!genere.ok) return;
    expect(genere.courrier.texte).not.toMatch(/grossesse|allaitement|mineur|enceinte|S-MG/i);
    expect(contientTermePrescriptif(genere.courrier.texte)).toBe(false);
  });

  it('porte l’ancrage de la table signée dans la provenance du bloc rendu', () => {
    const genere = generer([{ intitule: 'Intention' }]);
    expect(genere.ok && genere.courrier.document.blocs[0]?.provenance).toEqual({
      source: 'complement_cible',
      ancrageHash: ANCRAGE.sha256,
      version: ANCRAGE.version,
    });
  });

  it('un intitulé prescriptif refuse le courrier — jamais un rendu contourné', () => {
    expect(generer([{ intitule: 'Posologie à revoir' }])).toEqual({ ok: false, raison: 'terme_prescriptif' });
  });

  it('D-381 — deux lignes identiques n’en font qu’une, à la première place', () => {
    const genere = generer([
      { intitule: 'Magnésium' },
      { intitule: 'Seconde intention' },
      { intitule: ' Magnésium ' },
    ]);
    expect(genere.ok && genere.courrier.texte).toContain('- Magnésium.\n- Seconde intention.\n\nCe courrier');
  });

  it('aucun complément : aucun courrier', () => {
    expect(generer([])).toEqual({ ok: false, raison: 'aucun_complement' });
    expect(generer([{ intitule: '  ' }])).toEqual({ ok: false, raison: 'aucun_complement' });
  });
});
