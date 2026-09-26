import { describe, expect, it } from 'vitest';
import { controlerFiche, nombresDuTexte, nomsChiffres, type EntreesControle } from './invariants';
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

  // Constat de la revue du lot 5 : « Les oméga-3 se trouvent… » était lu
  // « 3 se », et refusé. Un chiffre collé à une lettre est un NOM.
  it('un chiffre dans un nom (oméga-3, B12) n’est pas une quantité — mais le nom doit exister', () => {
    expect(nombresDuTexte('Les oméga-3 et la vitamine B12 se trouvent ici.')).toEqual([]);
    expect(nomsChiffres('Les oméga-3 et la vitamine B12.')).toEqual(['oméga-3', 'b12']);
    const texteSource = 'Les poissons gras apportent des oméga-3.';
    const present = fiche({ sections: [{ titre: 'Les oméga-3', blocs: [
      { texte: 'Les oméga-3 se trouvent dans les poissons gras.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
    ] }] });
    expect(codes(entrees({ contenu: present, texteSource }))).toEqual([]);
    const invente = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Les oméga-6 se trouvent dans les poissons gras.', provenance: { type: 'claims', claims: [CLAIM_FICHE] } },
    ] }] });
    expect(codes(entrees({ contenu: invente, texteSource }))).toEqual(['nombre_hors_source']);
  });

  // Constat du premier essai sur WN-SRC-0305 : la source écrit « oméga 3 ».
  it('« oméga 3 », « omega-3 », « oméga‑3 » sont un seul nom, et pas un « 3 » nu', () => {
    expect(nombresDuTexte('Sources d’oméga 3 et d’omega-6')).toEqual([]);
    expect(nomsChiffres('oméga 3, omega-3, oméga‑3')).toEqual(['oméga-3', 'oméga-3', 'oméga-3']);
    const texteSource = 'Les poissons gras sont riches en oméga 3 nombreux.';
    const titre = fiche({ sections: [{ titre: 'Sources d’oméga-3', blocs: [
      { texte: 'Les poissons gras sont riches en oméga 3', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu: titre, texteSource }))).toEqual([]);
  });

  it('un intervalle reste deux nombres contrôlés : « 3-4 portions » compte bien « 4 portion »', () => {
    expect(nombresDuTexte('3-4 portions')).toContain('4 portion');
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

  // Constat des premiers essais de l'outil (lot 5) : l'extraction porte du
  // Markdown, un bloc est du texte brut. Le balisage n'est pas du texte.
  it('le balisage de la source n’empêche pas de retrouver un passage verbatim — il n’est pas du texte', () => {
    const texteSource = [
      '<!-- page 1 (lecture B) -->',
      '',
      '## Titre synthétique',
      '- Répartir la **source de légumes** sur 3 repas.',
      '| Colonne | Pendant 4 semaines |',
    ].join('\n');
    const contenu = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Répartir la source de légumes sur 3 repas.', provenance: { type: 'verbatim' } },
      { texte: 'Titre synthétique', provenance: { type: 'verbatim' } },
      { texte: 'Pendant 4 semaines', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu, texteSource }))).toEqual([]);
  });

  // Constat de la revue du lot 5 : aplatir le texte laissait un verbatim
  // JOINDRE deux cellules ou deux lignes, et inverser le sens.
  it('un verbatim ne joint jamais deux cellules de tableau ni deux lignes', () => {
    const texteSource = '| Produit Y | à éviter |\n| Produit Z | autorisé |';
    const joint = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'à éviter Produit Z', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu: joint, texteSource }))).toEqual(['verbatim_introuvable']);
    const cellule = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Produit Y', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu: cellule, texteSource }))).toEqual([]);
  });

  it('un nombre en gras dans la source se retrouve dans un texte sans balisage', () => {
    const texteSource = 'Noter ce qui a été mangé pendant **4 semaines**, puis faire le point.';
    const contenu = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Noter ce qui a été mangé pendant 4 semaines', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu, texteSource }))).toEqual([]);
  });

  it('le texte patient ne porte ni balisage, ni marqueur de page, ni marqueur de figure', () => {
    const texteSource = '<!-- page 2 (lecture B) -->\n\nMangez des légumes frais.\n\n[FIGURE — non transcrite]';
    for (const texte of ['Mangez des **légumes** frais.', '<!-- page 2 (lecture B) --> Mangez des légumes frais.', '[FIGURE — non transcrite]']) {
      const contenu = fiche({ sections: [{ titre: 'T', blocs: [{ texte, provenance: { type: 'verbatim' } }] }] });
      expect(codes(entrees({ contenu, texteSource }))).toContain('balisage_dans_le_texte');
    }
  });

  it('retirer le balisage ne fait rien passer d’autre : un mot changé reste introuvable', () => {
    const texteSource = '- Répartir la **source de légumes** sur 3 repas.';
    const contenu = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'Répartir la source de fruits sur 3 repas.', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu, texteSource }))).toEqual(['verbatim_introuvable']);
  });

  it('un marqueur de page n’est pas un texte citable', () => {
    const texteSource = '<!-- page 1 (lecture B) -->\n\nRépartir la source de légumes sur 3 repas.';
    const contenu = fiche({ sections: [{ titre: 'T', blocs: [
      { texte: 'page 1 (lecture B)', provenance: { type: 'verbatim' } },
    ] }] });
    expect(codes(entrees({ contenu, texteSource }))).toContain('verbatim_introuvable');
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

  // Constat de la revue du lot 5 : la racine « diagnostic » laissait passer
  // « diagnostiquée » ; « posologie » et « dosage » disent une dose de
  // complément, qui devient un renvoi au praticien (DC-44).
  it('refuse aussi « diagnostiqué(e) », « posologie », « dosage »', () => {
    for (const mot of ['Une maladie diagnostiquée', 'La posologie', 'Le dosage']) {
      expect(codes(entrees({ contenu: fiche({ titre: mot }) }))).toContain('terme_interdit');
    }
  });

  it('un titre vide est refusé', () => {
    expect(codes(entrees({ contenu: fiche({ titre: '   ' }) }))).toEqual(['texte_vide']);
  });
});
