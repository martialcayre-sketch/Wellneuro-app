import { describe, expect, it } from 'vitest';
import { controlerFiche, nombresDuTexte, type EntreesControle } from './invariants';
import { clesSecuriteDeLAssiette } from './securite';
import type { ContenuFicheAssiette } from './types';

// TEXTE ENTIÈREMENT SYNTHÉTIQUE. Aucune phrase d'une Fiche MY n'entre dans le
// dépôt, qui est public ([[D-251]] §4) : ces fixtures éprouvent les contrôles,
// pas un contenu. Les identifiants de claims suivent seulement la forme.

const SOURCE = [
  'Fiche synthétique de démonstration.',
  'Répartir la source de légumes sur 3 repas.',
  'Pendant 4 semaines, noter ce qui a été mangé.',
].join(' ');

const CLAIM_FICHE = 'WN-CL-0300-004::v1.0';
const CLAIM_SECURITE = 'WN-CL-0288-013::v1.0';

function fiche(over: Partial<ContenuFicheAssiette> = {}): ContenuFicheAssiette {
  return {
    titre: 'Votre assiette de démonstration',
    precautions: [{ texte: 'Parlez-en à votre praticien avant de changer vos habitudes.', claims: [CLAIM_SECURITE] }],
    sections: [{
      titre: 'Pourquoi cette assiette',
      blocs: [
        { texte: 'Répartir la source de légumes sur 3 repas.', provenance: { type: 'verbatim' } },
        { texte: 'Pendant 4 semaines, notez ce que vous mangez.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
      ],
    }],
    ...over,
  };
}

function entrees(over: Partial<EntreesControle> = {}): EntreesControle {
  return {
    contenu: fiche(),
    sourceIdFiche: 'WN-SRC-0300',
    texteSource: SOURCE,
    textesClaimsCites: [],
    clesSecuriteAttendues: [CLAIM_SECURITE],
    ...over,
  };
}

const codes = (e: EntreesControle) => controlerFiche(e).map(a => a.code);

describe('controlerFiche — la fiche de référence passe', () => {
  it('aucune anomalie : c’est la seule issue qui autorise la suite', () => {
    expect(controlerFiche(entrees())).toEqual([]);
  });
});

describe('controlerFiche — les nombres', () => {
  it('un nombre absent de la source est refusé', () => {
    const contenu = fiche({ sections: [{ titre: 'Rythme', blocs: [
      { texte: 'Pendant 6 semaines, notez ce que vous mangez.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
    ] }] });
    expect(codes(entrees({ contenu }))).toEqual(['nombre_hors_source']);
  });

  it('le même chiffre qui compte AUTRE CHOSE est refusé : « 4 jours » n’est pas « 4 semaines »', () => {
    const contenu = fiche({ sections: [{ titre: 'Rythme', blocs: [
      { texte: 'Pendant 4 jours, notez ce que vous mangez.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
    ] }] });
    expect(codes(entrees({ contenu }))).toEqual(['nombre_hors_source']);
  });

  it('un nombre porté par un claim cité est admis', () => {
    const contenu = fiche({ sections: [{ titre: 'Rythme', blocs: [
      { texte: 'Deux fois par jour, 2 portions.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
    ] }] });
    expect(codes(entrees({ contenu, textesClaimsCites: ['Claim synthétique : 2 portions quotidiennes.'] }))).toEqual([]);
  });

  it('lit ce que le nombre compte, liaisons sautées, pluriel et virgule décimale normalisés', () => {
    expect(nombresDuTexte('entre 2 et 3 portions')).toEqual(['2 portion', '3 portion']);
    expect(nombresDuTexte('1,5 litre ; 1.5 litres')).toEqual(['1.5 litre', '1.5 litre']);
    expect(nombresDuTexte('après 60 ans, 20 % de plus, 8h de sommeil')).toEqual(['60 ans', '20 %', '8 h']);
  });
});

describe('controlerFiche — la provenance', () => {
  it('un bloc sans provenance, ou reformulé sans claim, est refusé', () => {
    const sansProvenance = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Texte sans origine.' } as unknown as ContenuFicheAssiette['sections'][number]['blocs'][number],
      { texte: 'Autre texte.', provenance: { type: 'claims', claims: [] } },
    ] }] });
    expect(codes(entrees({ contenu: sansProvenance }))).toEqual(['bloc_sans_provenance', 'bloc_sans_provenance']);
  });

  it('un passage donné pour VERBATIM doit se retrouver dans la fiche source', () => {
    const contenu = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Une phrase que la fiche ne contient pas.', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu }))).toEqual(['verbatim_introuvable']);
  });

  it('un bloc ne cite que les claims de SA fiche — la couche « règle » du protocole n’entre pas ([[D-216]])', () => {
    const contenu = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Reformulation.', provenance: { type: 'claims', claims: ['WN-CL-0288-011::v1.0'] } },
    ] }] });
    expect(codes(entrees({ contenu }))).toEqual(['claim_hors_fiche']);
  });

  it('une clé de claim illisible est refusée', () => {
    const contenu = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Reformulation.', provenance: { type: 'claims', claims: ['claim-004'] } },
    ] }] });
    expect(codes(entrees({ contenu }))).toEqual(['claim_mal_forme']);
  });
});

describe('controlerFiche — les précautions ([[D-251]] §6)', () => {
  it('une réserve de sécurité omise est refusée', () => {
    expect(codes(entrees({ contenu: fiche({ precautions: [] }) }))).toEqual(['precaution_manquante']);
  });

  it('une précaution qui ne cite aucun claim est refusée', () => {
    const contenu = fiche({ precautions: [
      { texte: 'Parlez-en à votre praticien.', claims: [CLAIM_SECURITE] },
      { texte: 'Précaution sans origine.', claims: [] },
    ] });
    expect(codes(entrees({ contenu }))).toEqual(['precaution_sans_claim']);
  });

  it('une précaution ne cite que les réserves de l’assiette ou les claims de sa fiche (revue #1232)', () => {
    // La réserve d'une AUTRE assiette — ici une borne d'éviction de l'épargne
    // digestive — ne passe pas, même quand la couverture est complète.
    const etrangere = fiche({ precautions: [
      { texte: 'Parlez-en à votre praticien.', claims: [CLAIM_SECURITE, 'WN-CL-0285-002::v1.0'] },
    ] });
    expect(codes(entrees({ contenu: etrangere }))).toEqual(['precaution_hors_perimetre']);
    // Une mise en garde que la fiche porte elle-même est admise.
    const propre = fiche({ precautions: [
      { texte: 'Parlez-en à votre praticien.', claims: [CLAIM_SECURITE, CLAIM_FICHE] },
    ] });
    expect(codes(entrees({ contenu: propre }))).toEqual([]);
  });

  it('les réserves attendues sont celles des lignes PUBLIÉES de l’assiette', () => {
    expect(clesSecuriteDeLAssiette('ASSIETTE_PROTEINEE')).toEqual(['WN-CL-0288-013::v1.0', 'WN-CL-0288-014::v1.0']);
    expect(clesSecuriteDeLAssiette('ASSIETTE_EPARGNE_DIGESTIVE'))
      .toEqual(['WN-CL-0285-002::v1.0', 'WN-CL-0285-010::v1.0', 'WN-CL-0285-012::v1.0']);
    expect(clesSecuriteDeLAssiette('ASSIETTE_DOPAMINERGIQUE')).toEqual([]);
    expect(clesSecuriteDeLAssiette('ASSIETTE_INCONNUE')).toEqual([]);
  });
});

describe('controlerFiche — le vocabulaire d’une surface patient', () => {
  it('refuse « prescription », « ordonnance », « diagnostic », « NeuroScore »', () => {
    for (const mot of ['Votre prescription', 'une ordonnance', 'le Diagnostic', 'votre NeuroScore']) {
      expect(codes(entrees({ contenu: fiche({ titre: mot }) }))).toContain('terme_interdit');
    }
  });

  it('un titre vide est refusé', () => {
    expect(codes(entrees({ contenu: fiche({ titre: '   ' }) }))).toEqual(['texte_vide']);
  });
});
