import { describe, expect, it } from 'vitest';
import { preparerCorrespondance } from '@/lib/praticien/correspondanceMedecin';
import { SIGNATURE_PRATICIEN } from '@/lib/correspondance/signature';
import { contientTermePrescriptif } from '@/lib/documents/vocabulaire';
import { SAFETY_SIGNAL_CONDUITES, SAFETY_SIGNALS_V1 } from './safetySignalsV1';
import { genererCourrierAdressage, VERSION_ANCRAGE_ADRESSAGE } from './courrierAdressage';

// Un signal de chaque rang, pris DANS la table signée — jamais inventé ici : un
// libellé de fixture qui n'existe pas dans la table éprouverait le cas « hors
// cotation » en croyant éprouver le cas nominal.
const ADRESSAGE = SAFETY_SIGNALS_V1.find(s => s.rang === 'adressage')!.libelle;
const ADRESSAGE_2 = SAFETY_SIGNALS_V1.filter(s => s.rang === 'adressage')[1]!.libelle;
const VIGILANCE = SAFETY_SIGNALS_V1.find(s => s.rang === 'vigilance')!.libelle;

function entree(signaux: string[], surcharge: Record<string, unknown> = {}) {
  return {
    patientId: 'PAT_TEST',
    signaux,
    tableSha256: 'sha-fixture',
    dateCourrier: '2026-09-16T00:00:00.000Z',
    ...surcharge,
  };
}

describe('genererCourrierAdressage — ce que la lettre porte', () => {
  it('rend une lettre non prescriptive par le chokepoint médecin', () => {
    const resultat = genererCourrierAdressage(entree([ADRESSAGE]));
    expect(resultat.ok).toBe(true);
    if (!resultat.ok) return;
    expect(resultat.courrier.texte).toContain(ADRESSAGE);
    expect(resultat.courrier.document.modeleId).toBe('courrier_adressage');
    // La garde a jugé le corps — et le texte ne la contourne pas.
    expect(contientTermePrescriptif(resultat.courrier.texte)).toBe(false);
  });

  it('RECOPIE le texte de conduite du rang, il ne le reformule pas', () => {
    // Reformuler ce texte en ferait un contenu clinique sans provenance
    // (`DC-19`) : il est signé, il se recopie au caractère près.
    const resultat = genererCourrierAdressage(entree([ADRESSAGE]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte).toContain(SAFETY_SIGNAL_CONDUITES.adressage);
  });

  it('écarte le rang « vigilance » : il ne suspend rien', () => {
    // MÊME RÈGLE que le producteur de constats, et ce n'est pas une coïncidence :
    // la lettre doit porter exactement ce qui suspend la décision ([[D-099]]).
    const resultat = genererCourrierAdressage(entree([ADRESSAGE, VIGILANCE]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte).toContain(ADRESSAGE);
    expect(resultat.courrier.texte).not.toContain(VIGILANCE);
  });

  it('sans aucun signal d’adressage, il n’y a pas de lettre', () => {
    expect(genererCourrierAdressage(entree([VIGILANCE])).ok).toBe(false);
    expect(genererCourrierAdressage(entree([]))).toEqual({
      ok: false,
      raison: 'aucun_signal_adressage',
    });
    const seulementVigilance = genererCourrierAdressage(entree([VIGILANCE]));
    if (seulementVigilance.ok) throw new Error('lettre inattendue');
    expect(seulementVigilance.raison).toBe('aucun_signal_adressage');
  });

  it('un libellé INCONNU de la cotation part quand même, et la lettre le DIT', () => {
    // Fail-closed : un signal dont on ne sait pas le rang est un silence sur le
    // rang, jamais une permission (`DC-13`, `DC-24`). Le faire passer pour coté
    // serait l'inverse — une affirmation que la table ne soutient pas.
    const inconnu = 'Libellé qui a dérivé sans que la cotation suive';
    const resultat = genererCourrierAdressage(entree([inconnu]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte).toContain(inconnu);
    expect(resultat.courrier.texte).toContain('(†)');
    expect(resultat.courrier.texte).toContain('n’appartiennent pas à la liste');
  });

  it('une lettre entièrement cotée ne porte NI marque NI mention de dérive', () => {
    const resultat = genererCourrierAdressage(entree([ADRESSAGE, ADRESSAGE_2]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte).not.toContain('(†)');
    expect(resultat.courrier.texte).not.toContain('n’appartiennent pas à la liste');
  });

  it('dit que les signaux sont DÉCLARÉS, et qu’ils ne diagnostiquent rien', () => {
    // Lire ces libellés sans leur provenance ferait passer une déclaration de
    // patient pour une mesure — et la lettre part chez un médecin.
    const resultat = genererCourrierAdressage(entree([ADRESSAGE]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte).toContain('DÉCLARÉS par le patient');
    expect(resultat.courrier.texte).toContain('n’ont fait l’objet');
    expect(resultat.courrier.texte).toContain('ni un diagnostic');
  });

  it('signe la lettre, et la signature part par les DEUX chemins de remise', () => {
    const resultat = genererCourrierAdressage(entree([ADRESSAGE]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte.endsWith(SIGNATURE_PRATICIEN)).toBe(true);
    expect(resultat.courrier.html).toContain('Docteur en Pharmacie');
  });

  it('l’en-tête du rendu nomme le patient ; le texte consigné, lui, ne le nomme pas', () => {
    const resultat = genererCourrierAdressage(entree([ADRESSAGE], { patientNom: 'Sophie Nicola' }));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.html).toContain('Sophie Nicola');
    expect(resultat.courrier.texte).not.toContain('Sophie Nicola');
  });
});

describe('ancrage et couplage rendu ↔ consigné', () => {
  it('estampille le LITTÉRAL de version, jamais une métadonnée', () => {
    // [[D-079]] : le SHA fait foi, et l'estampille ne dérive d'aucune
    // métadonnée — une re-signature sans changement de contenu ne périme
    // aucune lettre.
    const resultat = genererCourrierAdressage(entree([ADRESSAGE]));
    if (!resultat.ok) throw new Error('refus inattendu');
    const provenance = resultat.courrier.document.blocs[0].provenance;
    expect(provenance.version).toBe(VERSION_ANCRAGE_ADRESSAGE);
    expect(provenance.version).toBe('safety-signals-nnpp2-v1');
    expect(provenance.ancrageHash).toBe('sha-fixture');
    expect(provenance.source).toBe('signaux_securite_anamnese');
  });

  it('le texte consigné EST le contenu médecin du document rendu', () => {
    const resultat = genererCourrierAdressage(entree([ADRESSAGE]));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.document.blocs[0].contenu.medecin).toBe(resultat.courrier.texte);
  });

  it('produit un texte consignable tel quel par preparerCorrespondance', () => {
    const resultat = genererCourrierAdressage(entree([ADRESSAGE]));
    if (!resultat.ok) throw new Error('refus inattendu');
    const preparation = preparerCorrespondance({
      idPatient: 'PAT_TEST',
      praticienEmail: 'praticien@wellneuro.fr',
      sens: 'sortant',
      medecinLibelle: 'Dr Nicola',
      texte: resultat.courrier.texte,
    });
    expect(preparation.ok).toBe(true);
  });

  it('les DOUZE signaux de la table tiennent sous la borne consignable', () => {
    // Borne réelle : `LONGUEUR_MAX_TEXTE` vaut 8 000. Le pire cas n'est pas
    // théorique — c'est un dossier qui déclare tout.
    const tous = SAFETY_SIGNALS_V1.map(s => s.libelle);
    const resultat = genererCourrierAdressage(entree(tous));
    if (!resultat.ok) throw new Error('refus inattendu');
    expect(resultat.courrier.texte.length).toBeLessThan(8000);
  });
});
