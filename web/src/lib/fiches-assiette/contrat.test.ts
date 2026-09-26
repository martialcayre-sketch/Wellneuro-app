import { describe, expect, it } from 'vitest';
import { CHAMP_COURT_MAX, ErreurContratFiche, lireBrouillonFiche, TEXTE_SOURCE_MAX } from './contrat';

// Texte SYNTHÉTIQUE uniquement : aucun texte de Fiche MY n'entre au dépôt, qui
// est public ([[D-251]] §4).
function brouillon(surcharges: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sourceId: 'WN-SRC-0300',
    plateCode: 'ASSIETTE_PROTEINEE',
    texteSource: 'Texte source synthétique de démonstration.',
    sourceSha256: 'a'.repeat(64),
    modeleRedaction: 'modele-redacteur-fictif',
    modeleFidelite: 'modele-relecteur-fictif',
    versionConsigne: 'fiche-assiette-v1',
    contenu: {
      titre: 'Titre synthétique',
      precautions: [{ texte: 'Parlez-en à votre praticien.', claims: ['WN-CL-0300-001::v1.0'] }],
      sections: [
        {
          titre: 'Section synthétique',
          blocs: [
            { texte: 'Texte source synthétique', provenance: { type: 'verbatim' } },
            { texte: 'Reformulation synthétique.', provenance: { type: 'claims', claims: ['WN-CL-0300-002::v1.0'] } },
          ],
        },
      ],
    },
    ...surcharges,
  };
}

function refus(brut: unknown): string {
  try {
    lireBrouillonFiche(brut);
  } catch (error) {
    expect(error).toBeInstanceOf(ErreurContratFiche);
    return (error as Error).message;
  }
  throw new Error('Le contrat aurait dû refuser ce brouillon.');
}

describe('lireBrouillonFiche — le contrat fermé d’un brouillon (D-251, lot 4)', () => {
  it('rebâtit un brouillon conforme, champ par champ', () => {
    const lu = lireBrouillonFiche(brouillon());
    expect(lu.sourceId).toBe('WN-SRC-0300');
    expect(lu.plateCode).toBe('ASSIETTE_PROTEINEE');
    expect(lu.contenu.sections[0].blocs[1].provenance).toEqual({ type: 'claims', claims: ['WN-CL-0300-002::v1.0'] });
  });

  it.each(['acte', 'validateur', 'relectureIntegrale', 'motif', 'confirmationRegistre', 'statut', 'valideLe'])(
    'REFUSE le champ de validation « %s » en nommant DC-16 — la voie d’ingestion ne valide jamais',
    champ => {
      expect(refus(brouillon({ [champ]: true }))).toMatch(/ne valide jamais \(DC-16\)/);
    },
  );

  it.each(['numero', 'contenuSha256', 'id', 'creeLe'])('refuse « %s », posé par le serveur', champ => {
    expect(refus(brouillon({ [champ]: 'x' }))).toMatch(/posé par le serveur/);
  });

  it('refuse un champ inconnu, à la racine comme en profondeur', () => {
    expect(refus(brouillon({ commentaire: 'x' }))).toMatch(/champ inconnu « commentaire »/);
    const profond = brouillon();
    (profond.contenu as { sections: { blocs: Record<string, unknown>[] }[] }).sections[0].blocs[0].note = 'x';
    expect(refus(profond)).toMatch(/section 1, bloc 1 : champ inconnu « note »/);
  });

  it('refuse un appariement faux : la fiche d’une assiette sous le code d’une autre', () => {
    expect(refus(brouillon({ sourceId: 'WN-SRC-0297' }))).toMatch(/Appariement faux/);
  });

  it('refuse un code qui n’a pas de fiche (repère de moment, code inconnu)', () => {
    expect(refus(brouillon({ plateCode: 'ASSIETTE_INCONNUE' }))).toMatch(/n'est pas une assiette d'indication/);
  });

  it('refuse une provenance absente ou inconnue', () => {
    const sans = brouillon();
    delete (sans.contenu as { sections: { blocs: Record<string, unknown>[] }[] }).sections[0].blocs[0].provenance;
    expect(refus(sans)).toMatch(/aucune provenance/);
    const inconnue = brouillon();
    (inconnue.contenu as { sections: { blocs: Record<string, unknown>[] }[] }).sections[0].blocs[0].provenance = {
      type: 'intuition',
    };
    expect(refus(inconnue)).toMatch(/provenance inconnue/);
  });

  it('refuse un contenu sans section, et une section sans bloc', () => {
    expect(refus(brouillon({ contenu: { titre: 't', precautions: [], sections: [] } }))).toMatch(/aucune section/);
    expect(
      refus(brouillon({ contenu: { titre: 't', precautions: [], sections: [{ titre: 's', blocs: [] }] } })),
    ).toMatch(/aucun bloc/);
  });

  it('exige un second modèle pour la contre-lecture', () => {
    expect(refus(brouillon({ modeleFidelite: ' Modele-Redacteur-Fictif ' }))).toMatch(/second modèle/);
  });

  it('borne les tailles, et refuse une empreinte mal formée', () => {
    expect(refus(brouillon({ texteSource: 'x'.repeat(TEXTE_SOURCE_MAX + 1) }))).toMatch(/texteSource : trop long/);
    expect(refus(brouillon({ versionConsigne: 'x'.repeat(CHAMP_COURT_MAX + 1) }))).toMatch(/trop long/);
    expect(refus(brouillon({ texteSource: ' \n\t' }))).toMatch(/texteSource : vide/);
    expect(refus(brouillon({ sourceSha256: 'A'.repeat(64) }))).toMatch(/sourceSha256/);
  });
});
